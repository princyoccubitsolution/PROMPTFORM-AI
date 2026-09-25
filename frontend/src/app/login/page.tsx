"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Github, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useTheme } from 'next-themes';
import { BrandedLogo } from '@/components/NavigationHeader';

declare global {
  interface Window {
    google?: any;
    handleCredentialResponse?: (response: any) => void;
  }
}

function LoginContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || 'dashboard';
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check for OAuth error in URL query
    const authError = searchParams.get('error');
    if (authError) {
      setError(decodeURIComponent(authError));
    }

    // Handle token parameters if redirected directly to login
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    const isNewUserParam = searchParams.get('isNewUser');

    if (accessToken && refreshToken) {
      try {
        localStorage.setItem('promptform_access_token', accessToken);
        localStorage.setItem('promptform_refresh_token', refreshToken);
        if (emailParam) localStorage.setItem('promptform_user_email', decodeURIComponent(emailParam));
        if (nameParam) localStorage.setItem('promptform_user_name', decodeURIComponent(nameParam));

        if (isNewUserParam === 'true') {
          localStorage.setItem('promptform_needs_onboarding', 'true');
          window.location.replace('/onboarding');
        } else {
          window.location.replace(`/${redirect.replace(/^\/+/, '')}`);
        }
      } catch (e) {
        setError('Failed to save authentication session.');
      }
    }
  }, [searchParams, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('promptform_access_token', data.accessToken);
      localStorage.setItem('promptform_refresh_token', data.refreshToken);
      localStorage.setItem('promptform_user_email', data.user.email);
      localStorage.setItem('promptform_user_name', data.user.name || '');
      
      if (data.isNewUser) {
        localStorage.setItem('promptform_needs_onboarding', 'true');
        window.location.href = '/onboarding';
      } else {
        window.location.href = `/${redirect.replace(/^\/+/, '')}`;
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setError(null);
    const targetRedirect = redirect || 'dashboard';
    window.location.href = api.getOAuthGoogleUrl(targetRedirect);
  };

  const handleOAuthMock = (provider: string) => {
    alert(`OAuth provider ${provider} will be available soon.`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-25%] left-[30%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[20%] w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-[420px] bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6 relative z-10 transition-all duration-200">
        
        {/* Brand & Title */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 justify-center mb-1">
            <BrandedLogo size="md" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-xs text-muted-foreground">Sign in to your PromptForm AI workspace</p>
        </div>

        {/* Session Warning */}
        {reason === 'concurrent_session' && (
          <div className="p-3 bg-warning/10 border border-warning/20 text-amber-600 dark:text-amber-400 text-xs rounded-xl flex items-start gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-warning mt-0.5" />
            <span>Your session expired because you logged in from another device.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 h-11 text-sm font-medium rounded-xl bg-card dark:bg-card/90 border border-border text-foreground dark:text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                maxLength={100}
                required
                className="w-full pl-10 pr-10 h-11 text-sm font-medium rounded-xl bg-card dark:bg-card/90 border border-border text-foreground dark:text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="rounded border-border bg-card text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
              />
              <span className="font-medium">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-primary hover:opacity-85 transition-opacity font-semibold">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl font-bold text-sm bg-primary hover:opacity-90 text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">or sign in with</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* OAuth Providers */}
        <div className="space-y-2.5">
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 h-11 border border-border hover:bg-muted rounded-xl text-sm font-semibold text-foreground transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-2xs disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={() => handleOAuthMock("Microsoft")}
              className="flex items-center justify-center gap-1.5 h-10 border border-border hover:bg-muted rounded-xl text-xs font-semibold text-foreground transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <span>Microsoft</span>
            </button>
            <button 
              onClick={() => handleOAuthMock("GitHub")}
              className="flex items-center justify-center gap-1.5 h-10 border border-border hover:bg-muted rounded-xl text-xs font-semibold text-foreground transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="text-center pt-3 border-t border-border text-xs">
          <span className="text-muted-foreground">
            New here?{' '}
            <Link href="/register" className="text-primary hover:opacity-80 font-semibold transition-opacity">
              Create account
            </Link>
          </span>
        </div>
      </div>

      {/* Back to Landing */}
      <Link href="/" className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
        &larr; Back to landing page
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="text-muted-foreground animate-pulse text-sm font-medium">Loading authentication...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
