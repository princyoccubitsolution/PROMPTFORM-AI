"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

/** Local toast queue: `notify` shows a message that dismisses itself after a few seconds. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-3), { id, tone, message }]);
    timers.current.set(id, setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000));
  }, [dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return { toasts, notify, dismiss };
}

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  error: 'border-destructive/30 text-destructive',
  info: 'border-primary/30 text-foreground'
};

const toneIcons: Record<ToastTone, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

export function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[1000] flex flex-col gap-2 sm:w-96 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = toneIcons[t.tone];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-card shadow-xl px-4 py-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 ${toneStyles[t.tone]}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-px" />
            <span className="flex-1 leading-relaxed text-foreground">{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
