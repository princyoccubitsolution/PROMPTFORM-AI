"use client";

import React from "react";
import Link from "next/link";
import { BrandedLogo } from "./NavigationHeader";
import { ShieldCheck } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="w-full py-16 px-6 bg-muted/40 dark:bg-zinc-950/80 border-t border-border/60 dark:border-zinc-800 z-10 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Columns Grid */}
        <div className="border-b border-border/40 dark:border-zinc-800/80 pb-12 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
            
            {/* Column 1: Brand Logo & Tagline */}
            <div className="space-y-4">
              <div className="block">
                <BrandedLogo size="md" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400 leading-relaxed max-w-xs">
                Simplifying forms for modern businesses.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-xs md:text-sm text-muted-foreground dark:text-zinc-400">
                <li>
                  <Link href="/" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/#features" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal & Trust */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider">
                Legal & Trust
              </h4>
              <ul className="space-y-2.5 text-xs md:text-sm text-muted-foreground dark:text-zinc-400">
                <li>
                  <Link href="/privacy" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy#security" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    Security & SSL
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Support */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider">
                Support
              </h4>
              <ul className="space-y-2.5 text-xs md:text-sm text-muted-foreground dark:text-zinc-400">
                <li>
                  <Link href="/dashboard" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    Help Center
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@promptform.ai" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#status" className="hover:text-primary dark:hover:text-primary transition-colors inline-block">
                    System Status
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom Bar: Copyright & Security Lock */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground dark:text-zinc-400 gap-4 text-center sm:text-left">
          <div>
            &copy; {new Date().getFullYear()} PromptForm AI Inc. All rights reserved.
          </div>
          <div className="flex items-center space-x-1.5 text-foreground dark:text-zinc-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
