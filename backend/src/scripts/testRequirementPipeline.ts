/**
 * Deterministic regression tests for the requirement-understanding pipeline, the canonical schema,
 * verification/repair, and server-side grading. No database, network or AI key needed: the AI is
 * replaced by scripted mocks.
 *
 * Run: npm run test:ai --workspace=backend
 */
import assert from 'assert';
import {
  extractRequirementSpec, canonicalizeArtifact, repairAndVerify, runRequirementPipeline, planGeneration,
  canonicalFromDb, toQuestionRows, rescalePoints, resolveOption, RequirementSpec, CanonicalForm
} from '../lib/aiBrain/requirements';
import { gradeSubmission, sanitizeFormForRespondent } from '../lib/assessment/grading';
import { sanitizeFormTitle } from '../lib/titleSanitizer';

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
const test = (name: string, fn: TestFn) => tests.push({ name, fn });

/* ------------------------------------------------------------------ fixtures */

const mcq = (label: string, options: string[], correctAnswer: any, extra: any = {}) => ({ type: 'mcq', assessmentType: 'mcq_single', label, options, correctAnswer, points: 1, difficulty: 'medium', explanation: 'Because.', ...extra });

function existingQuiz(n = 10): CanonicalForm {
  return canonicalFromDb({
    title: 'Python Basics Test',
    description: 'Test',
    settings: { isQuiz: true, anti_cheat_detection: true },
    theme: { primary_color: '#000' },
    category: 'quiz',
    questions: Array.from({ length: n }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      type: 'mcq',
      label: `What does Python expression number ${i + 1} return?`,
      required: true,
      options: ['1', '2', '3', '4'],
      validations: { assessmentType: 'mcq_single', correctAnswer: '2', correct_answer: '2', points: 2, difficulty: 'medium', isGraded: true, gradingMode: 'auto' },
      logic: {}
    }))
  });
}

function existingHotelForm(): CanonicalForm {
  return canonicalFromDb({
    title: 'Hotel Booking',
    description: 'Book a room',
    settings: { isQuiz: false },
    theme: { primary_color: '#123456' },
    questions: [
      { id: '11111111-0000-4000-8000-000000000001', type: 'name', label: 'Full Name', required: true, options: [], validations: { key: 'name' }, logic: {} },
      { id: '11111111-0000-4000-8000-000000000002', type: 'email', label: 'Email Address', required: false, options: [], validations: { key: 'email' }, logic: {} },
      { id: '11111111-0000-4000-8000-000000000003', type: 'address', label: 'Home Address', required: false, options: [], validations: { key: 'address' }, logic: {} },
      { id: '11111111-0000-4000-8000-000000000004', type: 'date', label: 'Check-in Date', required: true, options: [], validations: { key: 'check_in_date' }, logic: {} },
      { id: '11111111-0000-4000-8000-000000000005', type: 'dropdown', label: 'Room Type', required: true, options: ['Single', 'Double', 'Suite'], validations: { key: 'room_type' }, logic: {} }
    ]
  });
}

/** Scripted AI: returns queued responses (or computes them from the prompt). */
function mockModel(responses: Array<any | ((prompt: string) => any)>) {
  const calls: string[] = [];
  const fn = async (prompt: string) => {
    calls.push(prompt);
    const next = responses.length > 1 ? responses.shift() : responses[0];
    return typeof next === 'function' ? next(prompt) : JSON.parse(JSON.stringify(next));
  };
  return { fn, calls };
}

/* ------------------------------------------------------- 1. requirement spec */

test('food order form is a form, not a quiz', () => {
  const s = extractRequirementSpec('Create a food order form for my restaurant.');
  assert.strictEqual(s.operation, 'create');
  assert.strictEqual(s.artifactKind, 'form');
  assert.strictEqual(s.domain, 'food_order');
  assert.strictEqual(s.totalMarks, undefined);
});

test('Gujlish hotel booking prompt -> hotel booking form in English (with assumption)', () => {
  const s = extractRequirementSpec('Mare hotel booking form banavvu chhe.');
  assert.strictEqual(s.artifactKind, 'form');
  assert.strictEqual(s.domain, 'hotel_booking');
  assert.strictEqual(s.language.name, 'english');
  assert.ok(s.assumptions.some(a => /Gujlish|Hinglish/.test(a)));
});

test('customer feedback (Gujlish) is a survey form', () => {
  const s = extractRequirementSpec('Customer feedback mate form banao.');
  assert.strictEqual(s.artifactKind, 'form');
  assert.strictEqual(s.domain, 'customer_feedback');
});

test('Gujarati-script exam prompt -> Gujarati assessment, 50 marks, class 6, science', () => {
  const s = extractRequirementSpec('ધોરણ ૬ માટે ૫૦ ગુણનો વિજ્ઞાનનો પ્રશ્નપત્ર બનાવો.');
  assert.strictEqual(s.artifactKind, 'assessment');
  assert.strictEqual(s.language.name, 'gujarati');
  assert.strictEqual(s.totalMarks, 50);
  assert.strictEqual(s.audience, 'Class 6');
  assert.strictEqual(s.topic, 'Science');
  assert.strictEqual(s.itemCount, undefined, 'class number must not become the question count');
});

test('class number is not the question count ("Class 6 ... 50 marks")', () => {
  const s = extractRequirementSpec('Create a class 6 science paper of 50 marks');
  assert.strictEqual(s.itemCount, undefined);
  assert.strictEqual(s.totalMarks, 50);
});

test('difficult Python coding test with 15 questions', () => {
  const s = extractRequirementSpec('Make a difficult Python coding test with 15 questions.');
  assert.strictEqual(s.artifactKind, 'assessment');
  assert.deepStrictEqual(s.itemCount, { mode: 'exact', value: 15 });
  assert.strictEqual(s.programmingLanguage, 'Python');
  assert.deepStrictEqual(s.difficulty?.distribution, { hard: 15 });
});

test('exactly 8 fields, no email, Gujarati interface', () => {
  const s = extractRequirementSpec('Create a form with exactly 8 fields, no email field, and a Gujarati interface.');
  assert.strictEqual(s.artifactKind, 'form');
  assert.deepStrictEqual(s.itemCount, { mode: 'exact', value: 8 });
  assert.deepStrictEqual(s.excludedFields, ['email']);
  assert.strictEqual(s.language.name, 'gujarati');
  assert.strictEqual(s.language.source, 'explicit');
});

test('greeting / capability question -> converse', () => {
  assert.strictEqual(extractRequirementSpec('Hello, what can you help me create?').operation, 'converse');
  assert.strictEqual(extractRequirementSpec('hi').operation, 'converse');
});

test('mixed paper distribution, marks and difficulty percentages', () => {
  const s = extractRequirementSpec('Create a mixed paper with 30 questions comprising 10 MCQs, 5 fill-in-the-blanks, 5 true/false, 5 output-prediction questions and 5 coding problems, total 50 marks, 40% easy 40% medium 20% hard');
  assert.strictEqual(s.artifactKind, 'assessment');
  assert.deepStrictEqual(s.itemCount, { mode: 'exact', value: 30 });
  assert.deepStrictEqual(s.typeCounts, { predict_output: 5, coding: 5, fill_blank: 5, true_false: 5, mcq_single: 10 });
  assert.strictEqual(s.totalMarks, 50);
  assert.deepStrictEqual(s.difficulty?.distribution, { easy: 12, medium: 12, hard: 6 });
});

test('incompatible marks -> clarify with a proposed resolution', () => {
  const s = extractRequirementSpec('Python quiz with 20 questions of 2 marks each, total 50 marks');
  assert.strictEqual(s.operation, 'clarify');
  assert.ok(/40 marks/.test(s.clarificationQuestion || ''));
});

test('vague requests ask one clarification question', () => {
  assert.strictEqual(extractRequirementSpec('create a quiz').operation, 'clarify');
  assert.strictEqual(extractRequirementSpec('make a form').operation, 'clarify');
  assert.strictEqual(extractRequirementSpec('Make question 4 harder').operation, 'clarify', 'edit with no open form');
});

test('"exam registration form" and "blood test booking" are forms', () => {
  assert.strictEqual(extractRequirementSpec('Create an exam registration form for students').artifactKind, 'form');
  assert.strictEqual(extractRequirementSpec('Book a blood test appointment form').artifactKind, 'form');
  assert.strictEqual(extractRequirementSpec('Survey about the latest product contest').artifactKind, 'form');
});

test('survey with multiple-choice questions stays a survey', () => {
  const s = extractRequirementSpec('Customer feedback survey with 5 multiple choice questions and a comment box');
  assert.strictEqual(s.artifactKind, 'form');
  assert.ok(s.requestedFields.includes('comments'));
});

test('requested and excluded fields are extracted', () => {
  const s = extractRequirementSpec('Food ordering form with name, phone, delivery address and payment method, no email');
  assert.strictEqual(s.artifactKind, 'form');
  assert.deepStrictEqual(s.excludedFields, ['email']);
  for (const f of ['name', 'phone', 'address', 'payment']) assert.ok(s.requestedFields.includes(f), f);
});

test('only / exclude question kinds', () => {
  const s = extractRequirementSpec('JavaScript quiz with 10 questions, only MCQs, no true/false questions');
  assert.deepStrictEqual(s.onlyKinds, ['mcq_single']);
  assert.ok(s.excludedKinds.includes('true_false'));
});

test('follow-ups: add / keep marks / keep difficulty', () => {
  const s = extractRequirementSpec('Add five more questions but keep the same marks and difficulty.', { existingForm: existingQuiz() });
  assert.strictEqual(s.operation, 'modify');
  assert.strictEqual(s.artifactKind, 'assessment');
  assert.strictEqual(s.edit?.addCount, 5);
  assert.strictEqual(s.edit?.keepMarks, true);
  assert.strictEqual(s.edit?.keepDifficulty, true);
  assert.strictEqual(s.itemCount, undefined, '"five more" is not a new total');
});

test('follow-ups: targeted question, strict preserve', () => {
  const s = extractRequirementSpec('Make question 4 harder without changing the remaining questions.', { existingForm: existingQuiz() });
  assert.strictEqual(s.operation, 'modify');
  assert.deepStrictEqual(s.edit?.targetQuestionNumbers, [4]);
  assert.strictEqual(s.edit?.strictPreserve, true);
  assert.strictEqual(s.edit?.difficultyChange, 'harder');
});

test('follow-ups: questions 10-15 advanced, remove question 3', () => {
  const s = extractRequirementSpec('Make questions 10-15 advanced', { existingForm: existingQuiz(20) });
  assert.deepStrictEqual(s.edit?.targetQuestionNumbers, [10, 11, 12, 13, 14, 15]);
  assert.strictEqual(s.edit?.difficultyChange, 'advanced');
  const r = extractRequirementSpec('Remove question 3', { existingForm: existingQuiz() });
  assert.deepStrictEqual(r.edit?.removeQuestionNumbers, [3]);
});

test('follow-ups: new form instead of editing', () => {
  assert.strictEqual(extractRequirementSpec('Create a hotel booking form', { existingForm: existingQuiz() }).operation, 'create');
  assert.strictEqual(extractRequirementSpec('Create a completely new form instead.', { existingForm: existingQuiz() }).operation, 'clarify');
  assert.strictEqual(extractRequirementSpec('Create a completely new form instead for a gym membership', { existingForm: existingQuiz() }).operation, 'create');
});

test('follow-ups: remove only address, translate, language switch, marks change', () => {
  const r = extractRequirementSpec('Remove only the address field. Change nothing else.', { existingForm: existingHotelForm() });
  assert.deepStrictEqual(r.edit?.removeFieldKeys, ['address']);
  assert.strictEqual(r.edit?.strictPreserve, true);
  const t = extractRequirementSpec('Translate the form into Gujarati', { existingForm: existingHotelForm() });
  assert.strictEqual(t.edit?.translateTo, 'gujarati');
  assert.strictEqual(t.language.name, 'gujarati');
  const p = extractRequirementSpec('Use Python, not JavaScript.', { existingForm: existingQuiz() });
  assert.deepStrictEqual(p.edit?.changeProgrammingLanguage, { from: 'JavaScript', to: 'Python' });
  const m = extractRequirementSpec('Change the paper to 100 marks', { existingForm: existingQuiz() });
  assert.strictEqual(m.totalMarks, 100);
  const e = extractRequirementSpec('Make email mandatory', { existingForm: existingHotelForm() });
  assert.deepStrictEqual(e.edit?.makeRequired, ['email']);
});

test('typo-heavy prompt is still understood', () => {
  const s = extractRequirementSpec('pls mak a quizz on javascrpt with 10 mcqs for begginers');
  assert.strictEqual(s.artifactKind, 'assessment');
  assert.deepStrictEqual(s.typeCounts, { mcq_single: 10 });
  assert.deepStrictEqual(s.itemCount, { mode: 'exact', value: 10 });
});

test('large paper is planned in batches with exact totals', () => {
  const s = extractRequirementSpec('Create a 45 question physics exam: 30 MCQs and 15 numerical problems, mostly hard');
  const plan = planGeneration(s);
  assert.strictEqual(plan.batches.length, 3);
  assert.strictEqual(plan.batches.reduce((n, b) => n + b.size, 0), 45);
  const kinds: Record<string, number> = {};
  plan.batches.forEach(b => Object.entries(b.kinds || {}).forEach(([k, v]) => { kinds[k] = (kinds[k] || 0) + (v || 0); }));
  assert.deepStrictEqual(kinds, { mcq_single: 30, numerical: 15 });
  const diff: Record<string, number> = {};
  plan.batches.forEach(b => Object.entries(b.difficulty || {}).forEach(([k, v]) => { diff[k] = (diff[k] || 0) + (v || 0); }));
  assert.strictEqual(Object.values(diff).reduce((a, b) => a + b, 0), 45);
  assert.strictEqual(diff.hard, 27);
});

/* ------------------------------------------------------- 2. canonical schema */

test('answer resolution: letters, prefixes and exact text', () => {
  const opts = ['A) Paris', 'B) London', 'C) Rome', 'D) Berlin'];
  assert.strictEqual(resolveOption('A', opts), 'A) Paris');
  assert.strictEqual(resolveOption('Option C', opts), 'C) Rome');
  assert.strictEqual(resolveOption('london', opts), 'B) London');
  assert.strictEqual(resolveOption('Madrid', opts), undefined);
});

test('labels never override field types (message / time complexity / image)', () => {
  const spec = extractRequirementSpec('Create a contact form');
  const form = canonicalizeArtifact({ questions: [
    { type: 'long_text', label: 'Your message', key: 'message' },
    { type: 'short_text', label: 'Upload image caption' },
    { type: 'short_text', label: 'Email', key: 'email' }
  ] }, spec);
  assert.deepStrictEqual(form.questions.map(q => q.type), ['long_text', 'short_text', 'email']);
  const quiz = canonicalizeArtifact({ questions: [mcq('What is the time complexity of binary search?', ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'], 'B')] }, extractRequirementSpec('Algorithms quiz with 1 MCQ'));
  assert.strictEqual(quiz.questions[0].type, 'mcq');
  assert.strictEqual(quiz.questions[0].validations.correctAnswer, 'O(log n)');
});

test('mixed question kinds map to renderable types with answer data', () => {
  const spec = extractRequirementSpec('Python exam with MCQs, fill in the blanks, true/false, matching, ordering and coding');
  const form = canonicalizeArtifact({ questions: [
    { assessmentType: 'mcq_multiple', label: 'Which are mutable?', options: ['list', 'tuple', 'dict', 'str'], correctAnswer: ['list', 'dict'] },
    { assessmentType: 'true_false', label: 'Python is compiled to bytecode.', correctAnswer: true },
    { assessmentType: 'fill_blank', label: 'The keyword to define a function is _____.', correctAnswer: 'def', acceptedAnswers: ['def'] },
    { assessmentType: 'match_following', label: 'Match the type to the literal', matchLeft: ['list', 'dict'], options: ['{}', '[]'], correctAnswer: { list: '[]', dict: '{}' } },
    { assessmentType: 'ordering', label: 'Order the steps', options: ['define', 'call', 'return'], correctAnswer: ['define', 'call', 'return'] },
    { assessmentType: 'coding', label: 'Write a function that reverses a string.', programmingLanguage: 'Python', examples: [{ input: 'abc', output: 'cba' }], modelAnswer: 'def r(s): return s[::-1]' }
  ] }, spec);
  const [multi, tf, fill, match, order, code] = form.questions;
  assert.strictEqual(multi.type, 'checkbox');
  assert.deepStrictEqual(multi.validations.correctAnswer, ['list', 'dict']);
  assert.deepStrictEqual(tf.options, ['True', 'False']);
  assert.strictEqual(tf.validations.correctAnswer, 'True');
  assert.strictEqual(fill.type, 'short_text');
  assert.deepStrictEqual(fill.validations.acceptedAnswers, ['def']);
  assert.strictEqual(match.type, 'matching');
  assert.deepStrictEqual(match.validations.correctAnswer, { list: '[]', dict: '{}' });
  assert.strictEqual(order.type, 'ordering');
  assert.notDeepStrictEqual(order.options, ['define', 'call', 'return'], 'ordering items are shuffled for display');
  assert.deepStrictEqual(order.validations.correctAnswer, ['define', 'call', 'return']);
  assert.strictEqual(code.type, 'long_text');
  assert.strictEqual(code.validations.gradingMode, 'manual');
  assert.strictEqual(code.validations.programmingLanguage, 'Python');
});

test('unresolvable answer is not invented', () => {
  const form = canonicalizeArtifact({ questions: [mcq('2 + 2 = ?', ['3', '5', '6', '7'], '4')] }, extractRequirementSpec('Maths quiz with 1 MCQ'));
  assert.strictEqual(form.questions[0].validations.correctAnswer, undefined);
  assert.strictEqual(form.questions[0].validations.unresolvedAnswer, '4');
});

/* --------------------------------------------------- 3. verification/repair */

test('assessment metadata never leaks into a food order form', () => {
  const spec = extractRequirementSpec('Create a food order form for my restaurant.');
  const form = canonicalizeArtifact({ title: 'Food Order', questions: [
    { type: 'name', label: 'Full Name', points: 5, correctAnswer: 'x' },
    { type: 'mcq', label: 'Choose your dish', options: ['Pizza', 'Burger'], correctAnswer: 'Pizza', points: 5, difficulty: 'easy' }
  ], settings: { anti_cheat_detection: true, shuffle_questions: true, timer_limit: 10 } }, spec);
  const r = repairAndVerify(form, spec, null);
  for (const q of r.form.questions) {
    for (const k of ['points', 'correctAnswer', 'difficulty', 'assessmentType']) assert.strictEqual(q.validations[k], undefined, k);
  }
  assert.strictEqual(r.form.settings.isQuiz, false);
  assert.strictEqual(r.form.settings.anti_cheat_detection, false);
  assert.strictEqual(r.form.settings.timer_limit, 0);
  const rows = toQuestionRows(r.form);
  assert.ok(rows.every(row => row.validations.points === undefined));
});

test('hotel booking never inherits student roll numbers; excluded email removed', () => {
  const spec = extractRequirementSpec('Hotel booking form without email');
  const form = canonicalizeArtifact({ questions: [
    { type: 'name', label: 'Guest Name' },
    { type: 'short_text', label: 'Enrollment Number' },
    { type: 'email', label: 'Email Address' },
    { type: 'date', label: 'Check-in Date' }
  ] }, spec);
  const r = repairAndVerify(form, spec, null);
  assert.deepStrictEqual(r.form.questions.map(q => q.label), ['Guest Name', 'Check-in Date']);
});

test('exact field count: extra fields trimmed, requested fields protected', () => {
  const spec = extractRequirementSpec('Job application form with exactly 4 fields including resume');
  const form = canonicalizeArtifact({ questions: ['Full Name', 'Email', 'Phone', 'LinkedIn', 'Upload Resume'].map((l, i) => ({ type: i === 4 ? 'resume' : 'short_text', label: l })) }, spec);
  const r = repairAndVerify(form, spec, null);
  assert.strictEqual(r.form.questions.length, 4);
  assert.ok(r.form.questions.some(q => q.type === 'resume'));
  assert.ok(r.checks.some(c => /Exactly 4 fields/.test(c.requirement) && c.status === 'met'));
});

test('marks reconcile with the requested total (largest remainder)', () => {
  assert.deepStrictEqual(rescalePoints([1, 1, 1], 10), [4, 3, 3]);
  assert.strictEqual(rescalePoints([1, 2, 5, 5], 50).reduce((a, b) => a + b, 0), 50);
  assert.strictEqual(rescalePoints([1, 1, 1, 1], 2).reduce((a, b) => a + b, 0), 2);
  const spec = extractRequirementSpec('Science quiz with 3 MCQs, total 10 marks');
  const form = canonicalizeArtifact({ questions: [mcq('a?', ['1', '2'], '1'), mcq('b?', ['1', '2'], '2'), mcq('c?', ['1', '2'], '1')] }, spec);
  const r = repairAndVerify(form, spec, null);
  assert.strictEqual(r.form.questions.reduce((s, q) => s + q.validations.points, 0), 10);
  assert.ok(r.checks.some(c => c.requirement === 'Total marks = 10' && c.status !== 'unmet'));
});

test('broken conditional references are removed', () => {
  const spec = extractRequirementSpec('Event registration form');
  const form = canonicalizeArtifact({ questions: [
    { type: 'yes_no', label: 'Will you attend?' },
    { type: 'short_text', label: 'Dietary needs', logic: { action: 'show', conditions: [{ fieldLabel: 'Will you attend?', operator: 'equals', value: 'Yes' }] } },
    { type: 'short_text', label: 'Parking', logic: { action: 'show', conditions: [{ fieldLabel: 'Do you drive?', operator: 'equals', value: 'Yes' }] } }
  ] }, spec);
  const r = repairAndVerify(form, spec, null);
  assert.strictEqual(r.form.questions[1].logic.conditions.length, 1);
  assert.deepStrictEqual(r.form.questions[2].logic, {});
});

test('edit: remove only address keeps every other field and id', () => {
  const existing = existingHotelForm();
  const spec = extractRequirementSpec('Remove only the address field. Change nothing else.', { existingForm: existing });
  // The AI also rewrote "Room Type" options — that must be undone.
  const raw = { title: 'Hotel Booking', questions: existing.questions.filter(q => q.label !== 'Home Address').map(q => ({ ...q, options: q.label === 'Room Type' ? ['Deluxe'] : q.options })) };
  const r = repairAndVerify(canonicalizeArtifact(raw, spec, { existing }), spec, existing);
  assert.deepStrictEqual(r.form.questions.map(q => q.label), ['Full Name', 'Email Address', 'Check-in Date', 'Room Type']);
  assert.deepStrictEqual(r.form.questions[3].options, ['Single', 'Double', 'Suite']);
  assert.deepStrictEqual(r.form.questions.map(q => q.id), existing.questions.filter(q => q.label !== 'Home Address').map(q => q.id));
  assert.ok(r.repairs.some(x => x.startsWith('Restored')));
});

test('edit: make email mandatory changes only that flag', () => {
  const existing = existingHotelForm();
  const spec = extractRequirementSpec('Make email mandatory', { existingForm: existing });
  const r = repairAndVerify(canonicalizeArtifact({ questions: existing.questions }, spec, { existing }), spec, existing);
  assert.strictEqual(r.form.questions.find(q => q.label === 'Email Address')!.required, true);
  assert.strictEqual(r.form.questions.find(q => q.label === 'Home Address')!.required, false);
  assert.strictEqual(r.form.title, 'Hotel Booking');
  assert.strictEqual(r.form.theme.primary_color, '#123456', 'theme preserved');
});

test('edit: add five more keeps existing questions and marks', () => {
  const existing = existingQuiz(10);
  const spec = extractRequirementSpec('Add five more questions but keep the same marks and difficulty.', { existingForm: existing });
  const newOnes = Array.from({ length: 5 }, (_, i) => mcq(`New question ${i + 1}?`, ['a', 'b', 'c', 'd'], 'a', { points: 7 }));
  // The AI dropped two existing questions — they must be restored.
  const raw = { questions: [...existing.questions.slice(2).map(q => ({ ...q, ...q.validations })), ...newOnes] };
  const r = repairAndVerify(canonicalizeArtifact(raw, spec, { existing }), spec, existing);
  assert.strictEqual(r.form.questions.length, 15);
  assert.deepStrictEqual(r.form.questions.slice(0, 10).map(q => q.id), existing.questions.map(q => q.id));
  assert.ok(r.form.questions.slice(10).every(q => q.validations.points === 2), 'new questions use the existing marks');
  assert.ok(r.checks.some(c => /Add 5/.test(c.requirement) && c.status === 'met'));
});

test('edit: question 4 must actually change; others are restored', () => {
  const existing = existingQuiz(6);
  const spec = extractRequirementSpec('Make question 4 harder without changing the remaining questions.', { existingForm: existing });
  const unchanged = repairAndVerify(canonicalizeArtifact({ questions: existing.questions.map(q => ({ ...q, ...q.validations })) }, spec, { existing }), spec, existing);
  assert.ok(unchanged.issues.some(i => i.code === 'target_unchanged:4'));
  const raw = { questions: existing.questions.map((q, i) => ({ ...q, ...q.validations, label: i === 3 ? 'Harder: trace this generator expression' : i === 0 ? 'AI also rewrote me' : q.label })) };
  const changed = repairAndVerify(canonicalizeArtifact(raw, spec, { existing }), spec, existing);
  assert.ok(!changed.issues.some(i => i.code.startsWith('target_unchanged')));
  assert.strictEqual(changed.form.questions[0].label, existing.questions[0].label, 'non-target restored');
  assert.strictEqual(changed.form.questions[3].label, 'Harder: trace this generator expression');
});

test('edit: translation re-attaches ids by position and checks script', () => {
  const existing = existingHotelForm();
  const spec = extractRequirementSpec('Translate the form into Gujarati', { existingForm: existing });
  const gu = ['પૂરું નામ', 'ઈમેલ સરનામું', 'ઘરનું સરનામું', 'ચેક-ઇન તારીખ', 'રૂમનો પ્રકાર'];
  const raw = { title: 'હોટેલ બુકિંગ', questions: existing.questions.map((q, i) => ({ type: q.type, label: gu[i], required: q.required, options: i === 4 ? ['સિંગલ', 'ડબલ', 'સ્યુટ'] : [] })) };
  const r = repairAndVerify(canonicalizeArtifact(raw, spec, { existing }), spec, existing);
  assert.deepStrictEqual(r.form.questions.map(q => q.id), existing.questions.map(q => q.id));
  assert.ok(r.checks.some(c => c.requirement === 'Content in gujarati' && c.status === 'met'));
  const english = repairAndVerify(canonicalizeArtifact({ questions: existing.questions }, spec, { existing }), spec, existing);
  assert.ok(english.issues.some(i => i.code === 'language'));
});

/* ------------------------------------------------------- 4. full pipeline */

test('pipeline: shortfall is completed with a continuation round', async () => {
  const spec = extractRequirementSpec('JavaScript quiz with 10 MCQs');
  const eight = Array.from({ length: 8 }, (_, i) => mcq(`JS question ${i + 1}?`, ['a', 'b', 'c', 'd'], 'a'));
  const two = [mcq('JS question 9?', ['a', 'b', 'c', 'd'], 'b'), mcq('JS question 10?', ['a', 'b', 'c', 'd'], 'c')];
  const model = mockModel([{ artifactKind: 'assessment', title: 'JS Quiz', questions: eight }, { questions: two }]);
  const { form, report } = await runRequirementPipeline({ spec, callModel: model.fn });
  assert.strictEqual(form.questions.length, 10);
  assert.strictEqual(report.complete, true, JSON.stringify(report.unmet));
  assert.strictEqual(model.calls.length, 2);
  assert.ok(/additional/.test(model.calls[1]));
});

test('pipeline: wrong answer key is repaired by the model', async () => {
  const spec = extractRequirementSpec('Geography quiz with 2 MCQs');
  const bad = { questions: [mcq('Capital of France?', ['Paris', 'Rome', 'Berlin', 'Madrid'], 'Lyon'), mcq('Capital of Italy?', ['Paris', 'Rome', 'Berlin', 'Madrid'], 'B')] };
  const good = { questions: [mcq('Capital of France?', ['Paris', 'Rome', 'Berlin', 'Madrid'], 'Paris'), mcq('Capital of Italy?', ['Paris', 'Rome', 'Berlin', 'Madrid'], 'Rome')] };
  const model = mockModel([bad, good]);
  const { form, report } = await runRequirementPipeline({ spec, callModel: model.fn });
  assert.deepStrictEqual(form.questions.map(q => q.validations.correctAnswer), ['Paris', 'Rome']);
  assert.strictEqual(report.complete, true);
  assert.ok(/does not match its options/.test(model.calls[1]));
});

test('pipeline: unfixable answers are marked for review, never invented', async () => {
  const spec = extractRequirementSpec('Maths quiz with 1 MCQ');
  const model = mockModel([{ questions: [mcq('2 + 2 = ?', ['3', '5', '6', '7'], '4')] }]);
  const { form, report } = await runRequirementPipeline({ spec, callModel: model.fn, maxRepairRounds: 2 });
  const v = form.questions[0].validations;
  assert.strictEqual(v.correctAnswer, undefined);
  assert.strictEqual(v.needsReview, true);
  assert.strictEqual(v.isGraded, false);
  assert.strictEqual(report.complete, false);
  assert.ok(report.unmet.length > 0);
  assert.strictEqual(model.calls.length, 3, 'one generation + two bounded repair rounds');
});

test('pipeline: large mixed paper generated in batches meets exact distribution', async () => {
  const spec = extractRequirementSpec('Create a 30 question Java exam with 20 MCQs and 10 true/false questions');
  let counter = 0;
  const generator = (prompt: string) => {
    const want = (re: RegExp) => Number((prompt.match(re) || [])[1] || 0);
    const nMcq = want(/(\d+) × single-correct MCQs/);
    const nTf = want(/(\d+) × true\/false questions/);
    const qs = [
      ...Array.from({ length: nMcq }, () => mcq(`Java MCQ ${++counter}?`, ['a', 'b', 'c', 'd'], 'a')),
      ...Array.from({ length: nTf }, () => ({ assessmentType: 'true_false', label: `Java statement ${++counter} is valid.`, correctAnswer: 'False', points: 1, difficulty: 'easy', explanation: 'x' }))
    ];
    return { artifactKind: 'assessment', title: 'Java Exam', questions: qs };
  };
  const model = mockModel([generator]);
  const { form, report } = await runRequirementPipeline({ spec, callModel: model.fn });
  assert.strictEqual(form.questions.length, 30);
  assert.strictEqual(form.questions.filter(q => q.validations.assessmentType === 'mcq_single').length, 20);
  assert.strictEqual(form.questions.filter(q => q.validations.assessmentType === 'true_false').length, 10);
  assert.ok(model.calls.length >= 2, 'generated in more than one batch');
  assert.strictEqual(report.complete, true, JSON.stringify(report.unmet));
});

test('pipeline: Gujarati requested but English returned -> language repair', async () => {
  const spec = extractRequirementSpec('Customer feedback form in Gujarati with 2 fields');
  const english = { questions: [{ type: 'rating', label: 'How satisfied are you with our service overall?' }, { type: 'long_text', label: 'Any other comments for our team?' }] };
  const gujarati = { questions: [{ type: 'rating', label: 'અમારી સેવાથી તમે કેટલા સંતુષ્ટ છો?' }, { type: 'long_text', label: 'અમારી ટીમ માટે અન્ય કોઈ સૂચનો?' }] };
  const model = mockModel([english, gujarati]);
  const { report } = await runRequirementPipeline({ spec, callModel: model.fn });
  assert.ok(report.checks.some(c => c.requirement === 'Content in gujarati' && c.status === 'met'));
  assert.strictEqual(model.calls.length, 2);
});

test('pipeline: consecutive unrelated generations stay independent', async () => {
  const quizSpec = extractRequirementSpec('History quiz with 1 MCQ');
  const formSpec = extractRequirementSpec('Hotel booking form with 2 fields');
  const quiz = await runRequirementPipeline({ spec: quizSpec, callModel: mockModel([{ questions: [mcq('Year WW2 ended?', ['1945', '1939'], '1945')] }]).fn });
  const form = await runRequirementPipeline({ spec: formSpec, callModel: mockModel([{ questions: [{ type: 'name', label: 'Guest Name' }, { type: 'date', label: 'Check-in Date' }] }]).fn });
  assert.strictEqual(quiz.form.isAssessment, true);
  assert.strictEqual(form.form.isAssessment, false);
  assert.ok(form.form.questions.every(q => q.validations.points === undefined));
  assert.strictEqual(form.form.settings.isQuiz, false);
});

test('pipeline: malformed / empty AI output is reported, not shown as success', async () => {
  const spec = extractRequirementSpec('Wedding RSVP form');
  const { form, report } = await runRequirementPipeline({ spec, callModel: mockModel([{ nonsense: true }]).fn, maxRepairRounds: 1 });
  assert.strictEqual(form.questions.length, 0);
  assert.strictEqual(report.complete, false);
});

test('pipeline: duplicate ids from the AI are de-duplicated', async () => {
  const existing = existingHotelForm();
  const spec = extractRequirementSpec('Add a phone number field', { existingForm: existing });
  const dupId = existing.questions[0].id;
  const raw = { questions: [...existing.questions, { id: dupId, type: 'phone', label: 'Phone Number', key: 'phone' }] };
  const { form } = await runRequirementPipeline({ spec, existing, callModel: mockModel([raw]).fn });
  const ids = form.questions.map(q => q.id).filter(Boolean);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.ok(form.questions.some(q => q.type === 'phone' && !q.id));
});

/* ------------------------------------------------------------- 5. grading */

test('server grading covers every auto-graded kind and negative marking', () => {
  const qs = [
    { id: 'q1', label: 'single', validations: { assessmentType: 'mcq_single', correctAnswer: 'Paris', points: 2, negativePoints: 0.5 } },
    { id: 'q2', label: 'multi', validations: { assessmentType: 'mcq_multiple', correctAnswer: ['a', 'c'], points: 2 } },
    { id: 'q3', label: 'fill', validations: { assessmentType: 'fill_blank', correctAnswer: 'def', acceptedAnswers: ['def', 'DEF'], points: 1 } },
    { id: 'q4', label: 'num', validations: { assessmentType: 'numerical', correctAnswer: '3.14', tolerance: 0.01, points: 1 } },
    { id: 'q5', label: 'match', validations: { assessmentType: 'match_following', correctAnswer: { a: '1', b: '2' }, points: 2 } },
    { id: 'q6', label: 'order', validations: { assessmentType: 'ordering', correctAnswer: ['x', 'y', 'z'], points: 1 } },
    { id: 'q7', label: 'code', validations: { assessmentType: 'coding', modelAnswer: 'print(1)', points: 5 } },
    { id: 'q8', label: 'Student name', validations: {} }
  ];
  const r = gradeSubmission({ settings: { isQuiz: true }, questions: qs }, {
    q1: 'London', q2: ['c', 'a'], q3: 'Def ', q4: '3.141', q5: { a: '1', b: '3' }, q6: ['x', 'y', 'z'], q7: 'print(1)', q8: 'Asha'
  });
  const by = (id: string) => r.questionsBreakdown.find(i => i.questionId === id)!;
  assert.strictEqual(by('q1').earned, -0.5);
  assert.strictEqual(by('q2').isCorrect, true);
  assert.strictEqual(by('q3').isCorrect, true);
  assert.strictEqual(by('q4').isCorrect, true);
  assert.strictEqual(by('q5').earned, 1);
  assert.strictEqual(by('q6').isCorrect, true);
  assert.strictEqual(by('q7').gradingMode, 'manual');
  assert.ok(!r.questionsBreakdown.some(i => i.questionId === 'q8'), 'identity field is not graded');
  assert.strictEqual(r.pendingManualPoints, 5);
  assert.strictEqual(r.earnedPoints, 5.5);
});

test('non-assessment forms are never graded', () => {
  const r = gradeSubmission({ settings: { isQuiz: false }, questions: [{ id: 'q1', label: 'Dish', validations: { correctAnswer: 'Pizza', points: 5 } }] }, { q1: 'Pizza' });
  assert.strictEqual(r.isQuiz, false);
});

test('respondents never receive answer keys or the form password', () => {
  const safe: any = sanitizeFormForRespondent<any>({
    settings: { password: 'secret', isQuiz: true },
    questions: [{ id: 'q1', label: 'x', correctAnswer: 'a', validations: { correctAnswer: 'a', correct_answer: 'a', acceptedAnswers: ['a'], explanation: 'e', modelAnswer: 'm', rubric: 'r', points: 2, assessmentType: 'mcq_single' } }]
  });
  assert.strictEqual(safe.settings.password, undefined);
  assert.strictEqual(safe.settings.passwordProtected, true);
  const v = safe.questions[0].validations;
  for (const k of ['correctAnswer', 'correct_answer', 'acceptedAnswers', 'explanation', 'modelAnswer', 'rubric']) assert.strictEqual(v[k], undefined, k);
  assert.strictEqual(v.points, 2);
  assert.strictEqual((safe.questions![0] as any).correctAnswer, undefined);
});

/* --------------------------------------------------------------- 6. misc */

test('title sanitizer keeps Gujarati titles and test/exam titles intact', () => {
  assert.strictEqual(sanitizeFormTitle('ધોરણ 6 વિજ્ઞાન પ્રશ્નપત્ર'), 'ધોરણ 6 વિજ્ઞાન પ્રશ્નપત્ર');
  assert.strictEqual(sanitizeFormTitle('Python Coding Test'), 'Python Coding Test');
  assert.strictEqual(sanitizeFormTitle('Hotel Booking'), 'Hotel Booking');
});

/* ------------------------------------------------------------------ runner */

(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  \x1b[32mPASS\x1b[0m ${t.name}`);
    } catch (err: any) {
      failed++;
      console.log(`  \x1b[31mFAIL\x1b[0m ${t.name}\n       ${String(err?.message || err).split('\n').join('\n       ')}`);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
