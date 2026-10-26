import { Response, NextFunction } from 'express';
import { Team, TeamMember } from '@prisma/client';
import { db } from '../lib/db';
import { AuthenticatedRequest } from './auth';

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

const ROLE_RANK: Record<TeamRole, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export const teamRoleAtLeast = (role: TeamRole | null | undefined, minRole: TeamRole) =>
  Boolean(role) && (ROLE_RANK[role as TeamRole] || 0) >= ROLE_RANK[minRole];

export interface TeamAccessRequest extends AuthenticatedRequest {
  teamAccess?: {
    team: Team;
    role: TeamRole;
    isOwner: boolean;
    membership: TeamMember | null;
  };
}

/** The caller's role in a team: 'owner' for the team owner, else their membership role, else null. */
export async function getTeamRole(teamId: string, userId: string): Promise<TeamRole | null> {
  const team = await db.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
  if (!team) return null;
  if (team.ownerId === userId) return 'owner';
  const membership = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  return membership && ROLE_RANK[membership.role as TeamRole] ? (membership.role as TeamRole) : null;
}

/**
 * Loads the team named by `:id` and the caller's role in it, rejecting non-members (workspace
 * isolation) and members below `minRole`. Must run after authMiddleware.
 */
export const requireTeamRole = (minRole: TeamRole) =>
  async (req: TeamAccessRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const team = await db.team.findUnique({ where: { id: req.params.id } });
      if (!team) return res.status(404).json({ error: 'Team not found' });

      const isOwner = team.ownerId === req.user.id;
      const membership = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId: team.id, userId: req.user.id } }
      });
      const memberRole = membership && ROLE_RANK[membership.role as TeamRole] ? (membership.role as TeamRole) : null;
      const role: TeamRole | null = isOwner ? 'owner' : memberRole;

      if (!role) {
        return res.status(403).json({ error: 'Forbidden. You are not a member of this workspace.' });
      }
      if (!teamRoleAtLeast(role, minRole)) {
        return res.status(403).json({ error: `Forbidden. This action requires the ${minRole} role or higher.` });
      }

      req.teamAccess = { team, role, isOwner, membership };
      next();
    } catch (error) {
      console.error('[Teams] Access check failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
