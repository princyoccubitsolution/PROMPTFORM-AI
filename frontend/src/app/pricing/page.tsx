"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  Sparkles, ArrowRight, CheckCircle, Moon, Sun, Search, Menu, X, ChevronDown,
  Star, Zap, ShieldCheck, Globe, Check, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UpgradeModal } from "@/components/UpgradeModal";
import { BrandedLogo } from "@/components/NavigationHeader";
import { SiteHeader } from "@/components/SiteHeader";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function PricingPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Billing & Currency State
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [currency, setCurrency] = useState<"USD" | "INR" | "EUR" | "GBP">("USD");

  // Plan Finder Assistant State
  const [planFinderOpen, setPlanFinderOpen] = useState(false);
  const [planFinderStep, setPlanFinderStep] = useState(0);
  const [planFinderAnswers, setPlanFinderAnswers] = useState({ forms: "", team: "", features: "" });
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null);

  // Modal State
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
    const authUser = localStorage.getItem("promptform_user");
    if (authUser) {
      setIsLoggedIn(true);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handlePlanFinderAnswer = (key: "forms" | "team" | "features", value: string) => {
    const updatedAnswers = { ...planFinderAnswers, [key]: value };
    setPlanFinderAnswers(updatedAnswers);

    if (planFinderStep < 2) {
      setPlanFinderStep(planFinderStep + 1);
    } else {
      let plan = "Free";
      if (
        updatedAnswers.forms === "unlimited" ||
        updatedAnswers.team === "enterprise" ||
        updatedAnswers.features === "sso"
      ) {
        plan = "Enterprise";
      } else if (
        updatedAnswers.forms === "pro" ||
        updatedAnswers.team === "pro" ||
        updatedAnswers.features === "cheat"
      ) {
        plan = "Pro";
      }
      setRecommendedPlan(plan);
      setPlanFinderStep(3);
    }
  };

  const resetPlanFinder = () => {
    setPlanFinderAnswers({ forms: "", team: "", features: "" });
    setRecommendedPlan(null);
    setPlanFinderStep(0);
    setPlanFinderOpen(false);
  };

  const faqs = [
    {
      question: "Can I switch plans or cancel my subscription anytime?",
      answer: "Yes, absolutely! You can upgrade, downgrade, or cancel your plan at any time directly from your account settings. If you upgrade, the prorated difference will be applied immediately."
    },
    {
      question: "What happens when I hit the 5 AI Forms limit on the Free plan?",
      answer: "You can keep using your 5 created forms indefinitely to receive responses. If you wish to generate additional AI forms or access advanced exam proctoring features, you can upgrade to the Pro or Enterprise plan."
    },
    {
      question: "Is there a money-back guarantee?",
      answer: "Yes! We offer a 14-day 100% money-back guarantee on all Pro and Enterprise paid plans. If you are not satisfied for any reason, reach out to support within 14 days for a full refund."
    },
    {
      question: "How does the Anti-Cheat & Secure Exam Mode work?",
      answer: "Our Secure Exam Mode includes tab-switch detection, copy-paste prevention, full-screen enforcement, proctoring logs, and question randomization to ensure total integrity during assessments."
    },
    {
      question: "Do you offer discounts for educational institutions and non-profits?",
      answer: "Yes! We offer up to 50% discount for registered educational institutions, students, and eligible non-profit organizations. Contact our sales team to claim your discount."
    }
  ];

  return (
    <div className="relative min-h-screen bg-background dark:bg-background text-foreground dark:text-foreground transition-colors duration-200 antialiased font-sans">
      
      {/* Background ambient glowing gradient */}
      <div className="absolute top-0 inset-x-0 flex justify-center overflow-hidden pointer-events-none z-0">
        <div className="w-[1080px] h-[550px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)]" />
      </div>

      {/* HEADER NAVBAR */}
      <SiteHeader />

      {/* HERO & PRICING HEADER */}
      <section className="relative pt-16 pb-12 text-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-6 max-w-7xl"
        >
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Pricing for Teams of All Sizes</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground dark:text-white leading-[1.15]">
            Simple plans for powerful forms
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto font-normal">
            Start completely free. Upgrade when you need unlimited AI form generation, anti-cheat exam proctoring, or custom branding.
          </p>

          {/* Billing Cycle Toggle & Currency Dropdown & Plan Finder */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-10">
            {/* Monthly vs Yearly Switch */}
            <div className="inline-flex items-center bg-muted/80 dark:bg-card p-1.5 rounded-full border border-border shadow-sm">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-5 py-2 rounded-full text-xs font-extrabold transition-all flex items-center space-x-2 cursor-pointer ${
                  billingPeriod === "yearly"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Yearly</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  billingPeriod === "yearly"
                    ? "bg-white text-primary"
                    : "bg-emerald-500 text-white animate-pulse"
                }`}>
                  Save 20%
                </span>
              </button>
            </div>

            {/* Currency Selector */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="px-4 py-2.5 pr-8 rounded-full text-xs font-extrabold bg-muted/80 dark:bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer appearance-none shadow-sm"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Plan Finder Assistant button */}
            <button
              onClick={() => setPlanFinderOpen(true)}
              className="text-xs font-bold text-primary hover:underline flex items-center space-x-1.5 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20 transition-all hover:bg-primary/10 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plan Finder Assistant</span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* PRICING CARDS SECTION */}
      <section className="pb-24 z-10 relative">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            
            {/* FREE TIER */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card dark:bg-card border border-border/80 rounded-3xl p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group"
            >
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">
                    Free Forever
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">Free</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Perfect for individuals and exploring AI form creation.</p>
                  
                  <div className="pt-4 flex items-baseline">
                    <span className="text-5xl font-bold tracking-tight text-foreground">$0</span>
                    <span className="text-xs text-muted-foreground font-semibold ml-2">/ forever</span>
                  </div>
                </div>

                <div className="border-b border-border/60" />

                <div className="text-[11px] font-extrabold text-foreground uppercase tracking-wider">What's included:</div>
                <ul className="space-y-3.5 text-xs text-muted-foreground font-medium">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Create up to <strong className="text-foreground">5 AI Forms</strong></span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>AI Prompt-to-Form Generator</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Drag & Drop Visual Form Builder</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>20+ Premium Field Widgets</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Unlimited Form Responses</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Basic Analytics & Charts</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>PDF / CSV Export</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                {isLoggedIn ? (
                  <Link href="/dashboard" className="block w-full">
                    <Button className="w-full py-3.5 text-sm font-extrabold bg-muted hover:bg-accent text-foreground border border-border rounded-xl transition-all shadow-sm">
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/register" className="block w-full">
                    <Button className="w-full py-3.5 text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-xl transition-all shadow-md">
                      Get Started Free
                    </Button>
                  </Link>
                )}
                <div className="text-[11px] text-muted-foreground mt-3 text-center font-medium">
                  No credit card required
                </div>
              </div>
            </motion.div>

            {/* PRO TIER (POPULAR) */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card dark:bg-card border-2 border-primary rounded-3xl p-8 flex flex-col justify-between shadow-2xl hover:shadow-primary/20 transition-all duration-300 relative group scale-[1.02]"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-md">
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>Most Popular</span>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest mb-3">
                    For Professionals
                  </div>
                  <h3 className="text-3xl font-bold text-primary">Pro</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">For educators, creators, and growing businesses.</p>
                  
                  <div className="pt-4 flex items-baseline">
                    <span className="text-5xl font-bold tracking-tight text-primary">
                      {(() => {
                        if (currency === "INR") return billingPeriod === "yearly" ? "₹799" : "₹999";
                        if (currency === "EUR") return billingPeriod === "yearly" ? "€14" : "€18";
                        if (currency === "GBP") return billingPeriod === "yearly" ? "£12" : "£16";
                        return billingPeriod === "yearly" ? "$15" : "$19";
                      })()}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold ml-2">
                      / month {billingPeriod === "yearly" && <span className="text-[10px] text-emerald-500 font-bold block">(billed annually)</span>}
                    </span>
                  </div>
                </div>

                <div className="border-b border-border/60" />

                <div className="text-[11px] font-extrabold text-primary uppercase tracking-wider">Everything in Free, plus:</div>
                <ul className="space-y-3.5 text-xs text-muted-foreground font-medium">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span><strong className="text-foreground">Unlimited</strong> AI Form Generations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>AI Form from PDF, Image & Document Scan</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Secure Exam Mode & Anti-Cheat Proctoring</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Smart Quiz Timer & Auto-Submit</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Conditional Logic & Branching Workflows</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>AI Sentiment Analysis & Summary Insights</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Custom Themes, Colors & Fonts</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Priority AI Speed & Response Generation</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                {isLoggedIn ? (
                  <Button 
                    onClick={() => setUpgradeModalOpen(true)}
                    className="w-full py-3.5 text-sm font-extrabold bg-primary hover:bg-primary/90 text-white border-none rounded-xl transition-all shadow-lg"
                  >
                    Upgrade to Pro Now
                  </Button>
                ) : (
                  <Link href="/register" className="block w-full">
                    <Button className="w-full py-3.5 text-sm font-extrabold bg-primary hover:bg-primary/90 text-white border-none rounded-xl transition-all shadow-lg">
                      Start Pro Trial
                    </Button>
                  </Link>
                )}
                <div className="flex items-center justify-center space-x-1.5 mt-3 text-xs font-bold text-primary">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                  <span>14-Day Money-Back Guarantee</span>
                </div>
              </div>
            </motion.div>

            {/* ENTERPRISE TIER */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card dark:bg-card border border-border/80 rounded-3xl p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group"
            >
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest mb-3">
                    Enterprise
                  </div>
                  <h3 className="text-3xl font-bold text-foreground">Enterprise</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">For large organizations requiring custom domains & SLAs.</p>
                  
                  <div className="pt-4 flex items-baseline">
                    <span className="text-5xl font-bold tracking-tight text-foreground">Custom</span>
                  </div>
                </div>

                <div className="border-b border-border/60" />

                <div className="text-[11px] font-extrabold text-foreground uppercase tracking-wider">Everything in Pro, plus:</div>
                <ul className="space-y-3.5 text-xs text-muted-foreground font-medium">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Unlimited Team Members & Workspaces</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Role-Based Access Control (RBAC)</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>White-Label Branding & Custom Subdomains</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>SAML / Single Sign-On (SSO)</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Dedicated Account Manager & 99.9% SLA</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>REST API Access & Custom Webhooks</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                {isLoggedIn ? (
                  <Button 
                    onClick={() => setUpgradeModalOpen(true)}
                    variant="outline"
                    className="w-full h-12 text-sm font-bold rounded-xl shadow-xs"
                  >
                    Contact Enterprise Sales
                  </Button>
                ) : (
                  <Link href="/register" className="block w-full">
                    <Button 
                      variant="outline"
                      className="w-full h-12 text-sm font-bold rounded-xl shadow-xs"
                    >
                      Contact Enterprise Sales
                    </Button>
                  </Link>
                )}
                <div className="text-[11px] text-muted-foreground mt-3 text-center font-medium">
                  Custom billing & PO invoicing available
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON TABLE */}
      <section className="py-20 border-t border-border/60 bg-card/40 dark:bg-card/20">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-foreground">Compare Plan Features</h2>
            <p className="mt-2 text-sm text-muted-foreground">Detailed view of capabilities included in each tier.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/80 dark:bg-card border-b border-border text-foreground font-bold">
                  <th className="p-4 md:p-5 text-sm">Feature Comparison</th>
                  <th className="p-4 md:p-5 text-center text-sm w-1/4">Free</th>
                  <th className="p-4 md:p-5 text-center text-sm text-primary w-1/4 bg-primary/5">Pro</th>
                  <th className="p-4 md:p-5 text-center text-sm text-purple-600 dark:text-purple-400 w-1/4">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium text-muted-foreground">
                <tr>
                  <td className="p-4 text-foreground font-bold">AI Forms Limit</td>
                  <td className="p-4 text-center">5 Forms</td>
                  <td className="p-4 text-center font-bold text-primary bg-primary/5">Unlimited</td>
                  <td className="p-4 text-center font-bold text-purple-600 dark:text-purple-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 text-foreground font-bold">Form Submissions</td>
                  <td className="p-4 text-center">Unlimited</td>
                  <td className="p-4 text-center font-bold text-primary bg-primary/5">Unlimited</td>
                  <td className="p-4 text-center font-bold text-purple-600 dark:text-purple-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 text-foreground font-bold">AI Generation from PDF / Images</td>
                  <td className="p-4 text-center text-muted-foreground/40">—</td>
                  <td className="p-4 text-center bg-primary/5"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-foreground font-bold">Anti-Cheat & Proctoring Exam Mode</td>
                  <td className="p-4 text-center text-muted-foreground/40">—</td>
                  <td className="p-4 text-center bg-primary/5"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-foreground font-bold">Conditional Logic & Branching</td>
                  <td className="p-4 text-center text-muted-foreground/40">—</td>
                  <td className="p-4 text-center bg-primary/5"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-foreground font-bold">Custom Domain & White-Labeling</td>
                  <td className="p-4 text-center text-muted-foreground/40">—</td>
                  <td className="p-4 text-center text-muted-foreground/40 bg-primary/5">—</td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-foreground font-bold">SAML / SSO Authentication</td>
                  <td className="p-4 text-center text-muted-foreground/40">—</td>
                  <td className="p-4 text-center text-muted-foreground/40 bg-primary/5">—</td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-foreground font-bold">Priority Support & SLA</td>
                  <td className="p-4 text-center">Community</td>
                  <td className="p-4 text-center bg-primary/5 font-semibold text-primary">Priority Email</td>
                  <td className="p-4 text-center font-bold text-purple-600 dark:text-purple-400">24/7 Dedicated Manager</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ ACCORDION SECTION */}
      <section className="py-20 border-t border-border/60">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-foreground">Frequently Asked Questions</h2>
            <p className="mt-2 text-sm text-muted-foreground">Everything you need to know about our plans and billing.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openFaq === idx ? "rotate-180 text-primary" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed font-normal border-t border-border/40 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST & GUARANTEE BANNER */}
      <section className="py-16 bg-primary/5 border-t border-border/60">
        <div className="container mx-auto px-6 max-w-5xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-4 text-left">
            <div className="p-3 bg-primary text-white rounded-2xl shadow-md">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-extrabold text-foreground">14-Day Money Back Guarantee</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Try Pro risk-free. If you're not completely satisfied, get a full refund within 14 days.</p>
            </div>
          </div>
          <Link href="/register">
            <Button variant="primary" className="bg-primary text-white py-3 px-8 text-sm font-extrabold rounded-xl shadow-lg hover:bg-primary/90 flex-shrink-0">
              Get Started Risk Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />

      {/* UPGRADE MODAL */}
      <UpgradeModal 
        isOpen={upgradeModalOpen} 
        onClose={() => setUpgradeModalOpen(false)}
        restriction={null}
        currency={currency}
      />

      {/* PLAN FINDER ASSISTANT MODAL */}
      {planFinderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
            <button
              onClick={resetPlanFinder}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-accent text-muted-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {planFinderStep === 0 && (
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Form Usage Goal</h3>
                  <p className="text-xs text-muted-foreground mt-1">How many forms do you plan to create?</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handlePlanFinderAnswer("forms", "free")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    1-5 Forms (Just starting out)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer("forms", "pro")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    6-30 Forms (Regular usage)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer("forms", "unlimited")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    Unlimited Forms (Power user / Team)
                  </button>
                </div>
              </div>
            )}

            {planFinderStep === 1 && (
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Team Collaboration</h3>
                  <p className="text-xs text-muted-foreground mt-1">Who will be managing the forms?</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handlePlanFinderAnswer("team", "free")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    Solo Creator (Just me)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer("team", "pro")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    Small Team (2-10 members)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer("team", "enterprise")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    Large Enterprise (Custom Domain & SSO)
                  </button>
                </div>
              </div>
            )}

            {planFinderStep === 2 && (
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Advanced Requirements</h3>
                  <p className="text-xs text-muted-foreground mt-1">What security features do you need?</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handlePlanFinderAnswer("features", "free")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    Basic quizzes and feedback forms
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer("features", "cheat")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    Anti-Cheat Proctored Exams & Timer
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer("features", "sso")}
                    className="w-full text-left p-3.5 rounded-2xl border border-border hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  >
                    White-label custom subdomains & SSO
                  </button>
                </div>
              </div>
            )}

            {planFinderStep === 3 && (
              <div className="space-y-5 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Our Recommendation</h3>
                  <p className="text-xs text-muted-foreground">Based on your choices, the best plan is:</p>
                  <div className="text-2xl font-bold text-primary mt-2 capitalize">
                    {recommendedPlan} Plan
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => {
                      const recPlan = recommendedPlan;
                      resetPlanFinder();
                      if (recPlan === "Free") {
                        router.push(isLoggedIn ? "/dashboard" : "/register");
                      } else {
                        if (isLoggedIn) {
                          setUpgradeModalOpen(true);
                        } else {
                          router.push("/register");
                        }
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    {recommendedPlan === "Free" ? "Get Started Free" : "Subscribe to " + recommendedPlan}
                  </button>
                  <button
                    onClick={resetPlanFinder}
                    className="w-full py-2.5 rounded-xl text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GLOBAL SEARCH MODAL */}
      <GlobalSearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
      />

    </div>
  );
}
