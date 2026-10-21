import { AssessmentQuestionKind, DifficultyLevel } from './types';

/**
 * Shared multilingual vocabulary for requirement extraction and verification.
 * Patterns are matched against the normalized (lower-cased, Indic-digit-converted) prompt.
 */

const GUJARATI_DIGITS = '૦૧૨૩૪૫૬૭૮૯';
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

export function normalizeDigits(text: string): string {
  let out = '';
  for (const ch of text) {
    const g = GUJARATI_DIGITS.indexOf(ch);
    const d = DEVANAGARI_DIGITS.indexOf(ch);
    out += g >= 0 ? String(g) : d >= 0 ? String(d) : ch;
  }
  return out;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, dozen: 12,
  // Gujarati
  'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5, 'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10,
  'વીસ': 20, 'ત્રીસ': 30, 'ચાલીસ': 40, 'પચાસ': 50, 'સો': 100,
  // Hindi
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'सौ': 100,
  // Romanized Gujarati / Hindi. Only ever matched directly before a count noun.
  // ("do"/"be" are omitted: too ambiguous with English verbs.)
  ek: 1, tran: 3, teen: 3, chaar: 4, paanch: 5, panch: 5, saat: 7, aath: 8,
  das: 10, dus: 10, bees: 20, pachas: 50, pachaas: 50
};

/** Regex source for a number token: digits (incl. decimals) or a number word. */
export const NUMBER_TOKEN = `(\\d+(?:\\.\\d+)?|${Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')})`;

export function parseNumberToken(token: string | undefined | null): number | undefined {
  if (!token) return undefined;
  const t = token.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  // "twenty five" style compounds
  const parts = t.split(/[\s-]+/);
  let total = 0;
  for (const p of parts) {
    const v = NUMBER_WORDS[p];
    if (v === undefined) return undefined;
    total += v;
  }
  return total || undefined;
}

/**
 * Word-boundary helpers that also work for Indic scripts, where JS `\b` is unreliable and
 * vowel signs are combining marks (\p{M}) that must count as part of the word.
 */
export const WB_START = '(?:^|(?<=[^\\p{L}\\p{M}\\p{N}_]))';
export const WB_END = '(?=$|[^\\p{L}\\p{M}\\p{N}_])';

/** Indic postpositions that attach directly to a noun ("ગુજરાતીમાં", "प्रश्नों"). */
const INDIC_SUFFIX = '(?:માં|નો|ની|નું|ના|ને|થી|मे|में|का|की|के|ों)?';

export function wordRegex(pattern: string, flags = 'iu'): RegExp {
  return new RegExp(`${WB_START}(?:${pattern})${INDIC_SUFFIX}${WB_END}`, flags);
}

export function hasWord(text: string, pattern: string): boolean {
  return wordRegex(pattern).test(text);
}

export function findWord(text: string, pattern: string): RegExpMatchArray | null {
  return text.match(wordRegex(pattern));
}

/* -------------------------------------------------------------------------- */
/* Question kinds                                                              */
/* -------------------------------------------------------------------------- */

/** Ordered: more specific kinds first so "multiple correct MCQ" is not read as "MCQ". */
export const KIND_PATTERNS: Array<{ kind: AssessmentQuestionKind; pattern: string; label: string }> = [
  { kind: 'mcq_multiple', label: 'multiple-correct MCQs', pattern: "multiple[\\s-]*correct(?:\\s+(?:answer|option)s?)?(?:\\s+mcqs?)?|multi[\\s-]*(?:select|correct|answer)(?:\\s+mcqs?)?|more\\s+than\\s+one\\s+correct|select\\s+all\\s+that\\s+apply|msqs?|checkbox\\s+questions?" },
  { kind: 'assertion_reasoning', label: 'assertion-reasoning questions', pattern: "assertion[\\s-]*(?:and[\\s-]*|&\\s*|/\\s*)?reason(?:ing)?(?:\\s+questions?)?|a[\\s-]?r\\s+questions?" },
  { kind: 'predict_output', label: 'predict-the-output questions', pattern: "(?:predict|guess|find|what\\s+is|write)\\s+the\\s+output(?:\\s+questions?)?|output[\\s-]*(?:prediction|based|predict(?:ing)?)(?:\\s+questions?)?|output\\s+questions?" },
  { kind: 'debugging', label: 'debugging / code-correction questions', pattern: "debug(?:ging)?(?:\\s+questions?|\\s+problems?)?|code[\\s-]*correction(?:\\s+questions?)?|find\\s+(?:and\\s+fix\\s+)?the\\s+(?:bugs?|errors?)|fix\\s+the\\s+(?:code|bug)s?|error[\\s-]*finding" },
  { kind: 'sql', label: 'SQL query-writing questions', pattern: "sql\\s+(?:quer(?:y|ies)|questions?|problems?)|(?:write|writing)\\s+(?:an?\\s+)?sql(?:\\s+quer(?:y|ies))?|query[\\s-]*writing(?:\\s+questions?)?" },
  { kind: 'coding', label: 'coding problems', pattern: "coding(?:\\s+(?:questions?|problems?|challenges?|exercises?|tasks?))?|programming\\s+(?:questions?|problems?|exercises?|tasks?)|(?:write|writing)\\s+(?:a|an)\\s+(?:program|function|code)|code[\\s-]*writing|programs?\\s+to\\s+write" },
  { kind: 'match_following', label: 'match-the-following questions', pattern: "match(?:ing)?\\s+(?:the\\s+)?(?:following|columns?|pairs?)|matching\\s+(?:questions?|type|pairs?|exercises?)|જોડકાં|જોડકા|जोड़ी\\s+मिलाओ|मिलान\\s+करो" },
  { kind: 'fill_blank', label: 'fill-in-the-blank questions', pattern: "fill[\\s-]*in[\\s-]*(?:the[\\s-]*)?blanks?|fill[\\s-]*ups?|fill[\\s-]*blanks?|blanks|ખાલી\\s*જગ્યા(?:\\s*પૂરો)?|रिक्त\\s*स्थान" },
  { kind: 'true_false', label: 'true/false questions', pattern: "true\\s*(?:/|or|and|&|-)?\\s*false|t\\s*/\\s*f|sachu\\s*(?:/|ke|or)?\\s*khotu|સાચું\\s*(?:/|કે|અથવા)?\\s*ખોટું|सही\\s*(?:/|या)?\\s*गलत" },
  { kind: 'one_word', label: 'one-word answer questions', pattern: "one[\\s-]*word(?:\\s+answers?)?(?:\\s+questions?)?|એક\\s*શબ્દ(?:માં)?|एक\\s*शब्द" },
  { kind: 'numerical', label: 'numerical / calculation questions', pattern: "numericals?(?:\\s+(?:questions?|problems?))?|calculation[\\s-]*based(?:\\s+(?:questions?|problems?))?|calculation\\s+(?:questions?|problems?)" },
  { kind: 'case_study', label: 'case-study / scenario questions', pattern: "case[\\s-]*stud(?:y|ies)(?:\\s+questions?)?|scenario[\\s-]*based(?:\\s+questions?)?|passage[\\s-]*based(?:\\s+questions?)?|comprehension(?:\\s+questions?)?" },
  { kind: 'ordering', label: 'ordering / sequencing questions', pattern: "(?:ordering|sequencing|sequence|arrangement)\\s+(?:questions?|type|problems?)|arrange\\s+(?:in|the\\s+(?:steps|events|items)\\s+in)\\s+(?:the\\s+)?(?:correct\\s+)?(?:order|sequence)|re-?arrange(?:ment)?\\s+questions?|put\\s+in\\s+(?:the\\s+)?correct\\s+order" },
  { kind: 'diagram', label: 'diagram / image-based questions', pattern: "diagram(?:[\\s-]*based)?(?:\\s+questions?)?|image[\\s-]*based(?:\\s+questions?)?|picture[\\s-]*based(?:\\s+questions?)?|label\\s+the\\s+diagram" },
  { kind: 'long_answer', label: 'long-answer / descriptive questions', pattern: "long[\\s-]*answers?(?:\\s+questions?)?|long\\s+questions?|descriptive(?:\\s+questions?)?|essay(?:\\s+questions?)?|detailed[\\s-]*answers?|દીર્ઘ(?:\\s*જવાબી)?(?:\\s*પ્રશ્નો?)?|दीर्घ\\s*उत्तरीय?" },
  { kind: 'short_answer', label: 'short-answer questions', pattern: "short[\\s-]*answers?(?:\\s+questions?)?|short\\s+questions?|brief[\\s-]*answers?|ટૂંકા(?:\\s*જવાબી)?(?:\\s*પ્રશ્નો?)?|लघु\\s*उत्तरीय?" },
  { kind: 'mcq_single', label: 'single-correct MCQs', pattern: "mcqs?|m\\.c\\.q\\.?s?|multiple[\\s-]*choice(?:\\s+questions?)?|objective(?:[\\s-]*type)?(?:\\s+questions?)?|single[\\s-]*correct(?:\\s+mcqs?)?|બહુવિકલ્પી(?:\\s*પ્રશ્નો?)?|વૈકલ્પિક(?:\\s*પ્રશ્નો?)?|बहुविकल्पीय(?:\\s*प्रश्न)?|वस्तुनिष्ठ(?:\\s*प्रश्न)?" }
];

export function kindLabel(kind: AssessmentQuestionKind): string {
  return KIND_PATTERNS.find(k => k.kind === kind)?.label || kind;
}

/** Kinds a respondent's answer can be scored automatically for. */
export const AUTO_GRADED_KINDS: AssessmentQuestionKind[] = [
  'mcq_single', 'mcq_multiple', 'true_false', 'fill_blank', 'one_word', 'numerical',
  'predict_output', 'assertion_reasoning', 'match_following', 'ordering'
];

/** Renderable widget type used to store each kind (the kind itself lives in validations.assessmentType). */
export const KIND_TO_TYPE: Record<AssessmentQuestionKind, string> = {
  mcq_single: 'mcq',
  mcq_multiple: 'checkbox',
  true_false: 'mcq',
  fill_blank: 'short_text',
  one_word: 'short_text',
  numerical: 'short_text',
  predict_output: 'short_text',
  short_answer: 'long_text',
  long_answer: 'long_text',
  coding: 'long_text',
  debugging: 'long_text',
  sql: 'long_text',
  assertion_reasoning: 'mcq',
  case_study: 'long_text',
  match_following: 'matching',
  ordering: 'ordering',
  diagram: 'long_text'
};

export const ALL_KINDS = KIND_PATTERNS.map(k => k.kind);

/* -------------------------------------------------------------------------- */
/* Form fields                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Semantic field keys with multilingual synonyms. Used to detect explicitly requested /
 * excluded fields and to recognise them in generated output (labels, keys, widget types).
 */
export const FIELD_SYNONYMS: Record<string, { pattern: string; types?: string[] }> = {
  email: { pattern: "e[\\s-]?mail(?:\\s+(?:address|id))?|gmail|ઈમેલ|ઇમેઇલ|ઈ-મેલ|ईमेल|ई-मेल", types: ['email'] },
  phone: { pattern: "phone(?:\\s+number)?|mobile(?:\\s+(?:number|no))?|contact\\s+(?:number|no)|telephone|whatsapp(?:\\s+number)?|cell\\s+number|ફોન(?:\\s*નંબર)?|મોબાઈલ(?:\\s*નંબર)?|મોબાઇલ(?:\\s*નંબર)?|फ़ोन|फोन|मोबाइल", types: ['phone'] },
  name: { pattern: "(?:full\\s+|first\\s+|last\\s+|your\\s+|customer\\s+|guest\\s+|student\\s+|applicant\\s+|patient\\s+)?name|નામ|नाम", types: ['name'] },
  address: { pattern: "(?:delivery\\s+|home\\s+|postal\\s+|residential\\s+|billing\\s+|shipping\\s+)?address|સરનામું|સરનામુ|पता", types: ['address', 'location'] },
  dob: { pattern: "date\\s+of\\s+birth|dob|birth\\s*date|birthday|જન્મ\\s*તારીખ|जन्म\\s*तिथि", types: ['dob', 'birthday'] },
  gender: { pattern: "gender|sex|જાતિ|લિંગ|लिंग", types: ['gender'] },
  age: { pattern: "age|ઉંમર|उम्र|आयु" },
  photo: { pattern: "photo(?:graph)?|picture|selfie|passport\\s+(?:size\\s+)?photo|ફોટો|फोटो", types: ['photo'] },
  signature: { pattern: "signature|sign\\s+here|સહી|हस्ताक्षर", types: ['signature'] },
  resume: { pattern: "resume|cv|curriculum\\s+vitae|બાયોડેટા|बायोडाटा", types: ['resume'] },
  payment: { pattern: "payment(?:\\s+(?:method|mode|details))?|pay\\s+online|card\\s+details|upi|ચુકવણી|भुगतान", types: ['payment'] },
  company: { pattern: "company(?:\\s+name)?|organi[sz]ation(?:\\s+name)?|employer" },
  website: { pattern: "website|portfolio(?:\\s+(?:link|url))?|linkedin(?:\\s+(?:profile|url))?|github(?:\\s+(?:profile|url))?", types: ['website'] },
  city: { pattern: "city|town|શહેર|शहर" },
  roll_number: { pattern: "roll\\s*(?:number|no\\.?)|enrol(?:l)?ment\\s*(?:number|no\\.?)?|student\\s+id|gr\\s*(?:number|no\\.?)|રોલ\\s*નંબર|अनुक्रमांक" },
  quantity: { pattern: "quantity|qty|number\\s+of\\s+items|જથ્થો|मात्रा" },
  date: { pattern: "(?:check[\\s-]?in|check[\\s-]?out|appointment|event|delivery|booking|travel|preferred)\\s+date|date", types: ['date'] },
  time: { pattern: "(?:appointment|delivery|pickup|preferred|arrival)\\s+time|time\\s+slot", types: ['time'] },
  rating: { pattern: "rating|star\\s+rating|rate\\s+(?:us|our|your)", types: ['rating', 'star-rating', 'emoji-satisfaction-scale'] },
  comments: { pattern: "comments?|suggestions?|remarks?|additional\\s+notes?|special\\s+(?:instructions?|requests?)", types: [] },
  guests: { pattern: "(?:number\\s+of\\s+)?(?:guests?|adults?|children|people|persons?|travell?ers?)" },
  terms: { pattern: "terms(?:\\s+(?:and|&)\\s+conditions)?|consent|agreement|declaration|privacy\\s+policy", types: ['agreement'] }
};

/** Fields that only make sense in education contexts; leaking them elsewhere is a defect. */
export const EDUCATION_ONLY_FIELDS = ['roll_number'];

/** Detect which semantic key (if any) a generated question represents. */
export function detectFieldKey(q: { key?: string; label?: string; type?: string }): string | undefined {
  const key = (q.key || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (key) {
    for (const k of Object.keys(FIELD_SYNONYMS)) {
      if (key === k || key.startsWith(`${k}_`) || key.endsWith(`_${k}`)) return k;
    }
    if (key.includes('enrol') || key.includes('roll')) return 'roll_number';
    if (key.includes('mail')) return 'email';
    if (key.includes('phone') || key.includes('mobile')) return 'phone';
  }
  const type = (q.type || '').toLowerCase();
  for (const [k, def] of Object.entries(FIELD_SYNONYMS)) {
    if (def.types && def.types.includes(type) && !['date', 'time', 'rating', 'comments', 'terms'].includes(k)) return k;
  }
  const label = (q.label || '').toLowerCase();
  // Most specific first: roll numbers / emails / phones before generic "name".
  const order = ['roll_number', 'email', 'phone', 'dob', 'address', 'signature', 'resume', 'photo', 'payment', 'gender', 'website', 'company', 'name', 'age', 'city'];
  for (const k of order) {
    if (hasWord(label, FIELD_SYNONYMS[k].pattern)) {
      // "Name of the dish" / "name of the event" are not personal-name fields.
      if (k === 'name' && /name\s+of\s+(?:the\s+)?(?!applicant|student|patient|guest|customer|person|candidate)/i.test(label)) continue;
      if (k === 'age' && !/^(?:your\s+)?age\b|\bage\s*(?:\(|in\s+years|group)|ઉંમર|उम्र|आयु/i.test(label)) continue;
      return k;
    }
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Languages                                                                   */
/* -------------------------------------------------------------------------- */

export const LANGUAGES: Array<{ name: string; pattern: string; script: 'latin' | 'gujarati' | 'devanagari' | 'arabic' | 'other'; isRtl?: boolean }> = [
  { name: 'gujarati', pattern: 'gujarati|gujrati|gujarathi|ગુજરાતી', script: 'gujarati' },
  { name: 'hindi', pattern: 'hindi|हिंदी|हिन्दी', script: 'devanagari' },
  { name: 'marathi', pattern: 'marathi|मराठी', script: 'devanagari' },
  { name: 'english', pattern: 'english|angrezi|અંગ્રેજી|अंग्रेज़ी|अंग्रेजी', script: 'latin' },
  { name: 'urdu', pattern: 'urdu|اردو', script: 'arabic', isRtl: true },
  { name: 'arabic', pattern: 'arabic|عربي|العربية', script: 'arabic', isRtl: true },
  { name: 'tamil', pattern: 'tamil|தமிழ்', script: 'other' },
  { name: 'telugu', pattern: 'telugu|తెలుగు', script: 'other' },
  { name: 'kannada', pattern: 'kannada|ಕನ್ನಡ', script: 'other' },
  { name: 'bengali', pattern: 'bengali|bangla|বাংলা', script: 'other' },
  { name: 'punjabi', pattern: 'punjabi|ਪੰਜਾਬੀ', script: 'other' },
  { name: 'french', pattern: 'french|français|francais', script: 'latin' },
  { name: 'spanish', pattern: 'spanish|español|espanol', script: 'latin' },
  { name: 'german', pattern: 'german|deutsch', script: 'latin' }
];

/** Count letters per script in a piece of text. */
export function scriptProfile(text: string): { latin: number; gujarati: number; devanagari: number; arabic: number; other: number; total: number } {
  const profile = { latin: 0, gujarati: 0, devanagari: 0, arabic: 0, other: 0, total: 0 };
  for (const ch of text) {
    const code = ch.codePointAt(0) || 0;
    if (!/\p{L}/u.test(ch)) continue;
    profile.total++;
    if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a) || (code >= 0xc0 && code <= 0x24f)) profile.latin++;
    else if (code >= 0x0a80 && code <= 0x0aff) profile.gujarati++;
    else if (code >= 0x0900 && code <= 0x097f) profile.devanagari++;
    else if (code >= 0x0600 && code <= 0x06ff) profile.arabic++;
    else profile.other++;
  }
  return profile;
}

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                  */
/* -------------------------------------------------------------------------- */

export const DIFFICULTY_PATTERNS: Array<{ level: DifficultyLevel; pattern: string }> = [
  { level: 'advanced', pattern: 'advanced|expert(?:[\\s-]level)?|very\\s+(?:hard|difficult|tough)|extremely\\s+(?:hard|difficult)' },
  { level: 'hard', pattern: 'hard|difficult|tough|challenging|complex|kathin|કઠિન|અઘરા|અઘરું|अघरा|कठिन|मुश्किल' },
  { level: 'medium', pattern: 'medium|moderate|intermediate|average(?:\\s+level)?|madhyam|મધ્યમ|मध्यम' },
  { level: 'easy', pattern: 'easy|simple|basic|beginner(?:[\\s-]level)?|elementary|introductory|saral|સરળ|सरल|आसान' }
];

export const DIFFICULTY_ORDER: DifficultyLevel[] = ['easy', 'medium', 'hard', 'advanced'];

export function normalizeDifficulty(value: any): DifficultyLevel | undefined {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim().toLowerCase();
  if (!v) return undefined;
  if (/^(easy|beginner|basic|simple|low)$/.test(v)) return 'easy';
  if (/^(medium|moderate|intermediate|average|mid)$/.test(v)) return 'medium';
  if (/^(hard|difficult|tough|challenging|high)$/.test(v)) return 'hard';
  if (/^(advanced|expert|very hard|very difficult)$/.test(v)) return 'advanced';
  for (const d of DIFFICULTY_PATTERNS) if (hasWord(v, d.pattern)) return d.level;
  return undefined;
}
