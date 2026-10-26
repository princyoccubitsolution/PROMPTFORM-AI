import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { TeamInvite } from '@prisma/client';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { requireTeamRole, teamRoleAtLeast, TeamAccessRequest, TeamRole } from '../middlewares/teamAccess';
import { logActivity } from '../lib/activity';
import { emailService, checkRecipientDomain } from '../services/emailService';
import {
  INVITE_TTL_MS,
  INVITE_RESEND_COOLDOWN_MS,
  INVITES_PER_HOUR,
  createInviteToken,
  hashInviteToken,
  isInviteTokenFormat,
  frontendBaseUrl,
  effectiveInviteStatus
} from '../lib/invitations';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  description: z.string().optional().nullable(),
});

const updateTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").optional(),
  description: z.string().optional().nullable(),
});

const inviteMemberSchema = z.object({
  email: z.string().trim().max(254).email(),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

const updateRoleSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
});

// ==================== INVITATION HELPERS ====================

type TeamInviteWithInviter = TeamInvite & { invitedBy?: { name: string | null; email: string } | null };

const serializeTeamInvite = (invite: TeamInviteWithInviter) => ({
  id: invite.id,
  email: invite.email,
  role: invite.role,
  status: effectiveInviteStatus(invite),
  invitedBy: invite.invitedBy ? { name: invite.invitedBy.name, email: invite.invitedBy.email } : null,
  expiresAt: invite.expiresAt,
  lastSentAt: invite.lastSentAt,
  acceptedAt: invite.acceptedAt,
  createdAt: invite.createdAt
});

const inviteLimitReached = async (userId: string) => {
  const sentLastHour = await db.teamInvite.count({
    where: { invitedById: userId, lastSentAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } }
  });
  return sentLastHour >= INVITES_PER_HOUR;
};

/** Finds an invitation by the token from its link (hashed; raw for links emailed before hashing). */
const findTeamInviteByToken = async (token: string) => {
  if (!isInviteTokenFormat(token)) return null;
  return db.teamInvite.findFirst({
    where: { OR: [{ tokenHash: hashInviteToken(token) }, { token, tokenHash: null }] },
    include: {
      team: { select: { id: true, name: true, description: true, ownerId: true, owner: { select: { name: true, email: true } } } },
      invitedBy: { select: { name: true, email: true } }
    }
  });
};

/** Returns why an invitation can no longer be used (marking overdue ones expired), or null if it is usable. */
const inviteUnusableReason = async (invite: { id: string; status: string; expiresAt: Date }) => {
  if (invite.status === 'accepted') return 'This invitation has already been accepted.';
  if (invite.status === 'revoked') return 'This invitation was cancelled by a workspace admin.';
  if (effectiveInviteStatus(invite) === 'expired') {
    if (invite.status === 'pending') {
      await db.teamInvite.updateMany({ where: { id: invite.id, status: 'pending' }, data: { status: 'expired' } });
    }
    return 'This invitation link has expired. Please ask the workspace admin for a new invitation.';
  }
  return null;
};

/** Emails the invitation link and builds the API response shared by invite and resend. */
const deliverTeamInvite = async (req: AuthenticatedRequest, teamName: string, invite: TeamInviteWithInviter, token: string) => {
  const inviteUrl = `${frontendBaseUrl(req)}/accept-invite?token=${token}`;
  const emailSent = await emailService.sendTeamInvitation({
    teamName,
    recipientEmail: invite.email,
    inviterName: req.user!.name || req.user!.email,
    role: invite.role,
    inviteUrl
  });
  const emailError = emailSent ? null : emailService.getLastError();
  const deliveryInfo = emailService.getLastDeliveryInfo();

  return {
    success: true,
    pending: true,
    inviteId: invite.id,
    invitation: serializeTeamInvite(invite),
    emailSent,
    emailError,
    deliveryStatus: emailSent ? 'accepted' : 'rejected',
    messageId: deliveryInfo?.messageId || null,
    // Returned only when the email failed, so the admin can share the link another way
    inviteUrl: emailSent ? null : inviteUrl,
    message: emailSent
      ? `Invitation sent to ${invite.email}.`
      : `The invitation was created, but the email could not be delivered${emailError ? ` (${emailError})` : ''}. Share the invitation link with them directly.`
  };
};

const ROLE_RANK: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };

// GET: Recent activities across all user's teams (For Team landing page)
router.get('/activity/recent', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Find all teams the user belongs to or owns
    const teams = await db.team.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      },
      select: { id: true }
    });

    const teamIds = teams.map(t => t.id);

    // Fetch activities for these teams or forms owned by the user
    const activities = await db.activity.findMany({
      where: {
        OR: [
          { teamId: { in: teamIds } },
          { userId: req.user.id }
        ]
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        team: {
          select: { id: true, name: true }
        },
        form: {
          select: { id: true, title: true }
        }
      }
    });

    return res.json(activities);
  } catch (error) {
    console.error('[Teams] Failed to fetch recent activities:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: All teams user belongs to or owns with full aggregated counts
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const teams = await db.team.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        forms: {
          select: {
            id: true,
            updatedAt: true,
            _count: {
              select: { responses: true }
            }
          }
        },
        activities: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        },
        _count: {
          select: { forms: true, members: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formattedTeams = teams.map(team => {
      const totalResponses = team.forms.reduce((sum, f) => sum + (f._count?.responses || 0), 0);
      const lastFormUpdate = team.forms.reduce((latest, f) => {
        const time = new Date(f.updatedAt).getTime();
        return time > latest ? time : latest;
      }, 0);
      const lastActivityTime = team.activities[0] ? new Date(team.activities[0].createdAt).getTime() : 0;
      const lastUpdated = Math.max(new Date(team.updatedAt).getTime(), lastFormUpdate, lastActivityTime);

      const isOwner = team.ownerId === req.user!.id;
      const myMembership = team.members.find(m => m.userId === req.user!.id);
      const userRole = isOwner ? 'owner' : (myMembership?.role || 'viewer');

      // Normalize member roles so owner always shows as "owner"
      const normalizedMembers = team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.userId === team.ownerId ? 'owner' : m.role,
        createdAt: m.createdAt,
        user: m.user
      }));

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        ownerId: team.ownerId,
        owner: team.owner,
        members: normalizedMembers,
        memberCount: team.members.length,
        formCount: team.forms.length,
        responseCount: totalResponses,
        lastActivity: lastUpdated ? new Date(lastUpdated).toISOString() : team.createdAt.toISOString(),
        userRole,
        isOwner,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      };
    });

    return res.json(formattedTeams);
  } catch (error) {
    console.error('[Teams] Error fetching teams:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Create workspace team
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, description } = createTeamSchema.parse(req.body);

    const team = await db.team.create({
      data: {
        name,
        description: description || null,
        ownerId: req.user.id,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Add owner as admin member
    await db.teamMember.create({
      data: {
        teamId: team.id,
        userId: req.user.id,
        role: "admin",
      }
    });

    // Log activity
    await logActivity({
      userId: req.user.id,
      action: 'TEAM_CREATED',
      teamId: team.id,
      targetTitle: team.name,
      details: `${req.user.name || req.user.email} created team "${team.name}"`
    });

    return res.status(201).json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Teams] Create team failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// GET: Verify Invitation Token details (Public endpoint for /accept-invite page; the token is the credential)
router.get('/invitations/verify/:token', async (req: Request, res: Response) => {
  try {
    const invite = await findTeamInviteByToken(req.params.token);
    if (!invite) return res.status(404).json({ error: 'Invitation not found or invalid token.' });

    const unusable = await inviteUnusableReason(invite);
    if (unusable) return res.status(400).json({ error: unusable });

    const existingAccount = await db.user.findUnique({ where: { email: invite.email }, select: { id: true } });
    const inviter = invite.invitedBy || invite.team.owner;

    return res.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      teamId: invite.teamId,
      teamName: invite.team.name,
      teamDescription: invite.team.description,
      inviterName: inviter.name || inviter.email,
      hasAccount: Boolean(existingAccount),
      expiresAt: invite.expiresAt
    });
  } catch (error) {
    console.error('[Teams] Verify invitation failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Accept Team Workspace Invitation (Requires authenticated user)
router.post('/invitations/accept/:token', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;

    const invite = await findTeamInviteByToken(req.params.token);
    if (!invite) return res.status(404).json({ error: 'Invitation not found or invalid token.' });

    const emailMatches = (req.user.email || '').trim().toLowerCase() === invite.email.trim().toLowerCase();
    const alreadyMember = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: invite.teamId, userId } }
    });

    // Opening the link again after accepting just leads back to the workspace
    if (invite.status === 'accepted' && emailMatches && alreadyMember) {
      return res.json({
        success: true,
        teamId: invite.teamId,
        role: alreadyMember.role,
        teamName: invite.team.name,
        message: `You are already a member of "${invite.team.name}".`
      });
    }

    const unusable = await inviteUnusableReason(invite);
    if (unusable) return res.status(400).json({ error: unusable });

    // The invitation belongs to one email address; a different signed-in account
    // (e.g. the team owner testing the link in their own browser) must not consume it.
    if (!emailMatches) {
      return res.status(403).json({
        error: `This invitation was sent to ${invite.email}, but you are signed in as ${req.user.email}. Please sign in with ${invite.email} to accept it.`,
        code: 'INVITE_EMAIL_MISMATCH',
        invitedEmail: invite.email
      });
    }

    // Claim the invite and create the membership atomically: the conditional update only
    // succeeds for a still-pending, unexpired invite, so concurrent/duplicate accepts cannot both win.
    const now = new Date();
    const grantedRole = await db.$transaction(async (tx) => {
      const { count } = await tx.teamInvite.updateMany({
        where: { id: invite.id, status: 'pending', expiresAt: { gt: now } },
        data: { status: 'accepted', acceptedAt: now }
      });
      if (count !== 1) return null;

      if (!alreadyMember) {
        await tx.teamMember.create({ data: { teamId: invite.teamId, userId, role: invite.role } });
        return invite.role;
      }
      // Never downgrade an existing member (or the owner) through an invitation
      if (invite.team.ownerId !== userId && (ROLE_RANK[invite.role] || 0) > (ROLE_RANK[alreadyMember.role] || 0)) {
        await tx.teamMember.update({ where: { id: alreadyMember.id }, data: { role: invite.role } });
        return invite.role;
      }
      return alreadyMember.role;
    });

    if (!grantedRole) {
      return res.status(409).json({ error: 'This invitation has already been accepted.' });
    }

    await logActivity({
      userId,
      action: 'MEMBER_JOINED',
      teamId: invite.teamId,
      targetTitle: req.user.email,
      details: `${req.user.name || req.user.email} accepted the invitation and joined "${invite.team.name}" as ${grantedRole}`,
      metadata: { inviteId: invite.id, email: invite.email, role: grantedRole }
    });

    return res.json({
      success: true,
      teamId: invite.teamId,
      role: grantedRole,
      teamName: invite.team.name,
      message: `Successfully joined "${invite.team.name}" as ${grantedRole}!`
    });
  } catch (error) {
    console.error('[Teams] Accept invitation failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Team Detail Workspace (Overview + stats + members)
router.get('/:id', authMiddleware, requireTeamRole('viewer'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { role: userRole, isOwner } = req.teamAccess!;

    const team = await db.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        forms: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            uniqueShareId: true,
            publicUrl: true,
            owner: {
              select: { id: true, name: true, email: true }
            },
            _count: {
              select: { responses: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        }
      }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const canManageMembers = teamRoleAtLeast(userRole, 'admin');
    const canEditForms = teamRoleAtLeast(userRole, 'editor');
    const canDeleteTeam = isOwner;

    const totalResponses = team.forms.reduce((acc, f) => acc + (f._count?.responses || 0), 0);

    // Normalize members so owner has role "owner"
    const normalizedMembers = team.members.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.userId === team.ownerId ? 'owner' : m.role,
      createdAt: m.createdAt,
      user: m.user
    }));

    return res.json({
      id: team.id,
      name: team.name,
      description: team.description,
      ownerId: team.ownerId,
      owner: team.owner,
      members: normalizedMembers,
      forms: team.forms.map(f => ({
        id: f.id,
        title: f.title,
        status: f.status,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        uniqueShareId: f.uniqueShareId,
        publicUrl: f.publicUrl,
        owner: f.owner,
        responseCount: f._count.responses
      })),
      stats: {
        totalForms: team.forms.length,
        totalResponses,
        totalMembers: team.members.length
      },
      permissions: {
        userRole,
        isOwner,
        canManageMembers,
        // Only the owner can invite, promote, demote or remove admins
        canManageAdmins: isOwner,
        canEditForms,
        canCreateForms: canEditForms,
        canEditSettings: canManageMembers,
        canDeleteTeam
      },
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    });
  } catch (error) {
    console.error('[Teams] Error fetching team detail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Team Forms with search, filter, and sorting
router.get('/:id/forms', authMiddleware, requireTeamRole('viewer'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { search, status, sort } = req.query;

    const whereClause: any = {
      teamId: id
    };

    if (search && typeof search === 'string' && search.trim()) {
      whereClause.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status.toUpperCase();
    }

    let orderBy: any = { updatedAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'title') orderBy = { title: 'asc' };

    const forms = await db.form.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { responses: true, questions: true }
        }
      },
      orderBy
    });

    const formattedForms = forms.map(f => ({
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status,
      owner: f.owner,
      responseCount: f._count.responses,
      questionCount: f._count.questions,
      uniqueShareId: f.uniqueShareId,
      publicUrl: f.publicUrl,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    }));

    return res.json(formattedForms);
  } catch (error) {
    console.error('[Teams] Error fetching team forms:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Team Activity History (the workspace audit log)
router.get('/:id/activity', authMiddleware, requireTeamRole('viewer'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const activities = await db.activity.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        form: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.json(activities);
  } catch (error) {
    console.error('[Teams] Error fetching team activity:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// GET: Workspace invitations with their status (Owner/Admin only). ?status=pending|accepted|expired|revoked
router.get('/:id/invitations', authMiddleware, requireTeamRole('admin'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : null;

    const invites = await db.teamInvite.findMany({
      where: { teamId: id },
      include: { invitedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    const serialized = invites.map(serializeTeamInvite);
    return res.json(statusFilter ? serialized.filter(i => i.status === statusFilter) : serialized);
  } catch (error) {
    console.error('[Teams] List invitations failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** Loads an open (pending or expired) invitation of the team in :id; admin invitations need the owner. */
const loadManageableInvite = async (req: TeamAccessRequest, res: Response) => {
  const { team, role } = req.teamAccess!;
  const invite = await db.teamInvite.findFirst({
    where: { id: req.params.inviteId, teamId: team.id, status: { in: ['pending', 'expired'] } },
    include: { invitedBy: { select: { name: true, email: true } } }
  });
  if (!invite) {
    res.status(404).json({ error: 'Invitation not found.' });
    return null;
  }
  if (invite.role === 'admin' && role !== 'owner') {
    res.status(403).json({ error: 'Only the workspace owner can manage admin invitations.' });
    return null;
  }
  return invite;
};

// POST: Resend an invitation with a fresh link and a new 7-day expiry (the previous link stops working)
router.post('/:id/invitations/:inviteId/resend', authMiddleware, requireTeamRole('admin'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { team } = req.teamAccess!;
    const invite = await loadManageableInvite(req, res);
    if (!invite) return;

    if (Date.now() - invite.lastSentAt.getTime() < INVITE_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ error: 'This invitation was just sent. Please wait a minute before resending it.' });
    }
    if (await inviteLimitReached(req.user.id)) {
      return res.status(429).json({ error: 'You have sent too many invitations in the last hour. Please try again later.' });
    }

    const { token, tokenHash } = createInviteToken();
    const now = new Date();
    const { count } = await db.teamInvite.updateMany({
      where: { id: invite.id, status: { in: ['pending', 'expired'] } },
      data: { tokenHash, token: null, status: 'pending', invitedById: req.user.id, lastSentAt: now, expiresAt: new Date(now.getTime() + INVITE_TTL_MS) }
    });
    if (count !== 1) return res.status(404).json({ error: 'Invitation not found.' });

    const refreshed = await db.teamInvite.findUniqueOrThrow({
      where: { id: invite.id },
      include: { invitedBy: { select: { name: true, email: true } } }
    });
    const result = await deliverTeamInvite(req, team.name, refreshed, token);

    await logActivity({
      userId: req.user.id,
      action: 'TEAM_INVITE_RESENT',
      teamId: team.id,
      targetTitle: invite.email,
      details: `${req.user.name || req.user.email} resent the invitation to ${invite.email}`,
      metadata: { inviteId: invite.id, email: invite.email, role: invite.role, emailSent: result.emailSent }
    });

    return res.json(result);
  } catch (error) {
    console.error('[Teams] Resend invitation failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Cancel/Revoke an open invitation (its link stops working)
router.delete('/:id/invitations/:inviteId', authMiddleware, requireTeamRole('admin'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { team } = req.teamAccess!;
    const invite = await loadManageableInvite(req, res);
    if (!invite) return;

    await db.teamInvite.updateMany({
      where: { id: invite.id, teamId: team.id, status: { in: ['pending', 'expired'] } },
      data: { status: 'revoked' }
    });

    await logActivity({
      userId: req.user.id,
      action: 'TEAM_INVITE_REVOKED',
      teamId: team.id,
      targetTitle: invite.email,
      details: `${req.user.name || req.user.email} cancelled the invitation to ${invite.email}`,
      metadata: { inviteId: invite.id, email: invite.email, role: invite.role }
    });

    return res.json({ message: 'Invitation revoked successfully.' });
  } catch (error) {
    console.error('[Teams] Revoke invitation failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Invite a member to the team by email (they join after accepting)
router.post('/:id/members', authMiddleware, requireTeamRole('admin'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { team, role: requesterRole } = req.teamAccess!;
    const { email, role } = inviteMemberSchema.parse(req.body);
    const recipientEmail = email.toLowerCase();

    if (role === 'admin' && requesterRole !== 'owner') {
      return res.status(403).json({ error: 'Only the workspace owner can invite admins.' });
    }

    // Check if user is already a team member
    const userToInvite = await db.user.findUnique({ where: { email: recipientEmail } });
    if (userToInvite) {
      const existingMember = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: userToInvite.id } }
      });
      if (existingMember || userToInvite.id === team.ownerId) {
        return res.status(400).json({ error: 'This user is already a member of this team.' });
      }
    }

    const domainError = await checkRecipientDomain(recipientEmail);
    if (domainError) {
      return res.status(400).json({ error: `${domainError}. Please check the email address.` });
    }

    if (await inviteLimitReached(req.user.id)) {
      return res.status(429).json({ error: 'You have sent too many invitations in the last hour. Please try again later.' });
    }

    const { token, tokenHash } = createInviteToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

    // Serialize invites per (team, email) so concurrent requests can't create two live invitations
    const invite = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`team-invite:${id}:${recipientEmail}`}))`;
      const live = await tx.teamInvite.findFirst({
        where: { teamId: id, email: recipientEmail, status: 'pending', expiresAt: { gt: now } }
      });
      if (live) return null;

      await tx.teamInvite.updateMany({
        where: { teamId: id, email: recipientEmail, status: 'pending' },
        data: { status: 'expired' }
      });
      return tx.teamInvite.create({
        data: { teamId: id, email: recipientEmail, role, tokenHash, status: 'pending', invitedById: req.user!.id, lastSentAt: now, expiresAt },
        include: { invitedBy: { select: { name: true, email: true } } }
      });
    });

    if (!invite) {
      return res.status(409).json({ error: 'An invitation is already pending for this email address. You can resend it from Pending invitations.' });
    }

    const result = await deliverTeamInvite(req, team.name, invite, token);

    await logActivity({
      userId: req.user.id,
      action: 'TEAM_INVITE_SENT',
      teamId: id,
      targetTitle: recipientEmail,
      details: `${req.user.name || req.user.email} invited ${recipientEmail} to join "${team.name}" as ${role}`,
      metadata: { inviteId: invite.id, email: recipientEmail, role, emailSent: result.emailSent }
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const invalidEmail = error.errors.some((e) => e.path[0] === 'email');
      return res.status(400).json({
        error: invalidEmail ? 'Please enter a valid email address.' : 'Validation failed',
        details: error.errors
      });
    }
    console.error('[Teams] Invite member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Change member role
router.put('/:id/members/:memberId', authMiddleware, requireTeamRole('admin'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id, memberId } = req.params;
    const { team, role: requesterRole } = req.teamAccess!;
    const { role } = updateRoleSchema.parse(req.body);

    const targetMember = await db.teamMember.findFirst({
      where: { id: memberId, teamId: id },
      include: { user: true }
    });
    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Cannot change owner's role through this endpoint
    if (targetMember.userId === team.ownerId) {
      return res.status(400).json({ error: 'Workspace owner role cannot be changed.' });
    }
    if (targetMember.userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }
    if ((targetMember.role === 'admin' || role === 'admin') && requesterRole !== 'owner') {
      return res.status(403).json({ error: 'Only the workspace owner can grant or change the admin role.' });
    }

    const updated = await db.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // Log Activity
    await logActivity({
      userId: req.user.id,
      action: 'ROLE_CHANGED',
      teamId: id,
      targetTitle: targetMember.user.email,
      details: `Role of ${targetMember.user.name || targetMember.user.email} changed to ${role}`,
      metadata: { memberId, email: targetMember.user.email, from: targetMember.role, to: role }
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Teams] Update role error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Remove member from team (any member may remove themselves, i.e. leave)
router.delete('/:id/members/:memberId', authMiddleware, requireTeamRole('viewer'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id, memberId } = req.params;
    const { team, role: requesterRole } = req.teamAccess!;

    const targetMember = await db.teamMember.findFirst({
      where: { id: memberId, teamId: id },
      include: { user: true }
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found in team.' });
    }

    const isSelf = targetMember.userId === req.user.id;

    if (targetMember.userId === team.ownerId) {
      return res.status(400).json({ error: 'Workspace owner cannot be removed.' });
    }
    if (!isSelf && !teamRoleAtLeast(requesterRole, 'admin')) {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required to remove members.' });
    }
    if (!isSelf && targetMember.role === 'admin' && requesterRole !== 'owner') {
      return res.status(403).json({ error: 'Only the workspace owner can remove admins.' });
    }

    await db.teamMember.delete({ where: { id: memberId } });

    // Log Activity
    await logActivity({
      userId: req.user.id,
      action: isSelf ? 'MEMBER_LEFT' : 'MEMBER_REMOVED',
      teamId: id,
      targetTitle: targetMember.user.email,
      details: isSelf
        ? `${targetMember.user.name || targetMember.user.email} left ${team.name}`
        : `${targetMember.user.name || targetMember.user.email} was removed from ${team.name}`,
      metadata: { memberId, email: targetMember.user.email, role: targetMember.role }
    });

    return res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('[Teams] Remove member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update team settings (name / description)
router.put('/:id', authMiddleware, requireTeamRole('admin'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { name, description } = updateTeamSchema.parse(req.body);

    const updated = await db.team.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined
      }
    });

    await logActivity({
      userId: req.user.id,
      action: 'TEAM_UPDATED',
      teamId: id,
      targetTitle: updated.name,
      details: `${req.user.name || req.user.email} updated workspace details`
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Teams] Update team error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Delete team (Owner only)
router.delete('/:id', authMiddleware, requireTeamRole('owner'), async (req: TeamAccessRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    await db.team.delete({ where: { id } });
    return res.json({ message: 'Team deleted successfully.' });
  } catch (error) {
    console.error('[Teams] Delete team error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
