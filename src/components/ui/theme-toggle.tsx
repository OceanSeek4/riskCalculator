import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useSettingsStore } from '@/lib/store';
import { Button } from './button';

export function ThemeToggle() {
  const { theme, resolvedTheme } = useTheme();
  const { settings, setSettings } = useSettingsStore();

  const handleThemeChange = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    
    setSettings({ theme: nextTheme });
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'system':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return '浅色';
      case 'dark':
        return '深色';
      case 'system':
        return '跟随系统';
      default:
        return '浅色';
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleThemeChange}
      className="gap-2 text-xs"
      title={`当前主题: ${getThemeLabel()} (${resolvedTheme === 'light' ? '浅色' : resolvedTheme === 'dark' ? '深色' : '系统'})`}
    >
      {getThemeIcon()}
      <span className="hidden sm:inline">{getThemeLabel()}</span>
    </Button>
  );
}
