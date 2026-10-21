import { AssessmentQuestionKind, CanonicalForm, CanonicalQuestion, RequirementSpec } from './types';
import { AUTO_GRADED_KINDS, KIND_TO_TYPE, detectFieldKey, normalizeDifficulty } from './vocabulary';

/**
 * Converts any AI / fallback / database shape into the single canonical form representation.
 * Assessment-only data lives in `validations` so it round-trips through the existing
 * Question.validations JSON column, the builder and PUT /forms/:id/questions unchanged.
 */

export const RENDERABLE_TYPES = [
  'short_text', 'long_text', 'name', 'email', 'phone', 'website', 'amount', 'price', 'number', 'password', 'feedback', 'address',
  'mcq', 'one_option', 'gender', 'checkbox', 'multiple_options', 'dropdown', 'country', 'agreement', 'rating', 'star-rating',
  'emoji-satisfaction-scale', 'yes_no', 'signature', 'file_upload', 'resume', 'photo', 'date', 'time', 'color', 'location',
  'otp', 'payment', 'matching', 'ordering'
];

export const CHOICE_TYPES = ['mcq', 'one_option', 'checkbox', 'multiple_options', 'dropdown'];

const TYPE_ALIASES: Record<string, string> = {
  text: 'short_text', 'short-text': 'short_text', shorttext: 'short_text', 'standard-input': 'short_text', input: 'short_text', string: 'short_text', short_answer: 'short_text',
  textarea: 'long_text', paragraph: 'long_text', 'long-text': 'long_text', longtext: 'long_text', essay: 'long_text', comments: 'long_text', message: 'long_text', description: 'long_text', code: 'long_text', coding: 'long_text',
  radio: 'mcq', single_choice: 'mcq', 'single-choice': 'mcq', multiple_choice: 'mcq', 'multiple-choice': 'mcq', choice: 'mcq', true_false: 'mcq', boolean_choice: 'mcq',
  checkboxes: 'checkbox', multi_choice: 'checkbox', multi_select: 'checkbox', 'multi-select': 'checkbox', multiselect: 'checkbox', tags: 'checkbox', 'interactive-tag-cloud': 'checkbox',
  select: 'dropdown', 'drop-down': 'dropdown', combobox: 'dropdown',
  stars: 'rating', star_rating: 'rating', scale: 'rating', likert: 'rating', nps: 'rating', satisfaction: 'rating', emoji: 'emoji-satisfaction-scale', satisfaction_emoji: 'emoji-satisfaction-scale', mood: 'emoji-satisfaction-scale',
  'yes-no': 'yes_no', yesno: 'yes_no', boolean: 'yes_no', toggle: 'yes_no',
  file: 'file_upload', upload: 'file_upload', 'file-uploader': 'file_upload', document: 'file_upload', attachment: 'file_upload', image: 'photo', picture: 'photo', cv: 'resume',
  datetime: 'date', 'date-time': 'date', dob: 'date', birthday: 'date', date_of_birth: 'date', birth_date: 'date', appointment_time: 'time',
  tel: 'phone', telephone: 'phone', mobile: 'phone', contact: 'phone', mail: 'email', email_address: 'email', url: 'website', link: 'website',
  full_name: 'name', first_name: 'name', last_name: 'name', currency: 'price', money: 'price', integer: 'number', numeric: 'number', quantity: 'number', age: 'number', count: 'number',
  consent: 'agreement', terms: 'agreement', 'location-selector': 'location', map: 'location', match: 'matching', match_the_following: 'matching', sequence: 'ordering', rank: 'ordering', ranking: 'ordering'
};

const KIND_ALIASES: Record<string, AssessmentQuestionKind> = {
  mcq: 'mcq_single', mcq_single: 'mcq_single', single: 'mcq_single', single_correct: 'mcq_single', multiple_choice: 'mcq_single', objective: 'mcq_single',
  mcq_multiple: 'mcq_multiple', multiple_correct: 'mcq_multiple', multi_correct: 'mcq_multiple', msq: 'mcq_multiple', multi_select: 'mcq_multiple', multiple_select: 'mcq_multiple', checkbox: 'mcq_multiple',
  fill_blank: 'fill_blank', fill_in_the_blank: 'fill_blank', fill_in_the_blanks: 'fill_blank', fill_blanks: 'fill_blank', blank: 'fill_blank', fill_up: 'fill_blank', cloze: 'fill_blank',
  true_false: 'true_false', truefalse: 'true_false', tf: 'true_false', boolean: 'true_false',
  match_following: 'match_following', match_the_following: 'match_following', matching: 'match_following', match: 'match_following',
  one_word: 'one_word', one_word_answer: 'one_word', single_word: 'one_word',
  short_answer: 'short_answer', short: 'short_answer', brief: 'short_answer',
  long_answer: 'long_answer', long: 'long_answer', descriptive: 'long_answer', essay: 'long_answer', detailed: 'long_answer',
  coding: 'coding', programming: 'coding', code: 'coding', code_writing: 'coding',
  predict_output: 'predict_output', output: 'predict_output', output_prediction: 'predict_output', predict_the_output: 'predict_output',
  debugging: 'debugging', debug: 'debugging', code_correction: 'debugging', bug_fix: 'debugging',
  sql: 'sql', sql_query: 'sql', query_writing: 'sql',
  numerical: 'numerical', numeric: 'numerical', calculation: 'numerical',
  assertion_reasoning: 'assertion_reasoning', assertion_reason: 'assertion_reasoning', assertion: 'assertion_reasoning',
  case_study: 'case_study', scenario: 'case_study', scenario_based: 'case_study', passage: 'case_study', comprehension: 'case_study',
  ordering: 'ordering', sequencing: 'ordering', sequence: 'ordering', arrange: 'ordering',
  diagram: 'diagram', image_based: 'diagram'
};

/** Keys that only belong to graded assessments; stripped from plain forms. */
export const ASSESSMENT_KEYS = [
  'assessmentType', 'points', 'negativePoints', 'difficulty', 'bloomsTaxonomy', 'correctAnswer', 'correct_answer', 'acceptedAnswers',
  'tolerance', 'explanation', 'hint', 'rubric', 'modelAnswer', 'codeSnippet', 'programmingLanguage', 'constraints', 'examples',
  'testCases', 'matchLeft', 'section', 'isGraded', 'gradingMode', 'needsReview'
];

/** Answer-revealing keys hidden from respondents before submission. */
export const ANSWER_KEYS = ['correctAnswer', 'correct_answer', 'acceptedAnswers', 'tolerance', 'explanation', 'rubric', 'modelAnswer', 'testCases'];

const IDENTITY_KEYS = ['name', 'email', 'phone', 'roll_number'];

function str(v: any): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function uniqueStrings(list: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const s = typeof item === 'object' && item !== null ? str(item.label ?? item.text ?? item.value) : str(item);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

const LETTER_PREFIX = /^\s*(?:\(?([a-h])\)|([a-h])[.:)]|\(?([1-9])\)|([1-9])[.)])\s+/i;

function stripLetterPrefix(option: string): string {
  return option.replace(LETTER_PREFIX, '').trim() || option;
}

function normalizeForCompare(s: string): string {
  return stripLetterPrefix(s).toLowerCase().replace(/[“”"'`]/g, '').replace(/\s+/g, ' ').replace(/[.。]+$/, '').trim();
}

/** Resolve an AI-provided answer ("B", "Option C", "b) Paris", "Paris") to the exact option text. */
export function resolveOption(answer: any, options: string[]): string | undefined {
  const a = str(answer);
  if (!a || options.length === 0) return undefined;
  const exact = options.find(o => o.trim().toLowerCase() === a.toLowerCase());
  if (exact) return exact;
  const na = normalizeForCompare(a);
  const normalized = options.find(o => normalizeForCompare(o) === na);
  if (normalized) return normalized;
  const letter = a.match(/^(?:option\s+)?\(?([a-h])\)?\.?$/i) || a.match(/^\(?([a-h])[).:]\s+/i);
  if (letter) {
    const idx = letter[1].toLowerCase().charCodeAt(0) - 97;
    if (idx >= 0 && idx < options.length) return options[idx];
  }
  // A bare number ("4") is an answer value, never an option index; only "Option 4" is an index.
  const digit = a.match(/^option\s+([1-9])$/i);
  if (digit) {
    const idx = Number(digit[1]) - 1;
    if (idx < options.length) return options[idx];
  }
  const contained = options.filter(o => {
    const no = normalizeForCompare(o);
    return no.length >= 3 && (na === no || na.startsWith(`${no} `) || na.endsWith(` ${no}`));
  });
  return contained.length === 1 ? contained[0] : undefined;
}

function parseAnswerList(value: any): string[] {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  const s = str(value);
  if (!s) return [];
  return s.split(/\s*(?:,|;|\||\band\b|&)\s*/i).map(x => x.trim()).filter(Boolean);
}

function toNumber(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic shuffle that never returns the original order (for ordering / matching). */
export function stableShuffle(items: string[], seed: string): string[] {
  if (items.length < 2) return [...items];
  const arr = [...items];
  let h = hashString(seed) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.every((v, i) => v === items[i])) arr.push(arr.shift() as string);
  return arr;
}

function resolveKind(rawQ: any, type: string, options: string[], label: string): AssessmentQuestionKind {
  const declared = str(rawQ.assessmentType ?? rawQ.questionType ?? rawQ.question_type ?? rawQ.kind ?? rawQ.validations?.assessmentType)
    .toLowerCase().replace(/[\s-]+/g, '_');
  if (declared && KIND_ALIASES[declared]) return KIND_ALIASES[declared];
  const rawType = str(rawQ.type).toLowerCase().replace(/[\s-]+/g, '_');
  if (KIND_ALIASES[rawType] && !['mcq', 'checkbox', 'boolean'].includes(rawType)) return KIND_ALIASES[rawType];
  const lower = label.toLowerCase();
  if (type === 'matching') return 'match_following';
  if (type === 'ordering') return 'ordering';
  if (type === 'checkbox' || type === 'multiple_options') return 'mcq_multiple';
  if (CHOICE_TYPES.includes(type) || options.length >= 2) {
    const tf = options.length === 2 && options.some(o => /^true$|^સાચું|^सही/i.test(normalizeForCompare(o))) && options.some(o => /^false$|^ખોટું|^गलत/i.test(normalizeForCompare(o)));
    if (tf || rawType === 'true_false' || rawType === 'boolean') return 'true_false';
    if (/assertion/i.test(lower) && /reason/i.test(lower)) return 'assertion_reasoning';
    return 'mcq_single';
  }
  if (rawQ.codeSnippet || rawQ.code) {
    if (/output/i.test(lower)) return 'predict_output';
    if (/bug|error|fix|correct\s+the/i.test(lower)) return 'debugging';
  }
  if (rawQ.programmingLanguage || /write\s+(?:a|an)\s+(?:program|function|code)/i.test(lower)) return 'coding';
  if (/\bsql\b|query/i.test(lower) && /write/i.test(lower)) return 'sql';
  if (type === 'short_text') return /_{2,}|\.{3,}|…|\[blank\]/i.test(label) ? 'fill_blank' : 'one_word';
  return /explain|describe|discuss|essay|elaborate|justify/i.test(lower) ? 'long_answer' : 'short_answer';
}

function defaultPoints(kind: AssessmentQuestionKind): number {
  if (['mcq_single', 'mcq_multiple', 'true_false', 'fill_blank', 'one_word', 'assertion_reasoning'].includes(kind)) return 1;
  if (['predict_output', 'numerical', 'match_following', 'ordering', 'short_answer', 'sql', 'debugging'].includes(kind)) return 2;
  if (['case_study', 'long_answer'].includes(kind)) return 5;
  if (kind === 'coding') return 5;
  return 1;
}

function normalizeFormType(rawType: string, label: string, key: string | undefined, options: string[]): string {
  let t = rawType.toLowerCase().trim().replace(/\s+/g, '_');
  t = TYPE_ALIASES[t] || t;
  if (!RENDERABLE_TYPES.includes(t)) {
    if (/rating|satisf|nps|likert/.test(t)) t = 'rating';
    else if (/file|upload|attach/.test(t)) t = 'file_upload';
    else if (/date/.test(t)) t = 'date';
    else if (/time/.test(t)) t = 'time';
    else if (/check|multi/.test(t)) t = 'checkbox';
    else if (/select|drop/.test(t)) t = 'dropdown';
    else if (/radio|choice|option/.test(t)) t = 'mcq';
    else if (/area|paragraph|long/.test(t)) t = 'long_text';
    else t = options.length >= 2 ? 'mcq' : 'short_text';
  }
  // Only upgrade generic text inputs, and only when the field clearly is an identity field.
  if (t === 'short_text' || t === 'text') {
    if (key === 'email') return 'email';
    if (key === 'phone') return 'phone';
    if (key === 'name' && /\b(?:full\s+)?name\b/i.test(label) && !/\bname\s+of\b/i.test(label)) return 'name';
    if (key === 'website') return 'website';
  }
  return t;
}

export interface ExistingQuestionRef {
  id?: string;
  type?: string;
  label?: string;
  required?: boolean;
  options?: any;
  validations?: any;
  logic?: any;
}

export interface CanonicalizeOptions {
  existing?: { title?: string; description?: string | null; questions?: ExistingQuestionRef[]; theme?: any; settings?: any } | null;
}

function cleanLabel(label: string): string {
  return label
    .replace(/^\s*(?:section\s*[a-z0-9]+\s*[-:]\s*)?(?:q(?:uestion)?\s*\d+\s*(?:\([^)]*\))?\s*[.:)\-]\s*)/i, '')
    .replace(/^\s*\d+\s*[.)]\s+/, '')
    .trim();
}

function canonicalQuestion(rawQ: any, index: number, isAssessment: boolean, existingIds: Set<string>): CanonicalQuestion | null {
  if (!rawQ || typeof rawQ !== 'object') return null;
  const rawValidations = rawQ.validations && typeof rawQ.validations === 'object' ? rawQ.validations : {};
  const label = cleanLabel(str(rawQ.label ?? rawQ.question ?? rawQ.text ?? rawQ.title ?? rawQ.prompt));
  if (!label) return null;
  let options = uniqueStrings(Array.isArray(rawQ.options) ? rawQ.options : Array.isArray(rawQ.choices) ? rawQ.choices : []);
  const key = str(rawQ.key) ? str(rawQ.key).toLowerCase().replace(/[^a-z0-9_]+/g, '_') : undefined;
  const fieldKey = detectFieldKey({ key, label, type: str(rawQ.type ?? rawQ.componentType) });
  let type = normalizeFormType(str(rawQ.type ?? rawQ.componentType) || (options.length ? 'mcq' : 'short_text'), label, fieldKey, options);
  const id = str(rawQ.id);
  const q: CanonicalQuestion = {
    ...(id && existingIds.has(id) ? { id } : {}),
    key: key || fieldKey,
    type,
    label,
    required: rawQ.required === undefined ? Boolean(rawValidations.required) : Boolean(rawQ.required),
    options,
    validations: {},
    logic: rawQ.logic && typeof rawQ.logic === 'object' ? rawQ.logic : {}
  };
  const description = str(rawQ.description ?? rawValidations.description);
  const placeholder = str(rawQ.placeholder ?? rawValidations.placeholder);
  if (description) q.description = description;
  if (placeholder) q.placeholder = placeholder;

  // Keep non-assessment validation rules (min/max length, patterns, file limits).
  for (const [k, v] of Object.entries(rawValidations)) {
    if (!ASSESSMENT_KEYS.includes(k) && v !== undefined) q.validations[k] = v;
  }
  if (description) q.validations.description = description;
  if (placeholder) q.validations.placeholder = placeholder;

  const rawCorrect = rawQ.correctAnswer ?? rawQ.correct_answer ?? rawQ.answer ?? rawValidations.correctAnswer ?? rawValidations.correct_answer;
  const looksIdentity = IDENTITY_KEYS.includes(fieldKey || '') && options.length === 0 && (rawCorrect === undefined || rawCorrect === null || str(rawCorrect) === '');

  if (!isAssessment || looksIdentity) {
    return q;
  }

  /* ------------------------- assessment question ------------------------- */
  const kind = resolveKind(rawQ, type, options, label);
  const v: Record<string, any> = q.validations;
  v.assessmentType = kind;
  q.type = KIND_TO_TYPE[kind];
  if (kind === 'case_study' && options.length >= 2) q.type = 'mcq';

  const pick = (...names: string[]) => {
    for (const n of names) {
      const val = rawQ[n] ?? rawValidations[n];
      if (val !== undefined && val !== null && val !== '') return val;
    }
    return undefined;
  };

  const points = toNumber(pick('points', 'marks', 'score'));
  if (points !== undefined && points >= 0) v.points = points;
  const negative = toNumber(pick('negativePoints', 'negative_points', 'negativeMarks'));
  if (negative !== undefined && negative !== 0) v.negativePoints = Math.abs(negative);
  const difficulty = normalizeDifficulty(pick('difficulty', 'level'));
  if (difficulty) v.difficulty = difficulty;
  const bloom = str(pick('bloomsTaxonomy', 'blooms'));
  if (bloom) v.bloomsTaxonomy = bloom.toUpperCase();
  for (const k of ['explanation', 'hint', 'rubric', 'modelAnswer', 'codeSnippet', 'programmingLanguage', 'constraints', 'section']) {
    const val = k === 'explanation' ? pick('explanation', 'solution') : k === 'codeSnippet' ? pick('codeSnippet', 'code', 'snippet') : k === 'modelAnswer' ? pick('modelAnswer', 'model_answer', 'sampleAnswer', 'referenceSolution') : k === 'rubric' ? pick('rubric', 'markingScheme', 'marking_scheme', 'gradingCriteria') : pick(k);
    if (val === undefined) continue;
    if (k === 'rubric' && Array.isArray(val)) v.rubric = val.map((r: any) => (typeof r === 'string' ? r : `${str(r.criterion ?? r.name)}${r.marks !== undefined ? ` (${r.marks} marks)` : ''}`)).filter(Boolean).join('\n');
    else if (typeof val === 'string' || typeof val === 'number') v[k] = String(val);
  }
  const examples = pick('examples');
  if (Array.isArray(examples)) v.examples = examples.filter((e: any) => e && typeof e === 'object').map((e: any) => ({ input: str(e.input), output: str(e.output ?? e.expectedOutput) }));
  const testCases = pick('testCases', 'test_cases');
  if (Array.isArray(testCases)) v.testCases = testCases.filter((t: any) => t && typeof t === 'object').map((t: any) => ({ input: str(t.input), expectedOutput: str(t.expectedOutput ?? t.output), ...(t.hidden ? { hidden: true } : {}) }));

  // Strip "A) " prefixes after resolving letter answers against the original options.
  const resolveAgainst = (ans: any) => {
    const hit = resolveOption(ans, options);
    if (hit === undefined) return undefined;
    return stripLetterPrefix(hit);
  };

  switch (kind) {
    case 'mcq_single':
    case 'assertion_reasoning':
    case 'case_study': {
      if (q.type === 'mcq') {
        const resolved = resolveAgainst(rawCorrect);
        options = options.map(stripLetterPrefix);
        q.options = uniqueStrings(options);
        if (resolved !== undefined) v.correctAnswer = resolved;
        else if (str(rawCorrect)) v.unresolvedAnswer = str(rawCorrect);
      } else if (str(rawCorrect)) {
        v.modelAnswer = v.modelAnswer || str(rawCorrect);
      }
      break;
    }
    case 'true_false': {
      const localized = options.length === 2 && !options.some(o => /^(true|false)$/i.test(normalizeForCompare(o)));
      const tfOptions = localized ? options.map(stripLetterPrefix) : ['True', 'False'];
      const ans = str(rawCorrect).toLowerCase();
      let resolved = resolveOption(rawCorrect, tfOptions);
      if (!resolved && !localized) {
        if (/^(true|t|yes|correct|right|સાચું|सही|1)$/.test(ans)) resolved = 'True';
        else if (/^(false|f|no|incorrect|wrong|ખોટું|गलत|0)$/.test(ans)) resolved = 'False';
      }
      if (rawCorrect === true) resolved = tfOptions[0];
      if (rawCorrect === false) resolved = tfOptions[1];
      q.options = tfOptions;
      if (resolved) v.correctAnswer = resolved;
      else if (str(rawCorrect)) v.unresolvedAnswer = str(rawCorrect);
      break;
    }
    case 'mcq_multiple': {
      const list = parseAnswerList(rawCorrect);
      const resolved = list.map(a => resolveAgainst(a)).filter((x): x is string => Boolean(x));
      q.options = uniqueStrings(options.map(stripLetterPrefix));
      if (resolved.length > 0 && resolved.length === list.length) v.correctAnswer = Array.from(new Set(resolved));
      else if (list.length) v.unresolvedAnswer = list.join(', ');
      break;
    }
    case 'fill_blank':
    case 'one_word':
    case 'numerical':
    case 'predict_output': {
      q.options = [];
      const accepted = uniqueStrings([...(Array.isArray(rawCorrect) ? rawCorrect : [rawCorrect]), ...(Array.isArray(pick('acceptedAnswers', 'accepted_answers', 'alternatives')) ? pick('acceptedAnswers', 'accepted_answers', 'alternatives') : [])]);
      if (accepted.length) {
        v.correctAnswer = accepted[0];
        v.acceptedAnswers = accepted;
      }
      const tol = toNumber(pick('tolerance'));
      if (kind === 'numerical' && tol !== undefined) v.tolerance = Math.abs(tol);
      break;
    }
    case 'match_following': {
      let left: string[] = uniqueStrings(Array.isArray(pick('matchLeft', 'leftItems', 'left', 'columnA', 'premises')) ? pick('matchLeft', 'leftItems', 'left', 'columnA', 'premises') : []);
      let right: string[] = options;
      const pairs = pick('pairs', 'matches');
      const mapping: Record<string, string> = {};
      if (Array.isArray(pairs)) {
        for (const p of pairs) {
          const l = str(p?.left ?? p?.premise ?? p?.a ?? (Array.isArray(p) ? p[0] : ''));
          const r = str(p?.right ?? p?.response ?? p?.b ?? (Array.isArray(p) ? p[1] : ''));
          if (l && r) mapping[l] = r;
        }
      }
      if (rawCorrect && typeof rawCorrect === 'object' && !Array.isArray(rawCorrect)) {
        for (const [l, r] of Object.entries(rawCorrect)) if (str(l) && str(r)) mapping[str(l)] = str(r);
      }
      if (left.length === 0) left = Object.keys(mapping);
      const rightFromMap = Object.values(mapping);
      right = uniqueStrings([...(right.length ? right : []), ...rightFromMap]);
      // Resolve each mapped right value to an exact right-column option.
      const resolvedMap: Record<string, string> = {};
      for (const l of left) {
        const r = mapping[l] ?? mapping[Object.keys(mapping).find(k => k.toLowerCase() === l.toLowerCase()) || ''];
        const hit = r !== undefined ? resolveOption(r, right) : undefined;
        if (hit) resolvedMap[l] = hit;
      }
      v.matchLeft = left;
      q.options = options.length >= 2 ? right : stableShuffle(right, label);
      if (left.length > 0 && Object.keys(resolvedMap).length === left.length) v.correctAnswer = resolvedMap;
      else if (Object.keys(mapping).length) v.unresolvedAnswer = JSON.stringify(mapping);
      break;
    }
    case 'ordering': {
      const order = parseAnswerList(Array.isArray(rawCorrect) ? rawCorrect : (pick('correctOrder', 'correct_order') ?? rawCorrect));
      const items = options.length >= 2 ? options : order;
      const resolved = order.map(o => resolveOption(o, items)).filter((x): x is string => Boolean(x));
      q.options = stableShuffle(items, label);
      if (resolved.length === items.length && new Set(resolved).size === items.length) v.correctAnswer = resolved;
      else if (order.length) v.unresolvedAnswer = order.join(' > ');
      break;
    }
    default: {
      // Descriptive / coding / SQL / debugging: graded manually against the rubric / model answer.
      q.options = [];
      if (str(rawCorrect) && !v.modelAnswer) v.modelAnswer = str(rawCorrect);
      break;
    }
  }

  const autoGraded = AUTO_GRADED_KINDS.includes(kind) && v.correctAnswer !== undefined;
  v.gradingMode = AUTO_GRADED_KINDS.includes(kind) ? 'auto' : 'manual';
  v.isGraded = autoGraded;
  if (v.points === undefined) v.points = defaultPoints(kind);
  if (v.correctAnswer !== undefined) v.correct_answer = v.correctAnswer;
  void index;
  return q;
}

function themeFromSlug(slug: string): Record<string, any> {
  const s = slug.toLowerCase();
  let primary = '#4f46e5';
  let background = '#f5f3ff';
  if (/medical|health|clinic|doctor|hospital|emerald|mint|green|teal/.test(s)) { primary = '#059669'; background = '#ecfdf5'; }
  else if (/dark|slate|black|zinc/.test(s)) { primary = '#6366f1'; background = '#0f172a'; }
  else if (/coffee|bakery|cafe|food|dining|restaurant|amber|warm/.test(s)) { primary = '#d97706'; background = '#fffbeb'; }
  else if (/gym|fitness|sport|workout|purple|violet|crimson/.test(s)) { primary = '#7c3aed'; background = '#f5f3ff'; }
  return { theme_name: s, primary_color: primary, background_color: background, font_family: 'Inter' };
}

const THEME_CHANGE = /\b(?:theme|colou?rs?|dark\s+mode|light\s+mode|font|banner|header\s+image|background|branding|style|design)\b/i;
const TITLE_CHANGE = /\b(?:title|rename|retitle|heading|description|subtitle)\b/i;

export function canonicalizeArtifact(raw: any, spec: RequirementSpec, opts: CanonicalizeOptions = {}): CanonicalForm {
  const src = raw && typeof raw === 'object' ? (raw.form_data && typeof raw.form_data === 'object' ? raw.form_data : raw) : {};
  const existing = opts.existing || null;
  const declaredAssessment = src.artifactKind === 'assessment' || src.isQuiz === true || src.settings?.isQuiz === true;
  const isAssessment = spec.artifactKindDeferred ? declaredAssessment : spec.artifactKind === 'assessment';
  const existingIds = new Set<string>((existing?.questions || []).map(q => str(q.id)).filter(Boolean));

  const rawQuestions: any[] = Array.isArray(src.questions) ? src.questions : Array.isArray(src.fields) ? src.fields : [];
  const questions = rawQuestions
    .map((q, i) => canonicalQuestion(q, i, isAssessment, existingIds))
    .filter((q): q is CanonicalQuestion => Boolean(q));

  const isModify = spec.operation === 'modify' && existing;
  let title = str(src.title ?? src.formTitle);
  let description = str(src.description);
  if (isModify && existing) {
    const allowTextChange = Boolean(spec.explicitTitle) || Boolean(spec.edit?.translateTo) || TITLE_CHANGE.test(spec.normalizedPrompt);
    if (!allowTextChange || !title) title = existing.title || title;
    if (!allowTextChange || !description) description = str(existing.description) || description;
  }
  if (spec.explicitTitle) title = spec.explicitTitle;
  if (!title) title = isAssessment ? `${spec.topic || 'Knowledge'} Assessment` : 'Untitled Form';

  let theme: Record<string, any>;
  const rawTheme = src.theme;
  const existingTheme = existing?.theme && typeof existing.theme === 'object' ? existing.theme : null;
  if (isModify && existingTheme && !THEME_CHANGE.test(spec.normalizedPrompt)) theme = { ...existingTheme };
  else if (typeof rawTheme === 'string' && rawTheme.trim()) theme = { ...(existingTheme || {}), ...themeFromSlug(rawTheme) };
  else if (rawTheme && typeof rawTheme === 'object') theme = { ...(existingTheme || {}), ...rawTheme };
  else theme = existingTheme ? { ...existingTheme } : { primary_color: '#4f46e5', background_color: '#f5f3ff', font_family: 'Inter' };
  if (spec.language.isRtl) theme.rtl = true;
  else if (spec.language.source === 'explicit' || !isModify) theme.rtl = false;

  const baseSettings = isModify && existing?.settings && typeof existing.settings === 'object' ? { ...existing.settings } : {};
  const rawSettings = src.settings && typeof src.settings === 'object' ? src.settings : {};
  const settings: Record<string, any> = isModify
    ? baseSettings
    : {
        collect_emails: rawSettings.collect_emails ?? false,
        limit_responses: rawSettings.limit_responses ?? false,
        password: null,
        allow_editing: rawSettings.allow_editing ?? false,
        expires_at: null,
        expiration_message: null,
        ...baseSettings
      };
  settings.isQuiz = isAssessment;
  if (isAssessment) {
    if (spec.timeLimitMinutes !== undefined) settings.timer_limit = spec.timeLimitMinutes;
    else if (settings.timer_limit === undefined) settings.timer_limit = 0;
    if (settings.anti_cheat_detection === undefined) settings.anti_cheat_detection = true;
    const hasSections = questions.some(q => q.validations.section);
    if (settings.shuffle_questions === undefined) settings.shuffle_questions = !hasSections;
    if (spec.negativeMarking !== undefined) settings.negative_marking = spec.negativeMarking;
    if (spec.passingScore) settings.passing_score = spec.passingScore;
    if (spec.includeSolutionsAtEnd) settings.show_solutions_at_end = true;
    if (settings.show_answers_after_submit === undefined) settings.show_answers_after_submit = true;
  } else {
    settings.anti_cheat_detection = isModify ? Boolean(baseSettings.anti_cheat_detection) : false;
    settings.shuffle_questions = isModify ? Boolean(baseSettings.shuffle_questions) : false;
    settings.timer_limit = spec.timeLimitMinutes ?? (isModify ? Number(baseSettings.timer_limit) || 0 : 0);
    delete settings.negative_marking;
    delete settings.passing_score;
    delete settings.leaderboardReady;
    delete settings.certificateConfig;
  }

  return { title, description, questions, theme, settings, isAssessment };
}

/** Convert a DB form (with questions) to canonical shape for edit comparisons and AI context. */
export function canonicalFromDb(form: any): CanonicalForm {
  const settings = typeof form?.settings === 'string' ? safeJson(form.settings) : (form?.settings || {});
  const isAssessment = settings?.isQuiz === true || String(form?.category || '').toLowerCase() === 'quiz' ||
    (form?.questions || []).some((q: any) => q?.validations?.assessmentType || ((q?.validations?.correctAnswer ?? q?.validations?.correct_answer) !== undefined && Number(q?.validations?.points) > 0));
  return {
    title: form?.title || '',
    description: form?.description || '',
    theme: typeof form?.theme === 'string' ? safeJson(form.theme) : (form?.theme || {}),
    settings,
    isAssessment,
    questions: (form?.questions || []).map((q: any) => ({
      id: q.id,
      key: q.validations?.key,
      type: q.type,
      label: q.label,
      required: Boolean(q.required),
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [],
      validations: q.validations && typeof q.validations === 'object' ? { ...q.validations } : {},
      logic: q.logic && typeof q.logic === 'object' ? q.logic : {},
      ...(q.validations?.description ? { description: q.validations.description } : {})
    }))
  };
}

function safeJson(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

/** Shape sent to the AI as the current artifact during edits (ids kept for stable matching). */
export function toModelFacing(form: CanonicalForm): any {
  return {
    artifactKind: form.isAssessment ? 'assessment' : 'form',
    title: form.title,
    description: form.description,
    questions: form.questions.map(q => {
      const v = q.validations || {};
      const out: any = { id: q.id, key: q.key, type: q.type, label: q.label, required: q.required, options: q.options };
      if (q.description) out.description = q.description;
      if (q.logic && Object.keys(q.logic).length) out.logic = q.logic;
      if (form.isAssessment && v.assessmentType) {
        for (const k of ['assessmentType', 'section', 'points', 'negativePoints', 'difficulty', 'correctAnswer', 'acceptedAnswers', 'tolerance', 'explanation', 'rubric', 'modelAnswer', 'codeSnippet', 'programmingLanguage', 'constraints', 'examples', 'testCases', 'matchLeft']) {
          if (v[k] !== undefined) out[k] = v[k];
        }
      }
      return out;
    })
  };
}

/** Persistable question rows (validations carry key/description/placeholder for round-trips). */
export function toQuestionRows(form: CanonicalForm): Array<{ id?: string; type: string; label: string; required: boolean; options: string[]; validations: any; logic: any }> {
  return form.questions.map(q => {
    const validations: Record<string, any> = { ...(q.validations || {}) };
    if (q.key) validations.key = q.key;
    if (q.description) validations.description = q.description;
    if (q.placeholder) validations.placeholder = q.placeholder;
    delete validations.unresolvedAnswer;
    if (!form.isAssessment) for (const k of ASSESSMENT_KEYS) delete validations[k];
    return { ...(q.id ? { id: q.id } : {}), type: q.type, label: q.label, required: q.required, options: q.options, validations, logic: q.logic || {} };
  });
}
