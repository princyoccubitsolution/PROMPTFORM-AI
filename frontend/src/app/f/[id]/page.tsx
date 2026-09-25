"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Sparkles, Shield, Clock, Lock, Send, AlertTriangle, PenTool, ArrowRight, ArrowLeft,
  UserCheck, CreditCard, User, Mail, Phone, MapPin, Globe, Calendar, Star,
  FileUp, Image as ImageIcon, Hash, DollarSign, Link as LinkIcon, Eye, EyeOff,
  Bot, Check, CheckCircle2, RotateCcw, HelpCircle, Layers, Smartphone, MessageSquare,
  ChevronRight, ChevronLeft, ThumbsUp, ThumbsDown, Award, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

/* -------------------------------------------------------------------------- */
/* SIGNATURE PAD COMPONENT                                                    */
/* -------------------------------------------------------------------------- */
const QuestionSignaturePad = ({ 
  value, 
  onChange,
  primaryColor = '#4F46E5'
}: { 
  value: string; 
  onChange: (val: string) => void;
  primaryColor?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-2 w-full">
      <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 transition-colors">
        <canvas
          ref={canvasRef}
          width={600}
          height={130}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[130px] cursor-crosshair touch-none"
        />
        {!value && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-medium">
            <PenTool className="w-4 h-4 mr-1.5 opacity-60" />
            Sign here with your mouse or finger
          </div>
        )}
      </div>
      <div className="flex justify-between items-center px-1">
        {value ? (
          <span className="text-xs font-semibold text-emerald-600 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Signature Captured
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Touch or drag above to draw signature</span>
        )}
        <button 
          type="button" 
          onClick={clear} 
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline border-none bg-transparent cursor-pointer p-0"
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
};

/* Helper for randomizing questions and options (anti-cheat) */
const shuffleArray = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/* -------------------------------------------------------------------------- */
/* MAIN RESPONDER PAGE                                                        */
/* -------------------------------------------------------------------------- */
export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  // Form definition state
  const [form, setForm] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Access & Security state
  const [passwordInput, setPasswordInput] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [collectedEmail, setCollectedEmail] = useState("");
  const [emailProvided, setEmailProvided] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Autosave / Draft recovery
  const [draftRestored, setDraftRestored] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Anti-cheat Proctoring stats
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);
  const [proctorWarningOpen, setProctorWarningOpen] = useState(false);
  const [proctorWarningMsg, setProctorWarningMsg] = useState("");

  // Timed form countdown
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSigned, setHasSigned] = useState(false);

  // Status & loading
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isInactive, setIsInactive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  // Active validation errors for field-level feedback
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Layout modes: 'standard' (All Questions), 'one-by-one' (Wizard), 'conversational' (AI Chat)
  const [layoutMode, setLayoutMode] = useState<'standard' | 'one-by-one' | 'conversational'>('standard');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [chatLog, setChatLog] = useState<{ sender: 'bot' | 'user'; text: string; qId?: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* -------------------------------------------------------------------------- */
  /* INITIAL LOAD & FORM RECOVERY                                               */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setIsPreview(searchParams.get('preview') === 'true');
    loadForm();
  }, [formId]);

  // Load form from API
  const loadForm = async () => {
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage("");
    try {
      const data = await api.get(`/forms/${formId}`);
      setForm(data);
      let loadedQuestions = data.questions || [];

      // Anti-cheat: Shuffle questions order if enabled
      if (data.settings?.shuffle_questions) {
        loadedQuestions = shuffleArray(loadedQuestions);
      }

      // Anti-cheat: Shuffle option choices if enabled
      if (data.settings?.shuffle_options) {
        loadedQuestions = loadedQuestions.map((q: any) => {
          if (q.options && Array.isArray(q.options) && q.options.length > 0) {
            return { ...q, options: shuffleArray(q.options) };
          }
          return q;
        });
      }

      setQuestions(loadedQuestions);

      // Read saved display mode preference from URL query parameter (?mode=...) or form settings
      const searchParams = new URLSearchParams(window.location.search);
      const queryMode = searchParams.get('mode');
      const savedMode = queryMode || data.settings?.display_mode || data.settings?.displayMode || data.theme?.layoutType;
      if (savedMode === 'wizard' || savedMode === 'one-by-one') {
        setLayoutMode('one-by-one');
      } else if (savedMode === 'chat' || savedMode === 'conversational') {
        setLayoutMode('conversational');
      } else {
        setLayoutMode('standard');
      }

      // Check form status: only PUBLISHED forms can accept responses (unless preview mode)
      const isPreviewMode = searchParams.get('preview') === 'true';

      if (data.status !== "PUBLISHED" && !isPreviewMode) {
        setIsInactive(true);
        if (data.status === "DRAFT") {
          setStatusMessage("This form is currently a draft and is not ready to accept responses.");
        } else if (data.status === "CLOSED") {
          setStatusMessage("This form has been closed by its author and is no longer accepting submissions.");
        } else {
          setStatusMessage("This form is not currently accepting responses.");
        }
        setIsLoading(false);
        return;
      }

      // Check if already submitted in this browser session (one-time submission)
      if (typeof window !== 'undefined' && !isPreviewMode) {
        const submittedKey = `promptform_submitted_${data.id || formId}`;
        if (localStorage.getItem(submittedKey) === 'true') {
          setSubmitted(true);
          setIsLoading(false);
          return;
        }
      }

      // Restore saved draft answers from localStorage if present
      if (typeof window !== 'undefined') {
        try {
          const draftKey = `promptform_draft_answers_${data.id || formId}`;
          const savedDraftStr = localStorage.getItem(draftKey);
          if (savedDraftStr) {
            const parsedDraft = JSON.parse(savedDraftStr);
            if (parsedDraft && typeof parsedDraft === 'object' && Object.keys(parsedDraft).length > 0) {
              setAnswers(parsedDraft);
              setDraftRestored(true);
              setAutosaveStatus('saved');
            }
          }
        } catch {
          // ignore draft parsing errors
        }

        // Prefill email if previously remembered
        const storedEmail = localStorage.getItem('promptform_user_email');
        if (storedEmail) {
          setCollectedEmail(storedEmail);
        }
      }

      // Analytics page view registration
      api.post(`/analytics/form/${data.id}/view`, {
        deviceType: typeof window !== 'undefined' && window.innerWidth < 768 ? "mobile" : "desktop",
        country: "US"
      }).catch(() => {});

      // Passcode protection check
      if (data.settings?.password) {
        setIsLocked(true);
      }

      // Email collection check
      if (data.settings?.collect_emails) {
        const storedEmail = localStorage.getItem('promptform_user_email');
        if (storedEmail) {
          setEmailProvided(true);
        } else {
          setEmailProvided(false);
        }
      } else {
        setEmailProvided(true);
      }

    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.status || 500);
      setErrorMessage(err.message || "Failed to load form. It may be private or deleted.");
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* AUTOSAVE TO LOCALSTORAGE                                                   */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!form || submitted) return;
    if (Object.keys(answers).length === 0) return;

    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    setAutosaveStatus('saving');
    draftSaveTimeoutRef.current = setTimeout(() => {
      try {
        const draftKey = `promptform_draft_answers_${form.id || formId}`;
        localStorage.setItem(draftKey, JSON.stringify(answers));
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('idle');
      }
    }, 400);

    return () => {
      if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    };
  }, [answers, form, formId, submitted]);

  const clearDraft = () => {
    if (window.confirm("Are you sure you want to clear your current draft and start fresh?")) {
      const draftKey = `promptform_draft_answers_${form?.id || formId}`;
      localStorage.removeItem(draftKey);
      setAnswers({});
      setDraftRestored(false);
      setAutosaveStatus('idle');
      setCurrentQuestionIndex(0);
      setValidationErrors({});
    }
  };

  /* -------------------------------------------------------------------------- */
  /* CONDITIONAL LOGIC CHECK                                                    */
  /* -------------------------------------------------------------------------- */
  const isQuestionVisible = useCallback((q: any, currentAnswers = answers): boolean => {
    if (!q.logic || !q.logic.condition) return true;
    
    const targetQId = q.logic.target_question_id;
    const targetVal = String(q.logic.condition.value || '').toLowerCase().trim();
    const currentAns = currentAnswers[targetQId];
    if (currentAns === undefined || currentAns === null) return q.logic.action !== "show";

    const operator = q.logic.condition.operator || "equals";
    let isMatch = false;

    if (Array.isArray(currentAns)) {
      const lowerArr = currentAns.map(v => String(v).toLowerCase().trim());
      if (operator === "contains" || operator === "equals") {
        isMatch = lowerArr.includes(targetVal);
      } else if (operator === "not_equals") {
        isMatch = !lowerArr.includes(targetVal);
      }
    } else {
      const currentStr = String(currentAns).toLowerCase().trim();
      if (operator === "equals") {
        isMatch = currentStr === targetVal;
      } else if (operator === "not_equals") {
        isMatch = currentStr !== targetVal;
      } else if (operator === "contains") {
        isMatch = currentStr.includes(targetVal);
      }
    }

    if (q.logic.action === "show") {
      return isMatch;
    } else if (q.logic.action === "hide") {
      return !isMatch;
    }
    return true;
  }, [answers]);

  // List of currently visible questions
  const visibleQuestions = useMemo(() => {
    return questions.filter(q => isQuestionVisible(q, answers));
  }, [questions, answers, isQuestionVisible]);

  // Count answered visible questions
  const answeredCount = useMemo(() => {
    return visibleQuestions.filter(q => {
      const val = answers[q.id];
      if (val === undefined || val === null) return false;
      if (typeof val === 'string' && val.trim() === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    }).length;
  }, [visibleQuestions, answers]);

  const completionPercentage = useMemo(() => {
    if (visibleQuestions.length === 0) return 0;
    return Math.round((answeredCount / visibleQuestions.length) * 100);
  }, [answeredCount, visibleQuestions.length]);

  /* -------------------------------------------------------------------------- */
  /* PROCTORING & ANTI-CHEAT                                                    */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!form || !form.settings?.anti_cheat_detection || submitted) return;

    const handleTabSwitchExceeded = (count: number) => {
      setIsFlagged(true);
      setStatusMessage(`Security Policy: Maximum tab switches exceeded (${count}/3). This session has been automatically closed and submitted.`);
      setSubmitted(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`promptform_submitted_${form?.id || formId}`, 'true');
      }
      handleSubmitForm(undefined, true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            setIsFlagged(true);
            setProctorWarningMsg(`CRITICAL SECURITY ALERT: Tab switch limit exceeded (${newCount}/3). Closing and submitting form...`);
            setProctorWarningOpen(true);
            setTimeout(() => {
              handleTabSwitchExceeded(newCount);
            }, 600);
          } else {
            setProctorWarningMsg(`WARNING: Tab switch detected! You navigated away from the form (${newCount}/3 warnings). Leaving the tab again will auto-close your form.`);
            setProctorWarningOpen(true);
          }
          return newCount;
        });
      }
    };

    const handleWindowBlur = () => {
      setTabSwitchCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          setIsFlagged(true);
          setProctorWarningMsg(`CRITICAL SECURITY ALERT: Window focus lost limit exceeded (${newCount}/3). Closing and submitting form...`);
          setProctorWarningOpen(true);
          setTimeout(() => {
            handleTabSwitchExceeded(newCount);
          }, 600);
        } else {
          setProctorWarningMsg(`WARNING: Window focus lost! Please remain on this form page (${newCount}/3 warnings).`);
          setProctorWarningOpen(true);
        }
        return newCount;
      });
    };

    const preventCopyPaste = (e: Event) => {
      e.preventDefault();
      alert("Copying and pasting is disabled on this proctored form.");
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('paste', preventCopyPaste);
    document.addEventListener('cut', preventCopyPaste);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('paste', preventCopyPaste);
      document.removeEventListener('cut', preventCopyPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [form, submitted]);

  /* -------------------------------------------------------------------------- */
  /* TIMER COUNTDOWN                                                            */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!form || submitted) return;
    const limitMinutes = Number(form.settings?.timer_limit) || 0;
    if (limitMinutes <= 0) {
      setTimeLeft(null);
      return;
    }

    const storageKey = `promptform_form_timer_start_${form.id || formId}`;
    const limitKey = `promptform_form_timer_limit_${form.id || formId}`;

    let startTimeStr = localStorage.getItem(storageKey);
    let storedLimitStr = localStorage.getItem(limitKey);
    let startTime = Date.now();

    if (!startTimeStr || storedLimitStr !== String(limitMinutes)) {
      startTime = Date.now();
      localStorage.setItem(storageKey, String(startTime));
      localStorage.setItem(limitKey, String(limitMinutes));
    } else {
      startTime = Number(startTimeStr);
    }

    const totalSeconds = limitMinutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const initialRemaining = Math.max(0, totalSeconds - elapsedSeconds);

    setTimeLeft(initialRemaining);

    if (initialRemaining === 0) {
      autoSubmitForm();
      return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          autoSubmitForm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [form, submitted]);

  const autoSubmitForm = () => {
    setStatusMessage("Time limit expired! Your answers have been automatically submitted and the form is now closed.");
    setSubmitted(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`promptform_submitted_${form?.id || formId}`, 'true');
    }
    handleSubmitForm(undefined, true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  /* -------------------------------------------------------------------------- */
  /* CHATBOT MODE LOGIC                                                         */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (layoutMode === 'conversational') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog, layoutMode]);

  useEffect(() => {
    if (visibleQuestions.length > 0 && emailProvided && !isLocked && chatLog.length === 0) {
      const firstQ = visibleQuestions[0];
      setChatLog([
        { sender: 'bot', text: `Hi there! 👋 Welcome to **${form?.title || 'this form'}**.\nLet's begin with the first question:` },
        { sender: 'bot', text: `${firstQ.label}${firstQ.required ? ' *' : ''}`, qId: firstQ.id }
      ]);
      setCurrentQuestionIndex(0);
    }
  }, [visibleQuestions, emailProvided, isLocked]);

  const handleChatAnswerSubmit = (value: any) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }

    const currentQ = visibleQuestions[currentQuestionIndex];
    if (!currentQ) return;

    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    let userDisplayText = String(value);
    if (currentQ.type === 'password') {
      userDisplayText = '••••••••';
    } else if (currentQ.type === 'signature') {
      userDisplayText = '✒️ Signature captured';
    }

    const updatedLog = [
      ...chatLog,
      { sender: 'user' as const, text: userDisplayText }
    ];

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < visibleQuestions.length) {
      const nextQ = visibleQuestions[nextIndex];
      setCurrentQuestionIndex(nextIndex);
      setChatLog([
        ...updatedLog,
        { sender: 'bot' as const, text: `${nextQ.label}${nextQ.required ? ' *' : ''}`, qId: nextQ.id }
      ]);
    } else {
      setCurrentQuestionIndex(visibleQuestions.length);
      setChatLog([
        ...updatedLog,
        { sender: 'bot' as const, text: "🎉 Excellent! You have answered all visible questions. Click below to submit your response." }
      ]);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* FORM SUBMISSION                                                            */
  /* -------------------------------------------------------------------------- */
  const handleSubmitForm = async (e?: React.FormEvent, isForceSubmit: boolean = false) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!isForceSubmit) {
      // Check required fields
      const missing: string[] = [];
      const newErrors: Record<string, string> = {};

      visibleQuestions.forEach(q => {
        if (q.required) {
          const ans = answers[q.id];
          if (ans === undefined || ans === null || String(ans).trim() === '' || (Array.isArray(ans) && ans.length === 0)) {
            missing.push(q.label || `Question ${q.orderIndex + 1}`);
            newErrors[q.id] = "This question is required";
          }
        }
      });

      if (missing.length > 0) {
        setValidationErrors(newErrors);
        if (layoutMode === 'one-by-one') {
          const firstMissingIdx = visibleQuestions.findIndex(q => newErrors[q.id]);
          if (firstMissingIdx !== -1) {
            setCurrentQuestionIndex(firstMissingIdx);
          }
        } else if (layoutMode === 'standard') {
          const firstMissingQ = visibleQuestions.find(q => newErrors[q.id]);
          if (firstMissingQ) {
            const el = document.getElementById(`question-card-${firstMissingQ.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setActiveQuestionId(firstMissingQ.id);
            }
          }
        }
        return;
      }
    }

    setValidationErrors({});
    setIsSubmitting(true);

    let finalAnswers = { ...answers };
    if (canvasRef.current && hasSigned) {
      finalAnswers['signature_pad_url'] = canvasRef.current.toDataURL("image/png");
    }

    let emailToSubmit = form?.settings?.collect_emails ? collectedEmail : (typeof window !== 'undefined' ? localStorage.getItem('promptform_user_email') : null);
    let userToSubmit = typeof window !== 'undefined' ? localStorage.getItem('promptform_user_name') : null;

    if (!emailToSubmit) {
      const emailQ = questions.find(q => 
        q.type === 'email' || 
        (q.type === 'short_text' && q.label.toLowerCase().includes('email'))
      );
      if (emailQ && answers[emailQ.id]) {
        const emailStr = String(answers[emailQ.id]).trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          emailToSubmit = emailStr;
        }
      }
    }

    if (!userToSubmit) {
      const nameQ = questions.find(q => 
        q.type === 'name' || 
        (q.type === 'short_text' && (q.label.toLowerCase().includes('name') || q.label.toLowerCase().includes('fullname')))
      );
      if (nameQ && answers[nameQ.id]) {
        userToSubmit = String(answers[nameQ.id]).trim();
      }
    }

    const payload = {
      answers: finalAnswers,
      browserMetadata: {
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        ip_address: "",
        tab_switches: tabSwitchCount,
        is_flagged: isFlagged
      },
      timeTaken: Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000)),
      email: emailToSubmit || null,
      submittedBy: userToSubmit || null,
      password: passwordInput || undefined,
      isForceSubmit: isForceSubmit
    };

    if (isPreview) {
      setSubmitted(true);
      setIsSubmitting(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`promptform_form_timer_start_${form?.id || formId}`);
        localStorage.removeItem(`promptform_draft_answers_${form?.id || formId}`);
      }
      return;
    }

    try {
      await api.post(`/forms/${form?.id || formId}/submit`, payload);
      setSubmitted(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`promptform_form_timer_start_${form?.id || formId}`);
        localStorage.removeItem(`promptform_draft_answers_${form?.id || formId}`);
        localStorage.setItem(`promptform_submitted_${form?.id || formId}`, 'true');
      }
    } catch (err: any) {
      if (isForceSubmit) {
        setSubmitted(true);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`promptform_form_timer_start_${form?.id || formId}`);
          localStorage.removeItem(`promptform_draft_answers_${form?.id || formId}`);
          localStorage.setItem(`promptform_submitted_${form?.id || formId}`, 'true');
        }
      } else {
        alert("Submission error: " + (err.message || "Failed to submit response. Please try again."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* QUIZ SCORING CALCULATION                                                   */
  /* -------------------------------------------------------------------------- */
  const calculateQuizResults = () => {
    let totalPossiblePoints = 0;
    let earnedPoints = 0;
    const questionsBreakdown = questions.map((q: any) => {
      const correctAns = q.validations?.correct_answer || q.correctAnswer;
      const explanation = q.validations?.explanation || q.explanation;
      const isGraded = ['short_text', 'mcq', 'dropdown', 'checkbox', 'one_option'].includes(q.type) && Boolean(correctAns);
      const points = (q.validations?.points ?? q.points) || (isGraded ? 10 : 0);
      
      if (isGraded) {
        totalPossiblePoints += points;
      }

      const studentAns = answers[q.id];
      let isCorrect = false;
      if (isGraded && studentAns !== undefined && studentAns !== null) {
        const studentAnsStr = String(studentAns).trim().toLowerCase();
        const correctAnsStr = String(correctAns).trim().toLowerCase();
        isCorrect = studentAnsStr === correctAnsStr;
        if (isCorrect) {
          earnedPoints += points;
        }
      }

      return {
        questionLabel: q.label,
        studentAnswer: studentAns || '(No Answer)',
        correctAnswer: correctAns,
        explanation,
        isCorrect,
        points: isGraded ? points : 0,
        earned: isGraded && isCorrect ? points : 0,
        isGraded
      };
    });

    return {
      totalPossiblePoints,
      earnedPoints,
      questionsBreakdown
    };
  };

  /* -------------------------------------------------------------------------- */
  /* THEME STYLES & FONTS                                                       */
  /* -------------------------------------------------------------------------- */
  const primaryColor = form?.theme?.primary_color || '#4F46E5';
  const backgroundColor = form?.theme?.background_color || '#F8FAFC';
  const rawFontFamily = form?.theme?.font_family || 'Inter';
  const FONT_MAP: Record<string, string> = {
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
  const resolvedFont = FONT_MAP[rawFontFamily] || `${rawFontFamily}, sans-serif`;

  /* -------------------------------------------------------------------------- */
  /* LOADING STATE                                                              */
  /* -------------------------------------------------------------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Opening form...</p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* ERROR / RESTRICTED ACCESS STATE                                            */
  /* -------------------------------------------------------------------------- */
  if (errorMessage || errorStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-t-4 border-t-rose-500 shadow-xl bg-white rounded-2xl">
          <CardHeader className="pt-8">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Access Restricted</CardTitle>
            <CardDescription className="text-sm mt-2 text-slate-500">
              {errorMessage || "You do not have permission to view or fill this form."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-8">
            <Button className="w-full h-11 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl" onClick={() => router.push(`/login?redirect=f/${formId}`)}>
              Sign In to PromptForm
            </Button>
            <Button variant="outline" className="w-full h-11 text-xs font-semibold rounded-xl text-slate-700" onClick={() => router.push('/')}>
              Return to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* INACTIVE / CLOSED FORM STATE                                               */
  /* -------------------------------------------------------------------------- */
  if (isInactive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-t-4 border-t-amber-500 shadow-xl bg-white rounded-2xl">
          <CardHeader className="pt-8">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Form Closed</CardTitle>
            <CardDescription className="text-sm mt-2 text-slate-500">
              {statusMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <Button variant="outline" className="w-full h-11 text-xs font-semibold rounded-xl" onClick={() => router.push('/')}>
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* PASSWORD PROTECTED UNLOCK VIEW                                             */
  /* -------------------------------------------------------------------------- */
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl bg-white rounded-2xl border border-slate-200">
          <CardHeader className="text-center pt-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Passcode Required</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">This questionnaire is protected with a security passcode.</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === form?.settings?.password) {
                setIsLocked(false);
              } else {
                alert("Incorrect passcode. Access denied.");
              }
            }} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter passcode..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="h-11 rounded-xl text-center tracking-widest text-sm"
              />
              <Button type="submit" style={{ backgroundColor: primaryColor }} className="w-full h-11 text-white font-semibold rounded-xl">
                Unlock Questionnaire
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* EMAIL COLLECTION LOCK VIEW                                                 */
  /* -------------------------------------------------------------------------- */
  if (!emailProvided) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl bg-white rounded-2xl border border-slate-200">
          <CardHeader className="text-center pt-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Enter Your Email</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">The form creator requires email verification before proceeding.</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (collectedEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collectedEmail.trim())) {
                setEmailProvided(true);
                localStorage.setItem('promptform_user_email', collectedEmail.trim());
                startTimeRef.current = Date.now();
              } else {
                alert("Please enter a valid email address.");
              }
            }} className="space-y-4">
              <Input
                type="email"
                placeholder="name@example.com"
                value={collectedEmail}
                onChange={(e) => setCollectedEmail(e.target.value)}
                required
                className="h-11 rounded-xl text-sm"
              />
              <Button type="submit" style={{ backgroundColor: primaryColor }} className="w-full h-11 text-white font-semibold rounded-xl">
                Continue to Form →
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* THANK YOU / QUIZ SCORE SUBMITTED SCREEN                                    */
  /* -------------------------------------------------------------------------- */
  if (submitted) {
    const quizResults = calculateQuizResults();
    const hasQuiz = quizResults.totalPossiblePoints > 0;
    const scorePct = hasQuiz ? Math.round((quizResults.earnedPoints / quizResults.totalPossiblePoints) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-xl text-center border-t-[8px] shadow-2xl bg-white rounded-3xl p-6 md:p-8" style={{ borderTopColor: primaryColor }}>
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Response Recorded!</h2>
          <p className="text-sm text-slate-500 mt-2">
            Thank you for filling out <span className="font-semibold text-slate-800">{form?.title || 'this form'}</span>. Your answers have been securely registered.
          </p>

          {/* Graded Quiz Score Card */}
          {hasQuiz && (
            <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-4">
              <div className="flex flex-col items-center justify-center text-center pb-2 border-b border-slate-200/80">
                <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Assessment Score</span>
                <div className="text-4xl md:text-5xl font-black text-slate-900 mt-1">
                  {quizResults.earnedPoints} <span className="text-xl font-normal text-slate-400">/ {quizResults.totalPossiblePoints} Marks</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    scorePct >= 80 ? 'bg-emerald-100 text-emerald-700' :
                    scorePct >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {scorePct}% Score • {scorePct >= 80 ? 'Grade A (Distinction)' : scorePct >= 50 ? 'Grade B (Pass)' : 'Needs Improvement'}
                  </span>
                </div>
              </div>

              {/* Questions breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Answer Breakdown</h4>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {quizResults.questionsBreakdown.map((item: any, qIdx: number) => (
                    <div key={qIdx} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-bold text-slate-800">
                          {qIdx + 1}. {item.questionLabel}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2 ${
                          item.isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.earned} / {item.points} Pts
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Your Answer: <span className={item.isCorrect ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>{item.studentAnswer}</span>
                      </p>
                      {!item.isCorrect && item.correctAnswer && (
                        <p className="text-xs text-emerald-700 font-medium">
                          ✓ Correct: <span className="font-semibold underline">{item.correctAnswer}</span>
                        </p>
                      )}
                      {item.explanation && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                          💡 <b>Explanation:</b> {item.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {form?.settings?.anti_cheat_detection && (
            <p className="text-[11px] text-slate-400 mt-4">
              🛡️ Proctor session security signature logged successfully.
            </p>
          )}

          <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <span>Powered by</span>
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-indigo-600 text-white flex items-center justify-center text-[8px] font-black">P</span>
              PromptForm
            </span>
          </div>
        </Card>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* RENDER QUESTION INPUT CONTROLS                                             */
  /* -------------------------------------------------------------------------- */
  const renderQuestionControl = (q: any, isFocused = false) => {
    const isAlphanumericId = /roll|enrollment|student id|id number|registration|code/i.test(q.label || '');
    const isStrictNumeric = (q.type === 'amount' || q.type === 'price' || q.type === 'number') && !isAlphanumericId;
    const inputType = q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'website' ? 'url' : isStrictNumeric ? 'number' : 'text';

    // Short text & text variants
    if (['short_text', 'standard-input', 'text', 'name', 'first_name', 'last_name', 'full_name', 'email', 'email_address', 'phone', 'contact', 'mobile', 'telephone', 'website', 'url', 'amount', 'price', 'number', 'age', 'quantity', 'count'].includes(q.type)) {
      return (
        <div className="relative flex items-center w-full">
          {q.type === 'name' && <User className="absolute left-3.5 w-4 h-4 text-slate-400" />}
          {q.type === 'email' && <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />}
          {q.type === 'phone' && <Phone className="absolute left-3.5 w-4 h-4 text-slate-400" />}
          {q.type === 'website' && <LinkIcon className="absolute left-3.5 w-4 h-4 text-slate-400" />}
          {(q.type === 'amount' || isAlphanumericId) && <Hash className="absolute left-3.5 w-4 h-4 text-slate-400" />}
          {q.type === 'price' && <DollarSign className="absolute left-3.5 w-4 h-4 text-slate-400" />}
          
          <input
            type={inputType}
            step={q.type === 'price' ? '0.01' : '0.001'}
            min={isStrictNumeric ? 0 : undefined}
            onKeyDown={(e) => { if (isStrictNumeric && (e.key === '-' || e.key === 'e')) e.preventDefault(); }}
            placeholder={
              isAlphanumericId ? 'e.g. 23SE02CSS1199' :
              q.type === 'name' ? 'e.g. Jane Doe' :
              q.type === 'email' ? 'e.g. jane@example.com' :
              q.type === 'phone' ? 'e.g. +1 (555) 019-2834' :
              q.type === 'website' ? 'e.g. https://portfolio.com' :
              q.type === 'price' ? '0.00' :
              'Your answer'
            }
            value={answers[q.id] || ""}
            onChange={(e) => {
              let val = e.target.value;
              if (isStrictNumeric) {
                val = val.replace(/-/g, '');
                if (val !== '') {
                  val = Math.max(0, parseFloat(val) || 0).toString();
                }
              }
              setAnswers({ ...answers, [q.id]: val });
              if (validationErrors[q.id]) {
                setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
              }
            }}
            required={q.required}
            className={`w-full h-12 bg-white border rounded-xl text-sm transition-all focus:outline-none ${
              validationErrors[q.id] 
                ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' 
                : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50'
            } ${['name', 'email', 'phone', 'website', 'amount', 'price'].includes(q.type) || isAlphanumericId ? 'pl-10 pr-4' : 'px-4'}`}
          />
        </div>
      );
    }

    // Password field
    if (q.type === 'password') {
      return (
        <div className="relative flex items-center w-full">
          <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
          <input
            type={showPasswords[q.id] ? "text" : "password"}
            placeholder="Enter password..."
            value={answers[q.id] || ""}
            onChange={(e) => {
              setAnswers({ ...answers, [q.id]: e.target.value });
              if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
            }}
            required={q.required}
            className={`w-full h-12 pl-10 pr-11 bg-white border rounded-xl text-sm transition-all focus:outline-none ${
              validationErrors[q.id] 
                ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' 
                : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPasswords({ ...showPasswords, [q.id]: !showPasswords[q.id] })}
            className="absolute right-3.5 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0"
          >
            {showPasswords[q.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      );
    }

    // Long text / Paragraph / Feedback / Address
    if (['long_text', 'feedback', 'address', 'paragraph', 'textarea', 'comments', 'description', 'message'].includes(q.type)) {
      return (
        <div className="relative w-full">
          {q.type === 'address' && <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />}
          <textarea
            rows={4}
            placeholder={q.type === 'address' ? 'Street, Apartment, City, State, ZIP...' : 'Type your answer here...'}
            value={answers[q.id] || ""}
            onChange={(e) => {
              setAnswers({ ...answers, [q.id]: e.target.value });
              if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
            }}
            required={q.required}
            className={`w-full py-3 bg-white border rounded-xl text-sm transition-all resize-y min-h-[100px] focus:outline-none ${
              validationErrors[q.id] 
                ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' 
                : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50'
            } ${q.type === 'address' ? 'pl-10 pr-4' : 'px-4'}`}
          />
        </div>
      );
    }

    // Multiple Choice / Radio (Google Forms style cards)
    if (['mcq', 'one_option', 'gender', 'radio', 'single_choice'].includes(q.type)) {
      const options = q.options && q.options.length > 0 
        ? q.options 
        : (q.type === 'gender' ? ['Female', 'Male', 'Non-binary', 'Prefer not to say'] : ['Option 1', 'Option 2', 'Option 3']);

      return (
        <div className={q.option_layout === 'horizontal' ? "flex flex-wrap gap-2.5" : "space-y-2.5"}>
          {options.map((opt: string, oIdx: number) => {
            const isSelected = answers[q.id] === opt;
            return (
              <label 
                key={oIdx} 
                className={`flex items-center min-h-[48px] px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none ${
                  isSelected 
                    ? 'bg-indigo-50/70 border-indigo-600 text-indigo-950 shadow-xs' 
                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
                style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10`, color: primaryColor } : undefined}
              >
                <div className="relative flex items-center justify-center mr-3.5">
                  <input
                    type="radio"
                    name={`radio_${q.id}`}
                    checked={isSelected}
                    onChange={() => {
                      setAnswers({ ...answers, [q.id]: opt });
                      if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
                    }}
                    className="sr-only"
                  />
                  <div 
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-indigo-600' : 'border-slate-300'
                    }`}
                    style={isSelected ? { borderColor: primaryColor } : undefined}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" style={{ backgroundColor: primaryColor }} />
                    )}
                  </div>
                </div>
                <span className="flex-1 leading-snug">{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // Checkboxes / Multi-select
    if (['checkbox', 'multiple_options', 'multi_choice', 'checkboxes'].includes(q.type)) {
      const options = q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2'];

      return (
        <div className={q.option_layout === 'horizontal' ? "flex flex-wrap gap-2.5" : "space-y-2.5"}>
          {options.map((opt: string, oIdx: number) => {
            const currentVals = Array.isArray(answers[q.id]) 
              ? answers[q.id] 
              : (answers[q.id] ? String(answers[q.id]).split(', ') : []);
            const isChecked = currentVals.includes(opt);

            return (
              <label 
                key={oIdx} 
                className={`flex items-center min-h-[48px] px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none ${
                  isChecked 
                    ? 'bg-indigo-50/70 border-indigo-600 text-indigo-950 shadow-xs' 
                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
                style={isChecked ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10`, color: primaryColor } : undefined}
              >
                <div className="relative flex items-center justify-center mr-3.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      let nextVals;
                      if (e.target.checked) {
                        nextVals = [...currentVals, opt];
                      } else {
                        nextVals = currentVals.filter((v: string) => v !== opt);
                      }
                      setAnswers({ ...answers, [q.id]: nextVals.join(', ') });
                      if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
                    }}
                    className="sr-only"
                  />
                  <div 
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                    }`}
                    style={isChecked ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <span className="flex-1 leading-snug">{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // Dropdown / Country
    if (['dropdown', 'country', 'select'].includes(q.type)) {
      const options = q.options && q.options.length > 0 
        ? q.options 
        : (q.type === 'country' ? ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Japan', 'Brazil', 'Other'] : ['Option 1', 'Option 2']);

      return (
        <div className="relative w-full">
          <select
            value={answers[q.id] || ""}
            onChange={(e) => {
              setAnswers({ ...answers, [q.id]: e.target.value });
              if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
            }}
            required={q.required}
            className="w-full h-12 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm text-slate-800 transition-all focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 cursor-pointer appearance-none"
          >
            <option value="" disabled>Choose an option...</option>
            {options.map((opt: string, oIdx: number) => (
              <option key={oIdx} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
            </svg>
          </div>
        </div>
      );
    }

    // Agreement / Consent
    if (['agreement', 'consent'].includes(q.type)) {
      const isAgreed = answers[q.id] === "Agreed & Signed";

      return (
        <label className={`flex items-start p-4 rounded-xl border transition-all cursor-pointer select-none ${
          isAgreed ? 'bg-indigo-50/60 border-indigo-600 text-indigo-950' : 'bg-white border-slate-200 hover:border-slate-300'
        }`}>
          <div className="mt-0.5 mr-3">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => {
                setAnswers({ ...answers, [q.id]: e.target.checked ? "Agreed & Signed" : "" });
                if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
              }}
              required={q.required}
              className="sr-only"
            />
            <div 
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                isAgreed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
              }`}
              style={isAgreed ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
            >
              {isAgreed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
          <span className="text-xs text-slate-600 leading-relaxed font-medium">
            I understand and agree to the terms, conditions, and privacy guidelines mentioned for this questionnaire.
          </span>
        </label>
      );
    }

    // Emoji Satisfaction Scale
    if (['emoji-satisfaction-scale', 'emoji', 'satisfaction_emoji', 'mood'].includes(q.type)) {
      const emojis = q.options && q.options.length > 0 
        ? q.options 
        : ["🤩 Very Satisfied", "😋 Satisfied", "😐 Neutral", "🙁 Unsatisfied", "🤮 Very Poor"];

      return (
        <div className="grid grid-cols-5 gap-2 sm:gap-3 pt-1 w-full">
          {emojis.map((opt: string, oIdx: number) => {
            const isSelected = answers[q.id] === opt;
            const parts = opt.split(' ');
            const icon = parts[0];
            const label = parts.slice(1).join(' ');

            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => {
                  setAnswers({ ...answers, [q.id]: opt });
                  if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
                }}
                className={`flex flex-col items-center justify-center py-3 px-1 sm:px-2 rounded-2xl border transition-all cursor-pointer text-center ${
                  isSelected 
                    ? 'bg-indigo-50 border-indigo-600 shadow-sm scale-105' 
                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
                style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
              >
                <span className="text-2xl sm:text-3xl mb-1">{icon}</span>
                {label && <span className="text-[10px] sm:text-xs font-semibold truncate w-full text-slate-700">{label}</span>}
              </button>
            );
          })}
        </div>
      );
    }

    // Yes / No Toggle
    if (['yes_no', 'yes-no', 'boolean', 'toggle'].includes(q.type)) {
      return (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {["👍 Yes", "👎 No"].map((opt: string, oIdx: number) => {
            const isSelected = answers[q.id] === opt;
            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => {
                  setAnswers({ ...answers, [q.id]: opt });
                  if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
                }}
                className={`h-13 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isSelected 
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
                style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15`, color: primaryColor } : undefined}
              >
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      );
    }

    // Rating / Stars
    if (['rating', 'star_rating', 'star-rating', 'stars', 'satisfaction'].includes(q.type)) {
      const currentRating = Number(answers[q.id]) || 0;

      return (
        <div className="flex flex-col items-center py-2 space-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map((starVal) => {
              const isSelected = currentRating >= starVal;
              return (
                <button
                  key={starVal}
                  type="button"
                  onClick={() => {
                    setAnswers({ ...answers, [q.id]: starVal });
                    if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
                  }}
                  className="p-1 sm:p-2 transition-transform hover:scale-125 cursor-pointer border-none bg-transparent"
                  aria-label={`${starVal} stars`}
                >
                  <Star 
                    className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                      isSelected ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-slate-200 hover:text-amber-300'
                    }`} 
                  />
                </button>
              );
            })}
          </div>
          {currentRating > 0 && (
            <span className="text-xs font-bold text-slate-500">
              {currentRating} out of 5 Stars
            </span>
          )}
        </div>
      );
    }

    // Signature Pad
    if (q.type === 'signature') {
      return (
        <QuestionSignaturePad
          value={answers[q.id] || ""}
          onChange={(val) => {
            setAnswers({ ...answers, [q.id]: val });
            if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
          }}
          primaryColor={primaryColor}
        />
      );
    }

    // File Upload / Photo / Resume
    if (['file_upload', 'photo', 'resume', 'file-uploader', 'document', 'upload', 'file', 'image'].includes(q.type)) {
      const isPhoto = q.type === 'photo' || q.type === 'image';
      const isResume = q.type === 'resume';

      return (
        <div className="space-y-3 w-full">
          {answers[q.id] ? (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                {isPhoto && typeof answers[q.id] === 'string' && answers[q.id].startsWith('data:image') ? (
                  <img src={answers[q.id]} alt="Upload preview" className="w-12 h-12 rounded-lg object-cover border border-emerald-200" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileUp className="w-5 h-5" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-emerald-900 truncate">
                    {isPhoto ? 'Photograph attached' : answers[q.id]}
                  </p>
                  <p className="text-[10px] text-emerald-600">✓ Ready for submission</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAnswers({ ...answers, [q.id]: null })}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline border-none bg-transparent cursor-pointer p-0 ml-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-center group">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors mb-2">
                {isPhoto ? <ImageIcon className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
              </div>
              <p className="text-xs font-bold text-slate-800">
                {isResume ? 'Upload Resume / CV' : isPhoto ? 'Upload Photo / Image' : 'Select a file to attach'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isResume ? 'PDF, DOC, DOCX up to 10MB' : isPhoto ? 'PNG, JPG, WEBP up to 5MB' : 'Max file size 10MB'}
              </p>
              <input
                type="file"
                accept={isPhoto ? 'image/*' : isResume ? '.pdf,.doc,.docx' : undefined}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (isPhoto) {
                      const reader = new FileReader();
                      reader.onload = () => setAnswers({ ...answers, [q.id]: reader.result });
                      reader.readAsDataURL(file);
                    } else {
                      setAnswers({ ...answers, [q.id]: file.name });
                    }
                    if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
                  }
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
      );
    }

    // Date & Time
    if (['date', 'dob', 'birthday', 'date_of_birth', 'birth_date'].includes(q.type)) {
      return (
        <div className="relative flex items-center w-full">
          <Calendar className="absolute left-3.5 w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={answers[q.id] || ""}
            onChange={(e) => {
              setAnswers({ ...answers, [q.id]: e.target.value });
              if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
            }}
            required={q.required}
            className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
          />
        </div>
      );
    }

    if (['time', 'appointment_time'].includes(q.type)) {
      return (
        <div className="relative flex items-center w-full">
          <Clock className="absolute left-3.5 w-4 h-4 text-slate-400" />
          <input
            type="time"
            value={answers[q.id] || ""}
            onChange={(e) => {
              setAnswers({ ...answers, [q.id]: e.target.value });
              if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
            }}
            required={q.required}
            className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
          />
        </div>
      );
    }

    // Color picker
    if (q.type === 'color') {
      return (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={answers[q.id] || "#6366f1"}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent"
          />
          <span className="text-xs font-mono font-bold uppercase text-slate-700">
            {answers[q.id] || "#6366f1"}
          </span>
        </div>
      );
    }

    // Location / Map selector
    if (['location', 'location-selector', 'map'].includes(q.type)) {
      return (
        <div className="space-y-3 w-full">
          <div className="relative flex items-center w-full">
            <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search address or location..."
              value={answers[q.id] || ""}
              onChange={(e) => {
                setAnswers({ ...answers, [q.id]: e.target.value });
                if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
              }}
              required={q.required}
              className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
            />
          </div>
          {answers[q.id] && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-medium text-slate-600">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="truncate">Pin selected: {answers[q.id]}</span>
            </div>
          )}
        </div>
      );
    }

    // OTP / Verification Code
    if (q.type === 'otp') {
      return (
        <div className="space-y-2">
          <div className="flex gap-1.5 sm:gap-2 justify-start max-w-full overflow-x-auto py-1">
            {[0, 1, 2, 3, 4, 5].map((digitIdx) => {
              const otpVal = answers[q.id] || "";
              const val = otpVal[digitIdx] || "";
              return (
                <input
                  key={digitIdx}
                  id={`otp-${q.id}-${digitIdx}`}
                  type="text"
                  maxLength={1}
                  value={val}
                  onChange={(e) => {
                    const enteredChar = e.target.value.replace(/[^0-9]/g, "");
                    const currentOTP = (answers[q.id] || "").split("");
                    currentOTP[digitIdx] = enteredChar;
                    const nextOTPStr = currentOTP.join("").slice(0, 6);
                    setAnswers({ ...answers, [q.id]: nextOTPStr });
                    if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
                    if (enteredChar && digitIdx < 5) {
                      const nextInput = document.getElementById(`otp-${q.id}-${digitIdx + 1}`);
                      if (nextInput) nextInput.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !val && digitIdx > 0) {
                      const prevInput = document.getElementById(`otp-${q.id}-${digitIdx - 1}`);
                      if (prevInput) {
                        prevInput.focus();
                        const currentOTP = (answers[q.id] || "").split("");
                        currentOTP[digitIdx - 1] = "";
                        setAnswers({ ...answers, [q.id]: currentOTP.join("") });
                      }
                    }
                  }}
                  className="w-9 sm:w-11 h-12 text-center text-base sm:text-lg font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 flex-1 max-w-[48px]"
                />
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">Enter the 6-digit code</p>
        </div>
      );
    }

    // Payment Simulator
    if (q.type === 'payment') {
      return (
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3 w-full">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Card Information</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <input
            type="text"
            placeholder="Card Number (4242 •••• •••• 4242)"
            value={answers[q.id]?.cardNumber || ""}
            onChange={(e) => setAnswers({ 
              ...answers, 
              [q.id]: { ...answers[q.id], cardNumber: e.target.value } 
            })}
            required={q.required}
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="MM / YY"
              value={answers[q.id]?.expiry || ""}
              onChange={(e) => setAnswers({ 
                ...answers, 
                [q.id]: { ...answers[q.id], expiry: e.target.value } 
              })}
              required={q.required}
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
            />
            <input
              type="text"
              placeholder="CVC"
              value={answers[q.id]?.cvc || ""}
              onChange={(e) => setAnswers({ 
                ...answers, 
                [q.id]: { ...answers[q.id], cvc: e.target.value } 
              })}
              required={q.required}
              className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>
      );
    }

    // Default fallback input
    return (
      <input
        type="text"
        placeholder="Your answer"
        value={answers[q.id] || ""}
        onChange={(e) => {
          setAnswers({ ...answers, [q.id]: e.target.value });
          if (validationErrors[q.id]) setValidationErrors(prev => ({ ...prev, [q.id]: "" }));
        }}
        required={q.required}
        className="w-full h-12 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
      />
    );
  };

  /* -------------------------------------------------------------------------- */
  /* FORM INTRO SCREEN (Before user starts)                                     */
  /* -------------------------------------------------------------------------- */
  if (!hasStarted && Object.keys(answers).length === 0) {
    const estimatedMinutes = Math.max(1, Math.ceil(questions.length * 0.5));

    return (
      <div 
        dir={form?.theme?.rtl ? "rtl" : "ltr"}
        className="min-h-screen pb-16 text-slate-800"
        style={{ backgroundColor, fontFamily: resolvedFont }}
      >
        {/* Top Preview Banner if in preview mode */}
        {isPreview && (
          <div className="bg-indigo-600 text-white py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Preview Mode: Live test responder view. Submissions are mock only.</span>
          </div>
        )}

        {/* Minimal Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs" style={{ backgroundColor: primaryColor }}>
              P
            </span>
            <span className="font-bold text-slate-900 text-sm tracking-tight">PromptForm</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Public Responder</span>
        </header>

        {/* Intro Card Container */}
        <main className="max-w-2xl mx-auto px-4 mt-8 sm:mt-12 space-y-6">
          <Card className="border-t-[8px] bg-white rounded-3xl shadow-xl overflow-hidden border-slate-200/90" style={{ borderTopColor: primaryColor }}>
            {form?.theme?.banner_url && (
              <div className="w-full h-44 overflow-hidden relative border-b border-slate-100">
                <img src={form.theme.banner_url} alt="Banner" className="w-full h-full object-cover" />
              </div>
            )}
            
            <CardHeader className="p-6 sm:p-8 space-y-3">
              {form?.theme?.logo_url && (
                <img src={form.theme.logo_url} alt="Logo" className="max-h-12 w-auto mb-2 object-contain" />
              )}
              <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {form?.title || "Untitled Form"}
              </CardTitle>
              {form?.description && (
                <CardDescription className="text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                  {form.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="px-6 sm:px-8 pb-8 space-y-6">
              {/* Form Metadata Badges */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  {questions.length} Questions
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  ~{estimatedMinutes} min to complete
                </span>
                {form?.settings?.timer_limit > 0 && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    Timed Exam ({form.settings.timer_limit} mins)
                  </span>
                )}
                {form?.settings?.anti_cheat_detection && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    Proctored Session
                  </span>
                )}
                {form?.settings?.shuffle_questions && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
                    Randomized Order
                  </span>
                )}
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                  {layoutMode === 'one-by-one' ? '⚡ One-by-One Form' : layoutMode === 'conversational' ? '💬 AI Chat Form' : '📋 Standard Form'}
                </span>
              </div>

              {/* Email note */}
              {form?.settings?.collect_emails && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Submitting response as: <b>{collectedEmail}</b></span>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <div className="pt-2">
                <Button
                  onClick={() => setHasStarted(true)}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full h-13 text-sm font-bold text-white rounded-2xl shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <span>Start Form</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer Branding */}
          <footer className="text-center space-y-1">
            <p className="text-[11px] text-slate-400">Never submit passwords or sensitive information through untrusted forms.</p>
            <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
              Powered by <span className="font-bold text-slate-700">PromptForm</span>
            </p>
          </footer>
        </main>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* MAIN RESPONDER INTERFACE                                                   */
  /* -------------------------------------------------------------------------- */
  return (
    <div 
      dir={form?.theme?.rtl ? "rtl" : "ltr"}
      className="min-h-screen pb-28 text-slate-800 transition-colors"
      style={{ backgroundColor, fontFamily: resolvedFont }}
    >
      {/* Top Preview Banner */}
      {isPreview && (
        <div className="bg-indigo-600 text-white py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-xs sticky top-0 z-50">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Preview Mode: Live test responder view. Submissions are mock only.</span>
        </div>
      )}

      {/* Timer Bar if form has a timer limit */}
      {timeLeft !== null && (
        <div className="bg-slate-900 text-white py-2.5 px-4 text-center text-xs font-bold flex items-center justify-between shadow-sm sticky top-0 z-40 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Form Time Limit Active:</span>
          </div>
          <div className="font-mono text-sm tracking-wider px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
            ⏱️ {formatTime(timeLeft)}
          </div>
        </div>
      )}

      {/* RESPONDER BODY BASED ON LAYOUT MODE */}
      <main className="w-full max-w-2xl mx-auto px-3 sm:px-4 mt-6 sm:mt-12 overflow-x-hidden">
        {/* ========================================================================= */}
        {/* MODE 1: ALL QUESTIONS VIEW (Google Forms Inspired)                        */}
        {/* ========================================================================= */}
        {layoutMode === 'standard' && (
          <form onSubmit={handleSubmitForm} className="space-y-4">
            {/* Header Card */}
            <Card className="border-t-[8px] bg-white rounded-3xl shadow-sm border-slate-200 overflow-hidden" style={{ borderTopColor: primaryColor }}>
              {form?.theme?.banner_url && (
                <div className="w-full h-36 overflow-hidden relative border-b border-slate-100">
                  <img src={form.theme.banner_url} alt="Banner" className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="p-6 sm:p-7 space-y-2">
                {form?.theme?.logo_url && (
                  <img src={form.theme.logo_url} alt="Logo" className="max-h-12 w-auto mb-2 object-contain" />
                )}
                <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {form?.title || "Form"}
                </CardTitle>
                {form?.description && (
                  <CardDescription className="text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                    {form.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <div className="px-6 sm:px-7 pb-5 pt-0 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                {form?.settings?.collect_emails ? (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Submitting as: <b>{collectedEmail}</b></span>
                  </div>
                ) : (
                  <span>PromptForm Responder</span>
                )}
                <span className="text-rose-500 font-semibold">* Indicates required question</span>
              </div>
            </Card>

            {/* Questions Vertical Stack */}
            {visibleQuestions.map((q, idx) => {
              const hasError = Boolean(validationErrors[q.id]);
              const isActive = activeQuestionId === q.id;

              return (
                <Card 
                  key={q.id}
                  id={`question-card-${q.id}`}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`bg-white rounded-2xl transition-all duration-200 border ${
                    hasError 
                      ? 'border-rose-400 ring-2 ring-rose-100 shadow-md' 
                      : isActive 
                        ? 'border-indigo-400 shadow-md ring-1 ring-indigo-100' 
                        : 'border-slate-200 shadow-xs hover:border-slate-300'
                  }`}
                >
                  <CardContent className="p-5 sm:p-6 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                        {idx + 1}. {q.label} {q.required && <span className="text-rose-500 font-bold">*</span>}
                      </p>
                    </div>

                    {/* Question Input Control */}
                    <div className="pt-1">
                      {renderQuestionControl(q, isActive)}
                    </div>

                    {/* Inline Validation Error Message */}
                    {hasError && (
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 animate-fadeIn">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{validationErrors[q.id]}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Bottom Form Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: primaryColor }}
                className="w-full sm:w-auto h-12 px-8 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Answers'}</span>
              </Button>

              <button
                type="button"
                onClick={clearDraft}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors p-2"
              >
                Clear form
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: ONE-BY-ONE WIZARD VIEW                                            */}
        {/* ========================================================================= */}
        {layoutMode === 'one-by-one' && (
          <div className="space-y-6">
            {/* Step Progress Pill */}
            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-600">
              <span className="text-indigo-600 font-mono" style={{ color: primaryColor }}>
                Question {currentQuestionIndex + 1} of {visibleQuestions.length}
              </span>
              <span>{completionPercentage}% Answered</span>
            </div>

            {/* Active Focused Question Card */}
            {visibleQuestions[currentQuestionIndex] && (() => {
              const q = visibleQuestions[currentQuestionIndex];
              const hasError = Boolean(validationErrors[q.id]);

              return (
                <Card className={`bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 transition-all ${
                  hasError ? 'border-rose-400 ring-4 ring-rose-100' : 'border-slate-200'
                }`}>
                  <CardHeader className="p-0 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-md" style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}>
                        Question {currentQuestionIndex + 1}
                      </span>
                      {q.required && <span className="text-xs font-bold text-rose-500">* Required</span>}
                    </div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 mt-3 leading-snug">
                      {q.label}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0 pt-6 space-y-4">
                    {renderQuestionControl(q, true)}

                    {hasError && (
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 animate-fadeIn">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{validationErrors[q.id]}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Navigation Actions (Desktop and Mobile) */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={currentQuestionIndex === 0}
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                  }
                }}
                className="h-11 px-5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              {currentQuestionIndex < visibleQuestions.length - 1 ? (
                <Button
                  type="button"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => {
                    const currentQ = visibleQuestions[currentQuestionIndex];
                    if (currentQ && currentQ.required) {
                      const ans = answers[currentQ.id];
                      if (ans === undefined || ans === null || String(ans).trim() === '' || (Array.isArray(ans) && ans.length === 0)) {
                        setValidationErrors({ [currentQ.id]: "Please answer this question before continuing" });
                        return;
                      }
                    }
                    setValidationErrors({});
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                  }}
                  className="h-11 px-6 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 hover:opacity-95"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmitForm}
                  disabled={isSubmitting}
                  style={{ backgroundColor: primaryColor }}
                  className="h-11 px-8 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-2 hover:opacity-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Final Answers'}</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: AI CONVERSATIONAL CHATBOT VIEW                                   */}
        {/* ========================================================================= */}
        {layoutMode === 'conversational' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[580px]">
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">PromptForm AI Assistant</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Active • Collecting responses</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {currentQuestionIndex} / {visibleQuestions.length}
              </span>
            </div>

            {/* Chat Message Timeline */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
              {chatLog.map((msg, mIdx) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={mIdx} className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                      isBot ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[82%] shadow-xs ${
                      isBot 
                        ? 'bg-white border border-slate-200/80 text-slate-800' 
                        : 'bg-indigo-600 text-white font-medium'
                    }`} style={!isBot ? { backgroundColor: primaryColor } : undefined}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Action Area */}
            <div className="p-4 border-t border-slate-100 bg-white">
              {currentQuestionIndex < visibleQuestions.length ? (
                (() => {
                  const currentQ = visibleQuestions[currentQuestionIndex];

                  // If option-based question, display click pills
                  if (['mcq', 'one_option', 'gender', 'dropdown', 'country', 'radio', 'single_choice', 'select'].includes(currentQ.type)) {
                    const options = currentQ.options && currentQ.options.length > 0 
                      ? currentQ.options 
                      : (currentQ.type === 'gender' ? ['Male', 'Female', 'Other', 'Prefer not to say'] : ['Option 1', 'Option 2']);

                    return (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-slate-400">Select an answer:</p>
                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                          {options.map((opt: string, oIdx: number) => (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleChatAnswerSubmit(opt)}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-semibold text-slate-700 border border-slate-200 transition-all cursor-pointer"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Default text input form
                  return (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const val = (e.currentTarget.elements.namedItem('chatAns') as HTMLInputElement).value;
                      handleChatAnswerSubmit(val);
                      e.currentTarget.reset();
                    }} className="flex items-center gap-2">
                      <input
                        name="chatAns"
                        type={currentQ.type === 'email' ? 'email' : currentQ.type === 'phone' ? 'tel' : 'text'}
                        placeholder="Type your response..."
                        autoFocus
                        required={currentQ.required}
                        className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                      />
                      <button
                        type="submit"
                        style={{ backgroundColor: primaryColor }}
                        className="w-11 h-11 rounded-xl text-white flex items-center justify-center border-none cursor-pointer hover:opacity-90"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  );
                })()
              ) : (
                <Button
                  onClick={handleSubmitForm}
                  disabled={isSubmitting}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full h-12 text-xs font-bold text-white rounded-xl shadow-md"
                >
                  {isSubmitting ? 'Submitting response...' : 'Submit Answers Now 🚀'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Global Footer */}
        <footer className="mt-12 text-center space-y-1">
          <p className="text-[11px] text-slate-400">Never submit passwords through PromptForm. Report abuse.</p>
          <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
            Powered by <span className="font-bold text-slate-700">PromptForm</span>
          </p>
        </footer>
      </main>

      {/* Proctor Warning Modal */}
      {proctorWarningOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white rounded-2xl shadow-2xl border-rose-300 animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center gap-2 pb-2 text-rose-600">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
              <CardTitle className="text-base font-bold">Proctor Alert Warning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                {proctorWarningMsg}
              </p>
              <div className="flex justify-end pt-2">
                {tabSwitchCount >= 3 ? (
                  <Button 
                    onClick={() => {
                      setProctorWarningOpen(false);
                      setSubmitted(true);
                    }}
                    className="h-10 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                  >
                    Close Session
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setProctorWarningOpen(false)}
                    className="h-10 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                  >
                    I Understand & Resume
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
