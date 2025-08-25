import React, { useEffect, useState } from 'react';
import { useSettingsStore } from './store';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark' | 'system';
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'system',
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings } = useSettingsStore();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const updateTheme = () => {
      let newTheme: 'light' | 'dark' | 'system';

      if (settings.theme === 'system') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        newTheme = prefersDark ? 'dark' : 'light';
      } else {
        newTheme = settings.theme;
      }

      setResolvedTheme(newTheme);

      // Apply theme to document
      document.documentElement.classList.remove('light', 'dark', 'system');
      document.documentElement.classList.add(newTheme);
      
      // Also set data attribute for better CSS support
      document.documentElement.setAttribute('data-theme', newTheme);
    };

    updateTheme();

    // Listen for system theme changes when in system mode
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateTheme();
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [settings.theme]);

  const value: ThemeContextType = {
    theme: settings.theme,
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}