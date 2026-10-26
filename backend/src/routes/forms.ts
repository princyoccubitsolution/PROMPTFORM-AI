import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { cache } from '../lib/cache';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { subscriptionMiddleware } from '../middlewares/subscription';
import { isUUID, generateUniqueShareId, hasFormAccess } from '../lib/utils';
import { logActivity } from '../lib/activity';
import { FormsService } from '../services/formsService';
import { AnalyticsService } from '../services/analyticsService';
import { emailService, checkRecipientDomain } from '../services/emailService';
import { logger } from '../lib/logger';
import { gradeSubmission, gradeQuestion, isAssessmentForm, requiresStudentIdentity, sanitizeFormForRespondent } from '../lib/assessment/grading';
import jwt from 'jsonwebtoken';

const router = Router();

/** Owners and collaborators see answer keys; respondents never do. */
const requesterCanEdit = async (req: Request, form: { id: string; ownerId: string }): Promise<boolean> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    const secret = process.env.JWT_SECRET || 'promptform_jwt_secret_key_2026_default';
    const decoded = jwt.verify(authHeader.split(' ')[1], secret) as any;
    if (!decoded?.id) return false;
    if (decoded.id === form.ownerId) return true;
    return await hasFormAccess(form.id, decoded.id, ['admin', 'editor', 'viewer']);
  } catch (_) {
    return false;
  }
};

const getFormCacheKey = (id: string) => `form:${id}`;
const getShareFormCacheKey = (shareId: string) => `form_share:${shareId}`;

export const invalidateFormCache = async (formId?: string | null, shareId?: string | null) => {
  try {
    if (formId) await cache.del(getFormCacheKey(formId));
    if (shareId) await cache.del(getShareFormCacheKey(shareId));
  } catch (err) {
    // silent fallback
  }
};

interface LiveNotification {
  id: string;
  userId: string;
  text: string;
  time: string;
  createdAt: string;
  read: boolean;
  formId?: string;
}

export const inMemoryNotifications: LiveNotification[] = [
  { id: "mock_1", userId: "all_users", text: "Welcome to PromptForm AI! Live notification engine is fully active.", time: "1h ago", createdAt: new Date(Date.now() - 3600000).toISOString(), read: false }
];

const parseSettings = (settings: any): Record<string, any> => {
  if (!settings) return {};
  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch (_) {
      return {};
    }
  }
  return typeof settings === 'object' ? settings : {};
};

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
  expires_at: z.string().nullable().optional(), // ISO date string after which form is closed
  expiration_message: z.string().nullable().optional(), // Custom message shown when expired
  anti_cheat_detection: z.boolean().default(false),
  team_members_only: z.boolean().default(false),
  invited_only: z.boolean().default(false),
  invited_emails: z.array(z.string()).default([]),
  display_mode: z.enum(["full", "wizard", "chat"]).default("full"),
  displayMode: z.enum(["full", "wizard", "chat"]).optional()
}).passthrough(); // preserve unknown fields so future settings aren't silently stripped

const formThemeSchema = z.object({
  primary_color: z.string().default("#8B6B55"),
  background_color: z.string().default("#FAF6EF"),
  font_family: z.string().default("Inter"),
  logo_url: z.string().nullable().default(null),
  banner_url: z.string().nullable().optional(),
  border_radius: z.string().optional(),
  theme_name: z.string().optional(),
  layoutType: z.string().optional(),
  rtl: z.boolean().optional()
}).passthrough(); // preserve unknown fields so future theme props aren't silently stripped

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

    const queryWhere = {
      OR: [
        { ownerId: req.user.id },
        { teamId: { in: teamIds } },
        { collaborators: { some: { userId: req.user.id } } }
      ]
    };

    if (limitParam === undefined && pageParam === undefined) {
      // Unpaginated plain array for backward compatibility
      const forms = await db.form.findMany({
        where: queryWhere,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          team: {
            select: { id: true, name: true }
          },
          collaborators: {
            where: { userId: req.user.id },
            select: { role: true }
          },
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
        where: queryWhere,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          team: {
            select: { id: true, name: true }
          },
          collaborators: {
            where: { userId: req.user.id },
            select: { role: true }
          },
          _count: {
            select: { responses: true }
          }
        }
      }),
      db.form.count({
        where: queryWhere
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

const readNotifIds = new Set<string>();
const deletedNotifIds = new Set<string>();

const formatTimeAgo = (dateInput: Date | string): string => {
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

// LIVE NOTIFICATIONS (must precede /:id)
router.get('/notifications/live', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Fetch user activities from DB
    const activities = await db.activity.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          { form: { ownerId: req.user.id } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 25
    });

    const dbNotifications: LiveNotification[] = activities.map(act => {
      const isResponse = act.action === 'RESPONSE_RECEIVED';

      let defaultText = act.details || `${act.action.replace(/_/g, ' ')}`;
      if (isResponse && act.targetTitle) {
        defaultText = `New submission received for '${act.targetTitle}'.`;
      }

      return {
        id: `act_${act.id}`,
        userId: req.user!.id,
        text: defaultText,
        time: formatTimeAgo(act.createdAt),
        createdAt: act.createdAt.toISOString(),
        read: readNotifIds.has(`act_${act.id}`),
        formId: act.formId || undefined
      };
    });

    // 2. Fetch memory notifications
    const memNotifs = inMemoryNotifications
      .filter(n => n.userId === req.user!.id || n.userId === 'all_users')
      .map(n => ({
        ...n,
        time: formatTimeAgo(n.createdAt || new Date().toISOString()),
        read: n.read || readNotifIds.has(n.id)
      }));

    // 3. Combine & remove deleted items
    const combined = [...memNotifs, ...dbNotifications].filter(n => !deletedNotifIds.has(n.id));

    // Deduplicate by text and formId so in-memory and DB duplicates are merged
    const uniqueMap = new Map<string, LiveNotification>();
    combined.forEach(item => {
      const dedupeKey = item.id.startsWith('act_') ? item.id : `${item.formId || ''}_${item.text}`;
      if (!uniqueMap.has(dedupeKey)) {
        uniqueMap.set(dedupeKey, item);
      } else {
        const existing = uniqueMap.get(dedupeKey)!;
        if (existing.read) item.read = true;
        if (!existing.formId && item.formId) uniqueMap.set(dedupeKey, item);
      }
    });

    const result = Array.from(uniqueMap.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return res.json(result);
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
    // Mark DB activities as read for user session
    const activities = await db.activity.findMany({
      where: { OR: [{ userId: req.user.id }, { form: { ownerId: req.user.id } }] },
      select: { id: true },
      take: 50
    });
    activities.forEach(act => readNotifIds.add(`act_${act.id}`));

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notifications/live/:id/read', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    readNotifIds.add(id);
    const item = inMemoryNotifications.find(n => n.id === id && (n.userId === req.user!.id || n.userId === 'all_users'));
    if (item) {
      item.read = true;
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/notifications/live/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    deletedNotifIds.add(id);
    const index = inMemoryNotifications.findIndex(n => n.id === id && (n.userId === req.user!.id || n.userId === 'all_users'));
    if (index !== -1) {
      inMemoryNotifications.splice(index, 1);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/notifications/live', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    let i = inMemoryNotifications.length;
    while (i--) {
      if (inMemoryNotifications[i].userId === req.user.id || inMemoryNotifications[i].userId === 'all_users') {
        deletedNotifIds.add(inMemoryNotifications[i].id);
        inMemoryNotifications.splice(i, 1);
      }
    }
    const activities = await db.activity.findMany({
      where: { OR: [{ userId: req.user.id }, { form: { ownerId: req.user.id } }] },
      select: { id: true },
      take: 50
    });
    activities.forEach(act => deletedNotifIds.add(`act_${act.id}`));

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notifications/live/test', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const newNotif: LiveNotification = {
      id: 'test_' + Math.random().toString(36).substring(2, 9),
      userId: req.user.id,
      text: `🔔 Test Notification: Persistent notification engine active & working perfectly!`,
      time: 'Just now',
      createdAt: new Date().toISOString(),
      read: false
    };
    inMemoryNotifications.unshift(newNotif);
    
    // Log activity in DB so it persists
    await logActivity({
      userId: req.user.id,
      action: 'TEST_NOTIFICATION',
      details: '🔔 Test Notification: Persistent notification engine active & working perfectly!'
    }).catch(() => {});

    return res.json({ success: true, notification: newNotif });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notifications/live/test-email', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { targetEmail } = req.body;
    const rawTargets = typeof targetEmail === 'string' && targetEmail.trim()
      ? targetEmail.split(',').map((e: string) => e.trim()).filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      : [];
    const recipientList = rawTargets.length > 0
      ? Array.from(new Set(rawTargets))
      : (req.user.email ? [req.user.email] : []);

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email provided' });
    }

    const sent = await emailService.sendOwnerNotification({
      formTitle: 'PromptForm AI Email Test',
      recipientEmails: recipientList,
      answers: {
        'Test Message': 'Your PromptForm AI email notification service is working perfectly!',
        'Timestamp': new Date().toLocaleString(),
        'Status': 'Verified'
      },
      responseId: 'test_resp_' + Math.random().toString(36).substring(2, 7),
      submittedAt: new Date()
    });

    const deliveryInfo = emailService.getLastDeliveryInfo();
    const emailError = emailService.getLastError();
    const recipientDisplay = recipientList.join(', ');

    return res.json({
      success: sent,
      emailSent: sent,
      recipients: recipientList,
      deliveryStatus: sent ? 'accepted' : 'rejected',
      messageId: deliveryInfo?.messageId || null,
      error: sent ? null : (emailError || 'Failed to deliver email'),
      message: sent
        ? `Test email accepted by the mail server for ${recipientDisplay}. Ask the recipient to check Inbox and Spam; if it does not arrive, a bounce notice will be sent to the sender mailbox.`
        : `Failed to deliver email to ${recipientDisplay}: ${emailError || 'SMTP delivery failed'}`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Provider delivery status (delivered / bounced / complained) for a sent email's message ID
router.get('/notifications/live/email-status/:messageId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const status = await emailService.getProviderDeliveryStatus(req.params.messageId);
  return res.json(status);
});

// SHARED WITH ME: Get forms where current user is a direct collaborator
router.get('/collaborations/shared-with-me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const sharedForms = await db.formCollaborator.findMany({
      where: { userId: req.user.id },
      include: {
        form: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            team: { select: { id: true, name: true } },
            _count: { select: { responses: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const result = sharedForms.map(sf => ({
      ...sf.form,
      accessRole: sf.role,
      responseCount: sf.form._count.responses
    }));

    return res.json(result);
  } catch (error) {
    console.error('[Forms] Error fetching shared forms:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FORM INVITATIONS (must precede /:id) ====================

const FORM_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FORM_INVITE_RESEND_COOLDOWN_MS = 60 * 1000;
const FORM_INVITES_PER_HOUR = 50;

type FormInvitationRecord = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  lastSentAt: Date;
  createdAt: Date;
};

const hashInviteToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const createInviteToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashInviteToken(token) };
};

const buildFormInviteUrl = (req: Request, token: string) => {
  const reqOrigin = typeof req.headers.origin === 'string' && req.headers.origin.startsWith('http')
    ? req.headers.origin.replace(/\/+$/, '')
    : '';
  const frontendUrl = (reqOrigin || process.env.FRONTEND_URL || 'https://promptform-ai-frontend.vercel.app').replace(/\/+$/, '');
  return `${frontendUrl}/form-invite?token=${token}`;
};

// A pending invitation past its expiry is reported as expired even before its row is updated
const effectiveInviteStatus = (invite: { status: string; expiresAt: Date }) =>
  invite.status === 'pending' && invite.expiresAt <= new Date() ? 'expired' : invite.status;

const serializeInvitation = (invite: FormInvitationRecord) => ({
  id: invite.id,
  email: invite.email,
  role: invite.role,
  status: effectiveInviteStatus(invite),
  expiresAt: invite.expiresAt,
  lastSentAt: invite.lastSentAt,
  createdAt: invite.createdAt
});

// Caps invitation emails per sender so the form invite endpoint can't be used to spam addresses
const inviteLimitReached = async (userId: string) => {
  const sentLastHour = await db.formInvitation.count({
    where: { invitedById: userId, lastSentAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } }
  });
  return sentLastHour >= FORM_INVITES_PER_HOUR;
};

const findInvitationByToken = async (token: string) => {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  return db.formInvitation.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      form: { select: { id: true, title: true, description: true, ownerId: true, teamId: true } },
      invitedBy: { select: { name: true, email: true } }
    }
  });
};

/** Returns why an invitation can no longer be used (marking overdue ones expired), or null if it is usable. */
const invitationUnusableReason = async (invite: { id: string; status: string; expiresAt: Date }) => {
  if (invite.status === 'accepted') return 'This invitation has already been accepted.';
  if (invite.status === 'cancelled') return 'This invitation was cancelled by the form owner.';
  if (effectiveInviteStatus(invite) === 'expired') {
    if (invite.status === 'pending') {
      await db.formInvitation.updateMany({ where: { id: invite.id, status: 'pending' }, data: { status: 'expired' } });
    }
    return 'This invitation link has expired. Please ask the form owner to send a new invitation.';
  }
  return null;
};

/** Emails the invitation link and builds the API response shared by invite and resend. */
const deliverFormInvitation = async (
  req: AuthenticatedRequest,
  formTitle: string,
  invite: FormInvitationRecord,
  token: string
) => {
  const inviteUrl = buildFormInviteUrl(req, token);
  const emailSent = await emailService.sendFormInvitation({
    formTitle,
    recipientEmail: invite.email,
    inviterName: req.user!.name || req.user!.email,
    role: invite.role,
    inviteUrl,
    expiresAt: invite.expiresAt
  });
  const emailError = emailSent ? null : emailService.getLastError();

  return {
    status: 'invited',
    emailSent,
    emailError,
    // Returned only when the email failed, so the owner can share the link another way
    inviteUrl: emailSent ? null : inviteUrl,
    invitation: serializeInvitation(invite),
    message: emailSent
      ? 'Invitation sent successfully.'
      : `The invitation was created, but the email could not be delivered${emailError ? ` (${emailError})` : ''}. Share the invitation link with them directly.`
  };
};

// GET: Invitation details for the /form-invite page (public; the token is the credential)
router.get('/invitations/verify/:token', async (req: Request, res: Response) => {
  try {
    const invite = await findInvitationByToken(req.params.token);
    if (!invite) return res.status(404).json({ error: 'Invitation not found or invalid token.' });

    const unusable = await invitationUnusableReason(invite);
    if (unusable) return res.status(400).json({ error: unusable });

    const existingAccount = await db.user.findUnique({ where: { email: invite.email }, select: { id: true } });

    return res.json({
      email: invite.email,
      role: invite.role,
      formTitle: invite.form.title,
      formDescription: invite.form.description,
      inviterName: invite.invitedBy.name || invite.invitedBy.email,
      hasAccount: Boolean(existingAccount),
      expiresAt: invite.expiresAt
    });
  } catch (error) {
    console.error('[Forms] Verify invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Accept a form invitation as the signed-in user
router.post('/invitations/accept/:token', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;

    const invite = await findInvitationByToken(req.params.token);
    if (!invite) return res.status(404).json({ error: 'Invitation not found or invalid token.' });

    const emailMatches = (req.user.email || '').trim().toLowerCase() === invite.email;

    // Opening the link again after accepting just leads back to the form
    if (invite.status === 'accepted' && emailMatches && (await hasFormAccess(invite.formId, userId, ['editor', 'viewer']))) {
      return res.json({
        success: true,
        formId: invite.formId,
        formTitle: invite.form.title,
        role: invite.role,
        message: `You already have access to "${invite.form.title}".`
      });
    }

    const unusable = await invitationUnusableReason(invite);
    if (unusable) return res.status(400).json({ error: unusable });

    // The invitation belongs to one email address; a different signed-in account must not consume it
    if (!emailMatches) {
      return res.status(403).json({
        error: `This invitation was sent to ${invite.email}, but you are signed in as ${req.user.email}. Please sign in with ${invite.email} to accept it.`,
        code: 'INVITE_EMAIL_MISMATCH',
        invitedEmail: invite.email
      });
    }

    // Claim the invitation and grant access atomically: the conditional update only succeeds
    // for a still-pending, unexpired invitation, so duplicate accepts cannot both win.
    const now = new Date();
    const grantedRole = await db.$transaction(async (tx) => {
      const { count } = await tx.formInvitation.updateMany({
        where: { id: invite.id, status: 'pending', expiresAt: { gt: now } },
        data: { status: 'accepted', acceptedAt: now }
      });
      if (count !== 1) return null;
      if (invite.form.ownerId === userId) return 'owner';

      const existing = await tx.formCollaborator.findUnique({
        where: { formId_userId: { formId: invite.formId, userId } }
      });
      if (!existing) {
        await tx.formCollaborator.create({ data: { formId: invite.formId, userId, role: invite.role } });
        return invite.role;
      }
      // Never downgrade an existing collaborator through an invitation
      if (existing.role === 'viewer' && invite.role === 'editor') {
        await tx.formCollaborator.update({ where: { id: existing.id }, data: { role: 'editor' } });
        return 'editor';
      }
      return existing.role;
    });

    if (!grantedRole) {
      return res.status(409).json({ error: 'This invitation has already been accepted.' });
    }

    await logActivity({
      userId,
      action: 'COLLABORATOR_ADDED',
      formId: invite.formId,
      teamId: invite.form.teamId,
      targetTitle: invite.form.title,
      details: `${req.user.name || req.user.email} accepted the invitation and joined "${invite.form.title}" as ${grantedRole}`
    });

    return res.json({
      success: true,
      formId: invite.formId,
      formTitle: invite.form.title,
      role: grantedRole,
      message: `You now have ${grantedRole} access to "${invite.form.title}".`
    });
  } catch (error) {
    console.error('[Forms] Accept invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET FORM BY ID (Public details vs Authenticated editor details with Redis Caching)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isFormUUID = isUUID(id);

    // 1. Check Redis Cache first for sub-millisecond response to handle 100+ concurrent requests
    const cacheKey = isFormUUID ? getFormCacheKey(id) : getShareFormCacheKey(id);
    const cachedFormStr = await cache.get(cacheKey);

    if (cachedFormStr) {
      let cachedForm: any = null;
      try {
        cachedForm = JSON.parse(cachedFormStr);
      } catch (_) {
        // Cache parse error, fall through to database
      }
      if (cachedForm) {
        const cachedSettings = parseSettings(cachedForm.settings);
        const canEdit = await requesterCanEdit(req, cachedForm);
        const present = (f: any) => (canEdit ? f : sanitizeFormForRespondent(f));

        // Guard: check if form has expired based on expires_at deadline
        const cachedExpiresAt = cachedSettings.expires_at;
        let isCachedExpired = false;
        if (cachedExpiresAt) {
          const expiryDate = new Date(cachedExpiresAt);
          if (!isNaN(expiryDate.getTime()) && Date.now() > expiryDate.getTime()) {
            isCachedExpired = true;
          }
        }

        if (isCachedExpired && !canEdit) {
          return res.json(present({
            ...cachedForm,
            settings: cachedSettings,
            status: 'CLOSED',
            isExpired: true,
            questions: [],
            message: cachedSettings.expiration_message || 'This form has expired and is no longer accepting responses.'
          }));
        }

        // Guard: mask questions if form is password-protected and correct password not provided
        const formPassword = cachedSettings.password;
        if (formPassword) {
          const providedPassword = req.headers['x-form-password'] || req.query.password;
          if (!canEdit && providedPassword !== formPassword) {
            return res.json(present({
              ...cachedForm,
              questions: [],
              passwordRequired: true,
              isLocked: true
            }));
          }
        }
        return res.json(present(cachedForm));
      }
    }

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

    // Store in Redis Cache for 300 seconds (5 minutes)
    const cacheTTL = 300;
    await cache.set(getFormCacheKey(form.id), JSON.stringify(form), cacheTTL);
    if (form.uniqueShareId) {
      await cache.set(getShareFormCacheKey(form.uniqueShareId), JSON.stringify(form), cacheTTL);
    }

    const parsedDbSettings = parseSettings(form.settings);
    const canEdit = await requesterCanEdit(req, form);
    const present = (f: any) => (canEdit ? f : sanitizeFormForRespondent(f));

    // Guard: check if form has expired based on expires_at deadline
    const expiresAt = parsedDbSettings.expires_at;
    let isExpired = false;
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (!isNaN(expiryDate.getTime()) && Date.now() > expiryDate.getTime()) {
        isExpired = true;
      }
    }

    if (isExpired) {
      if (!canEdit) {
        if (form.status === 'PUBLISHED') {
          try {
            await db.form.update({
              where: { id: form.id },
              data: { status: 'CLOSED' }
            });
            await invalidateFormCache(form.id, form.uniqueShareId);
          } catch (_) {}
        }
        return res.json(present({
          ...form,
          settings: parsedDbSettings,
          status: 'CLOSED',
          isExpired: true,
          questions: [],
          message: parsedDbSettings.expiration_message || 'This form has expired and is no longer accepting responses.'
        }));
      }
    }

    // Guard: mask questions if form is password-protected and correct password not provided
    const formPassword = parsedDbSettings.password;
    if (formPassword) {
      const providedPassword = req.headers['x-form-password'] || req.query.password;
      if (!canEdit && providedPassword !== formPassword) {
        return res.json(present({
          ...form,
          questions: [],
          passwordRequired: true,
          isLocked: true
        }));
      }
    }

    return res.json(present(form));
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authMiddleware, subscriptionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const body = createFormSchema.parse(req.body);

    const form = await FormsService.createForm(req.user.id, body);

    await logActivity({
      userId: req.user.id,
      action: 'FORM_CREATED',
      formId: form.id,
      teamId: form.teamId,
      targetTitle: form.title,
      details: `${req.user.name || req.user.email} created form "${form.title}"`
    });

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

    const existingSettings = typeof form.settings === 'string' 
      ? (() => { try { return JSON.parse(form.settings); } catch (_) { return {}; } })() 
      : (form.settings && typeof form.settings === 'object' ? form.settings : {});

    const existingTheme = typeof form.theme === 'string' 
      ? (() => { try { return JSON.parse(form.theme); } catch (_) { return {}; } })() 
      : (form.theme && typeof form.theme === 'object' ? form.theme : {});

    // Build merged settings — explicitly preserve expires_at even when sent as null (toggle off)
    let mergedSettings: Record<string, any> | undefined = undefined;
    if (body.settings) {
      const newSettings: Record<string, any> = { ...existingSettings, ...body.settings };
      if (body.settings.expires_at !== undefined) {
        newSettings.expires_at = body.settings.expires_at;
      } else if (existingSettings.expires_at !== undefined) {
        newSettings.expires_at = existingSettings.expires_at;
      }
      mergedSettings = newSettings;
    }

    const updatedForm = await db.form.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        settings: mergedSettings,
        theme: body.theme ? { ...existingTheme, ...body.theme } : undefined,
        teamId: body.teamId,
        isPublic: body.isPublic !== undefined ? body.isPublic : undefined,
        responseLimit: body.responseLimit !== undefined ? body.responseLimit : undefined,
        uniqueShareId: uniqueShareId !== form.uniqueShareId ? uniqueShareId : undefined,
        publicUrl: publicUrl !== form.publicUrl ? publicUrl : undefined
      }
    });

    // Force-invalidate Redis cache so the live site never serves stale form data
    await invalidateFormCache(updatedForm.id, updatedForm.uniqueShareId);

    // Log activity
    if (body.status === 'PUBLISHED' && form.status !== 'PUBLISHED') {
      await logActivity({
        userId: req.user.id,
        action: 'FORM_PUBLISHED',
        formId: updatedForm.id,
        teamId: updatedForm.teamId,
        targetTitle: updatedForm.title,
        details: `${req.user.name || req.user.email} published "${updatedForm.title}"`
      });
    } else {
      await logActivity({
        userId: req.user.id,
        action: 'FORM_UPDATED',
        formId: updatedForm.id,
        teamId: updatedForm.teamId,
        targetTitle: updatedForm.title,
        details: `${req.user.name || req.user.email} updated "${updatedForm.title}"`
      });
    }

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
      await FormsService.replaceQuestionsPreservingIds(tx, id, questionsList, { allowClientIds: true });
    });

    const updatedQuestions = await db.question.findMany({
      where: { formId: id },
      orderBy: { orderIndex: 'asc' }
    });

    await invalidateFormCache(id, form.uniqueShareId);

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

    await invalidateFormCache(id, form.uniqueShareId);
    await db.form.delete({ where: { id } });

    await logActivity({
      userId: req.user.id,
      action: 'FORM_DELETED',
      teamId: form.teamId,
      targetTitle: form.title,
      details: `${req.user.name || req.user.email} deleted form "${form.title}"`
    });

    return res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FORM COLLABORATORS API ====================

// GET: List all collaborators for a specific form
router.get('/:id/collaborators', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const form = await db.form.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!form) return res.status(404).json({ error: 'Form not found' });

    const hasAccess = await hasFormAccess(id, req.user.id, ['admin', 'editor', 'viewer']);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden. You do not have access to this form.' });
    }

    const collaboratorsList = [
      {
        id: `owner-${form.owner.id}`,
        userId: form.owner.id,
        role: 'owner',
        user: form.owner,
        isOwner: true
      },
      ...form.collaborators.map(c => ({
        id: c.id,
        userId: c.userId,
        role: c.role,
        user: c.user,
        isOwner: false
      }))
    ];

    // Outstanding invitations are only shown to the owner, who manages them
    const invitations = form.ownerId === req.user.id
      ? await db.formInvitation.findMany({
          where: { formId: id, status: { in: ['pending', 'expired'] } },
          orderBy: { createdAt: 'asc' }
        })
      : [];

    return res.json({
      formId: form.id,
      title: form.title,
      ownerId: form.ownerId,
      isCurrentUserOwner: form.ownerId === req.user.id,
      collaborators: collaboratorsList,
      invitations: invitations.map(serializeInvitation)
    });
  } catch (error) {
    console.error('[Forms] Get collaborators error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Add collaborator to form (existing users get access now; anyone else gets an emailed invitation)
router.post('/:id/collaborators', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { email, role } = z.object({
      email: z.string().trim().max(254).email(),
      role: z.enum(['editor', 'viewer']).default('editor')
    }).parse(req.body);
    const recipientEmail = email.toLowerCase();

    const form = await db.form.findUnique({ where: { id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    if (form.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Only the form owner can add collaborators.' });
    }

    const targetUser = await db.user.findUnique({ where: { email: recipientEmail } });
    if (!targetUser) {
      const domainError = await checkRecipientDomain(recipientEmail);
      if (domainError) {
        return res.status(400).json({ error: `${domainError}. Please check the email address.` });
      }

      const now = new Date();
      const existingInvite = await db.formInvitation.findUnique({
        where: { formId_email: { formId: id, email: recipientEmail } }
      });
      if (existingInvite && effectiveInviteStatus(existingInvite) === 'pending') {
        return res.status(409).json({ error: 'An invitation has already been sent to this email address. You can resend it from the pending invitations below.' });
      }

      if (await inviteLimitReached(req.user.id)) {
        return res.status(429).json({ error: 'You have sent too many invitations in the last hour. Please try again later.' });
      }

      const { token, tokenHash } = createInviteToken();
      const expiresAt = new Date(now.getTime() + FORM_INVITE_TTL_MS);
      const inviteData = { role, tokenHash, status: 'pending', invitedById: req.user.id, lastSentAt: now, expiresAt, acceptedAt: null };

      let invitation;
      if (existingInvite) {
        // Reuse the row of an expired, cancelled or stale invitation. The guard makes a concurrent
        // re-invite of the same address lose instead of sending a second live invitation.
        const { count } = await db.formInvitation.updateMany({
          where: { id: existingInvite.id, OR: [{ status: { not: 'pending' } }, { expiresAt: { lte: now } }] },
          data: inviteData
        });
        if (count !== 1) {
          return res.status(409).json({ error: 'An invitation has already been sent to this email address.' });
        }
        invitation = await db.formInvitation.findUniqueOrThrow({ where: { id: existingInvite.id } });
      } else {
        try {
          invitation = await db.formInvitation.create({ data: { ...inviteData, formId: id, email: recipientEmail } });
        } catch (createError: any) {
          if (createError?.code === 'P2002') {
            return res.status(409).json({ error: 'An invitation has already been sent to this email address.' });
          }
          throw createError;
        }
      }

      const result = await deliverFormInvitation(req, form.title, invitation, token);

      await logActivity({
        userId: req.user.id,
        action: 'COLLABORATOR_INVITED',
        formId: id,
        teamId: form.teamId,
        targetTitle: form.title,
        details: `${recipientEmail} was invited as ${role} to "${form.title}"`
      });

      return res.status(201).json(result);
    }

    if (targetUser.id === form.ownerId) {
      return res.status(400).json({ error: 'The form owner is already a collaborator.' });
    }

    const existing = await db.formCollaborator.findUnique({
      where: { formId_userId: { formId: id, userId: targetUser.id } }
    });

    if (existing) {
      return res.status(400).json({ error: 'This user is already a collaborator on this form.' });
    }

    const collaborator = await db.formCollaborator.create({
      data: {
        formId: id,
        userId: targetUser.id,
        role
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    await logActivity({
      userId: req.user.id,
      action: 'COLLABORATOR_ADDED',
      formId: id,
      teamId: form.teamId,
      targetTitle: form.title,
      details: `${targetUser.name || targetUser.email} was added as ${role} to "${form.title}"`
    });

    // Direct access supersedes an invitation still waiting for this address
    await db.formInvitation.updateMany({
      where: { formId: id, email: recipientEmail, status: 'pending' },
      data: { status: 'cancelled' }
    });

    return res.status(201).json({ ...collaborator, status: 'added' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const invalidEmail = error.errors.some((e) => e.path[0] === 'email');
      return res.status(400).json({
        error: invalidEmail ? 'Please enter a valid email address.' : 'Validation failed',
        details: error.errors
      });
    }
    console.error('[Forms] Add collaborator error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update collaborator role
router.put('/:id/collaborators/:collaboratorId', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id, collaboratorId } = req.params;
    const { role } = z.object({ role: z.enum(['editor', 'viewer']) }).parse(req.body);

    const form = await db.form.findUnique({ where: { id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    if (form.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Only the form owner can change collaborator roles.' });
    }

    const updated = await db.formCollaborator.update({
      where: { id: collaboratorId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    await logActivity({
      userId: req.user.id,
      action: 'ROLE_CHANGED',
      formId: id,
      teamId: form.teamId,
      targetTitle: form.title,
      details: `Role of ${updated.user.name || updated.user.email} changed to ${role} on "${form.title}"`
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Forms] Update collaborator error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Remove collaborator
router.delete('/:id/collaborators/:collaboratorId', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id, collaboratorId } = req.params;

    const form = await db.form.findUnique({ where: { id } });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const collab = await db.formCollaborator.findUnique({
      where: { id: collaboratorId },
      include: { user: true }
    });

    if (!collab) return res.status(404).json({ error: 'Collaborator not found' });

    if (form.ownerId !== req.user.id && collab.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Only owner or collaborator can remove collaboration.' });
    }

    await db.formCollaborator.delete({ where: { id: collaboratorId } });

    await logActivity({
      userId: req.user.id,
      action: 'COLLABORATOR_REMOVED',
      formId: id,
      teamId: form.teamId,
      targetTitle: form.title,
      details: `${collab.user.name || collab.user.email} was removed from "${form.title}"`
    });

    return res.json({ message: 'Collaborator removed successfully.' });
  } catch (error) {
    console.error('[Forms] Remove collaborator error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** Loads a form and one of its open (pending or expired) invitations, enforcing owner-only access. */
const loadOwnedOpenInvitation = async (req: AuthenticatedRequest, res: Response) => {
  const { id, invitationId } = req.params;
  const form = await db.form.findUnique({ where: { id } });
  if (!form) {
    res.status(404).json({ error: 'Form not found' });
    return null;
  }
  if (form.ownerId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden. Only the form owner can manage invitations.' });
    return null;
  }
  const invitation = isUUID(invitationId)
    ? await db.formInvitation.findFirst({ where: { id: invitationId, formId: id, status: { in: ['pending', 'expired'] } } })
    : null;
  if (!invitation) {
    res.status(404).json({ error: 'Invitation not found.' });
    return null;
  }
  return { form, invitation };
};

// POST: Resend an invitation with a fresh link and expiry (the previous link stops working)
router.post('/:id/invitations/:invitationId/resend', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const loaded = await loadOwnedOpenInvitation(req, res);
    if (!loaded) return;
    const { form, invitation } = loaded;

    if (Date.now() - invitation.lastSentAt.getTime() < FORM_INVITE_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ error: 'This invitation was just sent. Please wait a minute before resending it.' });
    }
    if (await inviteLimitReached(req.user.id)) {
      return res.status(429).json({ error: 'You have sent too many invitations in the last hour. Please try again later.' });
    }

    const { token, tokenHash } = createInviteToken();
    const now = new Date();
    const { count } = await db.formInvitation.updateMany({
      where: { id: invitation.id, status: { in: ['pending', 'expired'] } },
      data: { tokenHash, status: 'pending', invitedById: req.user.id, lastSentAt: now, expiresAt: new Date(now.getTime() + FORM_INVITE_TTL_MS) }
    });
    if (count !== 1) return res.status(404).json({ error: 'Invitation not found.' });

    const refreshed = await db.formInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
    return res.json(await deliverFormInvitation(req, form.title, refreshed, token));
  } catch (error) {
    console.error('[Forms] Resend invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Change the role an invitation will grant
router.put('/:id/invitations/:invitationId', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { role } = z.object({ role: z.enum(['editor', 'viewer']) }).parse(req.body);
    const loaded = await loadOwnedOpenInvitation(req, res);
    if (!loaded) return;

    const updated = await db.formInvitation.update({ where: { id: loaded.invitation.id }, data: { role } });
    return res.json(serializeInvitation(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Forms] Update invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Cancel an invitation (its link stops working)
router.delete('/:id/invitations/:invitationId', authMiddleware, validateUuidMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const loaded = await loadOwnedOpenInvitation(req, res);
    if (!loaded) return;

    await db.formInvitation.updateMany({
      where: { id: loaded.invitation.id, status: { in: ['pending', 'expired'] } },
      data: { status: 'cancelled' }
    });
    return res.json({ message: 'Invitation cancelled.' });
  } catch (error) {
    console.error('[Forms] Cancel invitation error:', error);
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

    const formSettings = parseSettings(form.settings);

    // Guard: check if form deadline has expired
    const expiresAt = formSettings.expires_at;
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (!isNaN(expiryDate.getTime()) && Date.now() > expiryDate.getTime()) {
        if (form.status === 'PUBLISHED') {
          try {
            await db.form.update({
              where: { id: form.id },
              data: { status: 'CLOSED' }
            });
            await invalidateFormCache(form.id, form.uniqueShareId);
          } catch (_) {}
        }
        return res.status(400).json({
          error: formSettings.expiration_message || 'This form has expired and is no longer accepting responses.',
          isExpired: true
        });
      }
    }

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
    const formPassword = formSettings.password;
    if (formPassword) {
      const submittedPassword = req.body.password || req.headers['x-form-password'];
      if (!submittedPassword || submittedPassword !== formPassword) {
        return res.status(403).json({ error: 'This form is password protected. Correct password is required.' });
      }
    }

    // Fetch form questions
    const formQuestions = await db.question.findMany({ where: { formId: form.id }, orderBy: { orderIndex: 'asc' } });
    const isForceSubmit = Boolean(req.body.isForceSubmit || req.body.isTimeExpired || (req.body.browserMetadata?.is_flagged && Number(req.body.browserMetadata?.tab_switches) >= 3));

    // Enforce session timer limit (if configured)
    const timerLimitMinutes = Number(formSettings.timer_limit) || 0;
    if (timerLimitMinutes > 0 && !isForceSubmit) {
      const maxAllowedSeconds = (timerLimitMinutes * 60) + 120; // 2 min grace period for network latency
      if (timeTaken > maxAllowedSeconds) {
        return res.status(400).json({
          error: `Submission rejected: The time limit of ${timerLimitMinutes} minutes for this form has expired.`,
          isTimeExpired: true
        });
      }
    }

    // Extract normalized student identity data
    const answersMap = (answers as Record<string, any>) || {};
    const resolvedEnrollmentNo = extractEnrollmentNumber(answersMap, formQuestions);
    const resolvedStudentName = extractStudentName(answersMap, formQuestions, submittedBy || req.body.submittedBy);
    const resolvedEmail = extractStudentEmail(answersMap, formQuestions, email || req.body.email);

    // Student identity (name + enrollment number + email) is demanded only from forms that need
    // it: explicit settings first, otherwise assessments. Registration, survey, feedback, report,
    // food or travel forms are never treated as student quizzes because of a word in the title.
    const isQuizOrStudent = requiresStudentIdentity({ settings: formSettings, category: form.category, title: form.title, questions: formQuestions });

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
      createdAt: new Date().toISOString(),
      read: false,
      formId: form.id
    });

    // Dispatch Email Notifications & Auto-Responders
    (async () => {
      try {
        const parsedSettings = parseSettings(form.settings);
        
        // 1. Owner Notification Email
        if (parsedSettings.notify_owner !== false) {
          const owner = await db.user.findUnique({ where: { id: form.ownerId } });
          const recipientEmails: string[] = [];
          if (owner?.email) recipientEmails.push(owner.email);
          if (parsedSettings.notification_emails && typeof parsedSettings.notification_emails === 'string') {
            const extraEmails = parsedSettings.notification_emails
              .split(',')
              .map((e: string) => e.trim())
              .filter((e: string) => Boolean(e) && e.includes('@'));
            recipientEmails.push(...extraEmails);
          }
          const uniqueRecipients = Array.from(new Set(recipientEmails));
          if (uniqueRecipients.length > 0) {
            await emailService.sendOwnerNotification({
              formTitle: form.title,
              recipientEmails: uniqueRecipients,
              answers,
              responseId: response.id,
              submittedAt: response.completedAt
            });
          }
        }

        // 2. Respondent Auto-Responder Email
        if (parsedSettings.auto_responder_enabled && resolvedEmail) {
          await emailService.sendAutoResponder({
            formTitle: form.title,
            recipientEmail: resolvedEmail,
            subject: parsedSettings.auto_responder_subject,
            message: parsedSettings.auto_responder_message,
            answers
          });
        }
      } catch (emailErr: any) {
        logger.error(`Error dispatching form submission emails: ${emailErr.message}`, emailErr);
      }
    })();

    // Log Activity in database
    await logActivity({
      userId: form.ownerId,
      action: 'RESPONSE_RECEIVED',
      formId: form.id,
      teamId: form.teamId,
      targetTitle: form.title,
      details: `New response received for "${form.title}"`
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
          } else if (wf.action === 'send_email' && (wf.config as any)?.email_recipient) {
            return emailService.sendWorkflowEmail({
              to: (wf.config as any).email_recipient,
              subject: (wf.config as any).subject || `New Submission: "${form.title}"`,
              body: (wf.config as any).message || `A new response (ID: ${response.id}) was submitted for form "${form.title}".`
            });
          }
          return Promise.resolve();
        });
        await Promise.allSettled(webhookPromises);
      } catch (wfErr: any) {
        console.error('Workflow dispatch error:', wfErr.message);
      }
    })();

    // Server-side grading: respondents never receive the answer key before submitting.
    const quizResults = gradeSubmission({ settings: formSettings, category: form.category, questions: formQuestions }, answers as Record<string, any>);
    if (quizResults.isQuiz && formSettings.show_answers_after_submit === false) {
      quizResults.questionsBreakdown = quizResults.questionsBreakdown.map(item => ({ ...item, correctAnswer: undefined, explanation: undefined }));
    }

    return res.status(201).json({
      message: 'Response submitted successfully',
      responseId: response.id,
      ...(quizResults.isQuiz ? { quizResults } : {})
    });
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

    const isQuizCategory = isAssessmentForm(form);
    const isQuiz = isQuizCategory;

    const getEnrollmentNumber = (r: any) => extractEnrollmentNumber((r.answers as Record<string, any>) || {}, form.questions);
    const getStudentName = (r: any) => extractStudentName((r.answers as Record<string, any>) || {}, form.questions, r.submittedBy);
    const getEmail = (r: any) => extractStudentEmail((r.answers as Record<string, any>) || {}, form.questions, r.email);

    const calculateQuizScore = (answersMap: Record<string, any>) => {
      let correctCount = 0;
      let totalGraded = 0;
      let earnedPoints = 0;
      let maxPoints = 0;

      // Skip scoring calculation entirely if form category is not set to QUIZ or ASSESSMENT
      if (!isQuizCategory) {
        return {
          correctCount: 0,
          totalGraded: 0,
          earnedPoints: 0,
          maxPoints: 0,
          percentageClamped: 0
        };
      }

      form.questions.forEach((q: any) => {
        const validations = q.validations || {};

        // Skip if isGraded is explicitly set to false
        if (q.isGraded === false || validations.isGraded === false) {
          return;
        }

        const correctAns = getCorrectAnswer(validations);
        // Skip if a question does not have a correctAnswer defined
        if (correctAns === undefined) {
          return;
        }

        // Same grading rules as the submit endpoint (multi-correct sets, accepted answers, tolerance...).
        const graded = gradeQuestion(q, answersMap[q.id]);
        if (!graded.isGraded) return;
        totalGraded++;
        maxPoints += graded.points;
        if (graded.isCorrect) correctCount++;
        earnedPoints += graded.earned;
      });
      earnedPoints = Math.max(0, earnedPoints);

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
