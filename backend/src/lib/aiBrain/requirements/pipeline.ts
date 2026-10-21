import { AssessmentQuestionKind, CanonicalForm, RequirementReport, RequirementSpec, VerificationIssue } from './types';
import { canonicalizeArtifact } from './canonical';
import { describeSpec } from './specExtractor';
import { GenerationPlan, buildContinuationPrompt, buildCreatePrompt, buildModifyPrompt, buildRepairPrompt, planGeneration } from './promptBuilder';
import { VerificationResult, gradedQuestions, kindOf, markUnverifiedAnswers, repairAndVerify } from './verifier';

export type ModelCaller = (userPrompt: string) => Promise<any>;

export interface PipelineOptions {
  spec: RequirementSpec;
  existing?: CanonicalForm | null;
  /** Calls the AI provider with the generation system instruction bound; returns parsed JSON. */
  callModel?: ModelCaller;
  documentContext?: string;
  /** Use this raw output as the first attempt instead of calling the model (chat-stream, local fallback). */
  initialRaw?: any;
  engine?: 'ai' | 'local-fallback';
  maxRepairRounds?: number;
}

export interface PipelineResult {
  form: CanonicalForm;
  report: RequirementReport;
}

function score(r: VerificationResult): number {
  return r.issues.reduce((s, i) => s + (i.severity === 'error' ? 10 : 1), 0);
}

function normLabel(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function mergeQuestions(form: CanonicalForm, extra: CanonicalForm): number {
  const seen = new Set(form.questions.map(q => normLabel(q.label)));
  let added = 0;
  for (const q of extra.questions) {
    const k = normLabel(q.label);
    if (!k || seen.has(k)) continue;
    delete q.id;
    seen.add(k);
    form.questions.push(q);
    added++;
  }
  return added;
}

/** What is still missing for count / per-kind constraints (only shortfalls, never excess). */
function shortfall(form: CanonicalForm, spec: RequirementSpec): { count: number; kinds?: Partial<Record<AssessmentQuestionKind, number>> } | null {
  const items = gradedQuestions(form);
  const kinds: Partial<Record<AssessmentQuestionKind, number>> = {};
  let kindMissing = 0;
  for (const [k, target] of Object.entries(spec.typeCounts || {})) {
    const have = items.filter(q => kindOf(q) === k).length;
    if (target !== undefined && have < target) { kinds[k as AssessmentQuestionKind] = target - have; kindMissing += target - have; }
  }
  const totalTarget = spec.itemCount && spec.itemCount.mode !== 'max' ? spec.itemCount.value : 0;
  const totalMissing = Math.max(0, totalTarget - items.length);
  const count = Math.max(totalMissing, kindMissing);
  return count > 0 ? { count, kinds: Object.keys(kinds).length ? kinds : undefined } : null;
}

function onlyShortfallErrors(errors: VerificationIssue[]): boolean {
  return errors.length > 0 && errors.every(i => (i.code === 'count' && i.modelRepairable) || i.code.startsWith('kind_count:'));
}

export async function runRequirementPipeline(opts: PipelineOptions): Promise<PipelineResult> {
  const { spec, callModel, documentContext } = opts;
  const existing = opts.existing || null;
  const maxRounds = opts.maxRepairRounds ?? 2;
  const notes: string[] = [];
  let modelAttempts = 0;
  let understoodByModel: string[] = [];

  const ask = async (prompt: string): Promise<any> => {
    if (!callModel) throw new Error('No AI provider configured.');
    modelAttempts++;
    return callModel(prompt);
  };

  /* 1. First attempt */
  const plan: GenerationPlan = planGeneration(spec);
  let raw: any = opts.initialRaw;
  if (raw === undefined) {
    raw = await ask(spec.operation === 'modify' && existing ? buildModifyPrompt(spec, existing) : buildCreatePrompt(spec, plan, documentContext));
  }
  if (raw && typeof raw === 'object' && raw.understanding && Array.isArray(raw.understanding.assumptions)) {
    understoodByModel = raw.understanding.assumptions.filter((a: any) => typeof a === 'string').slice(0, 6);
  }
  let form = canonicalizeArtifact(raw, spec, { existing });

  /* 2. Remaining batches of a large paper */
  if (callModel && plan.batches.length > 1 && opts.initialRaw === undefined) {
    // The first batch occasionally titles itself "... - Part 1"; the title describes the whole paper.
    if (!spec.explicitTitle) form.title = form.title.replace(/\s*[-–—:|(]*\s*part\s*(?:1|one|i)\b\)?\s*$/i, '').trim() || form.title;
    for (const batch of plan.batches.slice(1)) {
      try {
        const more = await ask(buildContinuationPrompt(form, { count: batch.size, kinds: batch.kinds, difficulty: batch.difficulty }));
        mergeQuestions(form, canonicalizeArtifact({ questions: more?.questions || [] }, spec, { existing }));
      } catch (err: any) {
        notes.push(`A generation batch failed (${String(err?.message || err).slice(0, 120)}); the missing questions were requested again below.`);
        break;
      }
    }
  }

  let result = repairAndVerify(form, spec, existing);

  /* 3. Bounded repair / continuation rounds */
  for (let round = 0; callModel && round < maxRounds; round++) {
    const errors = result.issues.filter(i => i.severity === 'error' && i.modelRepairable);
    const warnings = result.issues.filter(i => i.severity === 'warning' && i.modelRepairable);
    const targets = errors.length ? errors : (round === 0 ? warnings : []);
    if (targets.length === 0) break;
    try {
      if (onlyShortfallErrors(targets)) {
        const missing = shortfall(result.form, spec);
        if (!missing) break;
        let added = 0;
        // Ask for missing questions in batches as well.
        for (let remaining = missing.count; remaining > 0;) {
          const size = Math.min(20, remaining);
          const more = await ask(buildContinuationPrompt(result.form, { count: size, kinds: missing.kinds }));
          const n = mergeQuestions(result.form, canonicalizeArtifact({ questions: more?.questions || [] }, spec, { existing }));
          added += n;
          remaining -= size;
          if (n === 0) break;
        }
        const candidate = repairAndVerify(result.form, spec, existing);
        if (added > 0) notes.push(`Requested ${missing.count} missing question(s) in a follow-up round.`);
        result = candidate;
      } else {
        const fixed = await ask(buildRepairPrompt(targets, result.form));
        const candidate = repairAndVerify(canonicalizeArtifact(fixed, spec, { existing }), spec, existing);
        if (score(candidate) <= score(result)) result = candidate;
      }
    } catch (err: any) {
      notes.push(`An AI repair round failed (${String(err?.message || err).slice(0, 120)}); the best verified result was kept.`);
      break;
    }
  }

  /* 4. Final honesty pass */
  const unverified = markUnverifiedAnswers(result.form);
  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning').map(i => i.message);
  if (unverified) warnings.unshift(`${unverified} question(s) have no verifiable answer key and were marked "needs review" (not auto-graded).`);
  if (result.form.isAssessment && gradedQuestions(result.form).some(q => ['predict_output', 'coding', 'debugging', 'sql'].includes(kindOf(q) || ''))) {
    warnings.push('Code answers were checked by reasoning only — code is never executed on the server. Review output-prediction and coding answers before publishing.');
  }
  if (result.form.isAssessment && spec.difficulty) {
    warnings.push('Difficulty labels come from the AI; review question rigor before publishing.');
  }

  const unmet = [
    ...result.checks.filter(c => c.status === 'unmet').map(c => `${c.requirement}${c.detail ? ` (${c.detail})` : ''}`),
    ...errors.filter(e => !result.checks.some(c => c.status === 'unmet' && e.message.includes(c.requirement))).map(e => e.message)
  ];

  const report: RequirementReport = {
    operation: spec.operation,
    artifactKind: result.form.isAssessment ? 'assessment' : 'form',
    language: spec.language.name,
    domain: spec.domain,
    purpose: spec.purpose,
    understood: describeSpec(spec),
    assumptions: Array.from(new Set([...spec.assumptions, ...understoodByModel])),
    checks: result.checks,
    repairsApplied: Array.from(new Set([...result.repairs, ...notes])),
    unmet: Array.from(new Set(unmet)),
    warnings: Array.from(new Set(warnings)),
    unsupported: spec.unsupported,
    complete: errors.length === 0 && result.checks.every(c => c.status !== 'unmet'),
    modelAttempts,
    engine: opts.engine || 'ai'
  };
  if (opts.engine === 'local-fallback') {
    report.warnings.unshift('The AI provider was unavailable, so a local template engine produced this result. It may not satisfy every requirement — see the unmet list.');
  }
  return { form: result.form, report };
}
