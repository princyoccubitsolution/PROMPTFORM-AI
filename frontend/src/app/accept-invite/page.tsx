"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, CheckCircle2, AlertTriangle, Shield, ArrowRight, 
  Sparkles, Check, Lock, LogIn, UserPlus 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BrandedLogo } from '@/components/NavigationHeader';
import { api } from '@/lib/api';

function AcceptInviteContent() {
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

  const invitePath = `/accept-invite?token=${token}`;

  const goToAuth = (page: 'login' | 'register') => {
    router.push(`/${page}?redirect=${encodeURIComponent(invitePath)}`);
  };

  const switchAccount = () => {
    ['promptform_access_token', 'promptform_refresh_token', 'promptform_user_email', 'promptform_user_name'].forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });
    window.location.href = `/login?redirect=${encodeURIComponent(invitePath)}`;
  };

  const handleAccept = async () => {
    if (!token || acceptStarted.current) return;

    if (!localStorage.getItem('promptform_access_token')) {
      goToAuth(inviteDetails?.hasAccount === false ? 'register' : 'login');
      return;
    }

    acceptStarted.current = true;
    setIsAccepting(true);
    setErrorMessage(null);

    try {
      const res = await api.post(`/teams/invitations/accept/${token}`);
      try { localStorage.removeItem('promptform_pending_invite'); } catch {}
      setSuccessMessage(res.message || "Successfully joined team workspace!");
      // Full navigation so team lists and member counts are re-fetched from the server
      setTimeout(() => {
        window.location.href = `/dashboard?tab=team&teamId=${res.teamId}`;
      }, 1500);
    } catch (err: any) {
      acceptStarted.current = false;
      const msg: string = err.message || "Failed to accept invitation.";
      // Wrong account or an ended session: offer to sign in; the pending invite brings the user back here
      if (/signed in as|log in again/i.test(msg)) {
        setMismatch(true);
      } else if (/already been|expired|not found|cancelled/i.test(msg)) {
        try { localStorage.removeItem('promptform_pending_invite'); } catch {}
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
      setErrorMessage("No invitation token provided in the URL.");
      setIsLoading(false);
      return;
    }

    // Returning here from sign-up / sign-in for this same invite continues it without another click
    let resumingAfterAuth = false;
    try { resumingAfterAuth = loggedIn && localStorage.getItem('promptform_pending_invite') === token; } catch {}

    const verifyToken = async () => {
      try {
        const data = await api.get(`/teams/invitations/verify/${token}`);
        setInviteDetails(data);
        // Remember the invite so sign-up / onboarding can return here to finish accepting it
        try { localStorage.setItem('promptform_pending_invite', token); } catch {}
        setIsLoading(false);
        if (resumingAfterAuth) handleAccept();
      } catch (err: any) {
        const msg: string = err.message || "Invalid or expired invitation token.";
        setIsLoading(false);
        // A member reopening an accepted link is taken straight to the workspace
        if (loggedIn && /already been accepted/i.test(msg)) {
          handleAccept();
          return;
        }
        try { localStorage.removeItem('promptform_pending_invite'); } catch {}
        setErrorMessage(msg);
      }
    };

    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          ) : successMessage ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-md">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Welcome to the Team! 🎉</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {successMessage}
                </p>
              </div>
              <p className="text-[11px] text-primary font-semibold">Redirecting to workspace...</p>
            </div>
          ) : inviteDetails ? (
            <div className="space-y-6">
              
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Team Workspace Invite
                    </span>
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                      Active Invitation
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold uppercase border border-indigo-500/20">
                  {inviteDetails.role} Role
                </span>
              </div>

              {/* Invitation Info Card */}
              <div className="bg-muted/40 dark:bg-zinc-900/40 p-4 rounded-2xl border border-border/50 space-y-3">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                    Workspace Name
                  </span>
                  <h3 className="text-lg font-bold text-foreground leading-tight">
                    {inviteDetails.teamName}
                  </h3>
                  {inviteDetails.teamDescription && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {inviteDetails.teamDescription}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Invited By</span>
                    <span className="font-semibold text-foreground truncate block">
                      {inviteDetails.inviterName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Invited Email</span>
                    <span className="font-semibold text-foreground truncate block">
                      {inviteDetails.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Permissions Description */}
              <div className="p-3.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-primary">
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">{inviteDetails.role} Permissions</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {inviteDetails.role === 'editor'
                    ? 'You can create, edit and share forms, and view responses in this workspace.'
                    : inviteDetails.role === 'admin'
                    ? 'You can invite and remove users, manage forms and settings, and view analytics.'
                    : 'Read-only access: you can view forms and responses but cannot edit anything.'}
                </p>
              </div>

              {/* Action Button */}
              {isLoggedIn ? (
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isAccepting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Joining Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept Invitation & Access Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => goToAuth(inviteDetails.hasAccount === false ? 'register' : 'login')}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {inviteDetails.hasAccount === false ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                    <span>{inviteDetails.hasAccount === false ? 'Create Account to Accept Invitation' : 'Log In to Accept Invitation'}</span>
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    {inviteDetails.hasAccount === false ? 'Already have an account? ' : 'Need a new account? '}
                    <button
                      type="button"
                      onClick={() => goToAuth(inviteDetails.hasAccount === false ? 'login' : 'register')}
                      className="text-primary font-semibold hover:opacity-80 cursor-pointer"
                    >
                      {inviteDetails.hasAccount === false ? 'Log in' : 'Create one'}
                    </button>
                  </p>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Use <span className="font-semibold text-foreground">{inviteDetails.email}</span>; you'll join the workspace as soon as you're signed in.
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

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
