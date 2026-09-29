"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { BrandedLogo } from '@/components/NavigationHeader';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !newPassword.trim()) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        newPassword
      });
      setSuccessMessage(data.message || 'Password reset successfully! You can now log in.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please verify your email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[100px] -z-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[100px] -z-10"></div>

      <div className="mb-6">
        <BrandedLogo size="lg" />
      </div>

      <div className="w-full max-w-[420px]">
        <Card className="shadow-xl rounded-2xl border border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription className="text-sm">
              Enter your email and set a new password to regain access to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {successMessage ? (
              <div className="space-y-4 text-center py-2">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl font-medium leading-relaxed flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span>{successMessage}</span>
                </div>
                <Link href="/login" className="block w-full">
                  <Button size="lg" className="w-full mt-2 font-semibold">Back to Login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  isLoading={isLoading}
                  className="w-full mt-2 font-semibold"
                >
                  {isLoading ? 'Resetting password...' : 'Update Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Link href="/login" className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Login</span>
      </Link>
    </div>
  );
}
