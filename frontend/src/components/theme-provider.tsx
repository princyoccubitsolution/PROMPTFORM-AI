"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

const hexToGlow = (hex: string): string => {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.06)`;
  } catch {
    return 'rgba(124, 106, 250, 0.06)';
  }
};

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    const applyGlobalTheme = () => {
      const color = localStorage.getItem('promptform_theme_color');
      const font = localStorage.getItem('promptform_theme_font');
      const style = localStorage.getItem('promptform_theme_style');

      if (color) {
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--ring', color);
        document.documentElement.style.setProperty('--primary-glow', hexToGlow(color));
      }
      if (font) {
        let fontFamily = font;
        if (font === 'Manrope') fontFamily = "'Manrope', sans-serif";
        else if (font === 'Inter') fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
        else if (font === 'Plus Jakarta Sans') fontFamily = "'Plus Jakarta Sans', sans-serif";
        else if (font === 'Poppins') fontFamily = "'Poppins', sans-serif";
        else if (font === 'Outfit') fontFamily = "'Outfit', sans-serif";
        else if (font === 'Roboto') fontFamily = "'Roboto', sans-serif";
        else if (font === 'Space Grotesk') fontFamily = "'Space Grotesk', sans-serif";
        else if (font === 'Playfair Display') fontFamily = "'Playfair Display', Georgia, serif";
        else if (font === 'Georgia') fontFamily = "Georgia, serif";
        else if (font === 'Courier New') fontFamily = "'Courier New', Courier, monospace";
        document.documentElement.style.setProperty('--font-sans', fontFamily);
      }
      if (style) {
        if (style === 'sharp') {
          document.documentElement.style.setProperty('--radius-sm', '0px');
          document.documentElement.style.setProperty('--radius-md', '0px');
          document.documentElement.style.setProperty('--radius-lg', '0px');
          document.documentElement.style.setProperty('--radius-xl', '0px');
          document.documentElement.style.setProperty('--radius-2xl', '0px');
        } else {
          document.documentElement.style.setProperty('--radius-sm', '0.375rem');
          document.documentElement.style.setProperty('--radius-md', '0.5rem');
          document.documentElement.style.setProperty('--radius-lg', '0.75rem');
          document.documentElement.style.setProperty('--radius-xl', '1rem');
          document.documentElement.style.setProperty('--radius-2xl', '1.25rem');
        }
      }
    };

    // Apply initially on mount
    applyGlobalTheme();

    // Observe changes to documentElement class (theme changes)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          applyGlobalTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Handle custom event for live updates from designer
    window.addEventListener('promptform_theme_update', applyGlobalTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('promptform_theme_update', applyGlobalTheme);
    };
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
