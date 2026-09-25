import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-semibold transition-all duration-200 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer select-none";
    
    const variants: Record<string, string> = {
      primary: "bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 active:opacity-100",
      secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-muted active:bg-muted/80 font-semibold",
      outline: "border border-border bg-card/60 dark:bg-card/80 text-foreground hover:bg-muted hover:border-primary/40 font-semibold",
      ghost: "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
      danger: "bg-destructive text-destructive-foreground font-bold shadow-sm hover:opacity-90",
    };

    const sizes: Record<string, string> = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-base rounded-xl gap-2.5",
      icon: "h-10 w-10 rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
