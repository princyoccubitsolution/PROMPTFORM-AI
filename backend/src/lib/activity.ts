import { db } from './db';

export interface LogActivityParams {
  userId: string;
  action: string; // TEAM_CREATED, MEMBER_INVITED, MEMBER_JOINED, MEMBER_REMOVED, ROLE_CHANGED, FORM_CREATED, FORM_UPDATED, FORM_DELETED, FORM_PUBLISHED, COLLABORATOR_ADDED, COLLABORATOR_REMOVED, RESPONSE_RECEIVED
  teamId?: string | null;
  formId?: string | null;
  targetTitle?: string | null;
  details?: string | null;
  metadata?: any;
}

export async function logActivity({
  userId,
  action,
  teamId,
  formId,
  targetTitle,
  details,
  metadata
}: LogActivityParams) {
  try {
    return await db.activity.create({
      data: {
        userId,
        action,
        teamId: teamId || null,
        formId: formId || null,
        targetTitle: targetTitle || null,
        details: details || null,
        metadata: metadata || null
      }
    });
  } catch (err) {
    console.error('[Activity] Failed to log activity:', err);
    return null;
  }
}
