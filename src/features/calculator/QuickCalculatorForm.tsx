import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, RefreshCw, Lock, Unlock, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';
import { usePriceLock } from './hooks/usePriceLock';
import { getEffectiveEntryPrice } from './lib/price';
import { calculatePosition } from '@/lib/core';
import { getCurrentPrice, getMarketMeta, getATRValue } from '@/lib/market-service';
import { calculateATRStopPrice, calculatePipsStopPrice } from '@/lib/core';
import { SafeDecimal } from '@/lib/core';
import type { Exchange, InstType } from '@/lib/adapters';
import type { StopMode } from '@/lib/core/types';

interface QuickCalculatorFormProps {
  onFeeTypeChange?: (feeType: 'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY') => void;
  onBackToFull?: () => void;
  onStopPriceChange?: (hasInput: boolean) => void;
}

export function QuickCalculatorForm({ onFeeTypeChange, onBackToFull, onStopPriceChange }: QuickCalculatorFormProps) {
  const { t } = useTranslation();
  const { settings, setNotification } = useSettingsStore();
  const { setResult, setIsCalculating } = useCalculatorStore();
  const priceLock = usePriceLock();

  // Form state - only 4 editable fields
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>(settings.defaultOrderType || 'LIMIT');
  const [feeType, setFeeType] = useState<'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY'>(
    settings.defaultFeeType || 'MAKER_OPEN_TAKER_CLOSE'
  );

  // Handle fee type change with callback to parent
  const handleFeeTypeChange = (newFeeType: 'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY') => {
    setFeeType(newFeeType);
    onFeeTypeChange?.(newFeeType);
  };

  // Get effective fee type (TAKER for MARKET orders, user selection for LIMIT)
  const getEffectiveFeeType = () => {
    return orderType === 'MARKET' ? 'TAKER' : feeType;
  };

  const [entryPrice, setEntryPrice] = useState<string>(''); // For LIMIT orders only
  const [stopPrice, setStopPrice] = useState<string>('');

  // Initialize parent with current fee type
  useEffect(() => {
    onFeeTypeChange?.(getEffectiveFeeType());
  }, []);

  // Notify parent about stop price input status
  useEffect(() => {
    const hasInput = !!(stopPrice && stopPrice.trim() !== '');
    onStopPriceChange?.(hasInput);
  }, [stopPrice, onStopPriceChange]);

  // Update effective fee type when order type changes
  useEffect(() => {
    onFeeTypeChange?.(getEffectiveFeeType());
  }, [orderType, feeType]);

  // Market reference price state
  const [marketPrice, setMarketPrice] = useState<string>('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [marketMeta, setMarketMeta] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch market metadata when settings change
  useEffect(() => {
    const fetchMarketMeta = async () => {
      if (settings.defaultExchange && settings.defaultSymbol && settings.defaultContractMode) {
        try {
          const instType: InstType = settings.defaultContractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const meta = await getMarketMeta(settings.defaultExchange as Exchange, settings.defaultSymbol, instType);
          setMarketMeta(meta);
        } catch (error) {
          console.error('Failed to fetch market meta:', error);
          setMarketMeta(null);
        }
      }
    };

    fetchMarketMeta();
  }, [settings.defaultExchange, settings.defaultSymbol, settings.defaultContractMode]);

  // Fetch current market price for display and reference
  useEffect(() => {
    const fetchPrice = async () => {
      if (settings.defaultExchange && settings.defaultSymbol && settings.defaultContractMode) {
        try {
          setIsFetchingPrice(true);
          const instType: InstType = settings.defaultContractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const currentPrice = await getCurrentPrice(settings.defaultExchange as Exchange, settings.defaultSymbol, instType);
          setMarketPrice(String(currentPrice));
        } catch (error) {
          console.error('Failed to fetch current price:', error);
        } finally {
          setIsFetchingPrice(false);
        }
      }
    };

    fetchPrice();
    // Set up interval for real-time updates (every 5 seconds)
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [settings.defaultExchange, settings.defaultSymbol, settings.defaultContractMode]);

  // Clear price lock when order type changes
  useEffect(() => {
    if (orderType === 'LIMIT') {
      priceLock.unlock();
    }
  }, [orderType]);

  // Handle "Get Current Price" button for LIMIT orders
  const handleGetCurrentPrice = async () => {
    if (marketPrice) {
      setEntryPrice(marketPrice);
      setNotification(t('currentPriceFilled'), 'success');
    }
  };

  // Handle manual price lock/unlock for MARKET orders
  const handleTogglePriceLock = () => {
    if (priceLock.isLocked) {
      priceLock.unlock();
      setNotification(t('priceUnlocked'), 'info');
    } else if (marketPrice) {
      priceLock.lock(Number(marketPrice));
      setNotification(t('priceLocked'), 'success');
    }
  };

  // Get current entry price for stop distance calculation
  const getCurrentEntryPrice = (): number | null => {
    if (orderType === 'LIMIT') {
      return entryPrice ? Number(entryPrice) : null;
    } else {
      return priceLock.lockedEntryPrice || (marketPrice ? Number(marketPrice) : null);
    }
  };

  // Handle quick stop distance buttons
  const handleQuickStopDistance = (percentage: number) => {
    const currentEntry = getCurrentEntryPrice();
    if (!currentEntry) {
      setNotification(t('entryPriceRequiredForStopDistance'), 'error');
      return;
    }

    // Calculate stop price based on percentage distance
    // For LONG: stop = entry * (1 - percentage/100)
    // For SHORT: stop = entry * (1 + percentage/100)
    // Default to LONG since settings doesn't have defaultSide
    const side = 'LONG';
    let stopPriceValue: number;
    
    if (side === 'LONG') {
      stopPriceValue = currentEntry * (1 - percentage / 100);
    } else {
      stopPriceValue = currentEntry * (1 + percentage / 100);
    }

    setStopPrice(stopPriceValue.toString());
    setNotification(t('stopDistanceSet', { percentage, side: t(side.toLowerCase()) }), 'success');
  };

  // Handle ATR-based stop loss
  const handleATRStop = async () => {
    const currentEntry = getCurrentEntryPrice();
    if (!currentEntry) {
      setNotification(t('entryPriceRequiredForStopDistance'), 'error');
      return;
    }

    if (!settings.defaultExchange || !settings.defaultSymbol || !settings.defaultContractMode) {
      setNotification('Market settings not configured', 'error');
      return;
    }

    try {
      const instType: InstType = settings.defaultContractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      const atr = await getATRValue(
        settings.defaultExchange as Exchange,
        settings.defaultSymbol,
        settings.defaultAtrTimeframe || '15m',
        settings.defaultAtrPeriod || 14,
        instType
      );

      const entryPriceDecimal = SafeDecimal.from(currentEntry);
      const atrDecimal = SafeDecimal.from(atr);
      const multiplierDecimal = SafeDecimal.from(settings.defaultAtrMultiplier || '2');
      
      const side = 'LONG'; // Default to LONG
      const stopPriceDecimal = calculateATRStopPrice(entryPriceDecimal, atrDecimal, multiplierDecimal, side);
      
      setStopPrice(stopPriceDecimal.toString());
      setNotification(t('atrStopSet', { 
        price: stopPriceDecimal.toString(), 
        multiplier: settings.defaultAtrMultiplier || '2' 
      }), 'success');

    } catch (error: any) {
      setNotification(`Failed to calculate ATR stop: ${error.message}`, 'error');
    }
  };

  // Handle pips-based stop loss
  const handlePipsStop = () => {
    const currentEntry = getCurrentEntryPrice();
    if (!currentEntry || !marketMeta) {
      setNotification(t('entryPriceRequiredForStopDistance'), 'error');
      return;
    }

    try {
      const entryPriceDecimal = SafeDecimal.from(currentEntry);
      const pipsDecimal = SafeDecimal.from(settings.defaultStopPips || '50');
      const tickSizeDecimal = SafeDecimal.from(marketMeta.tickSize || '0.01');
      
      const side = 'LONG'; // Default to LONG
      const stopPriceDecimal = calculatePipsStopPrice(entryPriceDecimal, pipsDecimal, tickSizeDecimal, side);
      
      setStopPrice(stopPriceDecimal.toString());
      setNotification(t('pipsStopSet', { 
        price: stopPriceDecimal.toString(), 
        pips: settings.defaultStopPips || '50' 
      }), 'success');

    } catch (error: any) {
      setNotification(`Failed to calculate pips stop: ${error.message}`, 'error');
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Stop price is now optional - only validate if provided
    if (stopPrice && (isNaN(Number(stopPrice)) || Number(stopPrice) <= 0)) {
      errors.stopPrice = t('stopPriceInvalid');
    }

    if (orderType === 'LIMIT') {
      if (!entryPrice || isNaN(Number(entryPrice)) || Number(entryPrice) <= 0) {
        errors.entryPrice = t('entryPriceRequired');
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Main calculation handler
  const handleCalculate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsCalculating(true);

      // For MARKET orders, lock current price before calculation
      if (orderType === 'MARKET' && marketPrice) {
        priceLock.lock(Number(marketPrice));
      }

      // Get effective entry price using the same logic as full calculator
      const effectiveEntryPrice = getEffectiveEntryPrice({
        orderType: orderType,
        limitPrice: entryPrice ? Number(entryPrice) : null,
        marketRefPrice: marketPrice ? Number(marketPrice) : null,
        lockedEntryPrice: priceLock.lockedEntryPrice,
      });

      // Determine stop mode based on input
      let stopMode: StopMode;
      let stopPriceValue: string;
      let atrValue: string = '';
      let stopPipsValue: string = '';
      
      if (stopPrice && stopPrice.trim() !== '') {
        // If stop price is provided, use PRICE mode
        stopMode = 'PRICE';
        stopPriceValue = stopPrice;
      } else {
        // If no stop price, use settings default mode
        stopMode = (settings.defaultStopMode as StopMode) || 'PRICE';
        stopPriceValue = '';
        
        // For ATR mode, we need to set default values
        if (stopMode === 'ATR') {
          stopPipsValue = '';
        } else if (stopMode === 'PIPS') {
          stopPipsValue = settings.defaultStopPips || '50';
        }
      }

      // Build calculation parameters from settings + form data
      const calcParams = {
        side: 'LONG' as const, // Default to LONG since settings doesn't have defaultSide
        entryPrice: String(effectiveEntryPrice),
        stopPrice: stopPriceValue,
        stopMode: stopMode,
        atr: atrValue,
        atrMultiplier: String(settings.defaultAtrMultiplier || 2),
        stopPips: stopPipsValue,
        
        // Take profit from settings
        useTakeProfit: settings.defaultUseTakeProfit || false,
        takeProfitMode: settings.defaultTakeProfitMode || 'RR_RATIO',
        takeProfitPrice: '',
        takeProfitATRMultiplier: String(settings.defaultTakeProfitATRMultiplier || 3),
        takeProfitRRRatio: String(settings.defaultTakeProfitRRRatio || 2),
        takeProfitPips: '',
        
        // Risk from settings
        riskMode: settings.defaultRiskMode || 'FIXED_USDT',
        riskUSDT: settings.defaultRiskAmount || '100',
        accountEquity: settings.defaultAccountEquity || '10000',
        riskPercent: settings.defaultRiskPercent || '1',
        
        // Fees and costs
        includeFees: true,
        feeOpenMaker: settings.defaultFeeOpenMaker || '0.0002',
        feeOpenTaker: settings.defaultFeeOpenTaker || '0.0006',
        feeCloseMaker: settings.defaultFeeCloseMaker || '0.0002',
        feeCloseTaker: settings.defaultFeeCloseTaker || '0.0006',
        slippageOpen: settings.defaultSlippageOpen || '0.0005',
        slippageClose: settings.defaultSlippageClose || '0.0005',
        
        // Rebate
        enableRebate: settings.defaultEnableRebate || false,
        rebatePercent: settings.defaultEnableRebate ? (
          settings.defaultExchange === 'BINANCE' ? settings.defaultRebateBinance :
          settings.defaultExchange === 'BYBIT' ? settings.defaultRebateBybit :
          settings.defaultExchange === 'BITGET' ? settings.defaultRebateBitget :
          settings.defaultRebateOkx
        ) : '0',
        
        // Backward compatibility
        feeOpen: settings.defaultFeeOpen || '0.0004',
        feeClose: settings.defaultFeeClose || '0.0004',
        slippage: settings.defaultSlippage || '0.0005',
        
        leverage: settings.defaultLeverage || 10,
        contractMode: settings.defaultContractMode || 'USDT_PERP',
        marketMeta: marketMeta,
        orderType: orderType,
        feeType: getEffectiveFeeType(),
        rrRatios: settings.rrRatios || [1, 1.5, 2],
      };

      const result = calculatePosition(calcParams);
      setResult(result);
      setNotification(t('calculationComplete'), 'success');

    } catch (error: any) {
      setNotification(error.message || t('calculationFailed'), 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {t('quickCalculator')}
          </div>
          {onBackToFull && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBackToFull}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToFullCalculator')}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); handleCalculate(); }} className="space-y-4">
          {/* Order Type */}
          <div className="space-y-2">
            <Label>{t('orderType')}</Label>
            <select 
              value={orderType} 
              onChange={(e) => setOrderType(e.target.value as 'MARKET' | 'LIMIT')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="LIMIT">{t('limitOrder')}</option>
              <option value="MARKET">{t('marketOrder')}</option>
            </select>
            
            {/* Market Order Fee Notice */}
            {orderType === 'MARKET' && (
              <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-md">
                <p className="text-xs font-medium text-orange-800 dark:text-orange-300">
                  {t('marketOrderAutoTaker')}
                </p>
              </div>
            )}
          </div>

          {/* Fee Type - Only show for LIMIT orders */}
          {orderType === 'LIMIT' && (
            <div className="space-y-2">
              <Label>{t('feeType')}</Label>
              <select 
                value={feeType} 
                onChange={(e) => handleFeeTypeChange(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="MAKER">{t('feeTypeAllMaker')}</option>
                <option value="TAKER">{t('feeTypeAllTaker')}</option>
                <option value="MAKER_OPEN_TAKER_CLOSE">{t('feeTypeMakerOpenTakerClose')}</option>
                <option value="MAKER_OPEN_ONLY">{t('feeTypeMakerOpenOnly')}</option>
              </select>
            </div>
          )}

          {/* Entry Price */}
          <div className="space-y-2">
            <Label>{t('entryPrice')}</Label>
            {orderType === 'LIMIT' ? (
              <div className="flex gap-2">
                <Input
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder={t('enterLimitPrice')}
                  type="number"
                  step="any"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentPrice}
                  disabled={isFetchingPrice || !marketPrice}
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingPrice ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {priceLock.isLocked ? (
                        <span className="text-blue-600">{t('lockedPrice')}: {priceLock.lockedEntryPrice}</span>
                      ) : (
                        <span className="text-muted-foreground">{t('marketPrice')}: {marketPrice || '--'}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {priceLock.isLocked ? t('clickUnlockToResumeUpdates') : t('clickLockToFixPrice')}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={priceLock.isLocked ? "destructive" : "outline"}
                    size="sm"
                    onClick={handleTogglePriceLock}
                    disabled={!marketPrice}
                  >
                    {priceLock.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
            {formErrors.entryPrice && (
              <p className="text-sm text-destructive">{formErrors.entryPrice}</p>
            )}
          </div>

          {/* Stop Price */}
          <div className="space-y-2">
            <Label>{t('stopPriceOptional')}</Label>
            <Input
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder={t('enterStopPrice')}
              type="number"
              step="any"
            />
            <p className="text-xs text-muted-foreground">{t('stopPriceOptionalHelp')}</p>
            
            {/* Quick Stop Distance Buttons */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('quickStopDistance')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {[0.5, 1.0, 1.5, 2.0].map((percentage) => (
                  <Button
                    key={percentage}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickStopDistance(percentage)}
                    disabled={!getCurrentEntryPrice()}
                    className="text-xs h-8"
                  >
                    {percentage}%
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('quickStopDistanceHelp')}</p>
            </div>
            
            {/* ATR and Pips Quick Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleATRStop}
                  disabled={!getCurrentEntryPrice() || !marketMeta}
                  className="text-xs h-8"
                  title={t('quickATRStopHelp')}
                >
                  {t('quickATRStop')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handlePipsStop}
                  disabled={!getCurrentEntryPrice() || !marketMeta}
                  className="text-xs h-8"
                  title={t('quickPipsStopHelp')}
                >
                  {t('quickPipsStop')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ATR: {settings.defaultAtrMultiplier || '2'}x ({settings.defaultAtrPeriod || 14}, {settings.defaultAtrTimeframe || '15m'}) | 
                {t('stopPips')}: {settings.defaultStopPips || '50'}
              </p>
            </div>
            
            {formErrors.stopPrice && (
              <p className="text-sm text-destructive">{formErrors.stopPrice}</p>
            )}
          </div>

          {/* Calculate Button */}
          <Button type="submit" className="w-full" disabled={!marketMeta}>
            <Calculator className="w-4 h-4 mr-2" />
            {t('calculate')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}