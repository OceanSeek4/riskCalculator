import React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CalculatorFormData } from '@/lib/validation';

interface StopSectionProps {
  formData: Partial<CalculatorFormData>;
  onInputChange: (field: string, value: any) => void;
  formErrors?: Record<string, string>;
  // ATR related props
  currentATR?: string | null;
  isFetchingATR?: boolean;
  onFetchATR?: () => void;
  supportedIntervals?: string[];
}

export function StopSection({
  formData,
  onInputChange,
  formErrors = {},
  currentATR,
  isFetchingATR,
  onFetchATR,
  supportedIntervals = []
}: StopSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('stopLossSettings')}
      </h3>
      
      <div>
        <Label>{t('stopMode')}</Label>
        <Select
          value={formData.stopMode || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onInputChange('stopMode', e.target.value)}
        >
          <option value="PRICE">{t('priceMode')}</option>
          <option value="ATR">{t('atrMode')}</option>
        </Select>
      </div>

      {formData.stopMode === 'PRICE' && (
        <div className="space-y-2">
          <Label>{t('stopPrice')}</Label>
          <Input
            type="text"
            value={formData.stopPrice || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('stopPrice', e.target.value)}
            placeholder="48000"
          />
          {formErrors.stopPrice && (
            <p className="text-red-500 text-xs mt-1">{formErrors.stopPrice}</p>
          )}
        </div>
      )}

      {formData.stopMode === 'ATR' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t('atrPeriod')}</Label>
              <Input
                type="number"
                value={formData.atrPeriod || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('atrPeriod', Number(e.target.value))}
                placeholder="14"
                min="1"
                max="50"
              />
            </div>
            <div>
              <Label>{t('atrTimeframe')}</Label>
              <Select
                value={formData.atrTimeframe || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onInputChange('atrTimeframe', e.target.value)}
              >
                {supportedIntervals.map(interval => (
                  <option key={interval} value={interval}>{interval}</option>
                ))}
              </Select>
            </div>
          </div>
          
          <div>
            <Label>{t('atrMultiplier')}</Label>
            <Input
              type="text"
              value={formData.atrMultiplier || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('atrMultiplier', e.target.value)}
              placeholder="2"
            />
            {formErrors.atrMultiplier && (
              <p className="text-red-500 text-xs mt-1">{formErrors.atrMultiplier}</p>
            )}
          </div>
          
          {/* ATR display and fetch */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            <div className="flex-1">
              <Label className="text-xs">{t('currentATR')}</Label>
              <div className="font-mono text-sm">
                {currentATR ? currentATR : '--'}
              </div>
            </div>
            {onFetchATR && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFetchATR}
                disabled={isFetchingATR}
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingATR ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}