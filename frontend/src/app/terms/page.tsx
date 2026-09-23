"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Scale, Globe, RefreshCw } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/Footer';

export default function TermsOfService() {
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
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-foreground tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">Please read these terms and conditions carefully before using our AI Form Generator and associated suites.</p>
        </div>

        {/* Terms Articles */}
        <div className="bg-card/60 dark:bg-card/40 border border-border dark:border-border backdrop-blur-md rounded-[28px] p-6 md:p-10 space-y-8 shadow-sm">
          
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">1</span>
              Acceptance of Terms
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              By accessing, browsing, or using the PromptForm AI website, services, and AI generation features (collectively, the "Services"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you are not authorized to use the Services.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">2</span>
              AI Credit System & Billing
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              PromptForm AI operates on a credit-based subscription model. Generating, analyzing, and editing forms using our AI engine consumes credits. The dynamic credit allocations are:
            </p>
            <ul className="list-disc pl-14 text-xs text-muted-foreground space-y-1.5">
              <li><strong>Free Plan:</strong> 100 AI credits limit per month.</li>
              <li><strong>Pro Plan:</strong> 500 AI credits limit per month.</li>
              <li><strong>Enterprise Plan:</strong> Custom/unlimited priority AI generation.</li>
            </ul>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Credits reset at the start of each billing cycle and do not roll over. Subscription plans are billed on a recurring basis until cancelled.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">3</span>
              Ownership of Content
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              You retain all ownership rights to the prompts, uploaded files, branding, and responses collected by forms created using PromptForm AI. We do not claim any proprietary rights over your generated forms or the submissions they receive.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">4</span>
              Prohibited Activities
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              You agree not to use the Services to generate forms that collect highly sensitive personal data (e.g. passwords, payment credentials, government IDs without strict compliance) or promote illegal material, phishing campaigns, scam forms, or spamming practices. Accounts violating this policy will be suspended immediately without refund.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground dark:text-foreground flex items-center">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mr-2.5">5</span>
              Limitation of Liability
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              PromptForm AI is provided "as is" and "as available". We make no warranties, express or implied, regarding the accuracy, completeness, or reliability of AI-generated content. We are not liable for any lost data, service interruptions, or business disruptions arising from your use of the Services.
            </p>
          </div>

        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Have questions? Read our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> or contact support.
        </div>
      </main>

      <Footer />
    </div>
  );
}
