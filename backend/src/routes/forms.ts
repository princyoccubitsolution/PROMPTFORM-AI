import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { subscriptionMiddleware } from '../middlewares/subscription';
import { isUUID, generateUniqueShareId, hasFormAccess } from '../lib/utils';
import { FormsService } from '../services/formsService';
import { AnalyticsService } from '../services/analyticsService';

const router = Router();

interface LiveNotification {
  id: string;
  userId: string;
  text: string;
  time: string;
  read: boolean;
}

export const inMemoryNotifications: LiveNotification[] = [
  { id: "mock_1", userId: "all_users", text: "Welcome to PromptForm AI! Your dashboard is ready.", time: "1h ago", read: false }
];

const validateUuidMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!isUUID(id)) {
    return res.status(400).json({ error: 'Invalid form identifier format. Must be a valid UUID.' });
  }
  next();
};

const formSettingsSchema = z.object({
  collect_emails: z.boolean().default(false),
  limit_responses: z.boolean().default(false),
  password: z.string().nullable().default(null),
  allow_editing: z.boolean().default(false),
  shuffle_questions: z.boolean().default(false),
  shuffle_options: z.boolean().default(false),
  timer_limit: z.coerce.number().default(0), // 0 means no limit, otherwise minutes/seconds
  anti_cheat_detection: z.boolean().default(false),
  team_members_only: z.boolean().default(false),
  invited_only: z.boolean().default(false),
  invited_emails: z.array(z.string()).default([]),
  display_mode: z.enum(["full", "wizard", "chat"]).default("full"),
  displayMode: z.enum(["full", "wizard", "chat"]).optional()
});

const formThemeSchema = z.object({
  primary_color: z.string().default("#8B6B55"),
  background_color: z.string().default("#FAF6EF"),
  font_family: z.string().default("Inter"),
  logo_url: z.string().nullable().default(null),
  banner_url: z.string().nullable().optional(),
  theme_name: z.string().optional(),
  layoutType: z.string().optional(),
  rtl: z.boolean().optional()
});

const createFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teamId: z.string().nullable().optional(),
  settings: formSettingsSchema.optional(),
  theme: formThemeSchema.optional(),
  isPublic: z.boolean().optional(),
  responseLimit: z.number().nullable().optional()
});

const updateFormSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
  settings: formSettingsSchema.optional(),
  theme: formThemeSchema.optional(),
  teamId: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  responseLimit: z.number().nullable().optional()
});

const questionItemSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  label: z.string(),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  validations: z.any().default({}),
  logic: z.any().default({}),
});

const submitResponseSchema = z.object({
  answers: z.record(z.any()),
  browserMetadata: z.object({
    user_agent: z.string(),
    ip_address: z.string().optional(),
    tab_switches: z.number().default(0),
    is_flagged: z.boolean().default(false)
  }),
  timeTaken: z.number(),
  email: z.string().email().optional().nullable(),
  submittedBy: z.string().optional().nullable()
});

// 1. GET ALL FORMS OF THE USER (Owned or Team shared) with backward-compatible pagination
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch teams user belongs to
    const memberTeams = await db.teamMember.findMany({
      where: { userId: req.user.id },
      select: { teamId: true }
    });
    const teamIds = memberTeams.map((t: any) => t.teamId);

    const limitParam = req.query.limit;
    const pageParam = req.query.page;

    if (limitParam === undefined && pageParam === undefined) {
      // Unpaginated plain array for backward compatibility
      const forms = await db.form.findMany({
        where: {
          OR: [
            { ownerId: req.user.id },
            { teamId: { in: teamIds } }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { responses: true }
          }
        }
      });
      return res.json(forms);
    }

    const page = parseInt(pageParam as string) || 1;
    const limit = Math.min(parseInt(limitParam as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [forms, totalCount] = await Promise.all([
      db.form.findMany({
        where: {
          OR: [
            { ownerId: req.user.id },
            { teamId: { in: teamIds } }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { responses: true }
          }
        }
      }),
      db.form.count({
        where: {
          OR: [
            { ownerId: req.user.id },
            { teamId: { in: teamIds } }
          ]
        }
      })
    ]);

    return res.json({
      data: forms,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// LIVE NOTIFICATIONS (must precede /:id)
router.get('/notifications/live', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userNotifications = inMemoryNotifications.filter(n => n.userId === req.user!.id || n.userId === 'all_users');
    return res.json(userNotifications);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notifications/live/read-all', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    inMemoryNotifications.forEach(n => {
      if (n.userId === req.user!.id || n.userId === 'all_users') {
        n.read = true;
      }
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET FORM BY ID (Public details vs Authenticated editor details)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isFormUUID = isUUID(id);

    let form = null;
    if (isFormUUID) {
      form = await db.form.findUnique({
        where: { id },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      });
    }

    if (!form) {
      // Try search by uniqueShareId
      form = await db.form.findUnique({
        where: { uniqueShareId: id },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      });
    }

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Auto-generate uniqueShareId if missing
    if (!form.uniqueShareId) {
      const code = await generateUniqueShareId();
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:4500';
      const publicUrl = `${frontendBaseUrl}/f/${code}`;

      form = await db.form.update({
        where: { id: form.id },
        data: {
          uniqueShareId: code,
          publicUrl: publicUrl
        },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      });
    }

    // Guard: mask questions if form is password-protected and correct password not provided
    const formPassword = (form.settings as any)?.password;
    if (formPassword) {
      const providedPassword = req.headers['x-form-password'] || req.query.password;
      let isOwner = false;
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as any;
          if (decoded.id === form.ownerId) isOwner = true;
        }
      } catch (_) {}

      if (!isOwner && providedPassword !== formPassword) {
        return res.json({
          ...form,
          questions: [],
          passwordRequired: true,
          isLocked: true
        });
      }
    }

    return res.json(form);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authMiddleware, subscriptionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const body = createFormSchema.parse(req.body);

    const form = await FormsService.createForm(req.user.id, body);

    return res.status(201).json(form);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. UPDATE FORM DETAILS (Supports both PUT and PATCH)
const updateFormHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const body = updateFormSchema.parse(req.body);

    const form = await db.form.findUnique({ where: { id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    if (!(await hasFormAccess(id, req.user.id, ['admin', 'editor']))) {
      return res.status(403).json({ error: 'Forbidden. You do not have edit rights.' });
    }

    // Auto-generate uniqueShareId and publicUrl if status changes to PUBLISHED and it doesn't exist yet
    let uniqueShareId = form.uniqueShareId;
    let publicUrl = form.publicUrl;
    if (body.status === 'PUBLISHED' && !uniqueShareId) {
      const code = await generateUniqueShareId();
      uniqueShareId = code;
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:4500';
      publicUrl = `${frontendBaseUrl}/f/${code}`;
    }

    const updatedForm = await db.form.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        settings: body.settings ? { ...(typeof form.settings === 'object' && form.settings ? (form.settings as any) : {}), ...body.settings } : undefined,
        theme: body.theme ? { ...(typeof form.theme === 'object' && form.theme ? (form.theme as any) : {}), ...body.theme } : undefined,
        teamId: body.teamId,
        isPublic: body.isPublic !== undefined ? body.isPublic : undefined,
        responseLimit: body.responseLimit !== undefined ? body.responseLimit : undefined,
        uniqueShareId: uniqueShareId !== form.uniqueShareId ? uniqueShareId : undefined,
        publicUrl: publicUrl !== form.publicUrl ? publicUrl : undefined
      }
    });

    return res.json(updatedForm);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

router.put('/:id', authMiddleware, validateUuidMiddleware, updateFormHandler);
router.patch('/:id', authMiddleware, validateUuidMiddleware, updateFormHandler);

// 5. BULK REPLACE QUESTIONS LIST
router.put('/:id/questions', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const questionsList = z.array(questionItemSchema).parse(req.body);

    const form = await db.form.findUnique({ where: { id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Verify ownership or team permissions
    if (!(await hasFormAccess(id, req.user.id, ['admin', 'editor']))) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to modify questions.' });
    }

    // Differential upsert: update existing, create new, delete removed — preserves question UUIDs & foreign key references
    await db.$transaction(async (tx: any) => {
      const existingQuestions = await tx.question.findMany({ where: { formId: id }, select: { id: true } });
      const existingIds = new Set<string>(existingQuestions.map((q: any) => q.id));
      const incomingIds = new Set<string>(questionsList.filter(q => q.id && isUUID(q.id)).map(q => q.id!));

      // 1. Delete questions that are no longer in the incoming list
      const idsToDelete = [...existingIds].filter((eid: string) => !incomingIds.has(eid));
      if (idsToDelete.length > 0) {
        await tx.question.deleteMany({ where: { id: { in: idsToDelete }, formId: id } });
      }

      // 2. Upsert each question: update if exists, create if new
      for (let idx = 0; idx < questionsList.length; idx++) {
        const q = questionsList[idx];
        const qId = q.id && isUUID(q.id) ? q.id : undefined;
        const data = {
          formId: id,
          type: q.type,
          label: q.label,
          required: q.required,
          orderIndex: idx,
          options: q.options,
          validations: q.validations,
          logic: q.logic
        };
        if (qId && existingIds.has(qId)) {
          await tx.question.update({ where: { id: qId }, data });
        } else {
          await tx.question.create({ data: { ...(qId ? { id: qId } : {}), ...data } });
        }
      }
    });

    const updatedQuestions = await db.question.findMany({
      where: { formId: id },
      orderBy: { orderIndex: 'asc' }
    });

    return res.json(updatedQuestions);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. DELETE FORM
router.delete('/:id', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const form = await db.form.findUnique({ where: { id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });
    // Verify ownership or team permissions
    if (!(await hasFormAccess(id, req.user.id, ['admin']))) {
      return res.status(403).json({ error: 'Forbidden. Admin rights required to delete team forms.' });
    }

    await db.form.delete({ where: { id } });
    return res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Student Identity Extraction Helpers
export const extractEnrollmentNumber = (answers: Record<string, any>, questions: any[] = []): string => {
  if (!answers) return '';
  if (answers.enrollment_no && String(answers.enrollment_no).trim()) return String(answers.enrollment_no).trim();
  if (answers.enrollment && String(answers.enrollment).trim()) return String(answers.enrollment).trim();
  if (answers.roll_no && String(answers.roll_no).trim()) return String(answers.roll_no).trim();
  if (answers.student_id && String(answers.student_id).trim()) return String(answers.student_id).trim();
  if (answers.gr_no && String(answers.gr_no).trim()) return String(answers.gr_no).trim();
  if (answers.gr_number && String(answers.gr_number).trim()) return String(answers.gr_number).trim();

  // Search questions
  const q = questions.find((item: any) => {
    const label = (item.label || '').toLowerCase();
    const qid = (item.id || '').toLowerCase();
    return (
      label.includes('enrollment') ||
      label.includes('roll') ||
      label.includes('student id') ||
      label.includes('student_id') ||
      label.includes('gr number') ||
      label.includes('reg no') ||
      label.includes('registration no') ||
      label.includes('seat no') ||
      qid.includes('enrollment') ||
      qid.includes('roll') ||
      qid === 'field_enrollment_no'
    );
  });
  if (q && answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim()) {
    return String(answers[q.id]).trim();
  }

  // Scan answers keys
  for (const [k, v] of Object.entries(answers)) {
    if (v !== undefined && v !== null && String(v).trim()) {
      const lk = k.toLowerCase();
      if (lk.includes('enrollment') || lk.includes('roll') || lk.includes('student_id') || lk.includes('gr_no')) {
        return String(v).trim();
      }
    }
  }

  return '';
};

export const extractStudentName = (answers: Record<string, any>, questions: any[] = [], explicitName?: string | null): string => {
  if (explicitName && explicitName.trim() && explicitName.toLowerCase() !== 'anonymous') {
    return explicitName.trim();
  }
  if (!answers) return 'Anonymous';
  if (answers.student_name && String(answers.student_name).trim()) return String(answers.student_name).trim();
  if (answers.fullName && String(answers.fullName).trim()) return String(answers.fullName).trim();
  if (answers.name && String(answers.name).trim()) return String(answers.name).trim();

  // Search questions
  const q = questions.find((item: any) => {
    const label = (item.label || '').toLowerCase();
    const qid = (item.id || '').toLowerCase();
    return (
      item.type === 'name' ||
      qid.includes('student_name') ||
      qid === 'field_student_name' ||
      label === 'student name' ||
      label === 'full name' ||
      label === 'name' ||
      label.includes('student name') ||
      label.includes('full name') ||
      (label.includes('name') && !label.includes('file') && !label.includes('user') && !label.includes('company'))
    );
  });
  if (q && answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim()) {
    return String(answers[q.id]).trim();
  }

  // Scan answers keys
  for (const [k, v] of Object.entries(answers)) {
    if (v !== undefined && v !== null && String(v).trim()) {
      const lk = k.toLowerCase();
      if (lk === 'name' || lk.includes('student_name') || lk.includes('fullname')) {
        return String(v).trim();
      }
    }
  }

  return 'Anonymous';
};

export const extractStudentEmail = (answers: Record<string, any>, questions: any[] = [], explicitEmail?: string | null): string => {
  if (explicitEmail && explicitEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(explicitEmail.trim())) {
    return explicitEmail.trim();
  }
  if (!answers) return '';
  if (answers.responder_email && String(answers.responder_email).trim()) return String(answers.responder_email).trim();
  if (answers.email && String(answers.email).trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(answers.email).trim())) {
    return String(answers.email).trim();
  }
  if (answers.student_email && String(answers.student_email).trim()) return String(answers.student_email).trim();

  // Search questions
  const q = questions.find((item: any) => {
    const label = (item.label || '').toLowerCase();
    const qid = (item.id || '').toLowerCase();
    return (
      item.type === 'email' ||
      qid.includes('email') ||
      qid === 'field_student_email' ||
      label.includes('email') ||
      label.includes('e-mail')
    );
  });
  if (q && answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim()) {
    const val = String(answers[q.id]).trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return val;
  }

  // Scan answers keys
  for (const [, v] of Object.entries(answers)) {
    if (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
      return v.trim();
    }
  }

  return '';
};

// 7. PUBLIC RESPONSE SUBMISSION
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answers, browserMetadata, timeTaken, email, submittedBy } = submitResponseSchema.parse(req.body);
    const isFormUUID = isUUID(id);

    let form = null;
    if (isFormUUID) {
      form = await db.form.findUnique({ where: { id } });
    }
    if (!form) {
      form = await db.form.findUnique({ where: { uniqueShareId: id } });
    }
    if (!form) return res.status(404).json({ error: 'Form not found' });

    if (form.status !== 'PUBLISHED') {
      if (form.status === 'DRAFT') {
        return res.status(400).json({ error: 'This form is currently a draft and cannot accept responses.' });
      }
      if (form.status === 'CLOSED') {
        return res.status(400).json({ error: 'This form has been closed and is not accepting responses anymore.' });
      }
      return res.status(400).json({ error: 'This form is not accepting responses anymore.' });
    }

    // Verify form password if password protection is configured
    const formPassword = (form.settings as any)?.password;
    if (formPassword) {
      const submittedPassword = req.body.password || req.headers['x-form-password'];
      if (!submittedPassword || submittedPassword !== formPassword) {
        return res.status(403).json({ error: 'This form is password protected. Correct password is required.' });
      }
    }

    // Fetch form questions
    const formQuestions = await db.question.findMany({ where: { formId: form.id } });
    const isForceSubmit = Boolean(req.body.isForceSubmit || req.body.isTimeExpired || (req.body.browserMetadata?.is_flagged && Number(req.body.browserMetadata?.tab_switches) >= 3));

    // Extract normalized student identity data
    const answersMap = (answers as Record<string, any>) || {};
    const resolvedEnrollmentNo = extractEnrollmentNumber(answersMap, formQuestions);
    const resolvedStudentName = extractStudentName(answersMap, formQuestions, submittedBy || req.body.submittedBy);
    const resolvedEmail = extractStudentEmail(answersMap, formQuestions, email || req.body.email);

    // Auto-detect Quiz or Student Assessment
    const isQuizOrStudent = Boolean(
      form.category === 'quiz' || 
      form.category === 'education' ||
      form.title.toLowerCase().includes('quiz') || 
      form.title.toLowerCase().includes('test') || 
      form.title.toLowerCase().includes('exam') || 
      form.title.toLowerCase().includes('student') ||
      formQuestions.some((q: any) => {
        const l = (q.label || '').toLowerCase();
        return l.includes('enrollment') || l.includes('roll') || l.includes('student id');
      })
    );

    // Validate required questions (skip if forced auto-submit due to timer expiration or anti-cheat violation)
    if (!isForceSubmit) {
      // 1. Enforce Mandatory Student Identity for Quizzes/Student Forms
      if (isQuizOrStudent) {
        const missingIdentity: string[] = [];
        if (!resolvedStudentName || resolvedStudentName === 'Anonymous') {
          missingIdentity.push('Student Name');
        }
        if (!resolvedEnrollmentNo) {
          missingIdentity.push('Enrollment Number');
        }
        if (!resolvedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
          missingIdentity.push('Valid Email Address');
        }
        if (missingIdentity.length > 0) {
          return res.status(400).json({
            error: `Mandatory field(s) missing: ${missingIdentity.join(', ')}. Please provide all required details before submitting.`,
            missingFields: missingIdentity
          });
        }
      }

      // 2. Standard required question validations
      const missingRequired: string[] = [];
      for (const q of formQuestions) {
        if (q.required) {
          let isVisible = true;
          const logic = q.logic as any;
          if (logic && logic.condition && logic.target_question_id) {
            const targetVal = String(logic.condition.value || '').toLowerCase().trim();
            const currentAns = answers[logic.target_question_id];
            if (currentAns === undefined || currentAns === null || String(currentAns).trim() === '') {
              isVisible = logic.action !== 'show';
            } else {
              const operator = logic.condition.operator || 'equals';
              let isMatch = false;
              if (Array.isArray(currentAns)) {
                const lowerArr = currentAns.map((v: any) => String(v).toLowerCase().trim());
                if (operator === 'contains' || operator === 'equals') {
                  isMatch = lowerArr.includes(targetVal);
                } else if (operator === 'not_equals') {
                  isMatch = !lowerArr.includes(targetVal);
                }
              } else {
                const currentStr = String(currentAns).toLowerCase().trim();
                if (operator === 'equals') isMatch = currentStr === targetVal;
                else if (operator === 'not_equals') isMatch = currentStr !== targetVal;
                else if (operator === 'contains') isMatch = currentStr.includes(targetVal);
              }
              if (logic.action === 'show') isVisible = isMatch;
              else if (logic.action === 'hide') isVisible = !isMatch;
            }
          }

          if (isVisible) {
            const ans = answers[q.id];
            if (ans === undefined || ans === null || String(ans).trim() === '' || (Array.isArray(ans) && ans.length === 0)) {
              missingRequired.push(q.label || q.id);
            }
          }
        }
      }
      if (missingRequired.length > 0) {
        return res.status(400).json({
          error: `Please provide required answers for: ${missingRequired.join(', ')}`,
          missingFields: missingRequired
        });
      }
    }

    // Check responseLimit
    if (form.responseLimit && form.responseLimit > 0) {
      const currentCount = await db.response.count({ where: { formId: form.id } });
      if (currentCount >= form.responseLimit) {
        await db.form.update({
          where: { id: form.id },
          data: { status: 'CLOSED' }
        });
        return res.status(400).json({ error: 'This form has reached its response limit and is now closed.' });
      }
    }

    // Check Single Submission Restriction (Limit to 1 response per student / browser session / email)
    const limitResponses = Boolean((form.settings as any)?.limit_responses || isQuizOrStudent);
    if (limitResponses) {
      // Check duplicate by email
      if (resolvedEmail) {
        const existingByEmail = await db.response.findFirst({
          where: {
            formId: form.id,
            email: { equals: resolvedEmail.trim(), mode: 'insensitive' }
          }
        });
        if (existingByEmail) {
          return res.status(400).json({
            error: 'You have already submitted this form.',
            alreadySubmitted: true
          });
        }
      }

      // Check duplicate by enrollment number
      if (resolvedEnrollmentNo) {
        const existingResponses = await db.response.findMany({
          where: { formId: form.id },
          select: { id: true, answers: true }
        });
        const duplicateEnrollment = existingResponses.some((r: any) => {
          const exEnroll = extractEnrollmentNumber((r.answers as Record<string, any>) || {}, formQuestions);
          return exEnroll && exEnroll.toLowerCase() === resolvedEnrollmentNo.toLowerCase();
        });
        if (duplicateEnrollment) {
          return res.status(400).json({
            error: `A submission for Enrollment Number "${resolvedEnrollmentNo}" has already been recorded.`,
            alreadySubmitted: true
          });
        }
      }
    }

    // Check Access Control: if not public, check constraints
    const isPublic = form.isPublic;
    if (!isPublic) {
      const isTeamOnly = (form.settings as any)?.team_members_only || false;
      const isInvitedOnly = (form.settings as any)?.invited_only || false;

      let currentUser: any = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET!);
          currentUser = await db.user.findUnique({ where: { id: decoded.id } });
        } catch (e) {}
      }

      if (isTeamOnly) {
        if (!currentUser) {
          return res.status(401).json({ error: 'Authentication required. This form is restricted to team members.' });
        }
        if (form.teamId) {
          const membership = await db.teamMember.findUnique({
            where: { teamId_userId: { teamId: form.teamId, userId: currentUser.id } }
          });
          if (!membership) {
            return res.status(403).json({ error: 'Access denied. You must be a member of the form\'s workspace team.' });
          }
        } else if (form.ownerId !== currentUser.id) {
          return res.status(403).json({ error: 'Access denied. Only the owner can fill this form.' });
        }
      } else if (isInvitedOnly) {
        const invitedEmails = (form.settings as any)?.invited_emails || [];
        const currentEmail = resolvedEmail || currentUser?.email;
        if (!currentEmail || !invitedEmails.includes(currentEmail.toLowerCase())) {
          return res.status(403).json({ error: 'Access denied. You are not on the invited list for this form.' });
        }
      }
    }

    // Resolve real client IP address (supporting reverse proxies like Render / Cloudflare)
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '';
    const finalBrowserMetadata = {
      ...browserMetadata,
      ip_address: browserMetadata?.ip_address && browserMetadata.ip_address !== '127.0.0.1' ? browserMetadata.ip_address : rawIp,
      ...(isForceSubmit ? { auto_submitted: true, auto_submit_reason: req.body.isTimeExpired ? 'timer_expired' : 'anti_cheat_violation' } : {})
    };

    // Save user response with guaranteed student identity mapping
    const response = await db.response.create({
      data: {
        formId: form.id,
        answers: {
          ...answers,
          ...(resolvedEnrollmentNo ? { enrollment_no: resolvedEnrollmentNo } : {}),
          ...(resolvedStudentName && resolvedStudentName !== 'Anonymous' ? { student_name: resolvedStudentName } : {}),
          ...(resolvedEmail ? { responder_email: resolvedEmail, email: resolvedEmail } : {})
        },
        browserMetadata: finalBrowserMetadata,
        timeTaken,
        submittedBy: resolvedStudentName && resolvedStudentName !== 'Anonymous' ? resolvedStudentName : (submittedBy || null),
        email: resolvedEmail || null
      }
    });

    // Add live notification for form owner
    inMemoryNotifications.unshift({
      id: Math.random().toString(36).substring(2, 9),
      userId: form.ownerId,
      text: `New response received for '${form.title}'.`,
      time: "Just now",
      read: false
    });

    // Log submit event in analytics
    const userAgent = req.headers['user-agent'] || '';
    await AnalyticsService.logEvent({
      formId: form.id,
      eventType: 'SUBMIT',
      userAgent,
      ipAddress: rawIp
    });

    // Update analytics submissions counter
    await db.analytics.updateMany({
      where: { formId: form.id },
      data: {
        submissions: { increment: 1 }
      }
    });

    // Execute active workflows for on_submit trigger with retry logic
    const executeWebhookWithRetry = async (url: string, payload: any, workflowId: string, maxRetries: number = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const webhookRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (webhookRes.ok || webhookRes.status < 500) return; // Success or client error (no retry)
          console.warn(`Workflow ${workflowId} webhook attempt ${attempt}/${maxRetries} returned HTTP ${webhookRes.status}`);
        } catch (e: any) {
          console.warn(`Workflow ${workflowId} webhook attempt ${attempt}/${maxRetries} failed: ${e.message}`);
        }
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
        }
      }
      console.error(`Workflow ${workflowId} webhook exhausted all ${maxRetries} retries for URL: ${url}`);
    };

    (async () => {
      try {
        const workflows = await db.workflow.findMany({
          where: { formId: form.id, active: true, trigger: 'on_submit' }
        });
        const webhookPromises = workflows.map((wf) => {
          if (wf.action === 'send_webhook' && (wf.config as any)?.webhook_url) {
            return executeWebhookWithRetry(
              (wf.config as any).webhook_url,
              { event: 'form_submission', formId: form.id, responseId: response.id, answers, submittedAt: response.completedAt },
              wf.id
            );
          } else if (wf.action === 'slack_notify' && (wf.config as any)?.webhook_url) {
            return executeWebhookWithRetry(
              (wf.config as any).webhook_url,
              { text: `New submission received for form "${form.title}" (Response ID: ${response.id})` },
              wf.id
            );
          }
          return Promise.resolve();
        });
        await Promise.allSettled(webhookPromises);
      } catch (wfErr: any) {
        console.error('Workflow dispatch error:', wfErr.message);
      }
    })();

    return res.status(201).json({ message: 'Response submitted successfully', responseId: response.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. FETCH RESPONSES (Authenticated editors/admins only) with backward-compatible pagination
router.get('/:id/responses', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const form = await db.form.findUnique({ where: { id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Verify ownership or team permissions
    if (!(await hasFormAccess(id, req.user.id, ['admin', 'editor', 'viewer']))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const limitParam = req.query.limit;
    const pageParam = req.query.page;

    if (limitParam === undefined && pageParam === undefined) {
      // Unpaginated plain array for backward compatibility
      const responses = await db.response.findMany({
        where: { formId: form.id },
        orderBy: { completedAt: 'desc' }
      });
      return res.json(responses);
    }

    const page = parseInt(pageParam as string) || 1;
    const limit = Math.min(parseInt(limitParam as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [responses, totalCount] = await Promise.all([
      db.response.findMany({
        where: { formId: form.id },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit
      }),
      db.response.count({
        where: { formId: form.id }
      })
    ]);

    return res.json({
      data: responses,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 9. EXPORT RESPONSES TO CSV WITH WEIGHTED SCORES
router.get('/:id/export', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const form = await db.form.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Verify creator or team editor access
    if (!(await hasFormAccess(id, req.user.id, ['admin', 'editor']))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Stream-safe: paginated fetch to avoid memory overflow on large datasets
    const BATCH_SIZE = 500;
    const totalResponseCount = await db.response.count({ where: { formId: id } });
    let responses: any[] = [];
    for (let skip = 0; skip < totalResponseCount; skip += BATCH_SIZE) {
      const batch = await db.response.findMany({
        where: { formId: id },
        orderBy: { completedAt: 'desc' },
        skip,
        take: BATCH_SIZE
      });
      responses = responses.concat(batch);
    }

    // Score calculation helper
    const calculateAnswerScore = (type: string, value: any): number => {
      if (value === null || value === undefined || value === "") return 0;
      
      if (type === 'rating') {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      }
      
      const str = String(value).toLowerCase().trim();
      
      if (str === 'very satisfied' || str === 'very_satisfied' || str === '5 stars' || str === 'yes' || str === '5') {
        return 5;
      }
      if (str === 'satisfied' || str === '4 stars' || str === '4') {
        return 4;
      }
      if (str === 'neutral' || str === '3 stars' || str === '3') {
        return 3;
      }
      if (str === 'unsatisfied' || str === '2 stars' || str === 'no' || str === '2') {
        return 2;
      }
      if (str === 'very unsatisfied' || str === '1 star' || str === '1') {
        return 1;
      }
      
      const num = Number(value);
      if (!isNaN(num) && num >= 1 && num <= 5) {
        return num;
      }
      
      return 3; 
    };

    const getCorrectAnswer = (validations: any) => {
      if (!validations) return undefined;
      const ans = validations.correctAnswer !== undefined && validations.correctAnswer !== null && String(validations.correctAnswer).trim() !== ""
        ? validations.correctAnswer
        : (validations.correct_answer !== undefined && validations.correct_answer !== null && String(validations.correct_answer).trim() !== "" ? validations.correct_answer : undefined);
      return ans;
    };

    const isQuiz = form.category === 'quiz' || 
                   form.title.toLowerCase().includes('quiz') || 
                   form.title.toLowerCase().includes('test') || 
                   form.title.toLowerCase().includes('exam') || 
                   form.questions.some((q: any) => getCorrectAnswer(q.validations) !== undefined);

    const getEnrollmentNumber = (r: any) => extractEnrollmentNumber((r.answers as Record<string, any>) || {}, form.questions);
    const getStudentName = (r: any) => extractStudentName((r.answers as Record<string, any>) || {}, form.questions, r.submittedBy);
    const getEmail = (r: any) => extractStudentEmail((r.answers as Record<string, any>) || {}, form.questions, r.email);

    const calculateQuizScore = (answersMap: Record<string, any>) => {
      let correctCount = 0;
      let totalGraded = 0;
      let earnedPoints = 0;
      let maxPoints = 0;

      form.questions.forEach((q: any) => {
        const validations = q.validations || {};
        const correctAns = getCorrectAnswer(validations);
        if (correctAns !== undefined) {
          totalGraded++;
          const pts = Number(validations.points || 5);
          maxPoints += pts;
          const userAns = answersMap[q.id];
          const isCorrect = userAns !== undefined && userAns !== null && String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
          if (isCorrect) {
            correctCount++;
            earnedPoints += pts;
          }
        }
      });

      return {
        correctCount,
        totalGraded,
        earnedPoints,
        maxPoints,
        percentageClamped: maxPoints > 0 ? Math.min(100, Math.round((earnedPoints / maxPoints) * 100)) : 0
      };
    };

    // Sort responses: Enrollment-wise if it's a quiz and we have enrollment numbers
    const sortedResponses = [...responses].sort((a: any, b: any) => {
      const enrollA = getEnrollmentNumber(a);
      const enrollB = getEnrollmentNumber(b);
      if (!enrollA && enrollB) return 1;
      if (enrollA && !enrollB) return -1;
      if (!enrollA && !enrollB) return 0;
      return enrollA.localeCompare(enrollB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Construct CSV Headers
    const headers: string[] = [];
    if (isQuiz) {
      headers.push('Enrollment Number');
      headers.push('Student Name');
      headers.push('Respondent Email');
      headers.push('Obtained Score');
      headers.push('Total Score Limit');
      headers.push('Percentage (%)');
      headers.push('Result Status');
      headers.push('Submission Timestamp');
    } else {
      headers.push('Submission Timestamp');
      headers.push('Respondent Email');
    }

    form.questions.forEach((q: any, idx: number) => {
      headers.push(`Q${idx + 1}: ${q.label.replace(/"/g, '""')}`);
      if (isQuiz && getCorrectAnswer(q.validations) !== undefined) {
        headers.push(`Q${idx + 1} Grading`);
      } else {
        headers.push(`Q${idx + 1} Score`);
      }
    });

    if (!isQuiz) {
      headers.push('Total Calculated Score');
    }

    const csvLines = [headers.map(h => `"${h}"`).join(',')];

    sortedResponses.forEach((r: any) => {
      const answersMap = (r.answers as Record<string, any>) || {};
      const row: string[] = [];

      const enroll = getEnrollmentNumber(r) || 'N/A';
      const name = getStudentName(r) || 'Anonymous';
      const email = getEmail(r) || 'Anonymous';
      const timestamp = new Date(r.completedAt).toISOString();

      if (isQuiz) {
        const stats = calculateQuizScore(answersMap);
        const passed = stats.percentageClamped >= 50 ? 'Passed' : 'Failed';
        row.push(enroll);
        row.push(name);
        row.push(email);
        row.push(String(stats.earnedPoints));
        row.push(String(stats.maxPoints));
        row.push(`${stats.percentageClamped}%`);
        row.push(passed);
        row.push(timestamp);
      } else {
        row.push(timestamp);
        row.push(email);
      }

      let totalScore = 0;

      form.questions.forEach((q: any) => {
        const answer = answersMap[q.id];
        let answerStr = '';
        if (answer !== undefined && answer !== null) {
          const rawStr = typeof answer === 'object' ? JSON.stringify(answer) : String(answer);
          if (rawStr.startsWith('data:') || rawStr.includes(';base64,')) {
            if (q.type === 'signature') {
              answerStr = '[Signature Image]';
            } else {
              answerStr = '[Uploaded File/Image]';
            }
          } else {
            answerStr = rawStr;
          }
        }
        
        row.push(answerStr.replace(/"/g, '""'));

        const validations = q.validations || {};
        const correctAns = getCorrectAnswer(validations);
        if (isQuiz && correctAns !== undefined) {
          const isCorrect = answer !== undefined && answer !== null && String(answer).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
          row.push(isCorrect ? 'Correct ✓' : 'Incorrect ✗');
        } else {
          const score = calculateAnswerScore(q.type, answer);
          row.push(String(score));
          totalScore += score;
        }
      });

      if (!isQuiz) {
        row.push(String(totalScore));
      }

      csvLines.push(row.map(cell => `"${cell || ''}"`).join(','));
    });

    const csvString = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="responses-export-${id}.csv"`);
    return res.status(200).send(csvString);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
