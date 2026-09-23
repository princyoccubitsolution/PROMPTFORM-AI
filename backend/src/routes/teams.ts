import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(2),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

// GET: All teams user belongs to or owns
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
        _count: {
          select: { forms: true }
        }
      }
    });

    return res.json(teams);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Create workspace team
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name } = createTeamSchema.parse(req.body);

    const team = await db.team.create({
      data: {
        name,
        ownerId: req.user.id,
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

    return res.status(201).json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Add/Invite member to team
router.post('/:id/members', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { email, role } = inviteMemberSchema.parse(req.body);

    // Verify current user is admin/owner
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
    const userToInvite = await db.user.findUnique({ where: { email } });
    if (!userToInvite) {
      return res.status(404).json({ error: 'No user registered with this email.' });
    }

    // Check if already member
    const existingMember = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: userToInvite.id } }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this team.' });
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

    return res.status(201).json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Remove member from team
router.delete('/:id/members/:memberId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id, memberId } = req.params;

    // Check if team exists
    const team = await db.team.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Validate requester permissions (owner/admin or leaving themselves)
    const requesterMember = team.members.find((m: any) => m.userId === req.user?.id);
    const targetMember = team.members.find((m: any) => m.id === memberId);

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found in team.' });
    }

    const isOwner = team.ownerId === req.user.id;
    const isAdmin = requesterMember?.role === 'admin';
    const isSelf = targetMember.userId === req.user.id;

    if (!isOwner && !isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Owner cannot leave team this way
    if (targetMember.userId === team.ownerId) {
      return res.status(400).json({ error: 'Workspace owner cannot be removed.' });
    }

    await db.teamMember.delete({ where: { id: memberId } });
    return res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Rename team (Owner or Admin)
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { name } = createTeamSchema.parse(req.body);

    const team = await db.team.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const isUserAdmin = team.ownerId === req.user.id || 
      team.members.some((m: any) => m.userId === req.user?.id && m.role === 'admin');

    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required to rename team.' });
    }

    const updated = await db.team.update({
      where: { id },
      data: { name }
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
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
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
