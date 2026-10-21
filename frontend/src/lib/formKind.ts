/**
 * Form-kind rules shared by the public form, the builder and the responses pages.
 * Mirrors backend/src/lib/assessment/grading.ts (isAssessmentForm / requiresStudentIdentity)
 * so a form is treated the same way when it is rendered, edited, submitted and graded.
 */

const parse = (v: any): any => {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return v && typeof v === 'object' ? v : {};
};

const hasAnswerKey = (q: any): boolean => {
  const v = parse(q?.validations);
  // Respondents receive forms without answer keys; `isGraded` survives that sanitising.
  if (v.isGraded === true) return true;
  const ans = v.correctAnswer ?? v.correct_answer;
  if (ans === undefined || ans === null) return false;
  if (Array.isArray(ans)) return ans.length > 0;
  if (typeof ans === 'object') return Object.keys(ans).length > 0;
  return String(ans).trim() !== '';
};

/** Graded quiz / exam? Explicit settings.isQuiz wins; legacy forms need real answer keys. */
export function isAssessmentForm(form: any, questions?: any[]): boolean {
  const settings = parse(form?.settings);
  if (settings.isQuiz === true) return true;
  if (settings.isQuiz === false) return false;
  const category = String(form?.category || settings.category || '').trim().toUpperCase();
  if (category === 'QUIZ' || category === 'ASSESSMENT') return true;
  const qs = questions || form?.questions || [];
  if (qs.some((q: any) => Boolean(parse(q?.validations).assessmentType))) return true;
  const keyed = qs.filter(hasAnswerKey).length;
  return keyed > 0 && keyed * 2 >= qs.length;
}

/** Ask respondents for student name / enrollment number / email? Only quizzes that need it. */
export function requiresStudentIdentity(form: any, questions?: any[]): boolean {
  const settings = parse(form?.settings);
  if (typeof settings.require_student_identity === 'boolean') return settings.require_student_identity;
  if (settings.isQuiz === false) return false;
  if (settings.isQuiz === true) return true;
  if (isAssessmentForm(form, questions)) return true;
  return /\b(quiz|exam|examination|test|assessment)\b/i.test(String(form?.title || ''));
}

/** Marks shown on a question card: only in assessments, only for graded questions. */
export function questionPoints(form: any, q: any, questions?: any[]): number | null {
  if (!isAssessmentForm(form, questions)) return null;
  const v = parse(q?.validations);
  if (v.isGraded === false && !v.assessmentType) return null;
  const pts = Number(v.points ?? q?.points);
  if (!Number.isFinite(pts) || pts <= 0) return null;
  if (!v.assessmentType && !hasAnswerKey(q)) return null;
  return pts;
}
