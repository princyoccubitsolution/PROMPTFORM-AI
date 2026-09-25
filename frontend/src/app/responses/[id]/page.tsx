"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Shield, AlertCircle, FileText, Search, Printer, X, Clock, HelpCircle } from 'lucide-react';
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

  // Auto-detect Quiz
  const isQuiz = form && (
    form.category === 'quiz' || 
    form.title.toLowerCase().includes('quiz') || 
    form.title.toLowerCase().includes('test') || 
    form.title.toLowerCase().includes('exam') || 
    form.questions.some((q: any) => (q.validations as any)?.correctAnswer !== undefined)
  );

  // Helper to extract Enrollment Number
  const getEnrollmentNumber = (resp: any) => {
    if (!form) return '';
    const q = form.questions.find((q: any) => {
      const label = (q.label || '').toLowerCase();
      return q.type === 'short_text' && (
        label.includes('enrollment') || 
        label.includes('roll') || 
        label.includes('student id') || 
        label.includes('student_id') || 
        label.includes('gr number')
      );
    });
    return q ? String(resp?.answers?.[q.id] || '').trim() : '';
  };

  // Helper to extract Student Name
  const getStudentName = (resp: any) => {
    if (!form) return 'Anonymous';
    const q = form.questions.find((q: any) => {
      const label = (q.label || '').toLowerCase();
      return q.type === 'short_text' && (
        label === 'name' || 
        label === 'full name' || 
        label === 'student name' || 
        label.includes('name')
      );
    });
    return q ? String(resp?.answers?.[q.id] || '').trim() : (resp?.answers?.responder_email || "Anonymous");
  };

  // Helper to calculate Quiz score
  const calculateQuizScore = (resp: any) => {
    if (!form) return { correctCount: 0, totalGraded: 0, earnedPoints: 0, maxPoints: 0, percentage: 0 };
    let correctCount = 0;
    let totalGraded = 0;
    let earnedPoints = 0;
    let maxPoints = 0;

    form.questions.forEach((q: any) => {
      const validations = q.validations || {};
      if (validations.correctAnswer !== undefined && validations.correctAnswer !== null && validations.correctAnswer !== "") {
        totalGraded++;
        const pts = Number(validations.points || 5);
        maxPoints += pts;
        const userAns = resp?.answers?.[q.id];
        const isCorrect = userAns !== undefined && userAns !== null && String(userAns).trim().toLowerCase() === String(validations.correctAnswer).trim().toLowerCase();
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
      setResponses(respList);
    } catch (err: any) {
      alert("Error loading response sheets: " + err.message);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Compile and trigger browser CSV downloads
  const handleExportCSV = () => {
    if (responses.length === 0 || !form) return;

    // Gather headers
    const headers = isQuiz 
      ? ["Enrollment Number", "Student Name", "Responder Email", "Obtained Score", "Total Score Limit", "Percentage (%)", "Result Status", "Submission ID", "Completing Time (s)", "Proctor Tab Switches", "Flagged Status", "Date", ...form.questions.map((q: any) => q.label)]
      : ["Submission ID", "Responder Email", "Completing Time (s)", "Proctor Tab Switches", "Flagged Status", "Date", ...form.questions.map((q: any) => q.label)];

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
      const enroll = getEnrollmentNumber(resp);
      const name = getStudentName(resp);
      const email = resp?.answers?.responder_email || "Anonymous";

      const qAnswers = form.questions.map((q: any) => {
        const val = resp?.answers?.[q.id];
        if (val === undefined || val === null) return "";
        if (Array.isArray(val)) return `"${val.join(', ')}"`;
        const rawStr = String(val);
        let finalVal = rawStr;
        if (rawStr.startsWith('data:') || rawStr.includes(';base64,')) {
          if (q.type === 'signature') {
            finalVal = '[Signature Image]';
          } else {
            finalVal = '[Uploaded File/Image]';
          }
        }
        return `"${finalVal.replace(/"/g, '""')}"`;
      });

      if (isQuiz) {
        const stats = calculateQuizScore(resp);
        const passed = stats.percentage >= 50 ? "Passed" : "Failed";
        return [
          enroll,
          name,
          email,
          stats.earnedPoints,
          stats.maxPoints,
          `${stats.percentage}%`,
          passed,
          resp.id,
          resp.timeTaken,
          meta.tab_switches || 0,
          meta.is_flagged ? "Flagged" : "Clear",
          date,
          ...qAnswers
        ].join(",");
      } else {
        return [
          resp.id,
          email,
          resp.timeTaken,
          meta.tab_switches || 0,
          meta.is_flagged ? "Flagged" : "Clear",
          date,
          ...qAnswers
        ].join(",");
      }
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PromptForm_Form_${formId}_Responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedResponses = [...responses].sort((a, b) => {
    if (isQuiz) {
      const enrollA = getEnrollmentNumber(a);
      const enrollB = getEnrollmentNumber(b);
      if (!enrollA && enrollB) return 1;
      if (enrollA && !enrollB) return -1;
      if (!enrollA && !enrollB) return 0;
      return enrollA.localeCompare(enrollB, undefined, { numeric: true, sensitivity: 'base' });
    } else {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    }
  });

  const filteredResponses = sortedResponses.filter(r => {
    const textContent = JSON.stringify(r.answers).toLowerCase();
    return textContent.includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground dark:text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" className="p-2" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{form.title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Response Sheet Logs</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => window.open(`/responses/${formId}/print`, '_blank')} 
              className="space-x-1.5"
              disabled={responses.length === 0}
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF Report</span>
            </Button>

            <Button onClick={handleExportCSV} className="space-x-1.5" disabled={responses.length === 0}>
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* QUIZ ANALYTICS SUMMARY GRID */}
        {isQuiz && responses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            {/* Card 1: Class Average */}
            <div className="bg-card dark:bg-background border border-border/60 dark:border-border/80 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-extrabold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Class Average Score</span>
              <p className="text-2xl font-bold text-indigo-650 dark:text-primary mt-1">
                {Math.round(responses.reduce((sum, r) => sum + calculateQuizScore(r).percentage, 0) / responses.length)}%
              </p>
            </div>
            {/* Card 2: Highest Score */}
            <div className="bg-card dark:bg-background border border-border/60 dark:border-border/80 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-extrabold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Highest Scorer (#1)</span>
              {(() => {
                const scorers = responses.map(r => ({ name: getStudentName(r), score: calculateQuizScore(r).percentage }));
                scorers.sort((a, b) => b.score - a.score);
                const highest = scorers[0];
                return (
                  <p className="text-sm font-bold text-slate-800 dark:text-foreground mt-2.5 truncate">
                    {highest?.name} <span className="text-emerald-500 font-extrabold">({highest?.score}%)</span>
                  </p>
                );
              })()}
            </div>
            {/* Card 3: Pass Rate */}
            <div className="bg-card dark:bg-background border border-border/60 dark:border-border/80 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-extrabold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Pass Rate (&ge; 50%)</span>
              <p className="text-2xl font-bold text-emerald-650 dark:text-emerald-400 mt-1">
                {Math.round((responses.filter(r => calculateQuizScore(r).percentage >= 50).length / responses.length) * 100)}%
              </p>
            </div>
            {/* Card 4: Total Participants */}
            <div className="bg-card dark:bg-background border border-border/60 dark:border-border/80 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-extrabold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Total Submissions</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-foreground mt-1">
                {responses.length} Students
              </p>
            </div>
          </div>
        )}

        {/* SEARCH AND CONTROL BAR */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card dark:bg-background p-4 rounded-lg border border-border/60 dark:border-border/80">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search response values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center space-x-6 text-xs text-muted-foreground">
            <span>Total Records: <strong className="text-slate-800 dark:text-foreground">{responses.length}</strong></span>
            <span>Filtered: <strong className="text-primary">{filteredResponses.length}</strong></span>
          </div>
        </div>

        {/* RESPONSES LOG GRID */}
        {filteredResponses.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              <FileText className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-350">No Submissions Recorded</h3>
              <p className="text-xs text-muted-foreground mt-1">This form is waiting for responders to submit answers.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card dark:bg-background border border-border dark:border-border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-55/80 dark:bg-card border-b border-border dark:border-border font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {isQuiz && <th className="p-4">Enrollment No</th>}
                    <th className="p-4">{isQuiz ? "Student Name" : "Submission ID"}</th>
                    <th className="p-4">Email</th>
                    {isQuiz && <th className="p-4">Score</th>}
                    {isQuiz && <th className="p-4 text-center">Result Status</th>}
                    {!isQuiz && <th className="p-4">Duration</th>}
                    <th className="p-4 text-center">Tab Switches</th>
                    <th className="p-4 text-center">Flag Status</th>
                    <th className="p-4">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/80">
                  {filteredResponses.map((resp) => {
                    const meta = resp.browserMetadata || {};
                    return (
                      <tr 
                        key={resp.id} 
                        onClick={() => setSelectedResponse(resp)}
                        className="hover:bg-accent/60 dark:hover:bg-slate-800/50 cursor-pointer transition-all duration-150 select-none animate-fadeIn"
                      >
                        {isQuiz && (
                          <td className="p-4 font-bold text-indigo-650 dark:text-primary">
                            {getEnrollmentNumber(resp) || "N/A"}
                          </td>
                        )}
                        <td className="p-4 font-mono font-semibold text-slate-550 truncate max-w-[150px]">
                          {isQuiz ? getStudentName(resp) : resp.id}
                        </td>
                        <td className="p-4 font-bold">{resp?.answers?.responder_email || resp?.email || "Anonymous"}</td>
                        
                        {isQuiz && (() => {
                          const stats = calculateQuizScore(resp);
                          return (
                            <td className="p-4 font-bold text-slate-800 dark:text-zinc-50">
                              {stats.earnedPoints}/{stats.maxPoints} <span className="text-xs text-muted-foreground font-semibold">({stats.percentage}%)</span>
                            </td>
                          );
                        })()}

                        {isQuiz && (() => {
                          const stats = calculateQuizScore(resp);
                          const passed = stats.percentage >= 50;
                          return (
                            <td className="p-4 text-center">
                              {passed ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-400 font-bold text-xs">
                                  Passed ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-755 dark:text-red-400 font-bold text-xs">
                                  Failed ✗
                                </span>
                              )}
                            </td>
                          );
                        })()}

                        {!isQuiz && <td className="p-4">{resp.timeTaken} seconds</td>}
                        <td className="p-4 text-center">{meta.tab_switches || 0}</td>
                        <td className="p-4 text-center">
                          {meta.is_flagged ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-750 dark:text-red-400 font-semibold text-xs">
                              <Shield className="w-3 h-3" />
                              <span>Flagged</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-400 font-semibold text-xs">
                              <span>Clear</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">{new Date(resp.completedAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. SUBMISSION DETAIL MODAL */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => setSelectedResponse(null)} />
          
          {/* Modal Content Card */}
          <div className="relative bg-card dark:bg-zinc-900 border border-border dark:border-border rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-xl z-10 animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border dark:border-border flex justify-between items-center bg-muted/50 dark:bg-zinc-950/20">
              <div>
                <h3 className="text-sm font-bold text-foreground dark:text-foreground truncate max-w-[400px]">
                  {isQuiz ? getStudentName(selectedResponse) : (selectedResponse?.answers?.responder_email || "Anonymous Responder")}
                </h3>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs font-mono font-semibold text-muted-foreground">ID: {selectedResponse.id}</span>
                  {isQuiz && getEnrollmentNumber(selectedResponse) && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs font-bold text-primary dark:text-primary">Enrollment: {getEnrollmentNumber(selectedResponse)}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {isQuiz && (() => {
                  const stats = calculateQuizScore(selectedResponse);
                  const passed = stats.percentage >= 50;
                  return (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-foreground dark:text-foreground">
                        Score: {stats.earnedPoints}/{stats.maxPoints} ({stats.percentage}%)
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {passed ? 'Passed ✓' : 'Failed ✗'}
                      </span>
                    </div>
                  );
                })()}
                <button 
                  onClick={() => setSelectedResponse(null)}
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
              
              {/* Submission Metadata Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/60 dark:bg-zinc-900/40 p-3 rounded-lg border border-border/50 dark:border-border/80">
                  <span className="text-xs font-extrabold text-zinc-455 uppercase tracking-wide">Submitted At</span>
                  <p className="text-xs font-bold text-foreground dark:text-foreground mt-0.5">
                    {new Date(selectedResponse.completedAt).toLocaleString()}
                  </p>
                </div>
                <div className="bg-muted/60 dark:bg-zinc-900/40 p-3 rounded-lg border border-border/50 dark:border-border/80">
                  <span className="text-xs font-extrabold text-zinc-455 uppercase tracking-wide">Completion Time</span>
                  <p className="text-xs font-bold text-foreground dark:text-foreground mt-0.5">
                    {selectedResponse.timeTaken} seconds
                  </p>
                </div>
                <div className="bg-muted/60 dark:bg-zinc-900/40 p-3 rounded-lg border border-border/50 dark:border-border/80">
                  <span className="text-xs font-extrabold text-zinc-455 uppercase tracking-wide">Proctor Tab Switches</span>
                  <p className="text-xs font-bold text-foreground dark:text-foreground mt-0.5">
                    {selectedResponse.browserMetadata?.tab_switches || 0} times
                  </p>
                </div>
                <div className="bg-muted/60 dark:bg-zinc-900/40 p-3 rounded-lg border border-border/50 dark:border-border/80">
                  <span className="text-xs font-extrabold text-zinc-455 uppercase tracking-wide">Cheat Flag Status</span>
                  <p className="text-xs font-bold mt-0.5">
                    {selectedResponse.browserMetadata?.is_flagged ? (
                      <span className="text-destructive font-bold">Flagged ⚠️</span>
                    ) : (
                      <span className="text-emerald-500 font-bold">Clear ✓</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Answers Ledger List */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-zinc-455 uppercase tracking-wider border-b border-zinc-100 dark:border-border pb-2">
                  Question Responses List
                </h4>
                
                {form.questions.map((q: any, idx: number) => {
                  const ansVal = selectedResponse?.answers?.[q.id];
                  const hasAnswer = ansVal !== undefined && ansVal !== null && ansVal !== "";
                  const isBase64Image = hasAnswer && typeof ansVal === 'string' && (ansVal.startsWith('data:image/') || ansVal.includes(';base64,'));
                  
                  const validations = q.validations || {};
                  const correctAnswer = validations.correctAnswer;
                  const points = validations.points || 5;
                  const isAnswerCorrect = hasAnswer && String(ansVal).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();

                  return (
                    <div key={q.id || idx} className="space-y-1.5 animate-fadeIn">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-1.5">
                          <span className="text-xs font-bold bg-indigo-50 dark:bg-primary/10/40 text-indigo-650 dark:text-primary px-1.5 py-0.5 rounded border border-indigo-100/60 mt-0.5 select-none">
                            Q{idx + 1}
                          </span>
                          <p className="text-xs font-bold text-zinc-700 dark:text-foreground">
                            {q.label}
                          </p>
                        </div>
                        
                        {isQuiz && correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== "" && (
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded border ${
                            isAnswerCorrect 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/55' 
                              : 'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border-red-100 dark:border-red-900/55'
                          }`}>
                            {isAnswerCorrect ? `+${points} Marks (Correct)` : `0 / ${points} Marks (Incorrect)`}
                          </span>
                        )}
                      </div>

                      <div className="pl-7">
                        {isBase64Image ? (
                          <div className="inline-flex flex-col items-center justify-center p-2 bg-muted dark:bg-zinc-950/40 border border-border dark:border-border rounded-lg max-w-[200px] shadow-3xs">
                            <img 
                              src={ansVal} 
                              alt="attachment" 
                              className="max-h-24 max-w-full object-contain rounded-md"
                            />
                            <span className="text-xs font-bold text-zinc-405 mt-1 capitalize">{q.type} Preview</span>
                          </div>
                        ) : Array.isArray(ansVal) ? (
                          <div className="flex flex-wrap gap-1.5">
                            {ansVal.map((v, vIdx) => (
                              <span key={vIdx} className="inline-block px-2.5 py-0.5 bg-accent dark:bg-zinc-800/80 border border-border/50 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-700 dark:text-foreground">
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : hasAnswer ? (
                          <div className={`p-3 border rounded-2xl text-xs font-bold whitespace-pre-wrap leading-relaxed shadow-3xs ${
                            isQuiz && correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== ""
                              ? (isAnswerCorrect
                                ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/40 dark:border-emerald-800/25 text-emerald-800 dark:text-emerald-300'
                                : 'bg-red-50/20 dark:bg-red-950/10 border-red-200/40 dark:border-red-800/25 text-red-800 dark:text-red-300')
                              : 'bg-muted dark:bg-zinc-950/30 border-border/50 dark:border-border/80 text-foreground dark:text-foreground'
                          }`}>
                            {String(ansVal)}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-350 italic">No response submitted</p>
                        )}

                        {/* Display Correct Answer hint if incorrect */}
                        {isQuiz && correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== "" && !isAnswerCorrect && (
                          <p className="text-xs font-bold text-zinc-450 dark:text-muted-foreground mt-1 flex items-center">
                            <span className="text-emerald-600 dark:text-emerald-400 mr-1 font-extrabold">✓ Correct Answer:</span> {String(correctAnswer)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-border flex justify-end space-x-3 bg-muted/50 dark:bg-zinc-950/20">
              <Button 
                onClick={() => setSelectedResponse(null)}
                variant="outline" 
                className="text-xs font-bold bg-card dark:bg-zinc-900 border-zinc-250 dark:border-border"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  window.open(`/responses/${formId}/print`, '_blank');
                }}
                className="text-xs font-bold"
              >
                Print PDF Marksheet
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
