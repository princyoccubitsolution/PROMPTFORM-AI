"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileText, CheckCircle2, AlertTriangle, Shield, ArrowRight, LogIn, UserPlus, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BrandedLogo } from '@/components/NavigationHeader';
import { api } from '@/lib/api';

const PENDING_FORM_INVITE_KEY = 'promptform_pending_form_invite';

const clearPendingFormInvite = () => {
  try { localStorage.removeItem(PENDING_FORM_INVITE_KEY); } catch {}
};

function FormInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [mismatch, setMismatch] = useState(false);
  // Guards against accepting twice (React strict mode runs effects twice in development)
  const acceptStarted = useRef(false);

  const invitePath = `/form-invite?token=${token}`;

  const goToAuth = (page: 'login' | 'register') => {
    router.push(`/${page}?redirect=${encodeURIComponent(invitePath)}`);
  };

  const switchAccount = () => {
    ['promptform_access_token', 'promptform_refresh_token', 'promptform_user_email', 'promptform_user_name'].forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });
    window.location.href = `/login?redirect=${encodeURIComponent(invitePath)}`;
  };

  const acceptInvitation = async () => {
    if (!token || acceptStarted.current) return;
    acceptStarted.current = true;
    setIsAccepting(true);
    setErrorMessage(null);

    try {
      const res = await api.post(`/forms/invitations/accept/${encodeURIComponent(token)}`);
      clearPendingFormInvite();
      setSuccessMessage(res.message || 'Invitation accepted.');
      // Full navigation so the builder and form lists load with the new access
      setTimeout(() => {
        window.location.href = `/builder/${res.formId}`;
      }, 1500);
    } catch (err: any) {
      acceptStarted.current = false;
      const msg: string = err.message || 'Failed to accept invitation.';
      // Wrong account or an ended session: offer to sign in; the pending invite brings the user back here
      if (/signed in as|log in again/i.test(msg)) {
        setMismatch(true);
      } else if (/already been|expired|not found|cancelled/i.test(msg)) {
        clearPendingFormInvite();
      }
      setErrorMessage(msg);
    } finally {
      setIsAccepting(false);
    }
  };

  useEffect(() => {
    const loggedIn = Boolean(localStorage.getItem('promptform_access_token'));
    setIsLoggedIn(loggedIn);

    if (!token) {
      setErrorMessage('No invitation token provided in the URL.');
      setIsLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const data = await api.get(`/forms/invitations/verify/${encodeURIComponent(token)}`);
        setInviteDetails(data);
        // Remember the invite so sign-up / sign-in can return here to finish accepting it
        try { localStorage.setItem(PENDING_FORM_INVITE_KEY, token); } catch {}
        setIsLoading(false);
        if (loggedIn) acceptInvitation();
      } catch (err: any) {
        const msg: string = err.message || 'Invalid or expired invitation link.';
        setIsLoading(false);
        // An invitee reopening an accepted link is taken straight back to the form
        if (loggedIn && /already been accepted/i.test(msg)) {
          acceptInvitation();
          return;
        }
        clearPendingFormInvite();
        setErrorMessage(msg);
      }
    };

    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const role: string = inviteDetails?.role || 'viewer';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background flex flex-col items-center justify-center p-4 sm:p-6">

      <div className="mb-8">
        <BrandedLogo size="lg" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 sm:p-8 backdrop-blur-xl bg-card/90 dark:bg-zinc-950/90 border border-border/80 shadow-2xl rounded-3xl relative overflow-hidden">

          {isLoading || (isAccepting && !inviteDetails) ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Verifying Invitation Link...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Invitation Error</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  {errorMessage}
                </p>
              </div>
              {mismatch && (
                <Button className="w-full rounded-xl mt-4" onClick={switchAccount}>
                  Sign in with the invited account
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full rounded-xl mt-4"
                onClick={() => router.push(isLoggedIn ? '/dashboard' : '/')}
              >
                {isLoggedIn ? 'Go to Dashboard' : 'Go to Home'}
              </Button>
            </div>
          ) : successMessage ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-md">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Invitation Accepted</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {successMessage}
                </p>
              </div>
              <p className="text-[11px] text-primary font-semibold">Opening the form...</p>
            </div>
          ) : inviteDetails ? (
            <div className="space-y-6">

              {/* Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Form Collaboration Invite
                    </span>
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                      Active Invitation
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold uppercase border border-indigo-500/20">
                  {role} Role
                </span>
              </div>

              {/* Invitation Info Card */}
              <div className="bg-muted/40 dark:bg-zinc-900/40 p-4 rounded-2xl border border-border/50 space-y-3">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                    Form
                  </span>
                  <h3 className="text-lg font-bold text-foreground leading-tight break-words">
                    {inviteDetails.formTitle}
                  </h3>
                  {inviteDetails.formDescription && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {inviteDetails.formDescription}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Invited By</span>
                    <span className="font-semibold text-foreground truncate block">
                      {inviteDetails.inviterName}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Invited Email</span>
                    <span className="font-semibold text-foreground truncate block">
                      {inviteDetails.email}
                    </span>
                  </div>
                </div>

                {inviteDetails.expiresAt && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires {new Date(inviteDetails.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Role Permissions Description */}
              <div className="p-3.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-primary">
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">{role} Permissions</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {role === 'editor'
                    ? 'You can modify this form\'s questions, logic, and settings.'
                    : 'You have read-only preview access to this form\'s structure.'}
                </p>
              </div>

              {/* Action Button */}
              {isLoggedIn ? (
                <Button
                  onClick={acceptInvitation}
                  disabled={isAccepting}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isAccepting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Accepting Invitation...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept Invitation & Open Form</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => goToAuth(inviteDetails.hasAccount ? 'login' : 'register')}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {inviteDetails.hasAccount ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span>{inviteDetails.hasAccount ? 'Sign In to Accept Invitation' : 'Create Account to Accept Invitation'}</span>
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    {inviteDetails.hasAccount ? 'Need a new account? ' : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => goToAuth(inviteDetails.hasAccount ? 'register' : 'login')}
                      className="text-primary font-semibold hover:opacity-80 cursor-pointer"
                    >
                      {inviteDetails.hasAccount ? 'Create one' : 'Sign in'}
                    </button>
                  </p>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Use <span className="font-semibold text-foreground">{inviteDetails.email}</span> and you'll get access automatically.
                  </p>
                </div>
              )}

            </div>
          ) : null}

        </Card>
      </motion.div>
    </div>
  );
}

export default function FormInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FormInviteContent />
    </Suspense>
  );
}
