"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Search, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "./ui/Button";
import { BrandedLogo } from "./NavigationHeader";
import { GlobalSearchModal } from "./GlobalSearchModal";

export interface SiteHeaderProps {
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  showNav?: boolean;
}

export const SiteHeader = ({
  leftAction,
  rightActions,
  title,
  subtitle,
  showNav = true,
}: SiteHeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("promptform_access_token") : null;
    setIsLoggedIn(!!token);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navLinks = [
    { label: "Features", href: "/#features" },
    { label: "Templates", href: "/templates" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-card/85 dark:bg-card/85 border-b border-border backdrop-blur-md transition-colors duration-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Brand / Back / Custom Action */}
          <div className="flex items-center gap-3">
            {leftAction ? (
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {leftAction}
                {title && (
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-base text-foreground leading-tight truncate">
                      {title}
                    </span>
                    {subtitle && (
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        {subtitle}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <BrandedLogo size="md" />
            )}
          </div>

          {/* Center: Desktop Navigation Links */}
          {showNav && (
            <nav className="hidden md:flex items-center space-x-8 text-sm md:text-[15px] font-semibold text-muted-foreground">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`transition-colors duration-150 hover:text-primary ${
                      isActive ? "text-primary font-extrabold" : "text-foreground/80"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right: Controls & Auth */}
          <div className="flex items-center gap-3 shrink-0">
            {rightActions}

            {/* Button 1: Quick Search */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="hidden sm:flex items-center gap-2.5 px-4 h-10 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-2xs hover:border-primary/50 active:scale-[0.98] shrink-0"
              aria-label="Open search command palette"
            >
              <Search className="w-4 h-4 text-primary shrink-0" />
              <span className="hidden lg:inline">Search...</span>
              <kbd className="text-[11px] font-bold bg-muted/80 px-2 py-0.5 rounded-full border border-border/80 select-none leading-none text-muted-foreground">
                ⌘K
              </kbd>
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

            {/* Button 3: Dashboard / Action Button */}
            {mounted && isLoggedIn ? (
              <Link href="/dashboard" className="hidden sm:inline-flex shrink-0">
                <button
                  className="h-10 px-4 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-2xs hover:border-primary/50 flex items-center gap-2 active:scale-[0.98] shrink-0"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-primary" />
                </button>
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <Link href="/login">
                  <button
                    className="h-10 px-4 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-2xs hover:border-primary/50 active:scale-[0.98]"
                  >
                    Sign In
                  </button>
                </Link>
                <Link href="/register">
                  <button
                    className="h-10 px-4 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-2xs hover:border-primary/50 active:scale-[0.98]"
                  >
                    Get Started Free
                  </button>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 rounded-xl border border-border bg-card hover:bg-secondary text-foreground flex items-center justify-center transition-all cursor-pointer"
              aria-label="Open mobile menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {showNav && (
              <div className="space-y-1 pb-2 border-b border-border">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-bold text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-foreground hover:bg-secondary rounded-lg transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span>Search</span>
              </span>
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">
                ⌘K
              </kbd>
            </button>

            <div className="pt-2 space-y-2">
              {mounted && isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full"
                >
                  <Button className="w-full h-10 text-xs font-bold justify-center">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full h-10 text-xs font-bold justify-center"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button
                      variant="primary"
                      className="w-full h-10 text-xs font-bold justify-center"
                    >
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
};
