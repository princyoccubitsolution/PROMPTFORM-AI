const fs = require('fs');
const path = require('path');
const {
  p, h1, h2, h3, bullet, codeBlock, embedImage, createTable, calloutBox,
  PRIMARY, SECONDARY, ACCENT, DARK_TEXT, BORDER_COLOR,
  Paragraph, PageBreak
} = require('./report_utils');

function getCodeWalkthroughs() {
  const c = [];

  c.push(
    h1("APPENDIX I: IN-DEPTH SOURCE CODE ARCHITECTURAL WALKTHROUGHS"),
    p("To provide exhaustive technical evidence for academic evaluation, this appendix provides comprehensive, annotated source code walkthroughs of the primary core modules in PromptForm AI: the AI generation engine, intent engine, response management & quiz service, and PostgreSQL Prisma schema."),

    h2("I.1 AI Generation & Multimodal Router (`backend/src/routes/ai.ts`)"),
    p("The AI generation route coordinates incoming prompts, handles Multer memory file streaming, validates user credit quotas (5 credits per generation), interfaces with Google Gemini REST endpoints, and invokes fallback mechanisms."),
    ...codeBlock(`// File: backend/src/routes/ai.ts (Excerpts)
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { subscriptionMiddleware } from '../middlewares/subscription';
import { detectIntent, spellingRecovery } from '../lib/intentEngine';
import { AIFormBrain } from '../lib/aiBrain';
import { parseDocumentBuffer } from '../lib/documentParser';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max limit
});

router.post('/generate', authMiddleware, subscriptionMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { prompt, formId } = req.body;
    const file = req.file;

    // Credit Verification: Minimum 5 credits required
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < 5) {
      return res.status(403).json({ error: 'Insufficient credits. AI Form generation requires 5 credits.' });
    }

    let extractedText = '';
    let isMultimodal = false;

    if (file) {
      isMultimodal = true;
      extractedText = await parseDocumentBuffer(file.buffer, file.mimetype);
    }

    const cleanedPrompt = spellingRecovery(prompt || extractedText || 'General Feedback Form');
    const intent = detectIntent(cleanedPrompt);

    // Call Google Gemini REST Endpoint
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    let generatedFormJson = null;

    if (GEMINI_API_KEY) {
      try {
        const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${GEMINI_API_KEY}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: \`Generate a JSON form for: \${cleanedPrompt}. Domain: \${intent.category}. Format strictly as JSON.\`
              }]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (response.ok) {
          const data = await response.json();
          generatedFormJson = JSON.parse(data.candidates[0].content.parts[0].text);
        }
      } catch (err) {
        console.warn('Gemini REST API error, falling back to AIFormBrain:', err.message);
      }
    }

    // Cognitive Fallback Brain if LLM unavailable
    if (!generatedFormJson) {
      generatedFormJson = AIFormBrain.generateForm(intent);
    }

    // Deduct 5 credits and persist form in PostgreSQL
    await db.user.update({
      where: { id: userId },
      data: { credits: { decrement: 5 } }
    });

    const savedForm = await db.form.create({
      data: {
        title: generatedFormJson.title || 'Untitled Form',
        description: generatedFormJson.description || '',
        ownerId: userId,
        status: 'DRAFT',
        category: intent.category,
        theme: generatedFormJson.theme || {},
        settings: generatedFormJson.settings || {},
        questions: {
          create: generatedFormJson.questions.map((q: any, idx: number) => ({
            type: q.type || 'short_text',
            label: q.label,
            required: !!q.required,
            orderIndex: idx,
            options: q.options || [],
            validations: q.validations || {}
          }))
        }
      },
      include: { questions: true }
    });

    return res.status(200).json({ success: true, form: savedForm });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error during form generation' });
  }
});

export default router;`),

    h2("I.2 Intent Engine & Spelling Normalization (`backend/src/lib/intentEngine.ts`)"),
    p("The intent engine cleans slang and typos and maps user requirements to 13 domain categories and 11 field widget types."),
    ...codeBlock(`// File: backend/src/lib/intentEngine.ts (Excerpts)
export function spellingRecovery(text: string): string {
  let cleaned = text.toLowerCase().replace(/\\s+/g, " ").trim();
  cleaned = cleaned.replace(/\\b(sturcture|structur|strcture|stucture|datastructure)\\b/g, "structure");
  cleaned = cleaned.replace(/\\b(clg|colg|colleg)\\b/g, "college");
  cleaned = cleaned.replace(/\\b(squert|survet|survay|surviy|surve|reviw|feedbackk)\\b/g, "survey");
  cleaned = cleaned.replace(/\\b(quz|qiz|quizz|quize)\\b/g, "quiz");
  cleaned = cleaned.replace(/\\b(regitration|regis|ragistration)\\b/g, "registration");
  cleaned = cleaned.replace(/\\b(banavo|bnao|banao|banado|likho|tayyar karo)\\b/g, "generate");
  return cleaned;
}

export function detectIntent(text: string): IntentResult {
  const lower = text.toLowerCase();
  let category: IntentResult['category'] = 'general';

  if (lower.includes('quiz') || lower.includes('exam') || lower.includes('test') || lower.includes('mcq')) category = 'quiz';
  else if (lower.includes('survey') || lower.includes('feedback') || lower.includes('rating')) category = 'survey';
  else if (lower.includes('doctor') || lower.includes('patient') || lower.includes('clinic') || lower.includes('medical')) category = 'medical';
  else if (lower.includes('job') || lower.includes('career') || lower.includes('resume') || lower.includes('hiring')) category = 'job';
  else if (lower.includes('rsvp') || lower.includes('event') || lower.includes('wedding')) category = 'rsvp';

  return {
    category,
    topic: text.slice(0, 50),
    purpose: \`Data acquisition for \${category} domain\`,
    formType: category === 'quiz' ? 'assessment' : 'data_collection',
    difficulty: 'Intermediate',
    questionCount: category === 'quiz' ? 10 : 8,
    normalizedPrompt: text,
    industry: category,
    expandedFields: ['name', 'email', 'phone', 'feedback', 'rating'],
    relevanceRules: {
      allowGenericIdentity: true,
      requireQuizValidation: category === 'quiz'
    },
    understandingSummary: {
      topic: text.slice(0, 30),
      purpose: category,
      formType: 'interactive_web_form',
      difficulty: 'Intermediate',
      questionCount: 8,
      summaryText: \`Synthesizing \${category} form with optimized widget types.\`
    }
  };
}`),

    h2("I.3 Response Runner & Anti-Cheat Quiz Scoring (`backend/src/routes/forms.ts`)"),
    p("The response runner handles unauthenticated public submissions, checks server-side passwords, enforces required questions, tracks anti-cheat tab switches, and computes weighted scores."),
    ...codeBlock(`// File: backend/src/routes/forms.ts (Excerpts)
router.post('/:id/submit', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { answers, browserMetadata, password } = req.body;

  const form = await db.form.findUnique({
    where: { id },
    include: { questions: true }
  });

  if (!form || form.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Form not found or closed for responses.' });
  }

  // Server-Side Password Protection Check
  const settings = parseSettings(form.settings);
  if (settings.passwordProtected && settings.password !== password) {
    return res.status(403).json({ error: 'Incorrect form password' });
  }

  // Required Questions Validation Check
  const missingRequired = form.questions
    .filter(q => q.required && (!answers[q.id] || answers[q.id].toString().trim() === ''))
    .map(q => q.id);

  if (missingRequired.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', missingFieldIds: missingRequired });
  }

  // Anti-Cheat Telemetry: Tab-Switch Detection
  const tabSwitches = browserMetadata?.tabSwitches || 0;
  const isFlagged = tabSwitches > (settings.maxAllowedTabSwitches || 3);

  // Compute Quiz Score if Form is Graded Quiz
  let totalScore = 0;
  let maxScore = 0;
  if (form.category === 'quiz') {
    form.questions.forEach(q => {
      const validations = q.validations as any;
      if (validations && validations.correct_answer) {
        maxScore += (validations.points || 1);
        if (answers[q.id] === validations.correct_answer) {
          totalScore += (validations.points || 1);
        }
      }
    });
  }

  // Save Response in PostgreSQL
  const savedResponse = await db.response.create({
    data: {
      formId: form.id,
      answers: answers,
      browserMetadata: { ...browserMetadata, isFlagged, totalScore, maxScore },
      email: answers['email'] || req.body.email || null,
      timeTaken: browserMetadata?.timeTaken || 0
    }
  });

  return res.status(201).json({ success: true, responseId: savedResponse.id, score: totalScore, isFlagged });
});`),

    h2("I.4 PostgreSQL Prisma Relational Schema (`backend/prisma/schema.prisma`)"),
    p("The complete Prisma schema modeling users, forms, questions, responses, analytics, and team collaboration."),
    ...codeBlock(`// File: backend/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                 String           @id @default(uuid())
  email              String           @unique
  name               String?
  password           String
  role               String           @default("user")
  subscriptionPlan   String           @default("free")
  credits            Int              @default(100)
  activeSessionToken String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  forms              Form[]
  teams              Team[]
  teamMembers        TeamMember[]
}

model Form {
  id            String       @id @default(uuid())
  title         String
  description   String?
  status        String       @default("DRAFT")
  category      String       @default("general")
  settings      Json?        @default("{}")
  theme         Json?        @default("{}")
  uniqueShareId String       @unique @default(uuid())
  responseLimit Int?
  ownerId       String
  owner         User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  questions     Question[]
  responses     Response[]
  analytics     Analytics?
  workflows     Workflow[]
  formEvents    FormEvent[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

model Question {
  id          String   @id @default(uuid())
  formId      String
  form        Form     @relation(fields: [formId], references: [id], onDelete: Cascade)
  type        String
  label       String
  required    Boolean  @default(false)
  orderIndex  Int
  options     Json?    @default("[]")
  validations Json?    @default("{}")
  logic       Json?    @default("{}")
}

model Response {
  id              String   @id @default(uuid())
  formId          String
  form            Form     @relation(fields: [formId], references: [id], onDelete: Cascade)
  answers         Json
  browserMetadata Json?
  email           String?
  timeTaken       Int?
  createdAt       DateTime @default(now())
}

model Analytics {
  id          String   @id @default(uuid())
  formId      String   @unique
  form        Form     @relation(fields: [formId], references: [id], onDelete: Cascade)
  views       Int      @default(0)
  submissions Int      @default(0)
  deviceStats Json?    @default("{}")
}

model Workflow {
  id      String  @id @default(uuid())
  formId  String
  form    Form    @relation(fields: [formId], references: [id], onDelete: Cascade)
  trigger String
  action  String
  config  Json
  active  Boolean @default(true)
}

model FormEvent {
  id        String   @id @default(uuid())
  formId    String
  form      Form     @relation(fields: [formId], references: [id], onDelete: Cascade)
  eventType String
  device    String?
  createdAt DateTime @default(now())
  @@index([formId, eventType, createdAt])
}`),
    new Paragraph({ children: [new PageBreak()] })
  );

  return c;
}

module.exports = { getCodeWalkthroughs };
