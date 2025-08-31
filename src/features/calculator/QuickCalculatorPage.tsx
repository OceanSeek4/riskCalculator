import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { QuickCalculatorForm } from './QuickCalculatorForm';
import { QuickHintsPanel } from './QuickHintsPanel';
import { ResultCard } from './ResultCard';
import { useCalculatorStore } from '@/lib/store';

export function QuickCalculatorPage() {
  const { t } = useTranslation();
  const { result } = useCalculatorStore();
  const [currentFeeType, setCurrentFeeType] = useState<'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY'>('MAKER_OPEN_TAKER_CLOSE');

  return (
    <div className="max-w-[1920px] mx-auto px-4">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('quickCalculator')}</h2>
          <p className="text-sm text-muted-foreground">{t('quickCalculatorDescription')}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // Switch to full calculator tab - use proper tab switching
            const calculatorTab = document.querySelector('[value="calculator"]') as HTMLElement;
            if (calculatorTab) {
              calculatorTab.click();
            }
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToFullCalculator')}
        </Button>
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Quick calculator form */}
        <div className="space-y-4">
          <QuickCalculatorForm onFeeTypeChange={setCurrentFeeType} />
        </div>
        
        {/* Right: Hints panel and results */}
        <div className="space-y-4">
          <QuickHintsPanel currentFeeType={currentFeeType} />
          
          {/* Results display if available */}
          {result && (
            <div className="mt-6">
              <ResultCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}