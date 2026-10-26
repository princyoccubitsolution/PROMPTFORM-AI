import { db } from './db';
import { logger } from './logger';

// The schema is applied with `prisma db push` (CI, local) and bootstrap only pushes into an empty
// database, so tables added after a database was created are added here, idempotently.
// The statements mirror `prisma migrate diff` output, so a later `db push` sees no drift.
const FORM_INVITATION_DDL = [
  `CREATE TABLE IF NOT EXISTS "FormInvitation" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedById" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FormInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FormInvitation_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FormInvitation_tokenHash_key" ON "FormInvitation"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "FormInvitation_email_idx" ON "FormInvitation"("email")`,
  `CREATE INDEX IF NOT EXISTS "FormInvitation_invitedById_idx" ON "FormInvitation"("invitedById")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FormInvitation_formId_email_key" ON "FormInvitation"("formId", "email")`
];

export async function ensureFormInvitationTable(): Promise<void> {
  try {
    for (const statement of FORM_INVITATION_DDL) {
      await db.$executeRawUnsafe(statement);
    }
    logger.db('FormInvitation table verified.');
  } catch (err: any) {
    logger.error('FormInvitation schema upgrade failed:', err?.message || err);
  }
}
