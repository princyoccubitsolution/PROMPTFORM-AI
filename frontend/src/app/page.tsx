"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  Sparkles, ArrowRight, Shield, Zap, BarChart3, Moon, Sun, 
  CheckCircle, Menu, X, ChevronDown, Palette, Timer, Shuffle, Star, Lock,
  FileText, Target, ShieldCheck, Globe, Headphones, Image, Scan, Mail, MessageSquare, Search,
  Users, GitBranch, Code, Smartphone, MousePointerClick, HelpCircle, Minus, Laptop
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UpgradeModal } from '@/components/UpgradeModal';
import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeAITab, setActiveAITab] = useState<'prompt' | 'pdf' | 'image' | 'smart_scan' | 'email' | 'thank_you' | 'search'>('prompt');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<'All' | 'Education' | 'Business' | 'Feedback' | 'Personal'>('All');

  const promptSuggestions = [
    "Create a patient intake form for a dentistry clinic with insurance fields",
    "Create a programming assessment quiz with 5 JavaScript questions",
    "Create a customer feedback survey with net promoter score and ratings",
    "Create an event registration form for a product launch with t-shirt selector"
  ];
  const [typedPrompt, setTypedPrompt] = useState("");
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Billing States
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [currency, setCurrency] = useState<'USD' | 'INR' | 'EUR' | 'GBP'>('USD');
  const [planFinderOpen, setPlanFinderOpen] = useState(false);
  const [planFinderStep, setPlanFinderStep] = useState(0);
  const [planFinderAnswers, setPlanFinderAnswers] = useState({ forms: '', team: '', features: '' });
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setTimeout(() => setNewsletterSubscribed(false), 4000);
      setNewsletterEmail("");
    }
  };

  const handlePlanFinderAnswer = (key: 'forms' | 'team' | 'features', value: string) => {
    const updatedAnswers = { ...planFinderAnswers, [key]: value };
    setPlanFinderAnswers(updatedAnswers);
    
    if (planFinderStep < 2) {
      setPlanFinderStep(planFinderStep + 1);
    } else {
      // Calculate recommendation
      let plan = 'Free';
      if (
        updatedAnswers.forms === 'unlimited' || 
        updatedAnswers.team === 'enterprise' || 
        updatedAnswers.features === 'sso'
      ) {
        plan = 'Enterprise';
      } else if (
        updatedAnswers.forms === 'pro' || 
        updatedAnswers.team === 'pro' || 
        updatedAnswers.features === 'cheat'
      ) {
        plan = 'Pro';
      }
      setRecommendedPlan(plan);
      setPlanFinderStep(3); // Recommendation screen
    }
  };

  const resetPlanFinder = () => {
    setPlanFinderAnswers({ forms: '', team: '', features: '' });
    setRecommendedPlan(null);
    setPlanFinderStep(0);
    setPlanFinderOpen(false);
  };

  // Load login status on mount
  useEffect(() => {
    setMounted(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('promptform_access_token') : null;
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // Typing carousel logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentFullText = promptSuggestions[currentPromptIdx];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setTypedPrompt(prev => prev.slice(0, -1));
      }, 30);
    } else {
      timer = setTimeout(() => {
        setTypedPrompt(currentFullText.slice(0, typedPrompt.length + 1));
      }, 55);
    }

    if (!isDeleting && typedPrompt === currentFullText) {
      timer = setTimeout(() => setIsDeleting(true), 2500);
    } else if (isDeleting && typedPrompt === "") {
      setIsDeleting(false);
      setCurrentPromptIdx(prev => (prev + 1) % promptSuggestions.length);
    }

    return () => clearTimeout(timer);
  }, [typedPrompt, isDeleting, currentPromptIdx]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleAIDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      localStorage.setItem('promptform_initial_ai_prompt', promptText);
      if (isLoggedIn) {
        router.push('/dashboard/ai');
      } else {
        router.push('/login?redirect=dashboard/ai');
      }
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-background dark:bg-background text-foreground dark:text-foreground transition-colors duration-200 antialiased font-sans">
      
      {/* Background ambient glowing blobs */}
      <div className="absolute top-0 inset-x-0 flex justify-center overflow-hidden pointer-events-none z-0">
        <div className="w-[1080px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
      </div>

      {/* HEADER NAVBAR */}
      <SiteHeader />

      {/* HERO SECTION */}
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-32 text-center z-10 border-b border-border dark:border-white/[0.05]">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="container mx-auto px-6 max-w-7xl flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-xs backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary tracking-widest uppercase">AI-Powered Form Generation</span>
          </motion.div>

          {/* Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.05] max-w-5xl mx-auto"
          >
            Build any form, quiz, or survey <br className="hidden sm:inline" />
            <span className="text-primary">
              from a single prompt
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            PromptForm AI turns one sentence into a complete, professional form — questions, logic, themes, and analytics. No dragging, no manual work.
          </motion.p>

          {/* Interactive AI Prompt Input Box */}
          <motion.form 
            onSubmit={handleAIDemoSubmit} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-auto mt-10 relative z-25"
          >
            {/* Ambient Glow behind input */}
            <div className="absolute -inset-1 bg-primary/20 rounded-[2rem] blur-xl opacity-30" />
            
            <div className="relative flex flex-col sm:flex-row items-center gap-2 bg-card/90 backdrop-blur-xl border border-border p-2 rounded-2xl shadow-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-card transition-all duration-300">
              <div className="flex items-center space-x-3 flex-1 w-full px-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g. Create a patient registration form with satisfaction stars..."
                  className="w-full bg-transparent border-none outline-none text-base text-foreground placeholder-muted-foreground focus:ring-0 py-3 font-normal"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isGenerating}
                className="w-full sm:w-auto bg-primary hover:opacity-90 text-primary-foreground font-semibold rounded-xl py-3 px-6 text-sm flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98] shadow-sm"
              >
                <span>{isGenerating ? 'Generating...' : 'Build Form Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 font-medium">
              No credit card required · Free plan forever
            </p>
          </motion.form>
 
          {/* Browser Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-5xl mx-auto mt-16"
          >
            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-2xl overflow-hidden text-left">
              {/* Browser bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-b border-border">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-red-400 block" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400 block" />
                  <span className="w-3 h-3 rounded-full bg-green-400 block" />
                </div>
                <div className="bg-background/80 border border-border px-6 py-1 rounded-lg text-xs text-muted-foreground font-mono tracking-tight select-none flex items-center space-x-2">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>promptform.ai/generate</span>
                </div>
                <div className="w-12" /> {/* spacer */}
              </div>

              {/* Browser Content */}
              <div className="p-4 sm:p-8 md:p-12 space-y-6 bg-card">
                
                {/* AI Prompt Input Bar with dynamic Typing Carousel */}
                <div className="border border-border bg-muted/30 rounded-2xl p-5 flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">AI Zia Agent Simulator</div>
                    <div className="text-base font-medium text-foreground leading-relaxed font-sans min-h-[36px] flex items-center">
                      <span>"{typedPrompt}"</span>
                      <span className="w-[2px] h-5 bg-primary ml-1.5 animate-pulse inline-block" />
                    </div>
                  </div>
                </div>

                {/* AI Output Alert Banner */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 px-4 flex items-center space-x-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Form generated in 1.2s — 7 fields, payment section, dropdown, theme applied</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* STATS ROW */}
      <section className="py-12 border-y border-border bg-card">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl font-extrabold text-foreground">50K+</div>
              <div className="text-xs md:text-sm font-semibold text-muted-foreground">Forms Created</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl font-extrabold text-foreground">2M+</div>
              <div className="text-xs md:text-sm font-semibold text-muted-foreground">Responses Collected</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl font-extrabold text-foreground">99.9%</div>
              <div className="text-xs md:text-sm font-semibold text-muted-foreground">Uptime</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl font-extrabold text-foreground">4.9/5</div>
              <div className="text-xs md:text-sm font-semibold text-muted-foreground">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="features" className="py-24 bg-muted/40 border-b border-border">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.55 }}
          className="container mx-auto px-6 max-w-7xl"
        >
          <div className="text-center mb-16 space-y-3">
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary select-none uppercase tracking-wider">
              Features
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Everything you need to build, run, and analyze
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              From AI generation to secure exams to intelligent analytics — PromptForm AI is the complete platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 space-y-4 group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl w-fit text-primary">
                  <Sparkles className="w-5.5 h-5.5 group-hover:scale-110 transition-transform" />
                </div>
                {/* 360 Rotating Mini Badge */}
                <div className="animate-spin360 text-primary opacity-60">
                  <svg className="w-6 h-6" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray="30 40 10 20" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">AI Form Generator</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-normal">
                  Type a single prompt and AI builds a complete form with questions, options, logic, and theme — instantly.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 space-y-4">
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl w-fit text-primary">
                <Palette className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">AI Form Designer</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-normal">
                  AI generates premium, mobile-responsive UI with brand colors, animations, and professional layouts. No design skills needed.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 space-y-4 group">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl w-fit text-primary">
                  <Shield className="w-5.5 h-5.5 group-hover:scale-110 transition-transform" />
                </div>
                {/* 360 Rotating Radar Mini Badge */}
                <div className="animate-spin360 text-primary opacity-60">
                  <svg className="w-6 h-6" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="60 30" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Secure Exam Mode</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-normal">
                  Anti-tab-switch, copy/paste blocking, devtools detection, fullscreen enforcement, and AI cheating score for proctored exams.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 space-y-4">
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl w-fit text-primary">
                <BarChart3 className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">AI Analytics</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Go beyond charts. Get AI insights, difficulty analysis, performance trends, and exportable PDF/Excel reports.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 space-y-4">
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl w-fit text-primary">
                <Timer className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Smart Quiz Timer</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Server-based countdown, per-question timers, auto-submit, and warnings before time expires.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 space-y-4">
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl w-fit text-primary">
                <Shuffle className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Randomization Engine</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Shuffle question order, option order, and sections per candidate to prevent cheating effectively.
                </p>
              </div>
            </div>

          </div>
        </motion.div>
      </section>

      {/* INTERACTIVE AI CAPABILITIES SECTION (ZOHO FORMS INSPIRED) */}
      <section className="py-24 bg-card border-b border-border">
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.55 }}
          className="container mx-auto px-6 max-w-7xl"
        >
          <div className="text-center mb-16 space-y-3">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/5 border border-primary/20 text-[11px] font-bold text-primary select-none uppercase tracking-wider">
              AI Zia-Powered Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground dark:text-white leading-[1.1]">
              7 AI features built directly into your forms
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
              Experience the power of a centralized AI Assistant. Click each tab below to preview what Zia can do for your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-start">
            {/* Tabs List (Left Column) */}
            <div className="md:col-span-5 space-y-2">
              {[
                { id: 'prompt', label: 'AI Form Builder', desc: 'Generate complete forms from a single prompt.', icon: Sparkles },
                { id: 'pdf', label: 'AI Forms from PDFs', desc: 'Convert static PDF forms into digital pages.', icon: FileText },
                { id: 'image', label: 'Image-to-Form', desc: 'Turn photos of paper forms into editable fields.', icon: Image },
                { id: 'smart_scan', label: 'Smart Scan Prefill', desc: 'Auto-fill fields from scanned receipts and IDs.', icon: Scan },
                { id: 'email', label: 'AI Email Assistant', desc: 'Draft responsive notification emails instantly.', icon: Mail },
                { id: 'thank_you', label: 'Thank You Page Generator', desc: 'Formulate custom confirmation messages.', icon: MessageSquare },
                { id: 'search', label: 'AI Settings Search', desc: 'Find and toggle any form option instantly.', icon: Search }
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeAITab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAITab(tab.id as any)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start space-x-3.5 ${
                      isActive 
                        ? 'bg-primary/5 border-primary/30 text-primary shadow-sm'
                        : 'bg-card/45 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'} flex-shrink-0`}>
                      <TabIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold leading-tight">{tab.label}</div>
                      <div className="text-xs text-muted-foreground leading-normal font-normal">{tab.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Preview Canvas (Right Column) */}
            <div className="md:col-span-7 bg-muted/30 dark:bg-card border border-border dark:border-border rounded-2xl p-6 min-h-[460px] flex flex-col justify-between shadow-sm">
              <div className="flex-1 flex flex-col justify-center">
                {activeAITab === 'prompt' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">AI Prompt Generator Simulator</div>
                    <div className="bg-card dark:bg-background border border-border/85 rounded-xl p-4 space-y-3 font-mono text-xs">
                      <div className="text-muted-foreground select-none">// Zia AI Engine active</div>
                      <div className="flex items-center space-x-1.5 text-foreground">
                        <span className="text-primary">&gt;</span>
                        <span>Prompt: "Create patient intake for dentistry"</span>
                      </div>
                      <div className="border-t border-border/40 pt-3 space-y-2 text-foreground/80">
                        <div className="text-emerald-500 font-bold select-none">✓ Form built successfully!</div>
                        <div>+ Field: Full Name [name]</div>
                        <div>+ Field: Date of Birth [date]</div>
                        <div>+ Field: Insurance Provider [short_text]</div>
                        <div>+ Field: Patient Consent Checkbox [agreement]</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeAITab === 'pdf' && (
                  <div className="space-y-6 animate-fadeIn text-center py-6">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider text-left">PDF-to-Digital-Form Scan</div>
                    <div className="max-w-xs mx-auto border border-dashed border-primary/30 rounded-xl p-8 bg-card dark:bg-background/40 flex flex-col items-center space-y-3">
                      <FileText className="w-12 h-12 text-primary animate-pulse" />
                      <div className="text-xs font-bold text-foreground">admission_form.pdf</div>
                      <div className="text-[10px] text-muted-foreground">1.8 MB · Uploaded</div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[85%] animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600">Extracting 8 fields...</span>
                    </div>
                  </div>
                )}

                {activeAITab === 'image' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Camera Scan Snapshot</div>
                    <div className="relative border border-border bg-card rounded-xl p-4 overflow-hidden">
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-bold text-primary tracking-wide">ZIA SCANNER</div>
                      <div className="h-40 bg-muted rounded-xl flex items-center justify-center text-muted-foreground text-xs select-none">
                        [ Paper Intake Form Scan Simulated ]
                      </div>
                      <div className="mt-3 flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground">Coordinates mapped: 4 corners</span>
                        <span className="font-bold text-emerald-500">Form recognized ✓</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeAITab === 'smart_scan' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Smart Scan Fields Map</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-sans">
                      <div className="border border-border p-3 rounded-xl space-y-1 bg-card">
                        <div className="text-[10px] text-muted-foreground">Respondent uploads ID</div>
                        <div className="w-full h-12 bg-muted rounded-lg flex items-center justify-center font-bold text-muted-foreground select-none">LICENSE.JPG</div>
                      </div>
                      <div className="border border-border p-3 rounded-xl space-y-2 bg-card">
                        <div>
                          <label className="text-[9px] text-muted-foreground block font-bold">Auto-filled Name</label>
                          <input type="text" readOnly value="JOHN R DOE" className="w-full bg-secondary border border-border rounded-lg px-2 py-1 text-[11px] font-semibold outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block font-bold">License Expiry</label>
                          <input type="text" readOnly value="12/31/2029" className="w-full bg-secondary border border-border rounded-lg px-2 py-1 text-[11px] font-semibold outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeAITab === 'email' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">AI Email Editor Mock</div>
                    <div className="border border-border bg-card rounded-xl overflow-hidden text-xs">
                      <div className="bg-muted p-2.5 border-b border-border text-muted-foreground font-semibold">To: respondent@email.com · Subject: Confirmation</div>
                      <div className="p-3.5 space-y-2 font-mono text-[10px] leading-relaxed text-foreground/80">
                        <div>Hi &#123;&#123;name&#125;&#125;,</div>
                        <div>Thank you for registering for &#123;&#123;event_title&#125;&#125;! We have received your response sheet and locked your session seat.</div>
                        <div className="text-primary">// Generated by Zia Assistant instantly</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeAITab === 'thank_you' && (
                  <div className="space-y-6 animate-fadeIn text-center py-6">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider text-left">Post-Submit Action Page</div>
                    <div className="max-w-xs mx-auto border border-border bg-card rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-foreground">Form Submitted Successfully</h4>
                        <p className="text-[10px] text-muted-foreground leading-normal font-normal">Your response session ID has been saved. We sent a copy of your response to your inbox.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeAITab === 'search' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">AI Settings Search Auto-Complete</div>
                    <div className="space-y-4">
                      <div className="relative">
                        <input type="text" readOnly value="enable anti-cheat detection" className="w-full bg-card border border-primary/40 rounded-xl px-4 py-2 text-xs font-semibold outline-none" />
                        <Search className="w-4 h-4 text-primary absolute right-3 top-2.5" />
                      </div>
                      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-[10px] font-semibold text-primary">
                        Zia took you to: Settings &gt; General Configuration &gt; Anti-Cheat Security Toggle
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Callout */}
              <div className="mt-8 pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Ready to explore AI forms?</span>
                <Link href="/register" className="text-primary font-bold hover:underline flex items-center space-x-1">
                  <span>Sign up for free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CINEMATIC TEMPLATES SHOWCASE */}
      <section className="py-16 bg-zinc-950 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
        >
          <div className="text-center mb-12 space-y-3 px-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold text-white/80 select-none uppercase tracking-wider">
              Template Gallery
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
              Start with a ready-made template
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed font-normal">
              Professionally designed form templates. Hover to pause.
            </p>
          </div>

          {/* Marquee with large cinematic cards */}
          <div className="relative w-full">
            <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 md:w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 md:w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

            <div className="flex w-max animate-marquee">
              {[
                { title: 'Patient Registration', img: '/templates/patient.jpg' },
                { title: 'Product Feedback', img: '/templates/feedback.jpg' },
                { title: 'Job Application', img: '/templates/job.jpg' },
                { title: 'Event Registration', img: '/templates/event.jpg' },
                { title: 'Course Evaluation', img: '/templates/course.jpg' },
                { title: 'IT Support Ticket', img: '/templates/support.jpg' },
                { title: 'Wedding RSVP', img: '/templates/wedding.jpg' },
                { title: 'Quiz Assessment', img: '/templates/quiz.jpg' },
              ].concat([
                { title: 'Patient Registration', img: '/templates/patient.jpg' },
                { title: 'Product Feedback', img: '/templates/feedback.jpg' },
                { title: 'Job Application', img: '/templates/job.jpg' },
                { title: 'Event Registration', img: '/templates/event.jpg' },
                { title: 'Course Evaluation', img: '/templates/course.jpg' },
                { title: 'IT Support Ticket', img: '/templates/support.jpg' },
                { title: 'Wedding RSVP', img: '/templates/wedding.jpg' },
                { title: 'Quiz Assessment', img: '/templates/quiz.jpg' },
              ]).map((t, i) => (
                <div key={`tpl-${i}`} className="shrink-0 w-[280px] sm:w-[340px] md:w-[420px] mx-3 group cursor-pointer">
                  <div className="relative h-[190px] sm:h-[230px] md:h-[280px] rounded-2xl overflow-hidden shadow-2xl shadow-black/40 hover:shadow-black/60 hover:scale-[1.02] transition-all duration-300">
                    {/* Full-cover template preview image */}
                    <img 
                      src={t.img} 
                      alt={t.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Bottom gradient overlay for title readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                    {/* Title overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-white font-bold text-base drop-shadow-lg">{t.title}</h3>
                    </div>
                  </div>

                  {/* Title below */}
                  <div className="mt-3 text-center">
                    <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">{t.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS SECTION (Premium SaaS Style) */}
      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-32 bg-muted/30 border-b border-border overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-20 space-y-4"
          >
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary tracking-widest uppercase">
              How It Works
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
              From concept to live form.<br />
              <span className="text-muted-foreground">In under 60 seconds.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              {
                step: '01',
                Icon: MessageSquare,
                title: 'Describe your goal',
                desc: 'Type a single sentence explaining what you need. Our AI understands plain English context natively.',
                delay: 0,
              },
              {
                step: '02',
                Icon: Zap,
                title: 'AI compilation',
                desc: 'Questions, smart logic, branding, and configurations are generated instantly in real-time.',
                delay: 0.1,
              },
              {
                step: '03',
                Icon: Palette,
                title: 'Fine-tune design',
                desc: 'Use the intuitive visual editor to tweak themes, adjust typography, or drag-and-drop fields.',
                delay: 0.2,
              },
              {
                step: '04',
                Icon: BarChart3,
                title: 'Deploy & analyze',
                desc: 'Publish with one click. Share secure links and watch AI-powered analytics roll in automatically.',
                delay: 0.3,
              },
            ].map((s) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: s.delay, ease: [0.22, 1, 0.36, 1] }}
                className="group relative p-8 rounded-2xl bg-card border border-border hover:bg-card/90 transition-all duration-300 overflow-hidden shadow-xs hover:shadow-md"
              >
                {/* Subtle Top Glow on Hover */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                {/* Icon Container */}
                <div className="mb-6 inline-flex p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 transition-all duration-300 ease-out">
                  <s.Icon className="w-5 h-5 stroke-[1.5]" />
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-foreground mb-2.5 tracking-tight">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-normal">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMERS / TESTIMONIALS SECTION */}
      <section id="testimonials" className="py-24 bg-muted/40 border-b border-border">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.55 }}
          className="container mx-auto px-6 max-w-7xl"
        >
          <div className="text-center mb-16 space-y-3">
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary select-none uppercase tracking-wider">
              Customers
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Loved by teams worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Testimonial 1 */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-all duration-200">
              <div className="space-y-4">
                {/* 5 Stars */}
                <div className="flex space-x-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs md:text-sm text-foreground/90 leading-relaxed italic font-medium">
                  "PromptForm AI replaced 3 tools for us. We create exams, surveys, and registration forms from a single prompt. It's unreal."
                </p>
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  S
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Sarah Chen</div>
                  <div className="text-[10px] font-semibold text-muted-foreground">Head of Assessment, EduTech</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-all duration-200">
              <div className="space-y-4">
                {/* 5 Stars */}
                <div className="flex space-x-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs md:text-sm text-foreground/90 leading-relaxed italic font-medium">
                  "The secure exam mode is enterprise-grade. Anti-cheating, AI cheating scores, and detailed activity logs. Exactly what we needed."
                </p>
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  M
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Marcus Rodriguez</div>
                  <div className="text-[10px] font-semibold text-muted-foreground">CTO, CertifyPro</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-all duration-200">
              <div className="space-y-4">
                {/* 5 Stars */}
                <div className="flex space-x-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs md:text-sm text-foreground/90 leading-relaxed italic font-medium">
                  "I typed one sentence and got a complete event registration form with payment and t-shirt sizes. This is the future of form building."
                </p>
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  P
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Priya Sharma</div>
                  <div className="text-[10px] font-semibold text-muted-foreground">Event Director, TechConf</div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </section>

      {/* DEDICATED PRICING PAGE CALLOUT BANNER */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-card to-primary/5 border-b border-border text-center">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-6 max-w-4xl space-y-6"
        >
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-xs font-bold text-primary shadow-xs">
            <Sparkles className="w-4 h-4" />
            <span>Flexible Plans & Transparent Pricing</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Looking for detailed pricing & plan comparison?
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto font-normal">
            Explore our dedicated Pricing page to compare Free, Pro, and Enterprise features, customize currencies ($ USD, ₹ INR, € EUR, £ GBP), or use our AI Plan Finder Assistant.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/pricing">
              <Button variant="primary" className="bg-primary text-primary-foreground py-3.5 px-8 text-sm font-bold rounded-xl shadow-md hover:opacity-90 flex items-center space-x-2 transition-all active:scale-[0.98]">
                <span>View Full Pricing & Plans</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="py-3.5 px-8 text-sm font-bold border border-border rounded-xl hover:bg-muted transition-all active:scale-[0.98]">
                Start Free Account
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>


      {/* FAQ SECTION */}
      <section className="py-20 bg-card border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-6 max-w-3xl"
        >
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary select-none uppercase tracking-wider">
              FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Frequently asked questions
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Can I switch plans anytime?',
                a: 'Yes! You can upgrade from Free to Pro at any time. Your new features will be available immediately. If you downgrade, your current billing cycle will continue until it expires.'
              },
              {
                q: 'Is there a student or education discount?',
                a: 'Yes, we offer special pricing for educational institutions and students. Contact our sales team with your .edu email for exclusive discounts on Pro and Enterprise plans.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, Mastercard, American Express), UPI, PayPal, and bank transfers for Enterprise plans. All payments are secured with 256-bit SSL encryption.'
              },
              {
                q: 'Can I cancel my subscription anytime?',
                a: 'Absolutely. There are no long-term contracts. You can cancel your Pro subscription at any time from your billing settings. Your access continues until the end of your current billing period.'
              },
              {
                q: 'What happens to my forms if I downgrade?',
                a: 'Your existing forms and responses are never deleted. If you exceed the Free plan limits, your forms will become read-only until you upgrade again or reduce your form count.'
              },
              {
                q: 'Do you offer a free trial of Pro?',
                a: 'Our Free plan is essentially a forever trial — you get full access to core features with up to 5 forms. No credit card required, no time limit. Upgrade only when you need more.'
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. We use industry-standard encryption, secure cloud infrastructure, and regular security audits. Enterprise plans include additional security features like SSO, audit logs, and role-based access control.'
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl overflow-hidden transition-all hover:shadow-xs"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer group"
                >
                  <span className="text-sm font-bold text-foreground pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4.5 h-4.5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 pb-5"
                  >
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-normal">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CALL TO ACTION SECTION */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-8 md:p-12 text-center space-y-6 overflow-hidden shadow-xs">
            <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
            
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight relative z-10 leading-tight">
              Ready to build your first AI form?
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto relative z-10 font-normal leading-relaxed">
              Join thousands of teams using PromptForm AI to create forms, quizzes, and exams in seconds.
            </p>
            <div className="pt-4 relative z-10">
              <Link href="/register">
                <Button className="bg-primary hover:opacity-90 text-primary-foreground font-bold rounded-xl py-3 px-8 text-sm flex items-center justify-center space-x-2 shadow-md mx-auto group active:scale-[0.98]">
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND NEW MODERN CARD FOOTER */}
      <Footer />

      {/* UPGRADE MODAL */}
      <UpgradeModal 
        isOpen={upgradeModalOpen} 
        onClose={() => setUpgradeModalOpen(false)}
        restriction={null}
        currency={currency}
      />

      {/* PLAN FINDER MODAL */}
      {planFinderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl animate-scaleIn">
            <button
              onClick={resetPlanFinder}
              className="absolute top-4 right-4 p-2.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {planFinderStep === 0 && (
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Form Creator Assistant</h3>
                  <p className="text-xs text-muted-foreground mt-1">Let's find the best plan for you. How many forms do you plan to create?</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handlePlanFinderAnswer('forms', 'free')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    1-5 Forms (Just starting out)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer('forms', 'pro')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    6-30 Forms (Standard usage)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer('forms', 'unlimited')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    Unlimited Forms (Heavy creator)
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
                  <h3 className="text-base font-bold text-foreground">Collaboration Setup</h3>
                  <p className="text-xs text-muted-foreground mt-1">Are you working alone or with a team?</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handlePlanFinderAnswer('team', 'free')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    Just me (Single user)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer('team', 'pro')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    Small Team (2-10 members)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer('team', 'enterprise')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    Large Enterprise (Custom domains & SSO)
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
                  <h3 className="text-base font-bold text-foreground">Advanced Options</h3>
                  <p className="text-xs text-muted-foreground mt-1">Which features do you require?</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handlePlanFinderAnswer('features', 'free')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    Basic quizzes and surveys
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer('features', 'cheat')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    Anti-Cheat Proctored Exams (Secure Mode)
                  </button>
                  <button
                    onClick={() => handlePlanFinderAnswer('features', 'sso')}
                    className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-accent text-xs font-semibold transition-all cursor-pointer"
                  >
                    White-label branding & Custom Domain Login
                  </button>
                </div>
              </div>
            )}

            {planFinderStep === 3 && (
              <div className="space-y-5 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Our Recommendation</h3>
                  <p className="text-xs text-muted-foreground">Based on your requirements, the perfect plan for you is:</p>
                  <div className="text-2xl font-bold text-primary mt-2 capitalize">
                    {recommendedPlan} Plan
                  </div>
                </div>

                <div className="bg-muted p-4 border border-border rounded-2xl text-left text-xs text-muted-foreground leading-relaxed font-medium">
                  {recommendedPlan === 'Free' && "The Free Forever plan is perfect for individuals building up to 5 forms with standard templates and basic layouts."}
                  {recommendedPlan === 'Pro' && "The Pro plan is highly recommended. It unlocks unlimited form generation, full secure exam proctoring features, custom templates, and automations."}
                  {recommendedPlan === 'Enterprise' && "The Enterprise plan is tailored for large-scale operations. It provides custom white-labeled domains, SSO logins, custom integrations, and SLA guarantees."}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => {
                      const recPlan = recommendedPlan;
                      resetPlanFinder();
                      if (recPlan === 'Free') {
                        router.push(isLoggedIn ? '/dashboard' : '/register');
                      } else {
                        if (isLoggedIn) {
                          setUpgradeModalOpen(true);
                        } else {
                          router.push('/register');
                        }
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                  >
                    {recommendedPlan === 'Free' ? 'Get Started' : 'Subscribe to ' + recommendedPlan}
                  </button>
                  <button
                    onClick={resetPlanFinder}
                    className="w-full py-2.5 rounded-xl text-muted-foreground hover:text-foreground text-xs font-semibold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
