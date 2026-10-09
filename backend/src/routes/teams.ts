import crypto from 'crypto';
import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { logActivity } from '../lib/activity';
import { emailService } from '../services/emailService';

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
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

const updateRoleSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
});

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
// GET: Verify Invitation Token details (Public endpoint for /accept-invite page)
router.get('/invitations/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            owner: { select: { name: true, email: true } }
          }
        }
      }
    });

    if (!invite) return res.status(404).json({ error: 'Invitation not found or invalid token.' });

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: `This invitation has already been ${invite.status}.` });
    }

    if (invite.expiresAt < new Date()) {
      await db.teamInvite.update({ where: { id: invite.id }, data: { status: 'expired' } });
      return res.status(400).json({ error: 'This invitation link has expired. Please ask the team owner for a new invitation.' });
    }

    return res.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      teamId: invite.teamId,
      teamName: invite.team.name,
      teamDescription: invite.team.description,
      inviterName: invite.team.owner.name || invite.team.owner.email,
      expiresAt: invite.expiresAt
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Accept Team Workspace Invitation (Requires authenticated user)
router.post('/invitations/accept/:token', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { token } = req.params;

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: { team: true }
    });

    if (!invite) return res.status(404).json({ error: 'Invitation not found or invalid token.' });

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: `This invitation has already been ${invite.status}.` });
    }

    if (invite.expiresAt < new Date()) {
      await db.teamInvite.update({ where: { id: invite.id }, data: { status: 'expired' } });
      return res.status(400).json({ error: 'This invitation has expired.' });
    }

    // Add user as team member with the specified role
    const member = await db.teamMember.upsert({
      where: { teamId_userId: { teamId: invite.teamId, userId: req.user.id } },
      create: {
        teamId: invite.teamId,
        userId: req.user.id,
        role: invite.role
      },
      update: {
        role: invite.role
      },
      include: {
        team: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // Mark invitation as accepted
    await db.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted' }
    });

    // Log Activity
    await logActivity({
      userId: req.user.id,
      action: 'MEMBER_JOINED',
      teamId: invite.teamId,
      targetTitle: req.user.email,
      details: `${req.user.name || req.user.email} accepted invitation and joined "${invite.team.name}" as ${invite.role}`
    });

    return res.json({
      success: true,
      teamId: invite.teamId,
      role: invite.role,
      teamName: invite.team.name,
      message: `Successfully joined "${invite.team.name}" as ${invite.role}!`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Team Detail Workspace (Overview + stats + members)
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

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

    // Check membership authorization
    const isOwner = team.ownerId === req.user.id;
    const membership = team.members.find(m => m.userId === req.user!.id);

    if (!isOwner && !membership) {
      return res.status(403).json({ error: 'Forbidden. You are not a member of this workspace.' });
    }

    const userRole = isOwner ? 'owner' : (membership?.role || 'viewer');
    const canManageMembers = isOwner || userRole === 'admin';
    const canEditForms = isOwner || userRole === 'admin' || userRole === 'editor';
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
        canEditForms,
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
router.get('/:id/forms', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { search, status, sort } = req.query;

    const team = await db.team.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const isMember = team.ownerId === req.user.id || team.members.some(m => m.userId === req.user!.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Forbidden. You are not a member of this workspace.' });
    }

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

// GET: Team Activity History
router.get('/:id/activity', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const team = await db.team.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const isMember = team.ownerId === req.user.id || team.members.some(m => m.userId === req.user!.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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



// GET: List pending invitations for a team (Owner/Admin only)
router.get('/:id/invitations', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const team = await db.team.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });
    const isUserAdmin = team.ownerId === req.user.id || team.members.some(m => m.userId === req.user!.id && m.role === 'admin');

    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const invites = await db.teamInvite.findMany({
      where: { teamId: id, status: 'pending' },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(invites);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Cancel/Revoke pending invitation
router.delete('/:id/invitations/:inviteId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id, inviteId } = req.params;

    const team = await db.team.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });
    const isUserAdmin = team.ownerId === req.user.id || team.members.some(m => m.userId === req.user!.id && m.role === 'admin');

    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.teamInvite.update({
      where: { id: inviteId },
      data: { status: 'revoked' }
    });

    return res.json({ message: 'Invitation revoked successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Add/Invite member to team
router.post('/:id/members', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { email, role } = inviteMemberSchema.parse(req.body);

    const team = await db.team.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });
    const isUserAdmin = team.ownerId === req.user.id || 
      team.members.some((m: any) => m.userId === req.user?.id && m.role === 'admin');

    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
    }

    const recipientEmail = email.toLowerCase().trim();

    // Check if user is already a team member
    const userToInvite = await db.user.findUnique({ where: { email: recipientEmail } });
    if (userToInvite) {
      const existingMember = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: userToInvite.id } }
      });
      if (existingMember) {
        return res.status(400).json({ error: 'This user is already a member of this team.' });
      }
    }

    // Generate secure 32-byte token and 7-day expiration
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Cancel old pending invites for this email + teamId
    await db.teamInvite.deleteMany({
      where: { teamId: id, email: recipientEmail, status: 'pending' }
    });

    // Create TeamInvite record
    const invite = await db.teamInvite.create({
      data: {
        teamId: id,
        email: recipientEmail,
        role,
        token,
        status: 'pending',
        expiresAt
      }
    });

    // Send invitation email with token accept link
    const frontendUrl = process.env.FRONTEND_URL || 'https://promptform-ai-frontend.vercel.app';
    const inviteUrl = `${frontendUrl}/accept-invite?token=${token}`;

    const emailSent = await emailService.sendTeamInvitation({
      teamName: team.name,
      recipientEmail,
      inviterName: req.user.name || req.user.email,
      role,
      inviteUrl
    });

    // Log Activity
    await logActivity({
      userId: req.user.id,
      action: 'TEAM_INVITE_SENT',
      teamId: id,
      targetTitle: recipientEmail,
      details: `${req.user.name || req.user.email} invited ${recipientEmail} to join "${team.name}" as ${role}`
    });

    return res.status(201).json({
      success: true,
      pending: true,
      inviteId: invite.id,
      token: invite.token,
      inviteUrl,
      emailSent,
      message: emailSent
        ? `Invitation email sent to ${recipientEmail} as ${role.toUpperCase()}.`
        : `Invitation created successfully for ${recipientEmail}!`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Teams] Invite member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Change member role
router.put('/:id/members/:memberId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id, memberId } = req.params;
    const { role } = updateRoleSchema.parse(req.body);

    const team = await db.team.findUnique({
      where: { id },
      include: { members: { include: { user: true } } }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const requesterMember = team.members.find(m => m.userId === req.user!.id);
    const isOwner = team.ownerId === req.user.id;
    const isAdmin = requesterMember?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
    }

    const targetMember = team.members.find(m => m.id === memberId);
    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Cannot change owner's role through this endpoint
    if (targetMember.userId === team.ownerId) {
      return res.status(400).json({ error: 'Workspace owner role cannot be changed.' });
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
      details: `Role of ${targetMember.user.name || targetMember.user.email} changed to ${role}`
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

// DELETE: Remove member from team
router.delete('/:id/members/:memberId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id, memberId } = req.params;

    const team = await db.team.findUnique({
      where: { id },
      include: { members: { include: { user: true } } }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const requesterMember = team.members.find(m => m.userId === req.user?.id);
    const targetMember = team.members.find(m => m.id === memberId);

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found in team.' });
    }

    const isOwner = team.ownerId === req.user.id;
    const isAdmin = requesterMember?.role === 'admin';
    const isSelf = targetMember.userId === req.user.id;

    if (!isOwner && !isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (targetMember.userId === team.ownerId) {
      return res.status(400).json({ error: 'Workspace owner cannot be removed.' });
    }

    await db.teamMember.delete({ where: { id: memberId } });

    // Log Activity
    await logActivity({
      userId: req.user.id,
      action: 'MEMBER_REMOVED',
      teamId: id,
      targetTitle: targetMember.user.email,
      details: `${targetMember.user.name || targetMember.user.email} left or was removed from ${team.name}`
    });

    return res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('[Teams] Remove member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update team settings (name / description)
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { name, description } = updateTeamSchema.parse(req.body);

    const team = await db.team.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const isUserAdmin = team.ownerId === req.user.id || 
      team.members.some((m: any) => m.userId === req.user?.id && m.role === 'admin');

    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required to update workspace settings.' });
    }

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
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const team = await db.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Only the workspace owner can delete the team.' });
    }

    await db.team.delete({ where: { id } });
    return res.json({ message: 'Team deleted successfully.' });
  } catch (error) {
    console.error('[Teams] Delete team error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
