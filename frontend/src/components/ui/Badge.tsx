import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info" | "outline";
}

export const Badge = ({ className = "", variant = "default", children, ...props }: BadgeProps) => {
  const variants: Record<string, string> = {
    default: "bg-muted text-muted-foreground border-border/40",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    outline: "border border-border text-foreground bg-transparent",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full border ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
