import { useEffect } from 'react';
import { CalculatorForm } from '@/features/calculator/CalculatorForm';
import { ResultCard } from '@/features/calculator/ResultCard';
import { SettingsForm } from '@/features/settings/SettingsForm';
import { PresetManager } from '@/features/presets/PresetManager';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calculator, Bookmark, Settings, TrendingUp, Shield, Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';

function App() {
  const { t } = useTranslation();
  const { syncWithSettings } = useCalculatorStore();
  const { settings } = useSettingsStore();

  // Ensure calculator is always synced with current settings on app startup
  useEffect(() => {
    syncWithSettings(settings);
  }, [settings, syncWithSettings]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Theme and Language toggles */}
          <div className="absolute top-4 right-4 flex gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          
          <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t('appTitle')}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('appSubtitle')}
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-sm">
                <Shield className="w-4 h-4 text-green-600" />
                <span>{t('riskManagement')}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-sm">
                <Globe2 className="w-4 h-4 text-blue-600" />
                <span>4 {t('exchanges')}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-sm">
                <Calculator className="w-4 h-4 text-purple-600" />
                <span>{t('realTimeCalc')}</span>
              </div>
            </div>
          </header>
          
          <Tabs defaultValue="calculator" className="w-full">
            {/* Modern Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="p-1 bg-muted/50 backdrop-blur rounded-xl border">
                <TabsList className="bg-transparent">
                  <TabsTrigger 
                    value="calculator" 
                    className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Calculator className="w-4 h-4" />
                    {t('calculator')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="presets" 
                    className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Bookmark className="w-4 h-4" />
                    {t('presets')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Settings className="w-4 h-4" />
                    {t('settings')}
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="calculator" className="space-y-6">
              <div className="flex flex-col xl:flex-row xl:gap-8 items-start justify-center max-w-6xl mx-auto px-4">
                <div className="w-full flex justify-center mb-6 xl:mb-0">
                  <CalculatorForm />
                </div>
                <div className="w-full flex justify-center">
                  <ResultCard />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="presets" className="flex justify-center">
              <PresetManager />
            </TabsContent>

            <TabsContent value="settings" className="flex justify-center">
              <SettingsForm />
            </TabsContent>
          </Tabs>
          
          {/* Modern Footer */}
          <footer className="mt-16 text-center">
            <div className="max-w-2xl mx-auto p-6 bg-muted/30 backdrop-blur rounded-xl border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-600">
                  {t('educationalOnly')}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {t('verifyCalculations')}
              </p>
              <div className="border-t border-muted-foreground/20 pt-3">
                <p className="text-xs text-muted-foreground/80">
                  © Crypto Ocean Pty Ltd, 2025
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
