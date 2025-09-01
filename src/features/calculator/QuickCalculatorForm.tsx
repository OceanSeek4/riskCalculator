import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, ArrowLeft, AlertTriangle, X } from 'lucide-react';
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
  showSettingsPanel?: boolean;
  onToggleSettingsPanel?: () => void;
}

export function QuickCalculatorForm({ onFeeTypeChange, onBackToFull, onStopPriceChange, showSettingsPanel, onToggleSettingsPanel }: QuickCalculatorFormProps) {
  const { t } = useTranslation();
  const { settings, setNotification } = useSettingsStore();
  const { setResult, setIsCalculating, calculationError, setCalculationError, marketDataError } = useCalculatorStore();
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
  
  // Price change tracking for color effects
  const [previousPrice, setPreviousPrice] = useState<string>('');
  const [priceChange, setPriceChange] = useState<'up' | 'down' | 'neutral'>('neutral');

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
          const newPrice = String(currentPrice);
          
          // Track price changes for color effects
          if (marketPrice && marketPrice !== newPrice) {
            setPreviousPrice(marketPrice);
            const prevNum = Number(marketPrice);
            const newNum = Number(newPrice);
            
            if (newNum > prevNum) {
              setPriceChange('up');
            } else if (newNum < prevNum) {
              setPriceChange('down');
            } else {
              setPriceChange('neutral');
            }
            
            // Reset price change effect after 1 second
            setTimeout(() => {
              setPriceChange('neutral');
            }, 1000);
          }
          
          setMarketPrice(newPrice);
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
  }, [settings.defaultExchange, settings.defaultSymbol, settings.defaultContractMode, marketPrice]);

  // Clear price lock when order type changes
  useEffect(() => {
    if (orderType === 'LIMIT') {
      priceLock.unlock();
    }
  }, [orderType]);

  // Clear calculation errors when form inputs change
  useEffect(() => {
    if (calculationError) {
      setCalculationError(null);
    }
  }, [orderType, feeType, entryPrice, stopPrice, calculationError, setCalculationError]);

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

  // Handle price card click - different behavior based on order type
  const handlePriceCardClick = () => {
    if (orderType === 'MARKET') {
      // Market order: toggle price lock
      handleTogglePriceLock();
    } else {
      // Limit order: get current price
      handleGetCurrentPrice();
    }
  };

  // Format price according to market tickSize
  const formatPriceWithTickSize = (price: number): string => {
    if (!marketMeta || !marketMeta.tickSize) {
      return price.toString();
    }
    
    // Calculate decimal places from tickSize
    const tickSize = Number(marketMeta.tickSize);
    const decimalPlaces = tickSize < 1 ? tickSize.toString().split('.')[1]?.length || 0 : 0;
    
    return price.toFixed(decimalPlaces);
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

    // Format price with tickSize precision
    const formattedStopPrice = formatPriceWithTickSize(stopPriceValue);
    setStopPrice(formattedStopPrice);
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
      
      // Format price with tickSize precision
      const formattedStopPrice = formatPriceWithTickSize(Number(stopPriceDecimal.toString()));
      setStopPrice(formattedStopPrice);
      setNotification(t('atrStopSet', { 
        price: formattedStopPrice, 
        multiplier: settings.defaultAtrMultiplier || '2' 
      }), 'success');

    } catch (error: any) {
      const errorMessage = `Failed to calculate ATR stop: ${error.message}`;
      setCalculationError(errorMessage);
      setNotification(errorMessage, 'error');
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
      
      // Format price with tickSize precision
      const formattedStopPrice = formatPriceWithTickSize(Number(stopPriceDecimal.toString()));
      setStopPrice(formattedStopPrice);
      setNotification(t('pipsStopSet', { 
        price: formattedStopPrice, 
        pips: settings.defaultStopPips || '50' 
      }), 'success');

    } catch (error: any) {
      const errorMessage = `Failed to calculate pips stop: ${error.message}`;
      setCalculationError(errorMessage);
      setNotification(errorMessage, 'error');
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
      setCalculationError(null); // Clear previous errors

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
        
        // For ATR mode, we need to fetch ATR value
        if (stopMode === 'ATR') {
          try {
            if (!settings.defaultExchange || !settings.defaultSymbol || !settings.defaultContractMode) {
              throw new Error('Market settings not configured for ATR calculation');
            }
            
            const instType: InstType = settings.defaultContractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
            const atr = await getATRValue(
              settings.defaultExchange as Exchange,
              settings.defaultSymbol,
              settings.defaultAtrTimeframe || '15m',
              settings.defaultAtrPeriod || 14,
              instType
            );
            atrValue = String(atr);
            stopPipsValue = '';
          } catch (error: any) {
            // If ATR fetch fails, fallback to PRICE mode
            console.warn('Failed to fetch ATR, falling back to PRICE mode:', error.message);
            stopMode = 'PRICE';
            atrValue = '';
          }
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
      const errorMessage = error.message || t('calculationFailed');
      setCalculationError(errorMessage);
      setNotification(errorMessage, 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              快速计算
            </div>
            <div className="flex items-center gap-2">
              {/* Settings Panel Toggle Text */}
              {onToggleSettingsPanel && (
                <button
                  onClick={onToggleSettingsPanel}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 font-medium"
                >
                  {showSettingsPanel ? '隐藏设置参数' : '显示设置参数'}
                </button>
              )}
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
            </div>
          </div>
          
          {/* Quick Mode Description */}
          <div className="text-sm text-muted-foreground font-normal">
            简化界面，4个核心字段 - 其余参数来自设置页
          </div>
        </CardTitle>
      </CardHeader>
      
      {/* Error Messages Display */}
      {(calculationError || marketDataError) && (
        <div className="px-6 pb-4">
          {calculationError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{t('calculationError')}</p>
                <p className="text-xs text-destructive/80">{calculationError}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalculationError(null)}
                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/20"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          {marketDataError && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/30 rounded-md">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">{t('marketDataError')}</p>
                <p className="text-xs text-orange-700 dark:text-orange-400">{marketDataError}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); handleCalculate(); }} className="space-y-4">
          {/* Real-time Price Card */}
          <div 
            className={`p-4 rounded-lg border transition-all duration-300 ${
              (orderType === 'MARKET' && !marketPrice) || (orderType === 'LIMIT' && (isFetchingPrice || !marketPrice))
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            } ${
              // Price change color effects override normal colors
              priceChange === 'up' 
                ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-green-300 dark:border-green-700'
                : priceChange === 'down'
                ? 'bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-red-300 dark:border-red-700'
                : // Normal order type colors when no price change
                  orderType === 'MARKET' 
                  ? priceLock.isLocked 
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/30 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-950/50 dark:hover:to-orange-950/50'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-950/50 dark:hover:to-indigo-950/50'
                  : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/50 dark:border-green-800/30 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-950/50 dark:hover:to-emerald-950/50'
            }`}
            onClick={() => {
              const isDisabled = (orderType === 'MARKET' && !marketPrice) || (orderType === 'LIMIT' && (isFetchingPrice || !marketPrice));
              if (!isDisabled) {
                handlePriceCardClick();
              }
            }}
          >
            {/* First Row: Market Info and Time */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{settings.defaultExchange || 'BINANCE'}</span>
                <span>•</span>
                <span>{settings.defaultSymbol || 'BTCUSDT'}</span>
                <span>•</span>
                <span>{settings.defaultContractMode === 'SPOT' ? '现货' : settings.defaultContractMode === 'USDT_PERP' ? 'USDT永续' : '反向永续'}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleTimeString('zh-CN', { 
                  hour12: false, 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </div>
            </div>
            
            {/* Second Row: Price Centered */}
            <div className="text-center">
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                // Price change colors override normal colors
                priceChange === 'up' 
                  ? 'text-green-700 dark:text-green-300'
                  : priceChange === 'down'
                  ? 'text-red-700 dark:text-red-300'
                  : // Normal order type colors when no price change
                    orderType === 'MARKET' 
                    ? priceLock.isLocked 
                      ? 'text-amber-900 dark:text-amber-100'
                      : 'text-blue-900 dark:text-blue-100'
                    : 'text-green-900 dark:text-green-100'
              }`}>
                {priceLock.isLocked && orderType === 'MARKET' ? (
                  <span>
                    {priceLock.lockedEntryPrice}
                  </span>
                ) : (
                  <span className={isFetchingPrice ? 'opacity-50' : ''}>
                    {marketPrice || '--'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Hint - No Border */}
            <div className="mt-3 text-center">
              <div className={`text-xs font-medium ${
                orderType === 'MARKET' 
                  ? priceLock.isLocked 
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-blue-700 dark:text-blue-300'
                  : 'text-green-700 dark:text-green-300'
              }`}>
                {orderType === 'MARKET' ? (
                  priceLock.isLocked ? (
                    <>
                      <span className="inline-block mr-1">🔒</span>
点击解锁价格
                    </>
                  ) : (
                    <>
                      <span className="inline-block mr-1">📍</span>
点击锁定价格
                    </>
                  )
                ) : (
                  <>
                    <span className="inline-block mr-1">🔄</span>
点击获取当前价格
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Order Type - Toggle Cards */}
          <div className="space-y-2">
            <Label>{t('orderType')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {/* Limit Order Card */}
              <div
                onClick={() => setOrderType('LIMIT')}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  orderType === 'LIMIT'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <div className="text-center">
                  <div className={`text-sm font-medium ${
                    orderType === 'LIMIT' ? 'text-primary' : 'text-foreground'
                  }`}>
                    {t('limitOrder')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    限价挂单
                  </div>
                </div>
              </div>

              {/* Market Order Card */}
              <div
                onClick={() => setOrderType('MARKET')}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  orderType === 'MARKET'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <div className="text-center">
                  <div className={`text-sm font-medium ${
                    orderType === 'MARKET' ? 'text-primary' : 'text-foreground'
                  }`}>
                    {t('marketOrder')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    市价即时
                  </div>
                </div>
              </div>
            </div>
            
            {/* Market Order Fee Notice */}
            {orderType === 'MARKET' && (
              <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-md">
                <p className="text-xs font-medium text-orange-800 dark:text-orange-300">
市价手续费率：{t('feeTypeAllTaker')}
                </p>
              </div>
            )}
          </div>

          {/* Fee Type - Only show for LIMIT orders */}
          {orderType === 'LIMIT' && (
            <div className="space-y-2">
              <Label>{t('feeType')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {/* All Maker */}
                <div
                  onClick={() => handleFeeTypeChange('MAKER')}
                  className={`p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    feeType === 'MAKER'
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-xs font-medium ${
                      feeType === 'MAKER' ? 'text-primary' : 'text-foreground'
                    }`}>
                      {t('feeTypeAllMaker')}
                    </div>
                  </div>
                </div>

                {/* All Taker */}
                <div
                  onClick={() => handleFeeTypeChange('TAKER')}
                  className={`p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    feeType === 'TAKER'
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-xs font-medium ${
                      feeType === 'TAKER' ? 'text-primary' : 'text-foreground'
                    }`}>
                      {t('feeTypeAllTaker')}
                    </div>
                  </div>
                </div>

                {/* Maker Open Taker Close */}
                <div
                  onClick={() => handleFeeTypeChange('MAKER_OPEN_TAKER_CLOSE')}
                  className={`p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    feeType === 'MAKER_OPEN_TAKER_CLOSE'
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-xs font-medium ${
                      feeType === 'MAKER_OPEN_TAKER_CLOSE' ? 'text-primary' : 'text-foreground'
                    }`}>
                      开仓Maker止损Taker
                    </div>
                  </div>
                </div>

                {/* Maker Open Only */}
                <div
                  onClick={() => handleFeeTypeChange('MAKER_OPEN_ONLY')}
                  className={`p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    feeType === 'MAKER_OPEN_ONLY'
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-xs font-medium ${
                      feeType === 'MAKER_OPEN_ONLY' ? 'text-primary' : 'text-foreground'
                    }`}>
                      仅开仓Maker
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Entry Price */}
          <div className="space-y-2">
            <Label>{t('entryPrice')}</Label>
            {orderType === 'LIMIT' ? (
              <Input
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder={t('enterLimitPrice')}
                type="number"
                step="any"
              />
            ) : (
              <div className="p-2 bg-muted/30 rounded-md text-sm text-muted-foreground text-center">
市价单将使用当前价格
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