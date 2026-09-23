"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Sparkles, Shield, Clock, Lock, Send, AlertTriangle, PenTool,
  User, Mail, Phone, MapPin, Globe, Calendar, Star, Signature,
  FileUp, Image, Hash, DollarSign, Link, Eye, EyeOff 
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
          <span className="text-xs text-emerald-605 font-bold">✓ Signature Captured</span>
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

export default function ViewFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Security locks
  const [passwordInput, setPasswordInput] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [collectedEmail, setCollectedEmail] = useState("");
  const [emailProvided, setEmailProvided] = useState(false);

  // Proctoring stats
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Loading/submitting
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const [isInactive, setIsInactive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setIsPreview(searchParams.get('preview') === 'true');
    loadForm();
  }, [formId]);

  // Visibility focus proctoring listeners
  useEffect(() => {
    if (!form || !form.settings?.anti_cheat_detection || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            setIsFlagged(true);
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
        }
        return newCount;
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
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
      // Auto submit immediately if expired on reload
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
    try {
      const data = await api.get(`/forms/${formId}`);
      setForm(data);
      setQuestions(data.questions || []);

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

      // Register public page view
      api.post(`/analytics/form/${data.id}/view`, {
        deviceType: window.innerWidth < 768 ? "mobile" : "desktop",
        country: "US"
      }).catch(() => {});

      // Check passcode lock
      if (data.settings?.password) {
        setIsLocked(true);
      }

      // Check email collecting
      if (data.settings?.collect_emails) {
        setEmailProvided(false);
      } else {
        setEmailProvided(true);
      }
    } catch (err: any) {
      alert("Error: Form does not exist or is currently private.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === form?.settings?.password) {
      setIsLocked(false);
    } else {
      alert("Incorrect password code. Access denied.");
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (collectedEmail.trim()) {
      setEmailProvided(true);
      startTimeRef.current = Date.now(); // reset timer start time upon entry
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

  // File Upload utility inside responders
  const handleFileUpload = async (questionId: string, file: File) => {
    try {
      const uploadRes = await api.upload('/upload', file);
      setAnswers(prev => ({ ...prev, [questionId]: uploadRes.fileUrl }));
      alert("Attachment uploaded successfully!");
    } catch (err: any) {
      alert("Attachment upload failed: " + err.message);
    }
  };

  // Submit Answer Pack
  const handleSubmitForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Save signature if vorhanden
    let finalAnswers = { ...answers };
    if (canvasRef.current && hasSigned) {
      finalAnswers['signature_pad_url'] = canvasRef.current.toDataURL("image/png");
    }

    let responderEmail = null;
    if (form?.settings?.collect_emails) {
      finalAnswers['responder_email'] = collectedEmail;
      responderEmail = collectedEmail;
    } else {
      const emailQ = questions.find(q => 
        q.type === 'short_text' && 
        q.label.toLowerCase().includes('email')
      );
      if (emailQ && answers[emailQ.id]) {
        const emailStr = String(answers[emailQ.id]).trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          responderEmail = emailStr;
        }
      }
    }

    let responderName = null;
    const nameQ = questions.find(q => 
      q.type === 'short_text' && 
      (q.label.toLowerCase().includes('name') || q.label.toLowerCase().includes('fullname'))
    );
    if (nameQ && answers[nameQ.id]) {
      responderName = String(answers[nameQ.id]).trim();
    }

    const payload = {
      answers: finalAnswers,
      browserMetadata: {
        user_agent: navigator.userAgent,
        ip_address: "127.0.0.1",
        tab_switches: tabSwitchCount,
        is_flagged: isFlagged
      },
      timeTaken: Math.floor((Date.now() - startTimeRef.current) / 1000),
      email: responderEmail,
      submittedBy: responderName
    };

    const searchParams = new URLSearchParams(window.location.search);
    const isPreviewMode = searchParams.get('preview') === 'true';

    if (isPreviewMode) {
      alert("Preview Mode: Your response was mock submitted successfully! (Test submissions are not saved in production)");
      setSubmitted(true);
      setIsSubmitting(false);
      localStorage.removeItem(`promptform_form_timer_start_${formId}`);
      return;
    }

    try {
      await api.post(`/forms/${formId}/submit`, payload);
      setSubmitted(true);
      localStorage.removeItem(`promptform_form_timer_start_${formId}`);
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timer auto submit
  const autoSubmitForm = () => {
    alert("Time limit expired! Your answers are being submitted automatically.");
    handleSubmitForm();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Logic visibility check
  const isQuestionVisible = (q: any) => {
    // If no logic branching mapped
    if (!q.logic || !q.logic.condition) return true;
    
    const targetQId = q.logic.target_question_id;
    const targetVal = q.logic.condition.value;
    const currentAns = answers[targetQId];

    const isMatch = String(currentAns).toLowerCase() === String(targetVal).toLowerCase();

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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  // 0. Inactive Form Status View
  if (isInactive) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-t-4 border-t-amber-500">
          <CardHeader>
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
            <CardTitle className="text-2xl">Form Inactive</CardTitle>
            <CardDescription className="text-sm mt-2 font-medium text-slate-700 dark:text-slate-300">
              {statusMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mt-2" onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 1. Password Lock View
  if (isLocked) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-10 h-10 text-primary mx-auto mb-3" />
            <CardTitle>Passcode Required</CardTitle>
            <CardDescription>This questionnaire is password-protected. Enter passcode to access.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter passcode..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">Unlock & Proceed</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Email Collection View
  if (!emailProvided) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
            <CardTitle>Enter your Email</CardTitle>
            <CardDescription>The author requires email verification before submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="you@example.com"
                value={collectedEmail}
                onChange={(e) => setCollectedEmail(e.target.value)}
                required
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
    const questionsBreakdown = questions.map((q) => {
      const isGraded = ['short_text', 'mcq', 'dropdown', 'checkbox'].includes(q.type) && q.validations?.correct_answer;
      const points = q.validations?.points ?? 0;
      
      if (isGraded) {
        totalPossiblePoints += points;
      }

      const studentAns = answers[q.id];
      const correctAns = q.validations?.correct_answer;
      
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

  // 3. Submitted Success Page
  if (submitted) {
    const quizResults = calculateQuizResults();
    const hasQuiz = quizResults.totalPossiblePoints > 0;
    const scorePct = hasQuiz ? Math.round((quizResults.earnedPoints / quizResults.totalPossiblePoints) * 100) : 0;

    return (
      <div className="min-h-screen bg-background dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-xl text-center border-t-4 border-t-emerald-500 dark:bg-zinc-900 dark:border-border shadow-xl p-6">
          <CardHeader>
            <Sparkles className="w-12 h-12 text-emerald-505 mx-auto mb-4" />
            <CardTitle className="text-2xl text-foreground dark:text-zinc-100">Response Registered!</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-muted-foreground">Thank you for your time. Your answers have been successfully locked.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasQuiz && (
              <div className="p-5 bg-muted dark:bg-zinc-950 border border-border dark:border-border rounded-2xl space-y-4">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Your Quiz Score</span>
                  <h3 className="text-4xl font-bold text-indigo-650 dark:text-primary mt-1">
                    {quizResults.earnedPoints} / {quizResults.totalPossiblePoints} Marks
                  </h3>
                  <div className={`mt-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                    scorePct >= 80 ? 'bg-emerald-55 dark:bg-emerald-950 text-emerald-600' :
                    scorePct >= 50 ? 'bg-amber-55 dark:bg-amber-955 text-amber-600' :
                    'bg-rose-55 dark:bg-rose-900 text-rose-600'
                  }`}>
                    {scorePct >= 80 ? 'Excellent! (Grade A)' : scorePct >= 50 ? 'Good (Grade B)' : 'Failed (Grade F)'}
                  </div>
                </div>

                <div className="border-t border-border dark:border-border pt-4 text-left">
                  <h4 className="text-xs font-bold text-muted-foreground dark:text-zinc-350 uppercase mb-3">Questions Grading Breakdown</h4>
                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                    {quizResults.questionsBreakdown.map((item, qIdx) => (
                      <div key={qIdx} className="p-3 bg-card dark:bg-zinc-900 border border-border dark:border-border rounded-lg flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground dark:text-zinc-100">Q{qIdx + 1}: {item.questionLabel}</p>
                          <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">
                            Your Answer: <span className={item.isCorrect ? 'text-emerald-600' : 'text-rose-605 font-bold'}>{item.studentAnswer}</span>
                          </p>
                          {!item.isCorrect && item.correctAnswer && (
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">Correct Answer: {item.correctAnswer}</p>
                          )}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          item.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900 text-rose-600'
                        }`}>
                          {item.earned} / {item.points} Pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {form.settings?.anti_cheat_detection && (
              <p className="text-xs text-muted-foreground bg-accent dark:bg-zinc-950 py-1.5 px-3 rounded inline-block">Proctoring status: Logged securely in system.</p>
            )}
            <Button variant="outline" className="w-full text-zinc-700 dark:text-foreground dark:hover:bg-zinc-800 border border-border dark:border-border rounded-lg h-10" onClick={() => router.push('/')}>
              Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSmartPlaceholder = (q: any) => {
    if (q.placeholder && q.placeholder.trim()) return q.placeholder;
    const label = (q.label || '').toLowerCase();
    
    if (label.includes('author')) return 'e.g. J.K. Rowling';
    if (label.includes('publisher')) return 'e.g. Penguin Random House';
    if (label.includes('isbn')) return 'e.g. 978-3-16-148410-0';
    if (label.includes('page')) return 'e.g. 350';
    if (label.includes('edition')) return 'e.g. 1st Edition';
    if (label.includes('year') || label.includes('publication')) return 'e.g. 2024';
    if (label.includes('model')) return 'e.g. MN-9082X';
    if (label.includes('color')) return 'e.g. Midnight Black';
    if (label.includes('ram')) return 'Select RAM...';
    if (label.includes('storage')) return 'Select Storage...';
    if (label.includes('battery')) return 'e.g. 5000 mAh';
    if (label.includes('display') || label.includes('screen')) return 'e.g. 6.7 inches';
    if (label.includes('connectivity')) return 'e.g. 5G, Wi-Fi 6, Bluetooth 5.3';
    if (label.includes('box')) return 'e.g. Device, Charging Cable, Manual';
    if (label.includes('brand')) return 'e.g. Apple / Samsung';
    if (label.includes('net quantity') || label.includes('quantity')) return 'e.g. 1 Unit';
    if (label.includes('ingredient')) return 'e.g. Vitamin C, Hyaluronic Acid';
    if (label.includes('dosage')) return 'e.g. 1 Tablet Daily';
    if (label.includes('side effect')) return 'e.g. Mild drowsiness';
    if (label.includes('drug') || label.includes('license')) return 'e.g. DL-2024-9981';
    if (label.includes('expiry') || label.includes('exp')) return 'e.g. MM/YYYY';
    if (label.includes('artisan') || label.includes('maker')) return 'e.g. Master Craftsman Studio';
    if (label.includes('material')) return 'e.g. 22K Gold, Sterling Silver';
    if (label.includes('technique')) return 'e.g. Hand-carved Filigree';
    if (label.includes('dimension')) return 'e.g. 10 x 5 x 2 cm';
    if (label.includes('care')) return 'e.g. Store in dry place, avoid water';
    if (label.includes('huid')) return 'Hallmark Unique ID';
    if (label.includes('occasion')) return 'Enter your occasion';

    const type = q.type || 'text';
    if (type === 'name') return 'e.g. John Doe';
    if (type === 'email') return 'e.g. john@example.com';
    if (type === 'phone') return 'e.g. +1 (555) 000-0000';
    if (type === 'website' || type === 'url') return 'e.g. https://portfolio.com';
    if (type === 'amount') return 'Enter amount number...';
    if (type === 'price') return '0.00';
    if (type === 'long_text' || type === 'feedback') return 'Write response details...';

    return `Enter ${q.label || 'answer'}...`;
  };

  const themeName = form?.theme?.theme_name || "indigo-school";
  const layoutType = form?.theme?.layoutType || form?.layoutConfig?.type || "compact-grid";

  const getThemeClasses = () => {
    switch (themeName) {
      case 'teal-medical':
        return {
          primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
          text: 'text-emerald-600',
          border: 'border-t-emerald-600 dark:border-t-emerald-500',
          bg: 'bg-emerald-50/30 dark:bg-background',
          card: 'border-emerald-100 dark:border-border focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'
        };
      case 'slate-dark':
        return {
          primary: 'bg-primary hover:opacity-90 text-primary-foreground focus:ring-primary/40',
          text: 'text-primary',
          border: 'border-t-primary dark:border-t-primary',
          bg: 'bg-background dark:bg-background',
          card: 'border-border dark:border-border bg-card/60 backdrop-blur-md text-foreground focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20'
        };
      case 'amber-warm':
        return {
          primary: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
          text: 'text-amber-600',
          border: 'border-t-amber-600 dark:border-t-amber-500',
          bg: 'bg-amber-50/20 dark:bg-background',
          card: 'border-amber-100 dark:border-border'
        };
      case 'indigo-school':
      default:
        return {
          primary: 'bg-primary hover:opacity-90 text-primary-foreground focus:ring-primary/40',
          text: 'text-primary',
          border: 'border-t-primary dark:border-t-primary',
          bg: 'bg-background/50 dark:bg-background',
          card: 'border-border dark:border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20'
        };
    }
  };
  const themeClasses = getThemeClasses();

  const visibleQuestions = questions.filter(isQuestionVisible);
  const isStepper = layoutType === 'stepper' || layoutType === 'wizard-steps' || layoutType === 'single-question' || layoutType === 'step-by-step-wizard' || layoutType === 'single-card-focus';

  const renderQuestionCard = (q: any, idx: number) => {
    return (
      <Card key={q.id} className={`transition-all duration-200 border-t-8 ${themeClasses.border} ${themeClasses.card} shadow-sm hover:shadow-md rounded-2xl`}>
        <CardContent className="pt-6 space-y-3.5">
          <p className="text-sm font-bold text-foreground dark:text-slate-100 flex items-start space-x-2">
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white ${themeClasses.primary.split(' ')[0]} mr-1.5`}>
              {idx + 1}
            </span>
            <span>{q.label} {q.required && <span className="text-destructive">*</span>}</span>
          </p>
          {/* SHORT TEXT, STANDARD INPUT, NAME, EMAIL, PHONE, WEBSITE, AMOUNT, PRICE */}
          {(q.type === 'short_text' || q.type === 'standard-input' || q.type === 'name' || q.type === 'email' || q.type === 'phone' || q.type === 'website' || q.type === 'amount' || q.type === 'price') && (
            <div className="relative flex items-center">
              {q.type === 'name' && <User className="absolute left-3 w-4 h-4 text-muted-foreground" />}
              {q.type === 'email' && <Mail className="absolute left-3 w-4 h-4 text-muted-foreground" />}
              {q.type === 'phone' && <Phone className="absolute left-3 w-4 h-4 text-muted-foreground" />}
              {q.type === 'website' && <Link className="absolute left-3 w-4 h-4 text-muted-foreground" />}
              {q.type === 'amount' && <Hash className="absolute left-3 w-4 h-4 text-muted-foreground" />}
              {q.type === 'price' && <DollarSign className="absolute left-3 w-4 h-4 text-muted-foreground" />}
              <Input
                type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'website' ? 'url' : (q.type === 'amount' || q.type === 'price' || q.type === 'number') ? 'number' : 'text'}
                step={q.type === 'price' ? '0.01' : '0.001'}
                min={0}
                onKeyDown={(e) => { if ((q.type === 'amount' || q.type === 'price' || q.type === 'number' || q.type === 'weight') && (e.key === '-' || e.key === 'e')) e.preventDefault(); }}
                placeholder={getSmartPlaceholder(q)}
                value={answers[q.id] || ""}
                onChange={(e) => {
                  let val = e.target.value;
                  if (q.type === 'amount' || q.type === 'price' || q.type === 'number' || q.type === 'weight') {
                    val = val.replace(/-/g, '');
                    if (val !== '') {
                      val = Math.max(0, parseFloat(val) || 0).toString();
                    }
                  }
                  setAnswers({ ...answers, [q.id]: val });
                }}
                required={q.required}
                className={`rounded-lg border-border dark:border-border bg-card dark:bg-background focus-visible:ring-1 w-full ${
                  ['name', 'email', 'phone', 'website', 'amount', 'price'].includes(q.type) ? 'pl-9' : ''
                }`}
              />
            </div>
          )}

          {/* PASSWORD FIELD */}
          {q.type === 'password' && (
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPasswords[q.id] ? "text" : "password"}
                placeholder="Enter password..."
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                required={q.required}
                className="pl-9 pr-10 rounded-lg border-border dark:border-border bg-card dark:bg-background w-full"
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
          {(q.type === 'long_text' || q.type === 'feedback' || q.type === 'address') && (
            <div className="relative">
              {q.type === 'address' && <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />}
              <textarea
                placeholder={
                  q.type === 'address' ? 'Street Address, Apt, Suite, City, State, ZIP...' :
                  'Write response details...'
                }
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                required={q.required}
                className={`w-full py-2.5 pr-3 border border-border dark:border-border bg-card dark:bg-background text-foreground dark:text-slate-100 rounded-lg text-sm focus:ring-1 focus:outline-none focus:ring-primary h-24 ${
                  q.type === 'address' ? 'pl-9' : 'px-3'
                }`}
              />
            </div>
          )}

          {/* MCQ, ONE_OPTION, GENDER */}
          {(q.type === 'mcq' || q.type === 'one_option' || q.type === 'gender') && (
            <div className="space-y-2">
              {(q.options && q.options.length > 0 ? q.options : (q.type === 'gender' ? ['Male', 'Female', 'Other', 'Prefer not to say'] : ['Option 1', 'Option 2'])).map((opt: string, oIdx: number) => (
                <label key={oIdx} className="flex items-center space-x-3 p-3 rounded-lg border border-border dark:border-border hover:bg-background dark:hover:bg-slate-900/40 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                    required={q.required && !answers[q.id]}
                    className="text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-350">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* CHECKBOX, MULTIPLE_OPTIONS */}
          {(q.type === 'checkbox' || q.type === 'multiple_options') && (
            <div className="space-y-2">
              {(q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2']).map((opt: string, oIdx: number) => {
                const currentSelections = answers[q.id] || [];
                const isChecked = currentSelections.includes(opt);
                return (
                  <label key={oIdx} className="flex items-center space-x-3 p-3 rounded-lg border border-border dark:border-border hover:bg-background dark:hover:bg-slate-900/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const newSels = isChecked
                          ? currentSelections.filter((s: string) => s !== opt)
                          : [...currentSelections, opt];
                        setAnswers({ ...answers, [q.id]: newSels });
                      }}
                      className="text-primary rounded focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-350">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* DROPDOWN, COUNTRY */}
          {(q.type === 'dropdown' || q.type === 'country') && (
            <div className="relative">
              {q.type === 'country' && <Globe className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />}
              <select
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                required={q.required}
                className={`w-full pr-3 py-2 bg-card dark:bg-background border border-border dark:border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                  q.type === 'country' ? 'pl-9' : 'px-3'
                }`}
              >
                <option value="">{q.type === 'country' ? '-- Select Country --' : '-- Choose Option --'}</option>
                {(q.options && q.options.length > 0 ? q.options : (q.type === 'country' ? ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Japan', 'Other'] : ['Option 1', 'Option 2'])).map((opt: string, oIdx: number) => (
                  <option key={oIdx} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* AGREEMENT */}
          {q.type === 'agreement' && (
            <label className="flex items-start space-x-3 p-3 rounded-lg border border-border dark:border-border hover:bg-background dark:hover:bg-slate-900/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={!!answers[q.id]}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.checked })}
                required={q.required}
                className="text-primary rounded focus:ring-primary w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-slate-700 dark:text-slate-350">{q.options[0] || "I agree to the terms and conditions"}</span>
            </label>
          )}

          {/* RATINGS */}
          {(q.type === 'rating' || q.type === 'star-rating') && (
            <div className="flex flex-wrap gap-2.5 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [q.id]: star })}
                  className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${
                    answers[q.id] === star 
                      ? "bg-primary text-white shadow-md scale-105" 
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-card text-slate-750 dark:text-slate-350"
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
          {(q.type === 'file_upload' || q.type === 'file-uploader' || q.type === 'resume') && (
            <div className="space-y-2">
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
                className="text-sm w-full py-2.5 px-3.5 border border-border dark:border-border rounded-lg bg-card dark:bg-background text-slate-800 dark:text-slate-100"
              />
              {q.type === 'resume' && <p className="text-xs text-muted-foreground">Accepted formats: PDF, DOC, DOCX up to 10MB</p>}
              {answers[q.id] && (
                <p className="text-xs text-emerald-650 dark:text-emerald-500 font-semibold flex items-center space-x-1">
                  <span>✓ Attached:</span>
                  <span className="underline truncate max-w-xs">{answers[q.id]}</span>
                </p>
              )}
            </div>
          )}

          {/* PHOTO UPLOAD */}
          {q.type === 'photo' && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border dark:border-border rounded-lg p-5 bg-background/50 dark:bg-background/30 text-center relative overflow-hidden">
              {answers[q.id] ? (
                <div className="space-y-3">
                  <div className="w-32 h-32 border border-border bg-muted dark:bg-card flex items-center justify-center mx-auto overflow-hidden rounded-lg shadow-sm">
                    <img src={answers[q.id]} alt="Upload Preview" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-emerald-605 font-semibold">Photo Attached</p>
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
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Upload Image File</p>
                  <p className="text-xs text-slate-450">JPEG, PNG, GIF up to 5MB</p>
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
        </CardContent>
      </Card>
    );
  };

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
      className={`min-h-screen ${themeClasses.bg} text-foreground dark:text-slate-100 pb-20 ${form?.theme?.rtl ? "text-right" : "text-left"}`}
      style={{ fontFamily: resolvedFont }}
    >
      {isPreview && (
        <div className="bg-indigo-650 text-white py-2.5 px-6 text-center text-xs font-bold select-none flex items-center justify-center space-x-2 animate-fadeIn shadow-md relative z-50">
          <Sparkles className="w-4 h-4 animate-pulse text-indigo-200" />
          <span>Preview Mode: Changes are shown live. Submissions here are mock only and will not be saved.</span>
        </div>
      )}

      {/* FLOATING HEADER PROCTORING WIDGET */}
      <header className="sticky top-0 z-40 bg-card/95 dark:bg-background/95 border-b border-border dark:border-border px-6 py-3 shadow-sm flex items-center justify-between">
        <span className="font-bold tracking-tight text-indigo-650 dark:text-primary">PromptForm Forms Responder</span>

        <div className="flex items-center space-x-6">
          {timeLeft !== null && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-mono font-bold text-sm bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-200/50">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Time Left: {formatTime(timeLeft)}</span>
            </div>
          )}
          
          {form.settings?.anti_cheat_detection && (
            <div className="flex items-center space-x-1 text-xs font-semibold text-muted-foreground bg-slate-100 dark:bg-card px-2.5 py-1.5 rounded">
              <Shield className="w-4 h-4 text-primary" />
              <span>Proctored (Switches: {tabSwitchCount})</span>
            </div>
          )}
        </div>
      </header>

      {/* QUESTIONNAIRE CONTAINER */}
      <div className="max-w-2xl mx-auto px-4 mt-8 space-y-6">
        {/* Banner Title */}
        <Card className={`border-t-8 ${themeClasses.border}`}>
          <CardHeader>
            <CardTitle className="text-2xl">{form.title}</CardTitle>
            <CardDescription className="text-sm mt-1">{form.description}</CardDescription>
          </CardHeader>
          {form.settings?.collect_emails && (
            <CardContent className="pt-0 text-xs text-muted-foreground">
              Submitting response as: <span className="font-semibold text-indigo-650">{collectedEmail}</span>
            </CardContent>
          )}
        </Card>

        {isFlagged && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg flex items-start space-x-3 text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold">Proctor Warning Flagged!</p>
              <p className="mt-0.5">Too many focus/tab switches detected. Your activity is logged.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="space-y-6">
          {isStepper ? (
            <div className="space-y-6">
              {/* Stepper progress bar */}
              <div className="bg-card dark:bg-zinc-900 border border-border dark:border-border rounded-lg p-4 shadow-sm space-y-2">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Progress</span>
                  <span>Question {currentStep + 1} of {visibleQuestions.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-card h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-200 ${themeClasses.primary.split(' ')[0]}`}
                    style={{ width: `${((currentStep + 1) / visibleQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Render current question */}
              {visibleQuestions[currentStep] && renderQuestionCard(visibleQuestions[currentStep], currentStep)}

              {/* Stepper Navigation Buttons */}
              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  className="px-6 py-2.5 rounded-lg border border-border dark:border-border text-slate-700 dark:text-slate-350 font-bold"
                >
                  Previous
                </Button>

                {currentStep < visibleQuestions.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const q = visibleQuestions[currentStep];
                      if (q.required && (answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && answers[q.id].length === 0))) {
                        alert(`Please answer this required question before proceeding.`);
                        return;
                      }
                      setCurrentStep(prev => Math.min(visibleQuestions.length - 1, prev + 1));
                    }}
                    className={`px-8 py-2.5 rounded-lg font-bold shadow-md ${themeClasses.primary}`}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-8 py-2.5 rounded-lg font-bold shadow-md ${themeClasses.primary}`}
                  >
                    {isSubmitting ? 'Locking response...' : 'Submit Response'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={layoutType === 'compact-grid' || layoutType === 'floating-grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0" : "space-y-6"}>
                {visibleQuestions.map((q, idx) => renderQuestionCard(q, idx))}
              </div>
              
              <Card className={themeClasses.card}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-bold">
                    <PenTool className="w-5 h-5 text-indigo-650" />
                    <span>Verification Signature Pad</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Sign in the box below to authorize your response lock.</p>
                  
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
                      className="w-full h-[150px] cursor-crosshair bg-card"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                      Clear Signature
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 text-base space-x-2 rounded-lg font-bold shadow-lg ${themeClasses.primary}`}
              >
                <Send className="w-5 h-5" />
                <span>{isSubmitting ? 'Locking submission...' : 'Submit Answers'}</span>
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
