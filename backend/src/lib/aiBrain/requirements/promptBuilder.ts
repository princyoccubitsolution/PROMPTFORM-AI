import { AssessmentQuestionKind, CanonicalForm, DifficultyLevel, RequirementSpec, VerificationIssue } from './types';
import { toModelFacing } from './canonical';
import { capitalize, distributeByWeights } from './specExtractor';
import { DIFFICULTY_ORDER, kindLabel } from './vocabulary';

/** Large papers are generated in batches so the model's output never gets truncated. */
export const BATCH_SIZE = 20;

export interface GenerationBatch {
  size: number;
  kinds?: Partial<Record<AssessmentQuestionKind, number>>;
  difficulty?: Partial<Record<DifficultyLevel, number>>;
}

export interface GenerationPlan {
  total?: number;
  batches: GenerationBatch[];
}

function difficultyTargets(spec: RequirementSpec, total: number): Partial<Record<DifficultyLevel, number>> | undefined {
  const d = spec.difficulty;
  if (!d) return undefined;
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

export function planGeneration(spec: RequirementSpec): GenerationPlan {
  const total = spec.itemCount && spec.itemCount.mode !== 'max' ? spec.itemCount.value : undefined;
  if (spec.operation === 'modify' || spec.artifactKind !== 'assessment' || !total || total <= BATCH_SIZE) {
    const kinds = Object.keys(spec.typeCounts).length ? spec.typeCounts : undefined;
    return { total, batches: [{ size: total || 0, kinds, difficulty: total ? difficultyTargets(spec, total) : undefined }] };
  }
  // Slot lists, then cut into batches keeping every batch's mix proportional.
  const kindSlots: Array<AssessmentQuestionKind | 'any'> = [];
  for (const [k, n] of Object.entries(spec.typeCounts)) for (let i = 0; i < (n || 0); i++) kindSlots.push(k as AssessmentQuestionKind);
  while (kindSlots.length < total) kindSlots.push('any');
  const remainingDifficulty: Partial<Record<DifficultyLevel, number>> = { ...(difficultyTargets(spec, total) || {}) };
  const batches: GenerationBatch[] = [];
  for (let start = 0; start < total; start += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, total - start);
    const kinds: Partial<Record<AssessmentQuestionKind, number>> = {};
    for (const slot of kindSlots.slice(start, start + size)) if (slot !== 'any') kinds[slot] = (kinds[slot] || 0) + 1;
    let difficulty: Partial<Record<DifficultyLevel, number>> | undefined;
    const remainingTotal = Object.values(remainingDifficulty).reduce((s, v) => s + (v || 0), 0);
    if (remainingTotal > 0) {
      difficulty = start + size >= total ? { ...remainingDifficulty } : distributeByWeights(size, remainingDifficulty);
      for (const [l, v] of Object.entries(difficulty)) remainingDifficulty[l as DifficultyLevel] = (remainingDifficulty[l as DifficultyLevel] || 0) - (v || 0);
    }
    batches.push({ size, kinds: Object.keys(kinds).length ? kinds : undefined, difficulty });
  }
  return { total, batches };
}

function describeKinds(kinds?: Partial<Record<AssessmentQuestionKind, number>>): string {
  if (!kinds) return '';
  return Object.entries(kinds).filter(([, n]) => n).map(([k, n]) => `${n} × ${kindLabel(k as AssessmentQuestionKind)} (assessmentType "${k}")`).join(', ');
}

function describeDifficulty(d?: Partial<Record<DifficultyLevel, number>>): string {
  if (!d) return '';
  return DIFFICULTY_ORDER.filter(l => d[l]).map(l => `${d[l]} ${l}`).join(', ');
}

/** The verifiable constraints, phrased as instructions. */
export function hardRequirements(spec: RequirementSpec, plan: GenerationPlan): string[] {
  const r: string[] = [];
  const noun = spec.artifactKind === 'assessment' ? 'questions' : 'fields';
  r.push(spec.artifactKind === 'assessment'
    ? `Artifact: a GRADED ASSESSMENT${spec.topic ? ` on "${spec.topic}"` : ''}${spec.audience ? ` for ${spec.audience}` : ''}.`
    : `Artifact: a DATA-COLLECTION FORM for: ${spec.purpose}. It is NOT a quiz.`);
  r.push(`Language: write ALL user-visible text (title, description, labels, options, explanations) in ${capitalize(spec.language.name)}.`);
  if (spec.explicitTitle) r.push(`Title must be exactly: "${spec.explicitTitle}".`);
  if (spec.itemCount) {
    const { mode, value } = spec.itemCount;
    r.push(`${mode === 'exact' ? 'Exactly' : mode === 'min' ? 'At least' : 'At most'} ${value} ${noun}${spec.artifactKind === 'assessment' ? ' (not counting any respondent identity fields)' : ''}.`);
  }
  const kinds = describeKinds(spec.typeCounts);
  if (kinds) r.push(`Question type distribution (exact): ${kinds}.${spec.itemCount && Object.values(spec.typeCounts).reduce((s, v) => s + (v || 0), 0) < spec.itemCount.value ? ' Remaining questions may be any other suitable type that is not excluded.' : ''}`);
  if (spec.onlyKinds) r.push(`Use ONLY these question types: ${spec.onlyKinds.map(k => `${kindLabel(k)} ("${k}")`).join(', ')}.`);
  if (spec.mentionedKinds.length && !kinds && !spec.onlyKinds) r.push(`Include these requested question types: ${spec.mentionedKinds.map(k => `${kindLabel(k)} ("${k}")`).join(', ')}.`);
  if (spec.excludedKinds.length) r.push(`Do NOT include: ${spec.excludedKinds.map(kindLabel).join(', ')}.`);
  if (spec.excludedFields.length) r.push(`Do NOT include these fields: ${spec.excludedFields.map(f => f.replace(/_/g, ' ')).join(', ')}.`);
  if (spec.requestedFields.length) r.push(`MUST include these requested fields: ${spec.requestedFields.map(f => f.replace(/_/g, ' ')).join(', ')}.`);
  if (spec.mandatoryFields.length) r.push(`Mark as required: ${spec.mandatoryFields.join(', ')}.`);
  if (spec.optionalFields.length) r.push(`Mark as optional: ${spec.optionalFields.join(', ')}.`);
  if (spec.allRequired) r.push('Every field is required.');
  if (spec.allOptional) r.push('Every field is optional.');
  const diff = plan.total ? describeDifficulty(difficultyTargets(spec, plan.total)) : (spec.difficulty?.level ? `all ${spec.difficulty.level}` : spec.difficulty?.mostly ? `mostly ${spec.difficulty.mostly}` : '');
  if (diff) r.push(`Difficulty distribution: ${diff}. The real complexity must match each label.`);
  if (spec.totalMarks !== undefined) r.push(`Total marks must add up to exactly ${spec.totalMarks}.`);
  if (spec.marksPerQuestion !== undefined) r.push(`Each question carries ${spec.marksPerQuestion} marks.`);
  const km = Object.entries(spec.kindMarks || {});
  if (km.length) r.push(`Marks per type: ${km.map(([k, m]) => `${kindLabel(k as AssessmentQuestionKind)} = ${m} marks each`).join(', ')}.`);
  if (spec.negativeMarking) r.push(`Negative marking: ${spec.negativeMarking} marks deducted per wrong objective answer (set "negativePoints").`);
  if (spec.passingScore) r.push(`Passing score: ${spec.passingScore.value}${spec.passingScore.unit === 'percent' ? '%' : ' marks'}.`);
  if (spec.timeLimitMinutes) r.push(`Time limit: ${spec.timeLimitMinutes} minutes (settings.timer_limit).`);
  if (spec.programmingLanguage && spec.artifactKind === 'assessment') r.push(`All code and coding questions use ${spec.programmingLanguage} (set "programmingLanguage": "${spec.programmingLanguage}").`);
  if (spec.artifactKind === 'assessment') {
    r.push(spec.includeAnswerKey ? 'Every question needs a verified answer key (correctAnswer, or modelAnswer + rubric for descriptive/coding).' : 'The user asked for NO answer key: leave correctAnswer empty.');
    if (spec.includeExplanations) r.push('Give a short explanation / solution for every question.');
  }
  return r;
}

const FORM_RULES = `FORM RULES (data-collection form):
- Never add marks, points, correct answers, explanations, difficulty, timers or grading. Do not set "assessmentType".
- Choose fields that serve the stated purpose. Do not add unrelated fields: no student roll / enrollment numbers unless it is an education form; no school fields on job applications; no grades on surveys.
- Keep every field the user explicitly asked for, even if it is unusual.
- Use the most specific widget "type": name, email, phone, address, date, time, number, price, dropdown, mcq (single choice), checkbox (multiple choice), rating, yes_no, long_text, short_text, file_upload, photo, resume, signature, agreement, location, website.
- Choice fields need real, context-specific options (never "Option 1 / Option 2").
- Conditional visibility goes in "logic": {"action": "show"|"hide", "conditions": [{"fieldLabel": "<exact label of another field>", "operator": "equals"|"not_equals"|"contains", "value": "<option>"}]}.
- Give every field a short semantic "key" in snake_case English (e.g. "email", "delivery_address", "check_in_date").`;

const ASSESSMENT_RULES = `ASSESSMENT RULES (graded paper). Each question sets "assessmentType" and is encoded like this:
- "mcq_single": type "mcq", 4 options, correctAnswer = exact text of the one correct option.
- "mcq_multiple": type "checkbox", 4-6 options, correctAnswer = array with the exact text of EVERY correct option.
- "true_false": type "mcq", options ["True","False"] (or their translation), correctAnswer = one of them.
- "fill_blank": type "short_text", label contains "_____" where the blank is, correctAnswer = expected answer, acceptedAnswers = all acceptable spellings/variants.
- "one_word": type "short_text", correctAnswer + acceptedAnswers.
- "numerical": type "short_text", correctAnswer = the number only (units in the label), optional "tolerance", explanation shows the working.
- "predict_output": type "short_text", "codeSnippet" = complete code, correctAnswer = the exact output. Trace the code line by line before answering.
- "debugging": type "long_text", "codeSnippet" = buggy code, modelAnswer = corrected code + what was wrong, rubric.
- "sql": type "long_text", "codeSnippet" = table schema, modelAnswer = correct SQL query, rubric.
- "coding": type "long_text", label = problem statement, "programmingLanguage", "constraints", "examples": [{"input","output"}], "testCases": [{"input","expectedOutput"}], modelAnswer = reference solution, rubric with marks breakdown.
- "short_answer" / "long_answer": type "long_text", modelAnswer + rubric (key points with marks).
- "assertion_reasoning": type "mcq", label "Assertion (A): ... Reason (R): ...", the 4 standard A/R options, correctAnswer.
- "case_study": put the scenario in "description"; either type "mcq" with options + correctAnswer, or type "long_text" with modelAnswer + rubric.
- "match_following": type "matching", "matchLeft" = left-column items, options = right-column items (shuffled), correctAnswer = {"<left item>": "<matching right item>"}.
- "ordering": type "ordering", options = the items in shuffled order, correctAnswer = array of the same items in the correct order.
- Every question has "points", "difficulty" ("easy" | "medium" | "hard" | "advanced") and, when sections are used, "section".
Difficulty meaning: easy = recall or straightforward application; medium = comprehension and ordinary problem solving; hard = multi-step reasoning, integration or debugging; advanced = deep subject knowledge and complex well-defined tasks. Do not put a hard label on a trivial question.
Answer integrity: before answering, re-read each final question and make sure the answer key is truly correct for that exact text and matches its options character for character. If you are not certain of an answer, replace the question with one you are certain about. Never invent an answer just to fill the field.
Do not add personal fields (phone, address, date of birth) unless the user asked; name / roll number identity fields are allowed only when requested.`;

const OUTPUT_SCHEMA = `OUTPUT: one JSON object, no markdown:
{
  "artifactKind": "form" | "assessment",
  "understanding": { "goal": string, "requirements": string[], "assumptions": string[] },
  "title": string,
  "description": string,
  "questions": [ {
    "id"?: string, "key": string, "type": string, "label": string, "description"?: string, "placeholder"?: string,
    "required": boolean, "options": string[], "logic"?: object,
    "assessmentType"?: string, "section"?: string, "points"?: number, "negativePoints"?: number, "difficulty"?: string,
    "correctAnswer"?: string | string[] | object, "acceptedAnswers"?: string[], "tolerance"?: number,
    "explanation"?: string, "hint"?: string, "rubric"?: string, "modelAnswer"?: string,
    "codeSnippet"?: string, "programmingLanguage"?: string, "constraints"?: string,
    "examples"?: [{"input": string, "output": string}], "testCases"?: [{"input": string, "expectedOutput": string}],
    "matchLeft"?: string[]
  } ],
  "theme": { "primary_color": string, "background_color": string, "font_family": string },
  "settings": { "collect_emails": boolean, "timer_limit": number }
}`;

export function buildGenerationInstruction(spec: RequirementSpec, plan: GenerationPlan): string {
  const requirements = hardRequirements(spec, plan).map((s, i) => `${i + 1}. ${s}`).join('\n');
  return `You are the form and assessment generator of PromptForm AI. You turn a user's request into a precise, ready-to-use form or graded paper.

UNDERSTANDING
- The user may write in English, Gujarati, Hindi, Hinglish or Gujlish, informally, with typos. Work out what they actually want from the whole message.
- The following HARD REQUIREMENTS were extracted from the message. They are mandatory and will be machine-checked; output that violates them is rejected:
${requirements}
- For anything not fixed above, choose sensible defaults that fit the purpose and list them in "understanding.assumptions". Do not ask questions.
- Title: a concise, natural title for the artifact (no instructions copied from the prompt) unless an exact title is required above.
- Description: never invent rules the user did not ask for (time limits, marks, negative marking, eligibility); only mention constraints listed above.

${spec.artifactKind === 'assessment' && !spec.artifactKindDeferred ? ASSESSMENT_RULES : FORM_RULES}
${spec.artifactKindDeferred ? `\nIf the uploaded document is a question paper / quiz, set "artifactKind": "assessment" and follow these rules instead:\n${ASSESSMENT_RULES}\n` : ''}
LANGUAGE: all user-visible text in ${capitalize(spec.language.name)}. Keep code, programming keywords, formulas and proper nouns unchanged. JSON keys and "assessmentType"/"type"/"key" values stay in English.

${OUTPUT_SCHEMA}`;
}

export function buildCreatePrompt(spec: RequirementSpec, plan: GenerationPlan, documentContext?: string): string {
  const parts = [`USER MESSAGE:\n"""${spec.rawPrompt || 'Generate a form from the uploaded file.'}"""`];
  if (documentContext && documentContext.trim()) {
    parts.push(`UPLOADED DOCUMENT CONTENT (base the form on it; follow the user's instructions over the document):\n"""${documentContext.slice(0, 12000)}"""`);
  }
  if (plan.batches.length > 1) {
    const b = plan.batches[0];
    const details = [describeKinds(b.kinds), b.difficulty ? `difficulty ${describeDifficulty(b.difficulty)}` : ''].filter(Boolean).join('; ');
    parts.push(`GENERATION PLAN: the paper has ${plan.total} questions and is produced in ${plan.batches.length} parts. Return the full JSON (title, description, settings, theme — the title and description describe the WHOLE paper and must not mention parts) but ONLY the first ${b.size} questions now${details ? ` (${details})` : ''}. The remaining questions will be requested next.`);
  } else if (plan.batches[0]?.kinds || plan.batches[0]?.difficulty) {
    const b = plan.batches[0];
    parts.push(`GENERATION PLAN: ${[describeKinds(b.kinds), b.difficulty ? `difficulty ${describeDifficulty(b.difficulty)}` : ''].filter(Boolean).join('; ')}.`);
  }
  parts.push('Return the JSON now.');
  return parts.join('\n\n');
}

export function buildModifyPrompt(spec: RequirementSpec, existing: CanonicalForm): string {
  const e = spec.edit;
  const rules: string[] = [
    'Apply ONLY the change(s) the user asked for and return the COMPLETE updated form JSON.',
    'Every question the user did not ask to change must be returned exactly as it is, with the same "id", type, options, answer key and marks.',
    'New questions must NOT have an "id". Removed questions are simply left out.',
    `Keep the artifact a ${existing.isAssessment ? 'graded assessment' : 'data-collection form'}${spec.artifactKind !== (existing.isAssessment ? 'assessment' : 'form') ? ` — the user asked to convert it to a ${spec.artifactKind}` : ''}.`
  ];
  if (e) {
    if (e.addCount) rules.push(`Add exactly ${e.addCount} new ${e.addKind ? kindLabel(e.addKind) : existing.isAssessment ? 'questions' : 'fields'}${e.keepDifficulty ? ' at the same difficulty level as the existing questions' : ''}${e.keepMarks ? ' with the same marks as the existing questions' : ''}.`);
    if (e.addFieldKeys.length) rules.push(`Add these fields: ${e.addFieldKeys.join(', ')}.`);
    if (e.removeKinds.length) rules.push(`Remove all ${e.removeKinds.map(kindLabel).join(', ')}.`);
    if (e.removeFieldKeys.length) rules.push(`Remove only the ${e.removeFieldKeys.join(', ')} field(s).`);
    if (e.removeQuestionNumbers.length) rules.push(`Remove question number(s) ${e.removeQuestionNumbers.join(', ')} (1-based order).`);
    if (e.targetQuestionNumbers.length) rules.push(`Only question number(s) ${e.targetQuestionNumbers.join(', ')} (1-based order) may change${e.difficultyChange ? `: make them ${e.difficultyChange} (rewrite the question itself, update answer and explanation, keep the id)` : ''}.`);
    if (e.translateTo) rules.push(`Translate every title, description, label, option, answer and explanation into ${capitalize(e.translateTo)}. Keep the same number of questions, ids, types and option order; translated correct answers must still match their options exactly.`);
    if (e.changeProgrammingLanguage) rules.push(`Rewrite all code and coding questions from ${e.changeProgrammingLanguage.from || 'the current language'} to ${e.changeProgrammingLanguage.to}; set "programmingLanguage": "${e.changeProgrammingLanguage.to}".`);
    if (e.makeRequired.length) rules.push(`Make required: ${e.makeRequired.join(', ')}.`);
    if (e.makeOptional.length) rules.push(`Make optional: ${e.makeOptional.join(', ')}.`);
  }
  if (spec.totalMarks !== undefined) rules.push(`The total marks must become ${spec.totalMarks}.`);
  if (spec.itemCount) rules.push(`The form must end up with ${spec.itemCount.mode === 'exact' ? 'exactly' : spec.itemCount.mode === 'min' ? 'at least' : 'at most'} ${spec.itemCount.value} ${existing.isAssessment ? 'questions' : 'fields'}.`);
  if (spec.onlyKinds) rules.push(`Use only: ${spec.onlyKinds.map(kindLabel).join(', ')} (convert or replace the others).`);
  return `CURRENT FORM (JSON — keep ids):\n${JSON.stringify(toModelFacing(existing))}\n\nUSER'S EDIT REQUEST:\n"""${spec.rawPrompt}"""\n\nEDIT RULES:\n${rules.map(r => `- ${r}`).join('\n')}\n\nReturn the complete updated JSON now.`;
}

export function buildRepairPrompt(issues: VerificationIssue[], current: CanonicalForm): string {
  return `Your previous JSON was checked and does NOT satisfy these requirements:\n${issues.map((i, n) => `${n + 1}. ${i.message}`).join('\n')}\n\nFix ONLY these problems. Return the COMPLETE corrected JSON in the same schema. Keep every "id" and keep everything that is already correct unchanged.\n\nPREVIOUS JSON:\n${JSON.stringify(toModelFacing(current))}`;
}

export function buildContinuationPrompt(form: CanonicalForm, needed: { count: number; kinds?: Partial<Record<AssessmentQuestionKind, number>>; difficulty?: Partial<Record<DifficultyLevel, number>> }): string {
  const existingLabels = form.questions.map(q => `- ${q.label.slice(0, 90)}`).slice(-80).join('\n');
  const details = [describeKinds(needed.kinds), needed.difficulty ? `difficulty ${describeDifficulty(needed.difficulty)}` : ''].filter(Boolean).join('; ');
  return `Continue the SAME ${form.isAssessment ? 'assessment' : 'form'} titled "${form.title}". Generate ONLY a JSON object {"questions": [...]} with exactly ${needed.count} additional question(s)${details ? ` (${details})` : ''}, following the same rules, language and schema.\nDo not repeat or paraphrase any of these existing questions:\n${existingLabels}`;
}
