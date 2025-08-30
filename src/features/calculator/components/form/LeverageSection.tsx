import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import type { CalculatorFormData } from '@/lib/validation';

interface LeverageSectionProps {
  formData: Partial<CalculatorFormData>;
  onInputChange: (field: string, value: any) => void;
}

export function LeverageSection({
  formData,
  onInputChange
}: LeverageSectionProps) {
  const { t } = useTranslation();

  if (formData.contractMode === 'SPOT') {
    return null;
  }

  return (
    <div>
      <Label>{t('leverage')}</Label>
      <Input
        type="number"
        min="1"
        max="200"
        value={formData.leverage || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('leverage', parseInt(e.target.value))}
        placeholder={t('autoSuggestLeverage')}
      />
    </div>
  );
}