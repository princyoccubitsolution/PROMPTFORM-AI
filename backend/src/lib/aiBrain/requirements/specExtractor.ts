import {
  ArtifactKind, AssessmentQuestionKind, ConversationOperation, CountConstraint, DifficultyLevel,
  DifficultySpec, EditIntent, LanguageSpec, RequirementSource, RequirementSpec
} from './types';
import {
  DIFFICULTY_ORDER, DIFFICULTY_PATTERNS, FIELD_SYNONYMS, KIND_PATTERNS, LANGUAGES, NUMBER_TOKEN,
  WB_END, WB_START, hasWord, kindLabel, normalizeDigits, parseNumberToken, scriptProfile, wordRegex
} from './vocabulary';

/** Hard limits of one generation round trip (reported to the user when exceeded). */
export const MAX_ASSESSMENT_QUESTIONS = 60;
export const MAX_FORM_FIELDS = 50;

export interface SpecContext {
  /** The artifact currently open in the conversation (enables "modify"). */
  existingForm?: { title?: string; questions?: any[]; settings?: any; category?: string | null } | null;
  /** UI "Form type" selector value ("auto", "quiz", "survey", ...). */
  formTypeHint?: string;
  /** A document / image was uploaded with the prompt. */
  hasDocument?: boolean;
  /** The caller explicitly asked to modify (legacy `formId` callers). */
  forceModify?: boolean;
}

const QUESTION_NOUN = "questions?|ques|qs|q's|problems?|items|sawaa?l|prashn(?:o|a)?|પ્રશ્નો|પ્રશ્ન|સવાલો|સવાલ|प्रश्नों|प्रश्न|सवालों|सवाल";
const FIELD_NOUN = "fields?|input\\s+fields?|form\\s+fields?|inputs?|entries|ફીલ્ડ્સ|ફીલ્ડ|ફિલ્ડ્સ|ફિલ્ડ|फ़ील्ड|फील्ड";
const MARKS_NOUN = "marks?|points?|pts|score|ગુણ|માર્ક્સ|अंक|अंकों|नंबर";

const CREATE_VERB = "create|make|generate|build|design|prepare|draft|set\\s*up|give\\s+me|i\\s+need|i\\s+want|need|want|banao|banav\\w*|bana\\s+do|bnao|chahiye|joie|joiye|જોઈએ|બનાવ\\S*|बनाओ|बनाइए|बनाना|बना\\s+दो|तैयार\\s+करो";
const ARTIFACT_NOUN = "forms?|quiz(?:zes)?|exams?|examination|tests?|survey|questionnaire|paper|poll|registration|application|booking|order|feedback|assessment|worksheet|checklist|ફોર્મ|फॉर्म|फ़ॉर्म|પ્રશ્નપત્ર|प्रश्नपत्र|પરીક્ષા|परीक्षा|કસોટી|ક્વિઝ|क्विज़|સર્વે|सर्वे";

const ASSESSMENT_STRONG = [
  'quiz(?:zes)?', 'exam(?:ination)?s?', 'mcq\\s+tests?', '(?:question|exam|test|model|sample)\\s+papers?',
  '(?:mock|practice|unit|class|online|coding|aptitude|placement|entrance|weekly|monthly|surprise|skill|screening|technical|programming)\\s+tests?',
  'assessments?', 'worksheets?', 'viva', 'olympiad', 'trivia', 'answer\\s+key', 'prashna?\\s*patra', 'pariksha', 'kasoti',
  'પ્રશ્નપત્ર', 'પરીક્ષા', 'કસોટી', 'ક્વિઝ', 'ટેસ્ટ', 'प्रश्नपत्र', 'परीक्षा', 'क्विज़', 'क्विज', 'टेस्ट'
].join('|');
const NON_ASSESSMENT_TEST = "(?:blood|lab|laboratory|covid|medical|diagnostic|drug|pregnancy|eye|urine|hearing|allergy|health|soil|water|emission|pcr|rt-pcr|speed|a/b|usability|beta|user)\\s+tests?|tests?\\s+(?:drive|ride|booking|appointment|report|results?|form|submission|run|environment|account)";
const FORM_COMPOUND_AFTER_ASSESSMENT = "(?:quiz|exam(?:ination)?|test|olympiad|paper)\\s+(?:registration|admission|fee|fees|hall|booking|schedule|result|results|feedback|application|enrol(?:l)?ment|timetable|time\\s+table|centre|center|form\\s+submission)";
const FEEDBACK_ON_ASSESSMENT = "(?:feedback|survey|review|evaluation)\\s+(?:on|about|for|of|regarding)\\s+(?:the\\s+|our\\s+|my\\s+)?(?:quiz|exam|test|course|teacher|class|lecture|training|workshop)";

const GREETING = /^(?:hi+|hello+|hey+|helo|hlo|hy+|yo|namaste|namaskar|kem\s*ch+o|kaise\s+ho|good\s+(?:morning|afternoon|evening)|thanks?|thank\s+you|thx|ok(?:ay)?|cool|nice|great|નમસ્તે|કેમ\s*છો|नमस्ते|धन्यवाद)\b[\s!.,?]*/iu;
const HELP_QUESTION = /(what\s+(?:can|do)\s+you\s+(?:do|make|create|build|help)|what\s+all\s+can\s+you|how\s+(?:does\s+this|do\s+i\s+use|to\s+use|can\s+you\s+help)|who\s+are\s+you|what\s+are\s+you|what\s+is\s+(?:promptform|this\s+tool)|tell\s+me\s+about\s+(?:yourself|you)|what\s+is\s+the\s+difference|which\s+(?:is\s+better|should\s+i))/iu;

const NEW_ARTIFACT = /\b(?:new|another|different|separate|fresh|second)\s+(?:\w+\s+){0,3}?(?:form|quiz|test|exam|survey|paper|questionnaire)\b|from\s+scratch|start\s+(?:over|again|fresh)|completely\s+new|brand\s+new|instead\s+(?:create|make|build|generate)|(?:create|make|build|generate)\s+(?:\w+\s+){0,3}?instead|navu\s+form|naya\s+form|નવું\s+ફોર્મ|नया\s+फॉर्म/iu;

const EDIT_VERB = "add|insert|append|include|remove|delete|drop|exclude|get\\s+rid\\s+of|take\\s+out|change|replace|update|edit|modify|rename|retitle|translate|convert|switch|increase|decrease|reduce|reorder|move|swap|shuffle|keep|set|mark|turn|rewrite|rephrase|simplify|shorten|lengthen|fix|correct|improve|umero|umer|hatao|hata\\s+do|kadhi\\s+nakho|badlo|badal\\w*|ઉમેરો|ઉમેર|દૂર\\s+કરો|કાઢી\\s+નાખો|બદલો|बदलो|हटाओ|हटा\\s+दो|जोड़ो|जोड़ें";
const EDIT_MAKE = /\bmake\s+(?:it|this|that|them|these|those|the\s+\w+|all|every\w*|question\s*\d+|questions?|q\d+|\w+\s+(?:field|question)s?|email|phone|name|address)\b[^.]*?\b(?:harder|easier|tougher|simpler|difficult|advanced|easy|hard|mandatory|optional|required|compulsory|shorter|longer|professional|formal|better|in\s+\w+)\b/iu;
const EDIT_COMPARATIVE = /\b(?:harder|easier|tougher|simpler|more\s+(?:difficult|professional|formal|detailed|questions?|fields?)|less\s+(?:difficult|questions?|fields?)|fewer\s+(?:questions?|fields?))\b/iu;
/** "Create a hotel booking form ..." — a full description of a new artifact. */
const CREATE_PHRASE = /\b(?:create|make|generate|build|design|prepare|draft)\s+(?:me\s+)?(?:a|an)\s+(?:[\p{L}\p{M}\d/&'-]+\s+){0,5}?(?:form|quiz|test|exam|survey|questionnaire|paper|poll|worksheet|assessment)\b/iu;
/** Messages that only make sense as edits of an existing artifact. */
const EDIT_ONLY = /^(?:please\s+)?(?:add|remove|delete|drop|change|replace|rename|translate|make\s+(?:it|this|them|question|questions|q\d|all|every)|(?:question|q)\s*\d+)\b/iu;

const PROGRAMMING_LANGUAGES: Array<{ name: string; pattern: string }> = [
  { name: 'C++', pattern: 'c\\+\\+|cpp' },
  { name: 'C#', pattern: 'c#|c\\s+sharp|csharp' },
  { name: 'JavaScript', pattern: 'javascript|js|node\\.?js' },
  { name: 'TypeScript', pattern: 'typescript|ts' },
  { name: 'Python', pattern: 'python|py' },
  { name: 'Java', pattern: 'java' },
  { name: 'Go', pattern: 'golang|go\\s+language' },
  { name: 'Rust', pattern: 'rust' },
  { name: 'Kotlin', pattern: 'kotlin' },
  { name: 'Swift', pattern: 'swift' },
  { name: 'PHP', pattern: 'php' },
  { name: 'Ruby', pattern: 'ruby' },
  { name: 'SQL', pattern: 'sql|mysql|postgresql|postgres' },
  { name: 'C', pattern: 'c\\s+(?:language|programming)|c(?=\\s+(?:program|programs|code|coding|test|quiz|questions?|exam))' }
];

const DOMAINS: Array<{ domain: string; purpose: string; pattern: string }> = [
  { domain: 'food_order', purpose: 'Food ordering', pattern: "(?:food|meal|pizza|burger|tiffin|biryani|thali|lunch|dinner|breakfast|cake|bakery|grocery)\\s+(?:order\\w*|delivery|pre-?order)|order(?:ing)?\\s+(?:food|meals?|pizza|lunch|dinner)|restaurant\\s+order\\w*|takeaway|take-?out|home\\s+delivery|food\\s+delivery|catering\\s+order|menu\\s+order|જમવાનો\\s+ઓર્ડર|ખાવાનો\\s+ઓર્ડર|खाना\\s+ऑर्डर" },
  { domain: 'table_reservation', purpose: 'Restaurant table reservation', pattern: 'table\\s+(?:booking|reservation)|reserve\\s+a\\s+table' },
  { domain: 'restaurant_feedback', purpose: 'Restaurant / dining feedback', pattern: "(?:restaurant|cafe|café|dining|food|hotel\\s+food)\\s+(?:feedback|review|survey|rating|experience)|(?:feedback|review|survey)\\s+(?:for|of|about)\\s+(?:my\\s+|our\\s+|the\\s+)?(?:restaurant|cafe|café|food)" },
  { domain: 'hotel_booking', purpose: 'Hotel / accommodation booking', pattern: 'hotel|resort|room\\s+(?:booking|reservation)|homestay|hostel|guest\\s*house|lodge|accommodation|check[\\s-]?in|હોટેલ|હોટલ|होटल' },
  { domain: 'travel', purpose: 'Travel booking / registration', pattern: 'travel|tour(?:s|ism)?|trip|flight|holiday|vacation|itinerary|bus\\s+booking|train\\s+booking|cab\\s+booking|taxi|પ્રવાસ|यात्रा' },
  { domain: 'wedding', purpose: 'Wedding registration / RSVP', pattern: 'wedding|marriage|reception|shaadi|shadi|lagna|લગ્ન|शादी|विवाह' },
  { domain: 'event_registration', purpose: 'Event registration', pattern: 'event|conference|workshop|seminar|webinar|meetup|summit|hackathon|rsvp|fest|festival|concert|marathon|tournament' },
  { domain: 'job_application', purpose: 'Job application / recruitment', pattern: 'job|career|recruit\\w*|hiring|vacancy|vacancies|candidate|internship|employment\\s+application|job\\s+application|walk-?in|નોકરી|नौकरी' },
  { domain: 'medical_appointment', purpose: 'Medical appointment / patient intake', pattern: 'doctor|clinic|hospital|patient|dental|dentist|medical|opd|physiotherapy|pathology|diagnostic|(?:blood|lab|laboratory|health)\\s+(?:tests?|check(?:[\\s-]?up)?)|appointment\\s+with\\s+(?:a\\s+)?(?:doctor|dentist|physician)|દવાખાનું|હોસ્પિટલ|अस्पताल|डॉक्टर' },
  { domain: 'product_return', purpose: 'Product return / refund request', pattern: 'returns?\\s+(?:request|form)|product\\s+return|refund|replacement\\s+request|exchange\\s+request|rma' },
  { domain: 'service_request', purpose: 'Service / support request', pattern: 'service\\s+request|repair|maintenance|complaint|support\\s+ticket|help\\s*desk|it\\s+support|technical\\s+support|grievance' },
  { domain: 'real_estate', purpose: 'Real estate inquiry', pattern: 'real\\s+estate|property|properties|flat|apartment|villa|plot|rental\\s+(?:inquiry|enquiry)|tenant|broker' },
  { domain: 'student_admission', purpose: 'Student admission / registration', pattern: 'admission|enrol(?:l)?ment\\s+form|school\\s+registration|college\\s+(?:application|registration)|student\\s+registration|course\\s+registration|એડમિશન|प्रवेश' },
  { domain: 'customer_feedback', purpose: 'Customer feedback / satisfaction survey', pattern: "(?:customer|client|product|service|user|employee|patient|guest)\\s+(?:feedback|satisfaction|survey|review|experience)|nps|net\\s+promoter|satisfaction\\s+survey|feedback|survey|પ્રતિસાદ|અભિપ્રાય|प्रतिक्रिया" },
  { domain: 'business_inquiry', purpose: 'Business inquiry / lead capture', pattern: 'business\\s+(?:inquiry|enquiry)|quote|quotation|partnership|b2b|sales\\s+(?:inquiry|enquiry)|lead(?:s|\\s+generation|\\s+capture)?' },
  { domain: 'registration', purpose: 'Registration', pattern: 'registration|register|sign[\\s-]?up|enrol(?:l)?ment|membership|નોંધણી|पंजीकरण' },
  { domain: 'appointment_booking', purpose: 'Appointment / booking request', pattern: 'appointments?|booking|reservation|schedule\\s+a\\s+(?:call|meeting|visit|demo)|salon|spa' },
  { domain: 'contact', purpose: 'Contact / general inquiry', pattern: 'contact(?:\\s+us)?|get\\s+in\\s+touch|inquiry|enquiry' }
];

const SUBJECTS: Array<{ topic: string; pattern: string }> = [
  { topic: 'Science', pattern: 'science|vigyan|વિજ્ઞાન|विज्ञान' },
  { topic: 'Mathematics', pattern: 'maths?|mathematics|ganit|ગણિત|गणित|algebra|geometry|trigonometry|calculus' },
  { topic: 'Physics', pattern: 'physics|ભૌતિકશાસ્ત્ર|भौतिकी' },
  { topic: 'Chemistry', pattern: 'chemistry|રસાયણ|रसायन' },
  { topic: 'Biology', pattern: 'biology|જીવવિજ્ઞાન|जीवविज्ञान' },
  { topic: 'History', pattern: 'history|itihas|ઇતિહાસ|इतिहास' },
  { topic: 'Geography', pattern: 'geography|ભૂગોળ|भूगोल' },
  { topic: 'Social Science', pattern: 'social\\s+(?:science|studies)|સામાજિક\\s+વિજ્ઞાન|सामाजिक\\s+विज्ञान' },
  { topic: 'English', pattern: 'english\\s+(?:grammar|literature|vocabulary|language)|grammar|vocabulary' },
  { topic: 'General Knowledge', pattern: 'general\\s+knowledge|gk|current\\s+affairs|trivia' },
  { topic: 'Computer Science', pattern: 'computer\\s+science|computers?|data\\s+structures?|dsa|algorithms?|dbms|database|operating\\s+systems?|computer\\s+networks?|networking|oops|object\\s+oriented|web\\s+development|html|css|react|machine\\s+learning|artificial\\s+intelligence|cyber\\s*security|cloud' },
  { topic: 'Economics', pattern: 'economics|અર્થશાસ્ત્ર|अर्थशास्त्र' },
  { topic: 'Accountancy', pattern: 'accountancy|accounting|accounts' }
];

/* -------------------------------------------------------------------------- */

function normalizePrompt(raw: string): string {
  return normalizeDigits(raw)
    // Legacy clients appended UI settings to the prompt; they are not user requirements.
    .replace(/\((?:form\s+type|option\s+layout)\s*:[^)]*\)/gi, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function globalRegex(source: string): RegExp {
  return new RegExp(source, 'giu');
}

function overlaps(spans: Array<[number, number]>, start: number, end: number): boolean {
  return spans.some(([s, e]) => start < e && end > s);
}

function isMarksContext(text: string): boolean {
  return new RegExp(`(?:${MARKS_NOUN}|minutes?|mins?|hours?|hrs?|%|percent)`, 'iu').test(text);
}

/** Text that a number token is followed by (to discard "2 marks" style numbers). */
function followedByMarks(norm: string, endIdx: number): boolean {
  return new RegExp(`^\\s*(?:-\\s*)?(?:${MARKS_NOUN}|minutes?|mins?|hours?|hrs?|%|percent)`, 'iu').test(norm.slice(endIdx, endIdx + 14));
}

interface KindCountResult {
  typeCounts: Partial<Record<AssessmentQuestionKind, number>>;
  kindMarks: Partial<Record<AssessmentQuestionKind, number>>;
  mentioned: AssessmentQuestionKind[];
  spans: Array<[number, number]>;
}

function extractKindCounts(norm: string): KindCountResult {
  const typeCounts: Partial<Record<AssessmentQuestionKind, number>> = {};
  const kindMarks: Partial<Record<AssessmentQuestionKind, number>> = {};
  const mentioned: AssessmentQuestionKind[] = [];
  const consumed: Array<[number, number]> = [];
  const countSpans: Array<[number, number]> = [];

  for (const { kind, pattern } of KIND_PATTERNS) {
    const re = globalRegex(`${WB_START}(?:${pattern})${WB_END}`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(norm)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(consumed, start, end)) continue;
      consumed.push([start, end]);
      if (!mentioned.includes(kind)) mentioned.push(kind);

      // Number before the kind ("10 MCQs", "5 hard coding problems").
      const before = norm.slice(Math.max(0, start - 48), start);
      const beforeMatch = before.match(new RegExp(`${NUMBER_TOKEN}\\s*((?:[\\p{L}\\p{M}/-]+\\s+){0,2})$`, 'iu'));
      let count: number | undefined;
      let countStart = start;
      if (beforeMatch && !isMarksContext(beforeMatch[2] || '')) {
        const numberEndInNorm = start - beforeMatch[0].length + beforeMatch[1].length;
        if (!followedByMarks(norm, numberEndInNorm)) {
          count = parseNumberToken(beforeMatch[1]);
          countStart = start - beforeMatch[0].length;
        }
      }
      // Number after the kind ("MCQs: 10", "true/false - 5").
      if (count === undefined) {
        const after = norm.slice(end, end + 24);
        const afterMatch = after.match(new RegExp(`^\\s*(?:questions?\\s*)?[:=(\\-]\\s*${NUMBER_TOKEN}(?!\\s*(?:${MARKS_NOUN}))`, 'iu'));
        if (afterMatch) count = parseNumberToken(afterMatch[1]);
      }
      if (count !== undefined && count > 0 && count <= 200) {
        typeCounts[kind] = (typeCounts[kind] || 0) + count;
        countSpans.push([countStart, end]);
        // Per-kind marks right after: "10 MCQs of 1 mark each", "5 coding problems (10 marks each)".
        const tail = norm.slice(end, end + 40).split(/[,;]|\band\b/)[0];
        const marksMatch = tail.match(new RegExp(`(?:of|with|carrying|worth|@|x|×|\\()?\\s*${NUMBER_TOKEN}\\s*(?:${MARKS_NOUN})`, 'iu'));
        if (marksMatch) {
          const mv = parseNumberToken(marksMatch[1]);
          if (mv !== undefined) kindMarks[kind] = mv;
        }
      }
    }
  }
  return { typeCounts, kindMarks, mentioned, spans: countSpans };
}

function extractTotalCount(norm: string, kindSpans: Array<[number, number]>, artifactKind: ArtifactKind, isModify: boolean): { count?: CountConstraint; sources: number } {
  const nouns = artifactKind === 'assessment' ? QUESTION_NOUN : `${FIELD_NOUN}|questions?|prashn(?:o|a)?|પ્રશ્નો|પ્રશ્ન|प्रश्न|सवाल`;
  const qualifier = "exactly|only|just|precisely|total(?:\\s+of)?|a\\s+total\\s+of|at\\s+least|minimum(?:\\s+of)?|min\\.?|atleast|at\\s+most|maximum(?:\\s+of)?|max\\.?|up\\s*to|no\\s+more\\s+than|not\\s+more\\s+than|less\\s+than|fewer\\s+than|more\\s+than|over";
  const re = globalRegex(`(?:(${qualifier})\\s+)?${NUMBER_TOKEN}\\s*(\\+|or\\s+more|or\\s+less|or\\s+fewer)?\\s*((?:[\\p{L}\\p{M}/-]+\\s+){0,3}?)(?:${nouns})${WB_END}`);
  const found: Array<{ count: CountConstraint; start: number; precededByAdd: boolean }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (start > 0 && /[\p{L}\p{M}\p{N}]/u.test(norm[start - 1])) continue;
    if (overlaps(kindSpans, start, end)) continue;
    const between = m[4] || '';
    if (isMarksContext(between)) continue;
    // A kind word between number and noun means it was a per-kind count ("5 output prediction questions").
    if (KIND_PATTERNS.some(k => new RegExp(`(?:${k.pattern})`, 'iu').test(between))) continue;
    const value = parseNumberToken(m[2]);
    if (value === undefined || value <= 0) continue;
    const q = (m[1] || '').toLowerCase();
    const post = (m[3] || '').toLowerCase();
    let mode: CountConstraint['mode'] = 'exact';
    let v = value;
    if (/at\s+least|minimum|min|atleast/.test(q) || post === '+' || /or\s+more/.test(post)) mode = 'min';
    else if (/more\s+than|over/.test(q)) { mode = 'min'; v = value + 1; }
    else if (/at\s+most|maximum|max|up\s*to|no\s+more|not\s+more/.test(q) || /or\s+(?:less|fewer)/.test(post)) mode = 'max';
    else if (/less\s+than|fewer\s+than/.test(q)) { mode = 'max'; v = value - 1; }
    const pre = norm.slice(Math.max(0, start - 22), start);
    const precededByAdd = /(?:add|insert|append|another|extra|include)\s+(?:\w+\s+)?$/.test(pre) || /^\s*(?:more|extra|additional|new)\b/.test(between) || /\bmore\b/.test(between);
    found.push({ count: { mode, value: v }, start, precededByAdd });
  }
  // Noun-first order: "questions: 20", "પ્રશ્નો ૧૫".
  const reAfter = globalRegex(`${WB_START}(?:${nouns})\\s*(?:[:=-]|count\\s*[:=]?)?\\s*${NUMBER_TOKEN}${WB_END}`);
  while ((m = reAfter.exec(norm)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(kindSpans, start, end) || followedByMarks(norm, end)) continue;
    if (found.some(f => Math.abs(f.start - start) < 30)) continue;
    // "question 4" in an edit is a question reference, not a count.
    if (isModify || /^(?:q|question|ques)\s*\d/.test(m[0].trim())) continue;
    const value = parseNumberToken(m[1]);
    if (value !== undefined && value > 0) found.push({ count: { mode: 'exact', value }, start, precededByAdd: false });
  }

  const totals = found.filter(f => !(isModify && f.precededByAdd));
  if (totals.length === 0) return { sources: 0 };
  if (totals.length > 1 && /\bsections?\b|વિભાગ|खंड/u.test(norm) && totals.every(t => t.count.mode === 'exact')) {
    return { count: { mode: 'exact', value: totals.reduce((s, t) => s + t.count.value, 0) }, sources: totals.length };
  }
  return { count: totals[0].count, sources: totals.length };
}

function extractMarks(norm: string): { totalMarks?: number; marksPerQuestion?: number } {
  const out: { totalMarks?: number; marksPerQuestion?: number } = {};
  const per = norm.match(new RegExp(`${NUMBER_TOKEN}\\s*-?\\s*(?:${MARKS_NOUN})\\s*(?:each|per\\s+(?:question|q)|for\\s+each(?:\\s+question)?|apiece|ea\\.?|દરેક|प्रत्येक)`, 'iu'))
    || norm.match(new RegExp(`(?:each|every)\\s+(?:question\\s+)?(?:carries|carrying|worth|of|with|has|is|=|-)?\\s*${NUMBER_TOKEN}\\s*(?:${MARKS_NOUN})`, 'iu'))
    || norm.match(new RegExp(`(?:દરેક\\s+પ્રશ્ન(?:નો|ના)?|प्रत्येक\\s+प्रश्न)\\s*${NUMBER_TOKEN}\\s*(?:${MARKS_NOUN})`, 'iu'));
  if (per) out.marksPerQuestion = parseNumberToken(per[1]);

  const totalPatterns = [
    new RegExp(`(?:total|maximum|max\\.?|full|out\\s+of)\\s*(?:marks?|score|points?)?\\s*(?:of|is|are|:|=|-)?\\s*${NUMBER_TOKEN}`, 'iu'),
    new RegExp(`${NUMBER_TOKEN}\\s*-?\\s*(?:marks?|points?)\\s+(?:paper|exam|test|quiz|question\\s+paper|assessment|total|in\\s+total|overall)`, 'iu'),
    new RegExp(`(?:paper|exam|test|quiz|assessment)\\s+(?:of|for|carrying|worth|with)\\s+${NUMBER_TOKEN}\\s*(?:${MARKS_NOUN})`, 'iu'),
    new RegExp(`(?:to|into)\\s+${NUMBER_TOKEN}\\s*(?:marks?|points?)`, 'iu'),
    new RegExp(`${NUMBER_TOKEN}\\s*(?:ગુણનો|ગુણનું|ગુણની|ગુણના|अंकों\\s+का|अंक\\s+का|अंकों\\s+की|अंक\\s+की)`, 'iu')
  ];
  for (const re of totalPatterns) {
    const m = norm.match(re);
    if (m) {
      const v = parseNumberToken(m[1]);
      if (v !== undefined && v !== out.marksPerQuestion) { out.totalMarks = v; break; }
    }
  }
  if (out.totalMarks === undefined && out.marksPerQuestion === undefined) {
    // A bare "50 marks" (not "each") is the paper total.
    const bare = norm.match(new RegExp(`${NUMBER_TOKEN}\\s*-?\\s*(?:marks?|ગુણ|अंक)(?!\\s*(?:each|per|for\\s+each|apiece|questions?))`, 'iu'));
    if (bare) out.totalMarks = parseNumberToken(bare[1]);
  }
  return out;
}

function extractDifficulty(norm: string, total?: number): DifficultySpec | undefined {
  const spec: DifficultySpec = {};
  const levelPattern = (lvl: DifficultyLevel) => DIFFICULTY_PATTERNS.find(d => d.level === lvl)!.pattern;

  // Percentages: "40% easy", "easy 40%".
  const percentages: Partial<Record<DifficultyLevel, number>> = {};
  const counts: Partial<Record<DifficultyLevel, number>> = {};
  for (const lvl of DIFFICULTY_ORDER) {
    const p = levelPattern(lvl);
    const pct = norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:%|percent)\\s*(?:of\\s+(?:the\\s+)?questions?\\s+)?(?:should\\s+be\\s+|are\\s+|is\\s+)?(?:${p})`, 'iu'))
      || norm.match(new RegExp(`${WB_START}(?:${p})\\s*[:=-]?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:%|percent)`, 'iu'));
    if (pct) percentages[lvl] = Number(pct[1]);
    const cnt = norm.match(new RegExp(`${NUMBER_TOKEN}\\s+(?:${p})${WB_END}(?!\\s*(?:%|percent))`, 'iu'));
    if (cnt) {
      const v = parseNumberToken(cnt[1]);
      if (v !== undefined && !followedByMarks(norm, (cnt.index || 0) + cnt[0].length)) counts[lvl] = v;
    }
  }
  if (Object.keys(percentages).length > 0) spec.percentages = percentages;
  else if (Object.keys(counts).length > 1) spec.distribution = counts;

  const mostly = norm.match(new RegExp(`(?:most(?:ly)?|majority(?:\\s+of)?|maximum)\\s+(?:of\\s+)?(?:the\\s+)?(?:questions?\\s+)?(?:should\\s+be\\s+|must\\s+be\\s+|are\\s+|be\\s+)?(${DIFFICULTY_PATTERNS.map(d => d.pattern).join('|')})`, 'iu'));
  if (mostly) {
    for (const d of DIFFICULTY_PATTERNS) if (new RegExp(`^(?:${d.pattern})$`, 'iu').test(mostly[1])) { spec.mostly = d.level; break; }
  }

  if (!spec.percentages && !spec.distribution && !spec.mostly) {
    const levels = DIFFICULTY_PATTERNS.filter(d => hasWord(norm, d.pattern)).map(d => d.level);
    // "advanced" also matches "hard" synonyms list; keep the strongest single level.
    const unique = Array.from(new Set(levels));
    if (unique.length === 1) spec.level = unique[0];
    else if (unique.length === 2 && unique.includes('advanced') && unique.includes('hard')) spec.level = 'advanced';
    else if (unique.length > 1) spec.distribution = undefined; // "mix of easy and hard" -> left to the model
  }

  if (total && total > 0) {
    if (spec.percentages) spec.distribution = distributeByWeights(total, spec.percentages);
    else if (spec.mostly) {
      const others = (['easy', 'medium', 'hard'] as DifficultyLevel[]).filter(l => l !== spec.mostly);
      const weights: Partial<Record<DifficultyLevel, number>> = { [spec.mostly]: 60 };
      for (const o of others) weights[o] = 40 / others.length;
      spec.distribution = distributeByWeights(total, weights);
    } else if (spec.level) spec.distribution = { [spec.level]: total };
  }
  return Object.keys(spec).length > 0 ? spec : undefined;
}

/**
 * Largest-remainder apportionment. Documented rounding rule: floor every share, then give the
 * leftover units to the largest fractional remainders (ties: easy -> advanced order).
 */
export function distributeByWeights<K extends string>(total: number, weights: Partial<Record<K, number>>): Partial<Record<K, number>> {
  const keys = Object.keys(weights) as K[];
  const sum = keys.reduce((s, k) => s + (weights[k] || 0), 0);
  if (sum <= 0) return {};
  const raw = keys.map(k => ({ k, exact: (total * (weights[k] || 0)) / sum }));
  const result: Partial<Record<K, number>> = {};
  let assigned = 0;
  for (const r of raw) { result[r.k] = Math.floor(r.exact); assigned += Math.floor(r.exact); }
  const byRemainder = [...raw].sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; assigned < total && i < byRemainder.length; i++, assigned++) {
    result[byRemainder[i].k] = (result[byRemainder[i].k] || 0) + 1;
  }
  return result;
}

function extractLanguage(raw: string, norm: string): { lang?: LanguageSpec; translate: boolean } {
  const translate = /\b(?:translate|translation|tarjuma|anuvad)\b|અનુવાદ|अनुवाद/iu.test(norm);
  for (const l of LANGUAGES) {
    const explicit = new RegExp(
      `(?:${WB_START}(?:in|into|to|using|use|with|only|all|purely|fully)\\s+(?:the\\s+)?(?:${l.pattern})${WB_END})` +
      `|(?:(?:${l.pattern})\\s*(?:ma|maa|mein|me|language|lang|medium|interface|version|script|bhasha|ભાષા|ભાષામાં|भाषा|में)${WB_END})` +
      `|(?:(?:${l.pattern})માં)` +
      `|(?:everything\\s+(?:should\\s+be\\s+|must\\s+be\\s+)?in\\s+(?:${l.pattern}))`,
      'iu'
    );
    if (explicit.test(norm) || (translate && hasWord(norm, l.pattern))) {
      return { lang: { name: l.name, script: l.script, isRtl: Boolean(l.isRtl), source: 'explicit' }, translate };
    }
  }
  return { translate };
}

function languageFromScript(text: string): LanguageSpec | undefined {
  const p = scriptProfile(text);
  if (p.total === 0) return undefined;
  if (p.gujarati / p.total >= 0.5) return { name: 'gujarati', script: 'gujarati', isRtl: false, source: 'prompt-script' };
  if (p.devanagari / p.total >= 0.5) return { name: 'hindi', script: 'devanagari', isRtl: false, source: 'prompt-script' };
  if (p.arabic / p.total >= 0.5) return { name: 'arabic', script: 'arabic', isRtl: true, source: 'prompt-script' };
  return undefined;
}

function existingFormText(existing: SpecContext['existingForm']): string {
  if (!existing) return '';
  return [existing.title || '', ...(existing.questions || []).map((q: any) => `${q.label || ''} ${(Array.isArray(q.options) ? q.options : []).join(' ')}`)].join(' ');
}

export function isExistingAssessment(existing: SpecContext['existingForm']): boolean {
  if (!existing) return false;
  const settings = (existing.settings && typeof existing.settings === 'object') ? existing.settings : {};
  if (settings.isQuiz === true) return true;
  if (settings.isQuiz === false) return false;
  if (String(existing.category || '').toLowerCase() === 'quiz') return true;
  return (existing.questions || []).some((q: any) => {
    const v = q.validations || {};
    return Boolean(v.assessmentType) || ((v.correctAnswer ?? v.correct_answer) !== undefined && Number(v.points) > 0);
  });
}

function detectArtifactKind(norm: string, kinds: KindCountResult, marks: { totalMarks?: number; marksPerQuestion?: number }, ctx: SpecContext, isModify: boolean): { kind: ArtifactKind; source: RequirementSource; deferred: boolean; reason: string } {
  const hint = (ctx.formTypeHint || 'auto').toLowerCase();
  const strong = hasWord(norm, ASSESSMENT_STRONG);
  const plainTest = hasWord(norm, 'tests?') && !hasWord(norm, NON_ASSESSMENT_TEST);
  const hasMarks = marks.totalMarks !== undefined || marks.marksPerQuestion !== undefined || hasWord(norm, '(?:marks?|ગુણ|अंक)\\s+(?:each|per)|marking\\s+scheme|negative\\s+marking|passing\\s+marks|correct\\s+answers?|answer\\s+key');
  const gradedKinds = Object.keys(kinds.typeCounts).some(k => k !== 'mcq_single') || kinds.mentioned.some(k => !['mcq_single', 'short_answer', 'long_answer', 'case_study', 'ordering', 'numerical'].includes(k));
  const formCompound = hasWord(norm, FORM_COMPOUND_AFTER_ASSESSMENT) || hasWord(norm, FEEDBACK_ON_ASSESSMENT);

  if (isModify && ctx.existingForm) {
    const existingIsAssessment = isExistingAssessment(ctx.existingForm);
    if (/\b(?:convert|turn|change|make)\s+(?:it|this|the\s+form)?\s*(?:into|to)?\s*(?:a\s+)?(?:quiz|test|exam|assessment)\b|\badd\s+(?:marks|scoring|correct\s+answers|answer\s+key)\b/iu.test(norm)) {
      return { kind: 'assessment', source: 'explicit', deferred: false, reason: 'User asked to convert the form into an assessment.' };
    }
    if (/\b(?:convert|turn|change|make)\s+(?:it|this)?\s*(?:into|to)?\s*(?:a\s+)?(?:survey|form|feedback\s+form)\b|\bremove\s+(?:all\s+)?(?:marks|scoring|grading|correct\s+answers|answer\s+key)\b/iu.test(norm)) {
      return { kind: 'form', source: 'explicit', deferred: false, reason: 'User asked to remove grading.' };
    }
    return { kind: existingIsAssessment ? 'assessment' : 'form', source: 'context', deferred: false, reason: 'Kept the kind of the form being edited.' };
  }

  if (hint === 'quiz') return { kind: 'assessment', source: 'explicit', deferred: false, reason: 'Form type "Assessment / Quiz" was selected.' };
  if (formCompound && !hasMarks && !gradedKinds) {
    return { kind: 'form', source: 'inferred', deferred: false, reason: 'The exam/quiz is the subject of a registration/feedback form, not the artifact itself.' };
  }
  // "Class 6 science paper of 50 marks": a paper with marks for a subject / class is an exam.
  const academicPaper = hasWord(norm, 'papers?|પેપર|पेपर') && (hasMarks || SUBJECTS.some(s => hasWord(norm, s.pattern)) || /(?:class|grade|std\.?|standard|ધોરણ|कक्षा)\s*\d/iu.test(norm));
  if (strong || plainTest || academicPaper || (hasMarks && (gradedKinds || hasWord(norm, `${QUESTION_NOUN}|subject|chapter|syllabus|class|grade`)))) {
    if (hint !== 'auto' && hint !== '' && hint !== 'education') {
      return { kind: 'assessment', source: 'inferred', deferred: false, reason: `The prompt describes an assessment even though "${hint}" was selected.` };
    }
    return { kind: 'assessment', source: 'explicit', deferred: false, reason: 'The prompt asks for a quiz / exam / test.' };
  }
  // Question kinds that only exist in graded papers (a survey never has "fill in the blanks").
  const strongKinds: AssessmentQuestionKind[] = ['fill_blank', 'true_false', 'coding', 'predict_output', 'debugging', 'assertion_reasoning', 'match_following', 'one_word', 'mcq_multiple', 'sql'];
  const dataCollectionWords = 'survey|feedback|questionnaire|poll|registration|booking|reservation|order|ordering|application|admission|appointment|inquiry|enquiry|rsvp|intake';
  const hasStrongKind = kinds.mentioned.some(k => strongKinds.includes(k));
  const hasCountedKinds = Object.keys(kinds.typeCounts).length > 0;
  if ((hasStrongKind || (hasCountedKinds && !hasWord(norm, 'forms?|ફોર્મ|फॉर्म'))) && !hasWord(norm, dataCollectionWords)) {
    return { kind: 'assessment', source: 'inferred', deferred: false, reason: 'Graded question types (fill-in-the-blank, coding, ...) were requested, so this is treated as an assessment.' };
  }
  if (ctx.hasDocument && !hasWord(norm, ARTIFACT_NOUN)) {
    return { kind: 'form', source: 'default', deferred: true, reason: 'Kind will follow the uploaded document.' };
  }
  return { kind: 'form', source: hint !== 'auto' ? 'explicit' : 'inferred', deferred: false, reason: 'No quiz/exam was requested, so this is a data-collection form (no marks or answers).' };
}

function detectDomain(norm: string, artifactKind: ArtifactKind): { domain: string; purpose: string } {
  if (artifactKind === 'assessment') return { domain: 'assessment', purpose: 'Graded assessment' };
  for (const d of DOMAINS) if (hasWord(norm, d.pattern)) return { domain: d.domain, purpose: d.purpose };
  return { domain: 'general', purpose: 'Custom data-collection form' };
}

function extractTitle(raw: string): string | undefined {
  const text = normalizeDigits(raw).replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const quoted = text.match(/(?:titled?|title\s*(?:is|:|=|should\s+be|as)|named|called|heading\s*(?:is|:)?|rename\s+(?:the\s+)?(?:form|quiz|paper|test|exam)?\s*(?:to|as)|change\s+(?:the\s+)?(?:form\s+)?(?:title|name)\s+to)\s*["']([^"']{2,90})["']/i);
  if (quoted) return quoted[1].trim();
  const unquoted = text.match(/(?:title\s*(?:is|:|=|should\s+be)|change\s+(?:the\s+)?(?:form\s+)?title\s+to|rename\s+(?:the\s+)?(?:form|quiz|paper)\s+(?:to|as))\s+([^,.;\n]{2,70})/i);
  if (unquoted) return unquoted[1].replace(/\s+(?:and|with|but)\s+.*$/i, '').trim();
  return undefined;
}

function fieldPatternFor(key: string): string {
  return FIELD_SYNONYMS[key].pattern;
}

function extractFieldConstraints(norm: string, isModify: boolean) {
  const excluded: string[] = [];
  const requested: string[] = [];
  const mandatory: string[] = [];
  const optional: string[] = [];
  const excludeVerb = "no|without|exclude|excluding|skip|omit|avoid|don'?t\\s+(?:include|add|ask(?:\\s+for)?|need|want|collect|put)|do\\s+not\\s+(?:include|add|ask(?:\\s+for)?|need|want|collect|put)|not\\s+(?:include|add|ask\\s+for|collect)|never\\s+ask(?:\\s+for)?|remove|delete|drop|nahi|nathi|vagar|vina|વગર|વિના|बिना|नहीं";
  const fieldKeys = Object.keys(FIELD_SYNONYMS);

  for (const key of fieldKeys) {
    const p = fieldPatternFor(key);
    const exRe = new RegExp(`${WB_START}(?:${excludeVerb})\\s+(?:the\\s+|any\\s+|an?\\s+|only\\s+(?:the\\s+)?)?(?:${p})${WB_END}`, 'iu');
    const exPost = new RegExp(`${WB_START}(?:${p})\\s*(?:field\\s+|address\\s+)?(?:is\\s+|are\\s+)?(?:not\\s+needed|not\\s+necessary|unnecessary|should\\s+not\\s+be\\s+(?:there|included|asked)|nahi\\s+(?:joie|joiye|chahiye)|nathi\\s+joitu|ની\\s+જરૂર\\s+નથી|नहीं\\s+चाहिए)`, 'iu');
    const isExcluded = exRe.test(norm) || exPost.test(norm);
    if (isExcluded && !isModify) excluded.push(key);

    const mandRe = new RegExp(`${WB_START}(?:${p})\\s*(?:field\\s+)?(?:is\\s+|as\\s+|should\\s+be\\s+|must\\s+be\\s+)?(?:mandatory|required|compulsory|farajiyat|ફરજિયાત|अनिवार्य|जरूरी)${WB_END}|(?:make|set|mark|keep)\\s+(?:the\\s+)?(?:${p})\\s*(?:field\\s+)?(?:as\\s+)?(?:mandatory|required|compulsory)`, 'iu');
    const optRe = new RegExp(`${WB_START}(?:${p})\\s*(?:field\\s+)?(?:is\\s+|as\\s+|should\\s+be\\s+)?(?:optional|not\\s+(?:required|mandatory|compulsory)|vaikalpik|વૈકલ્પિક|वैकल्पिक)${WB_END}|(?:make|set|mark|keep)\\s+(?:the\\s+)?(?:${p})\\s*(?:field\\s+)?(?:as\\s+)?optional|(?:required|mandatory)\\s+except\\s+(?:the\\s+)?(?:\\w+\\s+(?:and|,)\\s+)*?(?:${p})`, 'iu');
    if (optRe.test(norm)) optional.push(key);
    else if (mandRe.test(norm)) mandatory.push(key);
  }

  // Positive requests: list after "with / including / collect / fields:" up to the sentence end.
  const listRe = /(?:with|including|include|includes|collect(?:ing)?|ask\s+for|capture|having|containing|contains|fields?\s*[:-]|fields?\s+(?:like|such\s+as)|જેમાં|સાથે|शामिल|के\s+साथ)\s+([^.!?;]+)/giu;
  let m: RegExpExecArray | null;
  while ((m = listRe.exec(norm)) !== null) {
    const segment = m[1];
    for (const key of fieldKeys) {
      if (excluded.includes(key) || requested.includes(key)) continue;
      const p = fieldPatternFor(key);
      const re = new RegExp(`${WB_START}(?:${p})${WB_END}`, 'iu');
      const hit = segment.match(re);
      if (!hit) continue;
      // Skip if this mention is itself negated inside the list ("with name but no email").
      const idx = hit.index || 0;
      const pre = segment.slice(Math.max(0, idx - 14), idx);
      if (new RegExp(`(?:${excludeVerb})\\s*(?:the\\s+|an?\\s+)?$`, 'iu').test(pre)) continue;
      requested.push(key);
    }
  }
  const allRequired = /\b(?:all|every|each)\s+(?:the\s+)?(?:fields?|questions?)\s+(?:are\s+|is\s+|should\s+be\s+|must\s+be\s+|as\s+)?(?:mandatory|required|compulsory)\b|\bmake\s+(?:all|everything)\s+(?:fields?\s+)?(?:mandatory|required)\b|બધા\s+ફરજિયાત/iu.test(norm);
  const allOptional = /\b(?:all|every|each)\s+(?:the\s+)?(?:fields?|questions?)\s+(?:are\s+|is\s+|should\s+be\s+|as\s+)?optional\b|\bmake\s+(?:all|everything)\s+optional\b/iu.test(norm);
  return { excluded, requested, mandatory, optional, allRequired, allOptional };
}

function extractKindConstraints(norm: string, mentioned: AssessmentQuestionKind[], isModify: boolean) {
  const only: AssessmentQuestionKind[] = [];
  const excluded: AssessmentQuestionKind[] = [];
  const onlyVerb = 'only|just|sirf|fakt|faqt|matra|ફક્ત|માત્ર|केवल|सिर्फ';
  const excludeVerb = "no|without|exclude|excluding|skip|omit|avoid|don'?t\\s+(?:include|add|use|want|give)|do\\s+not\\s+(?:include|add|use|want|give)|not\\s+(?:include|any)|nahi|નહીં|बिना|नहीं";
  for (const { kind, pattern } of KIND_PATTERNS) {
    if (new RegExp(`${WB_START}(?:${onlyVerb})\\s+(?:\\d+\\s+)?(?:${pattern})${WB_END}|${WB_START}(?:${pattern})\\s+(?:questions?\\s+)?(?:${onlyVerb})${WB_END}|(?:all|every)\\s+(?:the\\s+)?questions?\\s+(?:should\\s+be|must\\s+be|as|are)\\s+(?:${pattern})`, 'iu').test(norm)) {
      only.push(kind);
    }
    const ex = new RegExp(`${WB_START}(?:${excludeVerb})\\s+(?:any\\s+|the\\s+|more\\s+)?(?:${pattern})${WB_END}`, 'iu');
    const exRemove = new RegExp(`${WB_START}(?:remove|delete|drop)\\s+(?:all\\s+)?(?:the\\s+)?(?:${pattern})`, 'iu');
    if (ex.test(norm) || (!isModify && exRemove.test(norm))) excluded.push(kind);
  }
  return { only: only.filter(k => !excluded.includes(k)), excluded, mentioned: mentioned.filter(k => !excluded.includes(k)) };
}

function extractProgrammingLanguage(norm: string): { language?: string; change?: { from?: string; to: string } } {
  const pat = (name: string) => PROGRAMMING_LANGUAGES.find(p => p.name === name)!.pattern;
  const any = PROGRAMMING_LANGUAGES.map(p => p.pattern).join('|');
  const resolve = (token: string) => PROGRAMMING_LANGUAGES.find(p => new RegExp(`^(?:${p.pattern})$`, 'iu').test(token.trim()))?.name;

  const change = norm.match(new RegExp(`(?:change|convert|switch|replace|translate)\\s+(?:all\\s+)?(?:the\\s+)?(?:code\\s+|coding\\s+questions?\\s+)?(?:from\\s+)?(${any})\\s+(?:to|with|into)\\s+(${any})${WB_END}`, 'iu'));
  if (change) {
    const from = resolve(change[1]);
    const to = resolve(change[2]);
    if (to) return { language: to, change: { from, to } };
  }
  const insteadOf = norm.match(new RegExp(`(?:use\\s+)?(${any})\\s*,?\\s+(?:not|instead\\s+of|rather\\s+than)\\s+(${any})${WB_END}`, 'iu'));
  if (insteadOf) {
    const to = resolve(insteadOf[1]);
    if (to) return { language: to, change: { from: resolve(insteadOf[2]), to } };
  }
  for (const p of PROGRAMMING_LANGUAGES) {
    if (p.name === 'SQL' && !hasWord(norm, 'sql|mysql|postgres(?:ql)?')) continue;
    if (p.name === 'TypeScript' && !hasWord(norm, 'typescript')) continue;
    if (hasWord(norm, p.pattern)) {
      // "JavaScript" contains "java": prefer the longer match.
      if (p.name === 'Java' && hasWord(norm, pat('JavaScript'))) continue;
      return { language: p.name };
    }
  }
  return {};
}

function extractQuestionNumbers(norm: string, existingCount: number): number[] {
  const nums = new Set<number>();
  const re = /(?:questions?|ques|q|prashn(?:o|a)?|પ્રશ્ન(?:ો)?|प्रश्न)\s*(?:no\.?|number|#)?\s*(\d+)(?:\s*(?:-|to|through|thru|and|&|,)\s*(\d+))?/giu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : undefined;
    const sep = norm.slice(m.index, m.index + m[0].length);
    if (b !== undefined && /-|to|through|thru/.test(sep) && b >= a && b - a < 200) {
      for (let i = a; i <= b; i++) nums.add(i);
    } else {
      nums.add(a);
      if (b !== undefined) nums.add(b);
    }
  }
  const first = norm.match(new RegExp(`first\\s+${NUMBER_TOKEN}\\s+questions?`, 'iu'));
  if (first) { const n = parseNumberToken(first[1]) || 0; for (let i = 1; i <= n; i++) nums.add(i); }
  const last = norm.match(new RegExp(`last\\s+${NUMBER_TOKEN}\\s+questions?`, 'iu'));
  if (last && existingCount > 0) { const n = parseNumberToken(last[1]) || 0; for (let i = Math.max(1, existingCount - n + 1); i <= existingCount; i++) nums.add(i); }
  return Array.from(nums).filter(n => n > 0 && (existingCount === 0 || n <= existingCount)).sort((a, b) => a - b);
}

function extractEditIntent(norm: string, existingCount: number, kinds: KindCountResult, lang: { lang?: LanguageSpec; translate: boolean }, prog: { change?: { from?: string; to: string } }): EditIntent {
  const edit: EditIntent = {
    removeFieldKeys: [], addFieldKeys: [], removeKinds: [], targetQuestionNumbers: [], removeQuestionNumbers: [], strictPreserve: false,
    keepMarks: false, keepDifficulty: false, makeRequired: [], makeOptional: []
  };
  const addRe = new RegExp(`(?:add|insert|append|include|generate|create|give|umero|ઉમેરો|जोड़ो|जोड़ें)\\s+(?:me\\s+)?(?:(another|an?|one\\s+more)\\s+|${NUMBER_TOKEN}\\s+)?(?:more\\s+|extra\\s+|additional\\s+|new\\s+)?((?:[\\p{L}\\p{M}/-]+\\s+){0,3}?)(?:${QUESTION_NOUN}|${FIELD_NOUN})${WB_END}`, 'iu');
  const add = norm.match(addRe);
  if (add) {
    const n = add[2] ? parseNumberToken(add[2]) : (add[1] ? 1 : undefined);
    edit.addCount = n !== undefined ? n : 1;
    const between = add[3] || '';
    const k = KIND_PATTERNS.find(kp => new RegExp(`(?:${kp.pattern})`, 'iu').test(between));
    if (k) edit.addKind = k.kind;
  } else {
    // "add 5 MCQs" (kind noun without "questions").
    for (const [kind, count] of Object.entries(kinds.typeCounts)) {
      if (new RegExp(`(?:add|insert|append|include|another|more)\\s+(?:${NUMBER_TOKEN}\\s+)?(?:more\\s+)?(?:[\\p{L}\\p{M}/-]+\\s+){0,2}?(?:${KIND_PATTERNS.find(kp => kp.kind === kind)!.pattern})`, 'iu').test(norm)) {
        edit.addCount = count;
        edit.addKind = kind as AssessmentQuestionKind;
        break;
      }
    }
  }

  const removeVerb = "remove|delete|drop|exclude|get\\s+rid\\s+of|take\\s+out|hatao|hata\\s+do|kadhi\\s+nakho|દૂર\\s+કરો|કાઢી\\s+નાખો|हटाओ|हटा\\s+दो";
  for (const { kind, pattern } of KIND_PATTERNS) {
    if (new RegExp(`${WB_START}(?:${removeVerb})\\s+(?:all\\s+)?(?:the\\s+|any\\s+|only\\s+(?:the\\s+)?)?(?:${pattern})|${WB_START}no\\s+(?:more\\s+)?(?:${pattern})`, 'iu').test(norm)) {
      edit.removeKinds.push(kind);
    }
  }
  for (const key of Object.keys(FIELD_SYNONYMS)) {
    if (new RegExp(`${WB_START}(?:${removeVerb})\\s+(?:only\\s+)?(?:the\\s+|any\\s+|an?\\s+)?(?:${FIELD_SYNONYMS[key].pattern})(?:\\s+(?:field|question|input))?${WB_END}`, 'iu').test(norm)) {
      edit.removeFieldKeys.push(key);
    }
  }

  edit.targetQuestionNumbers = extractQuestionNumbers(norm, existingCount);
  if (/(?:remove|delete|drop|hatao|કાઢી\s+નાખો|દૂર\s+કરો|हटाओ)\s+(?:the\s+)?(?:questions?|ques|q|prashn\w*|પ્રશ્ન\S*|प्रश्न)\s*(?:no\.?|number|#)?\s*\d/iu.test(norm)) {
    edit.removeQuestionNumbers = [...edit.targetQuestionNumbers];
    edit.targetQuestionNumbers = [];
  }
  edit.strictPreserve = /(?:change|modify|touch|alter|edit)\s+nothing\s+else|(?:keep|preserve|retain)\s+(?:everything|all|the\s+rest|other|others|remaining|existing|unchanged|the\s+existing|all\s+(?:the\s+)?existing)|without\s+(?:changing|touching|modifying|altering)\s+(?:the\s+)?(?:rest|remaining|others?|other\s+questions|anything\s+else|existing)|(?:don'?t|do\s+not)\s+(?:change|touch|modify|alter)\s+(?:anything|the\s+rest|other|others|remaining|existing)|\bonly\s+(?:change|modify|remove|update|edit)\b|\b(?:remove|delete|change|update)\s+only\b|baki\s+(?:badhu\s+)?(?:same|em\s+j)|બાકી\s+બધું\s+(?:એમ\s+જ|સરખું)|बाकी\s+सब\s+(?:वैसा\s+ही|same)/iu.test(norm);
  edit.keepMarks = /(?:same|existing|current|equal)\s+marks|keep\s+(?:the\s+)?(?:same\s+)?marks/iu.test(norm);
  edit.keepDifficulty = /(?:same|existing|current)\s+(?:level\s+of\s+)?difficulty|keep\s+(?:the\s+)?(?:same\s+)?difficulty|same\s+(?:\w+\s+){0,2}(?:and|&)\s+difficulty/iu.test(norm);
  for (const key of Object.keys(FIELD_SYNONYMS)) {
    if (new RegExp(`(?:add|include|insert|append|umero|ઉમેરો|जोड़ो)\\s+(?:a\\s+|an\\s+|the\\s+)?(?:new\\s+|required\\s+|mandatory\\s+|optional\\s+)?(?:field\\s+for\\s+(?:the\\s+)?)?(?:${FIELD_SYNONYMS[key].pattern})${WB_END}`, 'iu').test(norm)) {
      edit.addFieldKeys.push(key);
    }
  }

  for (const key of Object.keys(FIELD_SYNONYMS)) {
    const p = FIELD_SYNONYMS[key].pattern;
    if (new RegExp(`(?:make|set|mark|keep)\\s+(?:the\\s+)?(?:${p})\\s*(?:field\\s+)?(?:as\\s+)?(?:mandatory|required|compulsory)|${WB_START}(?:${p})\\s*(?:field\\s+)?(?:should\\s+be\\s+|must\\s+be\\s+)?(?:mandatory|required|compulsory|ફરજિયાત)`, 'iu').test(norm)) edit.makeRequired.push(key);
    if (new RegExp(`(?:make|set|mark|keep)\\s+(?:the\\s+)?(?:${p})\\s*(?:field\\s+)?(?:as\\s+)?optional|${WB_START}(?:${p})\\s*(?:field\\s+)?(?:should\\s+be\\s+)?optional`, 'iu').test(norm)) edit.makeOptional.push(key);
  }
  if (lang.lang && (lang.translate || lang.lang.source === 'explicit')) edit.translateTo = lang.lang.name;
  if (prog.change) edit.changeProgrammingLanguage = prog.change;

  if (/\b(?:harder|tougher|more\s+(?:difficult|challenging|advanced))\b/iu.test(norm)) edit.difficultyChange = 'harder';
  else if (/\b(?:easier|simpler|less\s+difficult)\b/iu.test(norm)) edit.difficultyChange = 'easier';
  else if (edit.targetQuestionNumbers.length > 0) {
    for (const d of DIFFICULTY_PATTERNS) if (hasWord(norm, d.pattern)) { edit.difficultyChange = d.level; break; }
  }
  return edit;
}

function contentWords(norm: string): string[] {
  const generic = new Set([
    'create', 'make', 'generate', 'build', 'design', 'prepare', 'draft', 'a', 'an', 'the', 'new', 'form', 'forms', 'please', 'pls', 'plz',
    'me', 'for', 'my', 'i', 'want', 'need', 'to', 'some', 'one', 'with', 'and', 'of', 'it', 'this', 'that', 'can', 'you', 'could', 'would',
    'banao', 'banavo', 'banav', 'banavvu', 'banavu', 'banavi', 'bnao', 'bana', 'do', 'ek', 'mate', 'mare', 'mane', 'ne', 'joie', 'joiye',
    'chahiye', 'chhe', 'che', 'hai', 'ho', 'kar', 'karo', 'karvu', 'simple', 'quick', 'basic', 'custom', 'good', 'nice', 'proper', 'online',
    'ફોર્મ', 'બનાવો', 'બનાવ', 'બનાવી', 'એક', 'મારે', 'માટે', 'છે', 'फॉर्म', 'बनाओ', 'एक', 'के', 'लिए', 'है', 'give', 'get', 'just',
    'quiz', 'test', 'exam', 'paper', 'questions', 'question', 'survey', 'questionnaire', 'poll', 'assessment', 'worksheet',
    'completely', 'entirely', 'instead', 'another', 'different', 'fresh', 'brand', 'scratch', 'from', 'start', 'over', 'again',
    'separate', 'second', 'navu', 'naya', 'નવું', 'नया', 'one', 'new'
  ]);
  return norm
    .replace(/[^\p{L}\p{M}\p{N}\s+#]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !generic.has(w) && !/^\d+$/.test(w));
}

function detectAudience(norm: string): string | undefined {
  const cls = norm.match(/(?:class|grade|std\.?|standard|dhoran|ધોરણ|कक्षा)\s*(\d{1,2})(?:st|nd|rd|th)?/iu);
  if (cls) return `Class ${cls[1]}`;
  const year = norm.match(/(\d)(?:st|nd|rd|th)\s+(year|sem(?:ester)?)\b/iu);
  if (year) return `${year[1]}${['', 'st', 'nd', 'rd'][Number(year[1])] || 'th'} ${year[2].startsWith('sem') ? 'semester' : 'year'}`;
  const deg = norm.match(/\b(b\.?\s?tech|m\.?\s?tech|bca|mca|b\.?\s?sc|m\.?\s?sc|b\.?\s?com|mba|bba|b\.e\.|m\.e\.)(?=\s|$|[,.;])/iu);
  if (deg) return deg[1].toUpperCase().replace(/\s|\./g, '');
  const lvl = norm.match(/\b(beginners?|freshers?|college\s+students|high\s+school|primary\s+school|undergraduates?|professionals|interview\s+candidates)\b/iu);
  return lvl ? lvl[1] : undefined;
}

function detectTopic(norm: string, programmingLanguage?: string): string | undefined {
  for (const s of SUBJECTS) if (hasWord(norm, s.pattern)) {
    if (s.topic === 'Computer Science' && programmingLanguage) return programmingLanguage;
    return s.topic;
  }
  if (programmingLanguage) return programmingLanguage;
  const on = norm.match(/(?:^|\s)(?:on|about|regarding|covering|of)\s+(?:the\s+)?(?:topic\s+(?:of\s+)?)?([\p{L}\p{M}0-9+#.\s-]{3,40}?)(?:\s+(?:with|for|having|of|in|quiz|test|exam|paper|questions?|mcqs?)\b|[,.;]|$)/iu);
  if (on) {
    const cand = on[1].trim();
    if (!/^(?:\d+|exactly|only|the|a|an|easy|hard|medium|difficult|english|gujarati|hindi|marks?)$/i.test(cand) && contentWords(cand).length > 0) return cand;
  }
  return undefined;
}

function hasTopicContent(norm: string, kinds: KindCountResult): boolean {
  const stripped = norm
    .replace(new RegExp(`${NUMBER_TOKEN}`, 'giu'), ' ')
    .replace(new RegExp(KIND_PATTERNS.map(k => `(?:${k.pattern})`).join('|'), 'giu'), ' ')
    .replace(new RegExp(DIFFICULTY_PATTERNS.map(d => `(?:${d.pattern})`).join('|'), 'giu'), ' ')
    .replace(new RegExp(`${MARKS_NOUN}|minutes?|each|total|exactly|only|with|of|level|type|questions?|mcqs?|answers?|key|timer|time|limit|marking|negative|explanations?|solutions?|in|english|gujarati|hindi`, 'giu'), ' ');
  return contentWords(stripped).length > 0 || kinds.mentioned.some(k => ['coding', 'sql', 'debugging', 'predict_output'].includes(k));
}

function localizedClarification(lang: string, key: 'purpose' | 'topic' | 'nothing_open'): { question: string; suggestions: string[] } {
  const gu = lang === 'gujarati';
  const hi = lang === 'hindi';
  if (key === 'topic') {
    return {
      question: gu ? 'કયા વિષય અને ધોરણ/સ્તર માટે ક્વિઝ બનાવવી છે?' : hi ? 'क्विज़ किस विषय और किस स्तर/कक्षा के लिए बनानी है?' : 'Which subject or topic should the quiz cover, and for what level (e.g. "Class 8 science", "Python for beginners")?',
      suggestions: ['Class 8 Science quiz, 20 MCQs', 'Python basics test for beginners', 'General knowledge trivia, 10 questions']
    };
  }
  if (key === 'nothing_open') {
    return {
      question: gu ? 'હાલમાં કોઈ ફોર્મ ખુલ્લું નથી. તમે શું બનાવવા માંગો છો?' : hi ? 'अभी कोई फॉर्म खुला नहीं है। आप क्या बनाना चाहते हैं?' : 'There is no form open to edit yet. What would you like me to create first?',
      suggestions: ['Restaurant food order form', 'Customer feedback survey', 'Class 10 maths quiz']
    };
  }
  return {
    question: gu ? 'આ ફોર્મ શેના માટે છે? (દા.ત. ફૂડ ઓર્ડર, હોટેલ બુકિંગ, નોકરી અરજી, ક્વિઝ)' : hi ? 'यह फॉर्म किस काम के लिए है? (जैसे फ़ूड ऑर्डर, होटल बुकिंग, नौकरी आवेदन, क्विज़)' : 'What is the form for? For example: food orders, hotel bookings, job applications, customer feedback, or a quiz.',
    suggestions: ['Restaurant food order form', 'Hotel booking form', 'Job application form', 'Customer feedback survey']
  };
}

/* -------------------------------------------------------------------------- */
/* Main entry                                                                  */
/* -------------------------------------------------------------------------- */

export function extractRequirementSpec(prompt: string, ctx: SpecContext = {}): RequirementSpec {
  const rawPrompt = (prompt || '').trim();
  const norm = normalizePrompt(rawPrompt);
  const existing = ctx.existingForm && Array.isArray(ctx.existingForm.questions) ? ctx.existingForm : null;
  const hasExisting = Boolean(existing && (existing.questions || []).length > 0);
  const existingCount = existing?.questions?.length || 0;

  /* ---------------- operation ---------------- */
  let operation: ConversationOperation = 'create';
  let operationReason = 'The message describes a new form.';
  const hasCreateVerb = hasWord(norm, CREATE_VERB);
  const hasArtifactNoun = hasWord(norm, ARTIFACT_NOUN);
  const hasEditVerb = hasWord(norm, EDIT_VERB) || EDIT_MAKE.test(norm) || EDIT_COMPARATIVE.test(norm);
  const isGreeting = GREETING.test(norm) && norm.replace(GREETING, '').trim().length === 0;
  const isHelp = HELP_QUESTION.test(norm);

  if (!norm) {
    operation = 'clarify';
    operationReason = 'Empty message.';
  } else if (isGreeting || (isHelp && !(hasCreateVerb && hasArtifactNoun && contentWords(norm).length > 3))) {
    operation = 'converse';
    operationReason = isGreeting ? 'Greeting / small talk.' : 'A question about what the assistant can do.';
  } else if (ctx.forceModify && hasExisting) {
    operation = 'modify';
    operationReason = 'Editing the form that is currently open.';
  } else if (hasExisting) {
    if (NEW_ARTIFACT.test(norm)) {
      operation = 'create';
      operationReason = 'The user explicitly asked for a new form instead of editing the current one.';
    } else if (CREATE_PHRASE.test(norm) && !EDIT_MAKE.test(norm)) {
      operation = 'create';
      operationReason = 'A complete new form was described while another form was open.';
    } else if (hasEditVerb) {
      operation = 'modify';
      operationReason = 'Edit instruction for the form that is currently open.';
    } else if (hasCreateVerb && hasArtifactNoun && contentWords(norm).length >= 2) {
      operation = 'create';
      operationReason = 'A complete new form was described while another form was open.';
    } else {
      operation = 'modify';
      operationReason = 'Follow-up instruction applied to the form that is currently open.';
    }
  } else if (/\?\s*$/.test(norm) && !hasCreateVerb && !hasArtifactNoun) {
    operation = 'converse';
    operationReason = 'A general question.';
  }

  const isModify = operation === 'modify';

  /* ---------------- constraints ---------------- */
  const kinds = extractKindCounts(norm);
  const marks = extractMarks(norm);
  const kindInfo = detectArtifactKind(norm, kinds, marks, ctx, isModify);
  const artifactKind = kindInfo.kind;
  const langInfo = extractLanguage(rawPrompt, norm);
  const prog = extractProgrammingLanguage(norm);
  const fields = extractFieldConstraints(norm, isModify);
  const kindConstraints = extractKindConstraints(norm, kinds.mentioned, isModify);
  const total = extractTotalCount(norm, kinds.spans, artifactKind, isModify);

  const assumptions: string[] = [];
  const conflicts: string[] = [];
  const unsupported: string[] = [];

  /* ---------------- language ---------------- */
  let language: LanguageSpec;
  if (langInfo.lang) language = langInfo.lang;
  else if (isModify && existing) {
    language = languageFromScript(existingFormText(existing)) || { name: 'english', script: 'latin', isRtl: false, source: 'context' };
    language = { ...language, source: 'context' };
  } else {
    const fromScript = languageFromScript(rawPrompt);
    if (fromScript) {
      language = fromScript;
      assumptions.push(`Your message was written in ${capitalize(fromScript.name)} script, so the content is generated in ${capitalize(fromScript.name)}. Say "in English" to change this.`);
    } else {
      language = { name: 'english', script: 'latin', isRtl: false, source: 'default' };
      if (/\b(?:che|chhe|banav\w*|banao|mare|mate|joie|chahiye|hai|karo|kar\s+do|mujhe)\b/iu.test(norm)) {
        assumptions.push('Your message was in Gujlish/Hinglish, so the form is generated in English. Ask for "Gujarati" or "Hindi" to change the language.');
      }
    }
  }

  /* ---------------- counts ---------------- */
  const typeCounts = { ...kinds.typeCounts };
  if (typeCounts.diagram) {
    unsupported.push(`Diagram / image-based questions (${typeCounts.diagram} requested) are not supported: the AI cannot create images. They were not generated; add an image-upload question manually in the builder if needed.`);
    delete typeCounts.diagram;
  }
  if (kindConstraints.mentioned.includes('diagram') && !kinds.typeCounts.diagram) {
    unsupported.push('Diagram / image-based questions are not supported because the AI cannot create images.');
  }
  for (const k of kindConstraints.excluded) delete typeCounts[k];
  const kindSum = Object.values(typeCounts).reduce((s, v) => s + (v || 0), 0);

  let itemCount: CountConstraint | undefined = total.count;
  // For data-collection forms "5 multiple choice questions" describes some fields, not the total.
  if (!isModify && artifactKind === 'assessment') {
    if (kindSum > 0) {
      if (!itemCount) itemCount = { mode: 'exact', value: kindSum };
      else if (itemCount.mode === 'exact' && kindSum > itemCount.value) {
        conflicts.push(`The question types add up to ${kindSum} questions, but the total requested is ${itemCount.value}.`);
      } else if (itemCount.mode === 'max' && kindSum > itemCount.value) {
        conflicts.push(`The question types add up to ${kindSum} questions, more than the maximum of ${itemCount.value}.`);
      }
    }
    if (kinds.typeCounts.diagram && itemCount && itemCount.mode === 'exact') {
      itemCount = { mode: 'exact', value: Math.max(1, itemCount.value - kinds.typeCounts.diagram) };
    }
  }
  const cap = artifactKind === 'assessment' ? MAX_ASSESSMENT_QUESTIONS : MAX_FORM_FIELDS;
  if (itemCount && itemCount.value > cap) {
    unsupported.push(`At most ${cap} ${artifactKind === 'assessment' ? 'questions' : 'fields'} can be generated in one request (you asked for ${itemCount.value}). ${cap} will be generated; ask to "add ${itemCount.value - cap} more" afterwards.`);
    itemCount = { ...itemCount, value: cap };
  }

  /* ---------------- marks ---------------- */
  let { totalMarks, marksPerQuestion } = marks;
  if (artifactKind !== 'assessment') { totalMarks = undefined; marksPerQuestion = undefined; }
  const kindMarks = kinds.kindMarks;
  if (artifactKind === 'assessment' && !isModify) {
    const n = itemCount?.mode === 'exact' ? itemCount.value : undefined;
    if (totalMarks !== undefined && marksPerQuestion !== undefined && n !== undefined && Math.abs(n * marksPerQuestion - totalMarks) > 1e-9) {
      conflicts.push(`${n} questions × ${marksPerQuestion} marks = ${n * marksPerQuestion} marks, which does not match the requested total of ${totalMarks}. Options: keep ${marksPerQuestion} marks each (total ${n * marksPerQuestion}), keep the ${totalMarks}-mark total (${round2(totalMarks / n)} marks each), or use ${round2(totalMarks / marksPerQuestion)} questions.`);
    }
    const kindKeys = Object.keys(typeCounts) as AssessmentQuestionKind[];
    if (totalMarks !== undefined && kindKeys.length > 0 && kindKeys.every(k => kindMarks[k] !== undefined)) {
      const sum = kindKeys.reduce((s, k) => s + (typeCounts[k] || 0) * (kindMarks[k] || 0), 0);
      if (Math.abs(sum - totalMarks) > 1e-9) conflicts.push(`The per-type marks add up to ${sum}, but the requested total is ${totalMarks}.`);
    }
    if (totalMarks !== undefined && n !== undefined && totalMarks / n < 0.5) {
      conflicts.push(`A ${totalMarks}-mark paper cannot be split across ${n} questions with at least half a mark each.`);
    }
    if (totalMarks === undefined && marksPerQuestion === undefined && Object.keys(kindMarks).length === 0) {
      assumptions.push('No marks were specified, so marks are assigned per question by complexity (objective questions 1 mark, descriptive and coding questions more). You can edit them in the builder.');
    }
  }

  /* ---------------- other assessment settings ---------------- */
  let timeLimitMinutes: number | undefined;
  const tl = norm.match(new RegExp(`(?:time\\s*limit|duration|timer|time\\s+allowed|samay|સમય|समय)\\s*(?:of|is|:|=|-)?\\s*${NUMBER_TOKEN}\\s*(min(?:ute)?s?|hours?|hrs?|કલાક|મિનિટ|घंटे|मिनट)`, 'iu'))
    || (artifactKind === 'assessment' ? norm.match(new RegExp(`${NUMBER_TOKEN}\\s*[-]?\\s*(min(?:ute)?s?|hours?|hrs?|કલાક|મિનિટ|घंटे|मिनट)\\s*(?:time\\s*limit|timer|duration|test|exam|quiz|paper|long)?`, 'iu')) : null);
  if (tl) {
    const v = parseNumberToken(tl[1]);
    if (v !== undefined) timeLimitMinutes = /hour|hr|કલાક|घंटे/iu.test(tl[2]) ? v * 60 : v;
  }
  let negativeMarking: number | undefined;
  const neg = norm.match(new RegExp(`negative\\s+mark(?:ing|s)?\\s*(?:of\\s+)?(?:-\\s*)?(\\d+\\s*/\\s*\\d+|\\d+(?:\\.\\d+)?)?`, 'iu'))
    || norm.match(/(?:minus|deduct)\s+(\d+(?:\.\d+)?|\d+\s*\/\s*\d+)\s*(?:marks?)?\s*(?:for\s+(?:each\s+)?wrong|per\s+wrong)/iu);
  if (neg && artifactKind === 'assessment') {
    if (neg[1]) {
      const f = neg[1].replace(/\s/g, '');
      negativeMarking = f.includes('/') ? Number(f.split('/')[0]) / Number(f.split('/')[1]) : Number(f);
    } else {
      negativeMarking = 0.25;
      assumptions.push('Negative marking was requested without a value; 0.25 marks are deducted per wrong objective answer.');
    }
  }
  let passingScore: RequirementSpec['passingScore'];
  const pass = norm.match(/pass(?:ing)?\s*(?:marks?|score|percentage|criteria|threshold)?\s*(?:of|is|:|=|at)?\s*(\d+(?:\.\d+)?)\s*(%|percent|marks?)?/iu);
  if (pass && artifactKind === 'assessment') {
    passingScore = { value: Number(pass[1]), unit: pass[2] && /%|percent/.test(pass[2]) ? 'percent' : (pass[2] ? 'marks' : 'percent') };
  }

  const includeAnswerKey = artifactKind === 'assessment' && !/\b(?:without|no)\s+(?:the\s+)?(?:answers?|answer\s+key|solutions?)\b/iu.test(norm);
  const includeExplanations = artifactKind === 'assessment' && !/\b(?:without|no)\s+explanations?\b/iu.test(norm);
  const includeSolutionsAtEnd = artifactKind === 'assessment' && /(?:solutions?|answers?|answer\s+key)\s+(?:at|in)\s+the\s+end|end\s+(?:with\s+)?(?:solutions?|answer\s+key)/iu.test(norm);

  /* ---------------- difficulty ---------------- */
  const difficulty = artifactKind === 'assessment'
    ? extractDifficulty(norm, isModify ? undefined : (itemCount?.mode === 'exact' ? itemCount.value : undefined))
    : undefined;
  if (artifactKind === 'assessment' && !isModify && !difficulty) {
    assumptions.push('No difficulty was specified, so a balanced mix (mostly medium) is used.');
  }

  /* ---------------- domain, topic, title ---------------- */
  const { domain, purpose } = detectDomain(norm, artifactKind);
  const programmingLanguage = prog.language;
  const topic = artifactKind === 'assessment' && !isModify ? detectTopic(norm, programmingLanguage) : undefined;
  const audience = detectAudience(norm);
  const explicitTitle = extractTitle(rawPrompt);

  if (kindInfo.source !== 'explicit' && kindInfo.source !== 'context' && !kindInfo.deferred) {
    assumptions.push(kindInfo.reason);
  }

  /* ---------------- edit intent ---------------- */
  const edit = isModify ? extractEditIntent(norm, existingCount, kinds, langInfo, prog) : undefined;
  if (isModify && totalMarks === undefined && marks.totalMarks !== undefined && isExistingAssessment(existing)) {
    totalMarks = marks.totalMarks;
  }
  if (isModify && edit && edit.translateTo) {
    const target = LANGUAGES.find(l => l.name === edit.translateTo);
    if (target) language = { name: target.name, script: target.script, isRtl: Boolean(target.isRtl), source: 'explicit' };
  }

  /* ---------------- clarification ---------------- */
  let clarificationQuestion: string | undefined;
  let clarificationSuggestions: string[] | undefined;
  if (operation === 'create') {
    const editOnly = (EDIT_ONLY.test(norm) || EDIT_MAKE.test(norm)) && !CREATE_PHRASE.test(norm) && !NEW_ARTIFACT.test(norm);
    if (!hasExisting && !ctx.hasDocument && editOnly) {
      const c = localizedClarification(language.name, 'nothing_open');
      operation = 'clarify'; operationReason = 'An edit was requested but no form is open.';
      clarificationQuestion = c.question; clarificationSuggestions = c.suggestions;
    } else if (!ctx.hasDocument && contentWords(norm).length === 0 && artifactKind === 'form') {
      const c = localizedClarification(language.name, 'purpose');
      operation = 'clarify'; operationReason = 'The purpose of the form is missing.';
      clarificationQuestion = c.question; clarificationSuggestions = c.suggestions;
    } else if (!ctx.hasDocument && artifactKind === 'assessment' && !topic && !hasTopicContent(norm, kinds)) {
      const c = localizedClarification(language.name, 'topic');
      operation = 'clarify'; operationReason = 'The subject of the quiz is missing.';
      clarificationQuestion = c.question; clarificationSuggestions = c.suggestions;
    } else if (conflicts.length > 0) {
      operation = 'clarify'; operationReason = 'The requested constraints conflict.';
      clarificationQuestion = `${conflicts.join(' ')} Please tell me which option you prefer.`;
      clarificationSuggestions = [];
    }
  }

  // In edits, a bare count ("exactly 20 questions") sets the new total; "add 5 more" does not.
  const finalItemCount = isModify ? (total.count && !edit?.addCount ? itemCount : undefined) : itemCount;

  const spec: RequirementSpec = {
    rawPrompt,
    normalizedPrompt: norm,
    operation,
    operationReason,
    signals: { createVerb: hasCreateVerb, artifactNoun: hasArtifactNoun, editVerb: hasEditVerb, questionKinds: kinds.mentioned.length > 0 },
    artifactKind,
    artifactKindSource: kindInfo.source,
    artifactKindDeferred: kindInfo.deferred || undefined,
    language,
    domain,
    purpose,
    topic,
    audience,
    explicitTitle,
    itemCount: finalItemCount,
    typeCounts: isModify || artifactKind !== 'assessment' ? {} : typeCounts,
    kindMarks: artifactKind === 'assessment' ? kindMarks : {},
    onlyKinds: kindConstraints.only.length > 0 ? kindConstraints.only : undefined,
    excludedKinds: kindConstraints.excluded,
    mentionedKinds: kindConstraints.mentioned,
    excludedFields: fields.excluded,
    requestedFields: fields.requested.filter(f => !fields.excluded.includes(f)),
    mandatoryFields: fields.mandatory,
    optionalFields: fields.optional,
    allRequired: fields.allRequired || undefined,
    allOptional: fields.allOptional || undefined,
    difficulty,
    totalMarks,
    marksPerQuestion,
    timeLimitMinutes,
    negativeMarking,
    passingScore,
    programmingLanguage,
    includeAnswerKey,
    includeExplanations,
    includeSolutionsAtEnd,
    edit,
    assumptions,
    conflicts,
    unsupported,
    clarificationQuestion,
    clarificationSuggestions
  };
  return spec;
}

/** Exposed for the generation plan: per-kind marks parsed from "10 MCQs of 1 mark each". */
export function extractKindMarks(prompt: string): Partial<Record<AssessmentQuestionKind, number>> {
  return extractKindCounts(normalizePrompt(prompt)).kindMarks;
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Human-readable list of what was understood, for the response report. */
export function describeSpec(spec: RequirementSpec): string[] {
  const out: string[] = [];
  out.push(`Operation: ${spec.operation}${spec.operation === 'modify' ? ' the current form' : ''}`);
  out.push(spec.artifactKind === 'assessment'
    ? 'Artifact: graded assessment (quiz / exam)'
    : spec.operation === 'modify' || spec.domain === 'general' ? 'Artifact: data-collection form (no marks or answers)' : `Artifact: data-collection form (${spec.purpose.toLowerCase()})`);
  if (spec.topic) out.push(`Topic: ${spec.topic}`);
  if (spec.audience) out.push(`Audience: ${spec.audience}`);
  out.push(`Language: ${capitalize(spec.language.name)}${spec.language.source === 'explicit' ? ' (requested)' : ''}`);
  if (spec.explicitTitle) out.push(`Title: "${spec.explicitTitle}"`);
  if (spec.itemCount) {
    const noun = spec.artifactKind === 'assessment' ? 'questions' : 'fields';
    out.push(`${spec.itemCount.mode === 'exact' ? 'Exactly' : spec.itemCount.mode === 'min' ? 'At least' : 'At most'} ${spec.itemCount.value} ${noun}`);
  }
  const tc = Object.entries(spec.typeCounts).filter(([, v]) => v);
  if (tc.length > 0) out.push(`Question types: ${tc.map(([k, v]) => `${v} ${kindLabel(k as AssessmentQuestionKind)}`).join(', ')}`);
  if (spec.onlyKinds) out.push(`Only: ${spec.onlyKinds.map(kindLabel).join(', ')}`);
  if (spec.excludedKinds.length) out.push(`Excluded question types: ${spec.excludedKinds.map(kindLabel).join(', ')}`);
  if (spec.excludedFields.length) out.push(`Excluded fields: ${spec.excludedFields.join(', ')}`);
  if (spec.requestedFields.length) out.push(`Requested fields: ${spec.requestedFields.join(', ')}`);
  if (spec.mandatoryFields.length && !spec.edit) out.push(`Mandatory: ${spec.mandatoryFields.join(', ')}`);
  if (spec.optionalFields.length && !spec.edit) out.push(`Optional: ${spec.optionalFields.join(', ')}`);
  if (spec.allRequired) out.push('All fields mandatory');
  if (spec.difficulty?.level) out.push(`Difficulty: ${spec.difficulty.level}`);
  if (spec.difficulty?.mostly) out.push(`Difficulty: mostly ${spec.difficulty.mostly}`);
  if (spec.difficulty?.distribution && !spec.difficulty.level) {
    out.push(`Difficulty distribution: ${Object.entries(spec.difficulty.distribution).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  }
  if (spec.totalMarks !== undefined) out.push(`Total marks: ${spec.totalMarks}`);
  if (spec.marksPerQuestion !== undefined) out.push(`Marks per question: ${spec.marksPerQuestion}`);
  if (spec.timeLimitMinutes) out.push(`Time limit: ${spec.timeLimitMinutes} minutes`);
  if (spec.negativeMarking) out.push(`Negative marking: -${spec.negativeMarking} per wrong answer`);
  if (spec.passingScore) out.push(`Passing score: ${spec.passingScore.value}${spec.passingScore.unit === 'percent' ? '%' : ' marks'}`);
  if (spec.programmingLanguage && spec.artifactKind === 'assessment') out.push(`Programming language: ${spec.programmingLanguage}`);
  if (spec.edit) {
    const e = spec.edit;
    if (e.addCount) out.push(`Add ${e.addCount} ${e.addKind ? kindLabel(e.addKind) : spec.artifactKind === 'assessment' ? 'questions' : 'fields'}`);
    if (e.removeKinds.length) out.push(`Remove: ${e.removeKinds.map(kindLabel).join(', ')}`);
    if (e.removeFieldKeys.length) out.push(`Remove fields: ${e.removeFieldKeys.join(', ')}`);
    if (e.targetQuestionNumbers.length) out.push(`Target questions: ${e.targetQuestionNumbers.join(', ')}`);
    if (e.difficultyChange) out.push(`Difficulty change: ${e.difficultyChange}`);
    if (e.translateTo) out.push(`Translate to ${capitalize(e.translateTo)}`);
    if (e.changeProgrammingLanguage) out.push(`Programming language → ${e.changeProgrammingLanguage.to}`);
    if (e.makeRequired.length) out.push(`Make mandatory: ${e.makeRequired.join(', ')}`);
    if (e.makeOptional.length) out.push(`Make optional: ${e.makeOptional.join(', ')}`);
    if (e.strictPreserve || e.keepMarks || e.keepDifficulty) out.push('Keep everything else unchanged');
  }
  return out;
}
