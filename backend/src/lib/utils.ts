import { db } from './db';

/**
 * Validates whether a given string is a valid UUID.
 */
export function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Generates a unique 6-character sharing code for forms.
 */
export async function generateUniqueShareId(): Promise<string> {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  let exists = true;
  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const dup = await db.form.findUnique({ where: { uniqueShareId: code } });
    if (!dup) exists = false;
  }
  return code;
}

/**
 * Checks if a user has access to a form based on ownership or team membership roles.
 */
export async function hasFormAccess(
  formId: string,
  userId: string,
  allowedRoles: string[] = ['admin', 'editor', 'viewer']
): Promise<boolean> {
  const isFormUUID = isUUID(formId);
  const form = await db.form.findFirst({
    where: isFormUUID ? { id: formId } : { uniqueShareId: formId }
  });
  if (!form) return false;
  if (form.ownerId === userId) return true;

  if (form.teamId) {
    const membership = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: form.teamId, userId } }
    });
    return !!membership && allowedRoles.includes(membership.role);
  }

  return false;
}
