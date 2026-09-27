"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Download, Shield, AlertCircle, FileText, Search, Printer, 
  X, Clock, HelpCircle, CheckCircle2, XCircle, Power, UserCheck, Check,
  SlidersHorizontal, Lock, Users, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<any | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Auto-detect Quiz
  const isQuiz = Boolean(
    form && (
      form.category === 'quiz' || 
      (form.title || '').toLowerCase().includes('quiz') || 
      (form.title || '').toLowerCase().includes('test') || 
      (form.title || '').toLowerCase().includes('exam') || 
      form.questions?.some((q: any) => ((q.validations as any)?.correctAnswer !== undefined || (q.validations as any)?.correct_answer !== undefined))
    )
  );

  // Auto-detect whether this is a Student Form / Academic Form
  const isStudentForm = Boolean(
    isQuiz ||
    form?.category === 'education' ||
    (form?.title || '').toLowerCase().match(/(student|class|exam|test|quiz|college|school|academic|course|batch|admission)/i) ||
    form?.questions?.some((q: any) => {
      const l = (q.label || '').toLowerCase();
      return l.includes('enrollment') || l.includes('roll') || l.includes('student') || l.includes('gr number');
    })
  );

  // Helper: Extract Enrollment Number with comprehensive fallbacks
  const getEnrollmentNumber = (resp: any): string => {
    if (!resp) return '';
    const answers = resp?.answers || {};

    // 1. Direct answers keys
    if (answers.enrollment_no && String(answers.enrollment_no).trim()) return String(answers.enrollment_no).trim();
    if (answers.enrollment && String(answers.enrollment).trim()) return String(answers.enrollment).trim();
    if (answers.roll_no && String(answers.roll_no).trim()) return String(answers.roll_no).trim();
    if (answers.student_id && String(answers.student_id).trim()) return String(answers.student_id).trim();
    if (answers.gr_no && String(answers.gr_no).trim()) return String(answers.gr_no).trim();
    if (answers.gr_number && String(answers.gr_number).trim()) return String(answers.gr_number).trim();

    // 2. Search questions list in form
    if (form?.questions && Array.isArray(form.questions)) {
      const q = form.questions.find((item: any) => {
        const label = (item.label || '').toLowerCase();
        const qid = (item.id || '').toLowerCase();
        return (
          label.includes('enrollment') || 
          label.includes('roll') || 
          label.includes('student id') || 
          label.includes('student_id') || 
          label.includes('gr number') ||
          label.includes('reg no') ||
          label.includes('registration no') ||
          label.includes('seat no') ||
          qid.includes('enrollment') ||
          qid.includes('roll') ||
          qid === 'field_enrollment_no'
        );
      });
      if (q && answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim()) {
        return String(answers[q.id]).trim();
      }
    }

    // 3. Scan answers dictionary keys
    for (const [k, v] of Object.entries(answers)) {
      if (v !== undefined && v !== null && String(v).trim()) {
        const lk = k.toLowerCase();
        if (lk.includes('enrollment') || lk.includes('roll') || lk.includes('student_id') || lk.includes('gr_no')) {
          return String(v).trim();
        }
      }
    }

    return '';
  };

  // Helper: Extract Student Name with comprehensive fallbacks
  const getStudentName = (resp: any): string => {
    if (!resp) return 'Anonymous';
    const answers = resp?.answers || {};

    // 1. Direct answers keys
    if (answers.student_name && String(answers.student_name).trim()) return String(answers.student_name).trim();
    if (answers.fullName && String(answers.fullName).trim()) return String(answers.fullName).trim();
    if (answers.name && String(answers.name).trim()) return String(answers.name).trim();

    // 2. Response submittedBy field if provided
    if (resp.submittedBy && String(resp.submittedBy).trim() && resp.submittedBy.toLowerCase() !== 'anonymous') {
      return String(resp.submittedBy).trim();
    }

    // 3. Search questions in form
    if (form?.questions && Array.isArray(form.questions)) {
      const q = form.questions.find((item: any) => {
        const label = (item.label || '').toLowerCase();
        const qid = (item.id || '').toLowerCase();
        return (
          item.type === 'name' ||
          qid.includes('student_name') ||
          qid === 'field_student_name' ||
          label === 'student name' || 
          label === 'full name' || 
          label === 'name' || 
          label.includes('student name') ||
          label.includes('full name') ||
          (label.includes('name') && !label.includes('file') && !label.includes('user') && !label.includes('company'))
        );
      });
      if (q && answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim()) {
        return String(answers[q.id]).trim();
      }
    }

    // 4. Scan answers keys
    for (const [k, v] of Object.entries(answers)) {
      if (v !== undefined && v !== null && String(v).trim()) {
        const lk = k.toLowerCase();
        if (lk === 'name' || lk.includes('student_name') || lk.includes('fullname')) {
          return String(v).trim();
        }
      }
    }

    // 5. Fallback to username from email
    const email = getStudentEmail(resp);
    if (email && email !== 'Anonymous' && email.includes('@')) {
      const userPart = email.split('@')[0].replace(/[._-]/g, ' ');
      return userPart.charAt(0).toUpperCase() + userPart.slice(1);
    }

    return 'Anonymous';
  };

  // Helper: Extract Student Email with comprehensive fallbacks
  const getStudentEmail = (resp: any): string => {
    if (!resp) return 'Anonymous';
    const answers = resp?.answers || {};

    // 1. Direct response email field
    if (resp.email && String(resp.email).trim() && resp.email.includes('@')) {
      return String(resp.email).trim();
    }

    // 2. Direct answers keys
    if (answers.responder_email && String(answers.responder_email).trim()) return String(answers.responder_email).trim();
    if (answers.email && String(answers.email).trim() && String(answers.email).includes('@')) return String(answers.email).trim();
    if (answers.student_email && String(answers.student_email).trim()) return String(answers.student_email).trim();

    // 3. Search questions in form
    if (form?.questions && Array.isArray(form.questions)) {
      const q = form.questions.find((item: any) => {
        const label = (item.label || '').toLowerCase();
        const qid = (item.id || '').toLowerCase();
        return (
          item.type === 'email' ||
          qid.includes('email') ||
          qid === 'field_student_email' ||
          label.includes('email') ||
          label.includes('e-mail')
        );
      });
      if (q && answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim()) {
        const val = String(answers[q.id]).trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return val;
      }
    }

    // 4. Scan answers keys for email regex
    for (const [, v] of Object.entries(answers)) {
      if (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
        return v.trim();
      }
    }

    return 'Anonymous';
  };

  // Helper: calculate Quiz score
  const calculateQuizScore = (resp: any) => {
    if (!form || !form.questions) return { correctCount: 0, totalGraded: 0, earnedPoints: 0, maxPoints: 0, percentage: 0 };
    let correctCount = 0;
    let totalGraded = 0;
    let earnedPoints = 0;
    let maxPoints = 0;

    form.questions.forEach((q: any) => {
      const validations = q.validations || {};
      const correctAns = (validations.correctAnswer !== undefined && validations.correctAnswer !== null && String(validations.correctAnswer).trim() !== "")
        ? validations.correctAnswer
        : (validations.correct_answer !== undefined && validations.correct_answer !== null && String(validations.correct_answer).trim() !== "" ? validations.correct_answer : undefined);
      if (correctAns !== undefined) {
        totalGraded++;
        const pts = Number(validations.points || 5);
        maxPoints += pts;
        const userAns = resp?.answers?.[q.id];
        const isCorrect = userAns !== undefined && userAns !== null && String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
        if (isCorrect) {
          correctCount++;
          earnedPoints += pts;
        }
      }
    });

    return {
      correctCount,
      totalGraded,
      earnedPoints,
      maxPoints,
      percentage: maxPoints > 0 ? Math.min(100, Math.round((earnedPoints / maxPoints) * 100)) : 0
    };
  };

  useEffect(() => {
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [formId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [formDetails, respList] = await Promise.all([
        api.get(`/forms/${formId}`),
        api.get(`/forms/${formId}/responses`)
      ]);
      setForm(formDetails);
      setResponses(Array.isArray(respList) ? respList : (respList?.data || []));
    } catch (err: any) {
      alert("Error loading response sheets: " + err.message);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Accepting Responses (PUBLISHED <-> CLOSED)
  const handleToggleAcceptingResponses = async () => {
    if (!form || isTogglingStatus) return;
    const isCurrentlyOpen = form.status === 'PUBLISHED';
    const newStatus = isCurrentlyOpen ? 'CLOSED' : 'PUBLISHED';
    setIsTogglingStatus(true);
    setStatusFeedback(null);

    try {
      await api.patch(`/forms/${formId}`, { status: newStatus });
      setForm((prev: any) => ({ ...prev, status: newStatus }));
      setStatusFeedback(newStatus === 'PUBLISHED' ? "Now accepting responses" : "Form closed — submissions paused");
      setTimeout(() => setStatusFeedback(null), 3500);
    } catch (err: any) {
      alert("Failed to update form status: " + (err.message || "Unknown error"));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Toggle Limit to 1 response
  const handleToggleLimitResponses = async () => {
    if (!form) return;
    const currentVal = Boolean(form.settings?.limit_responses);
    const updatedSettings = {
      ...(typeof form.settings === 'object' && form.settings ? form.settings : {}),
      limit_responses: !currentVal
    };

    try {
      await api.patch(`/forms/${formId}`, { settings: updatedSettings });
      setForm((prev: any) => ({ ...prev, settings: updatedSettings }));
      setStatusFeedback(!currentVal ? "Single submission limit activated" : "Submission limit disabled");
      setTimeout(() => setStatusFeedback(null), 3500);
    } catch (err: any) {
      alert("Failed to update response limit setting: " + (err.message || "Unknown error"));
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (responses.length === 0 || !form) return;

    const headers = (isQuiz || isStudentForm)
      ? [
          "Enrollment Number",
          "Student Name",
          "Student Email",
          ...(isQuiz ? ["Obtained Score", "Total Score Limit", "Percentage (%)", "Result Status"] : []),
          "Submission ID",
          "Completion Time (s)",
          "Proctor Tab Switches",
          "Flagged Status",
          "Submitted Date",
          ...(form.questions || []).map((q: any) => q.label || `Question ${q.orderIndex + 1}`)
        ]
      : [
          "Submission ID",
          "Respondent Email",
          "Completion Time (s)",
          "Proctor Tab Switches",
          "Flagged Status",
          "Submitted Date",
          ...(form.questions || []).map((q: any) => q.label || `Question ${q.orderIndex + 1}`)
        ];

    const sortedList = [...responses].sort((a, b) => {
      const enrollA = getEnrollmentNumber(a);
      const enrollB = getEnrollmentNumber(b);
      if (!enrollA && enrollB) return 1;
      if (enrollA && !enrollB) return -1;
      if (!enrollA && !enrollB) return 0;
      return enrollA.localeCompare(enrollB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const rows = sortedList.map((resp) => {
      const date = new Date(resp.completedAt).toLocaleString();
      const meta = resp.browserMetadata || {};
      const enroll = getEnrollmentNumber(resp) || 'N/A';
      const name = getStudentName(resp);
      const email = getStudentEmail(resp);

      const qAnswers = (form.questions || []).map((q: any) => {
        const val = resp?.answers?.[q.id];
        if (val === undefined || val === null) return "";
        if (Array.isArray(val)) return `"${val.join(', ')}"`;
        const rawStr = String(val);
        let finalVal = rawStr;
        if (rawStr.startsWith('data:') || rawStr.includes(';base64,')) {
          finalVal = q.type === 'signature' ? '[Signature Image]' : '[Uploaded File/Image]';
        }
        return `"${finalVal.replace(/"/g, '""')}"`;
      });

      if (isQuiz) {
        const stats = calculateQuizScore(resp);
        const passed = stats.percentage >= 50 ? "Passed" : "Failed";
        return [
          `"${enroll}"`,
          `"${name}"`,
          `"${email}"`,
          stats.earnedPoints,
          stats.maxPoints,
          `"${stats.percentage}%"`,
          `"${passed}"`,
          `"${resp.id}"`,
          resp.timeTaken || 0,
          meta.tab_switches || 0,
          meta.is_flagged ? "Flagged" : "Clear",
          `"${date}"`,
          ...qAnswers
        ].join(",");
      } else if (isStudentForm) {
        return [
          `"${enroll}"`,
          `"${name}"`,
          `"${email}"`,
          `"${resp.id}"`,
          resp.timeTaken || 0,
          meta.tab_switches || 0,
          meta.is_flagged ? "Flagged" : "Clear",
          `"${date}"`,
          ...qAnswers
        ].join(",");
      } else {
        return [
          `"${resp.id}"`,
          `"${email}"`,
          resp.timeTaken || 0,
          meta.tab_switches || 0,
          meta.is_flagged ? "Flagged" : "Clear",
          `"${date}"`,
          ...qAnswers
        ].join(",");
      }
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(form.title || 'Student_Responses').replace(/[^a-zA-Z0-9_-]/g, '_')}_Responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort responses: Enrollment-wise for students/quizzes, otherwise timestamp desc
  const sortedResponses = useMemo(() => {
    return [...responses].sort((a, b) => {
      if (isQuiz || isStudentForm) {
        const enrollA = getEnrollmentNumber(a);
        const enrollB = getEnrollmentNumber(b);
        if (!enrollA && enrollB) return 1;
        if (enrollA && !enrollB) return -1;
        if (enrollA && enrollB) {
          const cmp = enrollA.localeCompare(enrollB, undefined, { numeric: true, sensitivity: 'base' });
          if (cmp !== 0) return cmp;
        }
      }
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });
  }, [responses, isQuiz, isStudentForm]);

  // Enhanced search across Name, Enrollment, Email, and answers
  const filteredResponses = useMemo(() => {
    if (!searchTerm.trim()) return sortedResponses;
    const term = searchTerm.toLowerCase().trim();
    return sortedResponses.filter(r => {
      const enroll = getEnrollmentNumber(r).toLowerCase();
      const name = getStudentName(r).toLowerCase();
      const email = getStudentEmail(r).toLowerCase();
      const id = String(r.id || '').toLowerCase();
      const answersText = JSON.stringify(r.answers || {}).toLowerCase();
      return (
        enroll.includes(term) ||
        name.includes(term) ||
        email.includes(term) ||
        id.includes(term) ||
        answersText.includes(term)
      );
    });
  }, [sortedResponses, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-primary mb-3"></div>
        <p className="text-xs font-medium text-muted-foreground">Loading response ledger...</p>
      </div>
    );
  }

  const isFormOpen = form?.status === 'PUBLISHED';
  const isLimitOne = Boolean(form?.settings?.limit_responses);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-3 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP NAVIGATION & FORM CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/70">
          <div className="flex items-center space-x-3 min-w-0">
            <Button 
              variant="ghost" 
              className="p-2 h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl hover:bg-muted" 
              onClick={() => router.push('/dashboard')}
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate text-foreground">
                  {form?.title || 'Form Responses'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isFormOpen 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  {isFormOpen ? "Accepting Responses" : "Form Closed"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>Unique Responses Ledger</span>
                <span>•</span>
                <span className="font-semibold text-foreground">{responses.length} Submissions Total</span>
              </p>
            </div>
          </div>

          {/* ACTIONS & EXPORTS */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button 
              variant="outline"
              onClick={() => window.open(`/responses/${formId}/print`, '_blank')} 
              className="space-x-1.5 font-medium rounded-xl h-9 text-xs border-border"
              disabled={responses.length === 0}
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Print / PDF Ledger</span>
            </Button>

            <Button 
              onClick={handleExportCSV} 
              className="space-x-1.5 font-medium rounded-xl h-9 text-xs shadow-xs" 
              disabled={responses.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {statusFeedback && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusFeedback}</span>
            </div>
            <button onClick={() => setStatusFeedback(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SUBMISSION CONTROL PANEL (ACCEPTING RESPONSES TOGGLE & LIMIT) */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          
          {/* Toggle 1: Accepting Responses (Form Open / Closed) */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/60">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-foreground">Accepting Responses</span>
                <span className={`inline-block w-2 h-2 rounded-full ${isFormOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isFormOpen 
                  ? "Form is live and collecting responses from students" 
                  : "Form is closed. Responders see 'This form is no longer accepting responses'"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isFormOpen}
              disabled={isTogglingStatus}
              onClick={handleToggleAcceptingResponses}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isFormOpen ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              } ${isTogglingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isFormOpen ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Single-submission restriction */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/60">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-foreground">Limit to 1 Response</span>
                {isLimitOne && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/10 text-primary">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Restrict to 1 submission per student/email and prevent duplicate or re-open submissions
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isLimitOne}
              onClick={handleToggleLimitResponses}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isLimitOne ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isLimitOne ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

        </div>

        {/* QUIZ / STUDENT PERFORMANCE OVERVIEW CARDS */}
        {(isQuiz || isStudentForm) && responses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            {/* Card 1: Class Average */}
            {isQuiz && (
              <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Class Average Score</span>
                <p className="text-2xl font-bold text-primary mt-1">
                  {Math.round(responses.reduce((sum, r) => sum + calculateQuizScore(r).percentage, 0) / responses.length)}%
                </p>
                <span className="text-[11px] text-muted-foreground">Across all graded questions</span>
              </div>
            )}

            {/* Card 2: Highest Scorer */}
            {isQuiz && (
              <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Highest Scorer (#1)</span>
                {(() => {
                  const scorers = responses.map(r => ({ name: getStudentName(r), score: calculateQuizScore(r).percentage, enroll: getEnrollmentNumber(r) }));
                  scorers.sort((a, b) => b.score - a.score);
                  const highest = scorers[0];
                  return (
                    <div className="mt-1">
                      <p className="text-base font-bold text-foreground truncate">
                        {highest?.name || "N/A"}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                        Score: {highest?.score}% {highest?.enroll ? `• ${highest.enroll}` : ''}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Card 3: Pass Rate */}
            {isQuiz && (
              <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pass Rate (&ge; 50%)</span>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {Math.round((responses.filter(r => calculateQuizScore(r).percentage >= 50).length / responses.length) * 100)}%
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {responses.filter(r => calculateQuizScore(r).percentage >= 50).length} of {responses.length} passed
                </span>
              </div>
            )}

            {/* Card 4: Total Participants */}
            <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Submissions</span>
              <p className="text-2xl font-bold text-foreground mt-1">
                {responses.length} Students
              </p>
              <span className="text-[11px] text-muted-foreground">Unique student response records</span>
            </div>
          </div>
        )}

        {/* SEARCH AND FILTER BAR */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3.5 rounded-2xl border border-border/80">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, enrollment no, email, or answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9.5 h-9 text-xs rounded-xl font-medium bg-background border-border/80"
            />
          </div>

          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span>Total: <strong className="text-foreground font-semibold">{responses.length}</strong></span>
            <span>Filtered: <strong className="text-primary font-semibold">{filteredResponses.length}</strong></span>
          </div>
        </div>

        {/* RESPONSES DATA TABLE */}
        {filteredResponses.length === 0 ? (
          <Card className="text-center py-20 rounded-2xl border border-border/80 bg-card">
            <CardContent>
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-bold text-foreground text-sm">No Student Submissions Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {responses.length === 0 
                  ? "This form is currently waiting for students to submit their responses." 
                  : "No submissions match your search query. Try searching with different terms."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            {/* Horizontal scroll container with responsive overflow-x: auto */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap min-w-[130px]">Enrollment No</th>
                    <th className="px-4 py-3.5 whitespace-nowrap min-w-[160px]">Student Name</th>
                    <th className="px-4 py-3.5 whitespace-nowrap min-w-[170px]">Student Email</th>
                    {isQuiz && <th className="px-4 py-3.5 whitespace-nowrap min-w-[100px]">Score</th>}
                    {isQuiz && <th className="px-4 py-3.5 text-center whitespace-nowrap min-w-[100px]">Result Status</th>}
                    {!isQuiz && <th className="px-4 py-3.5 whitespace-nowrap min-w-[100px]">Time Taken</th>}
                    <th className="px-4 py-3.5 text-center whitespace-nowrap min-w-[95px]">Tab Switches</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap min-w-[95px]">Flag Status</th>
                    <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">Submitted At</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap min-w-[80px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70 font-sans">
                  {filteredResponses.map((resp, idx) => {
                    const meta = resp.browserMetadata || {};
                    const enroll = getEnrollmentNumber(resp) || "N/A";
                    const name = getStudentName(resp);
                    const email = getStudentEmail(resp);

                    return (
                      <tr 
                        key={resp.id || idx} 
                        onClick={() => setSelectedResponse(resp)}
                        className="hover:bg-muted/50 cursor-pointer transition-colors duration-150 select-none align-middle"
                      >
                        {/* 1. Enrollment No */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-primary">
                          {enroll}
                        </td>

                        {/* 2. Student Name (Clean sans-serif, non-stretched) */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-foreground text-xs">
                          {name}
                        </td>

                        {/* 3. Student Email */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-muted-foreground text-xs">
                          {email}
                        </td>
                        
                        {/* 4. Score (Quiz only) */}
                        {isQuiz && (() => {
                          const stats = calculateQuizScore(resp);
                          return (
                            <td className="px-4 py-3.5 whitespace-nowrap font-bold text-foreground">
                              {stats.earnedPoints}/{stats.maxPoints} <span className="text-[11px] text-muted-foreground font-semibold">({stats.percentage}%)</span>
                            </td>
                          );
                        })()}

                        {/* 5. Result Status (Quiz only) */}
                        {isQuiz && (() => {
                          const stats = calculateQuizScore(resp);
                          const passed = stats.percentage >= 50;
                          return (
                            <td className="px-4 py-3.5 whitespace-nowrap text-center">
                              {passed ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
                                  Passed ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px] border border-rose-500/20">
                                  Failed ✗
                                </span>
                              )}
                            </td>
                          );
                        })()}

                        {/* 6. Duration / Time taken */}
                        {!isQuiz && (
                          <td className="px-4 py-3.5 whitespace-nowrap font-medium text-muted-foreground">
                            {resp.timeTaken || 0}s
                          </td>
                        )}

                        {/* 7. Proctoring Tab Switches */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-medium text-foreground">
                          {meta.tab_switches || 0}
                        </td>

                        {/* 8. Proctor Flag Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          {meta.is_flagged ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[10px] border border-rose-500/20">
                              <Shield className="w-3 h-3" />
                              <span>Flagged</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                              <span>Clear</span>
                            </span>
                          )}
                        </td>

                        {/* 9. Submission Timestamp */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground font-medium">
                          {new Date(resp.completedAt).toLocaleString()}
                        </td>

                        {/* 10. Action Button */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResponse(resp);
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="px-4 py-3 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
              <span>Showing <strong>{filteredResponses.length}</strong> of <strong>{responses.length}</strong> student submissions</span>
              <span>All student records uniquely identified and securely stored.</span>
            </div>
          </div>
        )}
      </div>

      {/* SUBMISSION DETAIL MODAL */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn font-sans">
          <div className="absolute inset-0" onClick={() => setSelectedResponse(null)} />
          
          <div className="relative bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-xl z-10 animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-foreground truncate">
                  {getStudentName(selectedResponse)}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  {getEnrollmentNumber(selectedResponse) && (
                    <span className="font-bold text-primary">
                      Enrollment: {getEnrollmentNumber(selectedResponse)}
                    </span>
                  )}
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground font-medium">
                    {getStudentEmail(selectedResponse)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 shrink-0">
                {isQuiz && (() => {
                  const stats = calculateQuizScore(selectedResponse);
                  const passed = stats.percentage >= 50;
                  return (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-foreground">
                        {stats.earnedPoints}/{stats.maxPoints} ({stats.percentage}%)
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        passed ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}>
                        {passed ? 'Passed ✓' : 'Failed ✗'}
                      </span>
                    </div>
                  );
                })()}
                <button 
                  onClick={() => setSelectedResponse(null)}
                  className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              
              {/* Submission Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Submitted At</span>
                  <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                    {new Date(selectedResponse.completedAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Duration</span>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {selectedResponse.timeTaken || 0} seconds
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Tab Switches</span>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {selectedResponse.browserMetadata?.tab_switches || 0} times
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Integrity Status</span>
                  <p className="text-xs font-semibold mt-0.5">
                    {selectedResponse.browserMetadata?.is_flagged ? (
                      <span className="text-rose-600 font-bold">Flagged ⚠️</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Clear ✓</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Answers Ledger List */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                  Question Responses Ledger
                </h4>
                
                {(form.questions || []).map((q: any, idx: number) => {
                  const ansVal = selectedResponse?.answers?.[q.id];
                  const hasAnswer = ansVal !== undefined && ansVal !== null && ansVal !== "";
                  const isBase64Image = hasAnswer && typeof ansVal === 'string' && (ansVal.startsWith('data:image/') || ansVal.includes(';base64,'));
                  
                  const validations = q.validations || {};
                  const correctAnswer = (validations.correctAnswer !== undefined && validations.correctAnswer !== null && String(validations.correctAnswer).trim() !== "")
                    ? validations.correctAnswer
                    : (validations.correct_answer !== undefined && validations.correct_answer !== null && String(validations.correct_answer).trim() !== "" ? validations.correct_answer : undefined);
                  const points = validations.points || 5;
                  const isAnswerCorrect = hasAnswer && String(ansVal).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();

                  return (
                    <div key={q.id || idx} className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2">
                          <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md shrink-0">
                            Q{idx + 1}
                          </span>
                          <p className="text-xs font-bold text-foreground">
                            {q.label}
                          </p>
                        </div>
                        
                        {isQuiz && correctAnswer !== undefined && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            isAnswerCorrect 
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          }`}>
                            {isAnswerCorrect ? `+${points} Marks (Correct)` : `0 / ${points} Marks (Incorrect)`}
                          </span>
                        )}
                      </div>

                      <div className="pl-7">
                        {isBase64Image ? (
                          <div className="inline-flex flex-col items-center justify-center p-2 bg-muted border border-border rounded-lg max-w-[200px]">
                            <img 
                              src={ansVal} 
                              alt="attachment" 
                              className="max-h-24 max-w-full object-contain rounded-md"
                            />
                            <span className="text-[10px] font-bold text-muted-foreground mt-1 capitalize">{q.type} Preview</span>
                          </div>
                        ) : Array.isArray(ansVal) ? (
                          <div className="flex flex-wrap gap-1">
                            {ansVal.map((v, vIdx) => (
                              <span key={vIdx} className="inline-block px-2 py-0.5 bg-background border border-border rounded text-xs font-medium text-foreground">
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : hasAnswer ? (
                          <div className={`p-2.5 rounded-lg text-xs font-medium leading-relaxed ${
                            isQuiz && correctAnswer !== undefined
                              ? (isAnswerCorrect
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300')
                              : 'bg-background border border-border/70 text-foreground'
                          }`}>
                            {String(ansVal)}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No response submitted</p>
                        )}

                        {/* Display Correct Answer if incorrect */}
                        {isQuiz && correctAnswer !== undefined && !isAnswerCorrect && (
                          <p className="text-xs font-semibold text-muted-foreground mt-1.5 flex items-center">
                            <span className="text-emerald-600 dark:text-emerald-400 mr-1.5 font-bold">✓ Correct Answer:</span> {String(correctAnswer)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end space-x-3 bg-muted/30">
              <Button 
                onClick={() => setSelectedResponse(null)}
                variant="outline" 
                className="text-xs font-medium rounded-xl"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  window.open(`/responses/${formId}/print`, '_blank');
                }}
                className="text-xs font-medium rounded-xl"
              >
                Print Student Marksheet
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
