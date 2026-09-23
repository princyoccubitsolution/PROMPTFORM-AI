import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, label, min, step, type, onKeyDown, onChange, ...props }, ref) => {
    const isFile = type === "file";
    const isNumeric = !isFile && (type === "number" || (props.placeholder && props.placeholder.toLowerCase().includes("weight")) || (label && label.toLowerCase().includes("weight")));
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isNumeric && (e.key === "-" || e.key === "e")) {
        e.preventDefault();
      }
      if (onKeyDown) onKeyDown(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumeric && !isFile) {
        let val = e.target.value;
        if (val.includes("-")) {
          val = val.replace(/-/g, "");
          try { e.target.value = val; } catch (err) {}
        }
        if (val && parseFloat(val) < 0) {
          try { e.target.value = "0"; } catch (err) {}
        }
      }
      if (onChange) onChange(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          min={isNumeric ? (min ?? 0) : min}
          step={isNumeric ? (step ?? "0.001") : step}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          className={`w-full h-10 px-3.5 text-sm border rounded-xl bg-card dark:bg-card/70 text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 ${
            error ? "border-destructive focus:ring-destructive/20 focus:border-destructive" : "border-border hover:border-primary/40"
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
