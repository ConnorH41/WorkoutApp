import React, { createContext, useContext, useState, useMemo } from 'react';
import { colors, darkColors } from '../styles/theme';

export type ThemeType = typeof colors;

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  theme: ThemeType;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const theme = useMemo(() => (darkMode ? darkColors : colors), [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
