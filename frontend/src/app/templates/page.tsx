"use client";

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ArrowRight, Eye, Layout, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/Footer';

const templatesList = [
  {
    id: "saas",
    title: "AI SaaS Landing Page Form",
    category: "SaaS / Product",
    desc: "A clean, modern SaaS landing page template containing lead capture fields, dropdown company sizes, and requirements text fields.",
    color: "from-blue-600 to-indigo-600",
    questions: [
      { type: "name", label: "Full Name", required: true, options: [], validations: {}, logic: {} },
      { type: "email", label: "Business Email", required: true, options: [], validations: {}, logic: {} },
      { type: "dropdown", label: "Company Size", required: true, options: ["1-10", "11-50", "51-200", "200+"], validations: {}, logic: {} },
      { type: "long_text", label: "Primary Use Case / Requirements", required: false, options: [], validations: {}, logic: {} }
    ]
  },
  {
    id: "rsvp",
    title: "Event RSVP & Registration",
    category: "Events / Meetups",
    desc: "A clean RSVP form to register attendees, capture attendance state, email contacts, and record dietary preferences.",
    color: "from-emerald-600 to-teal-600",
    questions: [
      { type: "name", label: "Guest Name", required: true, options: [], validations: {}, logic: {} },
      { type: "email", label: "Email Address", required: true, options: [], validations: {}, logic: {} },
      { type: "mcq", label: "Attendance Preference", required: true, options: ["Yes, I will attend", "No, I cannot attend"], validations: {}, logic: {} },
      { type: "dropdown", label: "Dietary Requirements", required: true, options: ["None", "Vegetarian", "Vegan", "Gluten-Free", "Other"], validations: {}, logic: {} }
    ]
  },
  {
    id: "education",
    title: "Course Feedback & Eval",
    category: "Education / Feedback",
    desc: "A feedback evaluation template allowing students to rate course materials, specify IDs, and provide text recommendations.",
    color: "from-purple-600 to-indigo-600",
    questions: [
      { type: "short_text", label: "Course Code / Title", required: true, options: [], validations: {}, logic: {} },
      { type: "short_text", label: "Student ID (Optional)", required: false, options: [], validations: {}, logic: {} },
      { type: "mcq", label: "Rate Course Material", required: true, options: ["Excellent", "Good", "Average", "Poor"], validations: {}, logic: {} },
      { type: "long_text", label: "Detailed Feedback & Suggestions", required: true, options: [], validations: {}, logic: {} }
    ]
  }
];

function TemplatesGalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const useTemplateId = searchParams.get('useTemplateId');
    if (useTemplateId) {
      const token = localStorage.getItem('promptform_access_token');
      if (token) {
        handleUseTemplate(useTemplateId);
      }
    }
  }, [searchParams]);

  const handleUseTemplate = async (templateId: string) => {
    const selectedTemplate = templatesList.find(t => t.id === templateId);
    if (!selectedTemplate) return;

    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      // Not logged in -> Redirect to login page, redirect back to templates with template query param after success
      router.push(`/login?redirect=${encodeURIComponent(`templates?useTemplateId=${templateId}`)}`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. Create a blank form
      const newForm = await api.post('/forms', {
        title: selectedTemplate.title,
        description: selectedTemplate.desc
      });

      // 2. Put bulk questions
      await api.put(`/forms/${newForm.id}/questions`, selectedTemplate.questions);

      // 3. Redirect user to builder
      router.push(`/builder/${newForm.id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to import template. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <SiteHeader />
      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-12">
        
        {/* Gallery Title & Subhead */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Template Marketplace</span>
          </div>
          <h1 className="text-[36px] md:text-[56px] font-bold tracking-tight text-foreground leading-tight">
            Choose a Template to Start
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            Click any template card below to open its real-time responsive preview, or select a template to build instantly.
          </p>
        </div>

        {errorMsg && (
          <div className="max-w-md mx-auto p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex items-center space-x-3 text-xs">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex flex-col justify-center items-center z-50 space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-foreground animate-pulse">
              Creating your template form workspace...
            </p>
          </div>
        )}

        {/* Templates list Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {templatesList.map((tmpl) => (
            <Card 
              key={tmpl.id} 
              className="overflow-hidden hover:shadow-xl hover:translate-y-[-4px] transition-all duration-200 flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] w-full bg-muted dark:bg-background border-b border-border dark:border-border p-4 overflow-hidden flex flex-col justify-center">
                {tmpl.id === "saas" && (
                  <div className="bg-card dark:bg-card rounded-lg p-3 border border-border dark:border-border space-y-1.5 text-[9px] font-mono select-none">
                    <div className="font-bold text-foreground dark:text-foreground">Full Name</div>
                    <div className="h-5 bg-muted dark:bg-background rounded-md border border-border dark:border-border"></div>
                    <div className="font-bold text-foreground dark:text-foreground">Business Email</div>
                    <div className="h-5 bg-muted dark:bg-background rounded-md border border-border dark:border-border"></div>
                  </div>
                )}
                {tmpl.id === "rsvp" && (
                  <div className="bg-card dark:bg-card rounded-lg p-3 border border-border dark:border-border space-y-2 text-[9px] font-mono select-none">
                    <div className="font-bold text-foreground dark:text-foreground">Will you attend?</div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-foreground text-background dark:bg-foreground dark:text-background rounded-lg font-bold">Yes ✓</span>
                      <span className="px-2 py-1 bg-muted dark:bg-background border border-border dark:border-border rounded-lg">No</span>
                    </div>
                  </div>
                )}
                {tmpl.id === "education" && (
                  <div className="bg-card dark:bg-card rounded-lg p-3 border border-border dark:border-border space-y-2 text-[9px] font-mono select-none">
                    <div className="font-bold text-foreground dark:text-foreground">Rate Course Material</div>
                    <div className="flex gap-1 text-[10px] text-amber-500 font-bold">★ ★ ★ ★ ☆</div>
                  </div>
                )}
                <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-card/90 dark:bg-background/90 text-foreground rounded-full shadow-sm border border-border dark:border-border">
                  {tmpl.category}
                </span>
              </div>

              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                    {tmpl.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tmpl.desc}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Link href={`/templates/preview?id=${tmpl.id}`} className="w-full">
                    <Button variant="outline" className="w-full space-x-2 text-xs py-2">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Live Preview</span>
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => handleUseTemplate(tmpl.id)} 
                    variant="primary" 
                    className="w-full space-x-2 text-xs py-2"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>Use This Template</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function TemplatesGalleryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TemplatesGalleryContent />
    </Suspense>
  );
}
