import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ComboInput } from '@/components/ui/combo-input';
import { RefreshCw, AlertCircle, Calculator, Lock, Unlock, TrendingUp } from 'lucide-react';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';
import { useEntryPriceBinding } from './hooks/useEntryPriceBinding';
import { calculatePosition } from '@/lib/core';
import { validateNumberString, type CalculatorFormData } from '@/lib/validation';
import { getCurrentPrice, getMarketMeta, getATRValue } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';
import { getEffectiveEntryPrice } from './utils/effectivePrice';
import { getEffectiveEntryPrice as getNewEffectiveEntryPrice } from './lib/price';
import { usePriceLock } from './hooks/usePriceLock';

export function SimplifiedCalculatorForm() {
  const {
    formData,
    setFormData,
    setResult,
    syncWithSettings,
    currentATR,
    setCurrentATR,
    isCalculating,
    setIsCalculating,
    calculationError,
    setCalculationError,
    // Real-time price state
    realTimePrice,
    setRealTimePrice,
    lastPriceUpdate,
    setLastPriceUpdate,
    priceChange,
    setPriceChange,
  } = useCalculatorStore();

  // NEW: Market price locking
  const priceLock = usePriceLock();

  const { settings, isOfflineMode, setNotification } = useSettingsStore();
  const { t } = useTranslation();
  
  // Price binding protection
  const priceBinding = useEntryPriceBinding();

  // Clear price lock when switching context
  useEffect(() => {
    priceLock.unlock();
  }, [formData.exchange, formData.symbol, formData.contractMode, formData.orderType]);
  
  const [marketMeta, setMarketMeta] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string>('');

  // 同步设置
  useEffect(() => {
    syncWithSettings(settings, isOfflineMode);
  }, [settings, isOfflineMode, syncWithSettings]);

  // 获取市场元数据
  useEffect(() => {
    const fetchMarketMeta = async () => {
      if (formData.exchange && formData.symbol && formData.contractMode) {
        try {
          const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const meta = await getMarketMeta(formData.exchange as Exchange, formData.symbol, instType);
          setMarketMeta(meta);
        } catch (error) {
          console.error('Failed to fetch market meta:', error);
          setMarketMeta(null);
        }
      }
    };
    
    fetchMarketMeta();
  }, [formData.exchange, formData.symbol, formData.contractMode]);

  // 表单输入处理
  const handleInputChange = (field: keyof CalculatorFormData, value: string) => {
    // 数字验证
    if (['entryPrice', 'limitPrice', 'accountEquity', 'riskAmount', 'riskPercent', 'leverage'].includes(field)) {
      const validationResult = validateNumberString(value, field);
      if (validationResult) {
        setFormErrors(prev => ({ ...prev, [field]: validationResult }));
        return;
      } else {
        setFormErrors(prev => ({ ...prev, [field]: '' }));
      }
    }

    // Handle order type switching with price field synchronization
    if (field === 'orderType') {
      const oldOrderType = formData.orderType as 'MARKET' | 'LIMIT';
      const newOrderType = value as 'MARKET' | 'LIMIT';
      
      if (oldOrderType !== newOrderType) {
        priceBinding.handleOrderTypeSwitch(newOrderType, oldOrderType);
      }
    }

    setFormData({ [field]: value });

    // 特殊处理：当交易所改变时，同步返佣设置
    if (field === 'exchange') {
      const rebateMap = {
        'BINANCE': settings.defaultRebateBinance,
        'BYBIT': settings.defaultRebateBybit,
        'BITGET': settings.defaultRebateBitget,
        'OKX': settings.defaultRebateOkx,
      };
      setFormData({ 
        exchange: value as any,
        rebatePercent: formData.enableRebate ? rebateMap[value as keyof typeof rebateMap] || '0' : '0'
      });
    }
  };

  // 获取当前价格
  const handleFetchCurrentPrice = async () => {
    if (!formData.exchange || !formData.symbol || !formData.contractMode) {
      setPriceError(t('pleaseSelectExchangeSymbol'));
      return;
    }

    setIsFetchingPrice(true);
    setPriceError('');

    try {
      const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      const price = await getCurrentPrice(formData.exchange as Exchange, formData.symbol, instType);
      
      // Use price binding hook for proper field targeting
      await priceBinding.handleFetchCurrentPrice(
        async () => price.toString(),
        formData.orderType as 'MARKET' | 'LIMIT'
      );
      
      setRealTimePrice(price.toString());
      setLastPriceUpdate(new Date());
      
      // 设置价格变化指示
      if (realTimePrice) {
        const prevPrice = parseFloat(realTimePrice);
        if (price > prevPrice) {
          setPriceChange('up');
        } else if (price < prevPrice) {
          setPriceChange('down');
        } else {
          setPriceChange('same');
        }
      }
      
      setTimeout(() => setPriceChange(null), 2000);
      
      setNotification(t('priceUpdated'), 'success');
    } catch (error: any) {
      setPriceError(error.message || t('failedToFetchPrice'));
      setNotification(t('failedToFetchPrice'), 'error');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // Display effective entry price
  const getEffectiveEntryPriceForDisplay = (): string => {
    return getNewEffectiveEntryPrice({
      orderType: formData.orderType as 'MARKET' | 'LIMIT',
      limitPrice: formData.limitPrice,
      marketRefPrice: realTimePrice,
      lockedEntryPrice: priceLock.lockedEntryPrice
    }).toString();
  };

  // 计算
  const handleCalculate = async () => {
    // 验证表单
    const errors: Record<string, string> = {};
    
    if (!formData.exchange) errors.exchange = t('required');
    if (!formData.symbol) errors.symbol = t('required');
    if (!formData.side) errors.side = t('required');
    if (!formData.entryPrice) errors.entryPrice = t('required');
    
    if (formData.riskMode === 'ACCOUNT_PERCENT') {
      if (!formData.accountEquity) errors.accountEquity = t('required');
      if (!formData.riskPercent) errors.riskPercent = t('required');
    } else if (formData.riskMode === 'FIXED_USDT') {
      if (!formData.riskAmount) errors.riskAmount = t('required');
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setCalculationError(t('pleaseFixErrors'));
      return;
    }

    if (!marketMeta) {
      setCalculationError(t('marketDataNotAvailable'));
      return;
    }

    setIsCalculating(true);
    setCalculationError('');

    try {
      // 获取ATR值（如果使用ATR止损模式）
      let atrValue = currentATR;
      if (formData.stopMode === 'ATR' && !atrValue && !isOfflineMode) {
        try {
          const fetchedATR = await getATRValue(
            formData.exchange as Exchange,
            formData.symbol!,
            formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP',
            (formData.atrTimeframe || '15m') as any,
            (formData.atrPeriod || 14) as any
          );
          atrValue = fetchedATR.toString();
          setCurrentATR(atrValue);
        } catch (error) {
          console.warn('Failed to fetch ATR, using fallback calculation');
        }
      }

      // Get effective price - lock market price if MARKET order
      let calculationEntryPrice: number;
      
      if (formData.orderType === 'MARKET') {
        try {
          // Lock current market price for MARKET orders
          const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const latestPrice = await getCurrentPrice(
            formData.exchange as Exchange,
            formData.symbol!,
            instType
          );
          priceLock.lock(latestPrice);
          calculationEntryPrice = latestPrice;
        } catch (error) {
          // Fall back to current real-time price
          if (realTimePrice) {
            const price = parseFloat(realTimePrice);
            priceLock.lock(price);
            calculationEntryPrice = price;
          } else {
            throw new Error('No market price available for MARKET order');
          }
        }
      } else {
        // For limit orders, use input box value
        calculationEntryPrice = getNewEffectiveEntryPrice({
          orderType: formData.orderType as 'MARKET' | 'LIMIT',
          limitPrice: formData.limitPrice,
          marketRefPrice: realTimePrice,
          lockedEntryPrice: null
        });
      }
      
      const effectivePrice = calculationEntryPrice.toString();

      const input = {
        side: formData.side!,
        entryPrice: effectivePrice,
        stopPrice: undefined, // 简化版不处理止损价格输入
        atr: atrValue || undefined,
        atrMultiplier: formData.atrMultiplier,
        stopPips: formData.stopPips,
        stopMode: formData.stopMode || 'ATR',
        useTakeProfit: formData.useTakeProfit || false,
        takeProfitMode: formData.takeProfitMode,
        takeProfitPrice: undefined,
        takeProfitATRMultiplier: undefined,
        takeProfitRRRatio: undefined,
        takeProfitPips: undefined,
        riskMode: formData.riskMode || 'FIXED_USDT',
        riskUSDT: formData.riskMode === 'FIXED_USDT' ? formData.riskAmount : undefined,
        accountEquity: formData.riskMode === 'ACCOUNT_PERCENT' ? formData.accountEquity : undefined,
        riskPercent: formData.riskMode === 'ACCOUNT_PERCENT' ? formData.riskPercent : undefined,
        includeFees: formData.includeFees || false,
        feeOpenMaker: formData.feeOpenMaker || '0.0002',
        feeOpenTaker: formData.feeOpenTaker || '0.0006',
        feeCloseMaker: formData.feeCloseMaker || '0.0002',
        feeCloseTaker: formData.feeCloseTaker || '0.0006',
        slippageOpen: formData.slippageOpen || '0.0005',
        slippageClose: formData.slippageClose || '0.0005',
        enableRebate: formData.enableRebate || false,
        rebatePercent: formData.rebatePercent || '0',
        feeOpen: formData.feeOpen || '0.0004',
        feeClose: formData.feeClose || '0.0004',
        slippage: formData.slippage || '0.0005',
        leverage: formData.leverage || 10,
        contractMode: formData.contractMode || 'USDT_PERP',
        marketMeta,
        orderType: formData.orderType || 'MARKET',
        feeType: formData.feeType || 'MAKER_OPEN_TAKER_CLOSE',
        rrRatios: settings.rrRatios || [1, 1.5, 2],
      };

      const result = calculatePosition(input);
      setResult(result);
      setNotification(t('calculationComplete'), 'success');
      
    } catch (error: any) {
      setCalculationError(error.message || t('calculationFailed'));
      setNotification(t('calculationFailed'), 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          {t('positionCalculator')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 基础市场设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 交易所选择 */}
          <div className="space-y-2">
            <Label htmlFor="exchange">{t('exchange')}</Label>
            <select
              value={formData.exchange || ''}
              onChange={(e) => handleInputChange('exchange', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t('selectExchange')}</option>
              <option value="BINANCE">{t('binance')}</option>
              <option value="BYBIT">{t('bybit')}</option>
              <option value="BITGET">{t('bitget')}</option>
              <option value="OKX">{t('okx')}</option>
            </select>
            {formErrors.exchange && (
              <p className="text-sm text-red-600">{formErrors.exchange}</p>
            )}
          </div>

          {/* 交易对 */}
          <div className="space-y-2">
            <Label htmlFor="symbol">{t('symbol')}</Label>
            <ComboInput
              value={formData.symbol || ''}
              onChange={(value) => handleInputChange('symbol', value)}
              options={settings.symbolList || ['BTCUSDT', 'ETHUSDT', 'SUIUSDT']}
              placeholder={t('enterOrSelectSymbol')}
            />
            {formErrors.symbol && (
              <p className="text-sm text-red-600">{formErrors.symbol}</p>
            )}
          </div>
        </div>

        {/* 合约模式和方向 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractMode">{t('contractMode')}</Label>
            <select
              value={formData.contractMode || ''}
              onChange={(e) => handleInputChange('contractMode', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="USDT_PERP">{t('usdtPerp')}</option>
              <option value="SPOT">{t('spot')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="side">{t('side')}</Label>
            <select
              value={formData.side || ''}
              onChange={(e) => handleInputChange('side', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t('selectSide')}</option>
              <option value="LONG">{t('long')}</option>
              <option value="SHORT">{t('short')}</option>
            </select>
            {formErrors.side && (
              <p className="text-sm text-red-600">{formErrors.side}</p>
            )}
          </div>
        </div>

        {/* 入场价格 */}
        <div className="space-y-2">
          <Label htmlFor="entryPrice">
            {formData.orderType === 'MARKET' ? t('currentPrice') : t('entryPrice')}
          </Label>
          {/* LIMIT Order: Input field with fetch button */}
          {formData.orderType === 'LIMIT' && (
            <div className="flex gap-2">
              <Input
                id="limitPrice"
                type="text"
                value={formData.limitPrice || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  handleInputChange('limitPrice', newValue);
                }}
                placeholder={t('enterPrice')}
              />
              
              {/* 获取价格按钮 */}
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchCurrentPrice}
                disabled={isFetchingPrice || !formData.exchange || !formData.symbol}
                className="px-3"
              >
                {isFetchingPrice ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              </Button>
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
                      variant={priceLock.isLocked ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (priceLock.isLocked) {
                          priceLock.unlock();
                          setNotification('价格已解锁', 'info');
                        } else {
                          const price = parseFloat(realTimePrice);
                          priceLock.lock(price);
                          setNotification('价格已手动锁定', 'info');
                        }
                      }}
                      className={`px-3 text-xs ${
                        priceLock.isLocked 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      title={priceLock.isLocked ? '解锁价格' : '手动锁定当前价格'}
                    >
                      {priceLock.isLocked ? (
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
                {priceLock.isLocked && priceLock.lockedEntryPrice && (
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
                {!priceLock.isLocked && (
                  <div className="mt-2 text-xs text-muted-foreground text-center">
                    💡 可手动锁定当前价格，或在点击"计算"时自动锁定
                  </div>
                )}
              </div>
            </div>
          )}
          {formErrors.entryPrice && (
            <p className="text-sm text-red-600">{formErrors.entryPrice}</p>
          )}
          {priceError && (
            <p className="text-sm text-red-600">{priceError}</p>
          )}
        </div>

        {/* 风险管理 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="riskMode">{t('riskMode')}</Label>
            <select
              value={formData.riskMode || ''}
              onChange={(e) => handleInputChange('riskMode', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="FIXED_USDT">{t('fixedAmount')}</option>
              <option value="ACCOUNT_PERCENT">{t('accountPercent')}</option>
            </select>
          </div>

          {formData.riskMode === 'ACCOUNT_PERCENT' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountEquity">{t('accountEquity')}</Label>
                <Input
                  id="accountEquity"
                  type="text"
                  value={formData.accountEquity || ''}
                  onChange={(e) => handleInputChange('accountEquity', e.target.value)}
                  placeholder="100000"
                />
                {formErrors.accountEquity && (
                  <p className="text-sm text-red-600">{formErrors.accountEquity}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="riskPercent">{t('riskPercent')}</Label>
                <Input
                  id="riskPercent"
                  type="text"
                  value={formData.riskPercent || ''}
                  onChange={(e) => handleInputChange('riskPercent', e.target.value)}
                  placeholder="2"
                />
                {formErrors.riskPercent && (
                  <p className="text-sm text-red-600">{formErrors.riskPercent}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="riskAmount">{t('riskAmount')}</Label>
              <Input
                id="riskAmount"
                type="text"
                value={formData.riskAmount || ''}
                onChange={(e) => handleInputChange('riskAmount', e.target.value)}
                placeholder="1000"
              />
              {formErrors.riskAmount && (
                <p className="text-sm text-red-600">{formErrors.riskAmount}</p>
              )}
            </div>
          )}
        </div>

        {/* 杠杆 */}
        <div className="space-y-2">
          <Label htmlFor="leverage">{t('leverage')}</Label>
          <Input
            id="leverage"
            type="text"
            value={formData.leverage || ''}
            onChange={(e) => handleInputChange('leverage', e.target.value)}
            placeholder="10"
          />
          {formErrors.leverage && (
            <p className="text-sm text-red-600">{formErrors.leverage}</p>
          )}
        </div>

        {/* 计算按钮 */}
        <Button
          onClick={handleCalculate}
          disabled={isCalculating || !marketMeta}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isCalculating ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              {t('calculating')}
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5 mr-2" />
              {t('calculatePosition')}
            </>
          )}
        </Button>

        {calculationError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            {calculationError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
