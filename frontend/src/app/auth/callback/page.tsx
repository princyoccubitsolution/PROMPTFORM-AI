"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandedLogo } from '@/components/NavigationHeader';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setErrorMsg(decodeURIComponent(error));
      return;
    }

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const isNewUser = searchParams.get('isNewUser');
    const redirectParam = searchParams.get('redirect') || 'dashboard';

    if (accessToken && refreshToken) {
      try {
        localStorage.setItem('promptform_access_token', accessToken);
        localStorage.setItem('promptform_refresh_token', refreshToken);
        if (email) localStorage.setItem('promptform_user_email', decodeURIComponent(email));
        if (name) localStorage.setItem('promptform_user_name', decodeURIComponent(name));

        if (isNewUser === 'true') {
          localStorage.setItem('promptform_needs_onboarding', 'true');
          window.location.replace('/onboarding');
        } else {
          const cleanDest = redirectParam.replace(/^\/+/, '');
          window.location.replace(`/${cleanDest}`);
        }
      } catch (err: any) {
        setErrorMsg('Failed to store authentication tokens in browser.');
      }
    } else {
      setErrorMsg('No authentication tokens received from server.');
    }
  }, [searchParams]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-[420px] bg-card border border-destructive/20 rounded-2xl shadow-xl p-8 space-y-5 text-center relative z-10">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-destructive/10 text-destructive mb-1">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Authentication Failed</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{errorMsg}</p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="w-full h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 cursor-pointer"
            >
              <span>Back to Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="flex flex-col items-center space-y-4 text-center">
        <BrandedLogo size="lg" />
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground animate-pulse mt-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Completing Google sign in...</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="text-muted-foreground animate-pulse text-sm font-medium">Verifying authorization...</div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
