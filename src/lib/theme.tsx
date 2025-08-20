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
        // Use system theme as a unique blue-white theme
        newTheme = 'system';
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

    // No need to listen for system theme changes since 'system' is now a fixed theme
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