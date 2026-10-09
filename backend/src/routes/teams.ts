import { Router, Response } from 'express';
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

    // Resolve user by email
    const userToInvite = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    const frontendUrl = process.env.FRONTEND_URL || 'https://promptform-ai-frontend.vercel.app';

    if (!userToInvite) {
      const inviteUrl = `${frontendUrl}/login?signup=true&email=${encodeURIComponent(email)}&teamId=${id}`;
      const emailSent = await emailService.sendTeamInvitation({
        teamName: team.name,
        recipientEmail: email.toLowerCase(),
        inviterName: req.user.name || req.user.email,
        role,
        inviteUrl
      });

      if (emailSent) {
        return res.status(200).json({
          pending: true,
          emailSent: true,
          message: `Team invitation email dispatched to ${email}. They will join the workspace upon signing up.`
        });
      } else {
        return res.status(400).json({
          error: `Could not send invitation email to ${email}. Please ensure SMTP environment settings are configured in production.`
        });
      }
    }

    // Check if already member
    const existingMember = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: userToInvite.id } }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'This user is already a member of this team.' });
    }

    const member = await db.teamMember.create({
      data: {
        teamId: id,
        userId: userToInvite.id,
        role
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    const inviteUrl = `${frontendUrl}/dashboard?tab=team&teamId=${id}`;
    const emailSent = await emailService.sendTeamInvitation({
      teamName: team.name,
      recipientEmail: userToInvite.email,
      inviterName: req.user.name || req.user.email,
      role,
      inviteUrl
    });

    // Log Activity
    await logActivity({
      userId: req.user.id,
      action: 'MEMBER_JOINED',
      teamId: id,
      targetTitle: userToInvite.email,
      details: `${userToInvite.name || userToInvite.email} joined ${team.name} as ${role}`
    });

    return res.status(201).json({
      ...member,
      emailSent
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
