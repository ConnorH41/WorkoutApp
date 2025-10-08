import React, { createContext, useContext, useState, useMemo } from 'react';
import { colors, spacing, borderRadius, fonts, shadows } from '../styles/theme';

export type ThemeType = typeof colors;

interface ThemeContextValue {
  theme: ThemeType;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  fonts: typeof fonts;
  shadows: typeof shadows;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);


export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useMemo(() => colors, []);
  return (
    <ThemeContext.Provider value={{ theme, spacing, borderRadius, fonts, shadows }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
