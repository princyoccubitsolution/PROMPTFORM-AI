// A team or form invitation opened before signing in/up is remembered by /accept-invite or
// /form-invite so that authentication (including new-account onboarding) returns there to finish accepting it.
export function getPendingInviteUrl(): string | null {
  try {
    const token = localStorage.getItem('promptform_pending_invite');
    if (token) return `/accept-invite?token=${encodeURIComponent(token)}`;
    const formToken = localStorage.getItem('promptform_pending_form_invite');
    return formToken ? `/form-invite?token=${encodeURIComponent(formToken)}` : null;
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
