"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, Paperclip, X, Trash2, Bot, User, RefreshCw, 
  StopCircle, Edit3, Copy, Mic, MicOff, FileText, Check, Plus, AlertCircle 
} from 'lucide-react';
import { Button } from './ui/Button';
import { getBaseUrl } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
  timestamp?: Date | string | number;
  isActionable?: boolean;
}

interface AssistantChatProps {
  formId?: string;
  onFormGenerated: (form: any) => void;
  onRestrictionTriggered?: (restriction: any) => void;
}

function MarkdownRenderer({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2.5 text-sm select-text">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0] && !lines[0].includes(' ') ? lines[0] : '';
          const code = language ? lines.slice(1).join('\n') : lines.join('\n');
          return (
            <div key={idx} className="my-3.5 rounded-2xl overflow-hidden border border-zinc-300 dark:border-border bg-zinc-950 text-zinc-100 font-mono text-xs shadow-md select-text">
              <div className="bg-zinc-900/80 px-4 py-2 flex justify-between items-center text-xs text-muted-foreground font-bold border-b border-zinc-800 select-none">
                <span className="tracking-widest uppercase">{language || 'CODE'}</span>
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    alert("Copied to clipboard!");
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 overflow-x-auto whitespace-pre leading-relaxed select-text">{code}</pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('✓');
              if (isBullet) {
                const content = trimmed.substring(1).trim();
                return (
                  <div key={lineIdx} className="flex items-start space-x-2.5 pl-1 my-1.5">
                    <span className="text-indigo-650 dark:text-primary font-bold text-sm select-none">✓</span>
                    <span className="text-foreground dark:text-zinc-250 select-text leading-relaxed font-normal">{parseInlineStyles(content)}</span>
                  </div>
                );
              }
              return (
                <p key={lineIdx} className="whitespace-pre-wrap select-text leading-relaxed font-normal text-foreground dark:text-foreground">
                  {parseInlineStyles(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function parseInlineStyles(line: string) {
  const boldParts = line.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      return <strong key={bIdx} className="font-bold text-zinc-950 dark:text-foreground">{bPart.slice(2, -2)}</strong>;
    }
    const codeParts = bPart.split(/(\`.*?\`)/g);
    return codeParts.map((cPart, cIdx) => {
      if (cPart.startsWith('`') && cPart.endsWith('`')) {
        return <code key={cIdx} className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-sm font-mono text-indigo-700 dark:text-indigo-350 font-bold">{cPart.slice(1, -1)}</code>;
      }
      return cPart;
    });
  });
}

export function AssistantChat({ formId, onFormGenerated, onRestrictionTriggered }: AssistantChatProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      text: "👋 **Welcome back to PROMPTFORM Workspace.**\nI can build fields, insert conditional logic, write themes, and check your form's accessibility.\n\nAttach any **PDF, DOCX, CSV, or image** to import structure instantly.",
      timestamp: 1783000000000
    }
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Create a 10-question JavaScript quiz for beginners",
    "Create a difficult Node.js MCQ exam",
    "Create a customer satisfaction survey",
    "Create a student registration form",
    "Create a restaurant feedback form",
    "Create an event registration form",
    "Create a job application form for a backend developer",
    "Create a product feedback survey"
  ]);
  
  // Voice simulation
  const [isListening, setIsListening] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEditMessage = (msg: Message) => {
    setInput(msg.text);
    const chatInput = document.getElementById("builder-chat-input");
    if (chatInput) {
      chatInput.focus();
    }
  };

  const handleRegenerate = async (msg: Message) => {
    let promptToRetry = "";
    if (msg.role === 'user') {
      promptToRetry = msg.text;
    } else {
      const idx = messages.findIndex(m => m.id === msg.id);
      if (idx > 0 && messages[idx - 1].role === 'user') {
        promptToRetry = messages[idx - 1].text;
      }
    }
    if (promptToRetry) {
      await handleSubmit(undefined, promptToRetry);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setMessages(prev => [
        ...prev.filter(m => !m.isStreaming),
        { id: `stop-${Date.now()}`, role: 'assistant', text: "🛑 **Generation paused by user.** Make adjustments or resume editing." }
      ]);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      if (voiceTimer) clearInterval(voiceTimer);
      setInput("Create a registration form for a design summit");
    } else {
      setIsListening(true);
      setInput("Listening carefully to your voice...");
      let counter = 0;
      const interval = setInterval(() => {
        counter++;
        if (counter > 3) {
          setIsListening(false);
          clearInterval(interval);
          setInput("Generate customer feedback form with ratings");
        }
      }, 1000);
      setVoiceTimer(interval);
    }
  };

  useEffect(() => {
    return () => {
      if (voiceTimer) clearInterval(voiceTimer);
    };
  }, [voiceTimer]);

  const handleSubmit = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = overridePrompt !== undefined ? overridePrompt : input;
    if (!promptToSend.trim() && !attachedFile) return;

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: promptToSend || (attachedFile ? `Attached file for structures: **${attachedFile.name}**` : "Generate Form"),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSuggestions([]);
    setIsGenerating(true);

    // Prepare assistant streaming message placeholder
    const assistantMsgId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', text: "Thinking and scanning database rules...", isStreaming: true, timestamp: new Date() }]);
    setTimeout(scrollToBottom, 50);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('prompt', promptToSend);
      if (formId) {
        formData.append('formId', formId);
      }
      if (attachedFile) {
        formData.append('file', attachedFile);
      }

      let token = localStorage.getItem('promptform_access_token');
      let response = await fetch(`${getBaseUrl()}/ai/chat-stream`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (response.status === 401) {
        const refreshToken = localStorage.getItem('promptform_refresh_token');
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${getBaseUrl()}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });
            if (refreshRes.ok) {
              const data = await refreshRes.json();
              localStorage.setItem('promptform_access_token', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('promptform_refresh_token', data.refreshToken);
              }
              // Retry
              response = await fetch(`${getBaseUrl()}/ai/chat-stream`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${data.accessToken}` },
                body: formData,
                signal: abortControllerRef.current.signal
              });
            }
          } catch (err) {
            // ignore
          }
        }
      }

      if (response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        if (errData.status === 'restricted') {
          setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
          if (onRestrictionTriggered) {
            onRestrictionTriggered(errData);
          }
          setIsGenerating(false);
          return;
        }
      }

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                accumulatedText = `❌ Error: ${data.error}`;
                setMessages(prev =>
                  prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulatedText, isStreaming: false } : m)
                );
              } else if (data.type === 'message') {
                accumulatedText = data.text;
                setMessages(prev =>
                  prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulatedText } : m)
                );
                setTimeout(scrollToBottom, 50);
              } else if (data.type === 'pills') {
                if (Array.isArray(data.pills)) {
                  const flatPills = Array.isArray(data.pills[0]) ? data.pills[0] : data.pills;
                  setSuggestions(flatPills);
                }
              } else if (data.type === 'form') {
                onFormGenerated(data.form);
                const summary = data.understandingSummary || data.form?.understandingSummary;
                let summaryPrefix = "";
                if (summary) {
                  summaryPrefix = `💡 **I understood your request as:**\n• **Topic:** ${summary.topic || 'General'}\n• **Purpose:** ${summary.purpose || 'Form Generation'}\n• **Type:** ${summary.formType || 'Form'}\n• **Difficulty:** ${summary.difficulty || 'Intermediate'}\n• **Questions:** ${summary.questionCount || data.form?.questions?.length || 10}\n\n`;
                }
                setMessages(prev =>
                  prev.map(m => m.id === assistantMsgId ? { 
                    ...m, 
                    text: summaryPrefix + (accumulatedText && accumulatedText !== "Thinking and scanning database rules..." ? accumulatedText : `✨ **Form generated successfully!** Live preview updated on the right.`),
                    isStreaming: false 
                  } : m)
                );
                setSuggestions([
                  "Add 5 more questions",
                  "Make the questions harder",
                  "Change to true or false",
                  "Add a 10-minute timer"
                ]);
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }

      // Mark streaming message as completed
      setMessages(prev =>
        prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m)
      );
      setAttachedFile(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      let errorMsg = err.message || '';
      if (
        errorMsg.includes('Failed to fetch') ||
        errorMsg.includes('fetch failed') ||
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('Failed to connect')
      ) {
        errorMsg = 'Backend server is not running or unreachable. Please start it using "npm run dev".';
      }
      setMessages(prev =>
        prev.map(m => m.id === assistantMsgId ? { ...m, text: `❌ **Co-Pilot interrupted**: ${errorMsg}`, isStreaming: false } : m)
      );
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      setTimeout(scrollToBottom, 50);
    }
  };

  const handleQuickAction = (action: string) => {
    let p = "";
    if (action === "improve") p = "Review my current form structure, suggest wording improvements, and add details where needed.";
    if (action === "rewrite") p = "Rewrite the question labels to be more direct, engaging, and professional.";
    if (action === "translate") p = "Translate the entire questionnaire questions list into French.";
    if (action === "accessibility") p = "Audit our form accessibility structure. Recommend or inject proper aria tags, description cues, and helper lines.";
    if (action === "recommend") p = "Analyze current questions list and suggest three relevant advanced fields to increase response conversion.";
    
    if (p) {
      handleSubmit(undefined, p);
    }
  };

  return (
    <div className="flex flex-col h-[560px] bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[24px] border border-border/80 dark:border-border/60 shadow-xl overflow-hidden transition-all duration-300">
      
      {/* Co-Pilot Header Panel */}
      <div className="px-4 py-3 bg-accent/50 dark:bg-zinc-950/20 border-b border-zinc-250 dark:border-border flex justify-between items-center select-none animate-in fade-in duration-200">
        <div className="flex items-center space-x-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-extrabold text-muted-foreground dark:text-muted-foreground uppercase tracking-widest">Co-Pilot Workspace</span>
        </div>
        <div className="flex space-x-1.5">
          <span className="text-xs px-2.5 py-0.5 bg-indigo-50/50 dark:bg-primary/10/30 text-indigo-750 dark:text-primary font-extrabold rounded-lg border border-indigo-200/50 dark:border-indigo-900/30">Memory Active</span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 chat-scroll">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div key={msg.id} className="flex flex-col space-y-1.5 relative group animate-in fade-in-50 duration-200">
              
              {/* Message Header log (name, icon, time) */}
              <div className={`flex items-center space-x-2 select-none ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                {isAssistant ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-650 dark:text-primary" />
                    <span className="text-xs font-bold text-zinc-700 dark:text-foreground uppercase tracking-wider">Co-Pilot</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-250 uppercase tracking-wider">You</span>
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </>
                )}
                <span suppressHydrationWarning className="text-xs text-muted-foreground dark:text-muted-foreground font-bold">
                  {mounted ? (
                    msg.timestamp 
                      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  ) : (
                    "12:00 PM"
                  )}
                </span>
              </div>

              {/* Bubble Body */}
              <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed transition-all duration-300 ${
                isAssistant 
                  ? 'glass-chat-bubble rounded-tl-none border-l-2 border-l-primary text-foreground' 
                  : 'bg-primary/8 dark:bg-primary/10 border border-primary/15 dark:border-primary/20 text-foreground font-semibold rounded-tr-none self-end max-w-[90%] shadow-xs'
              }`}>
                <MarkdownRenderer text={msg.text} />
                
                {msg.isStreaming && (
                  <div className="mt-2.5 h-1 w-24 rounded-full shimmer-skeleton" />
                )}
              </div>

              {/* Hover Action Menu */}
              <div className={`absolute ${isAssistant ? 'right-2' : 'left-2'} -top-2.5 opacity-0 group-hover:opacity-100 flex items-center space-x-1 bg-card/90 dark:bg-zinc-800/90 backdrop-blur-md border border-border dark:border-zinc-700 rounded-xl p-1 shadow-lg z-10 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto scale-95 group-hover:scale-100`}>
                <button
                  type="button"
                  title="Copy text"
                  onClick={() => {
                    navigator.clipboard.writeText(msg.text);
                    alert("Copied!");
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {!isAssistant && (
                  <button
                    type="button"
                    title="Edit prompt"
                    onClick={() => handleEditMessage(msg)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  title="Retry"
                  onClick={() => handleRegenerate(msg)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}

        {messages.length <= 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 select-none animate-in fade-in duration-200">
            {[
              {
                title: "📝 Create Signup Form",
                prompt: "Create a design summit signup form with custom name, email, and occupation picker fields."
              },
              {
                title: "⭐ Add Satisfaction Scale",
                prompt: "Add a satisfaction rating field with scale from 1 to 5 stars."
              },
              {
                title: "♿ Check Accessibility",
                prompt: "Audit form structure accessibility and check for correct labels."
              },
              {
                title: "🌐 Translate Form",
                prompt: "Translate all questions list to Spanish."
              }
            ].map((action, actionIdx) => (
              <button
                key={actionIdx}
                type="button"
                onClick={() => handleSubmit(undefined, action.prompt)}
                className="p-3 text-left rounded-2xl bg-muted/50 dark:bg-zinc-950/40 border border-border dark:border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-foreground font-bold transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <div className="font-extrabold text-foreground mb-0.5">{action.title}</div>
                <div className="text-xs text-muted-foreground font-semibold line-clamp-2 leading-relaxed">{action.prompt}</div>
              </button>
            ))}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Pill Bar */}
      <div className="px-3.5 py-2 border-t border-border dark:border-border bg-accent/50 dark:bg-zinc-950/30 overflow-x-auto flex space-x-2 scrollbar-none select-none">
        {[
          { key: "improve", label: "✨ Improve Form" },
          { key: "rewrite", label: "📝 Rewrite Labels" },
          { key: "translate", label: "🌍 Translate French" },
          { key: "accessibility", label: "♿ ARIA Audit" },
          { key: "recommend", label: "💡 Smart Recs" }
        ].map((act) => (
          <button
            key={act.key}
            onClick={() => handleQuickAction(act.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-extrabold text-foreground hover:border-primary hover:text-primary transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
          >
            {act.label}
          </button>
        ))}
      </div>
  
      {/* Suggestion Chips */}
      {suggestions.length > 0 && !isGenerating && (
        <div className="px-3.5 py-2.5 border-t border-border dark:border-border bg-muted/50 dark:bg-zinc-900/10">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground block mb-1.5">Suggested Prompts</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSubmit(undefined, chip)}
                className="px-3.5 py-1.5 bg-card/80 hover:bg-primary/5 dark:bg-zinc-800/80 dark:hover:bg-primary/10 text-xs font-bold rounded-full text-foreground dark:text-foreground border border-border dark:border-zinc-700 text-left transition-all duration-200 shadow-xs hover:border-primary/50 hover:-translate-y-1 hover:shadow-md cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}
  
      {/* Input Form Panel */}
      <div className="p-3 border-t border-border dark:border-border bg-card dark:bg-zinc-900 space-y-2">
        {/* File Preview */}
        {attachedFile && (
          <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-primary/10/20 border border-indigo-200 dark:border-indigo-900/30 px-3.5 py-2.5 rounded-lg text-xs animate-in slide-in-from-top-1">
            <div className="flex items-center space-x-2 truncate max-w-[240px] font-bold text-foreground dark:text-foreground">
              <FileText className="w-4 h-4 text-primary dark:text-primary" />
              <span className="truncate">{attachedFile.name}</span>
            </div>
            <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Voice active animation display */}
        {isListening && (
          <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/30 px-3.5 py-2.5 rounded-lg text-xs">
            <div className="flex items-center space-x-3.5">
              <Mic className="w-4 h-4 text-violet-650 dark:text-violet-400 animate-pulse" />
              <div className="flex items-center space-x-1 select-none">
                <span className="w-1 h-3.5 bg-violet-650 dark:bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-5 bg-violet-750 dark:bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2 bg-violet-500 dark:bg-violet-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-4 bg-violet-650 dark:bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
              </div>
              <span className="font-extrabold text-violet-750 dark:text-violet-400 animate-pulse tracking-wide text-xs uppercase">Active Voice Processing...</span>
            </div>
            <button onClick={toggleVoiceInput} className="text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
  
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          {/* File Upload Trigger */}
          <button
            type="button"
            disabled={isGenerating || isListening}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-lg border border-zinc-300 dark:border-border hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground dark:hover:text-zinc-200 transition-all cursor-pointer hover:border-zinc-400"
            title="Attach structure documents (PDF, CSV, Image)"
          >
            <Paperclip className="w-4.5 h-4.5" />
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.txt,.csv,.json,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.heic"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAttachedFile(file);
              }}
            />
          </button>
  
          {/* Multiline Textarea Input */}
          <textarea
            id="builder-chat-input"
            rows={1}
            placeholder={isGenerating ? "Co-Pilot is structuring layout..." : "Instruct Co-Pilot e.g. add name picker..."}
            value={input}
            disabled={isGenerating || isListening}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            className="flex-1 text-[13px] px-4 py-2.5 border rounded-xl bg-muted/30 dark:bg-zinc-950/60 border-border dark:border-border/80 text-foreground dark:text-zinc-100 input-glow-focus transition-all duration-200 font-semibold placeholder-muted-foreground resize-none max-h-24"
          />

          {/* Voice Mic Toggle */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={toggleVoiceInput}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              isListening 
                ? 'bg-rose-50 border-rose-250 dark:bg-rose-950/30 dark:border-rose-900 text-rose-600 animate-pulse' 
                : 'border-zinc-300 dark:border-border hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground hover:border-zinc-400'
            }`}
            title="Toggle Voice Input"
          >
            {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>
  
          {/* Action Trigger button */}
          {isGenerating ? (
            <Button
              type="button"
              onClick={handleStop}
              className="p-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all cursor-pointer border-none h-11 w-11"
            >
              <StopCircle className="w-4.5 h-4.5 animate-pulse" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={(!input.trim() && !attachedFile) || isListening}
              className="p-3 rounded-lg bg-primary hover:opacity-90 text-primary-foreground flex items-center justify-center transition-all cursor-pointer border-none h-11 w-11 shadow-sm"
            >
              <Send className="w-4.5 h-4.5" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

export default AssistantChat;

