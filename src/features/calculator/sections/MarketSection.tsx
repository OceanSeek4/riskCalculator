import React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ComboInput } from '@/components/ui/combo-input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CalculatorFormData } from '@/lib/validation';

interface MarketSectionProps {
  formData: Partial<CalculatorFormData>;
  settings: any;
  onInputChange: (field: string, value: any) => void;
  onFetchPrice: () => void;
  onAutoFetchATR: () => void;
}

export function MarketSection({
  formData,
  settings,
  onInputChange,
  onFetchPrice,
  onAutoFetchATR
}: MarketSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('marketSettings')}
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>{t('exchange')}</Label>
          <Select
            value={formData.exchange || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onInputChange('exchange', e.target.value)}
          >
            <option value="BINANCE">{t('binance')}</option>
            <option value="BYBIT">{t('bybit')}</option>
            <option value="BITGET">{t('bitget')}</option>
            <option value="OKX">{t('okx')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('symbol')}</Label>
          <ComboInput
            value={formData.symbol || ''}
            onChange={(value) => onInputChange('symbol', value)}
            options={settings.symbolList || []}
            placeholder="BTCUSDT"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>{t('contractMode')}</Label>
          <Select
            value={formData.contractMode || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onInputChange('contractMode', e.target.value)}
          >
            <option value="SPOT">{t('spot')}</option>
            <option value="USDT_PERP">{t('usdtPerp')}</option>
          </Select>
        </div>
        <div>
          <Label>{t('side')}</Label>
          <Select
            value={formData.side || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onInputChange('side', e.target.value)}
          >
            <option value="LONG">{t('long')}</option>
            <option value="SHORT">{t('short')}</option>
          </Select>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFetchPrice}
          className="flex-1"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('updatePrice')}
        </Button>
        {settings.autoFetchATR && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutoFetchATR}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('updateATR')}
          </Button>
        )}
      </div>
    </div>
  );
}