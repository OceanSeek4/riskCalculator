import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { RefreshCw, AlertCircle, Bookmark, Calculator } from 'lucide-react';
import { useCalculatorStore, useSettingsStore, usePresetStore } from '@/lib/store';
import { calculatePosition } from '@/lib/core';
import { validateNumberString, validateStopPrice } from '@/lib/validation';
import { getCurrentPrice, getATRValue, formatPrice, checkSymbolSupport, getSupportedTimeframes, getMarketMeta } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';
import { TrailingPanel } from './TrailingPanel';
import { calculateExpectedPnL, updateOnClose } from '@/lib/core';
import { CandleManager, timeframeToMs } from '@/lib/candles';
export function CalculatorForm() {
  const {
    formData,
    setFormData,
    result,
    setResult,
    syncWithSettings,
    currentATR,
    setCurrentATR,
    isCalculating,
    setIsCalculating,
    isFetchingATR,
    setIsFetchingATR,
    calculationError,
    setCalculationError,
    atrError,
    setATRError,
    // Trailing exits
    trailingEnabled,
    setTrailingEnabled,
    trailingConfig,
    updateTrailingConfig,
    trailingState,
    setTrailingState,
  } = useCalculatorStore();

  const { settings } = useSettingsStore();
  const { presets, loadPreset } = usePresetStore();
  const { t } = useTranslation();
  
  const [marketMeta, setMarketMeta] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string>('');
  const [supportedIntervals, setSupportedIntervals] = useState<string[]>([]);
  
  // Candle management for trailing exits
  const [candleManager, setCandleManager] = useState<CandleManager | null>(null);
  const [isInitializingCandles, setIsInitializingCandles] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>(undefined);

  // Sync calculator with settings on component mount and settings changes
  useEffect(() => {
    syncWithSettings(settings);
  }, [settings, syncWithSettings]);

  // Fetch market metadata when exchange/symbol changes
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!formData.exchange || !formData.symbol || !formData.contractMode) return;
      
      try {
        const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
        
        const meta = await getMarketMeta(
          formData.exchange as Exchange,
          formData.symbol,
          instType
        );
        
        setMarketMeta(meta);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchMarketData();
  }, [formData.exchange, formData.symbol, formData.contractMode]);

  // Auto-fetch ATR when symbol changes (if enabled in settings)
  useEffect(() => {
    if (settings.autoFetchATR && 
        formData.stopMode === 'ATR' && 
        formData.exchange && 
        formData.symbol && 
        formData.atrTimeframe &&
        marketMeta) {
      handleFetchATR();
    }
  }, [formData.exchange, formData.symbol, formData.atrTimeframe, formData.stopMode, marketMeta, settings.autoFetchATR]);

  // Initialize CandleManager for trailing exits when enabled
  useEffect(() => {
    if (!trailingEnabled || !formData.exchange || !formData.symbol) {
      if (candleManager) {
        candleManager.destroy();
        setCandleManager(null);
      }
      return;
    }

    const initializeCandleManager = async () => {
      if (candleManager) {
        candleManager.destroy();
      }
      
      setIsInitializingCandles(true);
      
      try {
        const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
        // Convert milliseconds back to timeframe string
        const getTimeframeString = (ms: number): string => {
          if (ms === 60000) return '1m';
          if (ms === 300000) return '5m';
          if (ms === 900000) return '15m';
          if (ms === 1800000) return '30m';
          if (ms === 3600000) return '1h';
          if (ms === 14400000) return '4h';
          if (ms === 86400000) return '1d';
          return '1h'; // Default
        };
        const timeframe = getTimeframeString(trailingConfig.tfMs);
        
        const newManager = new CandleManager(
          formData.exchange as Exchange,
          formData.symbol!,
          instType,
          timeframe,
          (candle) => {
            // Update trailing state when new candle closes
            const newState = updateOnClose(trailingState, candle, {
              ...trailingConfig,
              side: formData.side || 'LONG',
              roundTick: marketMeta?.tickSize ? parseFloat(marketMeta.tickSize) : 0.01,
            });
            setTrailingState(newState);
          },
          (error) => {
            console.error('CandleManager error:', error);
          }
        );
        
        // Preheat with historical data
        const requiredCandles = Math.max(trailingConfig.maLen, trailingConfig.atrLen) + 50;
        await newManager.preheatWithRest(requiredCandles);
        
        // Initialize trailing state with current data
        const candles = newManager.getCandles(requiredCandles);
        if (candles.length > 0) {
          let state = { indicators: {} };
          // Process candles sequentially to build up indicators
          for (const candle of candles) {
            state = updateOnClose(state, candle, {
              ...trailingConfig,
              side: formData.side || 'LONG',
              roundTick: marketMeta?.tickSize ? parseFloat(marketMeta.tickSize) : 0.01,
            });
          }
          setTrailingState(state);
        }
        
        setCandleManager(newManager);
      } catch (error) {
        console.error('Failed to initialize CandleManager:', error);
      } finally {
        setIsInitializingCandles(false);
      }
    };

    initializeCandleManager();
    
    // Cleanup on unmount or dependency change
    return () => {
      if (candleManager) {
        candleManager.destroy();
      }
    };
  }, [trailingEnabled, formData.exchange, formData.symbol, formData.contractMode, trailingConfig.tfMs, marketMeta]);

  // Get current price for trailing panel when enabled
  useEffect(() => {
    if (!trailingEnabled || !formData.exchange || !formData.symbol) {
      setCurrentPrice(undefined);
      return;
    }

    const fetchPrice = async () => {
      try {
        const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
        const price = await getCurrentPrice(formData.exchange as Exchange, formData.symbol!, instType);
        setCurrentPrice(price);
      } catch (error) {
        console.error('Failed to fetch current price for trailing:', error);
      }
    };

    fetchPrice();
    
    // Update price every 5 seconds when trailing is enabled
    const interval = setInterval(fetchPrice, 5000);
    
    return () => clearInterval(interval);
  }, [trailingEnabled, formData.exchange, formData.symbol, formData.contractMode]);

  const handleInputChange = (field: string, value: any) => {
    setFormData({ [field]: value });
    
    // Clear field-specific error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLoadPreset = (presetId: string) => {
    if (presetId === '') return;
    
    const presetData = loadPreset(presetId);
    if (presetData) {
      setFormData(presetData);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Entry price validation
    const entryPriceError = validateNumberString(formData.entryPrice || '', 'Entry price');
    if (entryPriceError) errors.entryPrice = entryPriceError;
    
    // Stop price validation
    if (formData.stopMode === 'PRICE') {
      const stopPriceError = validateNumberString(formData.stopPrice || '', 'Stop price');
      if (stopPriceError) {
        errors.stopPrice = stopPriceError;
      } else if (formData.entryPrice && formData.stopPrice) {
        const directionError = validateStopPrice(
          formData.entryPrice,
          formData.stopPrice,
          formData.side || 'LONG'
        );
        if (directionError) errors.stopPrice = directionError;
      }
    }
    
    // ATR validation
    if (formData.stopMode === 'ATR') {
      if (!currentATR) {
        errors.atr = t('atrMustBeFetched');
      }
      const multiplierError = validateNumberString(formData.atrMultiplier || '', 'ATR multiplier');
      if (multiplierError) errors.atrMultiplier = multiplierError;
    }
    
    // Take profit validation
    if (formData.useTakeProfit) {
      if (formData.takeProfitMode === 'PRICE') {
        const takeProfitError = validateNumberString(formData.takeProfitPrice || '', 'Take profit price');
        if (takeProfitError) {
          errors.takeProfitPrice = takeProfitError;
        } else if (formData.entryPrice && formData.takeProfitPrice) {
          // Validate take profit direction
          const entry = parseFloat(formData.entryPrice);
          const takeProfit = parseFloat(formData.takeProfitPrice);
          if (formData.side === 'LONG' && takeProfit <= entry) {
            errors.takeProfitPrice = 'Take profit must be above entry price for LONG positions';
          } else if (formData.side === 'SHORT' && takeProfit >= entry) {
            errors.takeProfitPrice = 'Take profit must be below entry price for SHORT positions';
          }
        }
      } else if (formData.takeProfitMode === 'ATR') {
        if (!currentATR) {
          errors.takeProfitATRMultiplier = 'ATR must be fetched first';
        } else {
          const atrMultiplierError = validateNumberString(formData.takeProfitATRMultiplier || '', 'Take profit ATR multiplier');
          if (atrMultiplierError) errors.takeProfitATRMultiplier = atrMultiplierError;
        }
      } else if (formData.takeProfitMode === 'MA' || formData.takeProfitMode === 'EMA') {
        const periodError = validateNumberString(formData.takeProfitMAPeriod || '', 'MA period');
        if (periodError) errors.takeProfitMAPeriod = periodError;
      }
    }
    
    // Risk validation
    if (formData.riskMode === 'FIXED_USDT') {
      const riskError = validateNumberString(formData.riskAmount || '', 'Risk amount');
      if (riskError) errors.riskAmount = riskError;
    } else {
      const equityError = validateNumberString(formData.accountEquity || '', 'Account equity');
      if (equityError) errors.accountEquity = equityError;
      
      const percentError = validateNumberString(formData.riskPercent || '', 'Risk percentage');
      if (percentError) errors.riskPercent = percentError;
      else if (parseFloat(formData.riskPercent || '0') > 10) {
        errors.riskPercent = 'Risk percentage should not exceed 10%';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFetchATR = async () => {
    if (!formData.exchange || !formData.symbol || !formData.atrTimeframe) return;
    
    setIsFetchingATR(true);
    setATRError(null);
    
    try {
      const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      const atr = await getATRValue(
        formData.exchange as Exchange,
        formData.symbol,
        formData.atrTimeframe,
        formData.atrPeriod || 14,
        instType
      );

      setCurrentATR(atr.toString());
    } catch (error) {
      console.error('Failed to fetch ATR:', error);
      setATRError(error instanceof Error ? error.message : t('failedToFetchATR'));
    } finally {
      setIsFetchingATR(false);
    }
  };

  // 获取当前价格
  const fetchCurrentPrice = async () => {
    if (!formData.exchange || !formData.symbol) return;

    setIsFetchingPrice(true);
    setPriceError('');

    try {
      const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      const price = await getCurrentPrice(
        formData.exchange as Exchange,
        formData.symbol,
        instType
      );

      handleInputChange('entryPrice', price.toString());
      setPriceError('');
    } catch (error) {
      console.error('Failed to fetch current price:', error);
      setPriceError(error instanceof Error ? error.message : t('failedToFetchPrice'));
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // 拉取市场元数据
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const fetchMarketMetadata = async () => {
    if (!formData.exchange || !formData.symbol || !formData.contractMode) return;

    setIsFetchingMeta(true);

    try {
      const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      const meta = await getMarketMeta(
        formData.exchange as Exchange,
        formData.symbol,
        instType
      );

      setMarketMeta(meta);
    } catch (error) {
      console.error('Failed to fetch market metadata:', error);
      setPriceError(error instanceof Error ? error.message : 'Failed to fetch market metadata');
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleCalculate = async () => {
    if (!validateForm() || !marketMeta) return;
    
    setIsCalculating(true);
    setCalculationError(null);
    
    try {
      const input = {
        side: formData.side!,
        entryPrice: formData.entryPrice!,
        stopPrice: formData.stopMode === 'PRICE' ? formData.stopPrice : undefined,
        atr: formData.stopMode === 'ATR' ? currentATR || undefined : undefined,
        atrMultiplier: formData.stopMode === 'ATR' ? formData.atrMultiplier : undefined,
        stopMode: formData.stopMode!,
        // Take profit settings
        useTakeProfit: formData.useTakeProfit || false,
        takeProfitMode: formData.takeProfitMode,
        takeProfitPrice: formData.takeProfitMode === 'PRICE' ? formData.takeProfitPrice : undefined,
        takeProfitATRMultiplier: formData.takeProfitMode === 'ATR' ? formData.takeProfitATRMultiplier : undefined,
        takeProfitMAPeriod: (formData.takeProfitMode === 'MA' || formData.takeProfitMode === 'EMA') ? formData.takeProfitMAPeriod : undefined,
        takeProfitMATimeframe: (formData.takeProfitMode === 'MA' || formData.takeProfitMode === 'EMA') ? formData.takeProfitMATimeframe : undefined,
        riskMode: formData.riskMode || 'FIXED_USDT',
        riskUSDT: formData.riskMode === 'FIXED_USDT' ? formData.riskAmount : undefined,
        accountEquity: formData.riskMode === 'ACCOUNT_PERCENT' ? formData.accountEquity : undefined,
        riskPercent: formData.riskMode === 'ACCOUNT_PERCENT' ? formData.riskPercent : undefined,
        includeFees: formData.includeFees || false,
        feeOpen: formData.feeOpen || '0.0004',
        feeClose: formData.feeClose || '0.0004',
        slippage: formData.slippage || '0.0005',
        leverage: formData.leverage,
        contractMode: formData.contractMode!,
        marketMeta,
        rrRatios: settings.rrRatios,
      };
      
      const result = calculatePosition(input);
      setResult(result);
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : t('calculationFailed'));
    } finally {
      setIsCalculating(false);
    }
  };

  // 获取支持的时间框架
  useEffect(() => {
    if (formData.exchange) {
      const intervals = getSupportedTimeframes(formData.exchange as Exchange);
      setSupportedIntervals(intervals);
    } else {
      setSupportedIntervals([]);
    }
  }, [formData.exchange]);

  return (
    <Card className="w-full max-w-md sm:max-w-lg lg:max-w-xl modern-card fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <Calculator className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl">{t('calculator')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Load Preset */}
        {presets.length > 0 && (
          <div>
            <Label>Load Preset</Label>
            <Select
              value=""
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleLoadPreset(e.target.value)}
            >
              <option value="">Select a preset...</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.data.exchange} {preset.data.symbol})
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Market Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('marketSettings')}</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t('exchange')}</Label>
              <Select
                value={formData.exchange || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('exchange', e.target.value)}
              >
                <option value="BINANCE">{t('binance')}</option>
                <option value="BYBIT">{t('bybit')}</option>
                <option value="BITGET">{t('bitget')}</option>
                <option value="OKX">{t('okx')}</option>
              </Select>
            </div>
            <div>
              <Label>{t('symbol')}</Label>
              <Input
                value={formData.symbol || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('symbol', e.target.value)}
                placeholder="BTC/USDT"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t('contractMode')}</Label>
              <Select
                value={formData.contractMode || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('contractMode', e.target.value)}
              >
                <option value="SPOT">{t('spot')}</option>
                <option value="USDT_PERP">{t('usdtPerp')}</option>
              </Select>
            </div>
            <div>
              <Label>{t('side')}</Label>
              <Select
                value={formData.side || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('side', e.target.value)}
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
              onClick={fetchMarketMetadata}
              disabled={isFetchingMeta || !formData.exchange || !formData.symbol || !formData.contractMode}
              className="flex-1"
            >
              {isFetchingMeta ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  {t('fetchingMetadata')}
                </>
              ) : (
                t('fetchMetadata')
              )}
            </Button>
            {marketMeta && (
              <div className="text-xs text-muted-foreground px-3 py-2 bg-green-50 rounded border border-green-200 whitespace-nowrap">
                ✓ {t('metadataLoaded')}: {marketMeta.tickSize}/{marketMeta.stepSize}
              </div>
            )}
          </div>
        </div>

        {/* Entry Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('entrySettings')}</h3>
          
          <div>
            <Label>{t('orderType')}</Label>
            <Select
              value={formData.orderType || 'MARKET'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('orderType', e.target.value)}
            >
              <option value="MARKET">{t('marketOrder')}</option>
              <option value="LIMIT">{t('limitOrder')}</option>
            </Select>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{formData.orderType === 'LIMIT' ? t('limitPrice') : t('entryPrice')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchCurrentPrice}
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
            </div>
            <Input
              type="number"
              step="0.01"
              value={formData.entryPrice || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('entryPrice', e.target.value)}
              placeholder={formData.orderType === 'LIMIT' ? t('enterLimitPrice') : t('enterExpectedEntryPrice')}
              className={formErrors.entryPrice ? 'border-red-500' : ''}
            />
            {formErrors.entryPrice && (
              <p className="text-sm text-red-500 mt-1">{formErrors.entryPrice}</p>
            )}
            {priceError && (
              <p className="text-sm text-red-500 mt-1">{priceError}</p>
            )}
            {formData.orderType === 'MARKET' && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('marketOrderNote')}
              </p>
            )}
          </div>
        </div>

        {/* Stop Loss Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('stopLossSettings')}</h3>
          
          <div>
            <Label>{t('stopMode')}</Label>
            <Select
              value={formData.stopMode || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('stopMode', e.target.value)}
            >
              <option value="PRICE">{t('priceStop')}</option>
              <option value="ATR">{t('atrStop')}</option>
            </Select>
          </div>

          {formData.stopMode === 'PRICE' && (
            <div>
              <Label>{t('stopPrice')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.stopPrice || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('stopPrice', e.target.value)}
                placeholder={t('enterStopPrice')}
                className={formErrors.stopPrice ? 'border-red-500' : ''}
              />
              {formErrors.stopPrice && (
                <p className="text-sm text-red-500 mt-1">{formErrors.stopPrice}</p>
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
                    min="1"
                    max="50"
                    value={formData.atrPeriod || 14}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('atrPeriod', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>{t('atrTimeframe')}</Label>
                  <Select
                    value={formData.atrTimeframe || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('atrTimeframe', e.target.value)}
                  >
                    {supportedIntervals.map((interval: string) => (
                      <option key={interval} value={interval}>{interval}</option>
                    ))}
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>{t('atrMultiplier')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.atrMultiplier || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('atrMultiplier', e.target.value)}
                  placeholder="2.0"
                  className={formErrors.atrMultiplier ? 'border-red-500' : ''}
                />
                {formErrors.atrMultiplier && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.atrMultiplier}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchATR}
                  disabled={isFetchingATR}
                  className="flex-1"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isFetchingATR ? 'animate-spin' : ''}`} />
                  {t('fetchATRButton')}
                </Button>
                {currentATR && (
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {parseFloat(currentATR).toFixed(4)}
                  </span>
                )}
              </div>
              
              {atrError && (
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {atrError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Take Profit Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useTakeProfit"
              checked={formData.useTakeProfit || false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('useTakeProfit', e.target.checked)}
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('takeProfitMode', e.target.value)}
                >
                  <option value="PRICE">{t('priceTakeProfit')}</option>
                  <option value="ATR">{t('atrTakeProfit')}</option>
                  <option value="MA">{t('maTakeProfit')}</option>
                  <option value="EMA">{t('emaTakeProfit')}</option>
                </Select>
              </div>

              {formData.takeProfitMode === 'PRICE' && (
                <div>
                  <Label>{t('takeProfitPrice')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.takeProfitPrice || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('takeProfitPrice', e.target.value)}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('takeProfitATRMultiplier', e.target.value)}
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

              {(formData.takeProfitMode === 'MA' || formData.takeProfitMode === 'EMA') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>{t('takeProfitMAPeriod')}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="200"
                        value={formData.takeProfitMAPeriod || 20}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('takeProfitMAPeriod', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('takeProfitMATimeframe')}</Label>
                      <Select
                        value={formData.takeProfitMATimeframe || '1h'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('takeProfitMATimeframe', e.target.value)}
                      >
                        {supportedIntervals.map((interval: string) => (
                          <option key={interval} value={interval}>{interval}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.takeProfitMode === 'MA' 
                      ? t('movingAverageExplanation')
                      : t('emaExplanation')
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Risk Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('riskSettings')}</h3>
          
          <div>
            <Label>{t('riskMode')}</Label>
            <Select
              value={formData.riskMode || 'FIXED_USDT'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('riskMode', e.target.value)}
            >
              <option value="FIXED_USDT">{t('fixedUSDTAmount')}</option>
              <option value="ACCOUNT_PERCENT">{t('accountPercentage')}</option>
            </Select>
          </div>

          {formData.riskMode === 'FIXED_USDT' ? (
            <div>
              <Label>{t('riskAmountUSDT')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.riskAmount || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('riskAmount', e.target.value)}
                placeholder={t('enterRiskAmount')}
                className={formErrors.riskAmount ? 'border-red-500' : ''}
              />
              {formErrors.riskAmount && (
                <p className="text-sm text-red-500 mt-1">{formErrors.riskAmount}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t('accountEquity')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.accountEquity || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('accountEquity', e.target.value)}
                  placeholder={t('totalEquity')}
                  className={formErrors.accountEquity ? 'border-red-500' : ''}
                />
                {formErrors.accountEquity && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.accountEquity}</p>
                )}
              </div>
              <div>
                <Label>{t('riskPercentage')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={formData.riskPercent || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('riskPercent', e.target.value)}
                  placeholder="1.0"
                  className={formErrors.riskPercent ? 'border-red-500' : ''}
                />
                {formErrors.riskPercent && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.riskPercent}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Leverage (for contracts) */}
        {formData.contractMode !== 'SPOT' && (
          <div>
            <Label>{t('leverage')}</Label>
            <Input
              type="number"
              min="1"
              max="200"
              value={formData.leverage || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('leverage', parseInt(e.target.value))}
              placeholder={t('autoSuggestLeverage')}
            />
          </div>
        )}

        {/* Advanced Options */}
        {settings.showAdvancedOptions && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold">{t('advancedOptions')}</h4>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.includeFees || false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('includeFees', e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('includeFees')}</span>
            </label>

            {formData.includeFees && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className="text-xs">{t('openFee')}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.feeOpen || settings.defaultFeeOpen}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('feeOpen', e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('closeFee')}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.feeClose || settings.defaultFeeClose}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('feeClose', e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('slippage')}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.slippage || settings.defaultSlippage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('slippage', e.target.value)
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trailing Exits */}
        <TrailingPanel
          enabled={trailingEnabled}
          config={trailingConfig}
          state={trailingState}
          currentPrice={currentPrice}
          entryPrice={parseFloat(formData.entryPrice || '0')}
          quantity={result?.qtyRounded ? parseFloat(result.qtyRounded) : undefined}
          tickSize={marketMeta?.tickSize ? parseFloat(marketMeta.tickSize) : 0.01}
          fees={formData.includeFees ? {
            open: parseFloat(formData.feeOpen || '0'),
            close: parseFloat(formData.feeClose || '0')
          } : undefined}
          onConfigChange={(config) => {
            updateTrailingConfig({
              ...config,
              side: formData.side || 'LONG',
              roundTick: marketMeta?.tickSize ? parseFloat(marketMeta.tickSize) : 0.01,
            });
          }}
          onEnabledChange={setTrailingEnabled}
          expectedPnL={trailingEnabled && trailingState.stop ? calculateExpectedPnL(
            parseFloat(formData.entryPrice || '0'),
            result?.qtyRounded ? parseFloat(result.qtyRounded) : 0,
            trailingState.stop,
            trailingConfig,
            formData.includeFees ? {
              open: parseFloat(formData.feeOpen || '0'),
              close: parseFloat(formData.feeClose || '0')
            } : undefined
          ) : undefined}
          isInitializing={isInitializingCandles}
        />

        {/* Calculate Button */}
        <Button
          onClick={handleCalculate}
          disabled={isCalculating || !marketMeta}
          className="w-full"
        >
          {isCalculating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {t('calculating')}
            </>
          ) : (
            t('calculatePosition')
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