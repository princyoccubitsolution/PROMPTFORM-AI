"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function PrintableResponsesReport() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
      
      // Auto-trigger print window after loading assets
      setTimeout(() => {
        window.print();
      }, 1200);
    } catch (err: any) {
      alert("Error loading printable report: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Quiz helper flags & computations
  const isQuiz = form && (
    form.category === 'quiz' || 
    form.title.toLowerCase().includes('quiz') || 
    form.title.toLowerCase().includes('test') || 
    form.title.toLowerCase().includes('exam') || 
    form.questions.some((q: any) => (q.validations as any)?.correctAnswer !== undefined)
  );

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
    return q ? String(resp.answers[q.id] || '').trim() : '';
  };

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
    return q ? String(resp.answers[q.id] || '').trim() : (resp.answers.responder_email || "Anonymous");
  };

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
        const userAns = resp.answers[q.id];
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

  // Enrollment-wise sorting
  const sortedResponses = [...responses].sort((a, b) => {
    if (isQuiz) {
      const enrollA = getEnrollmentNumber(a);
      const enrollB = getEnrollmentNumber(b);
      if (!enrollA && enrollB) return 1;
      if (enrollA && !enrollB) return -1;
      if (!enrollA && !enrollB) return 0;
      return enrollA.localeCompare(enrollB, undefined, { numeric: true, sensitivity: 'base' });
    } else {
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
    }
  });

  if (isLoading || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card text-foreground p-6 md:p-12 print:p-0 print:bg-white print:text-zinc-900 font-sans">
      
      {/* 1. Print controls - Hidden during print */}
      <div className="max-w-7xl mx-auto flex items-center justify-between pb-6 mb-8 border-b border-border print:hidden">
        <button
          onClick={() => window.close()}
          className="flex items-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Close Tab
        </button>

        <Button onClick={handlePrint} className="space-x-1.5 font-bold shadow-sm">
          <Printer className="w-4 h-4" />
          <span>Trigger Print Dialog</span>
        </Button>
      </div>

      {/* 2. REPORT HEADER */}
      <div className="max-w-7xl mx-auto space-y-4 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
              {isQuiz ? "Quiz Marksheet Ledger" : "Form Submission Ledger"}
            </span>
            <h1 className="text-2xl font-bold mt-3 tracking-tight text-foreground">{form.title}</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{form.description || "No description provided for this questionnaire response ledger."}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-1">
            <p><strong>Generated At:</strong> {new Date().toLocaleString()}</p>
            <p><strong>Total Responses:</strong> {responses.length} Submissions</p>
          </div>
        </div>

        {/* Dynamic Analytics Block */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          {isQuiz ? (
            <>
              <div className="bg-muted p-3.5 rounded-lg border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Class Average Score</p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {responses.length > 0
                    ? `${Math.round(responses.reduce((sum, r) => sum + calculateQuizScore(r).percentage, 0) / responses.length)}%`
                    : "0%"}
                </p>
              </div>
              <div className="bg-muted p-3.5 rounded-lg border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Student Pass Rate (&ge; 50%)</p>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                  {responses.length > 0
                    ? `${Math.round((responses.filter(r => calculateQuizScore(r).percentage >= 50).length / responses.length) * 100)}%`
                    : "0%"}
                </p>
              </div>
              <div className="bg-muted p-3.5 rounded-lg border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Class Highest Score</p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {responses.length > 0
                    ? `${Math.max(...responses.map(r => calculateQuizScore(r).percentage))}%`
                    : "0%"}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted p-3.5 rounded-lg border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Submissions</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{responses.length}</p>
              </div>
              <div className="bg-muted p-3.5 rounded-lg border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Flagged Submissions</p>
                <p className="text-lg font-bold text-destructive mt-0.5">
                  {responses.filter(r => r.browserMetadata?.is_flagged).length}
                </p>
              </div>
              <div className="bg-muted p-3.5 rounded-lg border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Average Completion Time</p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {responses.length > 0
                    ? `${Math.round(responses.reduce((sum, r) => sum + (r.timeTaken || 0), 0) / responses.length)}s`
                    : "0s"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. REPORT DATA TABLE */}
      <div className="max-w-7xl mx-auto border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted border-b border-border font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                {isQuiz && <th className="p-3.5 border-r border-border min-w-[100px]">Enrollment No</th>}
                <th className="p-3.5 border-r border-border min-w-[120px]">
                  {isQuiz ? "Student Name" : "Respondent"}
                </th>
                <th className="p-3.5 border-r border-border min-w-[120px]">Email Address</th>
                {isQuiz && <th className="p-3.5 border-r border-border min-w-[90px]">Obtained Score</th>}
                {isQuiz && <th className="p-3.5 border-r border-border text-center min-w-[80px]">Status</th>}
                <th className="p-3.5 border-r border-border min-w-[110px]">Submitted At</th>
                
                {/* Dynamically render all question columns */}
                {form.questions.map((q: any, idx: number) => (
                  <th key={q.id || idx} className="p-3.5 border-r border-border min-w-[160px] max-w-[240px]">
                    <div className="font-bold text-foreground">Q{idx + 1}</div>
                    <div className="text-[9px] lowercase font-semibold truncate mt-0.5 text-muted-foreground">{q.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {sortedResponses.map((resp) => {
                const dateStr = new Date(resp.completedAt).toLocaleString();
                const email = resp.answers.responder_email || resp.email || "Anonymous";
                const enroll = getEnrollmentNumber(resp);
                const name = getStudentName(resp);

                return (
                  <tr key={resp.id} className="hover:bg-accent/40 transition-colors">
                    {isQuiz && (
                      <td className="p-3.5 border-r border-border font-bold text-primary">
                        {enroll || "N/A"}
                      </td>
                    )}
                    <td className="p-3.5 border-r border-border font-bold text-foreground leading-tight">
                      <div>{isQuiz ? name : email}</div>
                      {!isQuiz && (
                        <div className="text-[9px] font-mono text-muted-foreground mt-0.5 truncate max-w-[120px]">{resp.id}</div>
                      )}
                    </td>
                    <td className="p-3.5 border-r border-border text-muted-foreground font-semibold">{email}</td>
                    
                    {isQuiz && (() => {
                      const stats = calculateQuizScore(resp);
                      return (
                        <td className="p-3.5 border-r border-border font-bold text-foreground">
                          {stats.earnedPoints}/{stats.maxPoints} ({stats.percentage}%)
                        </td>
                      );
                    })()}

                    {isQuiz && (() => {
                      const stats = calculateQuizScore(resp);
                      const passed = stats.percentage >= 50;
                      return (
                        <td className="p-3.5 border-r border-border text-center font-bold">
                          <span className={passed ? 'text-emerald-600' : 'text-destructive'}>
                            {passed ? 'Passed ✓' : 'Failed ✗'}
                          </span>
                        </td>
                      );
                    })()}

                    <td className="p-3.5 border-r border-border text-muted-foreground font-semibold">{dateStr}</td>

                    {/* Render answers corresponding to each question */}
                    {form.questions.map((q: any, qIdx: number) => {
                      const ansVal = resp.answers[q.id];
                      const hasAnswer = ansVal !== undefined && ansVal !== null && ansVal !== "";
                      
                      const validations = q.validations || {};
                      const correctAnswer = validations.correctAnswer;
                      const isAnswerCorrect = hasAnswer && String(ansVal).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();

                      if (!hasAnswer) {
                        return <td key={q.id || qIdx} className="p-3.5 border-r border-border text-muted-foreground italic">No Answer</td>;
                      }

                      // Check if it is a base64 image (signatures/photos)
                      const isBase64Image = typeof ansVal === 'string' && (ansVal.startsWith('data:image/') || ansVal.includes(';base64,'));

                      return (
                        <td 
                          key={q.id || qIdx} 
                          className={`p-3.5 border-r border-border font-semibold ${
                            isQuiz && correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== ""
                              ? (isAnswerCorrect 
                                  ? 'text-emerald-700 bg-emerald-50/20' 
                                  : 'text-destructive bg-destructive/10')
                              : 'text-foreground'
                          }`}
                        >
                          {isBase64Image ? (
                            <div className="flex flex-col items-center justify-center p-1 bg-muted border border-border rounded-lg max-w-[120px]">
                              <img 
                                src={ansVal} 
                                alt="attachment" 
                                className="max-h-12 max-w-full object-contain"
                              />
                              <span className="text-[8px] font-bold text-muted-foreground mt-1 capitalize">{q.type}</span>
                            </div>
                          ) : Array.isArray(ansVal) ? (
                            <div className="flex flex-wrap gap-1">
                              {ansVal.map((v, vIdx) => (
                                <span key={vIdx} className="inline-block px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-bold text-muted-foreground">
                                  {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <span className="whitespace-pre-wrap">{String(ansVal)}</span>
                              {isQuiz && correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== "" && !isAnswerCorrect && (
                                <div className="text-[8px] font-bold text-muted-foreground mt-0.5 block">
                                  Correct: {String(correctAnswer)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Report Footer */}
      <div className="max-w-7xl mx-auto mt-12 text-center text-[10px] font-bold text-muted-foreground border-t border-border pt-4">
        © {new Date().getFullYear()} PromptForm AI. All rights reserved. Confidential student registry ledger.
      </div>
      
    </div>
  );
}
