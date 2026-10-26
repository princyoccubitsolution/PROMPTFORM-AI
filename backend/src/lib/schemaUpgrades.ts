import { db } from './db';
import { logger } from './logger';

// The schema is applied with `prisma db push` (CI, local) and bootstrap only pushes into an empty
// database, so tables and columns added after a database was created are added here, idempotently.
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

// Team invitations gained hashed tokens, the inviting user and send/accept timestamps.
// Rows created before this keep their raw `token` so already-emailed links still work.
const TEAM_INVITE_DDL = [
  `CREATE TABLE IF NOT EXISTS "TeamInvite" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TeamInvite_token_key" ON "TeamInvite"("token")`,
  `CREATE INDEX IF NOT EXISTS "TeamInvite_token_idx" ON "TeamInvite"("token")`,
  `CREATE INDEX IF NOT EXISTS "TeamInvite_teamId_idx" ON "TeamInvite"("teamId")`,
  `CREATE INDEX IF NOT EXISTS "TeamInvite_email_idx" ON "TeamInvite"("email")`,
  `ALTER TABLE "TeamInvite" ALTER COLUMN "token" DROP NOT NULL`,
  `ALTER TABLE "TeamInvite" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT`,
  `ALTER TABLE "TeamInvite" ADD COLUMN IF NOT EXISTS "invitedById" TEXT`,
  `ALTER TABLE "TeamInvite" ADD COLUMN IF NOT EXISTS "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "TeamInvite" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TeamInvite_tokenHash_key" ON "TeamInvite"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "TeamInvite_invitedById_idx" ON "TeamInvite"("invitedById")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamInvite_invitedById_fkey') THEN
      ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`
];

async function runStatements(label: string, statements: string[]): Promise<void> {
  try {
    for (const statement of statements) {
      await db.$executeRawUnsafe(statement);
    }
    logger.db(`${label} schema verified.`);
  } catch (err: any) {
    logger.error(`${label} schema upgrade failed:`, err?.message || err);
  }
}

export async function applySchemaUpgrades(): Promise<void> {
  await runStatements('FormInvitation', FORM_INVITATION_DDL);
  await runStatements('TeamInvite', TEAM_INVITE_DDL);
}
