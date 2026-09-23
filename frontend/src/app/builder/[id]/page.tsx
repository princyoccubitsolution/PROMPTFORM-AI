"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Share2, Plus, Trash2, Settings, Palette, GitFork, 
  Copy, Check, Eye, HelpCircle, ArrowRight, Zap, RefreshCw, FileText, 
  Sparkles, LayoutGrid, CheckSquare, ListPlus, Star, Signature, FileUp, CopyCheck,
  ExternalLink, Globe, Code, Download, Shield, BarChart3, AlertTriangle, CheckCircle2,
  QrCode, Mail, ArrowUp, ArrowDown, GripVertical, Calendar, Clock, CreditCard,
  Undo2, Redo2, History, Search, ChevronRight, ChevronDown, Bell, Moon, Sun, 
  Smartphone, Monitor, Tablet, MoreHorizontal, User, Sparkle,
  Phone, MapPin, Lock, Link, Hash, DollarSign, Image
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useTheme } from 'next-themes';
import { useFormStore, Question } from '@/store/useFormStore';
import { api, BASE_URL } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { ShareModal } from '@/components/ShareModal';
import { UpgradeModal } from '@/components/UpgradeModal';


const FONT_FAMILY_MAP: Record<string, string> = {
  'Manrope': "'Manrope', sans-serif",
  'Inter': 'var(--font-sans), Inter, sans-serif',
  'Plus Jakarta Sans': "'Plus Jakarta Sans', sans-serif",
  'Poppins': 'var(--font-poppins), Poppins, sans-serif',
  'Roboto': 'var(--font-roboto), Roboto, sans-serif',
  'Outfit': 'var(--font-outfit), Outfit, sans-serif',
  'Playfair Display': 'var(--font-playfair), "Playfair Display", serif',
  'Space Grotesk': 'var(--font-space-grotesk), "Space Grotesk", sans-serif',
  'Georgia': 'Georgia, serif',
  'Courier New': '"Courier New", monospace',
};

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  // Zustand Store
  const store = useFormStore();
  
  // Local state controls
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Tab mode & Analytics states
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeMode, setActiveMode] = useState<"edit" | "analytics">("edit");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  
  const isDark = mounted ? (theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)) : true;
  const darkMode = isDark;
  const setDarkMode = (val: boolean) => {
    setTheme(val ? 'dark' : 'light');
  };

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<Question[][]>([]);
  const [redoStack, setRedoStack] = useState<Question[][]>([]);

  // Drag and drop reordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

  // Mobile viewport tab selector
  const [mobileTab, setMobileTab] = useState<'fields' | 'canvas' | 'settings'>('canvas');

  // Canvas Container Ref for auto-scroll
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [isCopiedEmbed, setIsCopiedEmbed] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Accordion active keys in the properties panel
  const [accordions, setAccordions] = useState({
    general: true,
    branding: true,
    validation: false,
    logic: false,
    permissions: false,
    publishing: false,
    analytics: false,
    developer: false
  });

  const toggleAccordion = (key: keyof typeof accordions) => {
    setAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // AI Assistant state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeRestriction, setActiveRestriction] = useState<any | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  // AI Response review details states
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [isSentimentAnalyzing, setIsSentimentAnalyzing] = useState(false);
  const [sentimentReport, setSentimentReport] = useState<any>(null);

  // Selected Question helper
  const selectedQuestion = store.questions.find(q => q.id === selectedQuestionId);

  // Track state snapshots for Undo
  const saveStateForUndo = (currentQuestions: Question[]) => {
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(currentQuestions))]);
    setRedoStack([]); // Clear redo stack on new action
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(store.questions))]);
    useFormStore.setState({ questions: previous });
    if (previous.length > 0) {
      setSelectedQuestionId(previous[0].id);
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(store.questions))]);
    useFormStore.setState({ questions: next });
    if (next.length > 0) {
      setSelectedQuestionId(next[0].id);
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTop = relativeY < rect.height / 2;
    
    setDragOverIndex(index);
    setDropPosition(isTop ? 'top' : 'bottom');

    // Auto-scroll while dragging near boundaries
    if (canvasContainerRef.current) {
      const container = canvasContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const threshold = 100; // pixels from boundary
      
      const distFromTop = e.clientY - containerRect.top;
      const distFromBottom = containerRect.bottom - e.clientY;

      if (distFromTop < threshold) {
        container.scrollTop -= 15;
      } else if (distFromBottom < threshold) {
        container.scrollTop += 15;
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    let adjustedEndIndex = targetIndex;
    if (dropPosition === 'bottom') {
      adjustedEndIndex = targetIndex + 1;
    }
    
    if (draggedIndex < adjustedEndIndex) {
      adjustedEndIndex -= 1;
    }
    
    adjustedEndIndex = Math.max(0, Math.min(store.questions.length - 1, adjustedEndIndex));
    
    if (draggedIndex !== adjustedEndIndex) {
      saveStateForUndo(store.questions);
      store.reorderQuestions(draggedIndex, adjustedEndIndex);
    }
    
    handleDragEnd();
  };

  useEffect(() => {
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    try {
      const form = await api.get(`/forms/${formId}`);
      store.setForm(form);
      if (form.questions?.length > 0) {
        setSelectedQuestionId(form.questions[0].id);
      }
    } catch (err: any) {
      alert("Failed to load form details.");
      router.push('/dashboard/ai');
    }
  };

  const loadResponses = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await api.get(`/forms/${formId}/responses`);
      setResponses(data || []);
    } catch (err) {
      console.error("Failed to load responses", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeMode === "analytics") {
      loadResponses();
    }
  }, [activeMode]);

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('promptform_access_token');
      const response = await fetch(`${BASE_URL}/forms/${formId}/export`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error("Could not export responses.");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `responses-export-${formId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to export responses: " + err.message);
    }
  };

  const handleSaveForm = async () => {
    store.setSaving(true);
    try {
      await api.put(`/forms/${formId}`, {
        title: store.title,
        description: store.description,
        status: store.status,
        isPublic: store.isPublic,
        responseLimit: store.responseLimit,
        settings: store.settings,
        theme: store.theme
      });
      await api.put(`/forms/${formId}/questions`, store.questions);
      alert("All builder changes saved!");
    } catch (err: any) {
      alert("Failed to save changes: " + err.message);
    } finally {
      store.setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    setIsPublishing(true);
    const newStatus = store.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    try {
      const updatedForm = await api.put(`/forms/${formId}`, { 
        status: newStatus,
        title: store.title,
        description: store.description,
        isPublic: store.isPublic,
        responseLimit: store.responseLimit,
        settings: store.settings,
        theme: store.theme
      });
      await api.put(`/forms/${formId}/questions`, store.questions);
      
      store.setForm(updatedForm);
      if (newStatus === 'PUBLISHED') {
        setIsSuccessModalOpen(true);
      } else {
        alert(`Form set to CLOSED. Submissions are no longer accepted.`);
      }
    } catch (err: any) {
      alert("Failed to toggle publish status: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = () => {
    const shareCode = store.uniqueShareId || formId;
    const publicLinkUrl = `${window.location.origin}/f/${shareCode}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(publicLinkUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = publicLinkUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy link:", err);
    }
  };

  // Add field with undo saving
  const handleAddField = (type: string) => {
    saveStateForUndo(store.questions);
    store.addQuestion(type);
    
    // Select the newly added question
    setTimeout(() => {
      const latestQuestions = useFormStore.getState().questions;
      if (latestQuestions.length > 0) {
        setSelectedQuestionId(latestQuestions[latestQuestions.length - 1].id);
      }
    }, 50);
  };

  // Load preset templates
  const handleLoadTemplate = async (templateName: string) => {
    saveStateForUndo(store.questions);
    let title = "Template Form";
    let description = "Automatically created from template marketplace.";
    let questionsList: any[] = [];

    if (templateName === "customer_review") {
      title = "Customer Experience Review";
      description = "Help us improve our service by sharing your valuable feedback.";
      questionsList = [
        { type: "rating", label: "How would you rate our service?", required: true, options: [] },
        { type: "mcq", label: "How satisfied are you with our product?", required: true, options: ["Very satisfied", "Satisfied", "Neutral", "Unsatisfied"] },
        { type: "long_text", label: "What did you like most about our service?", required: false, options: [] },
        { type: "mcq", label: "Would you recommend us to others?", required: true, options: ["Yes", "No"] },
        { type: "file_upload", label: "Upload your feedback image (optional)", required: false, options: [] }
      ];
    } else if (templateName === "product_feedback") {
      title = "Product Feedback Form";
      description = "Let us know how we can make our product better.";
      questionsList = [
        { type: "dropdown", label: "Which product did you purchase?", required: true, options: ["Pro Builder", "AI Assistant", "Teams Workspace"] },
        { type: "rating", label: "Rate the UI design aesthetics:", required: true, options: [] },
        { type: "long_text", label: "What features are missing or need improvement?", required: false, options: [] }
      ];
    } else if (templateName === "event_registration") {
      title = "Event Registration";
      description = "Secure your spot at our upcoming event summit.";
      questionsList = [
        { type: "short_text", label: "Full Name", required: true, options: [] },
        { type: "short_text", label: "Email Address", required: true, options: [] },
        { type: "checkbox", label: "Dietary Preferences", required: false, options: ["None", "Vegetarian", "Vegan", "Gluten-Free"] }
      ];
    } else if (templateName === "contact_form") {
      title = "Contact Form";
      description = "Send us a message and we'll reply shortly.";
      questionsList = [
        { type: "short_text", label: "Full Name", required: true, options: [] },
        { type: "short_text", label: "Email Address", required: true, options: [] },
        { type: "long_text", label: "Message details", required: true, options: [] }
      ];
    } else if (templateName === "blank_form") {
      title = "Untitled Blank Form";
      description = "Build questions list using Left Sidebar or AI Co-Pilot.";
      questionsList = [];
    }

    store.updateFormFields({ title, description });
    const formattedQuestions = questionsList.map((q, idx) => ({
      id: `q-${Date.now()}-${idx}`,
      type: q.type,
      label: q.label,
      required: q.required,
      options: q.options,
      validations: { points: 1, correct_answer: "" },
      logic: {}
    }));

    useFormStore.setState({ questions: formattedQuestions });
    if (formattedQuestions.length > 0) {
      setSelectedQuestionId(formattedQuestions[0].id);
    } else {
      setSelectedQuestionId(null);
    }
  };

  const handleDuplicateQuestion = (q: Question) => {
    saveStateForUndo(store.questions);
    const newId = `q-dup-${Date.now()}`;
    const newQuestions = [...store.questions];
    const index = newQuestions.findIndex(item => item.id === q.id);
    if (index !== -1) {
      newQuestions.splice(index + 1, 0, {
        ...q,
        id: newId,
        label: `${q.label} (Copy)`
      });
      useFormStore.setState({ questions: newQuestions });
      setSelectedQuestionId(newId);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    saveStateForUndo(store.questions);
    store.deleteQuestion(id);
    setSelectedQuestionId(store.questions.length > 1 ? store.questions[0].id : null);
  };

  const handleGenerateAISentiment = async () => {
    setIsSentimentAnalyzing(true);
    try {
      const res = await api.post('/ai/analyze-sentiment', { formId });
      setSentimentReport(res.sentimentSummary);
    } catch (err: any) {
      if (err.status === 403 && err.data?.status === 'restricted') {
        setActiveRestriction(err.data);
        setIsUpgradeModalOpen(true);
        return;
      }
      alert("Failed to analyze sentiment: " + err.message);
    } finally {
      setIsSentimentAnalyzing(false);
    }
  };

  // Helper calculations for analytics
  const totalResponses = responses.length;
  const avgCompletionTime = totalResponses > 0 
    ? Math.round(responses.reduce((acc, r) => acc + (r.timeTaken || 0), 0) / totalResponses)
    : 0;

  const formatCompletionTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // Advanced Sharing Links
  const shareCode = store.uniqueShareId || formId;
  const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/f/${shareCode}` : '';
  const embedCodeSnippet = `<iframe src="${publicLink}" width="100%" height="700px" frameborder="0"></iframe>`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicLink)}`;

  const handleDownloadQRCode = async () => {
    try {
      const res = await fetch(qrCodeUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-qr-${formId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to download QR code.");
    }
  };

  // Sentiment Insights calculations (Good vs Bad reviews)
  let goodReviewsCount = 0;
  let badReviewsCount = 0;

  responses.forEach(r => {
    const answersMap = r.answers || {};
    store.questions.forEach(q => {
      const val = answersMap[q.id];
      if (val === undefined || val === null) return;
      
      if (q.type === 'rating') {
        const ratingNum = Number(val);
        if (ratingNum >= 4) goodReviewsCount++;
        if (ratingNum <= 2) badReviewsCount++;
      } else if (q.type === 'mcq') {
        const strVal = String(val).toLowerCase();
        if (['very satisfied', 'satisfied', 'yes', 'yes, fully'].includes(strVal)) {
          goodReviewsCount++;
        }
        if (['unsatisfied', 'no', 'no, lost'].includes(strVal)) {
          badReviewsCount++;
        }
      }
    });
  });

  const totalReviewsEvaluated = goodReviewsCount + badReviewsCount;
  const goodReviewsPct = totalReviewsEvaluated > 0 ? Math.round((goodReviewsCount / totalReviewsEvaluated) * 100) : 80;
  const badReviewsPct = totalReviewsEvaluated > 0 ? (100 - goodReviewsPct) : 20;

  // Chart data: Star Ratings distribution
  const ratingQuestion = store.questions.find(q => q.type === 'rating');
  const ratingDistribution = [0, 0, 0, 0, 0]; // 1, 2, 3, 4, 5 stars
  if (ratingQuestion) {
    responses.forEach(r => {
      const val = r.answers?.[ratingQuestion.id];
      if (val !== undefined && val !== null) {
        const star = Math.round(Number(val));
        if (star >= 1 && star <= 5) {
          ratingDistribution[star - 1]++;
        }
      }
    });
  }

  // Chart data: MCQ distribution
  const mcqQuestions = store.questions.filter(q => q.type === 'mcq');

  // Custom Live theme calculations based on Right Panel settings
  const selectedFontKey = store.theme.font_family || 'Inter';
  const resolvedFontFamily = FONT_FAMILY_MAP[selectedFontKey] || `${selectedFontKey}, sans-serif`;
  const canvasThemeStyle = {
    '--accent-color': store.theme.primary_color || '#8B6B55',
    '--border-radius': store.theme.border_radius || '24px',
    '--card-padding': store.theme.rtl ? '24px' : '28px',
    '--font-style': selectedFontKey,
    fontFamily: resolvedFontFamily,
  } as React.CSSProperties;

  // Quiz Stats compilation
  let quizCount = 0;
  let totalScoreEarned = 0;
  let totalScorePossible = 0;
  let highestScore = 0;

  const hasQuiz = store.questions.some(q => q.validations?.correct_answer);

  if (hasQuiz) {
    responses.forEach(r => {
      let earned = 0;
      let possible = 0;
      store.questions.forEach(q => {
        const isGraded = ['short_text', 'mcq', 'dropdown', 'checkbox'].includes(q.type) && q.validations?.correct_answer;
        const pts = q.validations?.points ?? 0;
        if (isGraded) {
          possible += pts;
          const studentAns = r.answers?.[q.id];
          if (studentAns !== undefined && studentAns !== null) {
            if (String(studentAns).trim().toLowerCase() === String(q.validations.correct_answer).trim().toLowerCase()) {
              earned += pts;
            }
          }
        }
      });
      totalScoreEarned += earned;
      totalScorePossible += possible;
      if (earned > highestScore) {
        highestScore = earned;
      }
      quizCount++;
    });
  }

  const avgScore = quizCount > 0 && totalScorePossible > 0
    ? Math.round((totalScoreEarned / quizCount) * 10) / 10
    : 0;
  const avgPct = totalScorePossible > 0 ? Math.round((totalScoreEarned / (quizCount * totalScorePossible)) * 100) : 0;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark ' : ''}bg-background text-foreground flex flex-col h-screen overflow-hidden transition-all duration-200 font-sans`}>
      
      {/* 1. TOP STICKY NAVIGATION (72px) */}
      <header className="h-[72px] w-full sticky top-0 z-50 bg-card/95 dark:bg-background/95 backdrop-blur-md border-b border-border dark:border-border flex items-center justify-between px-6 select-none flex-shrink-0">
        
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push('/dashboard/ai')}
            className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground dark:hover:text-zinc-200 transition-all border-none bg-transparent cursor-pointer"
            title="Back to AI Form Generator"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="h-6 w-[1px] bg-zinc-200 dark:bg-card" />
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold tracking-wider text-primary uppercase select-none">PROMPTFORM AI</span>
            <span className="text-xs px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-zinc-200 dark:bg-card text-zinc-700 dark:text-muted-foreground border border-border dark:border-border select-none">v2.1</span>
            
            <div className="flex items-center space-x-1.5 ml-2">
              <input
                type="text"
                value={store.title}
                onChange={(e) => store.updateFormFields({ title: e.target.value })}
                className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus-visible:outline-none focus:ring-0 px-1 py-0.5 text-foreground transition-all w-48"
              />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                store.status === 'PUBLISHED' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-404' : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-404'
              }`}>
                {store.status}
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Undo/Redo & Viewport Simulator */}
        <div className="hidden lg:flex items-center space-x-4">
          {/* Undo / Redo */}
          <div className="flex items-center bg-accent dark:bg-background/60 rounded-lg p-1.5 border border-border dark:border-border/60">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-lg text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-zinc-100 disabled:opacity-30 transition-colors border-none bg-transparent cursor-pointer"
              title="Undo Action"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-zinc-100 disabled:opacity-30 transition-colors border-none bg-transparent cursor-pointer"
              title="Redo Action"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Viewport controls */}
          <div className="flex items-center bg-accent dark:bg-background/60 rounded-lg p-1.5 border border-border dark:border-border/60">
            <button
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${viewport === "desktop" ? "text-primary bg-card dark:bg-card font-bold" : "text-muted-foreground"}`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${viewport === "tablet" ? "text-primary bg-card dark:bg-card font-bold" : "text-muted-foreground"}`}
              title="Tablet View"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${viewport === "mobile" ? "text-primary bg-card dark:bg-card font-bold" : "text-muted-foreground"}`}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-1.5 text-xs text-zinc-605 dark:text-muted-foreground font-bold">
            <RefreshCw className={`w-4 h-4 ${store.isSaving ? 'animate-spin text-primary' : ''}`} />
            <span>{store.isSaving ? 'Autosaving...' : 'Saved to Cloud'}</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-zinc-100 transition-colors border-none bg-transparent cursor-pointer"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-zinc-305" /> : <Moon className="w-5 h-5 text-zinc-700" />}
            </button>
            <button className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-zinc-100 transition-colors border-none bg-transparent cursor-pointer relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-zinc-200 dark:bg-card" />

          {/* Quick Preview, Share, Publish */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(`/view/${formId}?preview=true`, '_blank')} 
              className="h-9 px-3.5 rounded-lg border border-border dark:border-border hover:bg-accent dark:hover:bg-zinc-800 text-xs font-semibold text-foreground dark:text-zinc-200"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              <span>Preview</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsShareModalOpen(true)} 
              className="h-9 px-3.5 rounded-lg border border-border dark:border-border hover:bg-accent dark:hover:bg-zinc-800 text-xs font-semibold text-foreground dark:text-zinc-200"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              <span>Share</span>
            </Button>

            <button 
              onClick={handlePublishToggle} 
              disabled={isPublishing}
              className={`h-9 px-4 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center ${
                store.status === 'PUBLISHED' 
                  ? 'bg-destructive hover:bg-rose-700 text-white shadow-md' 
                  : 'bg-primary hover:opacity-90 text-primary-foreground shadow-md'
              }`}
            >
              {isPublishing ? 'Updating...' : store.status === 'PUBLISHED' ? 'Close Form' : 'Publish'}
            </button>
          </div>

          <div className="h-6 w-[1px] bg-zinc-200 dark:bg-card" />

          {/* User Profile */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 select-none">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-xs font-semibold text-white">PF</div>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Navigation Tabs (Edit Form vs Analytics View) */}
      <div className="bg-card dark:bg-background border-b border-border dark:border-border px-6 py-2 flex items-center justify-between flex-shrink-0 select-none">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveMode("edit")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMode === "edit"
                ? "bg-primary text-white shadow-md shadow-md"
                : "text-muted-foreground hover:text-foreground dark:hover:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-800"
            }`}
          >
            Form Editor
          </button>
          <button
            onClick={() => setActiveMode("analytics")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMode === "analytics"
                ? "bg-primary text-white shadow-md shadow-md"
                : "text-muted-foreground hover:text-foreground dark:hover:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-800"
            }`}
          >
            Dashboard & Analytics
          </button>
        </div>
        
        {activeMode === "analytics" && (
          <Button 
            size="sm" 
            onClick={handleExportCSV} 
            className="space-x-1.5 text-xs bg-primary hover:opacity-90 text-primary-foreground shadow-md rounded-lg h-8 px-3.5 border-none cursor-pointer font-bold"
          >
            <span>Export CSV Report</span>
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Mobile view Tab Selectors */}
      {activeMode === "edit" && (
        <div className="lg:hidden bg-card dark:bg-background border-b border-border dark:border-border px-4 py-2.5 flex justify-around flex-shrink-0 select-none">
          {[
            { id: 'fields', label: 'Insert & AI' },
            { id: 'canvas', label: 'Canvas' },
            { id: 'settings', label: 'Settings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mobileTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* CORE WORKSPACE CONTENT */}
      {activeMode === "edit" ? (
        
        /* EDIT WORKSPACE: 3-pane layout */
        <div className="flex-1 flex overflow-hidden font-sans">
          
          {/* LEFT SIDEBAR: Width 340px */}
          <aside className={`w-full lg:w-[340px] border-r border-border dark:border-border bg-card dark:bg-background p-4 space-y-6 overflow-y-auto flex-shrink-0 ${
            mobileTab === 'fields' ? 'block' : 'hidden lg:block'
          }`}>
            
            {/* Profile & Contact Details Fields */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Profile & Contact</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { type: "name", label: "Full Name", desc: "Short text for full name replies", icon: User, color: "text-blue-600 bg-blue-50 dark:bg-blue-955/40" },
                  { type: "email", label: "Email Address", desc: "Validated email input field", icon: Mail, color: "text-indigo-650 bg-indigo-50 dark:bg-indigo-900/40" },
                  { type: "phone", label: "Phone Number", desc: "Telephone contact number field", icon: Phone, color: "text-teal-600 bg-teal-50 dark:bg-teal-955/40" },
                  { type: "address", label: "Address Block", desc: "Postal and street address details", icon: MapPin, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40" },
                  { type: "country", label: "Country Dropdown", desc: "Country selection dropdown select", icon: Globe, color: "text-violet-605 bg-violet-50 dark:bg-violet-900/40" }
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => handleAddField(item.type)}
                    className="w-full p-3 rounded-2xl border border-border dark:border-border bg-card hover:bg-muted dark:bg-background/60 dark:hover:bg-zinc-950 text-left flex items-start space-x-3.5 transition-all hover:scale-[1.01] hover:border-primary/50 cursor-pointer shadow-sm"
                  >
                    <span className={`p-2 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <item.icon className="w-5 h-5" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground dark:text-zinc-100">{item.label}</p>
                      <p className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground leading-tight">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Choices & Options */}
            <div className="space-y-4 border-t border-border dark:border-border pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Choices & Options</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { type: "gender", label: "Gender Radios", desc: "Male / Female / Other gender selection", icon: User, color: "text-amber-600 bg-amber-50 dark:bg-amber-955/40" },
                  { type: "multiple_options", label: "Checkboxes (Multiple)", desc: "Tick multiple checkbox options list", icon: CheckSquare, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40" },
                  { type: "one_option", label: "Radio Buttons (One)", desc: "Choose one single option out of radios", icon: LayoutGrid, color: "text-blue-600 bg-blue-50 dark:bg-blue-955/40" },
                  { type: "agreement", label: "Agreement T&C", desc: "Single checkbox terms validate button", icon: CheckSquare, color: "text-primary bg-indigo-50 dark:bg-indigo-900/40" }
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => handleAddField(item.type)}
                    className="w-full p-3 rounded-2xl border border-border dark:border-border bg-card hover:bg-muted dark:bg-background/60 dark:hover:bg-zinc-950 text-left flex items-start space-x-3.5 transition-all hover:scale-[1.01] hover:border-primary/50 cursor-pointer shadow-sm"
                  >
                    <span className={`p-2 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <item.icon className="w-5 h-5" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground dark:text-zinc-100">{item.label}</p>
                      <p className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground leading-tight">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback & Scores */}
            <div className="space-y-4 border-t border-border dark:border-border pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Feedback & Scores</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { type: "rating", label: "Star Rating bar", desc: "Interactive customer satisfaction stars", icon: Star, color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-955/40" },
                  { type: "feedback", label: "Paragraph Feedback", desc: "Multi-line customer suggestions textarea", icon: FileText, color: "text-rose-605 bg-rose-50 dark:bg-rose-900/40" }
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => handleAddField(item.type)}
                    className="w-full p-3 rounded-2xl border border-border dark:border-border bg-card hover:bg-muted dark:bg-background/60 dark:hover:bg-zinc-950 text-left flex items-start space-x-3.5 transition-all hover:scale-[1.01] hover:border-primary/50 cursor-pointer shadow-sm"
                  >
                    <span className={`p-2 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <item.icon className="w-5 h-5" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground dark:text-zinc-100">{item.label}</p>
                      <p className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground leading-tight">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Draggable advanced fields catalog */}
            <div className="space-y-4 border-t border-border dark:border-border pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Advanced Inputs</h3>
              <div className="grid grid-cols-1 gap-2.5 animate-fadeIn">
                {[
                  { type: "signature", label: "Signature Pad", desc: "Interactive hand-drawn signatures area", icon: Signature, color: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-955/40" },
                  { type: "date", label: "Date Picker", desc: "Standard calendar date selection grid", icon: Calendar, color: "text-sky-600 bg-sky-50 dark:bg-sky-955/40" },
                  { type: "time", label: "Time Picker", desc: "Select hours and minutes constraints", icon: Clock, color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-955/40" },
                  { type: "resume", label: "Resume Upload", desc: "Upload PDF or DOC resume files", icon: FileUp, color: "text-destructive bg-rose-50 dark:bg-rose-900/40" },
                  { type: "photo", label: "Photo Upload", desc: "Upload and preview photographic pictures", icon: Image, color: "text-teal-600 bg-teal-50 dark:bg-teal-955/40" },
                  { type: "amount", label: "Amount Input", desc: "Numerical response box field", icon: Hash, color: "text-blue-600 bg-blue-50 dark:bg-blue-955/40" },
                  { type: "price", label: "Price / Currency", desc: "Formatted price cash input field", icon: DollarSign, color: "text-green-600 bg-green-50 dark:bg-green-955/40" },
                  { type: "website", label: "Website URL", desc: "Uniform Resource Locator web address", icon: Link, color: "text-violet-605 bg-violet-50 dark:bg-violet-900/40" },
                  { type: "password", label: "Password Field", desc: "Secure input with hide/show control", icon: Lock, color: "text-muted-foreground bg-accent dark:bg-card/40" },
                  { type: "color", label: "Color Picker", desc: "Interactive visual color canvas block", icon: Palette, color: "text-pink-605 bg-pink-50 dark:bg-pink-955/40" },
                  { type: "location", label: "Map Picker", desc: "Visual map pin and coordinate selector", icon: MapPin, color: "text-destructive bg-red-50 dark:bg-red-955/40" },
                  { type: "otp", label: "OTP Field", desc: "6-box passcode input digit template", icon: Hash, color: "text-indigo-650 bg-indigo-50 dark:bg-indigo-900/40" }
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => handleAddField(item.type)}
                    className="w-full p-3 rounded-xl border border-border dark:border-border bg-card hover:bg-muted dark:bg-background/60 dark:hover:bg-zinc-950 text-left flex items-start space-x-3.5 transition-all hover:scale-[1.01] hover:border-primary/50 cursor-pointer shadow-sm"
                  >
                    <span className={`p-2 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <item.icon className="w-5 h-5" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground dark:text-zinc-100">{item.label}</p>
                      <p className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground leading-tight">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Presets template blocks */}
            <div className="space-y-4 border-t border-border dark:border-border pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Layout templates</h3>
              <div className="space-y-2">
                {[
                  { id: "customer_review", label: "Customer Experience Review" },
                  { id: "product_feedback", label: "Product Feedback Form" },
                  { id: "event_registration", label: "Event registrations" },
                  { id: "contact_form", label: "Secure Contact block" }
                ].map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleLoadTemplate(tmpl.id)}
                    className="w-full px-3.5 py-3 bg-muted dark:bg-background/60 border border-border dark:border-border hover:border-primary/50 dark:hover:border-primary/50 hover:bg-card dark:hover:bg-zinc-950 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all select-none cursor-pointer text-foreground dark:text-zinc-100"
                  >
                    <span>{tmpl.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

          </aside>

          {/* CENTER CANVAS: Working space (max-width 900px, responsive simulator) */}
          <main 
            ref={canvasContainerRef}
            className={`flex-1 bg-muted dark:bg-background p-6 overflow-y-auto flex flex-col items-center canvas-grid relative ${
              mobileTab === 'canvas' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Ambient blur mesh blobs in the background */}
            <div className="bg-ambient-glow top-1/4 left-1/4" style={{ '--primary-color': store.theme.primary_color || '#6366f1' } as React.CSSProperties} />
            <div className="noise-texture" />

            {/* Viewport size simulator container */}
            <div 
              style={canvasThemeStyle}
              className={`w-full transition-all duration-200 relative z-10 flex flex-col items-center form-font-inherit ${
                viewport === 'mobile' ? 'max-w-[375px] border border-border dark:border-border rounded-2xl p-4 bg-muted dark:bg-background shadow-sm mt-4 pb-16' : 
                viewport === 'tablet' ? 'max-w-[768px] border border-border dark:border-border rounded-2xl p-6 bg-muted dark:bg-background shadow-sm mt-4 pb-16' : 
                'max-w-[900px] pb-16'
              }`}
            >
              
              <div 
                dir={store.theme?.rtl ? "rtl" : "ltr"}
                className={`w-full space-y-6 ${store.theme?.rtl ? "text-right" : "text-left"}`}
              >
                
                {/* Form Title & Description Header Card */}
                <div style={{ borderRadius: store.theme.border_radius || '24px' }} className="border border-border dark:border-border bg-card dark:bg-background backdrop-blur-md overflow-hidden shadow-sm p-6 space-y-4 select-none relative hover:border-primary/40 transition-all">
                  {typeof store.theme.banner_url === 'string' && store.theme.banner_url.startsWith('http') ? (
                    <div className="-mx-6 -mt-6 mb-4 h-28 overflow-hidden relative border-b border-border dark:border-border flex-shrink-0">
                      <img 
                        src={store.theme.banner_url} 
                        alt="Form Banner" 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                      <div className="absolute bottom-0 left-0 w-full h-[6px]" style={{ backgroundColor: store.theme.primary_color }} />
                    </div>
                  ) : (
                    <div className="absolute top-0 left-0 w-full h-[6px]" style={{ backgroundColor: store.theme.primary_color }} />
                  )}
                  
                  <input
                    type="text"
                    value={store.title}
                    onChange={(e) => store.updateFormFields({ title: e.target.value })}
                    placeholder="Form title..."
                    className="w-full text-2xl font-bold bg-transparent focus-visible:outline-none focus-visible:ring-0 border-b border-transparent focus:border-primary/40 pb-1 text-foreground"
                  />
                  
                  <textarea
                    value={store.description}
                    onChange={(e) => store.updateFormFields({ description: e.target.value })}
                    placeholder="Provide a detailed description of this questionnaire..."
                    className="w-full text-sm font-bold text-muted-foreground bg-transparent focus-visible:outline-none focus-visible:ring-0 border-b border-transparent focus:border-primary/40 pb-1 resize-none h-14"
                  />
                </div>

                {/* Main Dynamic Canvas Content */}
                {store.questions.length === 0 ? (
                  
                  /* EMPTY STATE WORKSPACE CARDS */
                  <div className="text-center py-16 px-8 bg-card dark:bg-background backdrop-blur-md border border-dashed rounded-2xl border-border dark:border-border shadow-sm flex flex-col items-center select-none">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 border border-primary/20 shadow-sm animate-aiWander">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <h4 className="font-semibold text-zinc-950 dark:text-zinc-100 text-lg">Build your form outline</h4>
                    <p className="text-sm font-bold text-zinc-700 dark:text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
                      Select preset element templates, drag builder fields from the left catalog, or type custom instructions in our Co-Pilot terminal.
                    </p>
                    
                    {/* Visual cards quick action catalog */}
                    <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-md">
                      <button 
                        onClick={() => handleLoadTemplate("customer_review")}
                        className="p-4 bg-card dark:bg-background hover:bg-background dark:hover:bg-zinc-800 border border-border dark:border-border rounded-xl text-left hover:scale-[1.01] hover:shadow-sm transition-all cursor-pointer shadow-sm"
                      >
                        <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-primary flex items-center justify-center w-fit mb-3"><Sparkles className="w-5 h-5" /></span>
                        <p className="text-xs font-semibold text-foreground dark:text-zinc-100">Customer feedback</p>
                        <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground mt-1 leading-tight">Generate typical reviews fields instantly</p>
                      </button>

                      <button 
                        onClick={() => handleLoadTemplate("product_feedback")}
                        className="p-4 bg-card dark:bg-background hover:bg-background dark:hover:bg-zinc-800 border border-border dark:border-border rounded-xl text-left hover:scale-[1.01] hover:shadow-sm transition-all cursor-pointer shadow-sm"
                      >
                        <span className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center w-fit mb-3"><ListPlus className="w-5 h-5" /></span>
                        <p className="text-xs font-semibold text-foreground dark:text-zinc-100">Product Review</p>
                        <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground mt-1 leading-tight">Dropdowns, ratings and paragraph</p>
                      </button>

                      <button 
                        onClick={() => handleLoadTemplate("event_registration")}
                        className="p-4 bg-card dark:bg-background hover:bg-background dark:hover:bg-zinc-800 border border-border dark:border-border rounded-xl text-left hover:scale-[1.01] hover:shadow-sm transition-all cursor-pointer shadow-sm"
                      >
                        <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center w-fit mb-3"><Calendar className="w-5 h-5" /></span>
                        <p className="text-xs font-semibold text-foreground dark:text-zinc-100">Event signup</p>
                        <p className="text-xs font-bold text-muted-foreground dark:text-zinc-400 mt-1 leading-tight">Short answers, emails, check items</p>
                      </button>

                      <button 
                        onClick={() => handleLoadTemplate("blank_form")}
                        className="p-4 bg-card dark:bg-background hover:bg-background dark:hover:bg-zinc-800 border border-border dark:border-border rounded-xl text-left hover:scale-[1.01] hover:shadow-sm transition-all cursor-pointer shadow-sm"
                      >
                        <span className="p-2 rounded-lg bg-zinc-200 dark:bg-card text-zinc-700 flex items-center justify-center w-fit mb-3"><FileText className="w-5 h-5" /></span>
                        <p className="text-xs font-semibold text-foreground dark:text-zinc-100">Start blank canvas</p>
                        <p className="text-xs font-bold text-muted-foreground dark:text-zinc-400 mt-1 leading-tight">Build questions list manually</p>
                      </button>
                    </div>

                  </div>
                ) : (
                  
                  /* CANVAS QUESTIONS RENDER */
                  <div className="space-y-4 select-none pb-20">
                    {store.questions.map((q, idx) => {
                      const isActive = q.id === selectedQuestionId;
                      const isDragOver = idx === dragOverIndex;
                      const isDragging = idx === draggedIndex;

                      return (
                        <React.Fragment key={q.id}>
                          {/* Insertion Drag spacing guide line */}
                          {isDragOver && dropPosition === 'top' && (
                            <div className="h-10 w-full border border-dashed border-primary/50 bg-primary/5 rounded-xl flex items-center justify-center text-xs text-primary font-semibold animate-pulse my-2">
                              Insert Element Here
                            </div>
                          )}

                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, idx)}
                            onClick={() => setSelectedQuestionId(q.id)}
                            style={{ borderRadius: store.theme.border_radius || '24px' }}
                            className={`transition-all duration-200 border p-6 space-y-4 relative group ${
                              isDragging ? 'opacity-35 scale-95 border-dashed border-primary' : ''
                            } ${
                              (store.theme as any)?.theme_name === 'slate-dark' 
                                ? 'bg-background border-border text-foreground'
                                : (store.theme as any)?.theme_name === 'teal-medical'
                                ? 'bg-card border-border border-t-4 border-t-emerald-600'
                                : (store.theme as any)?.theme_name === 'amber-warm'
                                ? 'bg-card border-border border-t-4 border-t-amber-600'
                                : 'bg-card dark:bg-background border-border dark:border-border/80'
                            } ${
                              isActive 
                                ? 'border-primary shadow-lg z-10' 
                                : 'hover:border-primary/50 shadow-sm'
                            }`}
                          >
                            
                            {/* Floating Toolbar on hover / active */}
                            {isActive && (
                              <div className="absolute -top-3.5 right-6 flex items-center bg-card dark:bg-card border border-border dark:border-border rounded-full px-3.5 py-2 shadow-sm space-x-2.5 z-10 animate-fadeIn text-xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateQuestion(q);
                                  }}
                                  className="p-1 hover:bg-accent dark:hover:bg-zinc-700 text-muted-foreground hover:text-indigo-605 rounded transition-colors border-none bg-transparent cursor-pointer"
                                  title="Duplicate Field"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteQuestion(q.id);
                                  }}
                                  className="p-1 hover:bg-zinc-105 dark:hover:bg-zinc-700 text-muted-foreground hover:text-rose-500 rounded transition-colors border-none bg-transparent cursor-pointer"
                                  title="Delete Field"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAccordion('logic');
                                    setMobileTab('settings');
                                  }}
                                  className="p-1 hover:bg-zinc-105 dark:hover:bg-zinc-700 text-muted-foreground hover:text-indigo-605 rounded transition-colors border-none bg-transparent cursor-pointer"
                                  title="Configure Logic Rules"
                                >
                                  <GitFork className="w-4 h-4" />
                                </button>
                                <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700" />
                                <span className="text-xs font-semibold uppercase text-indigo-650 dark:text-indigo-404 select-none pr-1">Q{idx + 1}</span>
                              </div>
                            )}

                            {/* Top info and Drag handle indicators */}
                            <div className="flex justify-between items-center text-xs text-muted-foreground dark:text-muted-foreground font-bold uppercase tracking-widest select-none">
                              <div className="flex items-center space-x-1.5">
                                <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-all">
                                  <GripVertical className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                </div>
                                <span>Question {idx + 1}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="bg-accent dark:bg-card px-2 py-0.5 rounded-md text-zinc-700 dark:text-muted-foreground text-xs font-semibold">{q.type.replace('_', ' ')}</span>
                                {isActive && (
                                  <div className="flex items-center bg-accent dark:bg-card border border-border dark:border-border rounded-lg">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        saveStateForUndo(store.questions);
                                        store.reorderQuestions(idx, idx - 1);
                                        setSelectedQuestionId(store.questions[idx - 1].id);
                                      }}
                                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 rounded-l-lg transition-colors border-none bg-transparent cursor-pointer"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === store.questions.length - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        saveStateForUndo(store.questions);
                                        store.reorderQuestions(idx, idx + 1);
                                        setSelectedQuestionId(store.questions[idx + 1].id);
                                      }}
                                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 rounded-r-lg transition-colors border-l border-border dark:border-border bg-transparent cursor-pointer"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Label display */}
                            <p className="text-sm font-semibold text-foreground dark:text-zinc-100 flex items-center">
                              <span>{q.label}</span>
                              {q.required && <span className="text-destructive font-bold ml-1.5">*</span>}
                            </p>

                            {/* Dynamic input preview placeholders inside canvas */}
                            <div className="w-full pt-1.5">
                               {(['short_text', 'text', 'name', 'first_name', 'last_name', 'full_name', 'email', 'email_address', 'phone', 'contact', 'mobile', 'telephone', 'website', 'url', 'password', 'amount', 'price', 'number', 'age', 'quantity', 'count'].includes(q.type)) && (
                                 <div className="relative flex items-center w-full max-w-md border-b border-border dark:border-border pb-2 text-xs text-muted-foreground dark:text-muted-foreground font-semibold select-none">
                                   {q.type === 'email' && <Mail className="w-4 h-4 mr-2 text-zinc-405" />}
                                   {q.type === 'phone' && <Phone className="w-4 h-4 mr-2 text-zinc-450" />}
                                   {q.type === 'name' && <User className="w-4 h-4 mr-2 text-zinc-450" />}
                                   {q.type === 'website' && <Link className="w-4 h-4 mr-2 text-zinc-450" />}
                                   {q.type === 'password' && <Lock className="w-4 h-4 mr-2 text-zinc-450" />}
                                   {q.type === 'price' && <DollarSign className="w-4 h-4 mr-2 text-zinc-450" />}
                                   {q.type === 'amount' && <Hash className="w-4 h-4 mr-2 text-zinc-450" />}
                                   <span>
                                     {q.type === 'email' && "e.g. respondent@example.com"}
                                     {q.type === 'phone' && "e.g. +1 (555) 000-0000"}
                                     {q.type === 'name' && "e.g. John Doe"}
                                     {q.type === 'website' && "e.g. https://portfolio.com"}
                                     {q.type === 'password' && "••••••••"}
                                     {q.type === 'price' && "e.g. $ 0.00"}
                                     {q.type === 'amount' && "e.g. 100"}
                                     {q.type === 'short_text' && "Respondent short text answer..."}
                                   </span>
                                   {q.type === 'password' && <Eye className="w-4 h-4 ml-auto text-zinc-450" />}
                                 </div>
                               )}
                               {(['long_text', 'feedback', 'address', 'paragraph', 'textarea', 'comments', 'description', 'message'].includes(q.type)) && (
                                 <div className="w-full border border-border dark:border-border rounded-lg p-3 text-xs text-muted-foreground dark:text-muted-foreground font-semibold h-16 bg-muted/20 dark:bg-background/25 select-none">
                                   {q.type === 'address' ? "Street address, Apt, Suite, City, State, ZIP..." : "Write long-form message or feedback..."}
                                 </div>
                               )}
                               {['mcq', 'checkbox', 'dropdown', 'gender', 'multiple_options', 'one_option', 'country', 'agreement', 'radio', 'single_choice', 'multi_choice', 'checkboxes', 'select', 'consent'].includes(q.type) && (
                                 <div className="pl-2">
                                   {q.type === 'dropdown' || q.type === 'country' ? (
                                     <div className="flex items-center justify-between w-full max-w-xs px-3 py-2 border border-border dark:border-border rounded-lg text-xs text-muted-foreground font-bold bg-muted/50 dark:bg-background/30">
                                       <span>{q.options.length > 0 ? q.options[0] : "Select option..."}</span>
                                       <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                     </div>
                                   ) : q.type === 'agreement' ? (
                                     <div className="flex items-start space-x-2.5 text-xs font-semibold text-zinc-700 dark:text-muted-foreground">
                                       <div className="w-4 h-4 rounded border border-border dark:border-border bg-card dark:bg-background mt-0.5 flex-shrink-0 animate-pulse" />
                                       <span>{q.options[0] || "I agree to the terms and conditions"}</span>
                                     </div>
                                   ) : (
                                     <div className={q.option_layout === 'horizontal' ? "flex flex-wrap gap-2.5 items-center pt-1" : "space-y-2"}>
                                       {(q.options.length > 0 ? q.options : ['Option 1', 'Option 2']).map((opt: string, optIdx: number) => (
                                         <div key={optIdx} className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border/70 bg-card/80 dark:bg-background/40 transition-all ${q.option_layout === 'horizontal' ? 'shadow-sm hover:border-primary/50' : ''}`}>
                                           {['checkbox', 'multiple_options'].includes(q.type) ? (
                                             <div className="w-3.5 h-3.5 rounded border border-primary/60 bg-primary/10 flex-shrink-0 flex items-center justify-center">
                                               <div className="w-1.5 h-1.5 bg-primary rounded-sm" />
                                             </div>
                                           ) : (
                                             <div className="w-3.5 h-3.5 rounded-full border border-primary/60 bg-primary/10 flex-shrink-0 flex items-center justify-center">
                                               <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                             </div>
                                           )}
                                           <span className="text-foreground dark:text-zinc-200">{opt}</span>
                                         </div>
                                       ))}
                                     </div>
                                   )}
                                 </div>
                               )}
                               {(['emoji-satisfaction-scale', 'emoji', 'satisfaction', 'mood', 'satisfaction_emoji'].includes(q.type)) && (
                                 <div className="grid grid-cols-5 gap-2 items-center pt-1.5 w-full max-w-lg select-none">
                                   {(q.options && q.options.length > 0 ? q.options : ["🤩 Very Satisfied", "😋 Satisfied", "😐 Neutral", "🙁 Unsatisfied", "🤮 Very Poor"]).map((emojiOpt: string, eIdx: number) => {
                                     const parts = emojiOpt.split(' ');
                                     const icon = parts[0];
                                     const text = parts.slice(1).join(' ');
                                     return (
                                       <div
                                         key={eIdx}
                                         className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/80 bg-card/80 dark:bg-background/40 hover:border-primary/50 text-center transition-all cursor-pointer shadow-xs"
                                       >
                                         <span className="text-xl mb-0.5">{icon}</span>
                                         {text && <span className="text-[10px] font-bold text-muted-foreground truncate w-full">{text}</span>}
                                       </div>
                                     );
                                   })}
                                 </div>
                               )}
                               {(['yes_no', 'boolean', 'toggle'].includes(q.type)) && (
                                 <div className="flex items-center space-x-3 pt-1 select-none">
                                   {["👍 Yes", "👎 No"].map((opt, oIdx) => (
                                     <div key={oIdx} className="px-4 py-2 rounded-xl border border-border/80 bg-card/80 dark:bg-background/40 font-bold text-xs flex items-center space-x-2 text-foreground dark:text-zinc-200">
                                       <span>{opt}</span>
                                     </div>
                                   ))}
                                 </div>
                               )}
                               {(q.type === 'rating' || q.type === 'star_rating' || q.type === 'star-rating') && (
                                 <div className="flex space-x-2 py-1 select-none">
                                   {[1, 2, 3, 4, 5].map(star => (
                                     <span key={star} className="w-9 h-9 rounded-lg bg-accent dark:bg-card border border-border dark:border-border flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-muted-foreground hover:border-primary hover:text-primary transition-all">{star}</span>
                                   ))}
                                 </div>
                               )}
                               {q.type === 'signature' && (
                                 <div className="text-xs font-bold text-zinc-700 dark:text-muted-foreground flex items-center space-x-2 bg-muted dark:bg-background/30 p-2.5 rounded-lg border border-dashed border-border dark:border-border select-none max-w-sm">
                                   <Signature className="w-5 h-5 text-primary dark:text-indigo-400" />
                                   <span>Responder interactive signature pad area</span>
                                 </div>
                               )}
                               {(q.type === 'file_upload' || q.type === 'resume') && (
                                 <div className="text-xs font-bold text-zinc-700 dark:text-muted-foreground flex items-center space-x-2 bg-muted dark:bg-background/30 p-2.5 rounded-lg border border-dashed border-border dark:border-border select-none max-w-sm">
                                   <FileUp className="w-5 h-5 text-primary dark:text-indigo-404" />
                                   <span>{q.type === 'resume' ? "Upload resume (PDF, Word doc up to 10MB)" : "Upload file attachment (Max size 10MB)"}</span>
                                 </div>
                               )}
                               {q.type === 'photo' && (
                                 <div className="flex flex-col items-center justify-center border border-dashed border-border dark:border-border rounded-lg p-4 bg-muted/50 dark:bg-background/30 text-center select-none max-w-xs">
                                   <Image className="w-8 h-8 text-indigo-605 mb-1.5 animate-pulse" />
                                   <span className="text-xs font-bold text-zinc-700 dark:text-muted-foreground">Upload photograph image</span>
                                 </div>
                               )}
                               {(['date', 'dob', 'birthday', 'date_of_birth', 'birth_date'].includes(q.type)) && (
                                 <div className="text-xs font-bold text-zinc-700 dark:text-muted-foreground flex items-center space-x-2 bg-muted dark:bg-background/30 p-2.5 rounded-lg border border-dashed border-border dark:border-border select-none max-w-xs">
                                   <Calendar className="w-5 h-5 text-primary dark:text-indigo-400" />
                                   <span>MM / DD / YYYY</span>
                                 </div>
                               )}
                               {(['time', 'appointment_time'].includes(q.type)) && (
                                 <div className="text-xs font-bold text-zinc-700 dark:text-muted-foreground flex items-center space-x-2 bg-muted dark:bg-background/30 p-2.5 rounded-lg border border-dashed border-border dark:border-border select-none max-w-xs">
                                   <Clock className="w-5 h-5 text-primary dark:text-indigo-400" />
                                   <span>HH : MM AM/PM</span>
                                 </div>
                               )}
                               {q.type === 'color' && (
                                 <div className="flex items-center space-x-2 py-1">
                                   {['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'].map(colorVal => (
                                     <div key={colorVal} className="w-6 h-6 rounded-full border border-white shadow-sm cursor-pointer" style={{ backgroundColor: colorVal }} />
                                   ))}
                                   <div className="w-6 h-6 rounded-full border border-dashed border-zinc-400 flex items-center justify-center cursor-pointer text-xs font-bold text-muted-foreground bg-muted/50">+</div>
                                 </div>
                               )}
                               {(['location', 'location-selector', 'map'].includes(q.type)) && (
                                 <div className="border border-border dark:border-border rounded-lg p-3.5 bg-muted/50 dark:bg-background/20 max-w-md select-none">
                                   <div className="flex items-center space-x-2 border border-border dark:border-border rounded-lg px-2.5 py-1.5 bg-card dark:bg-background mb-2 text-xs text-muted-foreground">
                                     <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                     <span>Search address or coordinates...</span>
                                   </div>
                                   <div className="w-full h-20 bg-zinc-200 dark:bg-card rounded-lg flex items-center justify-center text-xs text-muted-foreground border border-border dark:border-border font-bold">
                                     [ Interactive Map Picker ]
                                   </div>
                                 </div>
                               )}
                               {q.type === 'otp' && (
                                 <div className="flex space-x-2 py-1 select-none animate-pulse">
                                   {[1, 2, 3, 4, 5, 6].map(boxIdx => (
                                     <div key={boxIdx} className="w-9 h-11 border border-border dark:border-border rounded-lg bg-muted/50 dark:bg-background/20 flex items-center justify-center text-xs font-bold text-muted-foreground">-</div>
                                   ))}
                                 </div>
                               )}
                               {q.type === 'payment' && (
                                 <div className="text-xs font-bold text-zinc-700 dark:text-muted-foreground flex items-center space-x-2 bg-muted dark:bg-background/30 p-2.5 rounded-lg border border-dashed border-border dark:border-border select-none">
                                   <CreditCard className="w-5 h-5 text-primary dark:text-indigo-405" />
                                   <span>Secure Payment validation block (Stripe payment gateways)</span>
                                 </div>
                               )}
                            </div>
                            
                          </div>

                          {/* Insertion Drag spacing guide line */}
                          {isDragOver && dropPosition === 'bottom' && (
                            <div className="h-10 w-full border border-dashed border-primary/50 bg-primary/5 rounded-xl flex items-center justify-center text-xs text-primary font-semibold animate-pulse my-2">
                              Insert Element Here
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          </main>

          {/* RIGHT SIDEBAR: Width 360px Properties Panel */}
          <aside className={`w-full lg:w-[360px] border-l border-border dark:border-border bg-card dark:bg-background p-4 space-y-4 overflow-y-auto flex-shrink-0 select-none ${
            mobileTab === 'settings' ? 'block' : 'hidden lg:block'
          }`}>
            
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-zinc-200 border-b border-border dark:border-border pb-2.5">Field & Form Properties</h3>

            {/* Accordion 1: General Properties */}
            <div className="border border-border dark:border-border rounded-xl overflow-hidden bg-muted/20 dark:bg-zinc-905/10">
              <button
                onClick={() => toggleAccordion('general')}
                className="w-full px-4 py-3 flex items-center justify-between font-semibold text-xs text-foreground dark:text-zinc-200 bg-accent/50 dark:bg-card/40 border-none cursor-pointer"
              >
                <span>General Field Configurations</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${accordions.general ? 'rotate-180' : ''}`} />
              </button>
              
              {accordions.general && (
                <div className="p-4 space-y-4 bg-card dark:bg-background">
                  {selectedQuestion ? (
                    <div className="space-y-3.5 text-xs font-semibold">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wide mb-1.5">Input Field Type</label>
                        <select
                          value={selectedQuestion.type}
                          onChange={(e) => {
                            saveStateForUndo(store.questions);
                            store.updateQuestion(selectedQuestion.id, { type: e.target.value });
                          }}
                          className="w-full px-3 py-2 border bg-muted dark:bg-background border-border dark:border-border rounded-lg text-xs outline-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 font-semibold text-foreground dark:text-zinc-200"
                        >
                          <option value="short_text">Short Answer</option>
                          <option value="long_text">Paragraph</option>
                          <option value="mcq">MCQ Choice</option>
                          <option value="checkbox">Checkbox list</option>
                          <option value="dropdown">Dropdown Select</option>
                          <option value="name">Name Field</option>
                          <option value="email">Email Field</option>
                          <option value="phone">Phone Field</option>
                          <option value="address">Address Field</option>
                          <option value="country">Country Dropdown</option>
                          <option value="date">Date Picker</option>
                          <option value="time">Time Picker</option>
                          <option value="rating">Star Rating</option>
                          <option value="feedback">Paragraph Feedback</option>
                          <option value="gender">Gender Radios</option>
                          <option value="multiple_options">Checkboxes (Multiple)</option>
                          <option value="one_option">Radio Buttons (One)</option>
                          <option value="agreement">Agreement Checkbox</option>
                          <option value="signature">Signature Pad</option>
                          <option value="resume">Resume Upload</option>
                          <option value="photo">Photo Upload</option>
                          <option value="amount">Amount Number</option>
                          <option value="price">Price Currency</option>
                          <option value="website">Website URL</option>
                          <option value="password">Password Field</option>
                          <option value="color">Color Picker</option>
                          <option value="location">Map Picker</option>
                          <option value="otp">OTP Field</option>
                          <option value="payment">Payment Block</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wide mb-1.5">Question Label Title</label>
                        <Input
                          value={selectedQuestion.label}
                          onChange={(e) => {
                            saveStateForUndo(store.questions);
                            store.updateQuestion(selectedQuestion.id, { label: e.target.value });
                          }}
                          className="h-9 text-xs rounded-lg font-bold bg-muted dark:bg-background dark:border-border"
                        />
                      </div>

                      <div className="flex justify-between items-center py-2 border-t border-zinc-100 dark:border-border mt-2">
                        <span className="text-xs font-semibold text-muted-foreground dark:text-zinc-350 uppercase tracking-wide">Required Response</span>
                        <Switch
                          checked={selectedQuestion.required}
                          onChange={(chk) => {
                            saveStateForUndo(store.questions);
                            store.updateQuestion(selectedQuestion.id, { required: chk });
                          }}
                        />
                      </div>

                      {/* Options editor */}
                      {['mcq', 'checkbox', 'dropdown', 'gender', 'multiple_options', 'one_option', 'country', 'agreement'].includes(selectedQuestion.type) && (
                        <div className="space-y-2.5 pt-2.5 border-t border-border dark:border-border">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-305 uppercase tracking-wide">Edit Choices list</label>
                            {['mcq', 'checkbox', 'gender', 'multiple_options', 'one_option'].includes(selectedQuestion.type) && (
                              <select
                                value={selectedQuestion.option_layout || 'vertical'}
                                onChange={(e) => {
                                  saveStateForUndo(store.questions);
                                  store.updateQuestion(selectedQuestion.id, { option_layout: e.target.value as 'vertical' | 'horizontal' });
                                }}
                                className="text-[11px] font-bold px-2 py-1 border rounded-md bg-muted dark:bg-background dark:border-border text-foreground cursor-pointer"
                              >
                                <option value="vertical">Stacked (Vertical)</option>
                                <option value="horizontal">Same Line (Inline)</option>
                              </select>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {selectedQuestion.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <Input
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...selectedQuestion.options];
                                    newOpts[optIdx] = e.target.value;
                                    store.updateQuestion(selectedQuestion.id, { options: newOpts });
                                  }}
                                  className="h-8 text-xs px-2.5 flex-1 rounded-lg font-bold bg-muted dark:bg-background dark:border-border"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-auto text-destructive hover:bg-accent dark:hover:bg-zinc-950 border-none bg-transparent cursor-pointer"
                                  onClick={() => {
                                    saveStateForUndo(store.questions);
                                    store.updateQuestion(selectedQuestion.id, {
                                      options: selectedQuestion.options.filter((_, idx) => idx !== optIdx)
                                    });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs font-semibold py-2.5 h-auto mt-2 rounded-lg border border-border dark:border-border bg-muted dark:bg-background hover:bg-zinc-105 dark:hover:bg-zinc-800"
                              onClick={() => {
                                saveStateForUndo(store.questions);
                                store.updateQuestion(selectedQuestion.id, {
                                  options: [...selectedQuestion.options, `Option ${selectedQuestion.options.length + 1}`]
                                });
                              }}
                            >
                              Add option choice
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Quiz & Scoring Configurations */}
                      {['short_text', 'mcq', 'dropdown', 'checkbox'].includes(selectedQuestion.type) && (
                        <div className="space-y-3 pt-3.5 border-t border-border dark:border-border mt-2">
                          <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-350 uppercase tracking-wide">Quiz & Grading Settings</label>
                          
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Marks / Points</label>
                            <Input
                              type="number"
                              min="0"
                              value={selectedQuestion.validations?.points ?? 1}
                              onChange={(e) => {
                                saveStateForUndo(store.questions);
                                const currentVals = selectedQuestion.validations || {};
                                store.updateQuestion(selectedQuestion.id, {
                                  validations: { ...currentVals, points: Number(e.target.value) }
                                });
                              }}
                              className="h-8 text-xs rounded-lg font-bold bg-muted dark:bg-background dark:border-border"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Correct Answer</label>
                            {['mcq', 'dropdown'].includes(selectedQuestion.type) ? (
                              <select
                                value={selectedQuestion.validations?.correct_answer ?? ''}
                                onChange={(e) => {
                                  saveStateForUndo(store.questions);
                                  const currentVals = selectedQuestion.validations || {};
                                  store.updateQuestion(selectedQuestion.id, {
                                    validations: { ...currentVals, correct_answer: e.target.value }
                                  });
                                }}
                                className="w-full px-2.5 py-1.5 border bg-muted dark:bg-background border-border dark:border-border rounded-lg text-xs outline-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 font-bold text-foreground dark:text-zinc-200"
                              >
                                <option value="">-- Select Correct Option --</option>
                                {selectedQuestion.options.map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type="text"
                                placeholder="Type correct answer..."
                                value={selectedQuestion.validations?.correct_answer ?? ''}
                                onChange={(e) => {
                                  saveStateForUndo(store.questions);
                                  const currentVals = selectedQuestion.validations || {};
                                  store.updateQuestion(selectedQuestion.id, {
                                    validations: { ...currentVals, correct_answer: e.target.value }
                                  });
                                }}
                                className="h-8 text-xs rounded-lg font-bold bg-muted dark:bg-background dark:border-border"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* duplicate & delete actions */}
                      <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-border dark:border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs py-2.5 h-auto space-x-1.5 rounded-lg bg-muted hover:bg-accent dark:bg-background dark:hover:bg-zinc-800 text-foreground dark:text-zinc-200 border border-border dark:border-border font-semibold"
                          onClick={() => handleDuplicateQuestion(selectedQuestion)}
                        >
                          <Copy className="w-4 h-4 text-primary" />
                          <span>Duplicate</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0 text-destructive hover:bg-rose-500/10 p-2.5 h-auto rounded-lg border-none cursor-pointer"
                          onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground italic font-bold">Tap any field card on the canvas to configure settings.</p>
                  )}
                </div>
              )}
            </div>

            {/* Accordion 2: Theme / Branding Customization Editor */}
            <div className="border border-border dark:border-border rounded-xl overflow-hidden bg-muted/20 dark:bg-background/10">
              <button
                onClick={() => toggleAccordion('branding')}
                className="w-full px-4 py-3 flex items-center justify-between font-semibold text-xs text-foreground dark:text-zinc-200 bg-accent/50 dark:bg-card/40 border-none cursor-pointer"
              >
                <span>Live Branding & Theme Editor</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${accordions.branding ? 'rotate-180' : ''}`} />
              </button>

              {accordions.branding && (
                <div className="p-4 space-y-4 bg-card dark:bg-background text-xs font-semibold">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-350 uppercase tracking-wide mb-1.5">Theme Accent Color</label>
                    <div className="flex space-x-2 items-center">
                      <input
                        type="color"
                        value={store.theme.primary_color}
                        onChange={(e) => store.updateTheme({ primary_color: e.target.value })}
                        className="h-9 w-12 border border-border dark:border-border rounded-lg cursor-pointer bg-transparent overflow-hidden"
                      />
                      <Input
                        type="text"
                        value={store.theme.primary_color}
                        onChange={(e) => store.updateTheme({ primary_color: e.target.value })}
                        className="h-9 text-xs rounded-lg font-mono font-bold text-foreground dark:text-zinc-200 bg-muted dark:bg-background dark:border-border"
                      />
                    </div>
                    
                    {/* Preset Tap Color Circles */}
                    <div className="flex flex-wrap gap-2 mt-2 select-none">
                      {[
                        { hex: "#6366f1", label: "Indigo" },
                        { hex: "#06b6d4", label: "Cyan" },
                        { hex: "#10b981", label: "Emerald" },
                        { hex: "#f59e0b", label: "Amber" },
                        { hex: "#ef4444", label: "Rose" },
                        { hex: "#d946ef", label: "Fuchsia" }
                      ].map(color => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => store.updateTheme({ primary_color: color.hex })}
                          title={color.label}
                          className="w-5 h-5 rounded-full border border-border dark:border-border transition-transform duration-200 hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-355 uppercase tracking-wide mb-1.5">Typography Font</label>
                    <select
                      value={store.theme.font_family}
                      onChange={(e) => store.updateTheme({ font_family: e.target.value })}
                      className="w-full px-3 py-2 border bg-muted dark:bg-background border-border dark:border-border rounded-lg text-xs outline-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 font-semibold text-foreground dark:text-zinc-200"
                    >
                      <option value="Manrope">Manrope (⭐ Premium + modern + AI)</option>
                      <option value="Inter">Inter (⭐ Clean + professional + highly readable)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (⭐ Stylish + friendly + modern)</option>
                      <option value="Poppins">Poppins (Modern Geometric)</option>
                      <option value="Roboto">Roboto (Clean Material)</option>
                      <option value="Outfit">Outfit (Sleek Contemporary)</option>
                      <option value="Georgia">Georgia (Serif Classy)</option>
                      <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
                      <option value="Space Grotesk">Space Grotesk (Tech Minimal)</option>
                      <option value="Courier New">Courier New (Sleek Monospace)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-350 uppercase tracking-wide mb-1.5">Border Corner Radius</label>
                    <select
                      value={store.theme.border_radius || '24px'}
                      onChange={(e) => store.updateTheme({ border_radius: e.target.value })}
                      className="w-full px-3 py-2 border bg-muted dark:bg-background border-border dark:border-border rounded-lg text-xs outline-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 font-semibold text-foreground dark:text-zinc-200"
                    >
                      <option value="24px">Modern (24px radius)</option>
                      <option value="8px">Sleek (8px radius)</option>
                      <option value="0px">Sharp (0px radius)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-350 uppercase tracking-wide mb-1.5">Form Display Mode (Shared Respondent View)</label>
                    <select
                      value={store.settings.display_mode || 'full'}
                      onChange={(e) => store.updateSettings({ display_mode: e.target.value as 'full' | 'wizard' | 'chat' })}
                      className="w-full px-3 py-2 border bg-muted dark:bg-background border-border dark:border-border rounded-lg text-xs outline-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 font-semibold text-foreground dark:text-zinc-200"
                    >
                      <option value="full">📄 Full Form (Show all questions on one page)</option>
                      <option value="wizard">🃏 Card Wizard (Show one question at a time)</option>
                      <option value="chat">💬 Chat Mode (Conversational AI style flow)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-350 uppercase tracking-wide mb-1.5">Banner Header Image</label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        type="url"
                        placeholder="Paste image URL (e.g. Unsplash URL)..."
                        value={typeof store.theme.banner_url === 'string' ? store.theme.banner_url : ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          store.updateTheme({ banner_url: val || null });
                        }}
                        className="h-9 text-xs rounded-lg font-bold text-foreground dark:text-zinc-200 bg-muted dark:bg-background dark:border-border"
                      />
                      {store.theme.banner_url && (
                        <button
                          type="button"
                          onClick={() => store.updateTheme({ banner_url: null })}
                          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold rounded-lg border border-rose-500/20 transition-colors shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {/* Image preview thumbnail */}
                    {store.theme.banner_url && typeof store.theme.banner_url === 'string' && store.theme.banner_url.startsWith('http') && (
                      <div className="mt-2 h-16 rounded-lg overflow-hidden border border-border dark:border-border">
                        <img 
                          src={store.theme.banner_url} 
                          alt="Banner preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 select-none">
                      {[
                        { name: "Coffee", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80" },
                        { name: "Tech", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80" },
                        { name: "Exams", url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80" },
                        { name: "Fitness", url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80" }
                      ].map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => store.updateTheme({ banner_url: preset.url })}
                          className="px-2 py-1 bg-accent hover:bg-zinc-200 dark:bg-card dark:hover:bg-zinc-700 text-xs font-bold text-muted-foreground dark:text-muted-foreground rounded-md transition-colors cursor-pointer"
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Form Rules & Proctoring Settings */}
            <div className="border border-border dark:border-border rounded-xl overflow-hidden bg-muted/20 dark:bg-background/10">
              <button
                onClick={() => toggleAccordion('permissions')}
                className="w-full px-4 py-3 flex items-center justify-between font-semibold text-xs text-foreground dark:text-zinc-200 bg-accent/50 dark:bg-card/40 border-none cursor-pointer"
              >
                <span>Rules, Access & Security</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${accordions.permissions ? 'rotate-180' : ''}`} />
              </button>

              {accordions.permissions && (
                <div className="p-4 space-y-4 bg-card dark:bg-background text-xs font-semibold">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-355 uppercase tracking-wide mb-1.5">Access Limit Level</label>
                    <select
                      value={store.isPublic ? "public" : (store.settings.invited_only ? "invited" : "team")}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "public") {
                          store.updateFormFields({ isPublic: true });
                          store.updateSettings({ invited_only: false, team_members_only: false });
                        } else if (val === "invited") {
                          store.updateFormFields({ isPublic: false });
                          store.updateSettings({ invited_only: true, team_members_only: false });
                        } else {
                          store.updateFormFields({ isPublic: false });
                          store.updateSettings({ invited_only: false, team_members_only: true });
                        }
                      }}
                      className="w-full px-3 py-2 border bg-muted dark:bg-background border-border dark:border-border rounded-lg text-xs outline-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 font-semibold text-foreground dark:text-zinc-200"
                    >
                      <option value="public">Anyone with link (Public)</option>
                      <option value="invited">Invited emails only (Private)</option>
                      <option value="team">Team workspace members only</option>
                    </select>
                  </div>

                  {!store.isPublic && store.settings.invited_only && (
                    <div className="space-y-1 bg-muted dark:bg-background p-2.5 rounded-lg border border-border dark:border-border">
                      <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase mb-1">Invited emails (comma list)</label>
                      <textarea
                        placeholder="user1@example.com, user2@example.com"
                        value={store.settings.invited_emails ? store.settings.invited_emails.join(', ') : ""}
                        onChange={(e) => {
                          const list = e.target.value.split(',').map(email => email.trim()).filter(Boolean);
                          store.updateSettings({ invited_emails: list });
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border rounded-lg bg-card dark:bg-background border-border dark:border-border text-foreground dark:text-zinc-100 outline-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 h-16 resize-none font-bold"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-border">
                    <span className="text-xs font-semibold text-muted-foreground dark:text-zinc-350 uppercase tracking-wide">Collect emails logs</span>
                    <Switch
                      checked={store.settings.collect_emails}
                      onChange={(chk) => store.updateSettings({ collect_emails: chk })}
                    />
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-border">
                    <span className="text-xs font-semibold text-zinc-655 dark:text-zinc-350 uppercase tracking-wide">Limit to 1 response</span>
                    <Switch
                      checked={store.settings.limit_responses}
                      onChange={(chk) => store.updateSettings({ limit_responses: chk })}
                    />
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 dark:border-border">
                    <span className="text-xs font-semibold text-zinc-655 dark:text-zinc-350 uppercase tracking-wide">Anti-Cheat focus warnings</span>
                    <Switch
                      checked={store.settings.anti_cheat_detection}
                      onChange={(chk) => store.updateSettings({ anti_cheat_detection: chk })}
                    />
                  </div>
                  
                  <div className="space-y-1 mt-2.5">
                    <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-355 uppercase mb-1">Timer Constraint (Minutes)</label>
                    <Input
                      type="number"
                      placeholder="0 (No limit)"
                      value={store.settings.timer_limit || ""}
                      onChange={(e) => store.updateSettings({ timer_limit: Number(e.target.value) })}
                      className="h-9 text-xs rounded-lg font-bold bg-muted dark:bg-background dark:border-border"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 4: Share Option Snippet */}
            <div className="border border-border dark:border-border rounded-xl overflow-hidden bg-muted/20 dark:bg-background/10">
              <button
                onClick={() => toggleAccordion('publishing')}
                className="w-full px-4 py-3 flex items-center justify-between font-semibold text-xs text-foreground dark:text-zinc-200 bg-accent/50 dark:bg-card/40 border-none cursor-pointer"
              >
                <span>Share Public Links</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${accordions.publishing ? 'rotate-180' : ''}`} />
              </button>

              {accordions.publishing && (
                <div className="p-4 space-y-3.5 bg-card dark:bg-background text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground tracking-wide mb-1">Public URL link</label>
                    <div className="flex space-x-1.5">
                      <Input
                        value={publicLink}
                        readOnly
                        className="h-8 text-xs px-2.5 truncate flex-1 bg-muted dark:bg-background border-border dark:border-border text-zinc-700 dark:text-muted-foreground rounded-lg font-bold"
                      />
                      <Button variant="outline" size="sm" className="h-8 px-3 bg-accent hover:bg-zinc-200 dark:bg-background dark:hover:bg-zinc-800 text-foreground dark:text-zinc-200 border border-border dark:border-border rounded-lg font-semibold cursor-pointer" onClick={handleCopyLink}>
                        {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs py-2.5 h-auto rounded-lg space-x-1.5 border border-border dark:border-border text-foreground dark:text-zinc-200 font-semibold bg-muted dark:bg-background hover:bg-accent dark:hover:bg-zinc-800 cursor-pointer"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Share2 className="w-4 h-4 text-indigo-650" />
                    <span>Open Share Drawer</span>
                  </Button>
                </div>
              )}
            </div>

          </aside>

        </div>
      ) : (
        
        /* RESPONSES & ANALYTICS DASHBOARD VIEW */
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-muted dark:bg-background scrollbar-thin">
          <div className="flex justify-between items-center select-none">
            <div>
              <h2 className="text-2xl font-bold text-zinc-950 dark:text-white flex items-center space-x-2.5 tracking-tight">
                <BarChart3 className="w-6 h-6 text-primary" />
                <span>Responses & Analytics Dashboard</span>
              </h2>
              <p className="text-xs font-bold text-zinc-700 dark:text-muted-foreground mt-1">Audit submissions registries, review star ratings distribution, and compile AI insights report.</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={handleGenerateAISentiment}
                disabled={isSentimentAnalyzing}
                className="space-x-1.5 text-xs bg-card hover:bg-slate-100 dark:bg-background dark:hover:bg-zinc-800 text-foreground dark:text-zinc-100 rounded-lg px-4 border border-border dark:border-border font-semibold h-9 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span>{isSentimentAnalyzing ? 'Compiling Index...' : 'Generate AI Sentiment Insights'}</span>
              </Button>
            </div>
          </div>

          {/* 1. Quiz-Specific Summary Widgets (If quiz questions are set up) */}
          {hasQuiz ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none animate-fadeIn">
              <Card className="border-t-4 border-t-emerald-500 bg-card dark:bg-background rounded-[20px] shadow-sm hover:shadow-md border-border dark:border-border">
                <CardHeader className="pb-1.5 pt-4 px-5">
                  <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-widest">Average Class Score</span>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <h3 className="text-3xl font-bold text-foreground dark:text-white tracking-tight">
                    {avgScore} Points ({avgPct}%)
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground mt-1">Average score of all participating students.</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-indigo-500 bg-card dark:bg-background rounded-[20px] shadow-sm hover:shadow-md border-border dark:border-border">
                <CardHeader className="pb-1.5 pt-4 px-5">
                  <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-widest">Highest Score</span>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <h3 className="text-3xl font-bold text-foreground dark:text-white tracking-tight">
                    {highestScore} Points
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground mt-1">Maximum points achieved by a student.</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-rose-500 bg-card dark:bg-background rounded-[20px] shadow-sm hover:shadow-md border-border dark:border-border">
                <CardHeader className="pb-1.5 pt-4 px-5">
                  <span className="text-xs font-semibold text-zinc-605 dark:text-muted-foreground uppercase tracking-widest">Average Completion</span>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <h3 className="text-3xl font-bold text-foreground dark:text-white tracking-tight">
                    {totalResponses} Submissions
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground mt-1">Total student quiz submissions graded in registry.</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Standard non-quiz metrics */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
              {[
                { label: "Form views index", value: `${responses.length * 2 + 15}`, desc: "Estimated questionnaire openings count", border: "border-t-indigo-500" },
                { label: "Total entries logs", value: `${totalResponses}`, desc: "Valid submission questionnaires collected", border: "border-t-purple-500" },
                { label: "Average filling time", value: formatCompletionTime(avgCompletionTime), desc: "Average duration elapsed in seconds", border: "border-t-pink-500" }
              ].map((widget, idx) => (
                <Card key={idx} className={`border-t-4 bg-card dark:bg-background rounded-[20px] shadow-sm hover:shadow-md border-border dark:border-border ${widget.border}`}>
                  <CardHeader className="pb-1.5 pt-4 px-5">
                    <span className="text-xs font-semibold text-muted-foreground dark:text-zinc-350 uppercase tracking-widest">{widget.label}</span>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <h3 className="text-3xl font-bold text-foreground dark:text-white tracking-tight">{widget.value}</h3>
                    <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground mt-1">{widget.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* AI Sentiment Report block */}
          {sentimentReport && (
            <Card className="border border-border bg-card p-5 rounded-2xl animate-fadeIn shadow-xs select-none">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 animate-pulse" /></div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100 flex items-center space-x-2">
                    <span>AI Sentiment Index Report</span>
                    <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold font-mono">
                      Rating: {sentimentReport.average_score}/1.0
                    </span>
                  </h4>
                  <p className="text-xs font-bold text-foreground dark:text-muted-foreground leading-relaxed max-w-3xl pt-1">
                    Overall submission compliance is extremely positive. Sentiment calculations indicates: 
                    <span className="font-semibold text-emerald-600 ml-1">{sentimentReport.sentiment_distribution.positive} Positive</span>, 
                    <span className="font-semibold text-muted-foreground dark:text-muted-foreground ml-1">{sentimentReport.sentiment_distribution.neutral} Neutral</span>, 
                    <span className="font-semibold text-destructive ml-1">{sentimentReport.sentiment_distribution.negative} Negative</span>.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 2. Advanced sharing snippets & Sentiment bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Embed & sharing options */}
            <Card className="border border-border dark:border-border bg-card dark:bg-background rounded-[24px] shadow-sm p-6 space-y-5">
              <div className="space-y-1 select-none">
                <CardTitle className="text-base font-semibold flex items-center space-x-2 text-zinc-950 dark:text-white">
                  <Share2 className="w-5 h-5 text-primary" />
                  <span>Branded Sharing Embeds</span>
                </CardTitle>
                <CardDescription className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">Embed this responsive form on websites or distribute links.</CardDescription>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">Direct URL link</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 min-w-0 bg-muted dark:bg-background border border-border dark:border-border rounded-lg px-3.5 py-2 flex items-center justify-between">
                      <a 
                        href={publicLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-mono text-xs text-primary dark:text-indigo-400 hover:underline truncate break-all font-bold"
                        title="Open live form in new tab"
                      >
                        {publicLink}
                      </a>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(publicLink);
                        setIsCopiedLink(true);
                        setTimeout(() => setIsCopiedLink(false), 2000);
                      }}
                      className="h-9.5 text-xs font-semibold bg-accent hover:bg-zinc-200 dark:bg-card dark:hover:bg-zinc-700 text-foreground dark:text-zinc-100 border border-border dark:border-border rounded-lg px-3 cursor-pointer"
                    >
                      {isCopiedLink ? "Copied" : "Copy Link"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">Embed iframe snippet</label>
                  <div className="flex space-x-2">
                    <Input value={embedCodeSnippet} readOnly className="h-9.5 text-xs bg-zinc-55 dark:bg-background border-border dark:border-border rounded-lg font-bold" />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(embedCodeSnippet);
                        setIsCopiedEmbed(true);
                        setTimeout(() => setIsCopiedEmbed(false), 2000);
                      }}
                      className="h-9.5 text-xs font-semibold bg-accent hover:bg-zinc-200 dark:bg-card dark:hover:bg-zinc-700 text-foreground dark:text-zinc-100 border border-border dark:border-border rounded-lg px-3 cursor-pointer"
                    >
                      {isCopiedEmbed ? "Copied" : "Copy iframe"}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border dark:border-border pt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 select-none">
                    <div className="w-14 h-14 border border-border dark:border-border bg-card p-1 rounded-lg flex items-center justify-center flex-shrink-0">
                      <img src={qrCodeUrl} alt="QR scan" className="w-full h-full" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground dark:text-zinc-200">Mobile QR Scanner</p>
                      <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">Scan to open the questionnaire instantly</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadQRCode} 
                    className="space-x-1.5 text-xs bg-accent hover:bg-zinc-200 dark:bg-card dark:hover:bg-zinc-700 text-foreground dark:text-zinc-100 border border-border dark:border-border rounded-lg h-8.5 cursor-pointer font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download QR</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Sentiment insights progress chart */}
            <Card className="border border-border dark:border-border bg-card dark:bg-background rounded-[24px] shadow-sm p-6 space-y-4">
              <div className="space-y-1 select-none">
                <CardTitle className="text-base font-semibold flex items-center space-x-2 text-zinc-950 dark:text-white">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Satisfaction review index</span>
                </CardTitle>
                <CardDescription className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">Aggregated customer satisfaction rating indexes.</CardDescription>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center text-xs font-semibold select-none">
                  <span className="text-emerald-600 dark:text-emerald-400">{goodReviewsPct}% Satisfied Responses</span>
                  <span className="text-destructive dark:text-rose-400">{badReviewsPct}% Unhappy Responses</span>
                </div>
                
                {/* Visual stacked progress bar */}
                <div className="w-full bg-zinc-200 dark:bg-card h-3 rounded-full overflow-hidden flex select-none border border-border dark:border-border">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${goodReviewsPct}%` }} />
                  <div className="bg-rose-500 h-full transition-all" style={{ width: `${badReviewsPct}%` }} />
                </div>

                <div className="text-xs text-zinc-700 dark:text-muted-foreground space-y-1.5 leading-relaxed bg-muted dark:bg-background p-4 rounded-2xl border border-border dark:border-border select-none">
                  <p className="font-semibold flex items-center space-x-1.5 text-foreground dark:text-zinc-200 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Summary calculations:</span>
                  </p>
                  <p className="mt-1 font-bold">
                    {goodReviewsPct >= 70 
                      ? "Respondent response shows stable sentiment distributions. Ensure star rating validations remain active." 
                      : "Satisfaction dropped below benchmark limits. Check single question reviews distribution below to identify errors."}
                  </p>
                </div>
              </div>
            </Card>

          </div>

          {/* 3. Star Ratings & MCQ Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Star Rating bar breakdown */}
            <Card className="border border-border dark:border-border bg-card dark:bg-background rounded-[24px] shadow-sm p-6 space-y-5">
              <div className="space-y-1 select-none">
                <CardTitle className="text-base font-semibold text-zinc-950 dark:text-white">Star rating distribution index</CardTitle>
                <CardDescription className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">Total star ratings recorded in Star Rating fields.</CardDescription>
              </div>

              <div className="space-y-3.5">
                {ratingQuestion ? (
                  <div className="space-y-3.5">
                    {ratingDistribution.map((count, index) => {
                      const starValue = index + 1;
                      const totalRatings = ratingDistribution.reduce((acc, c) => acc + c, 0) || 1;
                      const pct = Math.round((count / totalRatings) * 100);
                      return (
                        <div key={index} className="flex items-center space-x-3 text-xs text-foreground dark:text-muted-foreground font-bold select-none">
                          <span className="w-14 font-semibold font-mono text-xs">{starValue} Stars</span>
                          <div className="flex-1 bg-zinc-200 dark:bg-card h-2.5 rounded-full overflow-hidden border border-border dark:border-border">
                            <div className="bg-amber-500 h-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-10 text-right font-mono text-muted-foreground font-semibold">{pct}%</span>
                        </div>
                      );
                    }).reverse()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs select-none font-bold">
                    <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground dark:text-foreground" />
                    <p>No rating fields created inside this form outline yet.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* MCQ Breakdown */}
            <Card className="border border-border dark:border-border bg-card dark:bg-background rounded-[24px] shadow-sm p-6 space-y-5">
              <div className="space-y-1 select-none">
                <CardTitle className="text-base font-semibold text-zinc-950 dark:text-white">Multiple choice variables breakdown</CardTitle>
                <CardDescription className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">Option distribution ratios across multiple choice fields.</CardDescription>
              </div>

              <div className="space-y-4 max-h-60 overflow-y-auto scrollbar-thin">
                {mcqQuestions.length > 0 ? (
                  mcqQuestions.map((q) => {
                    const optCounts: Record<string, number> = {};
                    q.options.forEach(opt => { optCounts[opt] = 0; });
                    responses.forEach(r => {
                      const val = r.answers?.[q.id];
                      if (val && optCounts[val] !== undefined) {
                        optCounts[val]++;
                      }
                    });
                    const totalSelected = Object.values(optCounts).reduce((acc, c) => acc + c, 0) || 1;
                    return (
                      <div key={q.id} className="space-y-3.5 border-b border-border dark:border-border pb-4 last:border-none last:pb-0">
                        <p className="text-xs font-semibold text-foreground dark:text-zinc-200 select-none">Question: {q.label}</p>
                        <div className="space-y-2 select-none">
                          {q.options.map((opt, oIdx) => {
                            const count = optCounts[opt] || 0;
                            const pct = Math.round((count / totalSelected) * 100);
                            return (
                              <div key={oIdx} className="space-y-1 text-xs font-bold">
                                <div className="flex justify-between text-zinc-605 dark:text-muted-foreground">
                                  <span className="font-semibold">{opt}</span>
                                  <span className="font-semibold font-mono">{pct}% ({count})</span>
                                </div>
                                <div className="w-full bg-accent dark:bg-card h-2 rounded-full overflow-hidden border border-border dark:border-border">
                                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs select-none font-bold">
                    <LayoutGrid className="w-8 h-8 mx-auto mb-2 text-muted-foreground dark:text-foreground" />
                    <p>No MCQ fields are defined in this form questionnaire outline.</p>
                  </div>
                )}
              </div>
            </Card>

          </div>

          {/* 4. Registry spreadsheets details list */}
          <Card className="border border-border dark:border-border bg-card dark:bg-background rounded-[24px] shadow-sm overflow-hidden">
            <CardHeader className="p-6 select-none bg-muted dark:bg-background/20">
              <CardTitle className="text-base font-semibold text-zinc-950 dark:text-white">Registry of Form Submissions</CardTitle>
              <CardDescription className="text-xs font-bold text-muted-foreground dark:text-zinc-405">Secure listing logs of responder emails, filling times, scores, and proctor flags.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t border-border dark:border-border">
              {responses.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground text-xs select-none font-bold">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground dark:text-foreground" />
                  <p>No responder entries logged in database yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs text-left border-collapse select-none">
                    <thead>
                      <tr className="border-b border-border dark:border-border bg-accent/40 dark:bg-background/30 text-foreground dark:text-zinc-200 font-bold uppercase tracking-wider text-xs">
                        <th className="py-4.5 px-6">Timestamp Date</th>
                        <th className="py-4.5 px-6">Responder log email</th>
                        <th className="py-4.5 px-6">filling time</th>
                        <th className="py-4.5 px-6">Quiz Score</th>
                        <th className="py-4.5 px-6">Proctor Alerts</th>
                        <th className="py-4.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((r) => {
                        const isFlagged = r.browserMetadata?.is_flagged || (r.browserMetadata?.tab_switches && r.browserMetadata.tab_switches >= 3);
                        return (
                          <tr key={r.id} className="border-b border-border dark:border-zinc-900 hover:bg-accent/50 dark:hover:bg-zinc-900/30 text-foreground dark:text-zinc-105 font-bold text-xs">
                            <td className="py-4 px-6 font-mono text-zinc-700 dark:text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 px-6 font-semibold">{r.email || r.answers?.responder_email || 'Anonymous responder'}</td>
                            <td className="py-4 px-6 font-mono">{formatCompletionTime(r.timeTaken)}</td>
                            <td className="py-4 px-6 font-mono font-semibold">
                              {(() => {
                                let totalPossible = 0;
                                let earned = 0;
                                if (!hasQuiz) return '-';
                                
                                store.questions.forEach(q => {
                                  const isGraded = ['short_text', 'mcq', 'dropdown', 'checkbox'].includes(q.type) && q.validations?.correct_answer;
                                  const pts = q.validations?.points ?? 0;
                                  if (isGraded) {
                                    totalPossible += pts;
                                    const studentAns = r.answers?.[q.id];
                                    if (studentAns !== undefined && studentAns !== null) {
                                      if (String(studentAns).trim().toLowerCase() === String(q.validations.correct_answer).trim().toLowerCase()) {
                                        earned += pts;
                                      }
                                    }
                                  }
                                });
                                return `${earned} / ${totalPossible}`;
                              })()}
                            </td>
                            <td className="py-4 px-6">
                              {isFlagged ? (
                                <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-900 text-destructive border border-rose-200/50 rounded-lg text-xs font-semibold">
                                  Flagged ({r.browserMetadata?.tab_switches || 3} switches)
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900 text-emerald-600 border border-emerald-200/50 rounded-lg text-xs font-semibold">
                                  Secure Log
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedResponse(r);
                                  setIsResponseModalOpen(true);
                                  setAiAnalysisResult(null);
                                }}
                                className="text-xs h-8.5 px-3.5 rounded-lg border border-border dark:border-border text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-800 font-semibold bg-muted dark:bg-background cursor-pointer"
                              >
                                View answers
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUCCESS MODAL ON PUBLISH */}
      <Modal 
        isOpen={isSuccessModalOpen} 
        onClose={() => setIsSuccessModalOpen(false)} 
        title="🎉 Form Published Successfully!"
      >
        <div className="space-y-6 text-foreground dark:text-zinc-100 p-1">
          <p className="text-sm font-bold text-foreground dark:text-zinc-200">
            Your form is now live and accepting submissions from the public.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Public URL Link</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 min-w-0 bg-muted dark:bg-background border border-border dark:border-border rounded-lg px-3.5 py-2 flex items-center justify-between">
                <a 
                  href={publicLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-mono text-xs text-primary dark:text-indigo-400 hover:underline truncate break-all font-bold"
                  title="Open live form in new tab"
                >
                  {publicLink}
                </a>
              </div>
              <Button onClick={() => {
                try {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(publicLink);
                  } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = publicLink;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                  }
                  alert("URL copied to clipboard!");
                } catch {
                  alert("Copy failed. Please copy the URL from the input box manually.");
                }
              }} size="sm" className="h-9.5 px-4 bg-primary hover:opacity-90 text-primary-foreground font-semibold rounded-lg border-none cursor-pointer">
                Copy
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSuccessModalOpen(false);
                setIsShareModalOpen(true);
              }}
              className="w-full text-xs font-semibold justify-center py-2.5 rounded-lg border border-border dark:border-border h-10"
            >
              <Share2 className="w-5 h-5 mr-2 text-primary" />
              <span>Share Options</span>
            </Button>
            <Button
              onClick={() => {
                window.open(publicLink, '_blank');
              }}
              className="w-full text-xs font-semibold justify-center py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 h-10 border-none cursor-pointer"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              <span>Open Link</span>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const res = await fetch(qrCodeUrl);
                  const blob = await res.blob();
                  const localUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = localUrl;
                  a.download = `${store.title.replace(/\s+/g, '_')}_qr.png`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(localUrl);
                } catch {
                  window.open(qrCodeUrl, '_blank');
                }
              }}
              className="w-full col-span-2 text-xs font-semibold justify-center py-2.5 rounded-lg border border-border dark:border-border h-10"
            >
              <QrCode className="w-5 h-5 mr-2 text-emerald-600" />
              <span>Generate QR Code</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* SHARE OPTIONS DIALOG */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        formId={formId}
        formTitle={store.title}
        uniqueShareId={store.uniqueShareId || undefined}
        publicUrl={store.publicUrl || undefined}
      />

      {/* RESPONSE VIEWER DETAILS MODAL */}
      <Modal
        isOpen={isResponseModalOpen}
        onClose={() => setIsResponseModalOpen(false)}
        title="Form Response Details"
        size="lg"
      >
        {selectedResponse && (
          <div className="space-y-6 text-foreground dark:text-zinc-100 p-1">
            {/* Responder info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-accent dark:bg-background rounded-2xl border border-border dark:border-border text-xs select-none">
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Email</p>
                <p className="font-bold text-foreground dark:text-zinc-100 mt-1">{selectedResponse.email || selectedResponse.answers?.responder_email || 'Anonymous'}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Submitted By</p>
                <p className="font-bold text-foreground dark:text-zinc-100 mt-1">{selectedResponse.submittedBy || 'Anonymous'}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Time Taken</p>
                <p className="font-bold text-foreground dark:text-zinc-105 mt-1 font-mono">{formatCompletionTime(selectedResponse.timeTaken)}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Submission Date</p>
                <p className="font-bold text-foreground dark:text-zinc-105 mt-1 font-mono">{new Date(selectedResponse.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Quiz Grading breakdown inside modal */}
            {(() => {
              let totalPossiblePoints = 0;
              let earnedPoints = 0;
              const hasQuizData = store.questions.some(q => q.validations?.correct_answer);

              if (!hasQuizData) return null;

              store.questions.forEach(q => {
                const isGraded = ['short_text', 'mcq', 'dropdown', 'checkbox'].includes(q.type) && q.validations?.correct_answer;
                const points = q.validations?.points ?? 0;
                if (isGraded) {
                  totalPossiblePoints += points;
                  const ans = selectedResponse.answers?.[q.id];
                  if (ans !== undefined && ans !== null) {
                    if (String(ans).trim().toLowerCase() === String(q.validations.correct_answer).trim().toLowerCase()) {
                      earnedPoints += points;
                    }
                  }
                }
              });

              const pct = totalPossiblePoints > 0 ? Math.round((earnedPoints / totalPossiblePoints) * 100) : 0;

              return (
                <div className="p-4 bg-secondary/30 border border-border rounded-2xl flex items-center justify-between select-none">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Student Quiz Score</h4>
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                      Earned {earnedPoints} / {totalPossiblePoints} Marks ({pct}%)
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    pct >= 80 ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600' :
                    pct >= 50 ? 'bg-amber-50 dark:bg-amber-955 text-amber-600' :
                    'bg-rose-50 dark:bg-rose-900 text-rose-605'
                  }`}>
                    {pct >= 80 ? 'Grade A' : pct >= 50 ? 'Grade B' : 'Grade F'}
                  </span>
                </div>
              );
            })()}

            {/* Questions and Answers list */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground border-b border-border dark:border-border pb-2 select-none">Answers Registry Log</h4>
              <div className="space-y-3">
                {store.questions.map((q, idx) => {
                  const answer = selectedResponse.answers?.[q.id];
                  let displayAnswer = '-';
                  if (answer !== undefined && answer !== null) {
                    displayAnswer = typeof answer === 'object' ? JSON.stringify(answer) : String(answer);
                  }
                  
                  const isGraded = ['short_text', 'mcq', 'dropdown', 'checkbox'].includes(q.type) && q.validations?.correct_answer;
                  const isCorrect = isGraded && String(answer).trim().toLowerCase() === String(q.validations.correct_answer).trim().toLowerCase();

                  return (
                    <div key={q.id} className="p-4 bg-muted dark:bg-background border border-border dark:border-border rounded-[20px] flex justify-between items-start">
                      <div className="space-y-1.5 flex-1 pr-4">
                        <p className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground select-none">Q{idx + 1}: {q.label}</p>
                        <p className="text-sm font-bold text-foreground dark:text-muted-foreground">{displayAnswer}</p>
                        {isGraded && !isCorrect && (
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">Correct Answer: {q.validations.correct_answer}</p>
                        )}
                      </div>
                      {isGraded && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          isCorrect ? 'bg-emerald-50 dark:bg-emerald-900 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900 text-destructive'
                        }`}>
                          {isCorrect ? q.validations.points : 0} / {q.validations.points} Pts
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signature display if present */}
            {selectedResponse.answers?.signature_pad_url && (
              <div className="space-y-2 border-t border-border dark:border-border pt-4 select-none">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Verification Signature</h4>
                <div className="border border-border dark:border-border rounded-2xl p-2 bg-card dark:bg-background max-w-[300px] shadow-sm animate-fadeIn">
                  <img src={selectedResponse.answers.signature_pad_url} alt="Responder Signature" className="max-h-24 object-contain" />
                </div>
              </div>
            )}

            {/* Proctoring logs details */}
            <div className="space-y-2 border-t border-border dark:border-border pt-4 select-none">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">Proctoring metadata</h4>
              <div className="p-3.5 bg-accent dark:bg-background rounded-2xl border border-border dark:border-border text-xs space-y-1.5 text-foreground dark:text-muted-foreground font-bold">
                <p><span className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Tab Focus Switches:</span> {selectedResponse.browserMetadata?.tab_switches || 0}</p>
                <p><span className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Proctor Flagged status:</span> {selectedResponse.browserMetadata?.is_flagged ? "Flagged (Warning)" : "Clean"}</p>
                <p className="truncate"><span className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">User Agent:</span> {selectedResponse.browserMetadata?.user_agent || "unknown"}</p>
              </div>
            </div>

            {/* PromptForm AI individual response analysis report */}
            <div className="space-y-3 border-t border-border dark:border-border pt-4 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-5 rounded-2xl">
              <div className="flex justify-between items-center select-none">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span>PromptForm AI Response Review</span>
                </h4>
                {!aiAnalysisResult && (
                  <Button
                    size="sm"
                    disabled={aiAnalysisLoading}
                    onClick={async () => {
                      setAiAnalysisLoading(true);
                      try {
                        const res = await api.post('/ai/analyze-response', { responseId: selectedResponse.id });
                        setAiAnalysisResult(res.analysis);
                      } catch (err: any) {
                        if (err.status === 403 && err.data?.status === 'restricted') {
                          setActiveRestriction(err.data);
                          setIsUpgradeModalOpen(true);
                          return;
                        }
                        alert("AI analysis error: " + err.message);
                      } finally {
                        setAiAnalysisLoading(false);
                      }
                    }}
                    className="text-xs font-semibold py-1.5 h-auto rounded-lg bg-primary hover:opacity-90 text-primary-foreground border-none cursor-pointer px-3"
                  >
                    {aiAnalysisLoading ? 'Analyzing...' : 'Generate AI Review'}
                  </Button>
                )}
              </div>

              {aiAnalysisResult && (
                <div className="space-y-3.5 text-xs pt-1 animate-fadeIn">
                  <div className="flex items-center space-x-1.5 select-none font-bold text-foreground dark:text-muted-foreground">
                    <span className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Sentiment Classification:</span>
                    <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-750 dark:text-indigo-400 font-semibold rounded-md text-xs uppercase border border-indigo-200 dark:border-indigo-900/30">{aiAnalysisResult.sentiment}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider select-none">Executive Summary:</p>
                    <p className="mt-1.5 text-foreground dark:text-zinc-105 leading-relaxed font-semibold text-sm">{aiAnalysisResult.summary}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider select-none">Key Highlights:</p>
                    <ul className="list-disc pl-4 mt-1.5 space-y-1.5 text-foreground dark:text-zinc-200 font-bold">
                      {aiAnalysisResult.highlights.map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider select-none">Recommendations:</p>
                    <ul className="list-disc pl-4 mt-1.5 space-y-1.5 text-foreground dark:text-zinc-200 font-bold">
                      {aiAnalysisResult.recommendations.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={() => {
          loadForm();
        }}
        restriction={activeRestriction}
      />
    </div>
  );
}
