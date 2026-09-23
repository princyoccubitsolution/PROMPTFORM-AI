"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="relative min-h-screen bg-background dark:bg-background text-foreground dark:text-foreground transition-colors duration-200 overflow-x-hidden antialiased font-sans">
      
      {/* Background ambient glowing blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-200px] left-[20%] w-[500px] h-[500px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[-100px] right-[20%] w-[400px] h-[400px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* HEADER NAVBAR */}
      <SiteHeader />

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto px-6 pt-12 pb-20 relative z-10">
        <div className="mb-8 flex justify-between items-center">
          <Link href="/" className="flex items-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Home
          </Link>
          <span className="text-xs text-muted-foreground font-semibold">Last Updated: July 2026</span>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-foreground tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">Your privacy is extremely important to us. Learn how we handle, secure, and manage your data.</p>
        </div>

        {/* Privacy Articles */}
        <div className="bg-card/60 dark:bg-card/40 border border-border dark:border-border backdrop-blur-md rounded-[28px] p-6 md:p-10 space-y-8 shadow-sm">
          
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">1</span>
              Information We Collect
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              We collect information that you directly provide to us, including:
            </p>
            <ul className="list-disc pl-14 text-xs text-muted-foreground space-y-1.5">
              <li><strong>Account Credentials:</strong> Name, email address, password, and subscription information.</li>
              <li><strong>AI Form Context:</strong> Prompts, instructions, styling configurations, and files uploaded for parsing.</li>
              <li><strong>Response Data:</strong> The submissions, forms inputs, and data collected by the forms you build and run.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">2</span>
              How We Use Your Data
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              We process your data to deliver the AI Form generation service, including:
            </p>
            <ul className="list-disc pl-14 text-xs text-muted-foreground space-y-1.5">
              <li>Processing natural language prompts using LLM APIs to generate styled form components.</li>
              <li>Hosting forms and storing client responses in our secured database.</li>
              <li>Authenticating users, compiling metrics, and enforcing subscription credit limits.</li>
            </ul>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              We do <strong>not</strong> sell, rent, or trade your personal information or the response data collected by your forms to third parties.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">3</span>
              Data Protection & Security
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              All data transmitted to and from PromptForm AI is encrypted using Secure Socket Layer (SSL/TLS) technology. Database access is strictly controlled, and passwords are encrypted using high-security hashing functions. We implement robust protocols to prevent unauthorized access, loss, or manipulation of your data.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">4</span>
              Third-Party AI Services
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              When utilizing AI Form features, your text prompts may be processed by third-party LLM providers (such as the Gemini API). These providers do not use your prompt data to train public models, and all interactions comply with their respective privacy standards.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">5</span>
              Your Rights & Controls
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              You can view, edit, or delete any of your generated forms and response data directly from your dashboard. If you wish to delete your account entirely, please contact support and all associated account records will be wiped from our databases.
            </p>
          </div>

        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Have questions? Read our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> or contact support.
        </div>
      </main>

      <Footer />
    </div>
  );
}
