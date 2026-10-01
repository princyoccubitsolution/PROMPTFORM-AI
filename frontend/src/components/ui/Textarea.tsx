import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full min-h-[90px] px-3.5 py-2.5 text-sm border rounded-xl bg-card dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 border-border dark:border-zinc-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary shadow-2xs resize-y ${
            error ? "border-destructive focus:ring-destructive/20 focus:border-destructive" : "hover:border-primary/40"
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
