import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/lib/store';
import { Button } from './button';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const { settings, setSettings } = useSettingsStore();

  const handleLanguageChange = () => {
    const newLanguage = settings.language === 'en' ? 'zh' : 'en';
    setSettings({ language: newLanguage });
    i18n.changeLanguage(newLanguage);
  };

  const getLanguageLabel = () => {
    return settings.language === 'en' ? 'EN' : '中';
  };

  const getLanguageFullLabel = () => {
    return settings.language === 'en' ? 'English' : '中文';
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLanguageChange}
      className="gap-2 text-xs"
      title={`Current language: ${getLanguageFullLabel()}`}
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{getLanguageLabel()}</span>
    </Button>
  );
}
