export interface UnderstandingSummary {
  topic: string;
  purpose: string;
  formType: string;
  difficulty: string;
  questionCount: number;
  summaryText: string;
}

export interface IntentResult {
  category: 'quiz' | 'survey' | 'rsvp' | 'job' | 'contact' | 'general' | 'medical' | 'complaint' | 'invoice' | 'booking' | 'order' | 'appointment' | 'crm';
  topic: string;
  purpose: string;
  formType: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Difficult' | 'Advanced';
  questionCount: number;
  normalizedPrompt: string;
  industry: string;
  expandedFields: string[];
  relevanceRules: {
    allowGenericIdentity: boolean;
    requireQuizValidation: boolean;
  };
  understandingSummary: UnderstandingSummary;
}

export function spellingRecovery(text: string): string {
  let cleaned = text.toLowerCase().replace(/\s+/g, " ").trim();

  // Phonetic/slang corrections
  cleaned = cleaned.replace(/\b(clg|colg|colleg)\b/g, "college");
  cleaned = cleaned.replace(/\b(valu|walu|valoo)\b/g, "form");
  cleaned = cleaned.replace(/\b(from|fom|fram|porm|formm)\b/g, "form");
  cleaned = cleaned.replace(/\b(squert|survet|survay|surviy|surve|reviw|reveiw|riview|rivew|revue|reviwe|feedbackk|feedbak|fedback|fedbak)\b/g, "survey");
  cleaned = cleaned.replace(/\b(quz|qiz|quizz|quize|quise)\b/g, "quiz");
  cleaned = cleaned.replace(/\b(regitration|regis|ragistration|reg)\b/g, "registration");
  cleaned = cleaned.replace(/\b(trevel|traval|traveling)\b/g, "travel");
  cleaned = cleaned.replace(/\b(bookig|boking|bokingg)\b/g, "booking");
  cleaned = cleaned.replace(/\b(perfcat|perfact|perfec|perfectt|perfeckt)\b/g, "perfect");
  
  // Regional verbs and nouns mapping
  cleaned = cleaned.replace(/\b(banavo|bnao|banao|banado|likho|tayyar karo|tayarkaro|create|make)\b/g, "generate");
  cleaned = cleaned.replace(/\b(mahiti|suchna|suchan|chakasni|mahitia)\b/g, "evaluation");
  cleaned = cleaned.replace(/\b(suqrey|surgrey|sugery|surgeryy)\b/g, "surgery");

  return cleaned;
}

export function detectLanguage(text: string): { lang: string; isRtl: boolean } {
  const lowercase = text.toLowerCase();
  
  if (lowercase.includes("gujarati") || lowercase.includes("ગુજરાતી") || lowercase.includes("gujrish")) return { lang: "gujarati", isRtl: false };
  if (lowercase.includes("hindi") || lowercase.includes("हिंदी") || lowercase.includes("हिन्दी") || lowercase.includes("hinglish")) return { lang: "hindi", isRtl: false };
  if (lowercase.includes("arabic") || lowercase.includes("عربي") || lowercase.includes("العربية")) return { lang: "arabic", isRtl: true };
  if (lowercase.includes("urdu") || lowercase.includes("اردو")) return { lang: "urdu", isRtl: true };
  if (lowercase.includes("french") || lowercase.includes("français") || lowercase.includes("francais")) return { lang: "french", isRtl: false };
  if (lowercase.includes("spanish") || lowercase.includes("español") || lowercase.includes("espanol")) return { lang: "spanish", isRtl: false };
  if (lowercase.includes("german") || lowercase.includes("deutsch")) return { lang: "german", isRtl: false };
  if (lowercase.includes("japanese") || lowercase.includes("日本語")) return { lang: "japanese", isRtl: false };
  if (lowercase.includes("russian") || lowercase.includes("русский")) return { lang: "russian", isRtl: false };

  const cleanWords = lowercase.split(/\s+/);
  const gujaratiKeywords = ["banavo", "bnao", "banaoo", "karo", "aapo", "lakho", "kem", "cho", "nathi", "thatu", "maheko", "tayar", "tayyar", "motu", "navu", "dakhla", "prashno", "nathi", "thatu", "che", "chhe"];
  const hindiKeywords = ["banao", "banado", "kijiye", "kro", "likho", "chahiye", "hai", "ko", "se", "ek", "karne"];
  
  if (gujaratiKeywords.some(w => cleanWords.includes(w))) return { lang: "gujarati", isRtl: false };
  if (hindiKeywords.some(w => cleanWords.includes(w))) return { lang: "hindi", isRtl: false };

  if (/[\u0A80-\u0AFF]/.test(text)) return { lang: "gujarati", isRtl: false };
  if (/[\u0900-\u097F]/.test(text)) return { lang: "hindi", isRtl: false };
  if (/[\u0600-\u06FF]/.test(text)) return { lang: "arabic", isRtl: true };

  return { lang: "english", isRtl: false };
}

export function detectTranslationIntent(text: string): { isTranslation: boolean; targetLang: string; isRtl: boolean } {
  const lowercase = text.toLowerCase();
  const isTranslation = /\b(translate|translation|tarjuma|anuvad|trans|અનુવાદ|अनुवाद|ഭാഷാંતരം)\b/.test(lowercase);
  const info = detectLanguage(text);
  return {
    isTranslation: isTranslation || lowercase.includes("translate to") || lowercase.includes("translate in"),
    targetLang: info.lang,
    isRtl: info.isRtl
  };
}

function extractTopicFromDocument(documentText: string): string | null {
  if (!documentText || documentText.trim().length < 5) return null;
  const lines = documentText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 20)) {
    // Check for lecture/chapter/title patterns
    const lectureMatch = line.match(/(?:lecture\s*\d*|chapter\s*\d*|module\s*\d*|unit\s*\d*|topic|title)\s*[:\-–]\s*([^.,;\n\r]+)/i);
    if (lectureMatch && lectureMatch[1] && lectureMatch[1].trim().length > 3) {
      let clean = lectureMatch[1].replace(/^(?:understanding|introduction to|fundamentals of|overview of)\s+/i, '').replace(/[\-–]\s*[IVX\d]+$/i, '').trim();
      if (clean.length > 3 && clean.length < 50) {
        return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    // Check if line looks like a title
    if (line.length >= 6 && line.length <= 60 && !line.includes("?") && !line.includes("http") && !line.startsWith("(") && !line.toLowerCase().startsWith("page")) {
      const clean = line.replace(/^\d+[\s.)\-]+/, '').replace(/^(?:understanding|introduction to|lecture\s*\d*[:\-]?)\s*/i, '').replace(/[\-–]\s*[IVX\d]+$/i, '').trim();
      if (clean.length > 4 && clean.length < 50 && !/^(true|false|option|section|table|figure|where|when|what|which|how|who)\b/i.test(clean)) {
        return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }
  return null;
}

function extractTopic(normalized: string, documentContext?: string): string {
  // Sort techTopics by length descending so longer keys match first (e.g. node.js before js)
  const techTopics: Record<string, string> = {
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "react.js": "React.js",
    "reactjs": "React.js",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mongodb": "MongoDB",
    "python": "Python",
    "docker": "Docker",
    "react": "React.js",
    "html5": "HTML5",
    "css3": "CSS3",
    "html": "HTML5",
    "css": "CSS3",
    "java": "Java",
    "c++": "C++",
    "cpp": "C++",
    "sql": "SQL Database",
    "aws": "AWS Cloud",
    "git": "Git",
    "node": "Node.js",
    "js": "JavaScript"
  };

  for (const [key, name] of Object.entries(techTopics)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'i');
    if (regex.test(normalized)) {
      return name;
    }
  }

  if (normalized.includes("coffee") || normalized.includes("cafe") || normalized.includes("café")) return "Coffee Shop & Café";
  if (normalized.includes("dentist") || normalized.includes("dentistry") || normalized.includes("dental")) return "Dentistry Clinic";
  if (normalized.includes("hospital") || normalized.includes("patient") || normalized.includes("medical") || normalized.includes("surgery") || normalized.includes("doctor")) return "Medical Patient Intake";
  if (normalized.includes("restaurant") || normalized.includes("dining") || normalized.includes("food") || normalized.includes("bakery")) return "Food & Dining Experience";
  if (normalized.includes("hotel") || normalized.includes("resort") || normalized.includes("stay") || normalized.includes("room")) return "Hotel & Hospitality";
  if (normalized.includes("gym") || normalized.includes("fitness") || normalized.includes("workout") || normalized.includes("trainer")) return "Fitness & Gym";
  if (normalized.includes("travel") || normalized.includes("flight") || normalized.includes("tour") || normalized.includes("trip")) return "Travel & Flight Booking";
  if (normalized.includes("car") || normalized.includes("vehicle") || normalized.includes("rent")) return "Vehicle Rental";
  if (normalized.includes("property") || normalized.includes("real estate") || normalized.includes("house") || normalized.includes("apartment")) return "Real Estate Property";
  if (normalized.includes("clothing") || normalized.includes("apparel") || normalized.includes("store") || normalized.includes("shop")) return "Clothing Store Customer Experience";
  if (normalized.includes("bug") || normalized.includes("issue") || normalized.includes("support") || normalized.includes("ticket")) return "Technical Support Ticket";
  if (normalized.includes("donate") || normalized.includes("donation") || normalized.includes("charity")) return "Donation & Fundraiser";
  if (normalized.includes("mobile app") || normalized.includes("app satisfaction")) return "Mobile Application";
  if (normalized.includes("website")) return "Website User Experience";
  if (normalized.includes("coding workshop") || normalized.includes("coding event") || normalized.includes("webinar") || normalized.includes("course")) return "Course & Workshop Registration";
  if (normalized.includes("conference") || normalized.includes("tech conference") || normalized.includes("summit") || normalized.includes("event") || normalized.includes("rsvp")) return "Event Registration";
  if (normalized.includes("backend developer") || normalized.includes("backend engineer")) return "Backend Developer Role";
  if (normalized.includes("frontend developer") || normalized.includes("frontend engineer")) return "Frontend Developer Role";
  if (normalized.includes("customer satisfaction") || normalized.includes("satisfaction")) return "Customer Satisfaction";
  if (normalized.includes("product feedback") || normalized.includes("feedback")) return "Product Experience";

  const metaNoiseRegex = /\b(analysis|analyze|analysing|create|make|generate|build|please|quiz|exam|test|mcq|mcqs|form|survey|feedback|pdf|document|doc|docx|file|notes|summary|upload|uploaded|attachment|image|scan|this|that|these|those|and|for|a|an|the|around|with|based\s+on|about|from|into|give|get|created|built)\b/gi;

  // Regex extract "about X" or "for X" or "X quiz"
  const topicPatterns = [
    /(?:about|on|regarding)\s+([a-z0-9\s\-\.\#\+]+?)(?:\s+(?:quiz|survey|form|feedback|exam|test|mcq|mcqs|registration|application)|$)/i,
    /([a-z0-9\s\-\.\#\+]+?)\s+(?:quiz|survey|feedback|exam|test|mcq|mcqs|registration|application|evaluation|poll|form)/i
  ];

  for (const pattern of topicPatterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      let candidate = match[1].replace(/^(a|an|the|my|our|difficult|easy|beginner|intermediate|advanced|10|15|20|5)\s+/i, '').trim();
      candidate = candidate.replace(metaNoiseRegex, ' ').replace(/\s+/g, ' ').trim();
      candidate = candidate.replace(/[\.\,\;\!\?]+$/g, '').trim();
      if (candidate.length > 2 && candidate.toLowerCase() !== "form" && candidate.toLowerCase() !== "survey" && candidate.toLowerCase() !== "quiz") {
        return candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

  // Clean fallback from prompt: remove instructions and cut off at conjunctions
  let cleanedPrompt = normalized
    .replace(metaNoiseRegex, ' ')
    .trim();

  // Cut off at conjunctions (with, using, containing, use, include, etc.)
  cleanedPrompt = cleanedPrompt.split(/\b(with|using|use|containing|include|including|having|after|where|for|and|by|based\s+on)\b/i)[0].trim();
  cleanedPrompt = cleanedPrompt.replace(/\b(smart\s+field\s+types|required\s+validation|conditional\s+questions|clean\s+responsive\s+layout|booking\s+confirmation|after\s+submission|net\s+promoter\s+score|nps|rating\s+scales|anti[\s\-]?cheat|timer\s+limit|mcq|mcqs|general|structured)\b/gi, '').trim();

  let words = cleanedPrompt.split(/\s+/).filter(w => w.length > 1 && !["this", "id", "remove", "field", "form", "option", "analysis", "pdf", "document", "doc", "file"].includes(w.toLowerCase()));
  if (words.length > 0) {
    if (words.length > 4) words = words.slice(0, 4);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // If no topic found in prompt, try extracting from document context if available
  if (documentContext) {
    const docTopic = extractTopicFromDocument(documentContext);
    if (docTopic) {
      return docTopic;
    }
  }

  return "Knowledge Assessment";
}

export function detectIntent(text: string, documentContext?: string): IntentResult {
  const normalized = spellingRecovery(text);
  const topic = extractTopic(normalized, documentContext);

  let category: IntentResult['category'] = 'general';
  let formType = 'General Form';
  let purpose = 'General Information Collection';
  let industry = 'General';
  let allowGenericIdentity = false;
  let requireQuizValidation = false;
  let expandedFields: string[] = [];

  // Form Type & Purpose Classification
  if (
    normalized.includes("mcq") || 
    normalized.includes("quiz") || 
    normalized.includes("exam") || 
    normalized.includes("test") ||
    normalized.includes("assignment") ||
    normalized.includes("assessment") ||
    normalized.includes("homework") ||
    normalized.includes("practical") ||
    normalized.includes("paper") ||
    normalized.includes("prashno") ||
    normalized.includes("dakhla")
  ) {
    category = 'quiz';
    formType = normalized.includes("assignment") 
      ? "Assignment Quiz" 
      : (normalized.includes("mcq") ? "MCQ Quiz" : (normalized.includes("exam") ? "Exam" : "Quiz"));
    purpose = "Knowledge Testing & Skill Assessment";
    industry = "Education & Skill Verification";
    requireQuizValidation = true;
    allowGenericIdentity = false; // ZERO generic fields for quizzes
  } else if (normalized.includes("survey")) {
    category = 'survey';
    formType = "Survey";
    purpose = "Opinion Collection & Preference Analysis";
    industry = "Market Research & Feedback";
    allowGenericIdentity = false;
  } else if (normalized.includes("feedback") || normalized.includes("review") || normalized.includes("rating")) {
    category = 'survey';
    formType = "Feedback Form";
    purpose = "Customer Experience & Satisfaction Measurement";
    industry = "Customer Success";
    allowGenericIdentity = false;
  } else if (normalized.includes("job") || normalized.includes("application") || normalized.includes("career") || normalized.includes("developer")) {
    category = 'job';
    formType = "Application Form";
    purpose = "Candidate Recruitment & Skill Evaluation";
    industry = "Human Resources & Hiring";
    allowGenericIdentity = true; // Identity fields relevant for applications
    expandedFields = ["Full Name", "Email Address", "Phone Number", "Resume / CV", "Portfolio / GitHub", "Years of Experience"];
  } else if (normalized.includes("registration") || normalized.includes("signup") || normalized.includes("register")) {
    category = 'contact';
    formType = normalized.includes("event") || normalized.includes("conference") ? "Event Registration" : "Registration Form";
    purpose = "Participant Onboarding & Identity Collection";
    industry = "Event & Membership";
    allowGenericIdentity = true; // Identity fields relevant for registration
    expandedFields = ["Full Name", "Email Address", "Phone Number", "Organization / College", "Session Selection"];
  } else if (normalized.includes("contact") || normalized.includes("lead")) {
    category = 'contact';
    formType = "Contact Form";
    purpose = "Lead Generation & Communication Inquiry";
    industry = "Sales & Marketing";
    allowGenericIdentity = true;
  } else if (normalized.includes("poll")) {
    category = 'survey';
    formType = "Poll";
    purpose = "Single-Question Opinion Gauge";
    industry = "Audience Engagement";
    allowGenericIdentity = false;
  }

  // Difficulty Detection
  let difficulty: IntentResult['difficulty'] = 'Intermediate';
  if (normalized.includes("beginner") || normalized.includes("easy") || normalized.includes("basic") || normalized.includes("starter")) {
    difficulty = 'Beginner';
  } else if (normalized.includes("difficult") || normalized.includes("hard") || normalized.includes("advanced") || normalized.includes("complex")) {
    difficulty = 'Difficult';
  }

  // Question Count Extraction
  const digitExtract = normalized.match(/(\d+)\s*(?:question|questions|mcq|mcqs|field|fields)?/i);
  let questionCount = digitExtract ? parseInt(digitExtract[1]) : (requireQuizValidation ? 10 : 6);
  if (questionCount > 50) questionCount = 50;
  if (questionCount < 1) questionCount = requireQuizValidation ? 10 : 6;

  const summaryText = `I understood this as: Topic: ${topic} | Purpose: ${purpose} | Type: ${formType} | Difficulty: ${difficulty} | Questions: ${questionCount}`;

  return {
    category,
    topic,
    purpose,
    formType,
    difficulty,
    questionCount,
    normalizedPrompt: normalized,
    industry,
    expandedFields,
    relevanceRules: {
      allowGenericIdentity,
      requireQuizValidation
    },
    understandingSummary: {
      topic,
      purpose,
      formType,
      difficulty,
      questionCount,
      summaryText
    }
  };
}

export function buildSystemInstruction(intent: IntentResult, documentContext?: string, targetLang: string = "english", isRtl: boolean = false): string {
  let contextSnippet = "";
  if (documentContext) {
    contextSnippet = `\nContextual Source Document Content:\n---\n${documentContext}\n---\nAnalyze this document context and base the form questions on it.`;
  }

  const langInstruction = `\nCRITICAL REQUIREMENT: You MUST generate the form entire content (title, description, field labels, and options) in this language: "${targetLang}".`;

  return `You are the True Topic-Based AI Form Generator for PromptForm AI.
Your primary objective is to analyze the user's intent, extract the core topic, and generate a highly structured, professional, topic-specific form.

STRICT GENERATION RULES:
1. WORLD KNOWLEDGE & FACTUAL TRUTH MANDATE:
   - You possess vast, deep, factually accurate world knowledge on ALL topics across video games (e.g. GTA V, Minecraft, Valorant, Call of Duty, FIFA, Pokémon, League of Legends, Fortnite, Roblox, CS:GO, God of War, Cyberpunk, Genshin Impact, Chess, Board Games), sports (e.g. Cricket World Cup, Premier League, NBA, Tennis, F1, Olympics), pop culture, movies, anime, literature, history, geography, science, technology, medicine, and business.
   - When given ANY user prompt on ANY topic in the world (e.g. "${intent.topic}"), you MUST analyze the specific subject in detail and generate 100% TRUE, ACCURATE, and topic-authentic factual content.
   - For Quizzes/Exams: Every single question MUST be a REAL, verified factual question about "${intent.topic}". Options MUST contain EXACTLY 1 strictly correct answer string and 3 realistic distractors based on actual facts. Explanations MUST provide true background facts explaining why the answer is correct.
   - For Surveys/Feedback: Every question MUST ask about real features, experiences, metrics, or gameplay/service aspects specific to "${intent.topic}".

2. TITLE & DESCRIPTION MANDATE:
   - "title": MUST be a clean, concise, 2 to 4 word professional human title (e.g. "GTA V Gaming Quiz", "Cricket World Cup Trivia", "Customer Feedback Survey", "JavaScript Skill Quiz"). NEVER copy raw prompt phrases or instructions like "with net promoter score and rating scales" into the title!
   - EXPLICIT TITLE OVERRIDE RULE: If the user explicitly asks to change or set the title (e.g., "change title to X", "title: X", "rename form to X", "title rakho X"), set "title" to the exact string specified by the user!
   - "description": A warm, welcoming, professional 1-2 sentence description explaining the purpose of the form.

2. TOPIC RELEVANCE: Every question MUST directly relate to the detected topic: "${intent.topic}". Never use generic filler questions.

3. SPECIAL WIDGET & INTENT HANDLING:
   - NET PROMOTER SCORE (NPS): If the user prompt mentions "NPS" or "Net Promoter Score" or "recommendation score", generate:
     a) An NPS recommendation question of type "mcq" with label "How likely are you to recommend us to a friend or colleague?" and options ["0 - Not at all likely", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10 - Extremely likely"].
     b) A follow-up reason question of type "long_text" with label "What is the primary reason for your score above?".
   - RATING SCALES / MATRIX: If the user prompt mentions "rating scales" or "ratings" or "1 to 5 scale", generate specific 1-5 rating questions (e.g., "Overall product quality", "Ease of use / Navigation", "Value for money", "Reliability & Performance", "Customer Support Service") using type "mcq" or "rating" with options ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"].
   - SATISFACTION SCALES: Include overall satisfaction questions using type "mcq" with options ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"].
   - OPEN COMMENTS: Include 1-2 open-ended feedback text fields of type "long_text" (e.g., "What feature or service improvement would make your experience better?", "Is there anything else you would like us to know?").

4. NO GENERIC FIELD FALLBACK:
   ${intent.relevanceRules.allowGenericIdentity 
     ? 'Identity fields (Full Name, Email Address, Phone Number) ARE relevant for this form type (' + intent.formType + '). Include them appropriately.'
     : 'CRITICAL RULE: Do NOT automatically add personal or identity fields like Phone Number, Address, Date of Birth, Gender, Student Full Name, or Enrollment/Roll Number UNLESS they are genuinely relevant (such as school/college admission or academic student exam forms) or explicitly requested by the user. For gaming quizzes, trivia, surveys, and skill tests, 100% of the questions MUST be topic-specific questions!'}

5. FORM TYPE & QUIZ INTELLIGENCE:
   - Form Type: "${intent.formType}"
   - Topic: "${intent.topic}"
   - Purpose: "${intent.purpose}"
   - Difficulty: "${intent.difficulty}"
   - Number of Questions to Generate: ${intent.questionCount}
   ${intent.relevanceRules.requireQuizValidation 
     ? `- THIS IS A QUIZ / MCQ EXAM ON "${intent.topic}".
     - STRICT WIDGET TYPE REQUIREMENT: Every single evaluation question MUST be of type "mcq" (Multiple Choice Question) or "checkbox" / "dropdown". DO NOT use "short_text" or "long_text" for quiz questions.
     - TOPIC RIGOR: Questions must be deep, non-trivial, highly relevant to "${intent.topic}", challenging, and tailored for a "${intent.difficulty}" skill level.
     - OPTIONS MANDATE: Every MCQ question MUST have an "options" array containing EXACTLY 4 distinct, plausible choices (1 correct answer and 3 realistic distractors).
     - EVALUATION METADATA: Every question MUST specify:
       * "correctAnswer": Exact string matching one of the 4 items in "options"
       * "points": Point value for the question (e.g. 10)
       * "difficulty": "${intent.difficulty}"
       * "explanation": Detailed step-by-step explanation of why the correct answer is right and why other options are incorrect.` 
     : '- This is a Survey / Feedback / Form. Use appropriate ratings, options, Likert scales, or text fields. Do NOT include correct answers or exam pass/fail settings.'}

6. STRUCTURED JSON OUTPUT: You MUST output valid JSON matching this schema:
{
  "understandingSummary": {
    "topic": "${intent.topic}",
    "purpose": "${intent.purpose}",
    "formType": "${intent.formType}",
    "difficulty": "${intent.difficulty}",
    "questionCount": ${intent.questionCount},
    "summaryText": "${intent.understandingSummary.summaryText}"
  },
  "title": string,
  "description": string,
  "questions": Array<{
    "type": "short_text" | "long_text" | "mcq" | "checkbox" | "dropdown" | "rating" | "file_upload" | "name" | "email" | "phone" | "price" | "agreement" | "feedback",
    "label": string,
    "required": boolean,
    "options": string[],
    "correctAnswer"?: string,
    "points"?: number,
    "explanation"?: string,
    "difficulty"?: string
  }>,
  "theme": {
    "primary_color": string,
    "background_color": string,
    "font_family": string
  },
  "settings": {
    "collect_emails": boolean,
    "limit_responses": boolean,
    "shuffle_questions": boolean,
    "timer_limit": number,
    "anti_cheat_detection": boolean
  }
}
${contextSnippet}${langInstruction}`;
}

export function isGreetingOrHelp(prompt: string): boolean {
  const clean = prompt.toLowerCase().trim();
  const greetings = ['hi', 'hello', 'hey', 'help', 'hlo', 'kem cho', 'namaste', 'kaise ho', 'what can you do', 'who are you', 'how to use'];
  return greetings.some(g => clean === g || clean.startsWith(g + ' ') || clean.endsWith(' ' + g));
}

export function translateFormConfig(formObj: any, targetLang: string): any {
  if (!formObj) return formObj;
  return {
    ...formObj,
    targetLanguage: targetLang
  };
}

