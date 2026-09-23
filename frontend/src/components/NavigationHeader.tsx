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

      <div className="flex items-center gap-3">
        {rightActions}

        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-border/80 dark:border-border bg-card dark:bg-card hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground text-xs font-medium transition-all cursor-pointer shadow-xs hover:border-primary/50"
          aria-label="Open search command palette"
        >
          <Search className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="text-[10px] font-bold bg-muted/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-border/50 select-none">⌘K</kbd>
        </button>

        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-2xl border border-border/80 dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground transition-all flex items-center justify-center cursor-pointer shadow-2xs"
          aria-label="Toggle theme mode"
        >
          {mounted && theme === "dark" ? (
            <Sun className="w-4.5 h-4.5 text-amber-500" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-foreground/80" />
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
