import React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, TrendingUp, TrendingDown, RefreshCw, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CalculatorFormData } from '@/lib/validation';

interface EntrySectionProps {
  formData: Partial<CalculatorFormData>;
  onInputChange: (field: string, value: any) => void;
  formErrors?: Record<string, string>;
  // Price display props
  displayPrice?: string;
  realTimePrice?: string | null;
  priceChange?: string | null;
  lastPriceUpdate?: number | null;
  isPriceLocked?: boolean;
  isOfflineMode?: boolean;
  onLockPrice?: () => void;
  onUnlockPrice?: () => void;
  onManualPriceChange?: (newPrice: string) => void;
  onQuickUpdate?: () => void;
  isQuickUpdating?: boolean;
}

export function EntrySection({
  formData,
  onInputChange,
  formErrors = {},
  displayPrice,
  realTimePrice,
  priceChange,
  lastPriceUpdate,
  isPriceLocked,
  isOfflineMode,
  onLockPrice,
  onUnlockPrice,
  onManualPriceChange,
  onQuickUpdate,
  isQuickUpdating
}: EntrySectionProps) {
  const { t } = useTranslation();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const isPositiveChange = priceChange && priceChange === 'up';
  const isNegativeChange = priceChange && priceChange === 'down';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('entrySettings')}
      </h3>
      
      {/* Real-time price display for market orders */}
      {formData.exchange && formData.symbol && formData.orderType === 'MARKET' && (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="space-y-2">
            {/* First row: Symbol info and update time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {formData.exchange}/{formData.symbol}
                </span>
                <span className="text-xs text-blue-600/70 dark:text-blue-300/70 font-normal">
                  {t('realTimePrice')}
                </span>
                {isOfflineMode && <WifiOff className="w-4 h-4 text-orange-500" />}
              </div>
              {lastPriceUpdate && (
                <div className="text-xs text-muted-foreground">
                  {formatTime(lastPriceUpdate)}
                </div>
              )}
            </div>

            {/* Second row: Price and change */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {realTimePrice || displayPrice || formData.entryPrice || '--'}
                </span>
                {priceChange && (
                  <div className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    isPositiveChange 
                      ? 'text-green-600 dark:text-green-400' 
                      : isNegativeChange 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted-foreground'
                  }`}>
                    {isPositiveChange && <TrendingUp className="w-3 h-3" />}
                    {isNegativeChange && <TrendingDown className="w-3 h-3" />}
                    {isPositiveChange ? '↗' : isNegativeChange ? '↘' : ''}
                  </div>
                )}
              </div>

              {/* Price lock controls for market orders */}
              <div className="flex items-center gap-2">
                {onQuickUpdate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onQuickUpdate}
                    disabled={isQuickUpdating}
                    className="h-7 px-2"
                  >
                    <RefreshCw className={`w-3 h-3 ${isQuickUpdating ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                {onLockPrice && onUnlockPrice && realTimePrice && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={isPriceLocked ? onUnlockPrice : onLockPrice}
                    className="h-7 px-2"
                    title={isPriceLocked ? t('unlockPrice') : t('lockPrice')}
                  >
                    {isPriceLocked ? (
                      <Unlock className="w-3 h-3 text-orange-600" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order type selection */}
      <div>
        <Label>{t('orderType')}</Label>
        <Select
          value={formData.orderType || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onInputChange('orderType', e.target.value)}
        >
          <option value="MARKET">{t('market')}</option>
          <option value="LIMIT">{t('limit')}</option>
        </Select>
      </div>

      {/* Entry price */}
      <div>
        <Label>{t('entryPrice')}</Label>
        <Input
          type="text"
          value={formData.entryPrice || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            onInputChange('entryPrice', value);
            if (onManualPriceChange && formData.orderType === 'LIMIT') {
              onManualPriceChange(value);
            }
          }}
          placeholder="50000"
          disabled={formData.orderType === 'MARKET' && !isPriceLocked}
          className={`${formErrors.entryPrice ? 'border-red-500' : ''} ${
            formData.orderType === 'MARKET' && !isPriceLocked
              ? `cursor-not-allowed ${
                  priceChange === 'up' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                  priceChange === 'down' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                  'bg-gray-50 dark:bg-gray-900'
                }`
              : isPriceLocked ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
              : ''
          }`}
        />
        {formErrors.entryPrice && (
          <p className="text-red-500 text-xs mt-1">{formErrors.entryPrice}</p>
        )}
        {formData.orderType === 'MARKET' && (
          <>
            {isPriceLocked ? (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {t('priceLocked')} - {t('clickUnlockToResumeUpdates')}
              </p>
            ) : (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-pulse" />
                {t('realTimePriceUpdating')} - {t('clickLockToFixPrice')}
              </p>
            )}
          </>
        )}
      </div>

      {/* Fee type for limit orders */}
      {formData.orderType === 'LIMIT' && (
        <div>
          <Label>{t('feeType')}</Label>
          <Select
            value={formData.feeType || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onInputChange('feeType', e.target.value)}
          >
            <option value="MAKER">{t('allMaker')}</option>
            <option value="TAKER">{t('allTaker')}</option>
            <option value="MAKER_OPEN_TAKER_CLOSE">{t('makerOpenTakerClose')}</option>
            <option value="MAKER_OPEN_ONLY">{t('makerOpenOnly')}</option>
          </Select>
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="space-y-1">
              <div>
                💡 {formData.feeType === 'MAKER' ? '全部使用Maker费率，低成本且无滑点' : 
                    formData.feeType === 'TAKER' ? '全部使用Taker费率，快速成交但成本较高' :
                    formData.feeType === 'MAKER_OPEN_TAKER_CLOSE' ? '开仓Maker + 止盈Maker + 止损Taker，平衡成本与执行' :
                    formData.feeType === 'MAKER_OPEN_ONLY' ? '仅开仓Maker，平仓使用Taker费率' : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Order Fee Info */}
      {formData.orderType === 'MARKET' && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-yellow-600 dark:text-yellow-400">📊</span>
            <span className="text-yellow-800 dark:text-yellow-200 font-medium">
              {t('marketOrderAutoUsesTaker')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}