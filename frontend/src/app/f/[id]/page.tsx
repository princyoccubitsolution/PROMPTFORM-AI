"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Sparkles, Shield, Clock, Lock, Send, AlertTriangle, PenTool, ArrowRight, UserCheck, CreditCard,
  User, Mail, Phone, MapPin, Globe, Calendar, Star, Signature,
  FileUp, Image, Hash, DollarSign, Link, Eye, EyeOff, Bot, Mic
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

const QuestionSignaturePad = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
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
    <div className="space-y-2">
      <div className="border border-border dark:border-border rounded-lg overflow-hidden bg-background dark:bg-background">
        <canvas
          ref={canvasRef}
          width={600}
          height={120}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[120px] cursor-crosshair bg-card"
        />
      </div>
      <div className="flex justify-between items-center">
        {value ? (
          <span className="text-xs text-emerald-600 font-bold">✓ Signature Captured</span>
        ) : (
          <span className="text-xs text-muted-foreground">Please sign inside the box</span>
        )}
        <button type="button" onClick={clear} className="text-xs text-destructive hover:underline border-none bg-transparent cursor-pointer font-semibold">
          Clear Pad
        </button>
      </div>
    </div>
  );
};

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Security/access locks
  const [passwordInput, setPasswordInput] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [collectedEmail, setCollectedEmail] = useState("");
  const [emailProvided, setEmailProvided] = useState(false);

  // Proctoring stats
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);
  const [proctorWarningOpen, setProctorWarningOpen] = useState(false);
  const [proctorWarningMsg, setProctorWarningMsg] = useState("");

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Loading/submitting/access states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [layoutMode, setLayoutMode] = useState<'standard' | 'conversational' | 'one-by-one'>('one-by-one');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [chatLog, setChatLog] = useState<{ sender: 'bot' | 'user'; text: string; qId?: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (layoutMode === 'conversational') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog, layoutMode]);

  // Initialize chat log when questions load
  useEffect(() => {
    if (questions.length > 0 && emailProvided && !isLocked && chatLog.length === 0) {
      setChatLog([
        { sender: 'bot', text: `Hi there! 👋 Welcome to **${form?.title || 'Form'}**. Let's start with the first question.` },
        { sender: 'bot', text: `${questions[0].label}${questions[0].required ? ' *' : ''}`, qId: questions[0].id }
      ]);
      setCurrentQuestionIndex(0);
    }
  }, [questions, emailProvided, isLocked]);

  const handleAnswerSubmit = (value: any) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      alert("Please provide an answer.");
      return;
    }
    
    const currentQ = questions[currentQuestionIndex];
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);
    
    let userDisplayText = String(value);
    if (currentQ.type === 'password') {
      userDisplayText = '••••••••';
    } else if (currentQ.type === 'signature') {
      userDisplayText = '✒️ Signature Uploaded';
    }
    
    const newLog = [
      ...chatLog,
      { sender: 'user' as const, text: userDisplayText }
    ];
    
    let nextIndex = currentQuestionIndex + 1;
    while (nextIndex < questions.length) {
      const nextQ = questions[nextIndex];
      if (isQuestionVisible(nextQ, newAnswers)) {
        break;
      }
      nextIndex++;
    }
    
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setChatLog([
        ...newLog,
        { sender: 'bot' as const, text: `${questions[nextIndex].label}${questions[nextIndex].required ? ' *' : ''}`, qId: questions[nextIndex].id }
      ]);
    } else {
      setCurrentQuestionIndex(questions.length);
      setChatLog([
        ...newLog,
        { sender: 'bot' as const, text: "🎉 Excellent! You have answered all the questions. Click the button below to submit your response." }
      ]);
    }
  };
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isInactive, setIsInactive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setIsPreview(searchParams.get('preview') === 'true');
    loadForm();
  }, [formId]);

  // Visibility focus proctoring listeners & clipboard blocking
  useEffect(() => {
    if (!form || !form.settings?.anti_cheat_detection || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            setIsFlagged(true);
            setProctorWarningMsg("WARNING: Multiple tab switches detected. This exam session has been flagged for review by the instructor.");
          } else {
            setProctorWarningMsg(`WARNING: Tab switching detected! You have navigated away from the exam. This event has been logged. (${newCount}/3 warnings)`);
          }
          setProctorWarningOpen(true);
          return newCount;
        });
      }
    };

    const handleWindowBlur = () => {
      setTabSwitchCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          setIsFlagged(true);
          setProctorWarningMsg("WARNING: Browser focus lost. This exam session has been flagged for review by the instructor.");
        } else {
          setProctorWarningMsg(`WARNING: Focus lost! You navigated away from the exam window. This event has been logged. (${newCount}/3 warnings)`);
        }
        setProctorWarningOpen(true);
        return newCount;
      });
    };

    const preventCopyPaste = (e: Event) => {
      e.preventDefault();
      alert("Copying and pasting is restricted on this exam page for security.");
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

  // Timer countdown logic
  useEffect(() => {
    if (!form || submitted) return;

    const limitMinutes = form.settings?.timer_limit || 0;
    if (limitMinutes === 0) return;

    // Use localStorage to keep track of start time so refreshes don't reset it
    const storageKey = `promptform_form_timer_start_${formId}`;
    let startTimeStr = localStorage.getItem(storageKey);
    let startTime = Date.now();

    if (startTimeStr) {
      startTime = Number(startTimeStr);
    } else {
      localStorage.setItem(storageKey, String(startTime));
    }

    const totalSeconds = limitMinutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const initialRemaining = Math.max(0, totalSeconds - elapsedSeconds);

    setTimeLeft(initialRemaining);

    if (initialRemaining === 0) {
      autoSubmitForm();
      return;
    }

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

  const loadForm = async () => {
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage("");
    try {
      const data = await api.get(`/forms/${formId}`);
      setForm(data);
      setQuestions(data.questions || []);

      // Read saved display mode configured by creator
      const savedMode = data.settings?.display_mode || data.settings?.displayMode || data.theme?.layoutType;
      if (savedMode === 'full' || savedMode === 'standard') {
        setLayoutMode('standard');
      } else if (savedMode === 'wizard' || savedMode === 'one-by-one') {
        setLayoutMode('one-by-one');
      } else if (savedMode === 'chat' || savedMode === 'conversational') {
        setLayoutMode('conversational');
      }

      // Check form status: only PUBLISHED forms can accept responses (unless in preview mode)
      const searchParams = new URLSearchParams(window.location.search);
      const isPreviewMode = searchParams.get('preview') === 'true';

      if (data.status !== "PUBLISHED" && !isPreviewMode) {
        setIsInactive(true);
        if (data.status === "DRAFT") {
          setStatusMessage("This form is currently a draft and cannot accept responses.");
        } else if (data.status === "CLOSED") {
          setStatusMessage("This form has been closed and is not accepting responses anymore.");
        } else {
          setStatusMessage("This form is not accepting responses anymore.");
        }
        setIsLoading(false);
        return;
      }

      // Check access settings. If the form is restricted (not public), we need to see if user is authenticated or invited.
      // The backend handles validation during submission, but we also want to warn upfront if possible.
      // If user is already logged in, let's prefill email.
      if (typeof window !== 'undefined') {
        const storedEmail = localStorage.getItem('promptform_user_email');
        if (storedEmail) {
          setCollectedEmail(storedEmail);
          // If the form wants to collect email, we still ask or auto-pass it.
        }
      }

      // Register public page view
      api.post(`/analytics/form/${data.id}/view`, {
        deviceType: typeof window !== 'undefined' && window.innerWidth < 768 ? "mobile" : "desktop",
        country: "US"
      }).catch(() => {});

      // Check passcode lock
      if (data.settings?.password) {
        setIsLocked(true);
      }

      // Check email collecting
      if (data.settings?.collect_emails) {
        // If logged in, they can skip email input page, or we can prefill and ask them to click next
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === form?.settings?.password) {
      setIsLocked(false);
    } else {
      alert("Incorrect passcode. Access denied.");
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (collectedEmail.trim()) {
      setEmailProvided(true);
      startTimeRef.current = Date.now();
    }
  };

  // Signature canvas controls
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
    setHasSigned(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    try {
      const uploadRes = await api.upload('/upload', file);
      setAnswers(prev => ({ ...prev, [questionId]: uploadRes.fileUrl }));
      alert("Attachment uploaded successfully!");
    } catch (err: any) {
      alert("Attachment upload failed: " + err.message);
    }
  };

  const handleSubmitForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    let finalAnswers = { ...answers };
    if (canvasRef.current && hasSigned) {
      finalAnswers['signature_pad_url'] = canvasRef.current.toDataURL("image/png");
    }

    let emailToSubmit = form?.settings?.collect_emails ? collectedEmail : (typeof window !== 'undefined' ? localStorage.getItem('promptform_user_email') : null);
    let userToSubmit = typeof window !== 'undefined' ? localStorage.getItem('promptform_user_name') : null;

    if (!emailToSubmit) {
      const emailQ = questions.find(q => 
        q.type === 'short_text' && 
        q.label.toLowerCase().includes('email')
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
        q.type === 'short_text' && 
        (q.label.toLowerCase().includes('name') || q.label.toLowerCase().includes('fullname'))
      );
      if (nameQ && answers[nameQ.id]) {
        userToSubmit = String(answers[nameQ.id]).trim();
      }
    }

    // Client-side required field validation
    const missing = questions.filter(q => q.required && isQuestionVisible(q) && (answers[q.id] === undefined || answers[q.id] === null || String(answers[q.id]).trim() === '' || (Array.isArray(answers[q.id]) && answers[q.id].length === 0)));
    if (missing.length > 0) {
      alert(`Please answer the required question: "${missing[0].label}"`);
      setIsSubmitting(false);
      return;
    }

    const payload = {
      answers: finalAnswers,
      browserMetadata: {
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        ip_address: "127.0.0.1",
        tab_switches: tabSwitchCount,
        is_flagged: isFlagged
      },
      timeTaken: Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000)),
      email: emailToSubmit || null,
      submittedBy: userToSubmit || null,
      password: passwordInput || undefined
    };

    const searchParams = new URLSearchParams(window.location.search);
    const isPreviewMode = searchParams.get('preview') === 'true';

    if (isPreviewMode) {
      alert("Preview Mode: Your response was mock submitted successfully! (Test submissions are not saved in production)");
      setSubmitted(true);
      setIsSubmitting(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`promptform_form_timer_start_${formId}`);
      }
      return;
    }

    try {
      // FormId could be the uniqueShareId or UUID, the endpoint resolves both.
      await api.post(`/forms/${formId}/submit`, payload);
      setSubmitted(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`promptform_form_timer_start_${formId}`);
      }
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const autoSubmitForm = () => {
    alert("Time limit expired! Your answers are being submitted automatically.");
    handleSubmitForm();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isQuestionVisible = (q: any, currentAnswers = answers) => {
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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary dark:border-primary"></div>
          <span className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">Loading form builder details...</span>
        </div>
      </div>
    );
  }

  // Handle access error / forbidden
  if (errorMessage || errorStatus) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-t-4 border-t-destructive dark:bg-background dark:border-border">
          <CardHeader>
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl text-foreground dark:text-foreground">Access Restricted</CardTitle>
            <CardDescription className="text-sm mt-2 font-medium text-muted-foreground dark:text-muted-foreground">
              {errorMessage || "You do not have permission to view or fill this form. Please sign in or check your access settings."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push(`/login?redirect=f/${formId}`)}>
              Sign In to PromptForm AI
            </Button>
            <Button variant="outline" className="w-full text-foreground dark:text-foreground dark:hover:bg-card" onClick={() => router.push('/')}>
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inactive Form Status View
  if (isInactive) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-t-4 border-t-amber-500 dark:bg-background dark:border-border">
          <CardHeader>
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
            <CardTitle className="text-2xl text-foreground dark:text-foreground">Form Closed</CardTitle>
            <CardDescription className="text-sm mt-2 font-medium text-muted-foreground dark:text-muted-foreground">
              {statusMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mt-2 text-foreground dark:text-foreground dark:hover:bg-card" onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password Lock View
  if (isLocked) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md dark:bg-background dark:border-border">
          <CardHeader className="text-center">
            <Lock className="w-10 h-10 text-primary dark:text-primary mx-auto mb-3" />
            <CardTitle className="text-foreground dark:text-foreground">Passcode Required</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-muted-foreground">This questionnaire is password-protected. Enter passcode to access.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter passcode..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="dark:bg-background dark:border-border dark:text-foreground"
              />
              <Button type="submit" className="w-full">Unlock & Proceed</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email Collection View
  if (!emailProvided) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md dark:bg-background dark:border-border animate-fadeIn">
          <CardHeader className="text-center">
            <Sparkles className="w-8 h-8 text-primary dark:text-primary mx-auto mb-2 animate-pulse" />
            <CardTitle className="text-foreground dark:text-foreground">Enter your Email</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-muted-foreground">The author requires email verification before submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="you@example.com"
                value={collectedEmail}
                onChange={(e) => setCollectedEmail(e.target.value)}
                required
                className="dark:bg-background dark:border-border dark:text-foreground"
              />
              <Button type="submit" className="w-full">Start Questionnaire</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Submitted Success Page
  if (submitted) {
    const quizResults = calculateQuizResults();
    const hasQuiz = quizResults.totalPossiblePoints > 0;
    const scorePct = hasQuiz ? Math.round((quizResults.earnedPoints / quizResults.totalPossiblePoints) * 100) : 0;

    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl text-center border-t-4 border-t-emerald-500 dark:bg-background dark:border-border shadow-lg p-6">
          <CardHeader>
            <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-foreground dark:text-foreground">Response Registered!</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-muted-foreground">Thank you for your time. Your answers have been successfully locked.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasQuiz && (
              <div className="p-5 bg-muted dark:bg-background border border-border dark:border-border rounded-lg space-y-4">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Your Quiz Score</span>
                  <h3 className="text-4xl font-bold text-primary dark:text-primary mt-1">
                    {quizResults.earnedPoints} / {quizResults.totalPossiblePoints} Marks
                  </h3>
                  <div className={`mt-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                    scorePct >= 80 ? 'bg-emerald-50 dark:bg-emerald-900 text-emerald-600' :
                    scorePct >= 50 ? 'bg-amber-50 dark:bg-amber-950 text-amber-600' :
                    'bg-rose-50 dark:bg-rose-900 text-rose-600'
                  }`}>
                    {scorePct >= 80 ? 'Excellent! (Grade A)' : scorePct >= 50 ? 'Good (Grade B)' : 'Failed (Grade F)'}
                  </div>
                </div>

                <div className="border-t border-border dark:border-border pt-4 text-left">
                  <h4 className="text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase mb-3">Questions & Score Breakdown</h4>
                  <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                    {quizResults.questionsBreakdown.map((item: any, qIdx: number) => (
                      <div key={qIdx} className="p-3.5 bg-card dark:bg-background border border-border dark:border-border rounded-lg flex flex-col space-y-1.5">
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-bold text-foreground dark:text-foreground">Q{qIdx + 1}: {item.questionLabel}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                            item.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900 text-rose-600'
                          }`}>
                            {item.earned} / {item.points} Pts
                          </span>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                          Your Answer: <span className={item.isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{item.studentAnswer}</span>
                        </p>
                        {!item.isCorrect && item.correctAnswer && (
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            ✓ Correct Answer: <span className="underline">{item.correctAnswer}</span>
                          </p>
                        )}
                        {item.explanation && (
                          <p className="text-[11px] text-muted-foreground bg-accent/50 dark:bg-accent/20 p-2 rounded border border-border/50">
                            💡 <b>Explanation:</b> {item.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {form.settings?.anti_cheat_detection && (
              <p className="text-xs text-muted-foreground dark:text-muted-foreground bg-accent dark:bg-background py-1 px-3 rounded inline-block">
                Proctoring status: Logged securely in system.
              </p>
            )}
            <Button variant="outline" className="w-full mt-4 text-foreground dark:text-foreground dark:hover:bg-card" onClick={() => router.push('/')}>
              Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Customize layout/theme options
  const primaryColor = form?.theme?.primary_color || '#8B6B55';
  const backgroundColor = form?.theme?.background_color || '#FAF6EF';
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

  return (
    <div 
      dir={form?.theme?.rtl ? "rtl" : "ltr"}
      className={`min-h-screen pb-20 text-foreground dark:text-foreground transition-colors duration-200 ${form?.theme?.rtl ? "text-right" : "text-left"}`}
      style={{ 
        backgroundColor: backgroundColor.startsWith('#') ? backgroundColor : undefined, 
        fontFamily: resolvedFont 
      }}
    >
      {isPreview && (
        <div className="bg-primary text-white py-2.5 px-6 text-center text-xs font-bold select-none flex items-center justify-center space-x-2 animate-fadeIn shadow-md relative z-50">
          <Sparkles className="w-4 h-4 animate-pulse text-amber-200" />
          <span>Preview Mode: Changes are shown live. Submissions here are mock only and will not be saved.</span>
        </div>
      )}

      {/* FLOATING HEADER PROCTORING WIDGET */}
      <header className="sticky top-0 z-40 bg-white/95 border-b border-border/80 px-6 py-3 shadow-xs flex items-center justify-between">
        <span className="font-extrabold tracking-tight text-foreground flex items-center gap-2 text-sm">
          <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">P</span>
          <span>PromptForm Forms Responder</span>
        </span>

        <div className="flex items-center space-x-6">
          {/* Layout Mode Toggle */}
          <div className="flex bg-secondary dark:bg-card rounded-lg p-0.5 border border-border dark:border-border">
            <button
              type="button"
              onClick={() => setLayoutMode('one-by-one')}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                layoutMode === 'one-by-one'
                  ? 'bg-card dark:bg-background text-foreground dark:text-foreground shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              One-by-One View
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('standard')}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                layoutMode === 'standard'
                  ? 'bg-card dark:bg-background text-foreground dark:text-foreground shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              All Questions
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('conversational')}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                layoutMode === 'conversational'
                  ? 'bg-card dark:bg-background text-foreground dark:text-foreground shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              AI Chatbot
            </button>
          </div>

          {timeLeft !== null && (
            <div className="flex items-center space-x-2 text-destructive dark:text-destructive font-mono font-bold text-sm bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-200/50">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Time Left: {formatTime(timeLeft)}</span>
            </div>
          )}
          
          {form.settings?.anti_cheat_detection && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-muted-foreground bg-accent dark:bg-card px-2.5 py-1.5 rounded-lg border border-border dark:border-border">
              <Shield className="w-4 h-4 text-primary dark:text-primary" />
              <span>Proctored (Switches: {tabSwitchCount})</span>
            </div>
          )}
        </div>
      </header>

      {/* QUESTIONNAIRE CONTAINER */}
      <div className="max-w-2xl mx-auto px-4 mt-8 space-y-6">
        {/* Banner Title */}
        <Card className="border-t-8 dark:bg-background dark:border-border overflow-hidden" style={{ borderTopColor: primaryColor }}>
          {form?.theme?.banner_url && (
            <div className="w-full h-36 overflow-hidden relative border-b border-border dark:border-border">
              <img 
                src={form.theme.banner_url} 
                alt="Form Banner" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
          )}
          <CardHeader>
            {form?.theme?.logo_url && (
              <img src={form.theme.logo_url} alt="Logo" className="max-h-12 w-auto mb-4 object-contain" />
            )}
            <CardTitle className="text-2xl text-foreground dark:text-foreground">{form.title}</CardTitle>
            <CardDescription className="text-sm mt-1 text-muted-foreground dark:text-muted-foreground">{form.description}</CardDescription>
          </CardHeader>
          {form.settings?.collect_emails && (
            <CardContent className="pt-0 text-xs text-muted-foreground dark:text-muted-foreground flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-primary" />
              <span>Submitting response as:</span>
              <span className="font-semibold text-foreground dark:text-foreground">{collectedEmail}</span>
            </CardContent>
          )}
        </Card>

        {isFlagged && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg flex items-start space-x-3 text-destructive dark:text-destructive text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold">Proctor Warning Flagged!</p>
              <p className="mt-0.5">Too many focus/tab switches detected. Your activity is logged.</p>
            </div>
          </div>
        )}
        {layoutMode === 'one-by-one' ? (
          /* ONE BY ONE QUESTION WIZARD */
          <div className="space-y-6">
            {/* Step Progress Bar */}
            <div className="bg-card dark:bg-background border border-border dark:border-border rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-primary font-mono">Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span className="text-muted-foreground">{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Completed</span>
              </div>
              <div className="w-full h-2.5 bg-secondary dark:bg-card rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out rounded-full" 
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} 
                />
              </div>
            </div>

            {/* Single Focused Question Card */}
            {questions[currentQuestionIndex] && (() => {
              const q = questions[currentQuestionIndex];
              const isAlphanumericId = /roll|enrollment|student id|id number|registration|code/i.test(q.label || '');
              const isStrictNumeric = (q.type === 'amount' || q.type === 'price' || q.type === 'number') && !isAlphanumericId;
              const inputType = q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'website' ? 'url' : isStrictNumeric ? 'number' : 'text';

              return (
                <Card className="dark:bg-background dark:border-border border-2 border-primary/20 shadow-xl animate-fadeIn">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-md">
                        Question {currentQuestionIndex + 1} {q.required && <span className="text-destructive font-bold">*</span>}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{q.type}</span>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground mt-3 leading-snug">
                      {q.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    {/* SHORT TEXT, NAME, EMAIL, PHONE, WEBSITE, AMOUNT, PRICE */}
                    {(['short_text', 'standard-input', 'text', 'name', 'first_name', 'last_name', 'full_name', 'email', 'email_address', 'phone', 'contact', 'mobile', 'telephone', 'website', 'url', 'amount', 'price', 'number', 'age', 'quantity', 'count'].includes(q.type)) && (
                      <div className="relative flex items-center w-full">
                        {q.type === 'name' && <User className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                        {q.type === 'email' && <Mail className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                        {q.type === 'phone' && <Phone className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                        {q.type === 'website' && <Link className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                        {(q.type === 'amount' || isAlphanumericId) && <Hash className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                        {q.type === 'price' && <DollarSign className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                        <Input
                          type={inputType}
                          step={q.type === 'price' ? '0.01' : '0.001'}
                          min={isStrictNumeric ? 0 : undefined}
                          onKeyDown={(e) => { if (isStrictNumeric && (e.key === '-' || e.key === 'e')) e.preventDefault(); }}
                          placeholder={
                            isAlphanumericId ? 'e.g. 23SE02CSS1199' :
                            q.type === 'name' ? 'e.g. John Doe' :
                            q.type === 'email' ? 'e.g. john@example.com' :
                            q.type === 'phone' ? 'e.g. +1 (555) 000-0000' :
                            'Write your answer...'
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
                          }}
                          required={q.required}
                          autoFocus
                          className={`rounded-lg border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full ${
                            ['name', 'email', 'phone', 'website', 'amount', 'price'].includes(q.type) || isAlphanumericId ? 'pl-9' : ''
                          }`}
                        />
                      </div>
                    )}

                    {/* LONG TEXT, FEEDBACK, ADDRESS */}
                    {(['long_text', 'feedback', 'address', 'paragraph', 'textarea', 'comments', 'description', 'message'].includes(q.type)) && (
                      <textarea
                        placeholder="Write detailed response..."
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        required={q.required}
                        autoFocus
                        className="w-full p-3 border border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-foreground rounded-lg text-sm h-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    )}

                    {/* MCQ, ONE_OPTION, GENDER */}
                    {(['mcq', 'one_option', 'gender', 'radio', 'single_choice'].includes(q.type)) && (
                      <div className={q.option_layout === 'horizontal' ? "flex flex-wrap gap-2.5 items-center pt-1" : "space-y-2.5"}>
                        {(q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2', 'Option 3', 'Option 4']).map((opt: string, oIdx: number) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <label key={oIdx} className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                                : 'bg-card dark:bg-background border-border/80 text-foreground hover:border-primary/50'
                            }`}>
                              <input
                                type="radio"
                                name={q.id}
                                checked={isSelected}
                                onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                                required={q.required && !answers[q.id]}
                                className="text-primary accent-primary focus-visible:ring-ring w-4 h-4 dark:bg-background dark:border-border"
                              />
                              <span className="text-xs font-semibold">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* CHECKBOX, MULTIPLE_OPTIONS */}
                    {(['checkbox', 'multiple_options', 'multi_choice', 'checkboxes'].includes(q.type)) && (
                      <div className={q.option_layout === 'horizontal' ? "flex flex-wrap gap-2.5 items-center pt-1" : "space-y-2.5"}>
                        {(q.options || ['Option 1', 'Option 2']).map((opt: string, oIdx: number) => {
                          const currentVals = Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] ? String(answers[q.id]).split(', ') : []);
                          const isChecked = currentVals.includes(opt);
                          return (
                            <label key={oIdx} className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked 
                                ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                                : 'bg-card dark:bg-background border-border/80 text-foreground hover:border-primary/50'
                            }`}>
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
                                }}
                                className="rounded text-primary accent-primary focus-visible:ring-ring w-4 h-4 dark:bg-background dark:border-border"
                              />
                              <span className="text-xs font-semibold">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* EMOJI SATISFACTION SCALE */}
                    {(['emoji-satisfaction-scale', 'emoji', 'satisfaction_emoji', 'mood'].includes(q.type)) && (
                      <div className="grid grid-cols-5 gap-2 items-center pt-2 w-full">
                        {(q.options && q.options.length > 0 ? q.options : ["🤩 Very Satisfied", "😋 Satisfied", "😐 Neutral", "🙁 Unsatisfied", "🤮 Very Poor"]).map((opt: string, oIdx: number) => {
                          const isSelected = answers[q.id] === opt;
                          const parts = opt.split(' ');
                          const icon = parts[0];
                          const text = parts.slice(1).join(' ');
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-md scale-105' 
                                  : 'bg-card dark:bg-background border-border/80 text-foreground hover:border-primary/50'
                              }`}
                            >
                              <span className="text-2xl md:text-3xl mb-1">{icon}</span>
                              {text && <span className="text-[10px] font-bold truncate w-full">{text}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* YES / NO */}
                    {(['yes_no', 'yes-no', 'boolean', 'toggle'].includes(q.type)) && (
                      <div className="flex items-center space-x-4 pt-2">
                        {["👍 Yes", "👎 No"].map((opt: string, oIdx: number) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                              className={`flex-1 py-3 px-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary text-primary shadow-md' 
                                  : 'bg-card dark:bg-background border-border/80 text-foreground hover:border-primary/50'
                              }`}
                            >
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* RATINGS / STARS */}
                    {(['rating', 'star_rating', 'star-rating', 'stars', 'satisfaction'].includes(q.type)) && (
                      <div className="flex items-center justify-center space-x-2 py-3">
                        {[1, 2, 3, 4, 5].map((starVal) => {
                          const isSelected = Number(answers[q.id]) >= starVal;
                          return (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.id]: starVal })}
                              className="p-1.5 transition-all transform hover:scale-110 cursor-pointer"
                            >
                              <Star className={`w-8 h-8 ${isSelected ? 'text-amber-400 fill-amber-400 drop-shadow-md' : 'text-muted-foreground/40'}`} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* SIGNATURE PAD */}
                    {q.type === 'signature' && (
                      <div className="pt-2">
                        <QuestionSignaturePad
                          value={answers[q.id] || ""}
                          onChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                        />
                      </div>
                    )}

                    {/* FILE UPLOAD, PHOTO, RESUME */}
                    {(['file_upload', 'photo', 'resume', 'file-uploader', 'document', 'upload', 'file', 'image'].includes(q.type)) && (
                      <div className="space-y-3 w-full pt-1">
                        <input
                          type="file"
                          accept={q.type === 'photo' ? 'image/*' : q.type === 'resume' ? '.pdf,.doc,.docx' : undefined}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (q.type === 'photo') {
                                const reader = new FileReader();
                                reader.onload = () => setAnswers({ ...answers, [q.id]: reader.result });
                                reader.readAsDataURL(file);
                              } else {
                                setAnswers({ ...answers, [q.id]: file.name });
                              }
                            }
                          }}
                          className="text-xs text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
                        />
                        {answers[q.id] && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1.5 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                            <span>✓ Attached:</span>
                            <span className="truncate">{typeof answers[q.id] === 'string' && answers[q.id].startsWith('data:image') ? 'Uploaded Photograph Image' : answers[q.id]}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* DATE, TIME, COLOR */}
                    {(['date', 'dob', 'birthday', 'date_of_birth', 'birth_date'].includes(q.type)) && (
                      <Input
                        type="date"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        required={q.required}
                        className="w-full rounded-xl text-sm"
                      />
                    )}
                    {(['time', 'appointment_time'].includes(q.type)) && (
                      <Input
                        type="time"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        required={q.required}
                        className="w-full rounded-xl text-sm"
                      />
                    )}
                    {q.type === 'color' && (
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={answers[q.id] || "#6366f1"}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="w-12 h-12 rounded-xl cursor-pointer border border-border"
                        />
                        <span className="text-xs font-mono font-bold uppercase">{answers[q.id] || "#6366f1"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Bottom Nav Bar */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={currentQuestionIndex === 0}
                onClick={() => {
                  let prevIdx = currentQuestionIndex - 1;
                  while (prevIdx >= 0 && !isQuestionVisible(questions[prevIdx], answers)) {
                    prevIdx--;
                  }
                  if (prevIdx >= 0) {
                    setCurrentQuestionIndex(prevIdx);
                  }
                }}
                className="px-5 py-2.5 text-xs font-bold flex items-center space-x-2 cursor-pointer"
              >
                <span>← Previous</span>
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  type="button"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => {
                    const currentQ = questions[currentQuestionIndex];
                    if (currentQ && currentQ.required && (answers[currentQ.id] === undefined || answers[currentQ.id] === null || String(answers[currentQ.id]).trim() === "" || (Array.isArray(answers[currentQ.id]) && answers[currentQ.id].length === 0))) {
                      alert(`Please answer "${currentQ.label}" before proceeding.`);
                      return;
                    }
                    let nextIdx = currentQuestionIndex + 1;
                    while (nextIdx < questions.length && !isQuestionVisible(questions[nextIdx], answers)) {
                      nextIdx++;
                    }
                    if (nextIdx < questions.length) {
                      setCurrentQuestionIndex(nextIdx);
                    } else {
                      setCurrentQuestionIndex(questions.length - 1);
                    }
                  }}
                  className="px-6 py-2.5 text-xs font-bold text-white flex items-center space-x-2 hover:opacity-90 cursor-pointer"
                >
                  <span>Next Question →</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmitForm}
                  disabled={isSubmitting}
                  style={{ backgroundColor: primaryColor }}
                  className="px-8 py-2.5 text-xs font-bold text-white flex items-center space-x-2 hover:opacity-90 shadow-md cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting Answers...' : 'Submit Final Answers 🚀'}</span>
                </Button>
              )}
            </div>
          </div>
        ) : layoutMode === 'conversational' ? (
          /* CONVERSATIONAL CHATBOT RESPONDER */
          <div className="rounded-[24px] border border-border dark:border-border bg-card dark:bg-background shadow-lg overflow-hidden flex flex-col h-[560px]">
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-border dark:border-border bg-muted dark:bg-background flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-8 h-8 rounded-full bg-primary/5 dark:bg-indigo-950/40 text-primary flex items-center justify-center border border-primary/20 dark:border-indigo-900">
                  <Bot className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground dark:text-foreground">AI Assistant</p>
                  <p className="text-[10px] font-bold text-emerald-600">Online • Ready to collect responses</p>
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground">Progress</p>
                <p className="text-xs font-bold text-primary dark:text-primary">
                  {currentQuestionIndex} / {questions.length} Fields
                </p>
              </div>
            </div>

            {/* Messages timeline */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/50 dark:bg-background/20">
              {chatLog.map((msg, mIdx) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={mIdx} className={`flex items-start space-x-3.5 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                    <div className={`p-2 rounded-lg flex items-center justify-center flex-shrink-0 ${isBot ? 'bg-primary/5 dark:bg-indigo-950/40 text-indigo-505' : 'bg-accent dark:bg-card text-muted-foreground'}`}>
                      {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`rounded-lg px-4 py-3 text-xs leading-relaxed max-w-[80%] ${
                      isBot 
                        ? 'bg-card dark:bg-background border border-border/60 dark:border-border text-foreground dark:text-foreground shadow-sm' 
                        : 'bg-primary text-white font-medium shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Interactive input area */}
            <div className="p-4 border-t border-border dark:border-border bg-card dark:bg-background">
              {currentQuestionIndex < questions.length ? (
                (() => {
                  const currentQ = questions[currentQuestionIndex];
                  return (
                    <div className="space-y-3.5">
                      {/* TEXT INPUTS */}
                      {(['short_text', 'standard-input', 'text', 'name', 'first_name', 'last_name', 'full_name', 'email', 'email_address', 'phone', 'contact', 'mobile', 'telephone', 'website', 'url', 'amount', 'price', 'password', 'number', 'age', 'quantity', 'count'].includes(currentQ.type)) && (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const val = (e.currentTarget.elements.namedItem('ans') as HTMLInputElement).value;
                          handleAnswerSubmit(val);
                          e.currentTarget.reset();
                        }} className="flex items-center space-x-2">
                          <Input
                            name="ans"
                            type={currentQ.type === 'email' ? 'email' : currentQ.type === 'phone' ? 'tel' : currentQ.type === 'website' ? 'url' : (currentQ.type === 'amount' || currentQ.type === 'price') ? 'number' : currentQ.type === 'password' ? 'password' : 'text'}
                            placeholder={currentQ.type === 'password' ? 'Enter secret passcode...' : 'Type your answer...'}
                            required={currentQ.required}
                            autoFocus
                            className="flex-1 rounded-lg text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <button type="submit" className="p-2.5 rounded-lg bg-primary hover:opacity-90 text-primary-foreground flex items-center justify-center border-none cursor-pointer">
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      )}

                      {/* LONG TEXT / FEEDBACK / ADDRESS */}
                      {(['long_text', 'feedback', 'address', 'paragraph', 'textarea', 'comments', 'description', 'message'].includes(currentQ.type)) && (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const val = (e.currentTarget.elements.namedItem('ans') as HTMLTextAreaElement).value;
                          handleAnswerSubmit(val);
                          e.currentTarget.reset();
                        }} className="flex flex-col space-y-2">
                          <textarea
                            name="ans"
                            placeholder={currentQ.type === 'address' ? 'Enter full address block...' : 'Type your response...'}
                            required={currentQ.required}
                            autoFocus
                            className="w-full p-3 text-xs border border-border dark:border-border rounded-lg bg-card dark:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-20 resize-none"
                          />
                          <button type="submit" className="self-end px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-[10px] font-bold rounded-lg flex items-center space-x-1.5 border-none cursor-pointer">
                            <span>Confirm</span>
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}

                      {/* MCQ, ONE_OPTION, GENDER, DROPDOWN, COUNTRY */}
                      {(['mcq', 'one_option', 'gender', 'dropdown', 'country', 'radio', 'single_choice', 'select'].includes(currentQ.type)) && (
                        <div className="flex flex-wrap gap-2 justify-center max-h-40 overflow-y-auto py-1">
                          {(currentQ.options && currentQ.options.length > 0 
                            ? currentQ.options 
                            : (currentQ.type === 'gender' ? ['Male', 'Female', 'Other', 'Prefer not to say'] : (currentQ.type === 'country' ? ['United States', 'India', 'Canada', 'United Kingdom'] : ['Option 1', 'Option 2']))
                          ).map((opt: string, optIdx: number) => (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleAnswerSubmit(opt)}
                              className="px-3.5 py-2 bg-muted/5 hover:bg-primary/5 dark:bg-background dark:hover:bg-primary/10 text-xs font-semibold rounded-lg text-foreground dark:text-foreground border border-border dark:border-border hover:border-primary/50 dark:hover:border-primary/50 transition-all cursor-pointer"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* CHECKBOX, MULTIPLE_OPTIONS */}
                      {(['checkbox', 'multiple_options', 'multi_choice', 'checkboxes'].includes(currentQ.type)) && (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const checkedOptions: string[] = [];
                          const formElements = e.currentTarget.elements;
                          (currentQ.options || ['Option 1', 'Option 2']).forEach((opt: string, oIdx: number) => {
                            const checkbox = formElements.namedItem('chk_' + oIdx) as HTMLInputElement;
                            if (checkbox && checkbox.checked) {
                              checkedOptions.push(opt);
                            }
                          });
                          if (currentQ.required && checkedOptions.length === 0) {
                            alert("Please select at least one option.");
                            return;
                          }
                          handleAnswerSubmit(checkedOptions.join(', '));
                        }} className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {(currentQ.options || ['Option 1', 'Option 2']).map((opt: string, oIdx: number) => (
                              <label key={oIdx} className="flex items-center space-x-2.5 p-2 border border-border dark:border-border rounded-lg hover:bg-muted dark:hover:bg-background cursor-pointer text-left">
                                <input type="checkbox" name={'chk_' + oIdx} className="rounded text-primary focus-visible:ring-ring w-4 h-4 dark:bg-background dark:border-border" />
                                <span className="text-xs text-foreground dark:text-foreground font-semibold">{opt}</span>
                              </label>
                            ))}
                          </div>
                          <button type="submit" className="w-full py-2 bg-primary hover:opacity-90 text-primary-foreground text-[10px] font-bold rounded-lg border-none cursor-pointer">
                            Confirm Selection
                          </button>
                        </form>
                      )}

                      {/* AGREEMENT */}
                      {(['agreement', 'consent'].includes(currentQ.type)) && (
                        <div className="flex flex-col items-center space-y-3">
                          <button
                            type="button"
                            onClick={() => handleAnswerSubmit("Agreed & Signed")}
                            className="w-full py-3 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm cursor-pointer border-none"
                          >
                            I Agree to Terms & Conditions
                          </button>
                        </div>
                      )}

                      {/* RATINGS / STARS */}
                      {(['rating', 'star-rating', 'star_rating', 'stars', 'satisfaction'].includes(currentQ.type)) && (
                        <div className="flex justify-center items-center space-x-1.5 py-2">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => handleAnswerSubmit(starVal + ' Stars')}
                              className="p-1 text-zinc-300 hover:text-amber-405 transition-colors cursor-pointer"
                            >
                              <Star className="w-7 h-7 fill-current" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* SIGNATURE PAD */}
                      {currentQ.type === 'signature' && (
                        <div className="space-y-3">
                          <QuestionSignaturePad
                            value={answers[currentQ.id] || ""}
                            onChange={(val) => setAnswers({ ...answers, [currentQ.id]: val })}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!answers[currentQ.id] && currentQ.required) {
                                alert("Please sign pad before confirming.");
                                return;
                              }
                              handleAnswerSubmit(answers[currentQ.id] || "Signed");
                            }}
                            className="w-full py-2 bg-primary hover:opacity-90 text-primary-foreground text-[10px] font-bold rounded-lg border-none cursor-pointer"
                          >
                            Confirm Signature
                          </button>
                        </div>
                      )}

                      {/* DATE, TIME, COLOR */}
                      {(['date', 'dob', 'birthday', 'date_of_birth', 'birth_date', 'time', 'appointment_time', 'color'].includes(currentQ.type)) && (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const val = (e.currentTarget.elements.namedItem('ans') as HTMLInputElement).value;
                          handleAnswerSubmit(val);
                        }} className="flex items-center space-x-2">
                          <Input
                            name="ans"
                            type={['date', 'dob', 'birthday', 'date_of_birth', 'birth_date'].includes(currentQ.type) ? 'date' : ['time', 'appointment_time'].includes(currentQ.type) ? 'time' : 'color'}
                            required={currentQ.required}
                            autoFocus
                            className="flex-1 rounded-lg text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <button type="submit" className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-[10px] font-bold rounded-lg border-none cursor-pointer">
                            Confirm
                          </button>
                        </form>
                      )}

                      {/* FILE UPLOAD, PHOTO, RESUME */}
                      {(['file_upload', 'resume', 'photo', 'file-uploader', 'document', 'upload', 'file', 'image'].includes(currentQ.type)) && (
                        <div className="flex flex-col items-center p-5 border border-dashed border-border dark:border-border rounded-lg space-y-3 bg-muted/50 dark:bg-background/20">
                          <FileUp className="w-8 h-8 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-foreground dark:text-foreground">
                              Upload your {currentQ.type === 'resume' ? 'CV Document' : currentQ.type === 'photo' ? 'Image/Avatar' : 'file'}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Click trigger to choose local folder</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleAnswerSubmit('Uploaded_' + currentQ.type + '_file.ext');
                            }}
                            className="px-4 py-1.5 bg-foreground hover:bg-black dark:bg-card dark:hover:bg-zinc-700 text-white rounded-lg text-[10px] font-bold border-none cursor-pointer"
                          >
                            Trigger Local Uploader
                          </button>
                        </div>
                      )}

                      {/* LOCATION */}
                      {(['location', 'location-selector', 'map'].includes(currentQ.type)) && (
                        <div className="flex flex-col items-center space-y-3 p-4 border border-border dark:border-border rounded-lg">
                          <MapPin className="w-6 h-6 text-indigo-505 animate-bounce" />
                          <button
                            type="button"
                            onClick={() => handleAnswerSubmit("New York, USA (GPS)")}
                            className="w-full py-2 bg-primary hover:opacity-90 text-primary-foreground text-[10px] font-bold rounded-lg border-none cursor-pointer"
                          >
                            Share Current GPS Location
                          </button>
                        </div>
                      )}

                      {/* PAYMENT SIMULATOR */}
                      {currentQ.type === 'payment' && (
                        <div className="flex flex-col space-y-3">
                          <button
                            type="button"
                            onClick={() => handleAnswerSubmit("Paid $10.00 via Credit Card")}
                            className="w-full py-3 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm border-none cursor-pointer"
                          >
                            Proceed to Payment ($10.00)
                          </button>
                        </div>
                      )}

                      {/* OTP */}
                      {currentQ.type === 'otp' && (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const val = (e.currentTarget.elements.namedItem('ans') as HTMLInputElement).value;
                          handleAnswerSubmit(val);
                        }} className="flex items-center space-x-2">
                          <Input
                            name="ans"
                            type="text"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP code..."
                            required={currentQ.required}
                            autoFocus
                            className="flex-1 rounded-lg text-center text-xs tracking-widest font-mono font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <button type="submit" className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-[10px] font-bold rounded-lg border-none cursor-pointer">
                            Verify
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* SUBMIT FORM BUTTON IN CHAT */
                <div className="text-center py-2">
                  <Button 
                    onClick={() => handleSubmitForm()}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-500/10"
                  >
                    {isSubmitting ? "Submitting response..." : "Lock & Submit Answers"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TRADITIONAL FORM RESPONDER */
          <form onSubmit={handleSubmitForm} className="space-y-6">
            {questions.map((q, idx) => {
              if (!isQuestionVisible(q)) return null;

              return (
                <Card key={q.id} className="dark:bg-background dark:border-border">
                  <CardContent className="pt-6 space-y-3.5">
                    <p className="text-sm font-bold text-foreground dark:text-foreground">
                      {idx + 1}. {q.label} {q.required && <span className="text-destructive font-bold">*</span>}
                    </p>
                    {/* SHORT TEXT, STANDARD INPUT, NAME, EMAIL, PHONE, WEBSITE, AMOUNT, PRICE */}
                    {(['short_text', 'standard-input', 'text', 'name', 'first_name', 'last_name', 'full_name', 'email', 'email_address', 'phone', 'contact', 'mobile', 'telephone', 'website', 'url', 'amount', 'price', 'number', 'age', 'quantity', 'count'].includes(q.type)) && (() => {
                      const isAlphanumericId = /roll|enrollment|student id|id number|registration|code/i.test(q.label || '');
                      const isStrictNumeric = (q.type === 'amount' || q.type === 'price' || q.type === 'number') && !isAlphanumericId;
                      const inputType = q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'website' ? 'url' : isStrictNumeric ? 'number' : 'text';

                      return (
                        <div className="relative flex items-center w-full">
                          {q.type === 'name' && <User className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                          {q.type === 'email' && <Mail className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                          {q.type === 'phone' && <Phone className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                          {q.type === 'website' && <Link className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                          {(q.type === 'amount' || isAlphanumericId) && <Hash className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                          {q.type === 'price' && <DollarSign className="absolute left-3 w-4 h-4 text-muted-foreground" />}
                          <Input
                            type={inputType}
                            step={q.type === 'price' ? '0.01' : '0.001'}
                            min={isStrictNumeric ? 0 : undefined}
                            onKeyDown={(e) => { if (isStrictNumeric && (e.key === '-' || e.key === 'e')) e.preventDefault(); }}
                            placeholder={
                              isAlphanumericId ? 'e.g. 23SE02CSS1199' :
                              q.type === 'name' ? 'e.g. John Doe' :
                              q.type === 'email' ? 'e.g. john@example.com' :
                              q.type === 'phone' ? 'e.g. +1 (555) 000-0000' :
                              q.type === 'website' ? 'e.g. https://portfolio.com' :
                              q.type === 'amount' ? 'Enter amount number...' :
                              q.type === 'price' ? '0.00' :
                              'Write your answer...'
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
                            }}
                            required={q.required}
                            className={`rounded-lg border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full ${
                              ['name', 'email', 'phone', 'website', 'amount', 'price'].includes(q.type) || isAlphanumericId ? 'pl-9' : ''
                            }`}
                          />
                        </div>
                      );
                    })()}

                    {/* PASSWORD FIELD */}
                    {q.type === 'password' && (
                      <div className="relative flex items-center w-full">
                        <Lock className="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          type={showPasswords[q.id] ? "text" : "password"}
                          placeholder="Enter password..."
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          required={q.required}
                          className="pl-9 pr-10 rounded-lg border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-foreground w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, [q.id]: !showPasswords[q.id] })}
                          className="absolute right-3 text-muted-foreground hover:text-muted-foreground border-none bg-transparent cursor-pointer"
                        >
                          {showPasswords[q.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}

                    {/* LONG TEXT, FEEDBACK, ADDRESS */}
                    {(['long_text', 'feedback', 'address', 'paragraph', 'textarea', 'comments', 'description', 'message'].includes(q.type)) && (
                      <div className="relative w-full">
                        {q.type === 'address' && <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />}
                        <textarea
                          placeholder={
                            q.type === 'address' ? 'Street Address, Apt, Suite, City, State, ZIP...' :
                            'Write response details...'
                          }
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          required={q.required}
                          className={`w-full py-2 px-3 border border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-foreground rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-24 transition-all ${
                            q.type === 'address' ? 'pl-9' : 'px-3'
                          }`}
                        />
                      </div>
                    )}

                    {/* MCQ, ONE_OPTION, GENDER */}
                    {(['mcq', 'one_option', 'gender', 'radio', 'single_choice'].includes(q.type)) && (
                      <div className={q.option_layout === 'horizontal' ? "flex flex-wrap gap-2.5 items-center pt-1" : "space-y-2"}>
                        {(q.options && q.options.length > 0 ? q.options : (q.type === 'gender' ? ['Male', 'Female', 'Other', 'Prefer not to say'] : ['Option 1', 'Option 2'])).map((opt: string, oIdx: number) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <label key={oIdx} className={`flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                                : 'bg-card dark:bg-background border-border/80 text-foreground hover:border-primary/50'
                            }`}>
                              <input
                                type="radio"
                                name={q.id}
                                checked={isSelected}
                                onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                                required={q.required && !answers[q.id]}
                                className="text-primary accent-primary focus-visible:ring-ring w-4 h-4 dark:bg-background dark:border-border"
                              />
                              <span className="text-xs font-semibold">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* CHECKBOX, MULTIPLE_OPTIONS */}
                    {(['checkbox', 'multiple_options', 'multi_choice', 'checkboxes'].includes(q.type)) && (
                      <div className={q.option_layout === 'horizontal' ? "flex flex-wrap gap-2.5 items-center pt-1" : "space-y-2"}>
                        {(q.options || ['Option 1', 'Option 2']).map((opt: string, oIdx: number) => {
                          const currentVals = Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] ? String(answers[q.id]).split(', ') : []);
                          const isChecked = currentVals.includes(opt);
                          return (
                            <label key={oIdx} className={`flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                              isChecked 
                                ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                                : 'bg-card dark:bg-background border-border/80 text-foreground hover:border-primary/50'
                            }`}>
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
                                }}
                                className="rounded text-primary accent-primary focus-visible:ring-ring w-4 h-4 dark:bg-background dark:border-border"
                              />
                              <span className="text-xs font-semibold">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* DROPDOWN, COUNTRY */}
                    {(['dropdown', 'country', 'select'].includes(q.type)) && (
                      <select
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        required={q.required}
                        className="w-full px-3 py-2 border bg-card dark:bg-background border-border dark:border-border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground dark:text-foreground"
                      >
                        <option value="" disabled>Select option...</option>
                        {(q.options && q.options.length > 0 ? q.options : (q.type === 'country' ? ['United States', 'India', 'Canada', 'United Kingdom'] : ['Option 1', 'Option 2'])).map((opt: string, oIdx: number) => (
                          <option key={oIdx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {/* AGREEMENT */}
                    {(['agreement', 'consent'].includes(q.type)) && (
                      <label className="flex items-start space-x-3 p-3 rounded-lg border border-border dark:border-border hover:bg-muted dark:hover:bg-card cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={answers[q.id] === "Agreed & Signed"}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.checked ? "Agreed & Signed" : "" })}
                          required={q.required}
                          className="rounded text-primary focus-visible:ring-ring w-4 h-4 mt-0.5 dark:bg-background dark:border-border"
                        />
                        <span className="text-xs text-muted-foreground dark:text-muted-foreground leading-normal font-semibold">
                          I agree to the terms of service, privacy policy and consent guidelines.
                        </span>
                      </label>
                    )}

                    {/* EMOJI SATISFACTION SCALE */}
                    {(['emoji-satisfaction-scale', 'emoji', 'satisfaction_emoji', 'mood'].includes(q.type)) && (
                      <div className="grid grid-cols-5 gap-2 items-center pt-1.5 w-full">
                        {(q.options && q.options.length > 0 ? q.options : ["🤩 Very Satisfied", "😋 Satisfied", "😐 Neutral", "🙁 Unsatisfied", "🤮 Very Poor"]).map((opt: string, oIdx: number) => {
                          const isSelected = answers[q.id] === opt;
                          const parts = opt.split(' ');
                          const icon = parts[0];
                          const text = parts.slice(1).join(' ');
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                              className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer text-center ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-md scale-105' 
                                  : 'bg-card dark:bg-background border-border/80 text-foreground hover:border-primary/50'
                              }`}
                            >
                              <span className="text-2xl mb-1">{icon}</span>
                              {text && <span className="text-[10px] font-bold truncate w-full">{text}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* YES / NO */}
                    {(['yes_no', 'yes-no', 'boolean', 'toggle'].includes(q.type)) && (
                      <div className="flex items-center space-x-3 pt-1.5">
                        {["👍 Yes", "👎 No"].map((opt: string, oIdx: number) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                              className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                                  : 'bg-card dark:bg-background border-border/80 text-foreground hover:border-primary/50'
                              }`}
                            >
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {/* RATINGS */}
                  {(['rating', 'star-rating', 'star_rating', 'stars', 'satisfaction'].includes(q.type)) && (
                    <div className="flex flex-wrap gap-2.5 justify-center py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [q.id]: star })}
                          style={{
                            backgroundColor: answers[q.id] === star ? primaryColor : undefined
                          }}
                          className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${
                            answers[q.id] === star 
                              ? "text-white shadow-md scale-105" 
                              : "bg-accent hover:bg-card dark:bg-card dark:hover:bg-card text-foreground dark:text-foreground"
                          }`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* SIGNATURE PAD */}
                  {q.type === 'signature' && (
                    <QuestionSignaturePad
                      value={answers[q.id] || ""}
                      onChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                    />
                  )}

                  {/* FILE UPLOAD, RESUME */}
                  {(['file_upload', 'file-uploader', 'resume', 'document', 'upload', 'file'].includes(q.type)) && (
                    <div className="space-y-2 w-full">
                      <input
                        type="file"
                        accept={q.type === 'resume' ? '.pdf,.doc,.docx' : undefined}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (q.type === 'resume') {
                              setAnswers({ ...answers, [q.id]: file.name });
                            } else {
                              handleFileUpload(q.id, file);
                            }
                          }
                        }}
                        className="text-xs text-muted-foreground dark:text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/5 file:text-indigo-700 dark:file:bg-indigo-950/30 dark:file:text-indigo-405 hover:file:bg-indigo-100 cursor-pointer w-full"
                      />
                      {q.type === 'resume' && <p className="text-[10px] text-muted-foreground">Accepted formats: PDF, DOC, DOCX up to 10MB</p>}
                      {answers[q.id] && (
                        <p className="text-xs text-emerald-650 dark:text-emerald-500 font-semibold flex items-center space-x-1">
                          <span>✓ Attached:</span>
                          <span className="underline truncate max-w-xs">{answers[q.id]}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* PHOTO UPLOAD */}
                  {(['photo', 'image'].includes(q.type)) && (
                    <div className="flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-border rounded-lg p-5 bg-muted/50 dark:bg-background/30 text-center relative overflow-hidden w-full">
                      {answers[q.id] ? (
                        <div className="space-y-3">
                          <div className="w-32 h-32 border border-zinc-300 bg-accent dark:bg-card flex items-center justify-center mx-auto overflow-hidden rounded-lg shadow-sm">
                            <img src={answers[q.id]} alt="Upload Preview" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-450 font-semibold">Photo Attached</p>
                          <button
                            type="button"
                            onClick={() => setAnswers({ ...answers, [q.id]: null })}
                            className="text-xs text-destructive hover:underline border-none bg-transparent cursor-pointer font-bold"
                          >
                            Remove Photo
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer space-y-2 flex flex-col items-center">
                          <Image className="w-10 h-10 text-muted-foreground animate-pulse" />
                          <p className="text-xs font-bold text-foreground dark:text-foreground">Upload Image File</p>
                          <p className="text-[10px] text-muted-foreground">JPEG, PNG, GIF up to 5MB</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setAnswers({ ...answers, [q.id]: reader.result });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* DATE PICKER */}
                  {(['date', 'dob', 'birthday', 'date_of_birth', 'birth_date'].includes(q.type)) && (
                    <div className="relative flex items-center w-full">
                      <Calendar className="absolute left-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        required={q.required}
                        className="pl-9 rounded-lg border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-foreground w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  )}

                  {/* TIME PICKER */}
                  {(['time', 'appointment_time'].includes(q.type)) && (
                    <div className="relative flex items-center w-full">
                      <Clock className="absolute left-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        required={q.required}
                        className="pl-9 rounded-lg border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-foreground w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  )}

                  {/* COLOR PICKER */}
                  {q.type === 'color' && (
                    <div className="flex items-center space-x-3.5">
                      <input
                        type="color"
                        value={answers[q.id] || "#6366f1"}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border dark:border-border bg-transparent"
                      />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground dark:text-foreground">
                        Selected Hex: {answers[q.id] || "#6366f1"}
                      </span>
                    </div>
                  )}

                  {/* MAP PICKER / LOCATION */}
                  {(['location', 'location-selector', 'map'].includes(q.type)) && (
                    <div className="space-y-3.5 w-full">
                      <div className="relative flex items-center w-full">
                        <MapPin className="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search address location..."
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          required={q.required}
                          className="pl-9 rounded-lg border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-foreground w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      {answers[q.id] && (
                        <div className="w-full h-32 rounded-lg bg-accent dark:bg-card flex flex-col items-center justify-center text-xs font-bold text-muted-foreground border border-border dark:border-border relative overflow-hidden animate-fadeIn select-none">
                          <div className="absolute inset-0 bg-sky-200/20 dark:bg-sky-900/10 flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-destructive animate-bounce" />
                          </div>
                          <div className="bg-white/90 dark:bg-slate-900/90 py-1.5 px-3 rounded shadow-sm relative z-10 text-center font-mono max-w-[80%] truncate text-foreground dark:text-foreground">
                            Lat: 40.7128, Lng: -74.0060 (Mock Map Pin)
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* OTP FIELD */}
                  {q.type === 'otp' && (
                    <div className="space-y-2">
                      <div className="flex space-x-2 justify-start">
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
                              className="w-10 h-12 text-center text-lg font-bold border border-border dark:border-border rounded-lg bg-muted dark:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground dark:text-foreground"
                            />
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-none">Enter the 6-digit verification code sent to your device.</p>
                    </div>
                  )}

                  {/* PAYMENT BLOCK */}
                  {q.type === 'payment' && (
                    <div className="border border-border dark:border-border rounded-lg p-4 bg-muted dark:bg-background space-y-3 w-full">
                      <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
                        <span>Card Information</span>
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <input
                        type="text"
                        placeholder="Card Number (4242 4242 4242 4242)"
                        value={answers[q.id]?.cardNumber || ""}
                        onChange={(e) => setAnswers({ 
                          ...answers, 
                          [q.id]: { ...answers[q.id], cardNumber: e.target.value } 
                        })}
                        required={q.required}
                        className="w-full px-3 py-2 bg-card dark:bg-background border border-border dark:border-border rounded-lg text-xs text-foreground dark:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={answers[q.id]?.expiry || ""}
                          onChange={(e) => setAnswers({ 
                            ...answers, 
                            [q.id]: { ...answers[q.id], expiry: e.target.value } 
                          })}
                          required={q.required}
                          className="w-full px-3 py-2 bg-card dark:bg-background border border-border dark:border-border rounded-lg text-xs text-foreground dark:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                          className="w-full px-3 py-2 bg-card dark:bg-background border border-border dark:border-border rounded-lg text-xs text-foreground dark:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card className="dark:bg-background dark:border-border">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center space-x-2 text-foreground dark:text-foreground font-bold">
                <PenTool className="w-5 h-5 text-primary" />
                <span>Verification Signature Pad</span>
              </div>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">Sign in the box below to authorize your response lock.</p>
              
              <div className="border border-border dark:border-border rounded-lg overflow-hidden bg-background dark:bg-background">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawingTouch}
                  onTouchMove={drawTouch}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[150px] cursor-crosshair bg-card dark:bg-background"
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={clearSignature} className="text-foreground dark:text-foreground dark:hover:bg-card">
                  Clear Signature
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-3 text-base space-x-2 text-white hover:opacity-90 active:scale-[0.98] transition-all duration-200"
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? 'Locking submission...' : 'Submit Answers'}</span>
          </Button>
         </form>
        )}
      </div>

      {/* Proctoring Warning Overlay Modal */}
      {proctorWarningOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-destructive animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="text-destructive flex items-center space-x-2 pb-2">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
              <CardTitle className="text-lg font-bold">Proctoring Alert</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground leading-relaxed font-semibold">
                {proctorWarningMsg}
              </p>
              <div className="flex justify-end pt-2">
                <Button 
                  variant="danger" 
                  onClick={() => setProctorWarningOpen(false)}
                >
                  I Understand & Resume Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
