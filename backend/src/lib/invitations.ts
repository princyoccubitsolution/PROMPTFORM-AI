import crypto from 'crypto';
import { Request } from 'express';

// Shared by form-collaborator and team-workspace invitations
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_RESEND_COOLDOWN_MS = 60 * 1000;
// Caps invitation emails per sender so invite endpoints can't be used to spam addresses
export const INVITES_PER_HOUR = 50;

export const hashInviteToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/** A 256-bit random token for the emailed link; only its hash is stored. */
export const createInviteToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashInviteToken(token) };
};

export const isInviteTokenFormat = (token: string) => /^[a-f0-9]{64}$/i.test(token);

/** Frontend origin for emailed links: the requesting app's own origin when present, else FRONTEND_URL. */
export const frontendBaseUrl = (req: Request) => {
  const reqOrigin = typeof req.headers.origin === 'string' && req.headers.origin.startsWith('http')
    ? req.headers.origin.replace(/\/+$/, '')
    : '';
  return (reqOrigin || process.env.FRONTEND_URL || 'https://promptform-ai-frontend.vercel.app').replace(/\/+$/, '');
};

// A pending invitation past its expiry is reported as expired even before its row is updated
export const effectiveInviteStatus = (invite: { status: string; expiresAt: Date }) =>
  invite.status === 'pending' && invite.expiresAt <= new Date() ? 'expired' : invite.status;
