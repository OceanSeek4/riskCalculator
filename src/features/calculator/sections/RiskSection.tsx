import React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import type { CalculatorFormData } from '@/lib/validation';

interface RiskSectionProps {
  formData: Partial<CalculatorFormData>;
  onInputChange: (field: string, value: any) => void;
  formErrors?: Record<string, string>;
}

export function RiskSection({
  formData,
  onInputChange,
  formErrors = {}
}: RiskSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('riskSettings')}
      </h3>
      
      <div>
        <Label>{t('riskMode')}</Label>
        <Select
          value={formData.riskMode || 'FIXED_USDT'}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onInputChange('riskMode', e.target.value)}
        >
          <option value="FIXED_USDT">{t('fixedUsdt')}</option>
          <option value="ACCOUNT_PERCENT">{t('accountPercent')}</option>
        </Select>
      </div>
      
      {formData.riskMode === 'FIXED_USDT' ? (
        <div>
          <Label>{t('riskAmount')}</Label>
          <Input
            type="text"
            value={formData.riskAmount || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('riskAmount', e.target.value)}
            placeholder="1000"
          />
          {formErrors.riskAmount && (
            <p className="text-red-500 text-xs mt-1">{formErrors.riskAmount}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>{t('accountEquity')}</Label>
            <Input
              type="text"
              value={formData.accountEquity || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('accountEquity', e.target.value)}
              placeholder="100000"
            />
            {formErrors.accountEquity && (
              <p className="text-red-500 text-xs mt-1">{formErrors.accountEquity}</p>
            )}
          </div>
          <div>
            <Label>{t('riskPercent')}</Label>
            <Input
              type="text"
              value={formData.riskPercent || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('riskPercent', e.target.value)}
              placeholder="2"
            />
            {formErrors.riskPercent && (
              <p className="text-red-500 text-xs mt-1">{formErrors.riskPercent}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}