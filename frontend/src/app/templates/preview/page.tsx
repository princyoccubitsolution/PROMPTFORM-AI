"use client";

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Monitor, Smartphone, LayoutGrid, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';

const templatesList = [
  {
    id: "saas",
    title: "AI SaaS Landing Page Form",
    category: "SaaS / Product",
    desc: "A clean, modern SaaS landing page template containing lead capture fields, dropdown company sizes, and requirements text fields.",
    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
    questions: [
      { type: "text", label: "Full Name", required: true, options: [], validations: {}, logic: {} },
      { type: "email", label: "Business Email", required: true, options: [], validations: {}, logic: {} },
      { type: "select", label: "Company Size", required: true, options: ["1-10", "11-50", "51-200", "200+"], validations: {}, logic: {} },
      { type: "textarea", label: "Primary Use Case / Requirements", required: false, options: [], validations: {}, logic: {} }
    ]
  },
  {
    id: "rsvp",
    title: "Event RSVP & Registration",
    category: "Events / Meetups",
    desc: "A clean RSVP form to register attendees, capture attendance state, email contacts, and record dietary preferences.",
    img: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80",
    questions: [
      { type: "text", label: "Guest Name", required: true, options: [], validations: {}, logic: {} },
      { type: "email", label: "Email Address", required: true, options: [], validations: {}, logic: {} },
      { type: "radio", label: "Attendance Preference", required: true, options: ["Yes, I will attend", "No, I cannot attend"], validations: {}, logic: {} },
      { type: "select", label: "Dietary Requirements", required: true, options: ["None", "Vegetarian", "Vegan", "Gluten-Free", "Other"], validations: {}, logic: {} }
    ]
  },
  {
    id: "education",
    title: "Course Feedback & Eval",
    category: "Education / Feedback",
    desc: "A feedback evaluation template allowing students to rate course materials, specify IDs, and provide text recommendations.",
    img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
    questions: [
      { type: "text", label: "Course Code / Title", required: true, options: [], validations: {}, logic: {} },
      { type: "text", label: "Student ID (Optional)", required: false, options: [], validations: {}, logic: {} },
      { type: "radio", label: "Rate Course Material", required: true, options: ["Excellent", "Good", "Average", "Poor"], validations: {}, logic: {} },
      { type: "textarea", label: "Detailed Feedback & Suggestions", required: true, options: [], validations: {}, logic: {} }
    ]
  }
];

function PreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id') || 'saas';
  
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form submission preview states
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const selectedTemplate = templatesList.find(t => t.id === templateId) || templatesList[0];

  const handleUseTemplate = async () => {
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push(`/login?redirect=templates?useTemplateId=${selectedTemplate.id}`);
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
      setErrorMsg(err.message || "Failed to create workspace. Please try again.");
      setIsProcessing(false);
    }
  };

  const handlePreviewFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormData({});
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      
      {/* TOP CONTROLLER BAR */}
      <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link href="/templates">
            <Button variant="outline" className="border-border text-foreground hover:bg-secondary space-x-2 text-xs py-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace</span>
            </Button>
          </Link>
          <div className="hidden md:block">
            <h2 className="text-sm font-bold text-foreground">{selectedTemplate.title}</h2>
            <p className="text-[10px] text-muted-foreground">Live Interactive Preview Mode</p>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center bg-secondary/40 border border-border rounded-full p-1 space-x-1">
          <button
            onClick={() => setPreviewDevice("desktop")}
            className={`p-2 rounded-full transition-all ${previewDevice === "desktop" ? "bg-primary text-primary-foreground font-bold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Desktop Preview"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreviewDevice("mobile")}
            className={`p-2 rounded-full transition-all ${previewDevice === "mobile" ? "bg-primary text-primary-foreground font-bold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Mobile Preview"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleUseTemplate} 
            disabled={isProcessing}
            variant="primary" 
            className="rounded-xl px-6 text-xs font-bold py-2.5 shadow-sm active:scale-[0.98]"
          >
            {isProcessing ? "Processing..." : "Use This Template"}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-destructive/10 border-b border-destructive/20 text-destructive flex items-center justify-center space-x-2 text-xs z-10 font-medium">
          <ShieldAlert className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* WORKSPACE PREVIEW SIMULATOR */}
      <div className="flex-1 bg-muted/30 p-6 flex items-center justify-center overflow-y-auto">
        <div 
          className={`transition-all duration-500 ease-out bg-background text-foreground rounded-2xl shadow-2xl ${
            previewDevice === "mobile" 
              ? "w-[375px] max-w-full h-[760px] border-[12px] border-border rounded-[48px] overflow-y-auto relative" 
              : "w-full h-full min-h-[500px] overflow-y-auto"
          }`}
        >
          {/* SIMULATED WEB SITE PREVIEW */}
          <div className="relative w-full h-full min-h-screen flex flex-col justify-between">
            
            {/* Nav */}
            <header className="py-4 px-6 border-b border-border/40 bg-card flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-extrabold text-xs">V</div>
                <span className="font-bold text-sm">Demo Brand</span>
              </div>
              <nav className="hidden sm:flex items-center space-x-6 text-xs font-semibold text-muted-foreground">
                <span>Features</span>
                <span>Pricing</span>
                <span>Docs</span>
              </nav>
              <Button size="sm" variant="outline" className="text-xs">Sign In</Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col justify-between">
              
              {/* HERO SECTION */}
              <section className="py-12 px-6 border-b border-border/20 bg-secondary/30">
                <div className="max-w-xl mx-auto text-center space-y-6">
                  {selectedTemplate.id === 'saas' && (
                    <>
                      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                        Grow Your AI Startup
                      </h1>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Gather feedback, onboard companies, and analyze use-cases in real time.
                      </p>
                    </>
                  )}
                  {selectedTemplate.id === 'rsvp' && (
                    <>
                      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                        PromptForm AI Summit
                      </h1>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Reserve your passes, register guests, and select dietary requirements today.
                      </p>
                    </>
                  )}
                  {selectedTemplate.id === 'education' && (
                    <>
                      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                        CS-501 Evaluation
                      </h1>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Provide feedback on lecturing speed, course slides, and syllabus coverage.
                      </p>
                    </>
                  )}

                  {/* EMBEDDED REAL RUNNING INTERACTIVE FORM */}
                  <Card className="border border-border/80 bg-card p-6 shadow-xl rounded-[24px] max-w-md mx-auto text-left">
                    {formSubmitted ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-primary animate-bounce" />
                        <h4 className="font-bold text-foreground">Response Submitted!</h4>
                        <p className="text-xs text-muted-foreground">This is a simulated preview response submission.</p>
                      </div>
                    ) : (
                      <form onSubmit={handlePreviewFormSubmit} className="space-y-4">
                        {selectedTemplate.questions.map((q, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                              <span>{q.label}</span>
                              {q.required && <span className="text-red-500">*</span>}
                            </label>
                            
                            {q.type === 'text' && (
                              <input 
                                required={q.required}
                                type="text"
                                value={formData[q.label] || ""}
                                onChange={(e) => setFormData({...formData, [q.label]: e.target.value})}
                                placeholder={`Enter your ${q.label.toLowerCase()}`}
                                className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            )}

                            {q.type === 'email' && (
                              <input 
                                required={q.required}
                                type="email"
                                value={formData[q.label] || ""}
                                onChange={(e) => setFormData({...formData, [q.label]: e.target.value})}
                                placeholder="name@company.com"
                                className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            )}

                            {q.type === 'select' && (
                              <select
                                required={q.required}
                                value={formData[q.label] || ""}
                                onChange={(e) => setFormData({...formData, [q.label]: e.target.value})}
                                className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">Select option...</option>
                                {q.options.map((opt, i) => (
                                  <option key={i} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {q.type === 'radio' && (
                              <div className="flex flex-wrap gap-2.5 pt-1">
                                {q.options.map((opt, i) => (
                                  <label key={i} className="flex items-center space-x-2 text-xs font-medium text-muted-foreground cursor-pointer">
                                    <input 
                                      required={q.required}
                                      type="radio" 
                                      name={q.label}
                                      checked={formData[q.label] === opt}
                                      onChange={() => setFormData({...formData, [q.label]: opt})}
                                      className="text-primary focus:ring-primary"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {q.type === 'textarea' && (
                              <textarea 
                                required={q.required}
                                rows={3}
                                value={formData[q.label] || ""}
                                onChange={(e) => setFormData({...formData, [q.label]: e.target.value})}
                                placeholder="Details..."
                                className="w-full text-xs rounded-xl border border-border px-3.5 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            )}
                          </div>
                        ))}
                        <Button type="submit" variant="primary" className="w-full text-xs py-2 rounded-xl">
                          Submit Response
                        </Button>
                      </form>
                    )}
                  </Card>
                </div>
              </section>

              {/* FEATURES BLOCK */}
              <section className="py-12 px-6">
                <div className="max-w-2xl mx-auto grid grid-cols-3 gap-6 text-center">
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-foreground">1. Form Creator</h4>
                    <p className="text-[10px] text-muted-foreground">Easy structure editing.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-foreground">2. Safe Proctoring</h4>
                    <p className="text-[10px] text-muted-foreground">Stop cheats instantly.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-foreground">3. Analytics</h4>
                    <p className="text-[10px] text-muted-foreground">Summary reports with AI.</p>
                  </div>
                </div>
              </section>

            </main>

            {/* Footer */}
            <footer className="py-6 px-6 border-t border-border/40 bg-card text-center text-[10px] text-muted-foreground flex-shrink-0">
              <p>&copy; 2026 Demo Brand. Created with PromptForm AI platform.</p>
            </footer>

          </div>
        </div>
      </div>

    </div>
  );
}

export default function TemplatePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
