"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ArrowRight, FileText, Image as ImageIcon, Upload, 
  CheckCircle, Loader2, Share2, Code, ExternalLink, Edit3, Palette, Shield, Star, Plus, Copy, Check,
  User, Mail, Phone, MapPin, Globe, Calendar, Clock, Hash, Tag, PenTool, ChevronDown, LayoutGrid, AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ShareModal } from '@/components/ShareModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { api } from '@/lib/api';

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  mcq_single: 'MCQ', mcq_multiple: 'Multi-correct', true_false: 'True / False', fill_blank: 'Fill blank',
  one_word: 'One word', short_answer: 'Short answer', long_answer: 'Long answer', coding: 'Coding',
  predict_output: 'Predict output', debugging: 'Debugging', sql: 'SQL', numerical: 'Numerical',
  assertion_reasoning: 'Assertion-Reason', case_study: 'Case study', match_following: 'Match', ordering: 'Ordering'
};

const formatAnswerKey = (ans: any, kind?: string): string => {
  if (Array.isArray(ans)) return ans.join(kind === 'ordering' ? ' → ' : ', ');
  if (ans && typeof ans === 'object') return Object.entries(ans).map(([k, v]) => `${k} = ${v}`).join('; ');
  return String(ans);
};

export default function AIPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'prompt' | 'pdf' | 'image'>('prompt');
  const [formType, setFormType] = useState<string>("auto");
  const [file, setFile] = useState<File | null>(null);

  const [optionLayout, setOptionLayout] = useState<'vertical' | 'horizontal'>('horizontal');
  const [displayMode, setDisplayMode] = useState<'full' | 'wizard' | 'chat'>('full');
  const [previewStepIndex, setPreviewStepIndex] = useState<number>(0);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  const updateSavedDisplayMode = async (newMode: 'full' | 'wizard' | 'chat') => {
    setDisplayMode(newMode);
    setPreviewStepIndex(0);
    if (generatedForm && generatedForm.id) {
      try {
        await api.patch(`/forms/${generatedForm.id}`, { settings: { display_mode: newMode } });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Generated Form State
  const [generatedForm, setGeneratedForm] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  // What the server understood and verified for the last generation / edit.
  const [requirements, setRequirements] = useState<any>(null);
  // Clarifying question or conversational reply (no form was created or changed).
  const [assistantNote, setAssistantNote] = useState<{ kind: 'clarify' | 'converse'; text: string; suggestions: string[] } | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [showReportDetails, setShowReportDetails] = useState(false);

  // The server's canonical form is shown as-is so the preview always matches what was saved.
  const mapServerForm = (formObj: any) => {
    const settings = formObj.settings || {};
    const isAssessment = settings.isQuiz === true || String(formObj.category || '').toLowerCase() === 'quiz';
    return {
      id: formObj.id,
      uniqueShareId: formObj.uniqueShareId,
      publicUrl: formObj.publicUrl,
      title: formObj.title || "AI Generated Form",
      description: formObj.description || "",
      category: isAssessment ? "ASSESSMENT" : "FORM",
      isAssessment,
      settings,
      theme: formObj.theme || { primary_color: "#8B6B55", background_color: "#FAF6EF" },
      questions: (formObj.questions || []).map((q: any, i: number) => ({
        id: q.id || `q_${i}`,
        type: q.type || "short_text",
        label: q.label || `Question ${i + 1}`,
        required: Boolean(q.required),
        options: Array.isArray(q.options) ? q.options : [],
        validations: q.validations || {},
        logic: q.logic || {},
        description: q.validations?.description,
        placeholder: q.validations?.placeholder
      })),
      isPublished: formObj.status === 'PUBLISHED'
    };
  };

  const startNewForm = () => {
    setGeneratedForm(null);
    setRequirements(null);
    setAssistantNote(null);
    setShowAnswerKey(false);
    setPrompt("");
    setError(null);
  };

  // Demo preview form when explicitly requested to view sample demo
  const [showSampleDemo, setShowSampleDemo] = useState(false);

  // Auto-reset preview step index when form or mode changes
  useEffect(() => {
    setPreviewStepIndex(0);
  }, [generatedForm?.id, showSampleDemo, displayMode]);

  // Auto-scroll chat container to bottom when step advances
  useEffect(() => {
    if (displayMode === 'chat' && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [previewStepIndex, displayMode, generatedForm, showSampleDemo]);

  useEffect(() => {
    setMounted(true);
    const initialPrompt = typeof window !== 'undefined' ? localStorage.getItem('promptform_initial_ai_prompt') : null;
    if (initialPrompt) {
      setPrompt(initialPrompt);
      localStorage.removeItem('promptform_initial_ai_prompt');
    }
  }, []);

  const samplePrompts = [
    { title: "Dentistry Patient Intake", text: "Create a patient intake form for a dentistry clinic with medical history, insurance details, and consent checkboxes" },
    { title: "JS Skill Quiz (Anti-Cheat)", text: "Create a 5-question JavaScript assessment quiz with multiple choices and correct answers" },
    { title: "NPS Customer Survey", text: "Create a customer feedback survey with net promoter score and rating scales" },
    { title: "Tech Event RSVP", text: "Create an event registration form for a tech launch with T-shirt size selector" }
  ];

  const defaultPreviewForm = {
    id: "demo-form-123",
    title: "Interactive AI Form Preview",
    description: "Sample dentistry patient intake form demonstrating PromptForm AI question types and layouts.",
    category: formType === "auto" ? "AI FORM PREVIEW" : formType.toUpperCase(),
    questions: [
      { id: "q1", type: "short_text", label: "Full Name", required: true, placeholder: "e.g. Jane Doe" },
      { id: "q2", type: "mcq", label: "Select Dental Service / Appointment Type", options: ["General Consultation", "Routine Cleaning", "Teeth Whitening", "Orthodontics"], required: true },
      { id: "q3", type: "rating", label: "Rate Overall Satisfaction / Experience", required: false },
      { id: "q4", type: "checkbox", label: "Medical History & Symptoms", options: ["Tooth Sensitivity", "Gum Bleeding", "Existing Fillings/Crowns", "No Symptoms"], required: false },
      { id: "q5", type: "yes_no", label: "Are you a new patient at our clinic?", required: true }
    ]
  };

  const activeForm = generatedForm || (showSampleDemo ? defaultPreviewForm : null);

  // Reusable responsive AI Question Box renderer with consistent card alignment
  const renderAIQuestionCard = (q: any, idx: number) => {
    const fieldType = (q.type || 'short_text').toLowerCase();

    // Select icon for text & input fields based on semantic field type or label content
    const getInputIcon = (type: string, label: string) => {
      const l = (label || '').toLowerCase();
      if (type === 'email' || l.includes('email')) return Mail;
      if (type === 'phone' || l.includes('phone') || l.includes('mobile') || l.includes('contact')) return Phone;
      if (type === 'name' || l.includes('name')) return User;
      if (type === 'address' || l.includes('address') || l.includes('city') || l.includes('zip') || l.includes('location')) return MapPin;
      if (type === 'website' || type === 'url' || l.includes('website') || l.includes('url')) return Globe;
      if (type === 'price' || type === 'amount' || l.includes('price') || l.includes('cost') || l.includes('fee')) return Tag;
      return FileText;
    };

    const IconComponent = getInputIcon(fieldType, q.label || '');

    return (
      <div key={q.id || idx} className="ai-question-card group/card">
        {/* Card Header: Question Number Badge + Title Label + Aligned Required Indicator */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-start space-x-2.5 min-w-0">
            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center mt-0.5 shadow-xs">
              {idx + 1}
            </span>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-foreground tracking-tight leading-snug break-words">
                {q.label}
              </h4>
              {q.description && (
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {q.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-wrap justify-end items-center gap-1.5">
            {activeForm?.isAssessment && q.validations?.assessmentType && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {ASSESSMENT_TYPE_LABELS[q.validations.assessmentType] || q.validations.assessmentType}
                {q.validations.difficulty ? ` · ${q.validations.difficulty}` : ''}
              </span>
            )}
            {activeForm?.isAssessment && q.validations?.points !== undefined && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                {q.validations.points} {Number(q.validations.points) === 1 ? 'Mark' : 'Marks'}
              </span>
            )}
            {q.validations?.needsReview && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 border border-red-500/20" title="The AI could not produce a verifiable answer key for this question">
                Answer needs review
              </span>
            )}
            {q.required ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 shadow-xs">
                *Required
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                Optional
              </span>
            )}
          </div>
        </div>

        {/* Supporting material: code snippet, coding examples */}
        {q.validations?.codeSnippet && (
          <pre className="mt-1 mb-2 text-[11px] font-mono bg-slate-900 text-emerald-300 rounded-xl p-3 overflow-x-auto whitespace-pre">{q.validations.codeSnippet}</pre>
        )}
        {Array.isArray(q.validations?.examples) && q.validations.examples.length > 0 && (
          <div className="mb-2 space-y-1">
            {q.validations.examples.slice(0, 2).map((ex: any, i: number) => (
              <pre key={i} className="text-[10px] font-mono bg-muted/50 border border-border rounded-lg p-2 whitespace-pre-wrap">{`Input: ${ex.input}\nOutput: ${ex.output}`}</pre>
            ))}
          </div>
        )}

        {/* Input / Control Layout Body */}
        <div className="w-full pt-1">
          {/* Match the following */}
          {fieldType === 'matching' && (
            <div className="space-y-1.5 w-full">
              {(q.validations?.matchLeft || []).map((left: string) => (
                <div key={left} className="grid grid-cols-2 gap-2 items-center text-xs">
                  <span className="font-medium text-foreground break-words">{left}</span>
                  <CustomSelect placeholder="Select a match..." options={q.options || []} onChange={() => {}} size="md" />
                </div>
              ))}
            </div>
          )}

          {/* Ordering */}
          {fieldType === 'ordering' && (
            <ol className="space-y-1.5 w-full">
              {(q.options || []).map((item: string, i: number) => (
                <li key={item} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs">
                  <span className="w-5 h-5 rounded bg-muted text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 break-words">{item}</span>
                  <span className="text-muted-foreground">↕</span>
                </li>
              ))}
            </ol>
          )}

          {/* Coding / Program / Algorithm */}
          {(fieldType === 'code' || fieldType === 'coding' || (fieldType === 'long_text' && ['coding', 'debugging', 'sql'].includes(q.validations?.assessmentType))) ? (
            <div className="min-h-[110px] w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 font-mono text-xs text-emerald-400 leading-relaxed shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 select-none text-[11px]">// Write your {q.validations?.programmingLanguage || 'code'} solution here</span>
              <span className="text-slate-500 select-none text-[10px] self-end mt-4">Code Answer</span>
            </div>
          ) : (fieldType === 'long_text' || fieldType === 'paragraph' || fieldType === 'feedback' || fieldType === 'textarea' || fieldType === 'comments' || fieldType === 'description' || fieldType === 'message') ? (
            <div className="min-h-[85px] w-full bg-card border border-border/80 rounded-xl p-3.5 text-xs text-muted-foreground/80 leading-relaxed shadow-xs flex items-start">
              {q.placeholder || `Enter detailed response for ${q.label.toLowerCase()}...`}
            </div>
          ) : null}

          {/* Single-line text / specialized input fields / fill in the blanks */}
          {(fieldType === 'short_text' || fieldType === 'text' || fieldType === 'name' || fieldType === 'first_name' || fieldType === 'last_name' || fieldType === 'full_name' || fieldType === 'email' || fieldType === 'email_address' || fieldType === 'phone' || fieldType === 'contact' || fieldType === 'mobile' || fieldType === 'telephone' || fieldType === 'price' || fieldType === 'amount' || fieldType === 'address' || fieldType === 'website' || fieldType === 'url' || fieldType === 'password') && (
            <div className="relative flex items-center w-full">
              <div className="absolute left-3 text-muted-foreground/70 pointer-events-none">
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="h-10 md:h-11 w-full bg-card border border-border/80 rounded-xl pl-9 pr-3.5 flex items-center text-xs text-muted-foreground/80 shadow-xs transition-all">
                {q.placeholder || (q.label?.toLowerCase().includes("blank") || q.label?.includes("____") ? "Type your answer here..." : `Enter ${q.label.toLowerCase()}...`)}
              </div>
            </div>
          )}

          {/* Radio Buttons / MCQ / Single Choice / True & False */}
          {(fieldType === 'mcq' || fieldType === 'radio' || fieldType === 'one_option' || fieldType === 'gender' || fieldType === 'single_choice') && (() => {
            const opts: string[] = (q.options && q.options.length > 0 ? q.options : ["Option A", "Option B", "Option C"]);
            const isTrueFalse = opts.length === 2 && opts.some((o: string) => o.toLowerCase().includes('true')) && opts.some((o: string) => o.toLowerCase().includes('false'));
            const hasLongOptions = opts.some((o: string) => o.length > 25);
            const useVertical = optionLayout === 'vertical' || q.option_layout === 'vertical' || hasLongOptions;

            if (isTrueFalse) {
              return (
                <div className="grid grid-cols-2 gap-3 w-full">
                  {opts.map((opt: string, oIdx: number) => (
                    <label key={oIdx} className="ai-option-chip group/chip justify-center font-bold">
                      <input
                        type="radio"
                        name={`preview_${q.id}`}
                        defaultChecked={oIdx === 0}
                        className="w-4 h-4 text-primary accent-primary cursor-pointer flex-shrink-0"
                      />
                      <span className="text-xs font-bold text-foreground group-hover/chip:text-primary transition-colors">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              );
            }

            return (
              <div className={useVertical ? "flex flex-col gap-2 w-full" : "flex flex-wrap gap-2.5 items-center w-full"}>
                {opts.map((opt: string, oIdx: number) => (
                  <label
                    key={oIdx}
                    className="ai-option-chip group/chip text-left items-start"
                  >
                    <input
                      type="radio"
                      name={`preview_${q.id}`}
                      defaultChecked={oIdx === 0}
                      className="w-4 h-4 text-primary accent-primary cursor-pointer flex-shrink-0 mt-0.5"
                    />
                    <span className="text-xs font-medium text-foreground group-hover/chip:text-primary transition-colors break-words whitespace-normal leading-relaxed text-left flex-1">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            );
          })()}

          {/* Checkboxes / Multiple Options */}
          {(fieldType === 'checkbox' || fieldType === 'multiple_options' || fieldType === 'multi_choice' || fieldType === 'checkboxes' || fieldType === 'interactive-tag-cloud' || fieldType === 'tags') && (
            <div className={optionLayout === 'horizontal' || q.option_layout === 'horizontal' ? "flex flex-wrap gap-2.5 items-center w-full" : "grid grid-cols-1 sm:grid-cols-2 gap-2 w-full"}>
              {(q.options && q.options.length > 0 ? q.options : ["Choice 1", "Choice 2", "Choice 3"]).map((opt: string, oIdx: number) => (
                <label
                  key={oIdx}
                  className="ai-option-chip group/chip text-left items-start"
                >
                  <input
                    type="checkbox"
                    defaultChecked={oIdx === 0}
                    className="w-4 h-4 rounded text-primary accent-primary cursor-pointer flex-shrink-0 mt-0.5"
                  />
                  <span className="text-xs font-medium text-foreground group-hover/chip:text-primary transition-colors break-words whitespace-normal leading-relaxed text-left flex-1">
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Yes / No Questions */}
          {(fieldType === 'yes_no' || fieldType === 'yes-no' || fieldType === 'boolean' || fieldType === 'toggle') && (
            <div className="flex items-center gap-3 w-full">
              <label className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer shadow-xs text-xs font-bold text-foreground">
                <input type="radio" name={`preview_${q.id}`} className="w-4 h-4 text-primary accent-primary" defaultChecked />
                <span>Yes</span>
              </label>
              <label className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer shadow-xs text-xs font-bold text-foreground">
                <input type="radio" name={`preview_${q.id}`} className="w-4 h-4 text-primary accent-primary" />
                <span>No</span>
              </label>
            </div>
          )}

          {/* Dropdown / Select */}
          {(fieldType === 'dropdown' || fieldType === 'select' || fieldType === 'country') && (
            <div className="relative w-full">
              <CustomSelect
                placeholder={`Select an option for ${q.label.toLowerCase()}...`}
                options={q.options && q.options.length > 0 ? q.options : ["Option 1", "Option 2", "Option 3"]}
                onChange={() => {}}
                size="md"
              />
            </div>
          )}

          {/* Date Field */}
          {(fieldType === 'date' || fieldType === 'birthday' || fieldType === 'dob' || fieldType === 'date_of_birth' || fieldType === 'birth_date') && (
            <div className="relative flex items-center w-full">
              <div className="absolute left-3 text-muted-foreground/70 pointer-events-none">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="h-10 md:h-11 w-full bg-card border border-border rounded-xl pl-9 pr-3.5 flex items-center justify-between text-xs text-muted-foreground shadow-xs">
                <span>Select Date (YYYY-MM-DD)</span>
                <Calendar className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>
          )}

          {/* Time Field */}
          {(fieldType === 'time' || fieldType === 'appointment_time') && (
            <div className="relative flex items-center w-full">
              <div className="absolute left-3 text-muted-foreground/70 pointer-events-none">
                <Clock className="w-4 h-4" />
              </div>
              <div className="h-10 md:h-11 w-full bg-card border border-border rounded-xl pl-9 pr-3.5 flex items-center justify-between text-xs text-muted-foreground shadow-xs">
                <span>Select Time (HH:MM AM/PM)</span>
                <Clock className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>
          )}

          {/* Number Field */}
          {(fieldType === 'number' || fieldType === 'quantity' || fieldType === 'age' || fieldType === 'count') && (
            <div className="relative flex items-center w-full">
              <div className="absolute left-3 text-muted-foreground/70 pointer-events-none">
                <Hash className="w-4 h-4" />
              </div>
              <div className="h-10 md:h-11 w-full bg-card border border-border rounded-xl pl-9 pr-3.5 flex items-center text-xs text-muted-foreground shadow-xs">
                {q.placeholder || `Enter numerical value...`}
              </div>
            </div>
          )}

          {/* Rating Scale */}
          {(fieldType === 'rating' || fieldType === 'star_rating' || fieldType === 'star-rating' || fieldType === 'stars' || fieldType === 'satisfaction') && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5 bg-card p-2 rounded-xl border border-border shadow-xs">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 text-amber-400 fill-amber-400 cursor-pointer hover:scale-110 transition-transform drop-shadow-xs" />
                ))}
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                (1 = Poor, 5 = Excellent)
              </span>
            </div>
          )}

          {/* Emoji Scale */}
          {(fieldType === 'emoji-satisfaction-scale' || fieldType === 'mood' || fieldType === 'satisfaction_emoji' || fieldType === 'emoji') && (
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full">
              {(q.options && q.options.length > 0 ? q.options : ["🤩 Very Satisfied", "😋 Satisfied", "😐 Neutral", "🙁 Unsatisfied", "🤮 Very Poor"]).map((emoji: string, eIdx: number) => {
                const parts = emoji.split(' ');
                const icon = parts[0];
                const text = parts.slice(1).join(' ');
                return (
                  <button
                    key={eIdx}
                    type="button"
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer shadow-xs text-center group/emoji overflow-hidden"
                  >
                    <span className="text-lg md:text-xl group-hover/emoji:scale-110 transition-transform">{icon}</span>
                    {text && <span className="text-[10px] font-bold text-muted-foreground truncate w-full mt-0.5 hidden sm:inline-block">{text}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* File Upload */}
          {(fieldType === 'file_upload' || fieldType === 'photo' || fieldType === 'resume' || fieldType === 'document' || fieldType === 'file' || fieldType === 'upload') && (
            <div className="border-2 border-dashed border-border hover:border-primary/60 bg-card rounded-xl p-4 text-center cursor-pointer transition-all space-y-1.5 flex flex-col items-center justify-center group/upload">
              <Upload className="w-5 h-5 text-primary group-hover/upload:scale-110 transition-transform" />
              <p className="text-xs font-bold text-foreground">Click or Drag File to Upload</p>
              <p className="text-[11px] text-muted-foreground">Supported: PDF, DOCX, PNG, JPG (Max 10MB)</p>
            </div>
          )}

          {/* Digital Signature */}
          {fieldType === 'signature' && (
            <div className="border border-border rounded-xl p-3.5 bg-card text-center text-xs text-muted-foreground h-16 flex items-center justify-center space-x-2 border-dashed">
              <PenTool className="w-4 h-4 text-primary" />
              <span>Draw digital signature inside box</span>
            </div>
          )}

          {/* Agreement / Consent */}
          {(fieldType === 'agreement' || fieldType === 'consent') && (
            <label className="flex items-start space-x-3 text-xs text-foreground bg-card p-3.5 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-all shadow-xs w-full">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary accent-primary mt-0.5 flex-shrink-0" />
              <span className="font-medium leading-relaxed">
                {q.options && q.options[0] ? q.options[0] : "I declare that all information provided is accurate and I agree to the terms and privacy policy."}
              </span>
            </label>
          )}

          {/* Fallback for unhandled type */}
          {![
            'short_text', 'text', 'name', 'first_name', 'last_name', 'full_name', 'email', 'email_address', 'phone', 'contact', 'mobile', 'telephone', 'price', 'amount', 'address', 'website', 'url', 'password',
            'long_text', 'paragraph', 'feedback', 'textarea', 'comments', 'description', 'message',
            'mcq', 'radio', 'one_option', 'gender', 'single_choice',
            'checkbox', 'multiple_options', 'multi_choice', 'checkboxes', 'interactive-tag-cloud', 'tags',
            'yes_no', 'yes-no', 'boolean', 'toggle',
            'dropdown', 'select', 'country',
            'date', 'birthday', 'dob', 'date_of_birth', 'birth_date',
            'time', 'appointment_time',
            'number', 'quantity', 'age', 'count',
            'rating', 'star_rating', 'star-rating', 'stars', 'satisfaction',
            'emoji-satisfaction-scale', 'mood', 'satisfaction_emoji', 'emoji',
            'file_upload', 'photo', 'resume', 'document', 'file', 'upload',
            'signature', 'agreement', 'consent', 'matching', 'ordering'
          ].includes(fieldType) && (
            <div className="relative flex items-center w-full">
              <div className="absolute left-3 text-muted-foreground/70 pointer-events-none">
                <FileText className="w-4 h-4" />
              </div>
              <div className="h-10 md:h-11 w-full bg-card border border-border rounded-xl pl-9 pr-3.5 flex items-center text-xs text-muted-foreground shadow-xs transition-all">
                {q.placeholder || `Enter response for ${q.label.toLowerCase()}...`}
              </div>
            </div>
          )}
        </div>

        {/* Answer key (only for assessments, only when the owner asks to see it) */}
        {showAnswerKey && activeForm?.isAssessment && q.validations?.assessmentType && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] space-y-1">
            {q.validations.correctAnswer !== undefined ? (
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold break-words">✓ {formatAnswerKey(q.validations.correctAnswer, q.validations.assessmentType)}</p>
            ) : q.validations.modelAnswer ? (
              <pre className="text-emerald-700 dark:text-emerald-400 font-mono whitespace-pre-wrap">{q.validations.modelAnswer}</pre>
            ) : (
              <p className="text-red-600 font-semibold">No verified answer — review before publishing.</p>
            )}
            {q.validations.explanation && <p className="text-muted-foreground">{q.validations.explanation}</p>}
            {q.validations.rubric && <p className="text-muted-foreground whitespace-pre-wrap"><b>Rubric:</b> {q.validations.rubric}</p>}
          </div>
        )}
      </div>
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !file) {
      setError("Please enter a prompt or upload a file.");
      return;
    }

    setError(null);
    setAssistantNote(null);
    setIsGenerating(true);
    setShowSampleDemo(false);

    try {
      let result;
      const basePrompt = prompt.trim();
      // The open (saved) form is sent as conversation context; the server decides whether the
      // message edits it or asks for a brand-new form.
      const contextFormId = generatedForm?.id && !String(generatedForm.id).startsWith('gen-') && !String(generatedForm.id).startsWith('demo-') ? generatedForm.id : undefined;

      if (mode === 'pdf' || mode === 'image') {
        if (!file) {
          setError("Please select a file to upload.");
          setIsGenerating(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prompt', basePrompt);
        formData.append('formType', formType);
        formData.append('optionLayout', optionLayout);
        result = await api.postMultipart('/ai/generate', formData);
      } else {
        result = await api.post('/ai/generate', { prompt: basePrompt, formType, optionLayout, contextFormId });
      }

      if (result?.status === 'clarify' || result?.status === 'converse') {
        setAssistantNote({ kind: result.status, text: result.message || '', suggestions: Array.isArray(result.suggestions) ? result.suggestions : [] });
        return;
      }

      const formObj = result?.form;
      if (!formObj || !Array.isArray(formObj.questions)) {
        setError("The server did not return a form. Please try again.");
        return;
      }
      if (formObj.id && !String(formObj.id).startsWith('gen-') && result.operation !== 'modify') {
        await api.patch(`/forms/${formObj.id}`, { settings: { display_mode: displayMode } }).catch(() => {});
      }
      setGeneratedForm(mapServerForm(formObj));
      setRequirements(result.requirements || null);
      setShowReportDetails(Boolean(result.requirements && !result.requirements.complete));
      setPrompt("");
    } catch (err: any) {
      setError(err.message || "Failed to generate form. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  /** Persist an unsaved preview (guest generation or the sample demo) and return the saved form. */
  const ensureSavedForm = async (target: any): Promise<any> => {
    if (!target?.id) return null;
    if (!String(target.id).startsWith('gen-') && !String(target.id).startsWith('demo-')) {
      await api.patch(`/forms/${target.id}`, { settings: { display_mode: displayMode } }).catch(() => {});
      return target;
    }
    const savedForm = await api.post('/forms', {
      title: target.title || "AI Generated Form",
      description: target.description || "Created with PromptForm AI",
      settings: { ...(target.settings || {}), display_mode: displayMode },
      theme: target.theme || { primary_color: "#8B6B55", background_color: "#FAF6EF" }
    });
    let savedQuestions: any[] = [];
    if (target.questions?.length > 0) {
      savedQuestions = await api.put(`/forms/${savedForm.id}/questions`, target.questions.map((q: any) => ({
        type: q.type, label: q.label, required: Boolean(q.required), options: q.options || [], validations: q.validations || {}, logic: q.logic || {}
      })));
    }
    const mapped = mapServerForm({ ...savedForm, questions: savedQuestions });
    setGeneratedForm(mapped);
    return mapped;
  };

  const handleOpenBuilder = async () => {
    const target = generatedForm || (showSampleDemo ? defaultPreviewForm : null);
    if (!target) return;
    setIsGenerating(true);
    try {
      const saved = await ensureSavedForm(target);
      if (saved?.id) router.push(`/builder/${saved.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to save generated form.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSharePublic = async () => {
    const target = generatedForm || (showSampleDemo ? defaultPreviewForm : null);
    if (!target) return;
    setIsGenerating(true);
    try {
      const saved = await ensureSavedForm(target);
      if (saved?.id) setShareModalOpen(true);
    } catch (err: any) {
      setError(err.message || "Failed to save form for sharing.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!mounted) return null;

  return (
    <DashboardLayout activeTab="ai_generator">
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 scrollbar-thin">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header Title Banner */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                AI Form Generator
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Turn any topic into an intelligent interactive form, survey, or quiz in seconds.
              </p>
            </div>
          </div>

          {/* MAIN SPLIT-SCREEN GRID (Left: Inputs, Right: Live Preview & Action Suite) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* LEFT COLUMN: Generator Controls (6 cols on LG) */}
            <div className="lg:col-span-6 flex flex-col bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-card space-y-6">
              
              {/* Mode Switcher Tabs */}
              <div className="flex items-center justify-between min-h-[44px] border-b border-border pb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setMode('prompt'); setFile(null); setError(null); }}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-none cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                      mode === 'prompt' 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'bg-secondary/70 dark:bg-secondary/40 text-muted-foreground border border-border/60'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Prompt to Form</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode('pdf'); setFile(null); setError(null); }}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-none cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                      mode === 'pdf' 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'bg-secondary/70 dark:bg-secondary/40 text-muted-foreground border border-border/60'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF / Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode('image'); setFile(null); setError(null); }}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-none cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                      mode === 'image' 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'bg-secondary/70 dark:bg-secondary/40 text-muted-foreground border border-border/60'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Image / Scan</span>
                  </button>
                </div>
              </div>

              {/* Form Input Form */}
              <form onSubmit={handleGenerate} className="space-y-5 flex-1 flex flex-col justify-between">
                  
                  <div className="space-y-5">
                    {generatedForm && (
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <p className="text-[11px] text-foreground min-w-0">
                          <span className="font-bold">Editing:</span>{' '}
                          <span className="truncate">{generatedForm.title}</span>
                          <span className="block text-muted-foreground">Follow-up messages change this form. Say “create a new form” or click New form to start over.</span>
                        </p>
                        <button
                          type="button"
                          onClick={startNewForm}
                          className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer"
                        >
                          + New form
                        </button>
                      </div>
                    )}

                    {mode === 'prompt' && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {generatedForm ? 'Describe a change, or ask for a new form' : 'Describe your Form or Quiz Topic'}
                        </label>
                        <Textarea
                          rows={4}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={generatedForm
                            ? 'e.g. "Add five more questions with the same marks", "Make email mandatory", "Translate everything into Gujarati"...'
                            : 'e.g. "Food order form for my restaurant", "ધોરણ ૬ માટે ૫૦ ગુણનો વિજ્ઞાનનો પ્રશ્નપત્ર", "Python test: 10 MCQs + 5 coding problems, 50 marks"...'}
                          className="w-full text-xs md:text-sm rounded-2xl p-4 bg-background border-border/80 focus:ring-2 focus:ring-primary/40 outline-none text-foreground placeholder:text-muted-foreground/60 transition-all"
                          required
                        />
                        
                        {/* Sample Prompt Quick Pills */}
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prompt Examples:</span>
                          <div className="flex flex-wrap gap-2">
                            {samplePrompts.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPrompt(s.text)}
                                className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-secondary/60 dark:bg-secondary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/70 text-foreground text-left transition-all cursor-pointer shadow-2xs"
                              >
                                "{s.title}"
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {(mode === 'pdf' || mode === 'image') && (
                      <div className="space-y-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Upload {mode === 'pdf' ? 'PDF / Word File' : 'Form Image Scan'}
                        </label>
                        <div className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-6 text-center space-y-2 bg-secondary/20 transition-all">
                          <Upload className="w-7 h-7 text-primary mx-auto animate-bounce" />
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {file ? file.name : `Choose ${mode === 'pdf' ? 'PDF document' : 'image file'}`}
                            </p>
                          </div>
                          <input 
                            key={mode}
                            type="file" 
                            accept={mode === 'pdf' ? ".pdf,.docx" : "image/*,.png,.jpg,.jpeg,.webp,.heic"}
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="hidden" 
                            id={mode === 'pdf' ? "pdf-file-input" : "image-file-input"}
                          />
                          <label htmlFor={mode === 'pdf' ? "pdf-file-input" : "image-file-input"} className="inline-block bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-4 py-1.5 rounded-xl cursor-pointer">
                            Browse File
                          </label>
                        </div>

                        {/* Optional Prompt/Instructions for the document */}
                        <div className="space-y-2 pt-1">
                          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Custom Instructions & Extraction Requirements (Optional)
                          </label>
                          <Textarea
                            rows={3}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={mode === 'pdf' 
                              ? "e.g. Extract fields from this document, and include emergency contact and insurance details..."
                              : "e.g. Extract all form questions from this scan and add rating and signature fields..."}
                            className="w-full text-xs md:text-sm rounded-2xl p-3.5 bg-background border-border/80 focus:ring-2 focus:ring-primary/40 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Options row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-muted-foreground">Form Type</label>
                        <CustomSelect
                          value={formType}
                          onChange={(val) => setFormType(val)}
                          options={[
                            { value: "auto", label: "✨ Auto-detect Topic" },
                            { value: "quiz", label: "🎯 Assessment / Quiz" },
                            { value: "survey", label: "📊 Customer Survey" },
                            { value: "medical", label: "🩺 Medical / Patient Intake" },
                            { value: "rsvp", label: "🎉 Event RSVP" },
                            { value: "job", label: "💼 Job Application" },
                            { value: "contact", label: "📩 Contact Request" },
                            { value: "education", label: "🎓 Course Evaluation" }
                          ]}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-muted-foreground">Option Layout</label>
                        <CustomSelect
                          value={optionLayout}
                          onChange={(val) => setOptionLayout(val as 'vertical' | 'horizontal')}
                          options={[
                            { value: "horizontal", label: "↔️ Same Line (Inline)" },
                            { value: "vertical", label: "↕️ Stacked (Vertical)" }
                          ]}
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-secondary/30 dark:bg-secondary/20 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-foreground flex items-center space-x-2">
                          <LayoutGrid className="w-4 h-4 text-primary" />
                          <span>Respondent Display</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-2">
                            Saved with Form
                          </span>
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1 font-medium">How should the form be shown to respondents?</p>
                      </div>
                      <div className="w-full sm:w-44">
                        <CustomSelect
                          value={displayMode}
                          onChange={(val) => updateSavedDisplayMode(val as 'full' | 'wizard' | 'chat')}
                          options={[
                            { value: "full", label: "📄 Full Form" },
                            { value: "wizard", label: "🃏 Card Wizard" },
                            { value: "chat", label: "💬 Chat Mode" }
                          ]}
                        />
                      </div>
                    </div>

                    {assistantNote && (
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/25 text-xs space-y-2.5" role="status" aria-live="polite">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-primary" />
                          {assistantNote.kind === 'clarify' ? 'One quick question' : 'PromptForm AI'}
                        </p>
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">{assistantNote.text}</p>
                        {assistantNote.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {assistantNote.suggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => { setPrompt(s); setAssistantNote(null); }}
                                className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary/50 hover:text-primary cursor-pointer"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {error && (
                      <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-start space-x-3 shadow-xs animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-destructive" />
                        <div className="space-y-1.5 flex-1">
                          <p className="font-bold text-sm">Generation Notice</p>
                          <p className="font-normal leading-relaxed text-foreground">{error}</p>
                          {(error.includes("aistudio.google.com") || error.includes("GEMINI_API_KEY")) && (
                            <div className="pt-2 flex flex-wrap gap-2">
                              <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:opacity-90 transition-opacity shadow-sm"
                              >
                                🔑 Get Free Gemini API Key →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full bg-primary hover:opacity-90 text-primary-foreground font-extrabold py-3.5 rounded-xl text-xs md:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer mt-4 border border-primary/20"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{generatedForm ? 'Applying your request...' : 'Generating Form & Questions...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{generatedForm ? 'Send to AI' : 'Generate Form with AI'}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </form>
            </div>

            {/* RIGHT COLUMN: Live Form Preview & Action Bar (6 cols on LG) */}
            {/* RIGHT COLUMN: Live Form Preview & Action Bar (6 cols on LG) */}
            <div className="lg:col-span-6 flex flex-col bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
              
              {/* Preview Window Header with Mac Dots & Theme Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[44px] border-b border-border pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center space-x-1.5 pr-2 border-r border-border/80">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-primary" />
                    <span>Live Preview ({displayMode === 'full' ? 'Full Form' : displayMode === 'wizard' ? 'Card Wizard' : 'Chat Mode'})</span>
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {generatedForm ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      🟢 AI Generated
                    </span>
                  ) : showSampleDemo ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      👁️ Demo
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                      Waiting
                    </span>
                  )}
                </div>
              </div>

              {/* Interactive Form Card Preview Container */}
              <div className="border border-border/80 rounded-3xl p-5 md:p-6 shadow-xs space-y-5 relative overflow-hidden group flex-1 flex flex-col justify-between min-h-[480px] bg-background/60 text-foreground">
                
                {/* 1. LOADING STATE */}
                {isGenerating && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 my-auto">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                        <Sparkles className="w-8 h-8 text-primary animate-spin" />
                      </div>
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h4 className="text-base font-extrabold text-foreground tracking-tight">
                        Generating Custom AI Form...
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Synthesizing questions, smart fields, logic, and layout for your topic.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. EMPTY STATE - PROMPT ENCOURAGEMENT */}
                {!isGenerating && !activeForm && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 my-auto">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <h4 className="text-base font-extrabold text-foreground tracking-tight">
                        Interactive Preview Canvas
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your AI-generated form preview will appear here in real time. Describe your topic or upload a document/scan on the left, then click <span className="font-semibold text-foreground">"Generate Form with AI"</span>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full text-left pt-2">
                      <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1 hover:border-primary/40 transition-colors">
                        <span className="text-xs font-bold text-foreground block">⚡ Smart Fields</span>
                        <span className="text-[11px] text-muted-foreground block">Name, Phone, Email, Rating, Signature & Uploads</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1 hover:border-primary/40 transition-colors">
                        <span className="text-xs font-bold text-foreground block">🎯 Assessment Ready</span>
                        <span className="text-[11px] text-muted-foreground block">Auto-scoring, quiz points & anti-cheat proctoring</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1 hover:border-primary/40 transition-colors">
                        <span className="text-xs font-bold text-foreground block">🃏 Multi-Display</span>
                        <span className="text-[11px] text-muted-foreground block">Full Form, Step Wizard, and Conversational Chat</span>
                      </div>
                    </div>

                    {/* Optional Sample Preview Toggle */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSampleDemo(true)}
                        className="text-xs font-bold text-primary hover:underline flex items-center space-x-1.5 cursor-pointer"
                      >
                        <span>Preview Sample Dentistry Form Layout →</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. ACTIVE FORM PREVIEW (Generated Form or Sample Demo) */}
                {!isGenerating && activeForm && (
                  <>
                    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-2 border-t-4 border-t-primary">
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          {activeForm.category || "General Form"}
                        </div>
                        {showSampleDemo && !generatedForm && (
                          <button
                            type="button"
                            onClick={() => setShowSampleDemo(false)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground underline cursor-pointer"
                          >
                            ✕ Close Sample Demo
                          </button>
                        )}
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
                        {activeForm.title}
                      </h3>
                      {activeForm.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {activeForm.description}
                        </p>
                      )}
                      {activeForm.isAssessment && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {activeForm.questions.filter((q: any) => q.validations?.assessmentType).length} questions ·{' '}
                            {activeForm.questions.reduce((s: number, q: any) => s + (Number(q.validations?.points) || 0), 0)} marks
                          </span>
                          {Number(activeForm.settings?.timer_limit) > 0 && <span>· {activeForm.settings.timer_limit} min</span>}
                          <button
                            type="button"
                            onClick={() => setShowAnswerKey(v => !v)}
                            className="ml-auto text-[11px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            {showAnswerKey ? 'Hide answer key' : 'Show answer key'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Requirement verification report from the server */}
                    {generatedForm && requirements && (
                      <div className={`rounded-2xl border p-3.5 text-[11px] space-y-2 ${requirements.complete ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-amber-500/5 border-amber-500/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            {requirements.complete
                              ? <><CheckCircle className="w-4 h-4 text-emerald-600" /> All {requirements.checks?.length || 0} requirement checks passed</>
                              : <><AlertCircle className="w-4 h-4 text-amber-600" /> {requirements.unmet?.length || 0} requirement(s) not fully met</>}
                          </p>
                          <button type="button" onClick={() => setShowReportDetails(v => !v)} className="text-primary font-bold hover:underline cursor-pointer shrink-0">
                            {showReportDetails ? 'Hide details' : 'Details'}
                          </button>
                        </div>
                        {!requirements.complete && requirements.unmet?.length > 0 && (
                          <ul className="list-disc pl-4 space-y-0.5 text-amber-800 dark:text-amber-300">
                            {requirements.unmet.slice(0, 6).map((u: string) => <li key={u}>{u}</li>)}
                          </ul>
                        )}
                        {requirements.unsupported?.length > 0 && (
                          <ul className="list-disc pl-4 space-y-0.5 text-red-700 dark:text-red-400">
                            {requirements.unsupported.map((u: string) => <li key={u}>{u}</li>)}
                          </ul>
                        )}
                        {showReportDetails && (
                          <div className="space-y-2 pt-1 border-t border-border/60">
                            {requirements.understood?.length > 0 && (
                              <div>
                                <p className="font-semibold text-foreground mb-0.5">Understood</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">{requirements.understood.map((u: string) => <li key={u}>{u}</li>)}</ul>
                              </div>
                            )}
                            {requirements.checks?.length > 0 && (
                              <div>
                                <p className="font-semibold text-foreground mb-0.5">Checks</p>
                                <ul className="space-y-0.5">
                                  {requirements.checks.map((c: any) => (
                                    <li key={c.requirement} className="flex gap-1.5">
                                      <span className={c.status === 'unmet' ? 'text-red-600' : c.status === 'repaired' ? 'text-amber-600' : 'text-emerald-600'}>
                                        {c.status === 'unmet' ? '✗' : c.status === 'repaired' ? '↻' : '✓'}
                                      </span>
                                      <span className="text-muted-foreground">{c.requirement}{c.detail ? ` — ${c.detail}` : ''}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {requirements.repairsApplied?.length > 0 && (
                              <div>
                                <p className="font-semibold text-foreground mb-0.5">Automatic corrections</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">{requirements.repairsApplied.map((u: string) => <li key={u}>{u}</li>)}</ul>
                              </div>
                            )}
                            {requirements.assumptions?.length > 0 && (
                              <div>
                                <p className="font-semibold text-foreground mb-0.5">Assumptions (editable)</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">{requirements.assumptions.map((u: string) => <li key={u}>{u}</li>)}</ul>
                              </div>
                            )}
                            {requirements.warnings?.length > 0 && (
                              <div>
                                <p className="font-semibold text-foreground mb-0.5">Review notes</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">{requirements.warnings.map((u: string) => <li key={u}>{u}</li>)}</ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question Fields Preview dynamically based on displayMode */}
                    {displayMode === 'full' && (
                      <div className="space-y-4 max-h-[440px] md:max-h-[500px] overflow-y-auto pr-1.5 scrollbar-thin">
                        {activeForm.questions.map((q: any, idx: number) => renderAIQuestionCard(q, idx))}
                      </div>
                    )}

                    {displayMode === 'wizard' && (() => {
                      const totalQs = activeForm.questions.length || 1;
                      const safeIndex = Math.min(previewStepIndex, Math.max(0, totalQs - 1));
                      return (
                        <div className="space-y-4 max-h-[440px] md:max-h-[500px] overflow-y-auto pr-1.5 scrollbar-thin flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                              <span>Question {safeIndex + 1} of {totalQs}</span>
                              <span>{Math.round(((safeIndex + 1) / totalQs) * 100)}% Completed</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${((safeIndex + 1) / totalQs) * 100}%` }}
                              />
                            </div>
                          </div>

                          {activeForm.questions[safeIndex] && renderAIQuestionCard(activeForm.questions[safeIndex], safeIndex)}

                          <div className="flex items-center justify-between pt-3 border-t border-border/60">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={safeIndex === 0}
                              onClick={() => setPreviewStepIndex(prev => Math.max(0, prev - 1))}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
                            >
                              ← Back
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setPreviewStepIndex(prev => Math.min(totalQs - 1, safeIndex + 1))}
                              disabled={safeIndex >= totalQs - 1}
                              className="text-xs font-bold px-4 py-1.5 rounded-lg bg-primary text-white cursor-pointer disabled:opacity-40"
                            >
                              Next Question →
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {displayMode === 'chat' && (() => {
                      const totalQs = activeForm.questions.length || 1;
                      const safeIndex = Math.min(previewStepIndex, Math.max(0, totalQs - 1));
                      return (
                        <div ref={chatContainerRef} className="space-y-4 max-h-[440px] md:max-h-[500px] overflow-y-auto pr-1.5 scrollbar-thin flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-start space-x-2">
                              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                                🤖
                              </div>
                              <div className="bg-secondary p-3 rounded-2xl rounded-tl-xs text-xs space-y-1 max-w-[90%]">
                                <p className="font-bold text-foreground">Welcome to {activeForm.title}!</p>
                                <p className="text-muted-foreground">This form is set to Conversational AI Chat Mode. Questions are presented step-by-step.</p>
                              </div>
                            </div>

                            {activeForm.questions.slice(0, safeIndex + 1).map((q: any, idx: number) => (
                              <div key={q.id || idx} className="space-y-2">
                                <div className="flex items-start space-x-2">
                                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    🤖
                                  </div>
                                  <div className="bg-secondary/80 p-3 rounded-2xl rounded-tl-xs text-xs space-y-2 max-w-[90%] border border-border/50 w-full">
                                    <span className="font-extrabold text-[11px] text-primary block">Step {idx + 1}: {q.label}</span>
                                    {renderAIQuestionCard(q, idx)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {safeIndex < totalQs - 1 && (
                            <div className="flex justify-end pt-2 border-t border-border/60">
                              <Button
                                type="button"
                                onClick={() => setPreviewStepIndex(prev => prev + 1)}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary text-white shadow-xs cursor-pointer"
                              >
                                Continue to Step {safeIndex + 2} ↓
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* ACTION BUTTONS SUITE BELOW PREVIEW */}
                <div className="pt-4 border-t border-border/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* OPTION 1: Public Link / Share */}
                  <Button
                    type="button"
                    onClick={handleSharePublic}
                    disabled={isGenerating || !activeForm}
                    variant="outline"
                    className={`w-full text-xs font-bold py-2.5 rounded-xl border-border bg-card hover:bg-secondary/70 text-foreground flex items-center justify-center space-x-1.5 hover:border-primary/50 transition-all ${
                      !activeForm ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer shadow-xs'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving & Sharing...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-primary" />
                        <span>Public / Share</span>
                      </>
                    )}
                  </Button>

                  {/* OPTION 2: Create Form / Open Full Builder */}
                  <Button
                    type="button"
                    onClick={handleOpenBuilder}
                    disabled={isGenerating || !activeForm}
                    className={`w-full bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center space-x-1.5 transition-all ${
                      !activeForm ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create & Edit Form</span>
                      </>
                    )}
                  </Button>

                </div>

              </div>

            </div>

          </div>

        </div>
      </div>

      {/* SHARE MODAL */}
      {activeForm && (
        <ShareModal 
          isOpen={shareModalOpen} 
          onClose={() => setShareModalOpen(false)} 
          formId={activeForm.id || ''} 
          formTitle={activeForm.title || ''} 
          uniqueShareId={activeForm.uniqueShareId}
          publicUrl={activeForm.publicUrl}
        />
      )}

    </DashboardLayout>
  );
}
