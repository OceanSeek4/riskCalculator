import React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, TrendingUp, TrendingDown, RefreshCw, WifiOff, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CalculatorFormData } from '@/lib/validation';
import type { usePriceLock } from '../hooks/usePriceLock';

interface EntrySectionProps {
  formData: Partial<CalculatorFormData>;
  onInputChange: (field: string, value: any) => void;
  formErrors?: Record<string, string>;
  // Price display props
  displayPrice?: string;
  displayPriceChange?: 'up' | 'down' | 'same' | null;
  displayLastUpdate?: Date | null;
  displayPriceDiff?: number;
  realTimePrice?: string | null;
  priceChange?: 'up' | 'down' | 'same' | null;
  lastPriceUpdate?: Date | null;
  isPriceLocked?: boolean;
  lockedPrice?: string | null;
  isOfflineMode?: boolean;
  isFetchingPrice?: boolean;
  priceError?: string;
  result?: any;
  marketMeta?: any;
  isQuickUpdating?: boolean;
  isQuickUpdateClicked?: boolean;
  quickUpdateSuccess?: boolean;
  settings?: any;
  // Price lock management
  priceLock?: ReturnType<typeof usePriceLock>;
  onQuickUpdate?: () => void;
  onFetchCurrentPrice?: () => void;
  onOrderTypeChange?: (orderType: string) => void;
  onFeeTypeChange?: (feeType: string) => void;
  onSetNotification?: (message: string, type: 'error' | 'success' | 'info') => void;
  // Limit order protection
  bindModeForEntry?: 'market' | 'manual';
  lastManualAt?: number | null;
  onSetBindMode?: (mode: 'market' | 'manual') => void;
  onSetLastManualAt?: (timestamp: number) => void;
}

export function EntrySection({
  formData,
  onInputChange,
  formErrors = {},
  displayPrice,
  displayPriceChange,
  displayLastUpdate,
  displayPriceDiff,
  realTimePrice,
  priceChange,
  lastPriceUpdate,
  isPriceLocked,
  lockedPrice,
  isOfflineMode,
  isFetchingPrice,
  priceError,
  result,
  marketMeta,
  isQuickUpdating,
  isQuickUpdateClicked,
  quickUpdateSuccess,
  settings,
  priceLock,
  onQuickUpdate,
  onFetchCurrentPrice,
  onOrderTypeChange,
  onFeeTypeChange,
  onSetNotification,
  bindModeForEntry,
  lastManualAt,
  onSetBindMode,
  onSetLastManualAt
}: EntrySectionProps) {
  const { t } = useTranslation();

  const formatPercentageDisplay = (decimalValue: string) => {
    return (parseFloat(decimalValue) * 100).toFixed(3);
  };

  const handleOrderTypeChange = (orderType: string) => {
    // 防止在离线模式下选择市价单
    if (orderType === 'MARKET' && isOfflineMode) {
      // 显示通知并阻止切换
      setTimeout(() => {
        onSetNotification?.('离线模式下无法使用市价单，请使用限价单', 'info');
      }, 100);
      return; // 不执行切换
    }
    
    // Sync price fields when switching order types
    if (orderType === 'LIMIT' && formData.orderType === 'MARKET') {
      // Switching from MARKET to LIMIT: copy entryPrice to limitPrice
      if (formData.entryPrice && !formData.limitPrice) {
        onInputChange('limitPrice', formData.entryPrice);
      }
      onSetBindMode?.('manual');
    } else if (orderType === 'MARKET' && formData.orderType === 'LIMIT') {
      // Switching from LIMIT to MARKET: copy limitPrice to entryPrice
      if (formData.limitPrice && !formData.entryPrice) {
        onInputChange('entryPrice', formData.limitPrice);
      }
      onSetBindMode?.('market');
    }
    
    onInputChange('orderType', orderType);
    
    // Reset price lock when switching order type
    if (priceLock?.isLocked) {
      priceLock.unlock();
    }
    
    // Set default fee type when switching to LIMIT order
    if (orderType === 'LIMIT') {
      onInputChange('feeType', 'MAKER_OPEN_TAKER_CLOSE');
    }
    
    // Set initial price when switching to LIMIT order in offline mode
    if (orderType === 'LIMIT' && isOfflineMode) {
      if (!formData.entryPrice || formData.entryPrice === '0' || formData.entryPrice === '') {
        onInputChange('entryPrice', settings?.offlineDefaultEntryPrice || '100000');
      }
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('entrySettings')}
      </h3>
      
      {/* 实时价格显示栏 - 独立显示，不受订单类型限制 */}
      {formData.exchange && formData.symbol && (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="space-y-2">
            {/* 第一行：交易对信息和更新时间 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {formData.exchange} {formData.symbol}
                </span>
                <span className="text-xs text-blue-600/70 dark:text-blue-300/70 font-normal">
                  {formData.orderType === 'MARKET' ? '实时价格' : '市场参考价'}
                </span>
              </div>
              {displayLastUpdate && (
                <span className="text-xs text-blue-600/70 dark:text-blue-300/70">
                  {displayLastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            {/* 第二行：价格显示区域 */}
            {displayPrice && (
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3">
                  {/* 主要价格 */}
                  <span className={`text-2xl font-bold font-mono ${
                    displayPriceChange === 'up' ? 'text-green-600 dark:text-green-400' :
                    displayPriceChange === 'down' ? 'text-red-600 dark:text-red-400' :
                    'text-blue-700 dark:text-blue-300'
                  }`}>
                    ${parseFloat(displayPrice).toLocaleString('en-US', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </span>
                  
                  {/* 涨跌标识和差值 */}
                  {displayPriceChange && displayPriceChange !== 'same' && displayPriceDiff !== 0 && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                      displayPriceChange === 'up' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      <span>
                        {displayPriceChange === 'up' ? '↗' : '↘'}
                      </span>
                      <span className="text-xs">
                        {displayPriceChange === 'up' ? '+' : ''}
                        {Math.abs(displayPriceDiff || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div>
        <Label>{t('orderType')}</Label>
        <Select
          value={formData.orderType || 'MARKET'}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleOrderTypeChange(e.target.value)}
        >
          <option value="MARKET" disabled={isOfflineMode}>
            {t('marketOrder')} {isOfflineMode && '(离线模式不可用)'}
          </option>
          <option value="LIMIT">{t('limitOrder')}</option>
        </Select>
        {isOfflineMode && formData.orderType === 'MARKET' && (
          <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-sm">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-700 dark:text-orange-300">
                市价单在离线模式下不可用，请切换到限价单
              </span>
            </div>
          </div>
        )}
        {isOfflineMode && formData.orderType === 'LIMIT' && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">
                离线模式：使用默认价格，无法获取实时市场价格
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Fee Type Selection - Only for LIMIT orders */}
      {formData.orderType === 'LIMIT' && (
        <div>
          <Label>费率类型</Label>
          <Select
            value={formData.feeType || 'MAKER'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              onInputChange('feeType', e.target.value as 'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY')
            }
          >
            <option value="MAKER">全部Maker (开平仓都挂单, {formatPercentageDisplay(settings?.defaultFeeOpenMaker || '0.0002')}%, 无滑点)</option>
            <option value="TAKER">全部Taker (开平仓都吃单, {formatPercentageDisplay(settings?.defaultFeeOpenTaker || '0.0006')}%, 有滑点)</option>
            <option value="MAKER_OPEN_TAKER_CLOSE">开仓Maker + 止损Taker (开仓挂单, 止损吃单, 止盈无滑点)</option>
            <option value="MAKER_OPEN_ONLY">仅开仓Maker (开仓挂单, 止盈止损吃单)</option>
          </Select>
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="space-y-1">
              <div>
                💡 {formData.feeType === 'MAKER' ? '全部使用Maker费率，低成本且无滑点' : 
                     formData.feeType === 'TAKER' ? '全部使用Taker费率，高成本且有滑点' :
                     formData.feeType === 'MAKER_OPEN_TAKER_CLOSE' ? '开仓使用Maker低费率，止损快速出场，止盈无滑点' :
                     '仅开仓使用Maker，止盈止损都使用Taker快速执行'}
              </div>
              <div className="text-xs opacity-75">
                {formData.feeType === 'MAKER' && (
                  <>
                    <strong>开仓:</strong> Maker {formatPercentageDisplay(settings?.defaultFeeOpenMaker || '0.0002')}%, 无滑点<br/>
                    <strong>止损:</strong> Maker {formatPercentageDisplay(settings?.defaultFeeCloseMaker || '0.0002')}%, 无滑点
                  </>
                )}
                {formData.feeType === 'TAKER' && (
                  <>
                    <strong>开仓:</strong> Taker {formatPercentageDisplay(settings?.defaultFeeOpenTaker || '0.0006')}%, 有滑点<br/>
                    <strong>止损:</strong> Taker {formatPercentageDisplay(settings?.defaultFeeCloseTaker || '0.0006')}%, 有滑点
                  </>
                )}
                {formData.feeType === 'MAKER_OPEN_TAKER_CLOSE' && (
                  <>
                    <strong>开仓:</strong> Maker {formatPercentageDisplay(settings?.defaultFeeOpenMaker || '0.0002')}%, 无滑点 (挂单入场)<br/>
                    <strong>止损:</strong> Taker {formatPercentageDisplay(settings?.defaultFeeCloseTaker || '0.0006')}%, 有滑点 (市价出场)<br/>
                    <strong>止盈:</strong> 无滑点 (限价单出场)<br/>
                    <span className="text-green-600 dark:text-green-400">✓ 推荐：开仓成本低，止损速度快，止盈无滑点</span>
                  </>
                )}
                {formData.feeType === 'MAKER_OPEN_ONLY' && (
                  <>
                    <strong>开仓:</strong> Maker {formatPercentageDisplay(settings?.defaultFeeOpenMaker || '0.0002')}%, 无滑点 (挂单入场)<br/>
                    <strong>止损:</strong> Taker {formatPercentageDisplay(settings?.defaultFeeCloseTaker || '0.0006')}%, 有滑点 (市价出场)<br/>
                    <strong>止盈:</strong> Taker {formatPercentageDisplay(settings?.defaultFeeCloseTaker || '0.0006')}%, 有滑点 (市价出场)<br/>
                    <span className="text-blue-600 dark:text-blue-400">ℹ️ 适合短线交易：开仓挂单等好价，出场市价保证成交</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Strategic explanation */}
            <div className="text-xs p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded mt-2">
              <div className="text-yellow-800 dark:text-yellow-200">
                <strong>🎯 策略建议:</strong>
                {formData.feeType === 'MAKER' && ' 适合低频交易，追求最低成本的长期持仓策略'}
                {formData.feeType === 'TAKER' && ' 适合快进快出的短线交易，优先考虑执行速度'}
                {formData.feeType === 'MAKER_OPEN_TAKER_CLOSE' && ' 适合大部分情况：开仓时耐心等待更好价格，止损时迅速出场，止盈时无滑点成本'}
                {formData.feeType === 'MAKER_OPEN_ONLY' && ' 适合短线交易者：开仓时耐心等待最佳价格，出场时优先考虑执行速度和可靠性'}
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
              市价单自动使用 Taker 费率 ({formatPercentageDisplay(settings?.defaultFeeOpenTaker || '0.0006')}%) 和滑点成本
            </span>
          </div>
        </div>
      )}
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>{formData.orderType === 'LIMIT' ? t('limitPrice') : t('entryPrice')}</Label>
          {formData.orderType === 'LIMIT' && !isOfflineMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFetchCurrentPrice}
              disabled={isFetchingPrice || !formData.exchange || !formData.symbol}
              className="h-6 px-2 text-xs"
            >
              {isFetchingPrice ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  {t('fetchingPrice')}
                </>
              ) : (
                t('getCurrentPrice')
              )}
            </Button>
          )}
          {formData.orderType === 'MARKET' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center">
                <RefreshCw className="w-3 h-3 inline animate-spin mr-1" />
                {t('realTimePrice')}
              </span>
              {priceChange && (
                <span className={`flex items-center gap-1 animate-pulse ${
                  priceChange === 'up' ? 'text-green-600 font-semibold' : 
                  priceChange === 'down' ? 'text-red-600 font-semibold' : 
                  'text-gray-500'
                }`} style={{ animationDuration: '1s', animationIterationCount: '1' }}>
                  {priceChange === 'up' && '↗'}
                  {priceChange === 'down' && '↘'}
                  {priceChange === 'same' && '→'}
                </span>
              )}
              {lastPriceUpdate && (
                <span className="text-green-600">
                  {new Date(lastPriceUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
        {/* LIMIT Order: Input field with controls */}
        {formData.orderType === 'LIMIT' && (
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={formData.limitPrice || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newValue = e.target.value;
                onInputChange('limitPrice', newValue);
                onSetBindMode?.('manual');
                onSetLastManualAt?.(Date.now());
              }}
              placeholder={t('enterLimitPrice')}
              className={`flex-1 ${formErrors.entryPrice ? 'border-red-500' : ''}`}
            />
            
            {/* Quick Update Button for Limit Orders */}
            {result && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onQuickUpdate}
                disabled={isQuickUpdating || !marketMeta}
                className={`min-w-[80px] transition-all duration-200 ${
                  quickUpdateSuccess
                    ? 'bg-green-100 border-green-400 text-green-800 dark:bg-green-950 dark:border-green-600 dark:text-green-200 scale-105 shadow-lg'
                    : isQuickUpdateClicked 
                      ? 'scale-95 bg-blue-100 border-blue-500 shadow-inner dark:bg-blue-900 dark:border-blue-500' 
                      : isQuickUpdating 
                        ? 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-200 animate-pulse scale-100' 
                        : 'border-blue-300 hover:bg-blue-50 hover:border-blue-400 text-blue-700 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950 scale-100'
                }`}
                title="使用当前价格快速更新计算结果"
              >
                {quickUpdateSuccess ? (
                  <>
                    <span className="animate-bounce">✅</span>
                    {' '}已更新
                  </>
                ) : isQuickUpdating ? (
                  <span className="animate-pulse">更新中</span>
                ) : (
                  <>
                    <span className={`transition-transform duration-200 ${isQuickUpdateClicked ? 'scale-110 rotate-180' : 'scale-100 rotate-0'}`}>
                      🔄
                    </span>
                    {' '}快速更新
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* MARKET Order: Price display with manual lock button */}
        {formData.orderType === 'MARKET' && (
          <div className="space-y-3">
            {/* Current price display and manual lock button */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">当前市场价格:</span>
                {realTimePrice && !isOfflineMode && (
                  <Button
                    type="button"
                    variant={isPriceLocked ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isPriceLocked) {
                        priceLock?.unlock();
                        onSetNotification?.('价格已解锁', 'info');
                      } else {
                        const price = parseFloat(realTimePrice);
                        priceLock?.lock(price);
                        onSetNotification?.('价格已手动锁定', 'info');
                      }
                    }}
                    className={`px-3 text-xs ${
                      isPriceLocked 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title={isPriceLocked ? '解锁价格' : '手动锁定当前价格'}
                  >
                    {isPriceLocked ? (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        解锁
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 mr-1" />
                        锁定
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {realTimePrice && (
                    <span className={`font-mono text-xl font-bold ${
                      priceChange === 'up' ? 'text-green-600 dark:text-green-400' :
                      priceChange === 'down' ? 'text-red-600 dark:text-red-400' :
                      'text-foreground'
                    }`}>
                      ${parseFloat(realTimePrice).toLocaleString('en-US', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                      {priceChange && (
                        <span className={`ml-2 text-sm ${
                          priceChange === 'up' ? 'text-green-500' : 
                          priceChange === 'down' ? 'text-red-500' : ''
                        }`}>
                          {priceChange === 'up' ? '↗' : priceChange === 'down' ? '↘' : ''}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Lock status */}
              {isPriceLocked && priceLock?.lockedEntryPrice && (
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-700 dark:text-blue-300">🔒 入场价格锁定值:</span>
                    <span className="font-mono text-sm font-bold text-blue-800 dark:text-blue-200">
                      ${parseFloat(priceLock.lockedEntryPrice.toString()).toLocaleString('en-US', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    计算将使用此锁定价格，不受后续价格变动影响
                  </div>
                </div>
              )}
              
              {/* Behavior explanation */}
              {!isPriceLocked && (
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  💡 可手动锁定当前价格，或在点击"计算"时自动锁定
                </div>
              )}
            </div>
          </div>
        )}
        {formErrors.entryPrice && (
          <p className="text-sm text-red-500 mt-1">{formErrors.entryPrice}</p>
        )}
        {formData.orderType === 'LIMIT' && result && !isOfflineMode && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
            <span>💡</span>
            修改价格后点击"快速更新"可立即重新计算，无需重新点击"计算仓位"
          </p>
        )}
        {isOfflineMode && formData.orderType === 'LIMIT' && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            离线模式下使用固定价格，无法获取实时市场数据
          </p>
        )}
        {priceError && (
          <p className="text-sm text-red-500 mt-1">{priceError}</p>
        )}
        {formData.orderType === 'MARKET' && (
          <>
            {isPriceLocked ? (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                🔒 计算锁定价格: ${lockedPrice} - 再次点击"计算仓位"将重新锁定最新价格
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                📈 {t('marketOrderNote')} - 点击"计算仓位"时将锁定当前市场价
              </p>
            )}
            {isOfflineMode && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-sm">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-orange-700 dark:text-orange-300">
                    离线模式下无法获取实时价格，请手动输入预期的入场价格
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}