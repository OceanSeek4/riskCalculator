import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ComboInput } from '@/components/ui/combo-input';
import { RefreshCw, AlertCircle, Bookmark, Calculator, WifiOff } from 'lucide-react';
import { useCalculatorStore, useSettingsStore, usePresetStore } from '@/lib/store';
import { calculatePosition } from '@/lib/core';
import { validateNumberString, validateStopPrice, type CalculatorFormData } from '@/lib/validation';
import { getCurrentPrice, getATRValue, getMAValue, formatPrice, checkSymbolSupport, getSupportedTimeframes, getMarketMeta } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';
import { TrailingPanel } from './TrailingPanelWrapper';
import { calculateExpectedPnL, updateOnClose, type TrailingState } from '@/lib/core/trailing';
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
    currentMA,
    setCurrentMA,
    isCalculating,
    setIsCalculating,
    isFetchingATR,
    setIsFetchingATR,
    isFetchingMA,
    setIsFetchingMA,
    calculationError,
    setCalculationError,
    atrError,
    setATRError,
    maError,
    setMAError,
    // Trailing exits
    trailingEnabled,
    setTrailingEnabled,
    trailingConfig,
    updateTrailingConfig,
    trailingState,
    setTrailingState,
    // 步骤4.3：持久化方法（追加）
    hydrate,
    saveTrailing,
    saveTrailingState,
    loadTrailingState,
  } = useCalculatorStore();

  const { settings, isOfflineMode } = useSettingsStore();
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
  const [realTimePrice, setRealTimePrice] = useState<string>('');
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [priceTimer, setPriceTimer] = useState<NodeJS.Timeout | null>(null);
  const [priceChange, setPriceChange] = useState<'up' | 'down' | 'same' | null>(null);
  
  // For PIPS mode - store locked prices during calculation
  const [lockedPipsStopPrice, setLockedPipsStopPrice] = useState<string | null>(null);
  const [lockedPipsTakeProfitPrice, setLockedPipsTakeProfitPrice] = useState<string | null>(null);
  const [lockedEntryPriceForPips, setLockedEntryPriceForPips] = useState<string | null>(null);
  
  // Reset price change indicator after 2 seconds
  useEffect(() => {
    if (priceChange) {
      const timeout = setTimeout(() => {
        setPriceChange(null);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [priceChange]);

  // Sync calculator with settings on component mount and settings changes
  useEffect(() => {
    syncWithSettings(settings);
    // The syncWithSettings now handles trailing config from settings,
    // but we still need to update the side when it changes
    if (formData.side) {
      updateTrailingConfig({ side: formData.side });
    }
  }, [settings, syncWithSettings, formData.side, updateTrailingConfig]);

  // Auto-switch modes based on online/offline state using settings defaults
  useEffect(() => {
    if (isOfflineMode) {
      // 切换到离线模式：完全按照设置保存中的离线模式配置进行切换
      setFormData(currentData => {
        const updates: Partial<CalculatorFormData> = {};
        
        // 1. 订单类型：强制切换到离线设置中的订单类型
        if (currentData.orderType !== settings.offlineOrderType) {
          updates.orderType = settings.offlineOrderType;
        }
        
        // 2. 入场价格：对于离线模式，始终使用设置中的默认价格
        if (settings.offlineOrderType === 'LIMIT') {
          updates.entryPrice = settings.offlineDefaultEntryPrice || '100000';
        } else if (settings.offlineOrderType === 'MARKET') {
          updates.entryPrice = settings.offlineDefaultEntryPrice || '100000';
        }
        
        // 3. 止损模式：切换到离线止损模式
        if (currentData.stopMode !== settings.offlineStopMode) {
          updates.stopMode = settings.offlineStopMode;
        }
        
        // 4. 止盈模式：切换到离线止盈模式
        if (currentData.takeProfitMode !== settings.offlineTakeProfitMode) {
          updates.takeProfitMode = settings.offlineTakeProfitMode;
        }
        
        // 5. 止盈开关：如果离线止盈模式是RR_RATIO，确保启用止盈
        if (settings.offlineTakeProfitMode === 'RR_RATIO' && !currentData.useTakeProfit) {
          updates.useTakeProfit = true;
        }
        
        // 如果有更新，返回新的数据，否则返回原数据
        return Object.keys(updates).length > 0 ? { ...currentData, ...updates } : currentData;
      });
      
      // 6. 移动止损：按照离线设置处理
      if (trailingEnabled !== settings.offlineTrailingEnabled) {
        setTrailingEnabled(settings.offlineTrailingEnabled);
      }
      
    } else {
      // 切换到在线模式：智能恢复，避免强制覆盖用户选择
      // 在线模式下不强制修改任何设置，让用户自己选择
      
      // 唯一的例外：移动止损恢复到用户设置偏好
      if (trailingEnabled !== settings.defaultTrailingEnabled) {
        setTrailingEnabled(settings.defaultTrailingEnabled);
      }
    }
  }, [isOfflineMode, settings.offlineOrderType, settings.offlineDefaultEntryPrice, settings.offlineStopMode, settings.offlineTakeProfitMode, settings.offlineTrailingEnabled, settings.defaultTrailingEnabled, trailingEnabled]);

  // 额外的安全检查：确保离线模式下始终有价格设定
  // 这个useEffect作为后备机制，确保即使主要的切换逻辑遗漏，价格也会被正确设置
  useEffect(() => {
    if (isOfflineMode && (!formData.entryPrice || formData.entryPrice === '0' || formData.entryPrice === '')) {
      handleInputChange('entryPrice', settings.offlineDefaultEntryPrice || '100000');
    }
  }, [isOfflineMode, formData.entryPrice, settings.offlineDefaultEntryPrice]);

  // 步骤4.3：初始化时水合持久化数据（追加）
  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
        if (!String(error).includes('invoke')) {
          console.error('Failed to fetch market data:', error);
        }
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

  // Auto-fetch price for market orders when exchange/symbol changes
  useEffect(() => {
    if (formData.orderType === 'MARKET' && 
        formData.exchange && 
        formData.symbol && 
        formData.contractMode) {
      fetchCurrentPrice();
    }
  }, [formData.exchange, formData.symbol, formData.contractMode, formData.orderType]);

  // Real-time price updates for market orders
  useEffect(() => {
    // Clear existing timer
    if (priceTimer) {
      clearInterval(priceTimer);
      setPriceTimer(null);
    }

    if (formData.orderType === 'MARKET' && 
        formData.exchange && 
        formData.symbol && 
        formData.contractMode) {
      // Initial fetch
      fetchRealTimePrice();
      
      // Set up interval for real-time updates (every 3 seconds)
      const timer = setInterval(() => {
        fetchRealTimePrice();
      }, 3000);
      
      setPriceTimer(timer);
      
      return () => {
        clearInterval(timer);
        setPriceTimer(null);
      };
    }

    return () => {
      if (priceTimer) {
        clearInterval(priceTimer);
        setPriceTimer(null);
      }
    };
  }, [formData.orderType, formData.exchange, formData.symbol, formData.contractMode]);

  // Initialize CandleManager for trailing exits when enabled
  useEffect(() => {
    if (!trailingEnabled || !formData.exchange || !formData.symbol || !marketMeta) {
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
            // 步骤4.3：保存trailing状态（追加）
            if (formData.exchange && formData.symbol) {
              saveTrailingState(formData.exchange, formData.symbol, trailingConfig.tfMs, newState);
            }
          },
          (error) => {
            console.error('CandleManager error:', error);
          }
        );
        
        // Preheat with historical data
        // For daily and higher timeframes, we need more data for proper EMA initialization
        const timeframeMultiplier = trailingConfig.tfMs >= 86400000 ? 3 : 2; // 3x for daily+, 2x for others
        const requiredCandles = Math.max(trailingConfig.maLen, trailingConfig.atrLen) * timeframeMultiplier + 100;
        await newManager.preheatWithRest(requiredCandles);
        
        // Initialize trailing state with current data
        const candles = newManager.getCandles(requiredCandles);
        if (candles.length > 0) {
          let state = { indicators: {} };
          
          // Better initialization for EMA: use SMA as seed
          if (trailingConfig.maType === 'EMA' && candles.length >= trailingConfig.maLen) {
            // Extract all close prices
            const closePrices = candles.map(c => c.c);
            
            // Initialize EMA with SMA seed
            const multiplier = 2 / (trailingConfig.maLen + 1);
            const smaWindow = closePrices.slice(0, trailingConfig.maLen);
            const sma = smaWindow.reduce((sum, price) => sum + price, 0) / trailingConfig.maLen;
            
            state.indicators = {
              ...state.indicators,
              emaMultiplier: multiplier,
              ma: sma
            };
            
            // Process remaining candles
            for (let i = trailingConfig.maLen; i < candles.length; i++) {
              state = updateOnClose(state, candles[i], {
                ...trailingConfig,
                side: formData.side || 'LONG',
                roundTick: marketMeta?.tickSize ? parseFloat(marketMeta.tickSize) : 0.01,
              });
            }
          } else {
            // Process candles sequentially to build up MA indicators (SMA or insufficient data)
            for (const candle of candles) {
              state = updateOnClose(state, candle, {
                ...trailingConfig,
                side: formData.side || 'LONG',
                roundTick: marketMeta?.tickSize ? parseFloat(marketMeta.tickSize) : 0.01,
              });
            }
          }
          
          // Get ATR directly from exchange API
          try {
            const getTimeframeString = (ms: number): string => {
              if (ms === 60000) return '1m';
              if (ms === 300000) return '5m';
              if (ms === 900000) return '15m';
              if (ms === 1800000) return '30m';
              if (ms === 3600000) return '1h';
              if (ms === 14400000) return '4h';
              if (ms === 86400000) return '1d';
              return '1h';
            };
            const atrTimeframe = getTimeframeString(trailingConfig.tfMs);
            
            const atr = await getATRValue(
              formData.exchange as Exchange,
              formData.symbol!,
              atrTimeframe,
              trailingConfig.atrLen,
              instType
            );
            
            // Update state with ATR from exchange
            state = {
              ...state,
              indicators: {
                ...state.indicators,
                atr: atr
              }
            };
          } catch (error) {
            console.error('Failed to fetch ATR for trailing:', error);
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
  }, [trailingEnabled, formData.exchange, formData.symbol, formData.contractMode, trailingConfig.tfMs, trailingConfig.maLen, trailingConfig.atrLen, trailingConfig.strategy, trailingConfig.maType, marketMeta]);

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
        if (!String(error).includes('invoke')) {
          console.error('Failed to fetch current price for trailing:', error);
        }
      }
    };

    fetchPrice();
    
    // Update price every 5 seconds when trailing is enabled
    const interval = setInterval(fetchPrice, 5000);
    
    return () => clearInterval(interval);
  }, [trailingEnabled, formData.exchange, formData.symbol, formData.contractMode]);

  // Update ATR separately every 30 seconds
  useEffect(() => {
    if (!trailingEnabled || !formData.exchange || !formData.symbol) {
      return;
    }

    const updateATR = async () => {
      try {
        const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
        const getTimeframeString = (ms: number): string => {
          if (ms === 60000) return '1m';
          if (ms === 300000) return '5m';
          if (ms === 900000) return '15m';
          if (ms === 1800000) return '30m';
          if (ms === 3600000) return '1h';
          if (ms === 14400000) return '4h';
          if (ms === 86400000) return '1d';
          return '1h';
        };
        const atrTimeframe = getTimeframeString(trailingConfig.tfMs);
        
        const atr = await getATRValue(
          formData.exchange as Exchange,
          formData.symbol!,
          atrTimeframe,
          trailingConfig.atrLen,
          instType
        );
        
        // Update trailing state with new ATR
        const updatedState = {
          ...trailingState,
          indicators: {
            ...trailingState.indicators,
            atr: atr
          }
        };
        setTrailingState(updatedState);
        // 步骤4.3：保存ATR更新后的trailing状态（追加）
        if (formData.exchange && formData.symbol) {
          saveTrailingState(formData.exchange, formData.symbol, trailingConfig.tfMs, updatedState);
        }
      } catch (error) {
        console.error('Failed to update ATR for trailing:', error);
      }
    };

    updateATR();
    
    // Update ATR every 30 seconds
    const interval = setInterval(updateATR, 30000);
    
    return () => clearInterval(interval);
  }, [trailingEnabled, formData.exchange, formData.symbol, formData.contractMode, trailingConfig.tfMs, trailingConfig.atrLen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData({ [field]: value });
    
    // Clear field-specific error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-fetch price for market orders when relevant fields change
    if (formData.orderType === 'MARKET' || (field === 'orderType' && value === 'MARKET')) {
      if (field === 'orderType' || field === 'exchange' || field === 'symbol' || field === 'contractMode') {
        // Use setTimeout to ensure the state update is processed first
        setTimeout(() => {
          const currentFormData = { ...formData, [field]: value };
          if (currentFormData.exchange && currentFormData.symbol && currentFormData.contractMode) {
            fetchCurrentPrice();
          }
        }, 0);
      }
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
    
    // PIPS validation
    if (formData.stopMode === 'PIPS') {
      const pipsError = validateNumberString(formData.stopPips || '', 'Stop pips');
      if (pipsError) errors.stopPips = pipsError;
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
      } else if (formData.takeProfitMode === 'RR_RATIO') {
        const rrRatioError = validateNumberString(formData.takeProfitRRRatio || '', 'Risk/Reward ratio');
        if (rrRatioError) errors.takeProfitRRRatio = rrRatioError;
      } else if (formData.takeProfitMode === 'PIPS') {
        const takeProfitPipsError = validateNumberString(formData.takeProfitPips || '', 'Take profit pips');
        if (takeProfitPipsError) errors.takeProfitPips = takeProfitPipsError;
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
      if (!String(error).includes('invoke')) {
        console.error('Failed to fetch current price:', error);
      }
      setPriceError(error instanceof Error ? error.message : t('failedToFetchPrice'));
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // Helper function to get the effective entry price for calculations
  const getEffectiveEntryPrice = (): string => {
    if (formData.orderType === 'MARKET' && realTimePrice) {
      return realTimePrice;
    }
    return formData.entryPrice || '';
  };

  const fetchRealTimePrice = async () => {
    if (!formData.exchange || !formData.symbol || !formData.contractMode) return;

    try {
      const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      const price = await getCurrentPrice(
        formData.exchange as Exchange,
        formData.symbol,
        instType
      );

      const newPrice = price.toString();
      const oldPrice = parseFloat(realTimePrice || '0');
      const currentPriceNum = parseFloat(newPrice);
      
      // Determine price change direction
      if (oldPrice > 0) {
        if (currentPriceNum > oldPrice) {
          setPriceChange('up');
        } else if (currentPriceNum < oldPrice) {
          setPriceChange('down');
        } else {
          setPriceChange('same');
        }
      } else {
        setPriceChange(null);
      }

      setRealTimePrice(newPrice);
      setLastPriceUpdate(new Date());
      // Only update form data if it's a market order
      if (formData.orderType === 'MARKET') {
        setFormData({ entryPrice: newPrice });
      }
      setPriceError('');
    } catch (error) {
      if (!String(error).includes('invoke')) {
        console.error('Failed to fetch real-time price:', error);
      }
      setPriceError(error instanceof Error ? error.message : t('failedToFetchPrice'));
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
    
    // For market orders, fetch the latest price and lock it for calculation
    let lockedEntryPrice = formData.entryPrice!;
    if (formData.orderType === 'MARKET') {
      try {
        // Fetch the latest real-time price for calculation
        const instType: any = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
        const latestPrice = await getCurrentPrice(
          formData.exchange as any,
          formData.symbol!,
          instType
        );
        lockedEntryPrice = latestPrice.toString();
      } catch (error) {
        // Silently fall back to current displayed price
        lockedEntryPrice = formData.entryPrice!;
      }
    }
    
    // Calculate and store locked PIPS prices if in PIPS modes
    if (formData.stopMode === 'PIPS' || (formData.useTakeProfit && formData.takeProfitMode === 'PIPS')) {
      setLockedEntryPriceForPips(lockedEntryPrice);
      
      if (formData.stopMode === 'PIPS' && formData.stopPips && marketMeta) {
        try {
          const entryPrice = parseFloat(lockedEntryPrice);
          const stopPips = parseFloat(formData.stopPips);
          const tickSize = parseFloat(marketMeta.tickSize);
          
          if (!isNaN(entryPrice) && !isNaN(stopPips) && !isNaN(tickSize)) {
            const pipsDistance = stopPips * tickSize;
            const stopPrice = formData.side === 'LONG' 
              ? entryPrice - pipsDistance 
              : entryPrice + pipsDistance;
            setLockedPipsStopPrice(stopPrice.toFixed(Math.abs(Math.log10(tickSize))));
          }
        } catch (error) {
          console.error('Error calculating locked PIPS stop price:', error);
        }
      }
      
      if (formData.useTakeProfit && formData.takeProfitMode === 'PIPS' && formData.takeProfitPips && marketMeta) {
        try {
          const entryPrice = parseFloat(lockedEntryPrice);
          const takeProfitPips = parseFloat(formData.takeProfitPips);
          const tickSize = parseFloat(marketMeta.tickSize);
          
          if (!isNaN(entryPrice) && !isNaN(takeProfitPips) && !isNaN(tickSize)) {
            const pipsDistance = takeProfitPips * tickSize;
            const takeProfitPrice = formData.side === 'LONG' 
              ? entryPrice + pipsDistance 
              : entryPrice - pipsDistance;
            setLockedPipsTakeProfitPrice(takeProfitPrice.toFixed(Math.abs(Math.log10(tickSize))));
          }
        } catch (error) {
          console.error('Error calculating locked PIPS take profit price:', error);
        }
      }
    } else {
      // Clear locked prices if not in PIPS mode
      setLockedPipsStopPrice(null);
      setLockedPipsTakeProfitPrice(null);
      setLockedEntryPriceForPips(null);
    }

    try {
      const input = {
        side: formData.side!,
        entryPrice: lockedEntryPrice,
        stopPrice: formData.stopMode === 'PRICE' ? formData.stopPrice : undefined,
        atr: formData.stopMode === 'ATR' ? currentATR || undefined : undefined,
        atrMultiplier: formData.stopMode === 'ATR' ? formData.atrMultiplier : undefined,
        stopPips: formData.stopMode === 'PIPS' ? formData.stopPips : undefined,
        stopMode: formData.stopMode!,
        // Take profit settings
        useTakeProfit: formData.useTakeProfit || false,
        takeProfitMode: formData.takeProfitMode,
        takeProfitPrice: formData.takeProfitMode === 'PRICE' ? formData.takeProfitPrice : undefined,
        takeProfitATRMultiplier: formData.takeProfitMode === 'ATR' ? formData.takeProfitATRMultiplier : undefined,
        takeProfitRRRatio: formData.takeProfitMode === 'RR_RATIO' ? formData.takeProfitRRRatio : undefined,
        takeProfitPips: formData.takeProfitMode === 'PIPS' ? formData.takeProfitPips : undefined,
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
      
      // Scroll to top to show calculation results
      setTimeout(() => {
        window.scrollTo({ 
          top: 0, 
          behavior: 'smooth' 
        });
      }, 100);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white">
              <Calculator className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl">{t('calculator')}</CardTitle>
          </div>
          {isOfflineMode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-full text-xs">
              <WifiOff className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-700 dark:text-orange-300 font-medium">
                离线模式
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 防御性渲染：检查必要数据是否就绪 */}
        {(!formData.exchange || !formData.symbol || !formData.contractMode) && !marketMeta && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Calculator className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              数据初始化中... Initializing data...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              请选择交易所、交易对和合约模式，然后获取市场信息
            </p>
          </div>
        )}

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
              <ComboInput
                value={formData.symbol || ''}
                onChange={(value) => handleInputChange('symbol', value)}
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
              disabled={isFetchingMeta || !formData.exchange || !formData.symbol || !formData.contractMode || isOfflineMode}
              className="flex-1"
            >
              {isFetchingMeta ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  {t('fetchingMetadata')}
                </>
              ) : isOfflineMode ? (
                '离线模式不可用'
              ) : (
                t('fetchMetadata')
              )}
            </Button>
            {marketMeta && (
              <div className="text-xs text-muted-foreground px-3 py-2 bg-green-50 rounded border border-green-200 whitespace-nowrap">
                ✓ {t('metadataLoaded')}: {marketMeta.tickSize}/{marketMeta.stepSize}
              </div>
            )}
            {isOfflineMode && (
              <div className="text-xs text-muted-foreground px-3 py-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded whitespace-nowrap">
                <WifiOff className="w-3 h-3 inline mr-1 text-orange-600 dark:text-orange-400" />
                <span className="text-orange-700 dark:text-orange-300">使用默认市场数据</span>
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                if (e.target.value === 'MARKET' && isOfflineMode) {
                  return; // Prevent switching to market order in offline mode
                }
                handleInputChange('orderType', e.target.value);
                
                // Set initial price when switching to LIMIT order in offline mode
                if (e.target.value === 'LIMIT' && isOfflineMode) {
                  if (!formData.entryPrice || formData.entryPrice === '0' || formData.entryPrice === '') {
                    handleInputChange('entryPrice', '100000');
                  }
                }
              }}
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
                    市价单在离线模式下不可用，已自动切换为限价单
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{formData.orderType === 'LIMIT' ? t('limitPrice') : t('entryPrice')}</Label>
              {formData.orderType === 'LIMIT' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchCurrentPrice}
                  disabled={isFetchingPrice || !formData.exchange || !formData.symbol || isOfflineMode}
                  className="h-6 px-2 text-xs"
                >
                  {isFetchingPrice ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      {t('fetchingPrice')}
                    </>
                  ) : isOfflineMode ? (
                    '离线不可用'
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
                      {lastPriceUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              value={formData.entryPrice || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('entryPrice', e.target.value)}
              placeholder={formData.orderType === 'LIMIT' ? t('enterLimitPrice') : t('enterExpectedEntryPrice')}
              className={`${formErrors.entryPrice ? 'border-red-500' : ''} ${
                formData.orderType === 'MARKET' 
                  ? `cursor-not-allowed ${
                      priceChange === 'up' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                      priceChange === 'down' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                      'bg-muted'
                    } transition-colors duration-500`
                  : ''
              }`}
              disabled={formData.orderType === 'MARKET'}
              readOnly={formData.orderType === 'MARKET'}
            />
            {formErrors.entryPrice && (
              <p className="text-sm text-red-500 mt-1">{formErrors.entryPrice}</p>
            )}
            {priceError && (
              <p className="text-sm text-red-500 mt-1">{priceError}</p>
            )}
            {formData.orderType === 'MARKET' && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  📈 {t('marketOrderNote')} - {t('realTimePriceUpdated')}
                </p>
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

        {/* Stop Loss Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('stopLossSettings')}</h3>
          
          <div>
            <Label>{t('stopMode')}</Label>
            <Select
              value={formData.stopMode || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                if (e.target.value === 'ATR' && isOfflineMode) {
                  return; // Prevent switching to ATR mode in offline mode
                }
                handleInputChange('stopMode', e.target.value);
              }}
            >
              <option value="PRICE">{t('priceStop')}</option>
              <option value="ATR" disabled={isOfflineMode}>
                {t('atrStop')} {isOfflineMode && '(离线模式不可用)'}
              </option>
              <option value="PIPS">{t('pipsStop')}</option>
            </Select>
            {isOfflineMode && formData.stopMode === 'ATR' && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-sm">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-orange-700 dark:text-orange-300">
                    ATR 止损在离线模式下不可用，请切换到价格止损或点差止损
                  </span>
                </div>
              </div>
            )}
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
                  disabled={isFetchingATR || isOfflineMode}
                  className="flex-1"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isFetchingATR ? 'animate-spin' : ''}`} />
                  {isOfflineMode ? '离线模式不可用' : t('fetchATRButton')}
                </Button>
                {currentATR && (
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {parseFloat(currentATR).toFixed(4)}
                  </span>
                )}
              </div>
              
              {isOfflineMode && (
                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-orange-700 dark:text-orange-300">
                      ATR 数据获取在离线模式下不可用
                    </span>
                  </div>
                </div>
              )}
              
              {atrError && (
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {atrError}
                </div>
              )}
            </div>
          )}

          {formData.stopMode === 'PIPS' && (
            <div>
              <Label>{t('stopPips')}</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.stopPips || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('stopPips', e.target.value)}
                placeholder="50"
                className={formErrors.stopPips ? 'border-red-500' : ''}
              />
              {formErrors.stopPips && (
                <p className="text-sm text-red-500 mt-1">{formErrors.stopPips}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Enter stop loss distance in pips from entry price
              </p>
              {formData.stopPips && getEffectiveEntryPrice() && marketMeta && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('calculatedStopPrice')}:</span>
                    <span className="font-mono font-medium text-red-600">
                      {(() => {
                        try {
                          const effectiveEntryPrice = getEffectiveEntryPrice();
                          const entryPrice = parseFloat(effectiveEntryPrice);
                          const stopPips = parseFloat(formData.stopPips);
                          const tickSize = parseFloat(marketMeta.tickSize);
                          
                          if (!isNaN(entryPrice) && !isNaN(stopPips) && !isNaN(tickSize)) {
                            const pipsDistance = stopPips * tickSize;
                            const stopPrice = formData.side === 'LONG' 
                              ? entryPrice - pipsDistance 
                              : entryPrice + pipsDistance;
                            return stopPrice.toFixed(Math.abs(Math.log10(tickSize)));
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
                  {lockedPipsStopPrice && lockedEntryPriceForPips && (
                    <div className="text-xs mt-1 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 dark:text-blue-300">🔒 {t('lockedAtCalculation')}:</span>
                        <span className="font-mono font-semibold text-blue-800 dark:text-blue-200">{lockedPipsStopPrice}</span>
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    if (e.target.value === 'ATR' && isOfflineMode) {
                      return; // Prevent switching to ATR mode in offline mode
                    }
                    handleInputChange('takeProfitMode', e.target.value);
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

              {formData.takeProfitMode === 'RR_RATIO' && (
                <div>
                  <Label>{t('takeProfitRRRatio')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.takeProfitRRRatio || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('takeProfitRRRatio', e.target.value)}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('takeProfitPips', e.target.value)}
                    placeholder="100"
                    className={formErrors.takeProfitPips ? 'border-red-500' : ''}
                  />
                  {formErrors.takeProfitPips && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.takeProfitPips}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter take profit distance in pips from entry price
                  </p>
                  {formData.takeProfitPips && getEffectiveEntryPrice() && marketMeta && (
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

        {/* Trailing Stop Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="trailingEnabled"
              checked={trailingEnabled || false}
              disabled={isOfflineMode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (isOfflineMode) return; // Prevent enabling in offline mode
                setTrailingEnabled(e.target.checked);
                // 步骤4.3：保存trailing配置（追加）
                saveTrailing();
              }}
              className={`w-4 h-4 ${isOfflineMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <Label htmlFor="trailingEnabled" className={`text-sm font-semibold text-muted-foreground uppercase tracking-wide ${isOfflineMode ? 'opacity-50' : ''}`}>
              {t('trailingStopSettings')} {isOfflineMode && '(离线模式不可用)'}
            </Label>
          </div>
          
          {isOfflineMode && (
            <div className="p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-sm">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-orange-700 dark:text-orange-300">
                  移动止损需要实时数据支持，在离线模式下不可用
                </span>
              </div>
            </div>
          )}
          
          {trailingEnabled && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>{t('trailingStrategy')}</Label>
                  <Select
                    value={trailingConfig.strategy}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      updateTrailingConfig({ strategy: e.target.value as any });
                      saveTrailing();
                    }}
                  >
                    <option value="MA_CROSS_EXIT">{t('maCrossExit')}</option>
                    <option value="MA_BAND_STOP">{t('maBandStop')}</option>
                    <option value="MA_CHANDELIER">{t('maChandelier')}</option>
                  </Select>
                </div>
                <div>
                  <Label>{t('trailingTimeframe')}</Label>
                  <Select
                    value={trailingConfig.tfMs.toString()}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      updateTrailingConfig({ tfMs: parseInt(e.target.value) });
                      saveTrailing();
                    }}
                  >
                    <option value="60000">1m</option>
                    <option value="300000">5m</option>
                    <option value="900000">15m</option>
                    <option value="1800000">30m</option>
                    <option value="3600000">1h</option>
                    <option value="14400000">4h</option>
                    <option value="86400000">1d</option>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>{t('trailingMAType')}</Label>
                  <Select
                    value={trailingConfig.maType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      updateTrailingConfig({ maType: e.target.value as any });
                      saveTrailing();
                    }}
                  >
                    <option value="EMA">{t('ema')}</option>
                    <option value="SMA">{t('sma')}</option>
                  </Select>
                </div>
                <div>
                  <Label>{t('trailingMAPeriod')}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="200"
                    value={trailingConfig.maLen}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      updateTrailingConfig({ maLen: parseInt(e.target.value) });
                      saveTrailing();
                    }}
                  />
                </div>
              </div>
              
              {(trailingConfig.strategy === 'MA_BAND_STOP' || trailingConfig.strategy === 'MA_CHANDELIER') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>{t('trailingATRPeriod')}</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={trailingConfig.atrLen}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        updateTrailingConfig({ atrLen: parseInt(e.target.value) });
                        saveTrailing();
                      }}
                    />
                  </div>
                  <div>
                    <Label>{t('trailingATRMultiplier')}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={trailingConfig.k || 2}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        updateTrailingConfig({ k: parseFloat(e.target.value) });
                        saveTrailing();
                      }}
                    />
                  </div>
                </div>
              )}
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={trailingConfig.onCloseOnly}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    updateTrailingConfig({ onCloseOnly: e.target.checked });
                    saveTrailing();
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{t('trailingOnCloseOnly')}</span>
              </label>
              
              <p className="text-xs text-muted-foreground">
                {t('trailingExplanation')}
              </p>
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