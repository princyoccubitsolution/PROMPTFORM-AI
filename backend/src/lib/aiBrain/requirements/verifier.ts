import {
  AssessmentQuestionKind, CanonicalForm, CanonicalQuestion, DifficultyLevel, RequirementCheck, RequirementSpec, VerificationIssue
} from './types';
import { CHOICE_TYPES } from './canonical';
import { distributeByWeights } from './specExtractor';
import { AUTO_GRADED_KINDS, DIFFICULTY_ORDER, EDUCATION_ONLY_FIELDS, detectFieldKey, kindLabel, scriptProfile } from './vocabulary';

export interface VerificationResult {
  form: CanonicalForm;
  issues: VerificationIssue[];
  checks: RequirementCheck[];
  repairs: string[];
}

const OBJECTIVE_KINDS: AssessmentQuestionKind[] = ['mcq_single', 'mcq_multiple', 'true_false', 'assertion_reasoning'];
const CODE_KINDS: AssessmentQuestionKind[] = ['coding', 'debugging', 'predict_output'];

export function kindOf(q: CanonicalQuestion): AssessmentQuestionKind | undefined {
  return q.validations?.assessmentType;
}

/** Questions that count towards an assessment's question total (identity fields do not). */
export function gradedQuestions(form: CanonicalForm): CanonicalQuestion[] {
  return form.isAssessment ? form.questions.filter(q => Boolean(kindOf(q))) : form.questions;
}

function qName(form: CanonicalForm, q: CanonicalQuestion): string {
  const idx = form.questions.indexOf(q);
  const label = q.label.length > 60 ? `${q.label.slice(0, 57)}...` : q.label;
  return `Q${idx + 1} ("${label}")`;
}

function fieldKeyOf(q: CanonicalQuestion): string | undefined {
  return detectFieldKey({ key: q.key, label: q.label, type: q.type });
}

function sameContent(a: CanonicalQuestion, b: CanonicalQuestion): boolean {
  const va = a.validations || {};
  const vb = b.validations || {};
  return a.label === b.label && a.type === b.type && JSON.stringify(a.options) === JSON.stringify(b.options) &&
    JSON.stringify(va.correctAnswer ?? null) === JSON.stringify(vb.correctAnswer ?? null) &&
    String(va.codeSnippet ?? '') === String(vb.codeSnippet ?? '');
}

/** Largest-remainder rescale to `total`, in whole marks when possible, else half marks; every question keeps >= 1 unit. */
export function rescalePoints(points: number[], total: number): number[] {
  const n = points.length;
  if (n === 0) return [];
  const unitSize = total >= n ? 1 : 0.5;
  const units = Math.round(total / unitSize);
  const base = points.map(p => (p > 0 ? p : 1));
  const sum = base.reduce((s, p) => s + p, 0);
  const exact = base.map(p => (p / sum) * units);
  const out = exact.map(e => Math.max(1, Math.floor(e)));
  let assigned = out.reduce((s, u) => s + u, 0);
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
  for (let k = 0; assigned < units && k < order.length * 4; k++) {
    out[order[k % order.length].i]++;
    assigned++;
  }
  // Take back from the largest when the >= 1 floor overshot.
  while (assigned > units) {
    let maxIdx = 0;
    for (let i = 1; i < n; i++) if (out[i] > out[maxIdx]) maxIdx = i;
    if (out[maxIdx] <= 1) break;
    out[maxIdx]--;
    assigned--;
  }
  return out.map(u => Math.round(u * unitSize * 100) / 100);
}

function sum(nums: number[]): number {
  return Math.round(nums.reduce((s, n) => s + n, 0) * 100) / 100;
}

function stripAssessmentData(form: CanonicalForm): boolean {
  let stripped = false;
  for (const q of form.questions) {
    for (const k of ['assessmentType', 'points', 'negativePoints', 'difficulty', 'bloomsTaxonomy', 'correctAnswer', 'correct_answer', 'acceptedAnswers', 'tolerance', 'explanation', 'rubric', 'modelAnswer', 'isGraded', 'gradingMode', 'matchLeft', 'testCases', 'examples', 'needsReview', 'unresolvedAnswer']) {
      if (q.validations && q.validations[k] !== undefined) { delete q.validations[k]; stripped = true; }
    }
    if (q.type === 'matching' || q.type === 'ordering') { q.type = q.type === 'matching' ? 'dropdown' : 'checkbox'; stripped = true; }
  }
  return stripped;
}

function editScope(spec: RequirementSpec): 'targeted' | 'broad' {
  const e = spec.edit;
  if (!e) return 'broad';
  const broad = Boolean(e.translateTo || e.changeProgrammingLanguage || spec.onlyKinds || (e.difficultyChange && e.targetQuestionNumbers.length === 0)) ||
    (/\b(?:all|every|each|whole|entire|everything|overall)\b/i.test(spec.normalizedPrompt) && !e.strictPreserve && !e.keepMarks) ||
    /\b(?:improve|rewrite|redo|professional|better|perfect|advanced|enhance|upgrade|polish)\b/i.test(spec.normalizedPrompt) && e.targetQuestionNumbers.length === 0;
  const targeted = Boolean(e.addCount || e.addFieldKeys.length || e.removeKinds.length || e.removeFieldKeys.length || e.targetQuestionNumbers.length || e.removeQuestionNumbers.length || e.makeRequired.length || e.makeOptional.length || spec.explicitTitle || spec.totalMarks !== undefined);
  return !broad && (targeted || e.strictPreserve) ? 'targeted' : 'broad';
}

function isRemovalTarget(q: CanonicalQuestion, spec: RequirementSpec): boolean {
  const e = spec.edit;
  if (!e) return false;
  const kind = kindOf(q);
  if (kind && e.removeKinds.includes(kind)) return true;
  const key = fieldKeyOf(q);
  return Boolean(key && e.removeFieldKeys.includes(key));
}

/** Restore questions the user did not ask to change; drop the ones they asked to remove. */
function preserveDuringEdit(form: CanonicalForm, spec: RequirementSpec, existing: CanonicalForm, repairs: string[]): void {
  const e = spec.edit!;
  const scope = editScope(spec);
  const existingQs = existing.questions;

  // Translation / broad rewrites often drop ids: re-attach them by position when the structure is unchanged.
  if (form.questions.length === existingQs.length && form.questions.some(q => !q.id)) {
    const used = new Set(form.questions.map(q => q.id).filter(Boolean));
    form.questions.forEach((q, i) => {
      const ex = existingQs[i];
      if (!q.id && ex.id && !used.has(ex.id) && (q.type === ex.type || form.isAssessment)) { q.id = ex.id; used.add(ex.id); }
    });
  }

  if (scope !== 'targeted') return;

  const targetIds = new Set(e.targetQuestionNumbers.map(n => existingQs[n - 1]?.id).filter(Boolean) as string[]);
  const byId = new Map(form.questions.filter(q => q.id).map(q => [q.id as string, q]));
  const rebuilt: CanonicalQuestion[] = [];
  let restored = 0;
  let reinserted = 0;
  let removed = 0;

  for (const ex of existingQs) {
    if (isRemovalTarget(ex, spec) || e.removeQuestionNumbers.includes(existingQs.indexOf(ex) + 1)) { removed++; continue; }
    const current = ex.id ? byId.get(ex.id) : undefined;
    if (ex.id && targetIds.has(ex.id)) {
      rebuilt.push(current || ex);
      if (!current) reinserted++;
      continue;
    }
    if (!current) {
      rebuilt.push(JSON.parse(JSON.stringify(ex)));
      reinserted++;
      continue;
    }
    if (!sameContent(current, ex)) {
      const keepRequired = current.required;
      const copy: CanonicalQuestion = JSON.parse(JSON.stringify(ex));
      const key = fieldKeyOf(ex);
      if (key && (e.makeRequired.includes(key) || e.makeOptional.includes(key))) copy.required = keepRequired;
      rebuilt.push(copy);
      restored++;
    } else {
      const key = fieldKeyOf(ex);
      if (!(key && (e.makeRequired.includes(key) || e.makeOptional.includes(key)))) current.required = ex.required;
      rebuilt.push(current);
    }
  }
  // Append genuinely new questions (no matching existing id) in the order the AI produced them.
  const existingIdSet = new Set(existingQs.map(q => q.id));
  const newOnes = form.questions.filter(q => !q.id || !existingIdSet.has(q.id)).filter(q => !isRemovalTarget(q, spec));
  // Insert new questions right after the last targeted position when the AI placed them in the middle.
  form.questions = [...rebuilt, ...newOnes];
  if (restored) repairs.push(`Restored ${restored} question(s) the edit was not supposed to change.`);
  if (reinserted) repairs.push(`Re-inserted ${reinserted} existing question(s) that the AI dropped.`);
  if (removed && !repairs.some(r => r.startsWith('Removed'))) repairs.push(`Removed ${removed} question(s) as requested.`);
}

function applyMarks(form: CanonicalForm, spec: RequirementSpec, existing: CanonicalForm | null, repairs: string[]): void {
  const graded = gradedQuestions(form);
  if (!form.isAssessment || graded.length === 0) return;

  const kindMarks = spec.kindMarks || {};
  for (const q of graded) {
    const k = kindOf(q)!;
    if (kindMarks[k] !== undefined) q.validations.points = kindMarks[k];
    else if (spec.marksPerQuestion !== undefined) q.validations.points = spec.marksPerQuestion;
  }

  if (spec.edit?.keepMarks && existing) {
    const existingPoints = gradedQuestions(existing).map(q => Number(q.validations.points) || 0).filter(p => p > 0);
    if (existingPoints.length) {
      const counts = new Map<number, number>();
      existingPoints.forEach(p => counts.set(p, (counts.get(p) || 0) + 1));
      const modal = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const existingIds = new Set(existing.questions.map(q => q.id));
      let changed = 0;
      for (const q of graded) if (!q.id || !existingIds.has(q.id)) { if (q.validations.points !== modal) changed++; q.validations.points = modal; }
      if (changed) repairs.push(`Set ${changed} new question(s) to ${modal} marks to match the existing questions.`);
    }
  }

  if (spec.totalMarks !== undefined) {
    const points = graded.map(q => Number(q.validations.points) || 0);
    if (Math.abs(sum(points) - spec.totalMarks) > 1e-6) {
      const scaled = rescalePoints(points, spec.totalMarks);
      graded.forEach((q, i) => { q.validations.points = scaled[i]; });
      repairs.push(`Adjusted marks from ${sum(points)} to the requested total of ${spec.totalMarks} (proportional, largest-remainder rounding).`);
    }
  }

  const neg = spec.negativeMarking;
  if (neg !== undefined && neg > 0) {
    for (const q of graded) if (OBJECTIVE_KINDS.includes(kindOf(q)!) && q.validations.negativePoints === undefined) q.validations.negativePoints = neg;
  }
}

function trimExcess(form: CanonicalForm, spec: RequirementSpec, repairs: string[]): void {
  const count = spec.itemCount;
  // Per-kind targets first.
  const targets = spec.typeCounts || {};
  if (form.isAssessment && Object.keys(targets).length > 0) {
    for (const [kind, target] of Object.entries(targets)) {
      const ofKind = form.questions.filter(q => kindOf(q) === kind);
      if (target !== undefined && ofKind.length > target) {
        const drop = new Set(ofKind.slice(target));
        form.questions = form.questions.filter(q => !drop.has(q));
        repairs.push(`Removed ${drop.size} extra ${kindLabel(kind as AssessmentQuestionKind)} (requested ${target}).`);
      }
    }
  }
  if (!count || count.mode === 'min') return;
  const items = gradedQuestions(form);
  if (items.length > count.value) {
    const protectedKeys = new Set([...spec.requestedFields, ...spec.mandatoryFields]);
    const removable = [...items].reverse().filter(q => !protectedKeys.has(fieldKeyOf(q) || ''));
    const excess = items.length - count.value;
    const drop = new Set(removable.slice(0, excess));
    form.questions = form.questions.filter(q => !drop.has(q));
    repairs.push(`Removed ${drop.size} extra ${form.isAssessment ? 'question(s)' : 'field(s)'} to match the requested ${count.mode === 'exact' ? 'exact' : 'maximum'} count of ${count.value}.`);
  }
}

function fixLogicReferences(form: CanonicalForm, repairs: string[]): void {
  const labels = new Set(form.questions.map(q => q.label.trim().toLowerCase()));
  const ids = new Set(form.questions.map(q => q.id).filter(Boolean));
  let broken = 0;
  for (const q of form.questions) {
    const logic = q.logic || {};
    if (Array.isArray(logic.conditions)) {
      const kept = logic.conditions.filter((c: any) => {
        const label = String(c?.fieldLabel ?? '').trim().toLowerCase();
        const ref = c?.fieldId ?? c?.questionId;
        return (label && labels.has(label) && label !== q.label.trim().toLowerCase()) || (ref && ids.has(ref));
      });
      if (kept.length !== logic.conditions.length) {
        broken += logic.conditions.length - kept.length;
        q.logic = kept.length ? { ...logic, conditions: kept } : {};
      }
    } else if (logic.target_question_id && !ids.has(logic.target_question_id)) {
      broken++;
      q.logic = {};
    }
  }
  if (broken) repairs.push(`Removed ${broken} conditional rule(s) that referenced fields which do not exist.`);
}

function dedupeIds(form: CanonicalForm): void {
  const seen = new Set<string>();
  for (const q of form.questions) {
    if (!q.id) continue;
    if (seen.has(q.id)) delete q.id;
    else seen.add(q.id);
  }
}

function languageOk(form: CanonicalForm, spec: RequirementSpec): { ok: boolean; detail: string } {
  const target = spec.language;
  const parts: string[] = [form.title];
  for (const q of form.questions) {
    const kind = kindOf(q);
    parts.push(q.label);
    if (!kind || !CODE_KINDS.includes(kind)) parts.push(...q.options);
  }
  const p = scriptProfile(parts.join(' ').replace(/`[^`]*`/g, ' '));
  if (p.total < 10) return { ok: true, detail: 'too little text to check' };
  if (target.script === 'gujarati' || target.script === 'devanagari' || target.script === 'arabic') {
    const own = target.script === 'gujarati' ? p.gujarati : target.script === 'devanagari' ? p.devanagari : p.arabic;
    const ratio = own / Math.max(1, own + p.latin);
    return { ok: ratio >= 0.6, detail: `${Math.round(ratio * 100)}% of the text is in ${target.name} script` };
  }
  if (target.name === 'english') {
    const ratio = p.latin / p.total;
    return { ok: ratio >= 0.7, detail: `${Math.round(ratio * 100)}% of the text is in Latin script` };
  }
  return { ok: true, detail: 'script check not applicable' };
}

function difficultyTargets(spec: RequirementSpec, total: number): Partial<Record<DifficultyLevel, number>> | undefined {
  const d = spec.difficulty;
  if (!d || total <= 0) return undefined;
  if (d.distribution && Object.values(d.distribution).reduce((s, v) => s + (v || 0), 0) === total) return d.distribution;
  if (d.percentages) return distributeByWeights(total, d.percentages);
  if (d.mostly) {
    const others = (['easy', 'medium', 'hard'] as DifficultyLevel[]).filter(l => l !== d.mostly);
    const w: Partial<Record<DifficultyLevel, number>> = { [d.mostly]: 60 };
    others.forEach(o => { w[o] = 40 / others.length; });
    return distributeByWeights(total, w);
  }
  if (d.level) return { [d.level]: total };
  return undefined;
}

/**
 * Apply deterministic repairs, then check every applicable requirement.
 * Issues with `modelRepairable` are fed back to the AI by the pipeline.
 */
export function repairAndVerify(input: CanonicalForm, spec: RequirementSpec, existing: CanonicalForm | null): VerificationResult {
  const form: CanonicalForm = JSON.parse(JSON.stringify(input));
  const repairs: string[] = [];
  const issues: VerificationIssue[] = [];
  const checks: RequirementCheck[] = [];
  const isModify = spec.operation === 'modify' && Boolean(existing);

  /* --------------------------- deterministic repairs --------------------------- */
  form.questions = form.questions.filter(q => q.label && q.label.trim());
  for (const q of form.questions) q.options = Array.from(new Set(q.options.map(o => o.trim()).filter(Boolean)));

  if (!form.isAssessment && stripAssessmentData(form)) {
    repairs.push('Removed marks / answer keys that do not belong in a non-assessment form.');
  }

  // Duplicate ids must be resolved before edit preservation matches questions by id.
  dedupeIds(form);
  if (isModify && existing) preserveDuringEdit(form, spec, existing, repairs);

  const excludedFields = isModify ? (spec.edit?.removeFieldKeys || []) : spec.excludedFields;
  if (excludedFields.length) {
    const before = form.questions.length;
    form.questions = form.questions.filter(q => !excludedFields.includes(fieldKeyOf(q) || ''));
    if (form.questions.length < before) repairs.push(`Removed ${before - form.questions.length} excluded field(s): ${excludedFields.join(', ')}.`);
  }
  const excludedKinds = [...spec.excludedKinds, ...(isModify ? spec.edit?.removeKinds || [] : [])];
  if (form.isAssessment && excludedKinds.length) {
    const before = form.questions.length;
    form.questions = form.questions.filter(q => !excludedKinds.includes(kindOf(q) as AssessmentQuestionKind));
    if (form.questions.length < before) repairs.push(`Removed ${before - form.questions.length} question(s) of excluded types: ${excludedKinds.map(kindLabel).join(', ')}.`);
  }

  // Student roll / enrollment numbers only belong to education forms.
  if (!form.isAssessment && !['student_admission', 'registration'].includes(spec.domain)) {
    const allowed = new Set([...spec.requestedFields, ...(spec.edit?.addFieldKeys || [])]);
    const existingKeys = new Set((existing?.questions || []).map(fieldKeyOf));
    const before = form.questions.length;
    form.questions = form.questions.filter(q => {
      const key = fieldKeyOf(q);
      return !(key && EDUCATION_ONLY_FIELDS.includes(key) && !allowed.has(key) && !existingKeys.has(key));
    });
    if (form.questions.length < before) repairs.push('Removed student roll / enrollment number fields that do not belong in this form.');
  }

  // Mandatory / optional flags.
  const makeRequired = [...spec.mandatoryFields, ...(spec.edit?.makeRequired || [])];
  const makeOptional = [...spec.optionalFields, ...(spec.edit?.makeOptional || [])];
  for (const q of form.questions) {
    if (spec.allRequired && !isModify) q.required = true;
    if (spec.allOptional && !isModify) q.required = false;
    const key = fieldKeyOf(q);
    if (key && makeRequired.includes(key)) q.required = true;
    if (key && makeOptional.includes(key)) q.required = false;
  }

  if (form.isAssessment && spec.programmingLanguage) {
    for (const q of gradedQuestions(form)) {
      if (CODE_KINDS.includes(kindOf(q)!) && !q.validations.programmingLanguage) q.validations.programmingLanguage = spec.programmingLanguage;
    }
  }

  trimExcess(form, spec, repairs);
  applyMarks(form, spec, existing, repairs);
  fixLogicReferences(form, repairs);
  dedupeIds(form);
  if (spec.explicitTitle && form.title !== spec.explicitTitle) { form.title = spec.explicitTitle; repairs.push('Applied the exact title you specified.'); }

  /* --------------------------------- checks --------------------------------- */
  const items = gradedQuestions(form);
  const noun = form.isAssessment ? 'questions' : 'fields';

  if (form.questions.length === 0) {
    issues.push({ code: 'empty', severity: 'error', message: 'The generated form has no questions.', modelRepairable: true });
  }

  if (spec.itemCount) {
    const { mode, value } = spec.itemCount;
    const n = items.length;
    const ok = mode === 'exact' ? n === value : mode === 'min' ? n >= value : n <= value;
    checks.push({ requirement: `${mode === 'exact' ? 'Exactly' : mode === 'min' ? 'At least' : 'At most'} ${value} ${noun}`, status: ok ? 'met' : 'unmet', detail: `${n} generated` });
    if (!ok) issues.push({ code: 'count', severity: 'error', message: `Expected ${mode === 'exact' ? 'exactly' : mode === 'min' ? 'at least' : 'at most'} ${value} ${noun}, got ${n}.`, modelRepairable: n < value });
  }

  if (form.isAssessment) {
    for (const [kind, target] of Object.entries(spec.typeCounts || {})) {
      const n = items.filter(q => kindOf(q) === kind).length;
      const ok = n === target;
      checks.push({ requirement: `${target} ${kindLabel(kind as AssessmentQuestionKind)}`, status: ok ? 'met' : 'unmet', detail: `${n} generated` });
      if (!ok) issues.push({ code: `kind_count:${kind}`, severity: 'error', message: `Expected exactly ${target} ${kindLabel(kind as AssessmentQuestionKind)} (assessmentType "${kind}"), got ${n}.`, modelRepairable: true });
    }
    if (spec.onlyKinds) {
      const others = items.filter(q => !spec.onlyKinds!.includes(kindOf(q)!));
      checks.push({ requirement: `Only ${spec.onlyKinds.map(kindLabel).join(', ')}`, status: others.length ? 'unmet' : 'met' });
      if (others.length) issues.push({ code: 'only_kinds', severity: 'error', message: `Only ${spec.onlyKinds.map(kindLabel).join(', ')} were requested, but ${others.length} question(s) are other types (${others.slice(0, 3).map(q => qName(form, q)).join(', ')}).`, modelRepairable: true });
    }
    if (spec.excludedKinds.length) checks.push({ requirement: `No ${spec.excludedKinds.map(kindLabel).join(', ')}`, status: 'met' });
    if (isModify && spec.edit?.removeKinds.length) checks.push({ requirement: `Removed ${spec.edit.removeKinds.map(kindLabel).join(', ')}`, status: 'met' });
  }

  if (excludedFields.length) checks.push({ requirement: `No ${excludedFields.join(', ')} field`, status: repairs.some(r => r.includes('excluded field')) ? 'repaired' : 'met' });

  const requested = isModify ? (spec.edit?.addFieldKeys || []) : spec.requestedFields;
  for (const key of requested) {
    const present = form.questions.some(q => fieldKeyOf(q) === key);
    checks.push({ requirement: `Include a ${key.replace(/_/g, ' ')} field`, status: present ? 'met' : 'unmet' });
    if (!present) issues.push({ code: `missing_field:${key}`, severity: 'error', message: `The user explicitly asked for a "${key.replace(/_/g, ' ')}" field, but it is missing.`, modelRepairable: true });
  }
  for (const key of makeRequired) checks.push({ requirement: `${key} is mandatory`, status: form.questions.some(q => fieldKeyOf(q) === key && q.required) ? 'met' : 'unmet' });

  // Choice widgets need real options.
  for (const q of form.questions) {
    if ((CHOICE_TYPES.includes(q.type) && !['true_false'].includes(kindOf(q) || '')) && q.options.length < 2) {
      issues.push({ code: 'options', severity: 'error', message: `${qName(form, q)} is a ${q.type} field but has fewer than 2 options.`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
    }
    if (q.options.some(o => /^option\s*[a-d1-4]$/i.test(o))) {
      issues.push({ code: 'placeholder_options', severity: 'error', message: `${qName(form, q)} uses placeholder options like "Option A" instead of real choices.`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
    }
  }

  // Language.
  const lang = languageOk(form, spec);
  checks.push({ requirement: `Content in ${spec.language.name}`, status: lang.ok ? 'met' : 'unmet', detail: lang.detail });
  if (!lang.ok) issues.push({ code: 'language', severity: 'error', message: `All titles, labels and options must be written in ${spec.language.name} (${lang.detail}).`, modelRepairable: true });

  if (form.isAssessment) {
    // Answers and per-kind structure.
    let unresolved = 0;
    for (const q of items) {
      const v = q.validations;
      const kind = kindOf(q)!;
      const name = qName(form, q);
      if (AUTO_GRADED_KINDS.includes(kind) && spec.includeAnswerKey) {
        if (v.correctAnswer === undefined) {
          unresolved++;
          issues.push({ code: 'answer', severity: 'error', message: v.unresolvedAnswer ? `${name}: correct answer "${v.unresolvedAnswer}" does not match its options exactly.` : `${name}: missing correct answer.`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
        }
      }
      if (kind === 'fill_blank' && !/_{2,}|\.{3,}|…|\[blank\]/i.test(q.label)) {
        issues.push({ code: 'blank_marker', severity: 'warning', message: `${name}: a fill-in-the-blank question should contain a blank such as "_____".`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
      }
      if ((kind === 'predict_output' || kind === 'debugging') && !v.codeSnippet) {
        issues.push({ code: 'code_snippet', severity: 'error', message: `${name}: ${kindLabel(kind)} need the code in "codeSnippet".`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
      }
      if (kind === 'match_following' && (!Array.isArray(v.matchLeft) || v.matchLeft.length < 2 || q.options.length < v.matchLeft.length)) {
        issues.push({ code: 'matching', severity: 'error', message: `${name}: match-the-following needs at least 2 "matchLeft" items and a right-column option for each.`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
      }
      if (kind === 'ordering' && q.options.length < 3) {
        issues.push({ code: 'ordering', severity: 'error', message: `${name}: ordering questions need at least 3 items to arrange.`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
      }
      if (!AUTO_GRADED_KINDS.includes(kind) && spec.includeAnswerKey && !v.modelAnswer && !v.rubric) {
        issues.push({ code: 'rubric', severity: 'warning', message: `${name}: descriptive/coding questions need a "modelAnswer" or "rubric" for grading.`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
      }
      if (kind === 'coding' && !(Array.isArray(v.examples) && v.examples.length) && !(Array.isArray(v.testCases) && v.testCases.length)) {
        issues.push({ code: 'coding_examples', severity: 'warning', message: `${name}: coding problems should include input/output examples or test cases.`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
      }
      if (CODE_KINDS.includes(kind) && spec.programmingLanguage && v.programmingLanguage && String(v.programmingLanguage).toLowerCase().replace(/\s/g, '') !== spec.programmingLanguage.toLowerCase().replace(/\s/g, '')) {
        issues.push({ code: 'programming_language', severity: 'error', message: `${name} uses ${v.programmingLanguage}, but ${spec.programmingLanguage} was requested.`, modelRepairable: true, questionIndex: form.questions.indexOf(q) });
      }
    }
    if (spec.includeAnswerKey) checks.push({ requirement: 'Answer key matches the questions', status: unresolved ? 'unmet' : 'met', detail: unresolved ? `${unresolved} question(s) without a verifiable answer` : undefined });

    // Difficulty distribution (labels only — rigor is reviewed by the AI prompt, not verifiable here).
    const targets = difficultyTargets(spec, items.length);
    if (targets) {
      const actual: Partial<Record<DifficultyLevel, number>> = {};
      for (const q of items) { const d = q.validations.difficulty as DifficultyLevel | undefined; if (d) actual[d] = (actual[d] || 0) + 1; }
      const ok = DIFFICULTY_ORDER.every(l => (targets[l] || 0) === (actual[l] || 0));
      const describe = (m: Partial<Record<DifficultyLevel, number>>) => DIFFICULTY_ORDER.filter(l => m[l]).map(l => `${m[l]} ${l}`).join(', ') || 'none';
      checks.push({ requirement: `Difficulty: ${describe(targets)}`, status: ok ? 'met' : 'unmet', detail: `generated ${describe(actual)}` });
      if (!ok) issues.push({ code: 'difficulty', severity: 'error', message: `Difficulty must be distributed as ${describe(targets)} (currently ${describe(actual)}). Rewrite questions so their real complexity matches; do not just relabel.`, modelRepairable: true });
    }

    if (spec.edit?.difficultyChange && existing && spec.edit.targetQuestionNumbers.length) {
      for (const n of spec.edit.targetQuestionNumbers) {
        const ex = existing.questions[n - 1];
        const cur = ex?.id ? form.questions.find(q => q.id === ex.id) : undefined;
        const changed = cur && !sameContent(cur, ex);
        checks.push({ requirement: `Question ${n} made ${spec.edit.difficultyChange}`, status: changed ? 'met' : 'unmet' });
        if (!changed) issues.push({ code: `target_unchanged:${n}`, severity: 'error', message: `Question ${n} (id ${ex?.id}) was supposed to be rewritten to be ${spec.edit.difficultyChange}, but it is unchanged. Keep its id.`, modelRepairable: true });
      }
    }

    if (spec.totalMarks !== undefined) {
      const total = sum(items.map(q => Number(q.validations.points) || 0));
      checks.push({ requirement: `Total marks = ${spec.totalMarks}`, status: Math.abs(total - spec.totalMarks) < 1e-6 ? (repairs.some(r => r.startsWith('Adjusted marks')) ? 'repaired' : 'met') : 'unmet', detail: `${total} marks` });
    }
    if (spec.marksPerQuestion !== undefined) checks.push({ requirement: `${spec.marksPerQuestion} marks per question`, status: 'met' });
    if (spec.timeLimitMinutes) checks.push({ requirement: `Time limit ${spec.timeLimitMinutes} minutes`, status: Number(form.settings.timer_limit) === spec.timeLimitMinutes ? 'met' : 'unmet' });
  } else {
    checks.push({ requirement: 'No marks, answer keys or grading on this form', status: repairs.some(r => r.startsWith('Removed marks')) ? 'repaired' : 'met' });
  }

  if (isModify && existing && spec.edit) {
    const e = spec.edit;
    const existingIds = new Set(existing.questions.map(q => q.id));
    const newCount = form.questions.filter(q => !q.id || !existingIds.has(q.id)).length;
    if (e.addCount) {
      const ok = newCount === e.addCount;
      checks.push({ requirement: `Add ${e.addCount} ${e.addKind ? kindLabel(e.addKind) : noun}`, status: ok ? 'met' : 'unmet', detail: `${newCount} added` });
      if (!ok) issues.push({ code: 'add_count', severity: 'error', message: `Exactly ${e.addCount} new ${e.addKind ? kindLabel(e.addKind) : noun} must be added (without ids); ${newCount} were added. Keep all existing questions with their ids.`, modelRepairable: true });
    }
    if (e.translateTo) {
      const ok = form.questions.length === existing.questions.length;
      checks.push({ requirement: 'Translation keeps the same questions', status: ok ? 'met' : 'unmet', detail: `${form.questions.length} of ${existing.questions.length}` });
      if (!ok) issues.push({ code: 'translate_structure', severity: 'error', message: `Translation must keep all ${existing.questions.length} questions (same ids, types and options count); only the text changes.`, modelRepairable: true });
    }
    if (e.strictPreserve || editScope(spec) === 'targeted') checks.push({ requirement: 'Everything else kept unchanged', status: repairs.some(r => r.startsWith('Restored') || r.startsWith('Re-inserted')) ? 'repaired' : 'met' });
  }

  return { form, issues, checks, repairs };
}

/** Final pass after the last model attempt: never present unverifiable answers as verified. */
export function markUnverifiedAnswers(form: CanonicalForm): number {
  let n = 0;
  for (const q of gradedQuestions(form)) {
    const v = q.validations;
    if (AUTO_GRADED_KINDS.includes(kindOf(q)!) && v.correctAnswer === undefined) {
      v.isGraded = false;
      v.needsReview = true;
      n++;
    }
    delete v.unresolvedAnswer;
  }
  return n;
}
