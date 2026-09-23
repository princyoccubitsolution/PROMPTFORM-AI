"use client";

import { useEffect } from "react";

/**
 * Layout for /f/[id] public form runner pages.
 * Forces light theme so respondents always see a clean, bright form
 * regardless of their OS dark mode setting.
 */
export default function PublicFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Force light mode on public form pages
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";

    return () => {
      // Clean up when navigating away — let system theme resume
      document.documentElement.style.colorScheme = "";
    };
  }, []);

  return <>{children}</>;
}
