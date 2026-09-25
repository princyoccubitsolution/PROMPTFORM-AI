import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { db } from '../lib/db';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { subscriptionMiddleware } from '../middlewares/subscription';
import { parseDocument } from '../lib/documentParser';
import { getOrParseDocument } from '../lib/queue';
import { detectIntent, buildSystemInstruction, detectLanguage, detectTranslationIntent, translateFormConfig, isGreetingOrHelp, spellingRecovery } from '../lib/intentEngine';
import { AIFormBrain, ContextEngine, EnterpriseContextEngine, EnterpriseQualityReviewer, DomainDetector, EnterpriseQuizEngine } from '../lib/aiBrain';
import { generateUniqueShareId } from '../lib/utils';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const generatePromptSchema = z.object({
  prompt: z.string().min(3),
  formId: z.string().optional() // if editing / updating existing form
});

// Helper to make direct REST calls to Gemini API (supporting multimodal inputs)
async function queryGemini(
  prompt: string, 
  systemInstruction?: string, 
  fileBuffer?: Buffer | null, 
  mimeType?: string,
  isJson: boolean = true,
  history: any[] = [],
  responseSchema?: any,
  retryCount: number = 0
): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not defined.');
  }

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-pro-latest'
  ];

  const contents: any[] = [];

  // Rebuild conversation history
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  const parts: any[] = [{ text: prompt }];

  if (fileBuffer && mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: fileBuffer.toString('base64')
      }
    });
  }

  contents.push({
    role: 'user',
    parts
  });

  const payload: any = {
    contents,
    generationConfig: {
      ...(isJson ? { responseMimeType: "application/json" } : {}),
      ...(responseSchema ? { responseSchema } : {})
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [
        {
          text: systemInstruction
        }
      ]
    };
  }

  let textResponse: string | undefined;
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        let parsedErrMsg = errText;
        try {
          const parsedJson = JSON.parse(errText);
          if (parsedJson?.error?.message) {
            parsedErrMsg = parsedJson.error.message;
          }
        } catch {}
        lastError = new Error(`Gemini API error (${model} - HTTP ${res.status}): ${parsedErrMsg}`);
        if (res.status === 503 || res.status === 404 || res.status === 429) {
          console.warn(`Model ${model} returned ${res.status}, retrying with fallback model after brief delay...`);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        if (res.status === 400 && fileBuffer && parts.length > 1) {
          console.warn(`Model ${model} rejected binary inlineData with 400, retrying with text-only prompt...`);
          parts.splice(1, 1);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        throw lastError;
      }

      const data = (await res.json()) as any;
      textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        break; // Successfully got response from this model
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        lastError = new Error(`Gemini API call to ${model} timed out after 45000ms`);
      } else {
        lastError = err;
      }
    }
  }

  if (!textResponse) {
    throw lastError || new Error('Empty response or all Gemini models unavailable.');
  }

  if (!isJson) {
    return textResponse;
  }

  try {
    textResponse = textResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(textResponse);
  } catch (err: any) {
    if (retryCount < 2) {
      console.warn(`JSON Parse failed. Retrying... (${retryCount + 1}/2)`);
      const newHistory = [
        ...history,
        { role: 'user', text: prompt },
        { role: 'model', text: textResponse }
      ];
      return queryGemini(
        `You returned invalid JSON. Fix the error and return exactly valid JSON: ${err.message}`,
        systemInstruction,
        null,
        undefined,
        isJson,
        newHistory,
        responseSchema,
        retryCount + 1
      );
    }
    throw new Error(`Failed to parse Gemini response as JSON: ${err.message}`);
  }
}

async function extractThemeFromUrl(domainOrUrl: string): Promise<{ primaryColor: string; backgroundColor: string; themeName: string }> {
  const cleanDomain = domainOrUrl.replace(/https?:\/\//, "").replace(/www\./, "").split("/")[0].toLowerCase();
  
  const brandColors: Record<string, { primary: string; bg: string; name: string }> = {
    "google.com": { primary: "#4285F4", bg: "#FFFFFF", name: "Google Style" },
    "github.com": { primary: "#24292e", bg: "#0f172a", name: "GitHub Dark Style" },
    "facebook.com": { primary: "#1877F2", bg: "#F0F2F5", name: "Facebook Blue Style" },
    "netflix.com": { primary: "#E50914", bg: "#141414", name: "Netflix Dark" },
    "microsoft.com": { primary: "#00A4EF", bg: "#FFFFFF", name: "Microsoft Blue" },
    "apple.com": { primary: "#000000", bg: "#F5F5F7", name: "Apple Minimal" },
    "amazon.com": { primary: "#FF9900", bg: "#EAEDED", name: "Amazon Warm" },
    "youtube.com": { primary: "#FF0000", bg: "#F9F9F9", name: "YouTube Red" },
    "twitter.com": { primary: "#1DA1F2", bg: "#FFFFFF", name: "Twitter Style" },
    "x.com": { primary: "#000000", bg: "#0f172a", name: "X Dark" },
    "linkedin.com": { primary: "#0A66C2", bg: "#F3F2EF", name: "LinkedIn Style" },
    "instagram.com": { primary: "#E1306C", bg: "#FFFFFF", name: "Instagram Warm" },
    "spotify.com": { primary: "#1DB954", bg: "#191414", name: "Spotify Green" },
    "reddit.com": { primary: "#FF4500", bg: "#DAE0E6", name: "Reddit Orange" }
  };

  if (brandColors[cleanDomain]) {
    return {
      primaryColor: brandColors[cleanDomain].primary,
      backgroundColor: brandColors[cleanDomain].bg,
      themeName: brandColors[cleanDomain].name
    };
  }

  try {
    const targetUrl = domainOrUrl.startsWith("http") ? domainOrUrl : `https://${domainOrUrl}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      const html = await res.text();
      const hexMatches = html.match(/#(?:[0-9a-fA-F]{3,4}){1,2}\b/g);
      if (hexMatches && hexMatches.length > 0) {
        const candidates = hexMatches.filter(color => {
          const lower = color.toLowerCase();
          return lower !== "#ffffff" && lower !== "#000000" && lower !== "#fff" && lower !== "#000";
        });
        if (candidates.length > 0) {
          return {
            primaryColor: candidates[0],
            backgroundColor: "#FFFFFF",
            themeName: `${cleanDomain.split('.')[0]} Style`
          };
        }
      }
    }
  } catch (err) {
    // ignore
  }

  let hash = 0;
  for (let i = 0; i < cleanDomain.length; i++) {
    hash = cleanDomain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    primaryColor: `hsl(${hue}, 70%, 45%)`,
    backgroundColor: "#F8FAFC",
    themeName: `${cleanDomain.split('.')[0]} Palette`
  };
}

async function ultraCognitiveSemanticSifting(
  fileBuffer: Buffer | null, 
  rawInput: string, 
  mimeType: string = "application/pdf",
  originalName: string = "document",
  fileSize: number = 0
): Promise<string> {
  const documentContext = fileBuffer ? await getOrParseDocument(fileBuffer, mimeType, originalName, fileSize) : "";
  const intent = detectIntent(rawInput, documentContext);
  return buildSystemInstruction(intent, documentContext);
}

// Helper for Fallback Natural Language Parsing (No API Keys needed)
function parsePromptFallback(prompt: string) {
  const trimmed = prompt.trim();
  const lowercasePrompt = trimmed.toLowerCase();
  
  const isInappropriate = lowercasePrompt.includes("abuse") || lowercasePrompt.includes("spam") || lowercasePrompt.includes("hack") || lowercasePrompt.includes("kill") || lowercasePrompt.includes("hate");
  
  const hasKeywords = lowercasePrompt.includes("contact") || 
                      lowercasePrompt.includes("lead") || 
                      lowercasePrompt.includes("quiz") || 
                      lowercasePrompt.includes("exam") || 
                      lowercasePrompt.includes("test") || 
                      lowercasePrompt.includes("feedback") || 
                      lowercasePrompt.includes("survey") || 
                      lowercasePrompt.includes("satisfaction") || 
                      lowercasePrompt.includes("rsvp") || 
                      lowercasePrompt.includes("event") || 
                      lowercasePrompt.includes("registration") || 
                      lowercasePrompt.includes("job") || 
                      lowercasePrompt.includes("application") || 
                      lowercasePrompt.includes("career") ||
                      lowercasePrompt.includes("employee") ||
                      lowercasePrompt.includes("professional") ||
                      lowercasePrompt.includes("add") ||
                      lowercasePrompt.includes("gujarati") ||
                      lowercasePrompt.includes("surgery") ||
                      lowercasePrompt.includes("medical") ||
                      lowercasePrompt.includes("doctor") ||
                      lowercasePrompt.includes("patient") ||
                      lowercasePrompt.includes("form") ||
                      lowercasePrompt.includes("layout");

  // Attempt to parse custom fields dynamically from the prompt instruction
  const parsedFields: Array<{ type: string; label: string; required: boolean; options: string[] }> = [];
  const fieldListMatch = lowercasePrompt.match(/(?:fields|with|questions|add|insert|include|contain|need|want)\b:?\s*([^.?!]*)/);
  if (fieldListMatch && fieldListMatch[1]) {
    const listRaw = fieldListMatch[1];
    const items = listRaw.split(/,|\band\b/i).map(i => i.replace(/["'\-\*]/g, "").trim()).filter(Boolean);
    if (items.length > 0 && items.length < 15) {
      items.forEach(item => {
        let label = item.charAt(0).toUpperCase() + item.slice(1);
        let type = "short_text";
        let options: string[] = [];
        const itemLower = item.toLowerCase();
        
        if (itemLower.includes("email")) {
          type = "short_text";
          label = "Email Address";
        } else if (itemLower.includes("phone") || itemLower.includes("mobile") || itemLower.includes("contact")) {
          type = "short_text";
          label = "Phone Number";
        } else if (itemLower.includes("description") || itemLower.includes("message") || itemLower.includes("feedback") || itemLower.includes("comment") || itemLower.includes("query") || itemLower.includes("note")) {
          type = "long_text";
        } else if (itemLower.includes("rating") || itemLower.includes("satisfaction") || itemLower.includes("rate")) {
          type = "rating";
        } else if (itemLower.includes("gender")) {
          type = "mcq";
          options = ["Male", "Female", "Other"];
          label = "Gender";
        } else if (itemLower.includes("upload") || itemLower.includes("resume") || itemLower.includes("cv") || itemLower.includes("file")) {
          type = "file_upload";
        } else if (itemLower.includes("agree") || itemLower.includes("terms") || itemLower.includes("declaration")) {
          type = "checkbox";
          label = "I agree to the terms and conditions";
        } else if (itemLower.includes("signature") || itemLower.includes("sign")) {
          type = "signature";
          label = "Signature Verification";
        } else if (itemLower.includes("age") || itemLower.includes("birth") || itemLower.includes("dob")) {
          type = "short_text";
          label = "Age / Date of Birth";
        }
        
        parsedFields.push({ type, label, required: true, options });
      });
    }
  }

  if (trimmed.length < 15 || isInappropriate || (!hasKeywords && parsedFields.length === 0)) {
    return {
      title: "Feedback Questionnaire",
      description: "I couldn't detect the exact format from your description, so I've created a standard feedback form for you. Feel free to add or edit fields!",
      questions: [
        { type: "rating", label: "Overall Satisfaction", required: true, options: [] },
        { type: "short_text", label: "Full Name", required: true, options: [] },
        { type: "short_text", label: "Email Address", required: true, options: [] },
        { type: "long_text", label: "What is one thing we could improve?", required: false, options: [] }
      ],
      primaryColor: "#22C55E",
      isQuiz: false
    };
  }

  let title = "AI Generated Form";
  let description = "Automatically created by PromptForm AI";
  let questions: Array<{ type: string; label: string; required: boolean; options: string[] }> = [];
  let primaryColor = "#22C55E";
  let isQuiz = false;

  if (parsedFields.length > 0) {
    title = "Custom Generated Form";
    description = "Created automatically based on your customized fields.";
    questions = parsedFields;
  } else if (lowercasePrompt.includes("contact") || lowercasePrompt.includes("lead")) {
    title = "Contact Information Form";
    description = "Please fill in your contact details.";
    questions = [
      { type: "short_text", label: "Full Name", required: true, options: [] },
      { type: "short_text", label: "Email Address", required: true, options: [] },
      { type: "short_text", label: "Phone Number", required: false, options: [] },
      { type: "long_text", label: "Message / Comments", required: false, options: [] }
    ];
  } else if (lowercasePrompt.includes("quiz") || lowercasePrompt.includes("exam") || lowercasePrompt.includes("test") || lowercasePrompt.includes("mcq")) {
    const topicClean = prompt.replace(/\b(create|make|generate|build|a|an|the|quiz|mcq|mcqs|test|exam|for|about|with|questions|analysis|analyze|analysing|pdf|document|doc|docx|file|notes|summary|upload|uploaded|this|that|these|and|created|built)\b/gi, "").trim();
    const displayTopic = topicClean.length > 2 ? topicClean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "General Knowledge";
    title = `${displayTopic} Quiz`;
    description = `Test your comprehensive knowledge and skills on ${displayTopic}. Each question carries 10 points.`;
    isQuiz = true;

    if (lowercasePrompt.includes("js") || lowercasePrompt.includes("javascript")) {
      questions = [
        { type: "mcq", label: "What is the output of typeof null in JavaScript?", required: true, options: ["object", "null", "undefined", "number"] },
        { type: "mcq", label: "Which keyword is used to declare a block-scoped variable in ES6?", required: true, options: ["let", "var", "global", "def"] },
        { type: "mcq", label: "Which method parses a JSON string into a JavaScript object?", required: true, options: ["JSON.parse()", "JSON.stringify()", "JSON.toObject()", "JSON.decode()"] },
        { type: "mcq", label: "Which built-in array method creates a new array with all elements that pass a test?", required: true, options: ["filter()", "map()", "forEach()", "reduce()"] },
        { type: "mcq", label: "What is the primary purpose of Promise.all() in JavaScript?", required: true, options: ["Executes multiple promises concurrently and resolves when all succeed", "Executes promises sequentially", "Cancels pending promises", "Catches all unhandled errors"] }
      ];
    } else if (lowercasePrompt.includes("node")) {
      questions = [
        { type: "mcq", label: "Which core Node.js module handles file system operations?", required: true, options: ["fs", "path", "http", "stream"] },
        { type: "mcq", label: "What mechanism in Node.js handles non-blocking asynchronous I/O?", required: true, options: ["Event Loop & Libuv", "Multi-threading kernel", "Synchronous worker pool", "Child process fork"] },
        { type: "mcq", label: "Which function is used to load CommonJS modules in Node.js?", required: true, options: ["require()", "import()", "include()", "load()"] },
        { type: "mcq", label: "What is the default configuration file for dependencies in Node.js?", required: true, options: ["package.json", "node_modules.json", "config.xml", "server.js"] },
        { type: "mcq", label: "Which event listener catches unhandled promise rejections in process?", required: true, options: ["unhandledRejection", "uncaughtException", "promiseError", "asyncError"] }
      ];
    } else {
      questions = [
        { type: "mcq", label: `Q1: Which core concept is fundamental to ${displayTopic}?`, required: true, options: ["Core Standard Principle", "Secondary Alternative", "Legacy Protocol", "Experimental Draft"] },
        { type: "mcq", label: `Q2: What is the primary objective when applying ${displayTopic}?`, required: true, options: ["Maximizing Efficiency & Quality", "Bypassing Verification Steps", "Increasing Execution Delay", "Manual File Mutation"] },
        { type: "mcq", label: `Q3: Which methodology is widely considered best practice in ${displayTopic}?`, required: true, options: ["Structured Continuous Verification", "Unchecked Ad-hoc Changes", "Hardcoded Configurations", "Ignoring System Logs"] },
        { type: "mcq", label: `Q4: How should errors or edge cases be handled when dealing with ${displayTopic}?`, required: true, options: ["Explicit Validation & Defensive Error Handling", "Silent Error Suppression", "Ignoring Output Warnings", "Hard-crashing System Threads"] }
      ];
    }
  } else if (lowercasePrompt.includes("feedback") || lowercasePrompt.includes("survey") || lowercasePrompt.includes("satisfaction") || lowercasePrompt.includes("nps") || lowercasePrompt.includes("net promoter")) {
    title = "Customer Feedback Survey";
    description = "Please take a few minutes to share your thoughts. Your feedback directly helps us improve our products and services.";
    
    if (lowercasePrompt.includes("nps") || lowercasePrompt.includes("net promoter") || lowercasePrompt.includes("rating scale") || lowercasePrompt.includes("scale")) {
      questions = [
        { type: "mcq", label: "How likely are you to recommend us to a friend or colleague? (Net Promoter Score)", required: true, options: ["0 - Not at all likely", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10 - Extremely likely"] },
        { type: "long_text", label: "What is the primary reason for your score above?", required: false, options: [] },
        { type: "mcq", label: "Overall Product Quality & Performance", required: true, options: ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"] },
        { type: "mcq", label: "Ease of Use / Navigation", required: true, options: ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"] },
        { type: "mcq", label: "Value for Money", required: true, options: ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"] },
        { type: "mcq", label: "Customer Support & Responsiveness", required: true, options: ["1 - Strongly Disagree", "2 - Disagree", "3 - Neutral", "4 - Agree", "5 - Strongly Agree"] },
        { type: "mcq", label: "Overall, how satisfied are you with your experience?", required: true, options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"] },
        { type: "long_text", label: "What feature or service improvement would make your experience significantly better?", required: false, options: [] },
        { type: "long_text", label: "Is there anything else you would like us to know?", required: false, options: [] }
      ];
    } else {
      questions = [
        { type: "rating", label: "Overall Satisfaction", required: true, options: [] },
        { type: "mcq", label: "How often do you use our product?", required: true, options: ["Daily", "Weekly", "Monthly", "Rarely"] },
        { type: "checkbox", label: "What features do you use most? (Select all)", required: false, options: ["AI Form Builder", "Real-time Analytics", "Slack Integrations", "Export Features"] },
        { type: "long_text", label: "What is one thing we could improve?", required: false, options: [] }
      ];
    }
  } else if (lowercasePrompt.includes("rsvp") || lowercasePrompt.includes("event")) {
    title = "Event RSVP Invitation";
    description = "Confirm your attendance for our upcoming conference.";
    questions = [
      { type: "mcq", label: "Will you be attending?", required: true, options: ["Yes, I will be there", "No, I cannot attend", "Maybe"] },
      { type: "short_text", label: "Dietary Restrictions", required: false, options: [] },
      { type: "mcq", label: "Need parking assistance?", required: false, options: ["Yes", "No"] }
    ];
  } else if (lowercasePrompt.includes("job") || lowercasePrompt.includes("application") || lowercasePrompt.includes("career")) {
    title = "Job Application Portal";
    description = "Submit your resume and contact details to apply for roles.";
    questions = [
      { type: "short_text", label: "Full Name", required: true, options: [] },
      { type: "short_text", label: "Email Address", required: true, options: [] },
      { type: "dropdown", label: "Role applied for", required: true, options: ["Backend Engineer", "Frontend Developer", "Product Manager", "UI/UX Designer"] },
      { type: "file_upload", label: "Upload Resume (PDF only)", required: true, options: [] },
      { type: "long_text", label: "Cover Letter / Notes", required: false, options: [] }
    ];
  } else if (lowercasePrompt.includes("surgery") || lowercasePrompt.includes("medical") || lowercasePrompt.includes("doctor") || lowercasePrompt.includes("patient")) {
    title = "Medical & Surgery Intake Form";
    description = "Please provide medical history details.";
    questions = [
      { type: "short_text", label: "Patient Full Name", required: true, options: [] },
      { type: "short_text", label: "Date of Birth", required: true, options: [] },
      { type: "long_text", label: "Brief Medical History & Symptoms", required: true, options: [] },
      { type: "mcq", label: "Have you had surgery in the past 12 months?", required: true, options: ["Yes", "No"] }
    ];
  } else {
    title = "AI Prompt Form";
    description = "Created automatically based on your prompt.";
    questions = [
      { type: "short_text", label: "Full Name", required: true, options: [] },
      { type: "short_text", label: "Email Address", required: true, options: [] },
      { type: "long_text", label: "Your Query", required: true, options: [] }
    ];
  }

  return {
    title,
    description,
    questions,
    primaryColor,
    isQuiz,
    error: undefined
  };
}

// Fallback logic to modify questions lists
function modifyFormFallback(form: any, prompt: string) {
  const lowercasePrompt = prompt.trim().toLowerCase();
  let title = form.title;
  let description = form.description;
  let questions = [...form.questions];
  let theme = form.theme || { primary_color: "#22C55E", background_color: "#F8FFFA", font_family: "Inter" };
  let settings = form.settings || { collect_emails: true, limit_responses: false, timer_limit: 0, anti_cheat_detection: false };

  const isRemoveBanner = /((remove|delete|hide|drop)\s+(the\s+)?(banner|image|photo|header|picture)s?(\s+section)?|(banner|image|photo|header|picture)s?(\s+section)?\s+(remove|delete|hide|drop))/i.test(lowercasePrompt);
  if (isRemoveBanner && theme) {
    theme.banner_url = null;
  }

  if (lowercasePrompt.includes("add") || lowercasePrompt.includes("insert")) {
    questions.push({
      id: `q_temp_${Date.now()}`,
      type: "short_text",
      label: "Additional Information Query",
      required: false,
      options: []
    });
  } else if (lowercasePrompt.includes("gujarati") || lowercasePrompt.includes("translate")) {
    const dictionary: Record<string, string> = {
      "full name": "પૂરું નામ",
      "name": "નામ",
      "email": "ઈમેલ સરનામું",
      "email address": "ઈમેલ સરનામું",
      "phone": "ફોન નંબર",
      "phone number": "ફોન નંબર",
      "message": "સંદેશ",
      "comments": "ટિપ્પણીઓ",
      "feedback": "પ્રતિસાદ",
      "satisfaction": "સંતોષ",
      "rating": "રેટિંગ",
      "yes": "હા",
      "no": "ના",
      "option 1": "વિકલ્પ ૧",
      "option 2": "વિકલ્પ ૨",
      "option 3": "વિકલ્પ ૩",
      "option 4": "વિકલ્પ ૪",
      "course": "કોર્સ",
      "evaluation": "મૂલ્યાંકન",
      "submit": "સબમિટ કરો",
      "untitled form": "શીર્ષક વગરનું ફોર્મ"
    };

    title = "ગુજરાતી પ્રતિસાદ ફોર્મ";
    description = "કૃપા કરીને આ ફોર્મ ભરો.";

    questions = questions.map((q: any) => {
      const lowerLabel = q.label.toLowerCase();
      let translatedLabel = q.label;
      
      for (const [key, val] of Object.entries(dictionary)) {
        if (lowerLabel.includes(key)) {
          translatedLabel = val;
          break;
        }
      }

      const translatedOptions = (q.options || []).map((opt: string) => {
        const lowerOpt = opt.toLowerCase();
        return dictionary[lowerOpt] || opt;
      });

      return {
        ...q,
        label: translatedLabel,
        options: translatedOptions
      };
    });
  } else if (lowercasePrompt.includes("short") || lowercasePrompt.includes("shorter")) {
    questions = questions.map((q: any) => {
      let shortLabel = q.label;
      if (q.label.includes("?")) {
        shortLabel = q.label.split("?")[0].replace("What is your ", "").replace("Please enter your ", "");
      }
      return { ...q, label: shortLabel.trim() };
    });
  } else if (lowercasePrompt.includes("professional")) {
    theme = {
      primary_color: "#15803D",
      background_color: "#F8FFFA",
      font_family: "Inter",
      logo_url: null
    };
    title = "Professional Engagement Survey";
  } else if (lowercasePrompt.includes("employee")) {
    title = "Employee Engagement & Feedback Form";
    description = "Internal review form to log employee workplace feedback.";
    theme.primary_color = "#22C55E";
    questions = [
      { type: "short_text", label: "Employee Name", required: true, options: [] },
      { type: "dropdown", label: "Department", required: true, options: ["Engineering", "Product", "Sales", "HR"] },
      { type: "rating", label: "Rate your team alignment and culture:", required: true, options: [] },
      { type: "long_text", label: "What is your primary goal for this quarter?", required: true, options: [] }
    ];
  } else {
    const parsed = parsePromptFallback(prompt);
    title = parsed.title;
    description = parsed.description;
    questions = parsed.questions;
    theme.primary_color = parsed.primaryColor;
  }

  return { title, description, questions, theme, settings };
}

// Fallback logic for Collective Sentiment
function runSentimentFallback(responses: any[]) {
  let totalPositive = 0;
  let totalNeutral = 0;
  let totalNegative = 0;

  const positiveKeywords = ["good", "great", "excellent", "love", "amazing", "happy", "yes", "helpful", "fast", "best", "perfect"];
  const negativeKeywords = ["bad", "poor", "slow", "hard", "difficult", "unhappy", "no", "hate", "worst", "bug", "broken", "fail"];

  responses.forEach(resp => {
    let textContent = JSON.stringify(resp.answers).toLowerCase();
    let posCount = 0;
    let negCount = 0;

    positiveKeywords.forEach(word => {
      if (textContent.includes(word)) posCount++;
    });

    negativeKeywords.forEach(word => {
      if (textContent.includes(word)) negCount++;
    });

    if (posCount > negCount) {
      totalPositive++;
    } else if (negCount > posCount) {
      totalNegative++;
    } else {
      totalNeutral++;
    }
  });

  const totalSubmissions = responses.length;
  const averageScore = totalSubmissions > 0 
    ? Number(((totalPositive * 1 + totalNeutral * 0.5) / totalSubmissions).toFixed(2)) 
    : 0.5;

  return {
    average_score: averageScore,
    sentiment_distribution: {
      positive: totalPositive,
      neutral: totalNeutral,
      negative: totalNegative
    }
  };
}

// Fallback logic for Individual Response takaways
function runResponseFallback(answers: any) {
  const textData = JSON.stringify(answers).toLowerCase();
  let sentiment = "Neutral ⚖️";
  let summary = "The responder completed the questionnaire with standard inputs.";
  let highlights = [
    "No critical proctor warnings logged during submission.",
    "Answers provided for all required question fields."
  ];
  let recommendations = [
    "Send a standard follow-up thank you email notification.",
    "Check candidate portfolio attachments if applicable."
  ];

  if (textData.includes("worst") || textData.includes("bad") || textData.includes("bug") || textData.includes("fail")) {
    sentiment = "Negative Skew ⚠️";
    summary = "Respondent expressed dissatisfaction or noted system performance issues.";
    highlights.push("User explicitly highlighted performance defects or issues.");
    recommendations.unshift("Escalate this feedback to the engineering or support team immediately.");
  } else if (textData.includes("great") || textData.includes("love") || textData.includes("excellent") || textData.includes("perfect")) {
    sentiment = "Highly Positive 🎉";
    summary = "Respondent expressed extreme satisfaction and appreciation.";
    highlights.push("Highly positive response and praise detected.");
    recommendations.unshift("Add this candidate/user to the premium satisfaction outreach cohort.");
  }

  return { sentiment, summary, highlights, recommendations };
}

// POST: /ai/generate & /ai/generate-from-file
router.post(['/generate', '/generate-from-file'], optionalAuthMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const mimeType = req.file ? req.file.mimetype : "application/pdf";
    const userPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    const formId = req.body?.formId;
    const isImage = req.file && req.file.mimetype.startsWith('image/');

    const trimmedUserPrompt = userPrompt.trim().toLowerCase();
    if (!fileBuffer && (trimmedUserPrompt.length < 3 || trimmedUserPrompt === 'review form' || trimmedUserPrompt === 'test form')) {
      return res.status(200).json({
        status: 'suggest',
        suggestions: ["Product Review Form", "Employee Performance Review", "Customer Feedback Form"]
      });
    }

    if (req.user) {
      const user = await db.user.findUnique({ where: { id: req.user.id } });
      if (user && user.credits < 5) {
        return res.status(403).json({ error: 'Insufficient credits. AI generation requires at least 5 credits.' });
      }
    }

    let formConfig;
    let parsedDocText = "";
    if (fileBuffer) {
      parsedDocText = await getOrParseDocument(
        fileBuffer, 
        mimeType, 
        req.file?.originalname || 'document', 
        req.file?.size || 0
      );
    }

    const intent = detectIntent(userPrompt, parsedDocText);
    let systemInstruction = "";

    if (fileBuffer) {
      if (!isImage) {
        systemInstruction = await ultraCognitiveSemanticSifting(
          fileBuffer, 
          userPrompt, 
          mimeType, 
          req.file?.originalname || 'document', 
          req.file?.size || 0
        );
      } else {
        systemInstruction = buildSystemInstruction(intent, parsedDocText);
      }
    } else {
      systemInstruction = buildSystemInstruction(intent, "");
    }

    const isTestMock = req.headers['x-qa-test-mock'] === 'true' || process.env.NODE_ENV === 'test';

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      console.warn("GEMINI_API_KEY is not defined. Falling back to local AIFormBrain engine.");
      if (formId) {
        const existingForm = await db.form.findUnique({
          where: { id: formId },
          include: { questions: { orderBy: { orderIndex: 'asc' } } }
        });
        if (!existingForm) return res.status(404).json({ error: 'Form not found' });
        const followUpResult = AIFormBrain.processFollowUp(userPrompt, existingForm, { rawPrompt: userPrompt, normalizedPrompt: userPrompt.trim().toLowerCase(), isGreeting: false, isTranslation: false, targetLang: "english", isRtl: false });
        formConfig = followUpResult.formConfig;
      } else {
        const brainResult = AIFormBrain.process(userPrompt, parsedDocText);
        formConfig = brainResult.formConfig;
      }
    } else {
      try {
        if (formId) {
          const existingForm = await db.form.findUnique({
            where: { id: formId },
            include: { questions: { orderBy: { orderIndex: 'asc' } } }
          });
          if (!existingForm) return res.status(404).json({ error: 'Form not found' });
          
          if (req.user && existingForm.ownerId !== req.user.id) {
            if (existingForm.teamId) {
              const membership = await db.teamMember.findUnique({
                where: { teamId_userId: { teamId: existingForm.teamId, userId: req.user.id } }
              });
              if (!membership || (membership.role !== 'admin' && membership.role !== 'editor')) {
                return res.status(403).json({ error: 'Forbidden. You do not have permission to modify this form.' });
              }
            } else {
              return res.status(403).json({ error: 'Forbidden. Form is not yours.' });
            }
          }

          const modelPrompt = `Here is the existing form: ${JSON.stringify(existingForm)}. Please modify it based on these user instructions: "${userPrompt}". Maintain topic context "${intent.topic}" and modify questions in-place.`;
          formConfig = await queryGemini(modelPrompt, systemInstruction, fileBuffer, mimeType);
        } else {
          const isQuizIntent = intent.relevanceRules.requireQuizValidation;
          const docSnippet = parsedDocText ? `\nExtracted Document Content:\n"""\n${parsedDocText.substring(0, 10000)}\n"""` : '';
          const modelPrompt = fileBuffer
            ? `Extract and generate a complete topic-specific form or quiz paper based on this uploaded document/image and instructions: "${userPrompt || 'Extract all questions and fields from document'}". ${docSnippet} ${isQuizIntent ? 'CRITICAL: This is an assignment/exam/quiz. Extract EVERY single question as an interactive multiple-choice question (mcq) with 4 options, the exact correctAnswer string, points, and an explanation.' : 'Generate appropriate topic-specific fields matching the document.'}`
            : `Analyze the topic "${intent.topic}" for user prompt: "${userPrompt}". Perform a deep factual domain analysis of "${intent.topic}" using world knowledge (video games, esports, sports, movies, science, pop culture, history, technology, medicine, general trivia, etc.). Generate a factually 100% accurate, high-quality, topic-authentic ${intent.formType} with ${intent.questionCount} questions.`;
          formConfig = await queryGemini(modelPrompt, systemInstruction, fileBuffer, mimeType);
        }
      } catch (geminiError: any) {
        console.warn("Gemini API call failed (HTTP 503 / 429 / 403 / timeout). Seamlessly falling back to PromptForm AI Brain engine:", geminiError?.message);
        if (formId) {
          const existingForm = await db.form.findUnique({
            where: { id: formId },
            include: { questions: { orderBy: { orderIndex: 'asc' } } }
          });
          if (!existingForm) return res.status(404).json({ error: 'Form not found' });
          const followUpResult = AIFormBrain.processFollowUp(userPrompt, existingForm, { rawPrompt: userPrompt, normalizedPrompt: userPrompt.trim().toLowerCase(), isGreeting: false, isTranslation: false, targetLang: "english", isRtl: false });
          formConfig = followUpResult.formConfig;
        } else {
          const brainResult = AIFormBrain.process(userPrompt, parsedDocText);
          formConfig = brainResult.formConfig;
        }
      }
    }
    if (!formConfig) {
      return res.status(500).json({ error: "Failed to generate form configuration. Please try again." });
    }
    if (!formConfig.understandingSummary) {
      formConfig.understandingSummary = intent.understandingSummary;
    }
    formConfig = EnterpriseQualityReviewer.reviewAndImprove(formConfig);

    let form: any;
    if (formId) {
      form = await db.form.update({
        where: { id: formId },
        data: {
          title: formConfig.title,
          description: formConfig.description,
          settings: formConfig.settings,
          theme: formConfig.theme
        }
      });
      await db.question.deleteMany({ where: { formId } });
      await db.question.createMany({
        data: formConfig.questions.map((q: any, idx: number) => ({
          formId: formId,
          type: q.type,
          label: q.label,
          required: q.required || false,
          orderIndex: idx,
          options: q.options || [],
          validations: {
            ...(q.validations || {}),
            points: q.points !== undefined ? Number(q.points) : (q.validations?.points !== undefined ? Number(q.validations.points) : 5),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            negativePoints: q.negativePoints,
            bloomsTaxonomy: q.bloomsTaxonomy,
            accessibilityLabel: q.accessibilityLabel
          },
          logic: q.logic || {}
        }))
      });
    } else {
      const shareCode = await generateUniqueShareId();
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:4500';
      const publicUrl = `${frontendBaseUrl}/f/${shareCode}`;

      if (req.user) {
        form = await db.form.create({
          data: {
            title: formConfig.title,
            description: formConfig.description,
            status: "PUBLISHED",
            uniqueShareId: shareCode,
            publicUrl: publicUrl,
            isPublic: true,
            ownerId: req.user.id,
            settings: formConfig.settings,
            theme: formConfig.theme
          }
        });

        await db.question.createMany({
          data: formConfig.questions.map((q: any, idx: number) => ({
            formId: form.id,
            type: q.type,
            label: q.label,
            required: q.required || false,
            orderIndex: idx,
            options: q.options || [],
            validations: {
              ...(q.validations || {}),
              points: q.points !== undefined ? Number(q.points) : (q.validations?.points !== undefined ? Number(q.validations.points) : 5),
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: q.difficulty,
              negativePoints: q.negativePoints,
              bloomsTaxonomy: q.bloomsTaxonomy,
              accessibilityLabel: q.accessibilityLabel
            },
            logic: q.logic || {}
          }))
        });

        await db.analytics.create({
          data: {
            formId: form.id,
            views: 0,
            submissions: 0,
            deviceStats: { desktop: 0, mobile: 0, tablet: 0 },
            countryStats: {},
            dropoutRates: {}
          }
        });
      } else {
        // Preview form object for guests
        form = {
          id: `gen-${Date.now()}`,
          title: formConfig.title,
          description: formConfig.description,
          status: "PUBLISHED",
          uniqueShareId: shareCode,
          publicUrl: publicUrl,
          isPublic: true,
          settings: formConfig.settings,
          theme: formConfig.theme,
          questions: formConfig.questions.map((q: any, idx: number) => ({
            id: `q_${idx}`,
            type: q.type,
            label: q.label,
            required: q.required || false,
            orderIndex: idx,
            options: q.options || [],
            validations: {
              ...(q.validations || {}),
              points: q.points !== undefined ? Number(q.points) : 5,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation
            }
          }))
        };
      }
    }

    if (req.user) {
      await db.user.update({
        where: { id: req.user.id },
        data: { credits: { decrement: 5 } }
      }).catch(() => {});
    }

    let fullForm = form;
    if (req.user && form.id && !form.id.startsWith('gen-')) {
      fullForm = await db.form.findUnique({
        where: { id: form.id },
        include: { questions: { orderBy: { orderIndex: 'asc' } } }
      });
    }

    return res.json({
      message: "Form generated successfully using PromptForm AI engine.",
      understandingSummary: formConfig.understandingSummary || intent.understandingSummary,
      form: fullForm
    });
  } catch (error: any) {
    console.error('[AI Generate Route Error]:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// POST: /ai/analyze-sentiment
router.post('/analyze-sentiment', authMiddleware, subscriptionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { formId } = req.body;
    if (!formId) {
      return res.status(400).json({ error: 'formId is required' });
    }
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId);
    if (!isUUID) {
      return res.status(400).json({ error: 'Invalid formId format. Must be a valid UUID.' });
    }

    const form = await db.form.findUnique({ where: { id: formId } });
    if (!form) return res.status(404).json({ error: 'Form not found' });
    
    if (form.ownerId !== req.user.id) {
      if (form.teamId) {
        const membership = await db.teamMember.findUnique({
          where: { teamId_userId: { teamId: form.teamId, userId: req.user.id } }
        });
        if (!membership) {
          return res.status(403).json({ error: 'Forbidden. You do not have access to this form\'s analytics.' });
        }
      } else {
        return res.status(403).json({ error: 'Forbidden. Form is not yours.' });
      }
    }

    const responses = await db.response.findMany({
      where: { formId }
    });

    let sentimentSummary;
    if (process.env.GEMINI_API_KEY && responses.length > 0) {
      try {
        const systemInstruction = `You are an AI sentiment analyst. Given a list of form responses, analyze the collective sentiment and return a JSON object with this exact structure:
{
  "average_score": number, // float between 0 (negative) and 1 (positive)
  "sentiment_distribution": {
    "positive": number, // count
    "neutral": number, // count
    "negative": number // count
  }
}
The sum of positive, neutral, and negative counts must equal the total number of responses analyzed.`;
        const modelPrompt = `Analyze the sentiment of these responses for the form "${form.title}": ${JSON.stringify(responses.map((r: any) => r.answers))}`;
        sentimentSummary = await queryGemini(modelPrompt, systemInstruction);
      } catch (geminiError) {
        sentimentSummary = runSentimentFallback(responses);
      }
    } else {
      sentimentSummary = runSentimentFallback(responses);
    }

    await db.analytics.updateMany({
      where: { formId },
      data: {
        sentimentSummary: sentimentSummary
      }
    });

    return res.json({
      message: "Sentiment analysis compiled successfully.",
      sentimentSummary
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: /ai/analyze-response
router.post('/analyze-response', authMiddleware, subscriptionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { responseId } = req.body;
    if (!responseId) {
      return res.status(400).json({ error: 'responseId is required' });
    }
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(responseId);
    if (!isUUID) {
      return res.status(400).json({ error: 'Invalid responseId format. Must be a valid UUID.' });
    }

    const response = await db.response.findUnique({
      where: { id: responseId },
      include: { form: true }
    });

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    const parentForm = response.form;
    if (parentForm.ownerId !== req.user.id) {
      if (parentForm.teamId) {
        const membership = await db.teamMember.findUnique({
          where: { teamId_userId: { teamId: parentForm.teamId, userId: req.user.id } }
        });
        if (!membership) {
          return res.status(403).json({ error: 'Forbidden. You do not have access to this form\'s responses.' });
        }
      } else {
        return res.status(403).json({ error: 'Forbidden. Form is not yours.' });
      }
    }

    let analysis;
    if (process.env.GEMINI_API_KEY) {
      try {
        const systemInstruction = `You are an AI assistant analyzing a single form response. Return a JSON object with this exact structure:
{
  "sentiment": string, // Short label like "Highly Positive 🎉", "Neutral ⚖️", "Negative Skew ⚠️"
  "summary": string, // One-sentence summary of the response
  "highlights": string[], // 2-3 key takeaways
  "recommendations": string[] // 2-3 action items
}`;
        const modelPrompt = `Analyze this response for the form "${parentForm.title}": ${JSON.stringify(response.answers)}`;
        analysis = await queryGemini(modelPrompt, systemInstruction);
      } catch (geminiError) {
        analysis = runResponseFallback(response.answers);
      }
    } else {
      analysis = runResponseFallback(response.answers);
    }

    return res.json({
      message: "AI individual response review compiled.",
      analysis
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function isBriefOrVague(text: string): boolean {
  const clean = text.trim();
  return clean.length < 50;
}

function isConfirmation(text: string): boolean {
  const clean = text.toLowerCase().trim();
  const confirmPhrases = [
    "હા ભાઈ", "બનાવી દે", "final kar", "yes", "perfect", "chalu kar", "go ahead", 
    "build it", "create it", "make it", "sure", "proceed", "ha", "banao", "banay de", 
    "bnai de", "banavo", "karo", "done", "ok", "okay", "have apo", "have aapo", 
    "have banao", "હવે આપો", "હવે બનાવો", "aplo", "aapo", "have", "generate it", "generate"
  ];
  return confirmPhrases.some(p => clean.includes(p)) || /^(yes|y|ok|okay|ha|done|have)$/i.test(clean);
}

function getClarificationAndPills(prompt: string): { text: string; pills: string[][] } {
  const text = prompt.toLowerCase();
  
  let acknowledge = 'I understand you want to create a form.';
  let q1 = 'Who is the main target audience for this form?';
  let q2 = 'What specific fields or questions would you like to include?';
  let pills = [["Customer Satisfaction", "Bug Report Form", "Feature Request"]];

  if (text.includes("hospital") || text.includes("medical") || text.includes("doctor") || text.includes("patient") || text.includes("pain") || text.includes("સર્જરી") || text.includes("તબીબી")) {
    acknowledge = 'I understand you want to create a medical or hospital-related form.';
    q1 = 'Do you need a visual pain map (body pain selector) for patients to point out pain areas?';
    q2 = 'Would you like to include patient insurance details and medical history fields?';
    pills = [["Patient Intake Form", "Doctor Feedback Survey", "Appointment Booking"]];
  } else if (text.includes("school") || text.includes("college") || text.includes("admission") || text.includes("clg") || text.includes("education") || text.includes("student") || text.includes("શાળા") || text.includes("કોલેજ")) {
    acknowledge = 'I understand you want to create an educational admission or registration form.';
    q1 = 'Should we include file upload slots for marksheets and school leaving certificates (LC)?';
    q2 = 'Do you require a passport photo uploader and parent contact details?';
    pills = [["Admission & LC Upload", "Course/Stream Selection", "Teacher Evaluation"]];
  } else if (text.includes("tech") || text.includes("science") || text.includes("antigravity") || text.includes("aerospace") || text.includes("engineering") || text.includes("research") || text.includes("lab")) {
    acknowledge = 'I understand you want to create a technical research or aerospace/antigravity form.';
    q1 = 'Do you need file upload fields for uploading blueprints/schematics and numeric parameter inputs?';
    q2 = 'Should we enforce secure researcher credentials and safety checklists?';
    pills = [["Research Grant Application", "Lab Experiment Log", "Safety Checklist"]];
  } else if (text.includes("restaurant") || text.includes("food") || text.includes("meal") || text.includes("hotel") || text.includes("stay") || text.includes("room") || text.includes("ખાવાનું") || text.includes("હોટેલ")) {
    acknowledge = 'I understand you want to create a restaurant feedback or hospitality review form.';
    q1 = 'Would you like to include an interactive emoji satisfaction scale to minimize friction?';
    q2 = 'Should we ask about food quality, service rating, and cleanliness?';
    pills = [["Quick Food Review", "Table Reservation", "Staff & Service Rating"]];
  } else if (text.includes("review") || text.includes("feedback") || text.includes("survey") || text.includes("સર્વે") || text.includes("અભિપ્રાય")) {
    acknowledge = 'I understand you want to create a feedback or survey form.';
    q1 = 'What is the primary goal of this feedback survey?';
    q2 = 'Would you like to collect contact information, or keep it completely anonymous?';
    pills = [["Customer Satisfaction", "Bug Report Form", "Feature Request"]];
  } else if (text.includes("gym") || text.includes("workout") || text.includes("fitness")) {
    acknowledge = 'I understand you want to create a gym or fitness registration/tracker form.';
    q1 = 'Would you like to track daily exercises and weight/reps parameters?';
    q2 = 'Should we include fields for emergency contact and medical liability waivers?';
    pills = [["Gym Registration", "Daily Workout Log", "Client Assessment"]];
  } else {
    acknowledge = `I understand you want to create a form for "${prompt}".`;
    q1 = 'What are the top 3 key fields you need to collect in this form?';
    q2 = 'Should this form be structured as a step-by-step wizard or a compact grid?';
    pills = [["Standard Contact Form", "User Registration", "Feedback Form"]];
  }

  const hasGujarati = /[\u0A80-\u0AFF]/.test(prompt) || text.includes("gujarati") || text.includes("બનાવ") || text.includes("ભાઈ");
  if (hasGujarati) {
    if (text.includes("hospital") || text.includes("medical") || text.includes("patient")) {
      acknowledge = 'હું સમજી ગયો કે તમે હોસ્પિટલ અથવા દર્દી નોંધણી માટેનું ફોર્મ બનાવવા માંગો છો.';
      q1 = '૧. શું દર્દીઓ માટે બોડી પેઇન સિલેક્ટર (pain map) રાખવું છે?';
      q2 = '૨. શું ઇન્સ્યોરન્સ અને મેડિકલ હિસ્ટ્રીના પ્રશ્નો ઉમેરવા છે?';
    } else if (text.includes("school") || text.includes("college") || text.includes("admission") || text.includes("clg")) {
      acknowledge = 'હું સમજી ગયો કે તમે શાળા/કોલેજ એડમિશન અથવા રજીસ્ટ્રેશન ફોર્મ બનાવવા માંગો છો.';
      q1 = '૧. શું માર્કશીટ અને લિવિંગ સર્ટિફિકેટ (LC) અપલોડ કરવાનો ઓપ્શન રાખવો છે?';
      q2 = '૨. શું પાસપોર્ટ ફોટો અપલોડર અને વાલીના સંપર્કની વિગત ઉમેરવી છે?';
    } else if (text.includes("tech") || text.includes("science") || text.includes("antigravity")) {
      acknowledge = 'હું સમજી ગયો કે તમે ટેકનિકલ રિસર્ચ અથવા એરોસ્પેસ/એન્ટીગ્રેવિટી માટેનું ફોર્મ બનાવવા માંગો છો.';
      q1 = '૧. શું બ્લુપ્રિન્ટ અને ન્યુમેરિકલ પેરામીટર ઇનપુટ ઉમેરવા છે?';
      q2 = '૨. શું સુરક્ષિત સંશોધક પ્રમાણપત્ર (research credentials) ફરજિયાત રાખવા છે?';
    } else if (text.includes("restaurant") || text.includes("food") || text.includes("meal")) {
      acknowledge = 'હું સમજી ગયો કે તમે રેસ્ટોરન્ટ અથવા હોટેલ રિવ્યૂ માટેનું ફોર્મ બનાવવા માંગો છો.';
      q1 = '૧. શું ઈમોજી સંતોષ સ્કેલ (emoji satisfaction scale) ઉમેરવો છે?';
      q2 = '૨. શું ફૂડ ક્વોલિટી અને સ્ટાફ સર્વિસ વિશે પૂછવું છે?';
    } else {
      acknowledge = 'હું સમજી ગયો કે તમે ફોર્મ અથવા સર્વે બનાવવા માંગો છો.';
      q1 = '૧. આ ફોર્મનો મુખ્ય હેતુ શું છે?';
      q2 = '૨. શું આ ફોર્મમાં ઇમેઇલ એડ્રેસ કલેક્ટ કરવું છે કે એનોનિમસ રાખવું છે?';
    }
  }

  const responseText = `${acknowledge}\n\nTo help me build the perfect form for you, please answer these 2 questions:\n${q1}\n${q2}\n\nOr click one of the suggestions below to build it instantly!`;
  
  return { text: responseText, pills };
}

async function getDynamicClarification(prompt: string): Promise<{ text: string; pills: string[][] }> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const systemInstruction = `You are the Ultimate Universal AI Form Architect and Senior UI/UX Designer for "PromptForm AI". The user has provided a request: "${prompt}".
Acknowledge their topic with high industry intelligence in either Gujarati or English depending on their input language flavor (English, Gujarati, Hinglish).
Ask exactly 2 highly relevant, smart, domain-specific questions to clarify their requirements or suggest design ideas.
At the absolute end of your response, you MUST append a structured JSON block array of exactly 3 highly relevant action buttons (suggestion pills) based on their topic.
Format Required at the end: [["Option 1", "Option 2", "Option 3"]]
Do NOT output any JSON configuration schema. Only output your text response and the JSON pills array at the end.`;
      
      const reply = await queryGemini(`User prompt: "${prompt}"`, systemInstruction, null, undefined, false);
      
      let cleanText = reply;
      let pills: string[][] = [["Standard Contact Form", "User Registration", "Feedback Form"]];
      
      const startBracket = reply.indexOf("[[");
      const endBracket = reply.lastIndexOf("]]");
      if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
        const jsonText = reply.substring(startBracket, endBracket + 2);
        try {
          const normalizedJson = jsonText.replace(/'/g, '"');
          const parsed = JSON.parse(normalizedJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            pills = Array.isArray(parsed[0]) ? parsed : [parsed];
            cleanText = reply.replace(jsonText, "").trim();
          }
        } catch (e) {
          const strings = jsonText.match(/"([^"]+)"|'([^']+)'/g);
          if (strings && strings.length > 0) {
            const cleanedStrings = strings.map((s: string) => s.replace(/['"]/g, "").trim());
            pills = [cleanedStrings];
            cleanText = reply.replace(jsonText, "").trim();
          }
        }
      } else {
        // Fallback: match any flat array of options [ "A", "B", "C" ]
        const singleStart = reply.indexOf("[");
        const singleEnd = reply.lastIndexOf("]");
        if (singleStart !== -1 && singleEnd !== -1 && singleEnd > singleStart) {
          const jsonText = reply.substring(singleStart, singleEnd + 1);
          try {
            const normalizedJson = jsonText.replace(/'/g, '"');
            const parsed = JSON.parse(normalizedJson);
            if (Array.isArray(parsed)) {
              pills = [parsed];
              cleanText = reply.replace(jsonText, "").trim();
            }
          } catch (e) {
            const strings = jsonText.match(/"([^"]+)"|'([^']+)'/g);
            if (strings && strings.length > 0) {
              const cleanedStrings = strings.map((s: string) => s.replace(/['"]/g, "").trim());
              pills = [cleanedStrings];
              cleanText = reply.replace(jsonText, "").trim();
            }
          }
        }
      }
      
      // Clean up markdown blocks from response text if left
      cleanText = cleanText.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      return { text: cleanText, pills };
    } catch (e) {
      // Fallback
    }
  }
  return getClarificationAndPills(prompt);
}

function getBannerUrlForDomain(domain: string, promptText: string): string {
  const text = promptText.toLowerCase();
  if (text.includes("travel") || text.includes("flight") || text.includes("trip") || text.includes("tour") || text.includes("tourism") || text.includes("vacation")) {
    return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("hotel") || text.includes("room") || text.includes("stay") || text.includes("hostel")) {
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("car") || text.includes("rent") || text.includes("vehicle") || text.includes("auto")) {
    return "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("restaurant") || text.includes("food") || text.includes("meal") || text.includes("cafe") || text.includes("dining")) {
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";
  }
  if (domain === 'medical' || text.includes("hospital") || text.includes("medical") || text.includes("patient") || text.includes("clinic") || text.includes("doctor")) {
    return "https://images.unsplash.com/photo-1584515901107-d1796d34557c?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("school") || text.includes("college") || text.includes("admission") || text.includes("education") || text.includes("student")) {
    return "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("tech") || text.includes("science") || text.includes("engineering") || text.includes("research") || text.includes("lab") || text.includes("software")) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("job") || text.includes("career") || text.includes("hiring") || text.includes("resume") || text.includes("interview")) {
    return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80";
  }
  if (domain === 'quiz' || text.includes("exam") || text.includes("test") || text.includes("assessment")) {
    return "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("gym") || text.includes("workout") || text.includes("fitness") || text.includes("exercise") || text.includes("training")) {
    return "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("property") || text.includes("real estate") || text.includes("house") || text.includes("apartment") || text.includes("flat")) {
    return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("donate") || text.includes("charity") || text.includes("donation") || text.includes("ngo")) {
    return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80";
  }
  if (text.includes("booking") || text.includes("reservation") || domain === 'rsvp') {
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
  }
  return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80";
}

// POST: /ai/chat-stream (Streaming AI Assistant generation with SSE)
router.post('/chat-stream', authMiddleware, subscriptionMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    if (!req.user) {
      res.write(`data: ${JSON.stringify({ error: "Unauthorized" })}\n\n`);
      return res.end();
    }

    const user = await db.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.credits < 5) {
      res.write(`data: ${JSON.stringify({ error: "Insufficient credits. AI generation requires at least 5 credits." })}\n\n`);
      return res.end();
    }

    let rawPrompt = req.body?.prompt || "";
    // Clean and recover common spelling typos (like 'from' -> 'form') to prevent model hallucination/confusion
    rawPrompt = spellingRecovery(rawPrompt);
    const formId = req.body?.formId;
    const sessionId = req.body?.sessionId;
    const autoBuildMode = req.body?.autoBuildMode === true;
    const fileBuffer = req.file ? req.file.buffer : null;
    const mimeType = req.file ? req.file.mimetype : "application/pdf";
    const isImage = req.file && req.file.mimetype.startsWith('image/');

    if (!rawPrompt.trim() && fileBuffer) {
      rawPrompt = `Generate a form based on the uploaded file structure: ${req.file?.originalname || 'document'}`;
    }

    const sessionKey = formId || sessionId || `new_form_session_${req.user.id}`;
    let existingForm: any = null;
    let sessionContext: any = null;

    if (formId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId);
      if (isUUID) {
        existingForm = await db.form.findUnique({
          where: { id: formId },
          include: { questions: { orderBy: { orderIndex: 'asc' } } }
        });
      } else {
        existingForm = await db.form.findUnique({
          where: { uniqueShareId: formId },
          include: { questions: { orderBy: { orderIndex: 'asc' } } }
        });
      }
    }

    sessionContext = await EnterpriseContextEngine.registerUserMessage(sessionKey, rawPrompt);

    if (isGreetingOrHelp(rawPrompt)) {
      let replyText = "👋 Hi! It looks like you're greeting me or asking for help. Tell me what type of form you'd like to create.\n\nI can build registration forms, surveys, quizzes, medical intakes, feedback forms, and more. Just tell me your requirement!";
      if (process.env.GEMINI_API_KEY) {
        try {
          const casualInstruction = "You are a friendly, conversational AI assistant for PromptForm AI. Speak naturally. Do not return JSON. Respond warmly to their greeting (like hello, how are you, kem chho) or general query in the language they are using (English, Gujarati, Hinglish) and ask how you can help them build a form today.";
          replyText = await queryGemini(rawPrompt, casualInstruction, null, undefined, false, sessionContext?.history || []);
        } catch (e) {}
      }
      res.write(`data: ${JSON.stringify({ type: 'message', text: replyText })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'pills', pills: ["Standard Contact Form", "User Registration", "Feedback Form"] })}\n\n`);
      return res.end();
    }

    const { isTranslation, targetLang, isRtl } = detectTranslationIntent(rawPrompt);
    const langInfo = detectLanguage(rawPrompt);
    
    // Default to english unless the user explicitly requests another language (isTranslation is true, or prompt contains explicit language words)
    const lowercasePrompt = rawPrompt.toLowerCase();
    const explicitLanguageRequested = 
      isTranslation || 
      lowercasePrompt.includes("gujarati") || 
      lowercasePrompt.includes("ગુજરાતી") || 
      lowercasePrompt.includes("hindi") || 
      lowercasePrompt.includes("हिंदी") || 
      lowercasePrompt.includes("spanish") || 
      lowercasePrompt.includes("español") || 
      lowercasePrompt.includes("arabic") || 
      lowercasePrompt.includes("عربي") || 
      lowercasePrompt.includes("french") || 
      lowercasePrompt.includes("français") ||
      lowercasePrompt.includes("urdu") ||
      lowercasePrompt.includes("marathi") ||
      lowercasePrompt.includes("punjabi") ||
      lowercasePrompt.includes("tamil") ||
      lowercasePrompt.includes("telugu") ||
      lowercasePrompt.includes("kannada");

    const generationLang = explicitLanguageRequested ? (targetLang !== "english" ? targetLang : langInfo.lang) : "english";
    const generationIsRtl = explicitLanguageRequested ? (isRtl || langInfo.isRtl) : false;

    let docText = "";
    if (fileBuffer && !isImage) {
      docText = await getOrParseDocument(
        fileBuffer, 
        mimeType, 
        req.file?.originalname || 'document', 
        req.file?.size || 0
      );
      if (formId) {
        await EnterpriseContextEngine.registerFileUpload(formId, req.file?.originalname || 'document', mimeType, docText.substring(0, 500));
      }
    }

    // Direct existing form translation bypass
    if (isTranslation && formId) {
      const existingForm = await db.form.findUnique({
        where: { id: formId },
        include: { questions: { orderBy: { orderIndex: 'asc' } } }
      });
      if (!existingForm || existingForm.ownerId !== req.user.id) {
        res.write(`data: ${JSON.stringify({ error: "Forbidden or Form not found." })}\n\n`);
        return res.end();
      }

      res.write(`data: ${JSON.stringify({ type: 'message', text: `✓ Translation intent recognized...\n✓ Target language: ${generationLang.toUpperCase()}` })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 300));
      res.write(`data: ${JSON.stringify({ type: 'message', text: `✓ Translation intent recognized...\n✓ Target language: ${generationLang.toUpperCase()}\n✓ Translating questions and labels...` })}\n\n`);

      let formConfig: any;
      if (process.env.GEMINI_API_KEY) {
        try {
          const schemaPrompt = `Translate the following form into language: "${generationLang}". Keep the overall JSON structure the same.
JSON structure to translate:
${JSON.stringify({
  title: existingForm.title,
  description: existingForm.description,
  questions: existingForm.questions.map((q: any) => ({
    type: q.type,
    label: q.label,
    required: q.required,
    options: q.options
  }))
})}`;
          const systemInstruction = `You are a translation assistant. You must output only a valid JSON object matching the translated form fields. Set "rtl": ${generationIsRtl} in the "theme" object.`;
          formConfig = await queryGemini(schemaPrompt, systemInstruction);
        } catch (geminiError) {
          const oldConfig = {
            title: existingForm.title,
            description: existingForm.description,
            questions: existingForm.questions.map((q: any) => ({
              type: q.type,
              label: q.label,
              required: q.required,
              options: q.options
            })),
            theme: existingForm.theme || {}
          };
          formConfig = translateFormConfig(oldConfig, generationLang);
        }
      } else {
        const oldConfig = {
          title: existingForm.title,
          description: existingForm.description,
          questions: existingForm.questions.map((q: any) => ({
            type: q.type,
            label: q.label,
            required: q.required,
            options: q.options
          })),
          theme: existingForm.theme || {}
        };
        formConfig = translateFormConfig(oldConfig, generationLang);
      }

      if (!formConfig || typeof formConfig !== 'object') {
        throw new Error("Failed to translate the form JSON schema.");
      }

      // Update Form
      const updatedForm = await db.form.update({
        where: { id: existingForm.id },
        data: {
          title: formConfig.title || existingForm.title,
          description: formConfig.description || existingForm.description,
          theme: {
            ...(existingForm.theme as any || {}),
            ...(formConfig.theme || {}),
            rtl: generationIsRtl
          }
        }
      });

      // Update Questions
      await db.question.deleteMany({ where: { formId: existingForm.id } });
      await db.question.createMany({
        data: formConfig.questions.map((q: any, idx: number) => ({
          formId: existingForm.id,
          type: q.type,
          label: q.label,
          required: q.required || false,
          orderIndex: idx,
          options: q.options || [],
          validations: {
            ...(q.validations || {}),
            points: q.points !== undefined ? Number(q.points) : (q.validations?.points !== undefined ? Number(q.validations.points) : 5),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            negativePoints: q.negativePoints,
            bloomsTaxonomy: q.bloomsTaxonomy,
            accessibilityLabel: q.accessibilityLabel
          },
          logic: q.logic || {}
        }))
      });

      const fullForm = await db.form.findUnique({
        where: { id: existingForm.id },
        include: { questions: { orderBy: { orderIndex: 'asc' } } }
      });

      res.write(`data: ${JSON.stringify({ type: 'message', text: `✓ Translation intent recognized...\n✓ Target language: ${generationLang.toUpperCase()}\n✓ Translating questions and labels...\n✓ Live Form Preview updated successfully!` })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'form', form: fullForm })}\n\n`);
      return res.end();
    }

    // 2. Classify intent using Gemini
    let classificationResult: any = null;
    
    // Add PDF context to prompt if available
    let promptForClassification = rawPrompt;
    if (docText) {
      promptForClassification += `\n\nContextual Source Document Content:\n---\n${docText}\n---\nAnalyze this document context and base the form questions on it.`;
    }

    const hasAssistantResponded = sessionContext && sessionContext.history && sessionContext.history.some((m: any) => m.role === 'assistant');
    const isFollowUp = existingForm && existingForm.questions.length > 0;

    const shouldGenerateForm = (prompt: string, hasFile: boolean): boolean => {
      if (hasFile) return true;
      const clean = prompt.toLowerCase();
      const formKeywords = [
        'form', 'from', 'fom', 'fram',
        'quiz', 'quz', 'paper', 'test', 'exam',
        'survey', 'surve', 'squeery', 'squery',
        'booking', 'book',
        'registration', 'register', 'signup', 'sign up',
        'feedback', 'review',
        'order', 'purchase',
        'application', 'apply',
        'appointment', 'appoint',
        'invoice', 'bill',
        'crm', 'lead',
        'create', 'generate', 'make', 'build', 'construct',
        'banav', 'banvai', 'banaov', 'banavnu', 'kadhi', 'banavi'
      ];
      return formKeywords.some(keyword => clean.includes(keyword));
    };

    const digitExtract = rawPrompt.match(/\d+/);
    const targetFieldCount = digitExtract ? parseInt(digitExtract[0]) : 10;

    const classificationSystemInstruction = `You are an ultra-smart, all-rounder AI assistant. Your primary task is to classify the user's intent.
    
1. CHAT Mode: If the user is greeting you, having a general conversation, asking for suggestions, or discussing general topics, set response_type to "CHAT" and provide a warm, helpful response in chat_response.
   - STRICT LANGUAGE MIRRORING RULE: You must write the "chat_response" in the EXACT SAME language that the user used. If the user writes in English, reply in English. If they write in Gujarati, reply in Gujarati. If they write in Gujrish/Hinglish (Latin script transliterated), reply in Gujrish/Hinglish. Never respond in Gujarati if the user's message is in English!

2. FORM_GEN Mode: If the user requests to create, generate, or modify any form, quiz, survey, poll, or questionnaire (including follow-up edits like adding, removing, or upgrading fields), set response_type to "FORM_GEN" and populate form_data with the complete JSON structure.

HOW TO HANDLE REGIONAL HINGLISH/GUJRISH SLANG & TYPOS (TRAINING EXAMPLES):
- If the user prompt is "more perfcat make it my from pelase" or "make it perfect/perfact":
  * This is a follow-up refinement request. You MUST set response_type to "FORM_GEN", load the existing form layout in history, and expand it to be highly professional and perfect (adding validation, premium fields like phone/email/rating/agreement, and appropriate option list choices). Do NOT treat this as a generic chat prompt!
- If the user prompt is "created responece from" or typos of "response form":
  * This is a request to create a new "Customer Feedback & Response Form". Set response_type to "FORM_GEN".
- If the user prompt is "mare mara chatboat ne train karvu chhe" or "train my chatbot":
  * This is the user asking to improve the Form Builder AI. Acknowledge this request in CHAT mode, and explain in Gujarati/Hinglish that you are now trained to understand their edits and can make their forms perfect in real-time.

CLAUDE/CHATGPT ADAPTIVE INSTRUCTION CONFORMANCE PROTOCOL & ADVANCED ENTERPRISE KNOWLEDGE BASE:
- **WORLD KNOWLEDGE & FACTUAL TRUTH MANDATE**: You possess vast, deep, factually accurate world knowledge on ALL topics across video games (e.g. GTA V, Minecraft, Valorant, Call of Duty, FIFA, Pokémon, League of Legends, Fortnite, Roblox, CS:GO, God of War, Cyberpunk, Genshin Impact, Chess, Board Games), sports (e.g. Cricket World Cup, Premier League, NBA, Tennis, F1, Olympics), pop culture, movies, anime, literature, history, geography, science, technology, medicine, and business. When given ANY user prompt on ANY topic in the world, perform deep domain analysis and generate 100% TRUE, ACCURATE, and topic-authentic factual questions, answers, and choices.
- **Strict Topic Intelligence & Topic-Specific Questions**: Every question generated MUST directly test or ask about the specific topic requested by the user (e.g. JavaScript, React, Node.js, Restaurant Satisfaction, Backend Developer Job, GTA V, Cricket World Cup).
- **ZERO GENERIC IDENTITY FALLBACK RULE**:
  * For QUIZZES, EXAMS, SURVEYS, FEEDBACK FORMS, and POLLS: Do NOT automatically add common personal fields like Phone Number, Address, Date of Birth, Gender, Company, Email, or Name UNLESS they are genuinely relevant or explicitly requested by the user. 100% of the questions MUST be topic-specific!
  * For REGISTRATION, EVENT REGISTRATION, APPLICATION, and CONTACT forms: Personal fields (Name, Email, Phone, Resume, Company, Session) ARE relevant and should be included appropriately.
- **Incremental Modifications & Refinements**: When editing an existing form, you must ONLY add, delete, or modify the questions/rules requested by the user. Do NOT drop existing questions, options, or styling details unless explicitly asked to do so. Maintain original schema integrity.
- **Strict Premium Component Validation**: Always match questions to their most appropriate premium component types (e.g. name, email, phone, price, rating, agreement, feedback, photo/resume upload) instead of standard short_text or long_text inputs.

ADVANCED ENTERPRISE KNOWLEDGE & FORM/QUIZ ARCHITECTURE ENGINE:
1. QUIZZES & EXAMS ARCHITECTURE:
   - When a quiz, test, exam, trivia, or assessment is requested:
     - Generate comprehensive, topic-specific questions testing real domain knowledge.
     - Do NOT add phone, address, DOB, or generic identity fields.
     - Distribute difficulty levels evenly: 40% EASY, 40% MEDIUM, 20% HARD (or use specified difficulty like Beginner/Difficult).
     - Assign realistic point weights ('points': 5 to 10), correct answer key ('correctAnswer'), and detailed explanation ('explanation').
     - Enable 'shuffle_questions': true, 'anti_cheat_detection': true, and set 'timer_limit': 10 in settings.
2. SURVEYS & FEEDBACK ARCHITECTURE:
   - Include topic-relevant Likert rating scales (1-5 stars or 1-10 NPS scale), multi-select checkboxes with write-in options, and paragraph feedback text areas.
   - Do NOT add phone, address, or irrelevant identity fields unless requested.
3. JOB APPLICATIONS & REGISTRATIONS ARCHITECTURE:
   - Include dedicated identity fields: 'name', 'email', 'phone', 'resume' (CV file upload), 'website' (portfolio/LinkedIn link), 'price' (expected salary), and 'agreement' (consent check).

CRITICAL INSTRUCTIONS FOR FORM_GEN:
1. Language Directive:
   - Generate all form content (title, description, field labels, options) in this language: "${generationLang}".
   - Note: If the user talks to you in Gujarati, Hindi, or Hinglish, but DOES NOT explicitly request the form itself to be in that language, you MUST still generate the form in English by default. Only generate the form in Gujarati, Hindi, or Hinglish if they explicitly ask for the form to be in that language (e.g. "બનાવો ગુજરાતીમાં", "translate to Hindi", "make the form in Hindi", etc.).
2. Dynamic Edits and Follow-ups:
   - If the user asks to modify the existing form (e.g., "remove this field", "add a field", "make it more advanced"), you MUST apply the changes to the current form schema and return the complete updated form JSON in "form_data".
   - If they request to remove a field, remove it from the questions list.
   - If they request to add a field, insert it with the most appropriate premium field type.
   - If they say "make it more advanced", upgrade the questions, options, descriptions, and validations to make them more professional and comprehensive.
3. Field Count:
   - Unless the user requests a different number of questions/fields, generate exactly ${targetFieldCount} highly detailed questions in the "questions" array of "form_data". Never generate a simple or short form with only 3 or 4 questions unless explicitly requested.
4. Robust Intent Parsing:
   - Instantly decode requests in any mix of English, Hindi, Gujarati, Hinglish, or shorthand slangs (e.g., "booking valu form", "job application banav", "યાર સર્વે બનાવ", "cafe mate custom design").
   - Any vague or shorthand prompt requesting a form or survey must trigger FORM_GEN mode.
5. Strict Premium Field Coercion:
   - Match questions to their most appropriate premium type instead of generic short_text/long_text.
   - Name -> "name", Email -> "email", Phone -> "phone", Website/URL -> "website", Currency/Price -> "price", Star Ratings -> "rating", Consents -> "agreement", Paragraph/Reviews -> "feedback", Resume/CV Upload -> "resume", Photo/Avatar -> "photo", Date -> "date", Time -> "time", Location -> "location", OTP -> "otp", Payment/Credit Card -> "payment".
6. Comprehensive Options:
   - Never output generic '["Option 1", "Option 2"]'. Always supply meaningful, context-appropriate options lists (e.g. Gender, Age Groups, Visit Frequencies, Satisfaction levels).
7. Topic-Specific Themes:
   - Set the theme string to a slug indicating the business domain: e.g. "coffee-warm" for cafes, "medical-teal" for health, "gym-fitness" for sports, "slate-dark" for tech/SaaS.
8. Dynamic Visibility Logic Rules:
   - If the user prompt mentions conditional rules, skip rules, or logic (e.g. "show field X only if Y is Yes", "logic aapo", "skip logic"), you MUST populate the "logic" field of that dependent question.
   - The "logic" object must follow this format:
     "logic": {
       "action": "show" | "hide",
       "conditions": [
         {
           "fieldLabel": string, // Exact label of trigger question
           "operator": "equals" | "not_equals" | "contains" | "not_contains",
           "value": string // Value of trigger question
         }
       ]
     }

You MUST respond with a JSON object containing:
{
  "response_type": "CHAT" | "FORM_GEN",
  "actions": string[], // ALWAYS populate this array with specific action intents detected from the user's prompt (e.g., ["REMOVE_BANNER"] if they ask to remove an image/banner/header, ["TRANSLATE"] if they ask for translation, ["ADD_FIELD"], etc.). If no special action, return [].
  "chat_response": string | null, // Give a nice friendly response in the user's EXACT language (English / Gujarati / Hinglish) if response_type is CHAT, otherwise null.
  "response_pills": string[] | null, // Exactly 3 highly context-accurate, topic-related suggestion options (e.g. ["Product Review Form", "Add address field", "Change theme to blue"]) to assist the user.
  "form_data": { // The full form configuration JSON if response_type is FORM_GEN, otherwise null. If this is an edit/follow-up, apply the requested edits to the existing form schema and output the full updated form.
    "title": string,
    "description": string,
    "questions": Array<{
      "type": "name" | "email" | "phone" | "price" | "rating" | "agreement" | "feedback" | "photo" | "resume" | "short_text" | "long_text" | "mcq" | "checkbox" | "dropdown" | "signature" | "file_upload" | "date" | "time" | "website" | "amount" | "password" | "color" | "location" | "otp" | "payment" | "one_option" | "gender" | "country" | "multiple_options",
      "label": string,
      "required": boolean,
      "options": string[],
      "correctAnswer": string | null,
      "explanation": string | null,
      "points": number | null, // Optional point weight value for the question if it is a quiz (default to 5 unless the user requests a specific weight value, e.g. 3 marks)
      "difficulty": "EASY" | "MEDIUM" | "HARD" | null,
      "negativePoints": number | null,
      "bloomsTaxonomy": "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE" | null
    }>,
    "theme": {
      "primary_color": string, // Theme color matching the form's niche
      "background_color": string,
      "font_family": string,
      "banner_url": string | null // A high-quality stock photo Unsplash URL matching the form/quiz topic (e.g. "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800" for coffee, or "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800" for study/exams). If the user asks to remove the header image, banner, or theme image, set this to null.
    },
    "settings": {
      "collect_emails": boolean,
      "limit_responses": boolean,
      "password": null | string,
      "allow_editing": boolean,
      "shuffle_questions": boolean,
      "timer_limit": number,
      "anti_cheat_detection": boolean
    }
  } | null
}

Strict Rules for form_data structure if response_type is FORM_GEN:
1. Strict Semantics-Based Field Matching:
- Match fields to their most appropriate premium widget type:
  - "name" for names
  - "email" for emails
  - "phone" for contact numbers
  - "price" for money/prices/salary
  - "rating" for star ratings/satisfaction levels
  - "agreement" for check consents/terms agreement
  - "feedback" for paragraph text/long feedback
  - "photo" for passport photos or user avatars
  - "resume" for CV/resume file uploads
- Standard text inputs ("short_text" / "long_text") must never be used for fields that have dedicated premium types.
2. Automated Options Lists & Settings:
- Automatically supply comprehensive, meaningful choice lists (e.g. detailed gender choices, satisfaction levels, dining/visiting frequencies, experience tiers) instead of generic options.
3. Topic-Specific Themes:
- Automatically apply cohesive, beautiful primary colors (such as warm ambers, deep indigos, emerald greens, dark slates, etc. matching the form's niche), backgrounds, and font families.
4. Difficulty & Marks Balance:
- If a Quiz or Test is requested, define an appropriate difficulty (EASY, MEDIUM, or HARD) and earned point weight value (e.g., points = 3) for each question in its validations.
- If a mix is requested, distribute difficulty ratings evenly across questions (e.g. 40% Easy, 40% Medium, 20% Hard) and make the questions match the difficulty.
- Set custom points if requested by the user, defaulting to 5 points.

`;

    if (process.env.GEMINI_API_KEY) {
      try {
        let historyWithCurrentForm = sessionContext?.history || [];
        if (isFollowUp && existingForm) {
          historyWithCurrentForm = [
            { role: 'user', text: `Here is the current form we are working on: ${JSON.stringify(existingForm)}` },
            ...historyWithCurrentForm
          ];
        }
        classificationResult = await queryGemini(promptForClassification, classificationSystemInstruction, fileBuffer, mimeType, true, historyWithCurrentForm);
      } catch (err) {
        console.error("Classification error:", err);
      }
    }

    if (!classificationResult) {
      const isChat = isGreetingOrHelp(rawPrompt) || (!autoBuildMode && !shouldGenerateForm(rawPrompt, !!fileBuffer) && !isConfirmation(rawPrompt) && !isFollowUp);
      if (isChat) {
        classificationResult = {
          response_type: 'CHAT',
          chat_response: "Hello! I am your AI Form Builder. How can I help you create forms, surveys, or quizzes today?",
          response_pills: ["Standard Contact Form", "User Registration", "Feedback Form"]
        };
      } else {
        let formConfig;
        if (isFollowUp) {
          const followUpResult = AIFormBrain.processFollowUp(rawPrompt, existingForm, { rawPrompt, normalizedPrompt: rawPrompt.trim().toLowerCase(), isGreeting: false, isTranslation: false, targetLang: "english", isRtl: false });
          formConfig = followUpResult.formConfig;
        } else {
          const brainResult = AIFormBrain.process(rawPrompt, docText);
          formConfig = brainResult.formConfig;
        }
        classificationResult = {
          response_type: 'FORM_GEN',
          form_data: formConfig,
          response_pills: ["Inject validation checkers on inputs", "Rewrite in a more formal typography tone", "Apply accessibility parameters"]
        };
      }
    }

    if (classificationResult.response_type === 'CHAT') {
      const replyText = classificationResult.chat_response || "Hello! I am here to help you.";
      res.write(`data: ${JSON.stringify({ type: 'message', text: replyText })}\n\n`);
      if (Array.isArray(classificationResult.response_pills) && classificationResult.response_pills.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'pills', pills: classificationResult.response_pills })}\n\n`);
      }
      return res.end();
    }

    // Since response_type is 'FORM_GEN', we proceed with SSE progress indicator and generation mapping
    if (fileBuffer) {
      res.write(`data: ${JSON.stringify({ type: 'message', text: "I've analyzed your document.\n\nDetected:\n✓ Language" })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 300));
      res.write(`data: ${JSON.stringify({ type: 'message', text: "I've analyzed your document.\n\nDetected:\n✓ Language\n✓ Form Type" })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 300));
      res.write(`data: ${JSON.stringify({ type: 'message', text: "I've analyzed your document.\n\nDetected:\n✓ Language\n✓ Form Type\n✓ Sections" })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 300));
      res.write(`data: ${JSON.stringify({ type: 'message', text: "I've analyzed your document.\n\nDetected:\n✓ Language\n✓ Form Type\n✓ Sections\n✓ Fields" })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 300));
      res.write(`data: ${JSON.stringify({ type: 'message', text: "I've analyzed your document.\n\nDetected:\n✓ Language\n✓ Form Type\n✓ Sections\n✓ Fields\n✓ Validation" })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 400));
      res.write(`data: ${JSON.stringify({ type: 'message', text: "I've analyzed your document.\n\nDetected:\n✓ Language\n✓ Form Type\n✓ Sections\n✓ Fields\n✓ Validation\n\nGenerating editable form..." })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'message', text: "✓ Understood..." })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'message', text: `✓ Understood...\n✓ Detecting language: ${generationLang.toUpperCase()}...` })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Also write any generated suggestion pills for quick follow-ups if available
    if (Array.isArray(classificationResult.response_pills) && classificationResult.response_pills.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'pills', pills: classificationResult.response_pills })}\n\n`);
    }

    let formConfig = classificationResult.form_data;

    // Scan for theme extraction URLs in user prompt
    const urlMatch = rawPrompt.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/);
    let extractedTheme: any = null;
    if (urlMatch && !rawPrompt.includes("gmail.com") && !rawPrompt.includes("gamil.com") && !rawPrompt.includes("email") && !rawPrompt.includes("mail")) {
      try {
        extractedTheme = await extractThemeFromUrl(urlMatch[0]);
      } catch (e) {
        console.error("Theme extraction failed:", e);
      }
    }

    // Resolve Domain and apply Quiz/Survey Cognitive Mapping
    const generatedDomain = DomainDetector.detect({ rawPrompt, normalizedPrompt: rawPrompt.toLowerCase(), isGreeting: false, isTranslation: false, targetLang: "english", isRtl: false });

    // Normalize new strict JSON schema to internal schema
    if (formConfig) {
      const isRemoveBanner = Array.isArray(classificationResult.actions) && classificationResult.actions.includes("REMOVE_BANNER");
      if (extractedTheme) {
        formConfig.theme = {
          theme_name: extractedTheme.themeName,
          layoutType: "compact-grid",
          primary_color: extractedTheme.primaryColor,
          background_color: extractedTheme.backgroundColor,
          font_family: "Inter",
          rtl: generationIsRtl,
          banner_url: isRemoveBanner ? null : getBannerUrlForDomain(generatedDomain, rawPrompt)
        };
      }
      const normalizeFieldType = (label: string, type: string): string => {
        const lowerLabel = (label || "").toLowerCase();
        const lowerType = (type || "").toLowerCase();

        // 1. Prioritize label semantic matching to upgrade basic types to premium widgets
        if (lowerLabel.includes("password")) return "password";
        if (lowerLabel.includes("email")) return "email";
        if (lowerLabel.includes("phone") || lowerLabel.includes("mobile") || lowerLabel.includes("contact")) return "phone";
        if (lowerLabel.includes("website") || lowerLabel.includes("url") || lowerLabel.includes("link") || lowerLabel.includes("portfolio")) return "website";
        if (lowerLabel.includes("dob") || lowerLabel.includes("birth date") || lowerLabel.includes("date of birth")) return "date";
        if (lowerLabel.includes("date") && lowerLabel.includes("time")) return "date";
        if (lowerLabel.includes("date") && !lowerLabel.includes("time")) return "date";
        if (lowerLabel.includes("time") && !lowerLabel.includes("date")) return "time";
        
        if (lowerLabel.includes("salary") || lowerLabel.includes("price") || lowerLabel.includes("cost") || lowerLabel.includes("budget") || lowerLabel.includes("payment")) return "price";
        if (lowerLabel.includes("age") || lowerLabel.includes("number") || lowerLabel.includes("quantity") || lowerLabel.includes("amount")) return "amount";
        
        if (lowerLabel.includes("signature")) return "signature";
        if (lowerLabel.includes("terms") || lowerLabel.includes("agree") || lowerLabel.includes("declaration") || lowerLabel.includes("consent")) return "agreement";
        
        if (lowerLabel.includes("resume") || lowerLabel.includes("cv")) return "resume";
        if (lowerLabel.includes("photo") || lowerLabel.includes("avatar") || lowerLabel.includes("image") || lowerLabel.includes("pic")) return "photo";
        
        if (lowerLabel.includes("satisfaction") || lowerLabel.includes("nps") || lowerLabel.includes("rating") || lowerLabel.includes("opinion") || lowerLabel.includes("recommend")) return "rating";
        
        if (lowerLabel.includes("feedback") || lowerLabel.includes("comment") || lowerLabel.includes("description") || lowerLabel.includes("query") || lowerLabel.includes("message")) return "feedback";
        
        if (lowerLabel.includes("gender")) return "gender";
        if (lowerLabel.includes("country")) return "country";
        if (lowerLabel.includes("name")) return "name";

        // 2. Validate against existing frontend types
        const validTypes = [
          "short_text", "standard-input", "name", "email", "phone", "website", "amount", "price",
          "password", "long_text", "feedback", "address", "mcq", "one_option", "gender",
          "checkbox", "multiple_options", "dropdown", "country", "agreement", "rating",
          "star-rating", "signature", "file_upload", "file-uploader", "resume", "photo",
          "date", "time", "color", "location", "location-selector", "otp", "payment"
        ];
        if (validTypes.includes(lowerType)) {
          if (lowerType === "short_text" || lowerType === "standard-input") return "name";
          if (lowerType === "long_text") return "feedback";
          if (lowerType === "file_upload" || lowerType === "file-uploader") {
            if (lowerLabel.includes("resume") || lowerLabel.includes("cv")) return "resume";
            if (lowerLabel.includes("photo") || lowerLabel.includes("avatar") || lowerLabel.includes("image") || lowerLabel.includes("pic")) return "photo";
            return "file_upload";
          }
          if (lowerType === "checkbox") {
            if (lowerLabel.includes("terms") || lowerLabel.includes("agree") || lowerLabel.includes("declaration") || lowerLabel.includes("consent")) return "agreement";
            return "checkbox";
          }
          return lowerType;
        }

        // 3. Fallbacks based on type keyword strings
        if (lowerType.includes("rating") || lowerType.includes("satisfaction") || lowerType.includes("emoji")) return "rating";
        if (lowerType.includes("slider") || lowerType.includes("range")) return "amount";
        if (lowerType.includes("file") || lowerType.includes("upload") || lowerType.includes("resume")) return "resume";
        if (lowerType.includes("image") || lowerType.includes("photo") || lowerType.includes("pic")) return "photo";
        if (lowerType.includes("datetime") || lowerType.includes("date-time")) return "date";
        if (lowerType.includes("tag") || lowerType.includes("cloud")) return "multiple_options";
        if (lowerType.includes("pain") || lowerType.includes("body")) return "feedback";
        if (lowerType.includes("text") || lowerType.includes("input")) return "name";

        return "name";
      };

      if (formConfig.formTitle && !formConfig.title) {
        formConfig.title = formConfig.formTitle;
      }
      if (formConfig.fields && !formConfig.questions) {
        formConfig.questions = formConfig.fields;
      }
      if (Array.isArray(formConfig.questions)) {
        formConfig.questions = formConfig.questions.map((q: any) => {
          const rawType = q.componentType || q.type || "name";
          q.type = normalizeFieldType(q.label || "", rawType);
          return q;
        });
      }
      if (formConfig.theme && typeof formConfig.theme === 'string') {
        const themeSlug = formConfig.theme.toLowerCase();
        const layoutTypeSlug = formConfig.layoutType || "compact-grid";
        
        let primaryColor = "#4f46e5";
        let backgroundColor = "#f5f3ff";
        if (themeSlug.includes("medical") || themeSlug.includes("health") || themeSlug.includes("clinic") || themeSlug.includes("doctor") || themeSlug.includes("hospital") || themeSlug.includes("emerald") || themeSlug.includes("mint") || themeSlug.includes("green") || themeSlug.includes("teal")) {
          primaryColor = "#059669";
          backgroundColor = "#ecfdf5";
        } else if (themeSlug.includes("dark") || themeSlug.includes("slate") || themeSlug.includes("black") || themeSlug.includes("zinc")) {
          primaryColor = "#6366f1";
          backgroundColor = "#0f172a";
        } else if (themeSlug.includes("coffee") || themeSlug.includes("bakery") || themeSlug.includes("cafe") || themeSlug.includes("food") || themeSlug.includes("dining") || themeSlug.includes("restaurant") || themeSlug.includes("amber") || themeSlug.includes("warm")) {
          primaryColor = "#d97706";
          backgroundColor = "#fffbeb";
        } else if (themeSlug.includes("gym") || themeSlug.includes("fitness") || themeSlug.includes("sport") || themeSlug.includes("workout") || themeSlug.includes("purple") || themeSlug.includes("violet") || themeSlug.includes("crimson")) {
          primaryColor = "#7c3aed";
          backgroundColor = "#f5f3ff";
        }
        
        formConfig.theme = {
          theme_name: themeSlug,
          layoutType: layoutTypeSlug,
          primary_color: primaryColor,
          background_color: backgroundColor,
          font_family: "Inter",
          rtl: generationIsRtl,
          banner_url: isRemoveBanner ? null : getBannerUrlForDomain(generatedDomain, rawPrompt)
        };
      } else if (formConfig.theme && typeof formConfig.theme === 'object') {
        if (isRemoveBanner) {
          formConfig.theme.banner_url = null;
        } else if (formConfig.theme.banner_url === undefined) {
          formConfig.theme.banner_url = getBannerUrlForDomain(generatedDomain, rawPrompt);
        }
      } else {
        formConfig.theme = {
          theme_name: "default",
          layoutType: "compact-grid",
          primary_color: "#4f46e5",
          background_color: "#f5f3ff",
          font_family: "Inter",
          rtl: generationIsRtl,
          banner_url: isRemoveBanner ? null : getBannerUrlForDomain(generatedDomain, rawPrompt)
        };
      }
    }
    if (generatedDomain === 'quiz' || generatedDomain === 'survey' || generatedDomain === 'medical') {
      const assessmentPlan = EnterpriseQuizEngine.resolve(generatedDomain, rawPrompt, formConfig.questions || []);
      
      formConfig.questions = (formConfig.questions || []).map((q: any) => {
        const matchingQ = assessmentPlan.questions.find((aq: any) => aq.label === q.label);
        if (matchingQ) {
          return {
            ...q,
            correctAnswer: matchingQ.correctAnswer,
            explanation: matchingQ.explanation,
            difficulty: matchingQ.difficulty,
            negativePoints: matchingQ.negativePoints,
            bloomsTaxonomy: matchingQ.bloomsTaxonomy
          };
        }
        return q;
      });

      formConfig.settings = {
        ...(formConfig.settings || {}),
        leaderboardReady: assessmentPlan.leaderboardReady,
        certificateConfig: assessmentPlan.certificateConfig
      };
    }

    formConfig = EnterpriseQualityReviewer.reviewAndImprove(formConfig);

    if (!formConfig || typeof formConfig !== 'object') {
      throw new Error("Invalid output layout generated.");
    }
    if (!formConfig.title) formConfig.title = "AI Prompt Form";
    if (!formConfig.questions) formConfig.questions = [];

    if (formId && sessionContext) {
      await EnterpriseContextEngine.registerAssistantMessage(formId, `Updated form config to title: "${formConfig.title}" with ${formConfig.questions.length} fields.`);
    }

    const finalFieldCount = formConfig.questions.length;

    formConfig.questions = formConfig.questions.map((q: any, idx: number) => ({
      type: q.type || "short_text",
      label: q.label || `Question ${idx + 1}`,
      required: q.required || false,
      options: Array.isArray(q.options) ? Array.from(new Set(q.options)) : [],
      validations: q.validations || {},
      logic: q.logic || {},
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      negativePoints: q.negativePoints,
      bloomsTaxonomy: q.bloomsTaxonomy,
      accessibilityLabel: q.accessibilityLabel
    })).slice(0, finalFieldCount);

    if (!fileBuffer) {
      if (extractedTheme) {
        res.write(`data: ${JSON.stringify({ type: 'message', text: `✓ Understood...\n✓ Detecting language...\n✓ Creating fields...\n✓ Extracted brand colors from ${urlMatch ? urlMatch[0] : 'website'} (${extractedTheme.primaryColor})...\n✓ Generating responsive layout...` })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        res.write(`data: ${JSON.stringify({ type: 'message', text: "✓ Understood...\n✓ Detecting language...\n✓ Creating fields...\n✓ Adding validation..." })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 800));
        res.write(`data: ${JSON.stringify({ type: 'message', text: "✓ Understood...\n✓ Detecting language...\n✓ Creating fields...\n✓ Adding validation...\n✓ Generating responsive layout... plase check itt and add this my website'" })}\n\n`);
      }
    }

    let form: any;
    if (formId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId);
      const existingForm = isUUID
        ? await db.form.findUnique({ where: { id: formId } })
        : await db.form.findUnique({ where: { uniqueShareId: formId } });

      if (!existingForm || existingForm.ownerId !== req.user.id) {
        res.write(`data: ${JSON.stringify({ error: "Forbidden. Form not found or not yours." })}\n\n`);
        return res.end();
      }

      form = await db.form.update({
        where: { id: existingForm.id },
        data: {
          title: formConfig.title,
          description: formConfig.description || "",
          settings: formConfig.settings || existingForm.settings || {},
          theme: formConfig.theme || existingForm.theme || {}
        }
      });
      await db.question.deleteMany({ where: { formId: form.id } });
      await db.question.createMany({
        data: formConfig.questions.map((q: any, idx: number) => ({
          formId: form.id,
          type: q.type,
          label: q.label,
          required: q.required || false,
          orderIndex: idx,
          options: q.options || [],
          validations: {
            ...(q.validations || {}),
            points: q.points !== undefined ? Number(q.points) : (q.validations?.points !== undefined ? Number(q.validations.points) : 5),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            negativePoints: q.negativePoints,
            bloomsTaxonomy: q.bloomsTaxonomy,
            accessibilityLabel: q.accessibilityLabel
          },
          logic: q.logic || {}
        }))
      });
    } else {
      form = await db.form.create({
        data: {
          title: formConfig.title,
          description: formConfig.description || "",
          status: "DRAFT",
          ownerId: req.user.id,
          settings: formConfig.settings || { collect_emails: true, limit_responses: false, password: null, allow_editing: true, shuffle_questions: false, timer_limit: 0, anti_cheat_detection: false },
          theme: formConfig.theme || { primary_color: "#22C55E", background_color: "#F8FFFA", font_family: "Inter" }
        }
      });

      await db.question.createMany({
        data: formConfig.questions.map((q: any, idx: number) => ({
          formId: form.id,
          type: q.type,
          label: q.label,
          required: q.required || false,
          orderIndex: idx,
          options: q.options || [],
          validations: {
            ...(q.validations || {}),
            points: q.points !== undefined ? Number(q.points) : (q.validations?.points !== undefined ? Number(q.validations.points) : 5),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            negativePoints: q.negativePoints,
            bloomsTaxonomy: q.bloomsTaxonomy,
            accessibilityLabel: q.accessibilityLabel
          },
          logic: q.logic || {}
        }))
      });

      await db.analytics.create({
        data: {
          formId: form.id,
          views: 0,
          submissions: 0,
          deviceStats: { desktop: 0, mobile: 0, tablet: 0 },
          countryStats: {},
          dropoutRates: {}
        }
      });
    }

    await db.user.update({
      where: { id: req.user.id },
      data: { credits: { decrement: 5 } }
    });

    const fullForm = await db.form.findUnique({
      where: { id: form.id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    });

    res.write(`data: ${JSON.stringify({ type: 'message', text: "✨ Form successfully compiled and loaded on your canvas!" })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'form', form: fullForm })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Chat Stream generation error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message || "Failed to generate form chat stream." })}\n\n`);
    res.end();
  }
});

export default router;
