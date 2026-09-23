"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Eye, EyeOff, Building, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { registerSchema } from '@promptform/shared';
import { useTheme } from 'next-themes';
import { BrandedLogo } from '@/components/NavigationHeader';

export default function RegisterPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // No automatic redirect on mount so user can see register form even if token exists

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptTerms) {
      setError("You must accept the terms and conditions.");
      return;
    }

    // Client-side schema validation using shared package
    const validationResult = registerSchema.safeParse({
      email,
      name: name.trim() || undefined,
      password,
    });

    if (!validationResult.success) {
      setError(validationResult.error.errors[0].message);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const data = await api.post('/auth/register', { 
        email, 
        password,
        name: name.trim() || undefined 
      });
      
      // Store credentials on successful register
      localStorage.setItem('promptform_access_token', data.accessToken);
      localStorage.setItem('promptform_refresh_token', data.refreshToken);
      localStorage.setItem('promptform_user_email', data.user.email);
      localStorage.setItem('promptform_user_name', data.user.name || '');

      if (data.isNewUser) {
        localStorage.setItem('promptform_needs_onboarding', 'true');
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockGoogleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.post('/auth/login', { idToken: 'mock_google_tester' });
      localStorage.setItem('promptform_access_token', data.accessToken);
      localStorage.setItem('promptform_refresh_token', data.refreshToken);
      localStorage.setItem('promptform_user_email', data.user.email);
      localStorage.setItem('promptform_user_name', data.user.name || '');
      
      if (data.isNewUser) {
        localStorage.setItem('promptform_needs_onboarding', 'true');
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Mock Google Signup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  const inputCls = "w-full pl-10 pr-4 h-11 text-sm font-medium rounded-xl bg-card dark:bg-card/70 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs";
  const autofillStyle = {
    WebkitTextFillColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
    transition: 'background-color 5000s ease-in-out 0s'
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-25%] left-[30%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[20%] w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Register Card */}
      <div className="w-full max-w-[440px] bg-card border border-border rounded-2xl shadow-xl p-8 space-y-5 relative z-10 transition-colors duration-200">
        
        {/* Brand & Title */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 justify-center mb-1">
            <BrandedLogo size="md" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
          <p className="text-xs text-muted-foreground">Start building intelligent, conversational forms in seconds</p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Building className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
                style={autofillStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputCls}
                  style={autofillStyle}
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={inputCls}
                  style={autofillStyle}
                />
              </div>
            </div>
          </div>

          {/* Show password button & Accept terms inline */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={() => setAcceptTerms(!acceptTerms)}
                required
                className="rounded border-border bg-card text-primary focus:ring-primary/20 w-4 h-4"
              />
              <span>I accept Terms & Privacy</span>
            </label>
            
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-medium"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? "Hide" : "Show"}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl font-semibold text-sm bg-primary hover:opacity-90 text-primary-foreground shadow-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-muted-foreground text-[11px] uppercase font-semibold tracking-wider">or register with</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Google Signup */}
        <button
          onClick={handleMockGoogleRegister}
          className="w-full h-11 flex items-center justify-center gap-2 border border-border hover:bg-accent text-foreground rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] shadow-2xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Footer actions */}
        <div className="text-center pt-3 border-t border-border text-xs">
          <span className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:opacity-80 font-semibold transition-opacity">
              Sign In
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
