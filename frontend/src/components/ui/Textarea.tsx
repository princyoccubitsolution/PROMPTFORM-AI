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
          className={`w-full min-h-[90px] px-3.5 py-2.5 text-sm border rounded-xl bg-card dark:bg-card/90 text-foreground dark:text-foreground placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary shadow-2xs resize-y ${
            error ? "border-destructive focus:ring-destructive/20 focus:border-destructive" : "border-border hover:border-primary/40"
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
