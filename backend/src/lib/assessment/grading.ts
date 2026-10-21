/**
 * Server-side grading and answer-key protection for assessments.
 *
 * Grading rules (documented, deterministic):
 * - single-choice / true-false / assertion-reasoning: exact option match (case- and whitespace-insensitive).
 * - multiple-correct: the selected set must equal the correct set (all-or-nothing).
 * - fill-in-the-blank / one-word / predict-the-output: match any accepted answer after normalising
 *   case, whitespace and trailing punctuation.
 * - numerical: numeric comparison within `tolerance` (default: exact to 1e-9).
 * - match-the-following: proportional credit per correct pair; "correct" only when all pairs match.
 * - ordering: the full sequence must match.
 * - descriptive / coding / SQL / debugging, and questions marked needsReview: not auto-graded
 *   (reported as pending manual review).
 * - negative marking deducts `negativePoints` for a wrong, non-empty objective answer; totals never go below 0.
 */

export interface GradedItem {
  questionId: string;
  questionLabel: string;
  assessmentType?: string;
  studentAnswer: any;
  correctAnswer?: any;
  explanation?: string;
  isCorrect: boolean | null;
  points: number;
  earned: number;
  gradingMode: 'auto' | 'manual';
  isGraded: boolean;
}

export interface QuizResults {
  isQuiz: boolean;
  totalPossiblePoints: number;
  earnedPoints: number;
  autoGradedPossiblePoints: number;
  pendingManualPoints: number;
  totalGradedQuestions: number;
  correctCount: number;
  percentage: number;
  passed?: boolean;
  questionsBreakdown: GradedItem[];
}

const MANUAL_KINDS = ['short_answer', 'long_answer', 'coding', 'debugging', 'sql', 'diagram'];

export const ANSWER_REVEALING_KEYS = ['correctAnswer', 'correct_answer', 'acceptedAnswers', 'tolerance', 'explanation', 'rubric', 'modelAnswer', 'testCases', 'hint_answer'];

function parseObj(v: any): any {
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
  return v && typeof v === 'object' ? v : {};
}

function hasAnswerKey(q: any): boolean {
  const v = parseObj(q.validations);
  if (v.isGraded === true) return true;
  const ans = v.correctAnswer ?? v.correct_answer;
  if (ans === undefined || ans === null) return false;
  if (Array.isArray(ans)) return ans.length > 0;
  if (typeof ans === 'object') return Object.keys(ans).length > 0;
  return String(ans).trim() !== '';
}

/**
 * Single rule for "is this a graded quiz/exam". An explicit settings.isQuiz always wins
 * (set by the AI generator and the builder's quiz toggle). Legacy forms without the flag are
 * assessments only when they carry real answer keys — empty placeholders from templates or
 * stray points do not count.
 */
export function isAssessmentForm(form: { settings?: any; category?: string | null; questions?: any[] }): boolean {
  const settings = parseObj(form.settings);
  if (settings.isQuiz === true) return true;
  if (settings.isQuiz === false) return false;
  const cat = String(form.category || settings.category || '').trim().toUpperCase();
  if (cat === 'QUIZ' || cat === 'ASSESSMENT') return true;
  const questions = form.questions || [];
  if (questions.some((q: any) => Boolean(parseObj(q.validations).assessmentType))) return true;
  const keyed = questions.filter(hasAnswerKey).length;
  return keyed > 0 && keyed * 2 >= questions.length;
}

/**
 * Whether respondents must give student identity (name, enrollment / roll number, email).
 * Explicit settings.require_student_identity wins; otherwise only assessments ask for it
 * (legacy quizzes keep their previous behaviour). Registration, survey, feedback, report,
 * food or travel forms never get enrollment fields injected.
 */
export function requiresStudentIdentity(form: { settings?: any; category?: string | null; title?: string | null; questions?: any[] }): boolean {
  const settings = parseObj(form.settings);
  if (typeof settings.require_student_identity === 'boolean') return settings.require_student_identity;
  if (settings.isQuiz === false) return false;
  if (settings.isQuiz === true) return true;
  if (isAssessmentForm(form)) return true;
  return /\b(quiz|exam|examination|test|assessment)\b/i.test(String(form.title || ''));
}

function norm(s: any): string {
  return String(s ?? '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').replace(/[.。!]+$/, '').trim();
}

function normOutput(s: any): string {
  return String(s ?? '').replace(/\r\n/g, '\n').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n').toLowerCase();
}

function asList(v: any): string[] {
  if (Array.isArray(v)) return v.map(x => String(x));
  if (v === undefined || v === null || v === '') return [];
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String); } catch { /* not JSON */ }
    return v.split(/\s*,\s*/).filter(Boolean);
  }
  return [String(v)];
}

function toNum(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const m = String(v).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/i);
  return m ? Number(m[0]) : undefined;
}

function isEmpty(ans: any): boolean {
  if (ans === undefined || ans === null) return true;
  if (Array.isArray(ans)) return ans.length === 0;
  if (typeof ans === 'object') return Object.keys(ans).length === 0;
  return String(ans).trim() === '';
}

/** Grade one answer. Returns null correctness for manually graded / ungraded questions. */
export function gradeQuestion(q: any, answer: any): GradedItem {
  const v = parseObj(q.validations);
  const kind: string | undefined = v.assessmentType;
  const correct = v.correctAnswer ?? v.correct_answer ?? q.correctAnswer;
  const points = Number(v.points ?? q.points ?? (correct !== undefined ? 1 : 0)) || 0;
  const base: GradedItem = {
    questionId: q.id,
    questionLabel: q.label,
    assessmentType: kind,
    studentAnswer: isEmpty(answer) ? '(No Answer)' : answer,
    correctAnswer: correct,
    explanation: v.explanation || q.explanation,
    isCorrect: null,
    points,
    earned: 0,
    gradingMode: 'auto',
    isGraded: false
  };

  const manual = (kind && MANUAL_KINDS.includes(kind)) || v.needsReview === true || v.gradingMode === 'manual';
  if (manual) return { ...base, gradingMode: 'manual', correctAnswer: v.modelAnswer ?? correct };
  if (correct === undefined || correct === null || (typeof correct === 'string' && correct.trim() === '') || v.isGraded === false || q.isGraded === false) {
    return base;
  }

  let isCorrect = false;
  let earned = 0;
  if (!isEmpty(answer)) {
    if (kind === 'mcq_multiple' || Array.isArray(correct) && kind !== 'ordering') {
      const want = new Set(asList(correct).map(norm));
      const got = new Set(asList(answer).map(norm));
      isCorrect = want.size === got.size && [...want].every(x => got.has(x));
    } else if (kind === 'ordering') {
      const want = asList(correct).map(norm);
      const got = asList(answer).map(norm);
      isCorrect = want.length === got.length && want.every((x, i) => x === got[i]);
    } else if (kind === 'match_following') {
      const want = parseObj(correct);
      const got = parseObj(answer);
      const lefts = Object.keys(want);
      const ok = lefts.filter(l => norm(got[l]) === norm(want[l])).length;
      isCorrect = lefts.length > 0 && ok === lefts.length;
      earned = lefts.length ? Math.round((points * ok / lefts.length) * 100) / 100 : 0;
    } else if (kind === 'numerical') {
      const got = toNum(answer);
      const tol = Number(v.tolerance) || 1e-9;
      const accepted = asList(v.acceptedAnswers?.length ? v.acceptedAnswers : correct).map(toNum).filter((x): x is number => x !== undefined);
      isCorrect = got !== undefined && accepted.some(a => Math.abs(a - got) <= tol);
    } else if (kind === 'predict_output') {
      const accepted = asList(v.acceptedAnswers?.length ? v.acceptedAnswers : [correct]);
      isCorrect = accepted.some(a => normOutput(a) === normOutput(answer));
    } else if (kind === 'fill_blank' || kind === 'one_word') {
      const accepted = Array.isArray(v.acceptedAnswers) && v.acceptedAnswers.length ? v.acceptedAnswers : [correct];
      isCorrect = accepted.some((a: any) => norm(a) === norm(answer));
    } else {
      isCorrect = norm(answer) === norm(correct);
    }
  }
  if (kind !== 'match_following') earned = isCorrect ? points : 0;
  const negative = Number(v.negativePoints) || 0;
  if (!isCorrect && !isEmpty(answer) && negative > 0 && kind !== 'match_following') earned = -Math.abs(negative);
  return { ...base, isCorrect, earned, isGraded: true };
}

function isIdentityQuestion(q: any): boolean {
  const v = parseObj(q.validations);
  if (v.assessmentType) return false;
  const hasAnswer = (v.correctAnswer ?? v.correct_answer) !== undefined;
  return !hasAnswer;
}

export function gradeSubmission(form: { settings?: any; category?: string | null; questions?: any[] }, answers: Record<string, any>): QuizResults {
  const empty: QuizResults = { isQuiz: false, totalPossiblePoints: 0, earnedPoints: 0, autoGradedPossiblePoints: 0, pendingManualPoints: 0, totalGradedQuestions: 0, correctCount: 0, percentage: 0, questionsBreakdown: [] };
  if (!isAssessmentForm(form)) return empty;
  const items = (form.questions || []).filter(q => !isIdentityQuestion(q)).map(q => gradeQuestion(q, answers[q.id]));
  const auto = items.filter(i => i.gradingMode === 'auto' && i.isGraded);
  const manual = items.filter(i => i.gradingMode === 'manual');
  const autoPossible = auto.reduce((s, i) => s + i.points, 0);
  const manualPossible = manual.reduce((s, i) => s + i.points, 0);
  const earnedRaw = auto.reduce((s, i) => s + i.earned, 0);
  const earned = Math.max(0, Math.round(earnedRaw * 100) / 100);
  const total = autoPossible + manualPossible;
  const settings = parseObj(form.settings);
  const percentage = total > 0 ? Math.round((earned / total) * 1000) / 10 : 0;
  let passed: boolean | undefined;
  if (settings.passing_score && typeof settings.passing_score === 'object' && manual.length === 0) {
    const { value, unit } = settings.passing_score;
    passed = unit === 'marks' ? earned >= Number(value) : percentage >= Number(value);
  }
  return {
    isQuiz: true,
    totalPossiblePoints: total,
    earnedPoints: earned,
    autoGradedPossiblePoints: autoPossible,
    pendingManualPoints: manualPossible,
    totalGradedQuestions: items.length,
    correctCount: auto.filter(i => i.isCorrect).length,
    percentage,
    passed,
    questionsBreakdown: items
  };
}

/** Remove answer keys (and secrets) before a form is shown to someone who cannot edit it. */
export function sanitizeFormForRespondent<T extends { settings?: any; questions?: any[] }>(form: T): T {
  const settings = { ...parseObj(form.settings) };
  const hadPassword = Boolean(settings.password);
  delete settings.password;
  if (hadPassword) settings.passwordProtected = true;
  const questions = Array.isArray(form.questions)
    ? form.questions.map((q: any) => {
        const v = { ...parseObj(q.validations) };
        for (const k of ANSWER_REVEALING_KEYS) delete v[k];
        const { correctAnswer, correct_answer, explanation, ...rest } = q;
        void correctAnswer; void correct_answer; void explanation;
        return { ...rest, validations: v };
      })
    : form.questions;
  return { ...form, settings, questions };
}
