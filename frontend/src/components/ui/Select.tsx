import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, label, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full h-10 px-3.5 pr-10 text-sm border rounded-xl bg-card dark:bg-card/70 text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary cursor-pointer shadow-2xs ${
            error ? "border-destructive focus:ring-destructive/20 focus:border-destructive" : "border-border hover:border-primary/40"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1.5 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
