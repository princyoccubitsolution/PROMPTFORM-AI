import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { db } from '../lib/db';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { subscriptionMiddleware } from '../middlewares/subscription';
import { getOrParseDocument } from '../lib/queue';
import { spellingRecovery } from '../lib/intentEngine';
import { AIFormBrain, EnterpriseContextEngine } from '../lib/aiBrain';
import {
  extractRequirementSpec, describeSpec, canonicalFromDb, toQuestionRows, planGeneration, buildGenerationInstruction,
  runRequirementPipeline, PipelineResult
} from '../lib/aiBrain/requirements';
import { generateUniqueShareId, hasFormAccess, isUUID } from '../lib/utils';
import { FormsService } from '../services/formsService';
import { invalidateFormCache } from './forms';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Helper to normalize image/document MIME types for Gemini API
function normalizeMimeType(mimeType: string = "", originalName: string = ""): string {
  let lower = (mimeType || "").toLowerCase().trim();
  if (lower === 'image/jpg' || lower === 'image/jfif' || lower === 'image/pjpeg' || lower === 'image/jp2') return 'image/jpeg';
  if (lower === 'image/x-png') return 'image/png';
  if (lower === 'application/octet-stream' || !lower) {
    if (/\.(jpe?g|jfif)$/i.test(originalName)) return 'image/jpeg';
    if (/\.png$/i.test(originalName)) return 'image/png';
    if (/\.webp$/i.test(originalName)) return 'image/webp';
    if (/\.pdf$/i.test(originalName)) return 'application/pdf';
  }
  return lower || 'application/pdf';
}

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
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-pro'
  ];

  const contents: any[] = [];

  // Rebuild conversation history
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  const baseParts: any[] = [{ text: prompt }];

  const cleanMime = mimeType ? normalizeMimeType(mimeType) : "";
  if (fileBuffer && cleanMime && (cleanMime.startsWith('image/') || cleanMime === 'application/pdf')) {
    baseParts.push({
      inlineData: {
        mimeType: cleanMime,
        data: fileBuffer.toString('base64')
      }
    });
  }

  let textResponse: string | undefined;
  let lastError: Error | null = null;
  let includeInlineData = true;

  for (const model of candidateModels) {
    const currentParts = includeInlineData 
      ? [...baseParts] 
      : [{ text: prompt }];

    const currentContents = [
      ...contents,
      {
        role: 'user',
        parts: currentParts
      }
    ];

    const payload: any = {
      contents: currentContents,
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

        if (parsedErrMsg.toLowerCase().includes('api key not valid') || parsedErrMsg.toLowerCase().includes('api_key_invalid')) {
          console.warn(`GEMINI_API_KEY is invalid: ${parsedErrMsg}`);
          throw lastError;
        }

        if (res.status === 503 || res.status === 404 || res.status === 429) {
          console.warn(`Model ${model} returned ${res.status}, retrying with fallback model after brief delay...`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        if (res.status === 400 && fileBuffer && includeInlineData && !parsedErrMsg.toLowerCase().includes('key')) {
          console.warn(`Model ${model} rejected binary inlineData with 400, retrying with text-only prompt...`);
          includeInlineData = false;
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

function buildImageScanSystemInstruction(userPrompt: string = ""): string {
  return `You are the Expert Vision & Document Scan Extraction Engine for PromptForm AI.
Your sole mission is to analyze the provided image scan of a form, document, quiz, or survey, and perform a 100% precise, complete extraction of all fields, questions, options, sections, and structural components visible in the image.

CRITICAL EXTRACTION MANDATES FOR IMAGE SCANS:
1. READ THE IMAGE SCAN VISUALLY:
   - Carefully scan all text, headers, question titles, fill-in blanks, checkboxes, radio options, tables, and signature blocks in the image.
   - Extract EVERY SINGLE question and field shown in the scan in exact original top-to-bottom sequence.

2. PRESERVE ORIGINAL FORM TITLE & DESCRIPTION:
   - "title": Extract the main title printed at the top of the scanned image document (e.g., "Patient Medical Intake Form", "Event Registration Form", "Employment Application").
   - "description": Extract any subtitle, instructions, or header notice printed under the title.

3. MAP VISUAL WIDGET TYPES ACCURATELY:
   - Text boxes / Underlined blanks -> "short_text" or "long_text"
   - Checkboxes / Square boxes -> "multiple_options" or "agreement" or "mcq"
   - Radio buttons / Ovals / Choice lists -> "mcq" or "dropdown"
   - Star ratings / Satisfaction scales -> "rating" or "emoji-satisfaction-scale"
   - Full Name fields -> "name"
   - Email fields -> "email"
   - Phone / Contact number fields -> "phone"
   - File upload / Photo / Signature boxes -> "file_upload" or "signature"
   - Date / Time fields -> "date"
   - Address / Location fields -> "location"

4. PRESERVE OPTIONS & CHOICES:
   - For any multiple choice, checkbox, or dropdown field in the image scan, extract all option labels verbatim as listed in the scan.

5. USER CUSTOM INSTRUCTIONS OVERRIDE:
   ${userPrompt ? `User custom instructions for this scan: "${userPrompt}". Apply any requested modifications or additions to the extracted form structure.` : 'Follow the exact structure of the scanned document.'}

6. CLEANUP & QUALITY:
   - Clean up question labels so they do not contain raw prefixes like "Q1." or "Section A:".
   - Ensure every field has an appropriate placeholder.

7. STRUCTURED JSON OUTPUT:
   Output valid JSON with "title", "description", "theme", and "questions" array containing extracted fields.`;
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
// Pipeline: user message -> requirement spec (operation, language, constraints) -> AI generation ->
// canonical schema -> deterministic repair -> requirement verification (+ bounded AI repair) -> persistence.
router.post(['/generate', '/generate-from-file'], optionalAuthMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const mimeType = req.file ? normalizeMimeType(req.file.mimetype, req.file.originalname) : "application/pdf";
    const userPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.slice(0, 8000) : '';
    const legacyFormId = typeof req.body?.formId === 'string' && req.body.formId.trim() ? req.body.formId.trim() : undefined;
    const contextFormId = typeof req.body?.contextFormId === 'string' && req.body.contextFormId.trim() ? req.body.contextFormId.trim() : undefined;
    const formTypeHint = typeof req.body?.formType === 'string' ? req.body.formType : 'auto';
    const optionLayout = req.body?.optionLayout === 'vertical' || req.body?.optionLayout === 'horizontal' ? req.body.optionLayout : undefined;
    const isImage = mimeType.startsWith('image/');

    if (!fileBuffer && userPrompt.trim().length < 2) {
      return res.status(200).json({
        status: 'clarify',
        operation: 'clarify',
        message: 'Describe the form or quiz you want, for example "Food order form for my restaurant" or "Class 8 science quiz with 20 MCQs".',
        suggestions: ['Restaurant food order form', 'Customer feedback survey', 'Python quiz with 10 MCQs']
      });
    }

    // Editing an existing form requires a signed-in owner / editor. Without this check an
    // anonymous request carrying any formId could overwrite that form's questions.
    let existingDbForm: any = null;
    const targetFormId = legacyFormId || contextFormId;
    if (targetFormId && !targetFormId.startsWith('gen-') && !targetFormId.startsWith('demo-')) {
      if (!req.user) {
        return res.status(401).json({ error: 'Please sign in to edit a form with AI.' });
      }
      existingDbForm = await db.form.findFirst({
        where: isUUID(targetFormId) ? { id: targetFormId } : { uniqueShareId: targetFormId },
        include: { questions: { orderBy: { orderIndex: 'asc' } } }
      });
      if (!existingDbForm) {
        if (legacyFormId) return res.status(404).json({ error: 'Form not found' });
      } else if (!(await hasFormAccess(existingDbForm.id, req.user.id, ['admin', 'editor']))) {
        return res.status(403).json({ error: 'Forbidden. You do not have permission to modify this form.' });
      }
    }

    let parsedDocText = "";
    if (fileBuffer) {
      parsedDocText = await getOrParseDocument(
        fileBuffer,
        mimeType,
        req.file?.originalname || 'document',
        req.file?.size || 0
      );
      if (isImage) {
        const fileNameSnippet = req.file?.originalname ? `Uploaded Image File Name: ${req.file.originalname}. ` : '';
        parsedDocText = `${fileNameSnippet}${parsedDocText || 'Uploaded form image scan (read it from the attached image).'}`;
      }
    }

    const existingCanonical = existingDbForm ? canonicalFromDb(existingDbForm) : null;
    const spec = extractRequirementSpec(userPrompt, {
      existingForm: existingCanonical,
      formTypeHint,
      hasDocument: Boolean(fileBuffer),
      forceModify: Boolean(legacyFormId && existingDbForm)
    });

    if (spec.operation === 'converse') {
      const message = await conversationalReply(userPrompt, spec.language.name);
      return res.json({
        status: 'converse',
        operation: 'converse',
        message,
        suggestions: ['Restaurant food order form', 'Hotel booking form', 'Mixed-format Python exam']
      });
    }
    if (spec.operation === 'clarify') {
      return res.json({
        status: 'clarify',
        operation: 'clarify',
        message: spec.clarificationQuestion,
        suggestions: spec.clarificationSuggestions || [],
        requirements: { understood: describeSpec(spec), conflicts: spec.conflicts, unsupported: spec.unsupported }
      });
    }

    const isModify = spec.operation === 'modify' && Boolean(existingDbForm);

    if (req.user) {
      const user = await db.user.findUnique({ where: { id: req.user.id } });
      if (user && user.credits < 5) {
        return res.status(403).json({ error: 'Insufficient credits. AI generation requires at least 5 credits.' });
      }
      if (!isModify && user && user.subscriptionPlan === 'free') {
        const existingFormsCount = await db.form.count({ where: { ownerId: user.id } });
        if (existingFormsCount >= 5) {
          return res.status(403).json({
            error: 'Free plan limit reached. Free accounts are limited to 5 active forms.',
            status: 'restricted'
          });
        }
      }
    }

    const plan = planGeneration(spec);
    const systemInstruction = `${isImage ? `${buildImageScanSystemInstruction(userPrompt)}\n\n` : ''}${buildGenerationInstruction(spec, plan)}`;
    // Send the binary only with the first request (images, or PDFs whose text could not be extracted).
    const sendBinary = Boolean(fileBuffer) && (isImage || !parsedDocText.trim());
    let firstCall = true;
    const callModel = async (prompt: string) => {
      const buffer = firstCall && sendBinary ? fileBuffer : null;
      firstCall = false;
      return queryGemini(prompt, systemInstruction, buffer, mimeType);
    };

    let pipelineResult: PipelineResult;
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
        throw new Error('GEMINI_API_KEY is not configured.');
      }
      pipelineResult = await runRequirementPipeline({
        spec,
        existing: isModify ? existingCanonical : null,
        callModel,
        documentContext: isImage ? '' : parsedDocText
      });
    } catch (aiError: any) {
      console.warn('[AI Generate] AI provider unavailable, falling back to the local AIFormBrain engine:', aiError?.message);
      const localContext = { rawPrompt: userPrompt, normalizedPrompt: userPrompt.trim().toLowerCase(), isGreeting: false, isTranslation: Boolean(spec.edit?.translateTo), targetLang: spec.language.name, isRtl: spec.language.isRtl };
      const local = isModify
        ? AIFormBrain.processFollowUp(userPrompt, existingDbForm, localContext).formConfig
        : AIFormBrain.process(userPrompt, parsedDocText).formConfig;
      pipelineResult = await runRequirementPipeline({
        spec,
        existing: isModify ? existingCanonical : null,
        initialRaw: local,
        engine: 'local-fallback'
      });
    }

    const { form: artifact, report } = pipelineResult;
    if (artifact.questions.length === 0) {
      return res.status(502).json({ error: 'The AI did not produce any questions. Please try again or rephrase your request.', requirements: report });
    }
    if (optionLayout) artifact.settings.option_layout = optionLayout;

    const rows = toQuestionRows(artifact);
    const previousCategory = existingDbForm?.category ?? null;
    const category = artifact.isAssessment ? 'quiz' : (String(previousCategory || '').toLowerCase() === 'quiz' ? null : previousCategory);

    let fullForm: any;
    let creditsRemaining: number | undefined;
    if (req.user) {
      const userId = req.user.id;
      let savedFormId: string;
      if (isModify) {
        savedFormId = existingDbForm.id;
        await db.$transaction(async (tx: any) => {
          await tx.form.update({
            where: { id: existingDbForm.id },
            data: { title: artifact.title, description: artifact.description, settings: artifact.settings, theme: artifact.theme, category }
          });
          await FormsService.replaceQuestionsPreservingIds(tx, existingDbForm.id, rows);
        });
        await invalidateFormCache(existingDbForm.id, existingDbForm.uniqueShareId);
      } else {
        const shareCode = await generateUniqueShareId();
        const frontendBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:4500';
        const created = await db.$transaction(async (tx: any) => {
          const form = await tx.form.create({
            data: {
              title: artifact.title,
              description: artifact.description,
              status: "PUBLISHED",
              uniqueShareId: shareCode,
              publicUrl: `${frontendBaseUrl}/f/${shareCode}`,
              isPublic: true,
              ownerId: userId,
              category,
              settings: artifact.settings,
              theme: artifact.theme
            }
          });
          await FormsService.replaceQuestionsPreservingIds(tx, form.id, rows);
          await tx.analytics.create({
            data: { formId: form.id, views: 0, submissions: 0, deviceStats: { desktop: 0, mobile: 0, tablet: 0 }, countryStats: {}, dropoutRates: {} }
          });
          return form;
        });
        savedFormId = created.id;
      }
      fullForm = await db.form.findUnique({ where: { id: savedFormId }, include: { questions: { orderBy: { orderIndex: 'asc' } } } });
      const updatedUser = await db.user.update({ where: { id: userId }, data: { credits: { decrement: 5 } } }).catch(() => null);
      creditsRemaining = updatedUser?.credits;
    } else {
      // Guest preview: not persisted; saved through POST /forms when the guest signs in.
      fullForm = {
        id: `gen-${Date.now()}`,
        title: artifact.title,
        description: artifact.description,
        status: "DRAFT",
        isPublic: true,
        category,
        settings: artifact.settings,
        theme: artifact.theme,
        questions: rows.map((r, idx) => ({ ...r, id: `q_${idx}`, orderIndex: idx }))
      };
    }

    return res.json({
      status: 'success',
      operation: isModify ? 'modify' : 'create',
      message: isModify ? 'Form updated with your changes.' : 'Form generated successfully.',
      understandingSummary: {
        topic: spec.topic || spec.purpose,
        purpose: spec.purpose,
        formType: artifact.isAssessment ? 'Assessment' : spec.purpose,
        difficulty: spec.difficulty?.level || spec.difficulty?.mostly || 'mixed',
        questionCount: rows.length,
        summaryText: describeSpec(spec).join(' | ')
      },
      requirements: report,
      form: fullForm,
      creditsRemaining
    });
  } catch (error: any) {
    console.error('[AI Generate Route Error]:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Form generation failed. Please try again.' });
  }
});

/** Short conversational answer (greetings, "what can you do?") — never creates or edits a form. */
async function conversationalReply(prompt: string, language: string): Promise<string> {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    try {
      const instruction = `You are the assistant of PromptForm AI. Reply briefly (at most 70 words), warmly, in the same language and style the user wrote in (English, Gujarati, Hindi, Hinglish or Gujlish). Explain that you can create any data-collection form (food orders, hotel bookings, feedback surveys, job applications, registrations, appointments, returns, inquiries...) and graded quizzes or exam papers (MCQs, fill in the blanks, true/false, matching, short/long answers, coding, SQL and output-prediction questions), and edit them through follow-up messages. End with one example request. Plain text only, no JSON.`;
      const reply = await queryGemini(prompt, instruction, null, undefined, false);
      if (typeof reply === 'string' && reply.trim()) return reply.trim();
    } catch (_) {
      // fall through to the static reply
    }
  }
  if (language === 'gujarati') return 'નમસ્તે! હું કોઈપણ ફોર્મ (ફૂડ ઓર્ડર, હોટેલ બુકિંગ, ફીડબેક, નોકરી અરજી, રજીસ્ટ્રેશન) અથવા ગુણ સાથેની ક્વિઝ/પ્રશ્નપત્ર (MCQ, ખાલી જગ્યા, સાચું-ખોટું, કોડિંગ) બનાવી અને પછી તમારા સંદેશાથી બદલી શકું છું. ઉદાહરણ: "ધોરણ 8 વિજ્ઞાનના 20 MCQ".';
  if (language === 'hindi') return 'नमस्ते! मैं कोई भी फॉर्म (फ़ूड ऑर्डर, होटल बुकिंग, फीडबैक, नौकरी आवेदन, रजिस्ट्रेशन) या अंकों वाली क्विज़/प्रश्नपत्र (MCQ, रिक्त स्थान, सही-गलत, कोडिंग) बना सकता हूँ और आपके संदेशों से उसे बदल सकता हूँ। उदाहरण: "कक्षा 8 विज्ञान के 20 MCQ"।';
  return 'Hi! I can create any data-collection form (food orders, hotel bookings, feedback surveys, job applications, registrations, appointments) or a graded quiz / exam paper (MCQs, fill in the blanks, true/false, matching, short and long answers, coding and SQL questions), and then edit it through follow-up messages. Try: "Food order form for my restaurant" or "Python test with 10 MCQs and 5 coding problems".';
}

// POST: /ai/analyze-sentiment
router.post('/analyze-sentiment', authMiddleware, subscriptionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { formId } = req.body;
    if (!formId) {
      return res.status(400).json({ error: 'formId is required' });
    }
    const isFormUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId);
    let form = null;
    if (isFormUUID) {
      form = await db.form.findUnique({ where: { id: formId } });
    }
    if (!form) {
      form = await db.form.findUnique({ where: { uniqueShareId: formId } });
    }
    if (!form) return res.status(404).json({ error: 'Form not found' });
    const targetFormId = form.id;
    
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
      where: { formId: targetFormId }
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
      where: { formId: targetFormId },
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

// POST: /ai/chat-stream (Streaming AI assistant with SSE). Uses the same requirement pipeline as /ai/generate.
router.post('/chat-stream', authMiddleware, subscriptionMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  const send = (payload: any) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    if (!req.user) {
      send({ error: "Unauthorized" });
      return res.end();
    }

    const user = await db.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.credits < 5) {
      send({ error: "Insufficient credits. AI generation requires at least 5 credits." });
      return res.end();
    }

    // The original wording goes to the model; spelling recovery is only a hint for keyword matching.
    let rawPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.slice(0, 8000) : "";
    const formId = typeof req.body?.formId === 'string' && req.body.formId.trim() ? req.body.formId.trim() : undefined;
    const sessionId = req.body?.sessionId;
    const fileBuffer = req.file ? req.file.buffer : null;
    const mimeType = req.file ? normalizeMimeType(req.file.mimetype, req.file.originalname) : "application/pdf";
    const isImage = mimeType.startsWith('image/');

    if (!rawPrompt.trim() && fileBuffer) {
      rawPrompt = `Generate a form based on the uploaded file: ${req.file?.originalname || 'document'}`;
    }

    // Authorize before any of the form's content is placed in the AI context.
    let existingForm: any = null;
    if (formId) {
      existingForm = await db.form.findFirst({
        where: isUUID(formId) ? { id: formId } : { uniqueShareId: formId },
        include: { questions: { orderBy: { orderIndex: 'asc' } } }
      });
      if (!existingForm || !(await hasFormAccess(existingForm.id, req.user.id, ['admin', 'editor']))) {
        send({ error: "Forbidden. Form not found or you do not have edit access." });
        return res.end();
      }
    }

    const sessionKey = existingForm?.id || sessionId || `new_form_session_${req.user.id}`;
    const sessionContext = await EnterpriseContextEngine.registerUserMessage(sessionKey, rawPrompt);

    let docText = "";
    if (fileBuffer && !isImage) {
      docText = await getOrParseDocument(fileBuffer, mimeType, req.file?.originalname || 'document', req.file?.size || 0);
      if (existingForm) {
        await EnterpriseContextEngine.registerFileUpload(existingForm.id, req.file?.originalname || 'document', mimeType, docText.substring(0, 500));
      }
    }

    const existingCanonical = existingForm && existingForm.questions.length > 0 ? canonicalFromDb(existingForm) : null;
    const spec = extractRequirementSpec(rawPrompt, { existingForm: existingCanonical, hasDocument: Boolean(fileBuffer) });

    const looksConversational = spec.operation === 'converse' || (
      spec.operation === 'create' && !fileBuffer && !spec.signals.createVerb && !spec.signals.artifactNoun && !spec.signals.questionKinds
    );
    if (looksConversational) {
      let replyText = "Hi! Tell me what you would like to build — a form (orders, bookings, feedback, applications, registrations) or a graded quiz / exam — and I will create it. You can then edit it with follow-up messages.";
      if (process.env.GEMINI_API_KEY) {
        try {
          const casualInstruction = "You are a friendly assistant for PromptForm AI. Speak naturally and briefly in the same language the user is using (English, Gujarati, Hindi, Hinglish, Gujlish). Do not return JSON. Help them decide what form or quiz to build.";
          replyText = await queryGemini(rawPrompt, casualInstruction, null, undefined, false, sessionContext?.history || []);
        } catch (e) {}
      }
      send({ type: 'message', text: replyText });
      send({ type: 'pills', pills: ["Restaurant food order form", "Customer feedback survey", "Python quiz with 10 MCQs"] });
      return res.end();
    }
    if (spec.operation === 'clarify') {
      send({ type: 'message', text: spec.clarificationQuestion || 'Could you tell me a little more about what you need?' });
      if (spec.clarificationSuggestions?.length) send({ type: 'pills', pills: spec.clarificationSuggestions });
      return res.end();
    }

    const isModify = spec.operation === 'modify' && Boolean(existingCanonical);
    const understood = describeSpec(spec);
    send({ type: 'message', text: `✓ Understood:\n• ${understood.slice(0, 6).join('\n• ')}\n\nGenerating...` });

    const plan = planGeneration(spec);
    const systemInstruction = `${isImage ? `${buildImageScanSystemInstruction(rawPrompt)}\n\n` : ''}${buildGenerationInstruction(spec, plan)}`;
    const sendBinary = Boolean(fileBuffer) && (isImage || !docText.trim());
    let firstCall = true;
    const callModel = async (prompt: string) => {
      const buffer = firstCall && sendBinary ? fileBuffer : null;
      firstCall = false;
      return queryGemini(prompt, systemInstruction, buffer, mimeType);
    };

    let pipelineResult: PipelineResult;
    try {
      if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured.');
      pipelineResult = await runRequirementPipeline({ spec, existing: isModify ? existingCanonical : null, callModel, documentContext: docText });
    } catch (aiError: any) {
      console.warn('[AI Chat Stream] AI provider unavailable, falling back to the local engine:', aiError?.message);
      const localContext = { rawPrompt, normalizedPrompt: spellingRecovery(rawPrompt), isGreeting: false, isTranslation: Boolean(spec.edit?.translateTo), targetLang: spec.language.name, isRtl: spec.language.isRtl };
      const local = isModify
        ? AIFormBrain.processFollowUp(rawPrompt, existingForm, localContext).formConfig
        : AIFormBrain.process(rawPrompt, docText).formConfig;
      pipelineResult = await runRequirementPipeline({ spec, existing: isModify ? existingCanonical : null, initialRaw: local, engine: 'local-fallback' });
    }

    const { form: artifact, report } = pipelineResult;
    if (artifact.questions.length === 0) {
      send({ error: 'The AI did not produce any questions. Please rephrase your request.' });
      return res.end();
    }

    // Brand colours from a website mentioned in the prompt, and a topic banner for new forms.
    const urlMatch = rawPrompt.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/);
    if (!isModify && urlMatch && !/\S+@\S+/.test(rawPrompt)) {
      try {
        const extractedTheme = await extractThemeFromUrl(urlMatch[0]);
        artifact.theme = { ...artifact.theme, theme_name: extractedTheme.themeName, primary_color: extractedTheme.primaryColor, background_color: extractedTheme.backgroundColor };
      } catch (e) {
        console.error("Theme extraction failed:", e);
      }
    }
    const legacyDomain = artifact.isAssessment ? 'quiz' : spec.domain === 'medical_appointment' ? 'medical' : spec.domain === 'event_registration' ? 'rsvp' : spec.domain;
    if (/\b(?:remove|delete|hide|drop)\s+(?:the\s+)?(?:banner|header\s+image|cover\s+image|image|photo)s?\b/i.test(rawPrompt)) {
      artifact.theme.banner_url = null;
    } else if (!isModify && artifact.theme.banner_url === undefined) {
      artifact.theme.banner_url = getBannerUrlForDomain(legacyDomain, rawPrompt);
    }

    const rows = toQuestionRows(artifact);
    const previousCategory = existingForm?.category ?? null;
    const category = artifact.isAssessment ? 'quiz' : (String(previousCategory || '').toLowerCase() === 'quiz' ? null : previousCategory);

    // An opened (possibly empty) form is filled in place; otherwise a new draft is created.
    let savedFormId: string;
    if (existingForm) {
      savedFormId = existingForm.id;
      await db.$transaction(async (tx: any) => {
        await tx.form.update({
          where: { id: existingForm.id },
          data: { title: artifact.title, description: artifact.description || "", settings: artifact.settings, theme: artifact.theme, category }
        });
        await FormsService.replaceQuestionsPreservingIds(tx, existingForm.id, rows);
      });
      await invalidateFormCache(existingForm.id, existingForm.uniqueShareId);
      await EnterpriseContextEngine.registerAssistantMessage(existingForm.id, `Updated form "${artifact.title}" with ${rows.length} fields.`);
    } else {
      const created = await db.$transaction(async (tx: any) => {
        const form = await tx.form.create({
          data: { title: artifact.title, description: artifact.description || "", status: "DRAFT", ownerId: req.user!.id, category, settings: artifact.settings, theme: artifact.theme }
        });
        await FormsService.replaceQuestionsPreservingIds(tx, form.id, rows);
        await tx.analytics.create({
          data: { formId: form.id, views: 0, submissions: 0, deviceStats: { desktop: 0, mobile: 0, tablet: 0 }, countryStats: {}, dropoutRates: {} }
        });
        return form;
      });
      savedFormId = created.id;
    }

    await db.user.update({ where: { id: req.user.id }, data: { credits: { decrement: 5 } } });

    const fullForm = await db.form.findUnique({
      where: { id: savedFormId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    });

    const verdict = report.complete
      ? `✨ ${isModify ? 'Form updated' : 'Form created'} — all ${report.checks.length} requirement checks passed.`
      : `⚠️ ${isModify ? 'Form updated' : 'Form created'}, but some requirements could not be met:\n• ${report.unmet.slice(0, 5).join('\n• ')}`;
    send({ type: 'message', text: verdict });
    send({
      type: 'form',
      form: fullForm,
      requirements: report,
      understandingSummary: {
        topic: spec.topic || spec.purpose,
        purpose: spec.purpose,
        formType: artifact.isAssessment ? 'Assessment' : spec.purpose,
        difficulty: spec.difficulty?.level || spec.difficulty?.mostly || 'mixed',
        questionCount: rows.length
      },
      suggestions: artifact.isAssessment
        ? ["Add 5 more questions", "Make question 1 harder", "Add solutions at the end"]
        : ["Make email mandatory", "Add a comments field", "Translate the form into Gujarati"]
    });
    res.end();
  } catch (error: any) {
    console.error("Chat Stream generation error:", error);
    send({ error: "Failed to generate the form. Please try again." });
    res.end();
  }
});

export default router;
