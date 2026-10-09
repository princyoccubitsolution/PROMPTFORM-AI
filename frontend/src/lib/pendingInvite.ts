// A team invitation opened before signing in/up is remembered by /accept-invite so that
// authentication (including new-account onboarding) returns there to finish accepting it.
export function getPendingInviteUrl(): string | null {
  try {
    const token = localStorage.getItem('promptform_pending_invite');
    return token ? `/accept-invite?token=${encodeURIComponent(token)}` : null;
  } catch {
    return null;
  }
}

/** Where to send the user right after a successful login/registration. */
export function postAuthDestination(isNewUser: boolean, redirect?: string | null): string {
  const invite = getPendingInviteUrl();
  if (invite) return invite;
  if (isNewUser) return '/onboarding';
  return `/${(redirect || 'dashboard').replace(/^\/+/, '')}`;
}
