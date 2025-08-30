import React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { WifiOff, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CalculatorFormData } from '@/lib/validation';

interface TakeProfitSectionProps {
  formData: Partial<CalculatorFormData>;
  onInputChange: (field: string, value: any) => void;
  formErrors?: Record<string, string>;
  isOfflineMode?: boolean;
  realTimePrice?: string | null;
  priceChange?: 'up' | 'down' | 'same' | null;
  marketMeta?: any;
  lockedPipsTakeProfitPrice?: string | null;
  lockedEntryPriceForPips?: string | null;
  getEffectiveEntryPrice?: () => string;
}

export function TakeProfitSection({
  formData,
  onInputChange,
  formErrors = {},
  isOfflineMode,
  realTimePrice,
  priceChange,
  marketMeta,
  lockedPipsTakeProfitPrice,
  lockedEntryPriceForPips,
  getEffectiveEntryPrice
}: TakeProfitSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="useTakeProfit"
          checked={formData.useTakeProfit || false}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('useTakeProfit', e.target.checked)}
          className="w-4 h-4"
        />
        <Label htmlFor="useTakeProfit" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('takeProfitSettings')}
        </Label>
      </div>
      
      {formData.useTakeProfit && (
        <div className="space-y-4 pl-6 border-l-2 border-green-200 dark:border-green-800">
          <div>
            <Label>{t('takeProfitMode')}</Label>
            <Select
              value={formData.takeProfitMode || 'PRICE'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                if (e.target.value === 'ATR' && isOfflineMode) {
                  return; // Prevent switching to ATR mode in offline mode
                }
                onInputChange('takeProfitMode', e.target.value);
              }}
            >
              <option value="PRICE">{t('priceTakeProfit')}</option>
              <option value="ATR" disabled={isOfflineMode}>
                {t('atrTakeProfit')} {isOfflineMode && '(离线模式不可用)'}
              </option>
              <option value="RR_RATIO">{t('rrRatioTakeProfit')}</option>
              <option value="PIPS">{t('pipsTakeProfit')}</option>
            </Select>
            {isOfflineMode && formData.takeProfitMode === 'ATR' && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-sm">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-orange-700 dark:text-orange-300">
                    ATR 止盈在离线模式下不可用，请切换到其他止盈模式
                  </span>
                </div>
              </div>
            )}
          </div>

          {formData.takeProfitMode === 'PRICE' && (
            <div>
              <Label>{t('takeProfitPrice')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.takeProfitPrice || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('takeProfitPrice', e.target.value)}
                placeholder={t('takeProfitPrice')}
                className={formErrors.takeProfitPrice ? 'border-red-500' : ''}
              />
              {formErrors.takeProfitPrice && (
                <p className="text-sm text-red-500 mt-1">{formErrors.takeProfitPrice}</p>
              )}
            </div>
          )}

          {formData.takeProfitMode === 'ATR' && (
            <div>
              <Label>{t('takeProfitATRMultiplier')}</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.takeProfitATRMultiplier || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('takeProfitATRMultiplier', e.target.value)}
                placeholder="2.0"
                className={formErrors.takeProfitATRMultiplier ? 'border-red-500' : ''}
              />
              {formErrors.takeProfitATRMultiplier && (
                <p className="text-sm text-red-500 mt-1">{formErrors.takeProfitATRMultiplier}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t('usesCurrentATRValue')}
              </p>
            </div>
          )}

          {formData.takeProfitMode === 'RR_RATIO' && (
            <div>
              <Label>{t('takeProfitRRRatio')}</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.takeProfitRRRatio || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('takeProfitRRRatio', e.target.value)}
                placeholder="2.0"
                className={formErrors.takeProfitRRRatio ? 'border-red-500' : ''}
              />
              {formErrors.takeProfitRRRatio && (
                <p className="text-sm text-red-500 mt-1">{formErrors.takeProfitRRRatio}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t('rrRatioTakeProfitDescription')}
              </p>
            </div>
          )}

          {formData.takeProfitMode === 'PIPS' && (
            <div>
              <Label>{t('takeProfitPips')}</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.takeProfitPips || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInputChange('takeProfitPips', e.target.value)}
                placeholder="100"
                className={formErrors.takeProfitPips ? 'border-red-500' : ''}
              />
              {formErrors.takeProfitPips && (
                <p className="text-sm text-red-500 mt-1">{formErrors.takeProfitPips}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t('takeProfitPipsHelp')}
              </p>
              {formData.takeProfitPips && getEffectiveEntryPrice && getEffectiveEntryPrice() && marketMeta && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('calculatedTakeProfitPrice')}:</span>
                    <span className="font-mono font-medium text-green-600">
                      {(() => {
                        try {
                          const effectiveEntryPrice = getEffectiveEntryPrice();
                          const entryPrice = parseFloat(effectiveEntryPrice);
                          const takeProfitPips = parseFloat(formData.takeProfitPips);
                          const tickSize = parseFloat(marketMeta.tickSize);
                          
                          if (!isNaN(entryPrice) && !isNaN(takeProfitPips) && !isNaN(tickSize)) {
                            const pipsDistance = takeProfitPips * tickSize;
                            const takeProfitPrice = formData.side === 'LONG' 
                              ? entryPrice + pipsDistance 
                              : entryPrice - pipsDistance;
                            return takeProfitPrice.toFixed(Math.abs(Math.log10(tickSize)));
                          }
                          return '--';
                        } catch {
                          return '--';
                        }
                      })()}
                    </span>
                  </div>
                  {formData.orderType === 'MARKET' && realTimePrice && (
                    <div className="text-xs text-muted-foreground mt-1">
                      📈 {t('basedOnRealTimePrice')}: {realTimePrice}
                      {priceChange && (
                        <span className={`ml-1 ${
                          priceChange === 'up' ? 'text-green-600' : 
                          priceChange === 'down' ? 'text-red-600' : ''
                        }`}>
                          {priceChange === 'up' ? '↑' : priceChange === 'down' ? '↓' : ''}
                        </span>
                      )}
                    </div>
                  )}
                  {lockedPipsTakeProfitPrice && lockedEntryPriceForPips && (
                    <div className="text-xs mt-1 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 dark:text-blue-300">🔒 {t('lockedAtCalculation')}:</span>
                        <span className="font-mono font-semibold text-blue-800 dark:text-blue-200">{lockedPipsTakeProfitPrice}</span>
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Entry: {lockedEntryPriceForPips}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}