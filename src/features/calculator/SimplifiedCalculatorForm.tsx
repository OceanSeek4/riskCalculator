import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ComboInput } from '@/components/ui/combo-input';
import { RefreshCw, AlertCircle, Calculator, Lock, Unlock, TrendingUp } from 'lucide-react';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';
import { calculatePosition } from '@/lib/core';
import { validateNumberString, type CalculatorFormData } from '@/lib/validation';
import { getCurrentPrice, getMarketMeta, getATRValue } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';

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
    // Price locking
    isPriceLocked,
    setIsPriceLocked,
    lockedPrice,
    setLockedPrice,
    // Real-time price state
    realTimePrice,
    setRealTimePrice,
    lastPriceUpdate,
    setLastPriceUpdate,
    priceChange,
    setPriceChange,
  } = useCalculatorStore();

  const { settings, isOfflineMode, setNotification } = useSettingsStore();
  const { t } = useTranslation();
  
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
    if (['entryPrice', 'accountEquity', 'riskAmount', 'riskPercent', 'leverage'].includes(field)) {
      const validationResult = validateNumberString(value, field);
      if (validationResult) {
        setFormErrors(prev => ({ ...prev, [field]: validationResult }));
        return;
      } else {
        setFormErrors(prev => ({ ...prev, [field]: '' }));
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
      
      handleInputChange('entryPrice', price.toString());
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

  // 价格锁定切换
  const togglePriceLock = () => {
    if (!isPriceLocked && formData.entryPrice) {
      setLockedPrice(formData.entryPrice);
      setIsPriceLocked(true);
      setNotification(t('priceLocked'), 'info');
    } else {
      setLockedPrice(null);
      setIsPriceLocked(false);
      setNotification(t('priceUnlocked'), 'info');
    }
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

      const input = {
        side: formData.side!,
        entryPrice: formData.entryPrice!,
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
          <div className="flex gap-2">
            <Input
              id="entryPrice"
              type="text"
              value={formData.entryPrice || ''}
              onChange={(e) => handleInputChange('entryPrice', e.target.value)}
              placeholder={formData.orderType === 'MARKET' ? t('getCurrentPrice') : t('enterPrice')}
              className={priceChange === 'up' ? 'border-green-400 bg-green-50' : 
                        priceChange === 'down' ? 'border-red-400 bg-red-50' : ''}
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
            
            {/* 价格锁定按钮 */}
            {formData.orderType === 'MARKET' && formData.entryPrice && (
              <Button
                type="button"
                variant={isPriceLocked ? "default" : "outline"}
                onClick={togglePriceLock}
                className="px-3"
              >
                {isPriceLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </Button>
            )}
          </div>
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
