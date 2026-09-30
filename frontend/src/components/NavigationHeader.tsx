"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Search } from "lucide-react";
import { Button } from "./ui/Button";
import { GlobalSearchModal } from "./GlobalSearchModal";
export { SiteHeader } from "./SiteHeader";

interface NavigationHeaderProps {
  title?: React.ReactNode;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
  showTagline?: boolean;
}

/** Reusable branded logo with gradient "AI" text — Figma style */
export const BrandedLogo = ({ size = "md", showTagline = false }: { size?: "sm" | "md" | "lg"; showTagline?: boolean }) => {
  const sizeMap = { sm: "h-8", md: "h-10", lg: "h-12" };
  const textMap = { sm: "text-base", md: "text-lg", lg: "text-2xl" };
  const aiMap = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

  return (
    <Link href="/" className="flex items-center gap-1.5 group">
      <img
        src="/logo.svg?v=6"
        alt="PromptForm AI Logo"
        className={`${sizeMap[size]} w-auto object-contain flex-shrink-0 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(139,107,85,0.3)]`}
      />
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className={`font-extrabold ${textMap[size]} tracking-tight text-foreground leading-tight`}>
            PromptForm
          </span>
          <span
            className={`font-extrabold ${aiMap[size]} tracking-tight leading-tight text-primary`}
          >
            AI
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground leading-tight mt-0.5">
            PROMPT. CREATE.{" "}
            <span className="text-primary font-bold">PERFECT.</span>
          </span>
        )}
      </div>
    </Link>
  );
};

export const NavigationHeader = ({ title, subtitle, leftAction, rightActions, showTagline = false }: NavigationHeaderProps) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [searchModalOpen, setSearchModalOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-border/80 bg-card/70 backdrop-blur-xl px-6 flex items-center justify-between flex-shrink-0 transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4">
        {leftAction}
        <div className="flex items-center gap-3">
          {!leftAction && <BrandedLogo size="md" showTagline={showTagline} />}
          {leftAction && title && (
            <div className="flex items-center">
              {typeof title === "string" ? (
                <span className="font-bold text-lg tracking-tight text-foreground">
                  {title}
                </span>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground ml-2">{subtitle}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {rightActions}

        {/* Button 1: Quick Search */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center gap-2.5 px-4 h-10 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-2xs hover:border-primary/50 active:scale-[0.98] shrink-0"
          aria-label="Open search command palette"
        >
          <Search className="w-4 h-4 text-primary shrink-0" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="text-[11px] font-bold bg-muted/80 px-2 py-0.5 rounded-full border border-border/80 select-none leading-none text-muted-foreground">⌘K</kbd>
        </button>

        {/* Button 2: Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 shrink-0 rounded-full border border-border bg-card hover:bg-secondary text-foreground transition-all duration-200 flex items-center justify-center cursor-pointer shadow-2xs hover:border-primary/50 active:scale-95"
          aria-label="Toggle theme mode"
        >
          {mounted && theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-foreground" />
          )}
        </button>
      </div>

      <GlobalSearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
      />
    </header>
  );
};
