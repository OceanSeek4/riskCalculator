/**
 * CalculatorForm - Main position size calculator component
 * 
 * Architecture: Modularized form with extracted sections for maintainability
 * - MarketSection: Exchange/symbol selection
 * - EntrySection: Price input and order configuration
 * - StopSection: Stop loss settings (price/ATR)
 * - RiskSection: Risk management inputs
 * - TakeProfitSection: Profit target configuration  
 * - LeverageSection: Contract leverage for perpetuals
 * - ActionButtonsSection: Calculate button and error display
 * 
 * State: Uses Zustand store for form data and calculation results
 * Validation: Real-time validation with user-friendly error messages
 * 
 * Key Features:
 * - Professional fee control with 4 granular strategies
 * - ATR-based stop loss calculation
 * - Real-time price fetching with offline fallback
 * - Comprehensive risk warnings and analysis
 */
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ComboInput } from '@/components/ui/combo-input';
import { RefreshCw, AlertCircle, Bookmark, Calculator, WifiOff, Check, X, Zap } from 'lucide-react';
import { useCalculatorStore, useSettingsStore, usePresetStore } from '@/lib/store';
import { calculatePosition } from '@/lib/core';
import { validateNumberString, validateStopPrice, type CalculatorFormData } from '@/lib/validation';
import { getCurrentPrice, getATRValue, getMAValue, formatPrice, checkSymbolSupport, getSupportedTimeframes, getMarketMeta } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';
import { TrailingPanel } from './TrailingPanelWrapper';
import { calculateExpectedPnL, updateOnClose, type TrailingState } from '@/lib/core/trailing';
import { CandleManager, timeframeToMs } from '@/lib/candles';
import { getEffectiveEntryPrice as getUnifiedEffectiveEntryPrice } from './utils/effectivePrice';
import { getEffectiveEntryPrice as getNewEffectiveEntryPrice } from './lib/price';
import { usePriceLock } from './hooks/usePriceLock';
import { 
  TakeProfitSection, 
  LeverageSection, 
  ActionButtonsSection,
  MarketSection,
  RiskSection,
  StopSection
} from './components/form';
import { EntrySection } from './sections/EntrySection';
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
    // Real-time price state
    realTimePrice,
    setRealTimePrice,
    lastPriceUpdate,
    setLastPriceUpdate,
    priceChange,
    setPriceChange,
    // Price binding mode
    bindModeForEntry,
    setBindModeForEntry,
    lastManualAt,
    setLastManualAt,
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

  // NEW: Market price locking for MARKET orders
  const priceLock = usePriceLock();

  const { 
    settings, 
    isOfflineMode,
    showNotification,
    notificationMessage,
    notificationType,
    setNotification,
    clearNotification
  } = useSettingsStore();
  const { presets, loadPreset } = usePresetStore();
  const { t } = useTranslation();
  

  
  // Auto-clear notification after different durations based on type
  useEffect(() => {
    if (showNotification) {
      const duration = notificationType === 'success' ? 4000 : 
                       notificationType === 'error' ? 5000 : 3000;
      const timer = setTimeout(() => {
        clearNotification();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [showNotification, notificationType, clearNotification]);
  
  const [marketMeta, setMarketMeta] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string>('');
  const [supportedIntervals, setSupportedIntervals] = useState<string[]>([]);
  
  // Quick update state for limit orders
  const [isQuickUpdating, setIsQuickUpdating] = useState(false);
  const [isQuickUpdateClicked, setIsQuickUpdateClicked] = useState(false);
  const [quickUpdateSuccess, setQuickUpdateSuccess] = useState(false);
  
  // 实时价格显示的独立状态（不受锁定影响）
  const [displayPrice, setDisplayPrice] = useState<string>('');
  const [displayPriceChange, setDisplayPriceChange] = useState<'up' | 'down' | 'same' | null>(null);
  const [displayLastUpdate, setDisplayLastUpdate] = useState<Date | null>(null);
  const [displayPriceDiff, setDisplayPriceDiff] = useState<number>(0);
  const [displayPreviousPrice, setDisplayPreviousPrice] = useState<number>(0);
  
  // Candle management for trailing exits
  const [candleManager, setCandleManager] = useState<CandleManager | null>(null);
  const [isInitializingCandles, setIsInitializingCandles] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>(undefined);
  const [priceTimer, setPriceTimer] = useState<NodeJS.Timeout | null>(null);
  
  // For PIPS mode - store locked prices during calculation
  const [lockedPipsStopPrice, setLockedPipsStopPrice] = useState<string | null>(null);
  const [lockedPipsTakeProfitPrice, setLockedPipsTakeProfitPrice] = useState<string | null>(null);
  const [lockedEntryPriceForPips, setLockedEntryPriceForPips] = useState<string | null>(null);

  // Format percentage display by removing trailing zeros
  const formatPercentageDisplay = (decimalValue: string) => {
    const percentage = (parseFloat(decimalValue) * 100).toFixed(3);
    return parseFloat(percentage).toString();
  };

  // Clear price lock when switching exchanges/symbols/order types
  useEffect(() => {
    priceLock.unlock();
  }, [formData.exchange, formData.symbol, formData.contractMode, formData.orderType]);
  
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

    syncWithSettings(settings, isOfflineMode);
    // The syncWithSettings now handles trailing config from settings,
    // but we still need to update the side when it changes
    if (formData.side) {
      updateTrailingConfig({ side: formData.side });
    }
  }, [settings, syncWithSettings, formData.side, updateTrailingConfig, isOfflineMode]);


  // 监听离线模式切换，强制重置订单类型和价格
  const prevOfflineModeRef = useRef(isOfflineMode);
  useEffect(() => {
    const wasOffline = prevOfflineModeRef.current;
    const isNowOffline = isOfflineMode;
    
    // 当切换到离线模式时，强制重置订单类型和价格
    if (!wasOffline && isNowOffline) {
      // 切换到离线模式：强制设置为限价单、默认价格、止损模式和止盈模式
      const updates = {
        orderType: settings.offlineOrderType || 'LIMIT',
        entryPrice: settings.offlineDefaultEntryPrice || '100000',
        stopMode: settings.offlineStopMode || 'PIPS',
        takeProfitMode: settings.offlineTakeProfitMode || 'RR_RATIO',
        trailingEnabled: settings.offlineTrailingEnabled || false
      };
      setFormData(updates);
      
      // 显示切换通知
      setTimeout(() => {
        setNotification('已切换到离线模式，订单类型、价格、止损和止盈模式已重置为离线设置', 'info');
      }, 100);
    }
    // 当切换回在线模式时，恢复在线默认设置
    else if (wasOffline && !isNowOffline) {
      // 切换到在线模式：恢复在线默认订单类型、止损模式和止盈模式
      const updates = {
        orderType: settings.defaultOrderType || 'MARKET',
        stopMode: settings.defaultStopMode || 'ATR',
        takeProfitMode: settings.defaultTakeProfitMode || 'RR_RATIO',
        trailingEnabled: settings.defaultTrailingEnabled || false
      };
      setFormData(updates);
      
      // 显示切换通知
      setTimeout(() => {
        setNotification('已切换到在线模式，订单类型、止损和止盈模式已恢复为在线设置', 'success');
      }, 100);
    }
    
    // 更新ref
    prevOfflineModeRef.current = isNowOffline;
  }, [
    isOfflineMode, 
    settings.offlineOrderType, 
    settings.offlineDefaultEntryPrice, 
    settings.offlineStopMode, 
    settings.offlineTakeProfitMode, 
    settings.offlineTrailingEnabled,
    settings.defaultOrderType, 
    settings.defaultStopMode, 
    settings.defaultTakeProfitMode, 
    settings.defaultTrailingEnabled,
    setFormData, 
    setNotification
  ]);

  // 确保离线模式下的入场价格设置（保持现有逻辑作为后备）
  useEffect(() => {
    if (isOfflineMode && formData.orderType === 'LIMIT') {
      // 如果是离线模式且订单类型是LIMIT，确保有正确的默认价格
      const defaultPrice = settings.offlineDefaultEntryPrice || '100000';
      if (!formData.entryPrice || formData.entryPrice === '0' || formData.entryPrice === '') {
        handleInputChange('entryPrice', defaultPrice);
      }
    }
  }, [isOfflineMode, formData.orderType, formData.entryPrice, formData.limitPrice, settings.offlineDefaultEntryPrice]);

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

  // Auto-update rebate percent when exchange changes
  useEffect(() => {
    if (formData.enableRebate && formData.exchange) {
      const exchangeRebateMap: Record<string, string> = {
        'BINANCE': settings.defaultRebateBinance,
        'BYBIT': settings.defaultRebateBybit,
        'BITGET': settings.defaultRebateBitget,
        'OKX': settings.defaultRebateOkx
      };
      
      const newRebatePercent = exchangeRebateMap[formData.exchange];
      if (newRebatePercent && newRebatePercent !== formData.rebatePercent) {
        handleInputChange('rebatePercent', newRebatePercent);
      }
    }
  }, [formData.exchange, formData.enableRebate, settings.defaultRebateBinance, settings.defaultRebateBybit, settings.defaultRebateBitget, settings.defaultRebateOkx]);

  // 市价单实时价格更新逻辑 - 显示用，不影响计算锁定
  useEffect(() => {
    // Clear existing timer if any
    if (priceTimer) {
      clearInterval(priceTimer);
      setPriceTimer(null);
    }

    // Start price updates for market orders in online mode with valid data
    // Continue updating even when locked (for display purposes)
    if (formData.orderType === 'MARKET' && 
        !isOfflineMode && 
        formData.exchange && 
        formData.symbol && 
        formData.contractMode) {
      
      // Start immediate price fetch
      fetchRealTimePrice();
      
      // Set up regular price updates every 3 seconds
      const interval = setInterval(() => {
        fetchRealTimePrice();
      }, 3000);
      
      setPriceTimer(interval);
    }

    return () => {
      if (priceTimer) {
        clearInterval(priceTimer);
        setPriceTimer(null);
      }
    };
  }, [formData.orderType, formData.exchange, formData.symbol, formData.contractMode, isOfflineMode]);

  // 独立的价格显示更新逻辑（不受订单类型和锁定状态影响）
  useEffect(() => {
    let displayPriceInterval: NodeJS.Timeout | null = null;

    if (formData.exchange && formData.symbol && formData.contractMode) {
      const updateDisplayPrice = async () => {
        try {
          const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const price = await getCurrentPrice(formData.exchange as Exchange, formData.symbol!, instType);
          
          const oldPrice = parseFloat(displayPrice || '0');
          setDisplayPrice(price.toString());
          setDisplayLastUpdate(new Date());
          
          // 计算价格差值和设置变化指示
          if (oldPrice > 0) {
            const diff = price - oldPrice;
            setDisplayPriceDiff(diff);
            setDisplayPreviousPrice(oldPrice);
            
            if (diff > 0) {
              setDisplayPriceChange('up');
            } else if (diff < 0) {
              setDisplayPriceChange('down');
            } else {
              setDisplayPriceChange('same');
            }
            setTimeout(() => setDisplayPriceChange(null), 2500);
          } else {
            setDisplayPriceDiff(0);
            setDisplayPreviousPrice(price);
          }
        } catch (error) {
          console.warn('Failed to update display price:', error);
        }
      };

      // 立即更新一次
      updateDisplayPrice();
      
      // 设置定时更新（每3秒）
      displayPriceInterval = setInterval(updateDisplayPrice, 3000);
    }

    return () => {
      if (displayPriceInterval) {
        clearInterval(displayPriceInterval);
      }
    };
  }, [formData.exchange, formData.symbol, formData.contractMode, displayPrice]);

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

  // 根据tickSize格式化价格显示
  const formatPriceWithTickSize = (price: number, tickSize?: string): string => {
    if (!tickSize) {
      // 如果没有tickSize，默认保留8位小数
      return price.toFixed(8);
    }

    try {
      const tick = parseFloat(tickSize);
      if (tick <= 0) {
        return price.toFixed(8);
      }

      // 计算tickSize对应的小数位数
      const tickStr = tick.toString();
      let decimalPlaces = 0;
      
      if (tickStr.includes('.')) {
        decimalPlaces = tickStr.split('.')[1].length;
      } else if (tickStr.includes('e-')) {
        // 处理科学计数法，如 1e-8
        const exponent = parseInt(tickStr.split('e-')[1]);
        decimalPlaces = exponent;
      }

      // 根据tickSize舍入价格
      const roundedPrice = Math.round(price / tick) * tick;
      
      // 格式化显示，移除尾随零
      return parseFloat(roundedPrice.toFixed(decimalPlaces)).toString();
    } catch (error) {
      console.error('Price formatting error:', error);
      return price.toFixed(8);
    }
  };

  // 根据指定百分比设置快速止损
  const handleQuickStopWithPercentage = async (percentage: number) => {
    if (!formData.entryPrice || !formData.side) {
      // 使用通知系统
      setNotification?.('请先设置入场价格和方向', 'error');
      return;
    }

    const entryPrice = parseFloat(formData.entryPrice);
    if (isNaN(entryPrice)) {
      setNotification?.('请输入有效的入场价格', 'error');
      return;
    }

    try {
      // 计算指定百分比的止损距离
      const stopDistance = entryPrice * (percentage / 100);
      const rawStopPrice = formData.side === 'LONG'
        ? entryPrice - stopDistance
        : entryPrice + stopDistance;
      
      // 根据tickSize格式化
      const stopPrice = parseFloat(formatPriceWithTickSize(rawStopPrice, marketMeta?.tickSize));
      
      // 更新止损价格
      setFormData({ ...formData, stopPrice: stopPrice.toString() });
      setNotification?.(`已设置${percentage}%止损距离`, 'success');
      
    } catch (error) {
      console.error('百分比止损计算错误:', error);
      setNotification?.('止损计算失败，请检查参数', 'error');
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

      // For limit orders, write to limitPrice; for market orders, write to entryPrice
      if (formData.orderType === 'LIMIT') {
        handleInputChange('limitPrice', price.toString());
        setBindModeForEntry('manual');
        setLastManualAt(Date.now());
      } else {
        handleInputChange('entryPrice', price.toString());
      }
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

  // Helper function to get the effective entry price for display
  const getEffectiveEntryPriceForDisplay = (): string => {
    return getNewEffectiveEntryPrice({
      orderType: formData.orderType as 'MARKET' | 'LIMIT',
      limitPrice: formData.limitPrice,
      marketRefPrice: realTimePrice,
      lockedEntryPrice: priceLock.lockedEntryPrice
    }).toString();
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
      
      // Check if user manually set limit price recently (15-second protection)
      const isManualProtected = lastManualAt && (Date.now() - lastManualAt < 15000);
      
      // Only update form data if it's a market order and price is not locked
      if (formData.orderType === 'MARKET' && !priceLock.isLocked && bindModeForEntry === 'market' && !isManualProtected) {
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

  // Quick update function for limit orders - reuses calculation logic
  const handleQuickUpdate = async () => {
    if (!validateForm() || !marketMeta) return;
    
    // Trigger click animation
    setIsQuickUpdateClicked(true);
    setTimeout(() => setIsQuickUpdateClicked(false), 200); // Reset after 200ms
    
    setIsQuickUpdating(true);
    setCalculationError(null);
    setQuickUpdateSuccess(false);
    
    try {
      await performCalculation();
      
      // Trigger success animation
      setQuickUpdateSuccess(true);
      setTimeout(() => setQuickUpdateSuccess(false), 1500); // Show success for 1.5s
      
      // Show success notification for quick update
      setTimeout(() => {
        setNotification('计算结果已更新', 'success');
      }, 100);
    } catch (error) {
      // Error handling is done in performCalculation
    } finally {
      setIsQuickUpdating(false);
    }
  };

  // Core calculation logic that can be shared between handleCalculate and handleQuickUpdate
  const performCalculation = async () => {
    
    // Get effective entry price - lock market price if MARKET order
    let calculationEntryPrice: number;
    
    if (formData.orderType === 'MARKET') {
      try {
        // Lock current market price for MARKET orders
        const instType: any = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
        const latestPrice = await getCurrentPrice(
          formData.exchange as any,
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
        lockedEntryPrice: null // No locking for LIMIT orders
      });
    }
    
    const lockedEntryPrice = calculationEntryPrice.toString();
    
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
        // Maker/Taker fees
        feeOpenMaker: formData.feeOpenMaker || '0.0002',
        feeOpenTaker: formData.feeOpenTaker || '0.0006',
        feeCloseMaker: formData.feeCloseMaker || '0.0002',
        feeCloseTaker: formData.feeCloseTaker || '0.0006',
        slippageOpen: formData.slippageOpen || '0.0005',
        slippageClose: formData.slippageClose || '0.0005',
        // Rebate settings
        enableRebate: formData.enableRebate || false,
        rebatePercent: formData.rebatePercent || '0',
        // Backward compatibility
        feeOpen: formData.feeOpen || '0.0004',
        feeClose: formData.feeClose || '0.0004',
        slippage: formData.slippage || '0.0005',
        leverage: formData.leverage,
        contractMode: formData.contractMode!,
        marketMeta,
        orderType: formData.orderType,
        feeType: formData.feeType,
        rrRatios: settings.rrRatios,
      };
      
      console.log('📊 Calculation Input:', input);
      
      // Validate critical fields before calculation
      if (!input.entryPrice) {
        throw new Error('Entry price is required');
      }
      if (input.stopMode === 'PRICE' && !input.stopPrice) {
        throw new Error('Stop price is required for PRICE stop mode');
      }
      if (input.stopMode === 'ATR' && (!input.atr || !input.atrMultiplier)) {
        throw new Error('ATR value and multiplier are required for ATR stop mode');
      }
      if (input.riskMode === 'FIXED_USDT' && !input.riskUSDT) {
        throw new Error('Risk amount in USDT is required for fixed USDT mode');
      }
      if (input.riskMode === 'ACCOUNT_PERCENT' && (!input.accountEquity || !input.riskPercent)) {
        throw new Error('Account equity and risk percentage are required for percentage mode');
      }
      
      const result = calculatePosition(input);
      console.log('✅ Calculation Result:', result);
      setResult(result);
      
      // Scroll to top to show calculation results
      setTimeout(() => {
        window.scrollTo({ 
          top: 0, 
          behavior: 'smooth' 
        });
      }, 100);
    } catch (error) {
      console.error('❌ Calculation Error:', error);
      const errorMessage = error instanceof Error ? error.message : t('calculationFailed');
      console.error('Error details:', errorMessage);
      setCalculationError(errorMessage);
      throw error; // Re-throw so caller can handle it
    }
  };

  const handleCalculate = async () => {
    if (!validateForm()) {
      setCalculationError(t('pleaseFixValidationErrors'));
      return;
    }
    
    if (!marketMeta) {
      setCalculationError(t('marketMetadataRequired'));
      return;
    }
    
    setIsCalculating(true);
    setCalculationError(null);
    
    try {
      await performCalculation();
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Switch to quick calculator tab
                const quickTab = document.querySelector('[value="quick"]') as HTMLElement;
                if (quickTab) {
                  quickTab.click();
                }
              }}
              className="flex items-center gap-1 text-xs"
            >
              <Zap className="w-3 h-3" />
              {t('quickMode')}
            </Button>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 border rounded-full text-xs ${
            isOfflineMode 
              ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
              : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          }`}>
            {isOfflineMode ? (
              <WifiOff className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            )}
            <span className={`font-medium ${
              isOfflineMode 
                ? 'text-orange-700 dark:text-orange-300'
                : 'text-green-700 dark:text-green-300'
            }`}>
              {isOfflineMode ? '离线模式' : '在线模式'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification display */}
        {showNotification && (
          <div className={`
            p-4 rounded-lg border-l-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300
            ${notificationType === 'success' ? 'bg-green-50 dark:bg-green-950/50 border-green-500 text-green-800 dark:text-green-200' : 
              notificationType === 'error' ? 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-800 dark:text-red-200' : 
              'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-800 dark:text-blue-200'}
          `}>
            <div className="flex-shrink-0">
              {notificationType === 'success' && <Check className="w-5 h-5 text-green-600 dark:text-green-400" />}
              {notificationType === 'error' && <X className="w-5 h-5 text-red-600 dark:text-red-400" />}
              {notificationType === 'info' && <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">
                {notificationType === 'success' ? '成功' : 
                 notificationType === 'error' ? '错误' : 
                 '提示'}
              </p>
              <p className="text-sm opacity-90 mt-1">{notificationMessage}</p>
            </div>
            <button
              onClick={clearNotification}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
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
        <EntrySection
          formData={formData}
          onInputChange={handleInputChange}
          formErrors={formErrors}
          displayPrice={displayPrice}
          displayPriceChange={displayPriceChange}
          displayLastUpdate={displayLastUpdate}
          displayPriceDiff={displayPriceDiff}
          realTimePrice={realTimePrice}
          priceChange={priceChange}
          lastPriceUpdate={lastPriceUpdate ? new Date(lastPriceUpdate) : null}
          isPriceLocked={priceLock.isLocked}
          lockedPrice={priceLock.lockedEntryPrice?.toString() || null}
          isOfflineMode={isOfflineMode}
          isFetchingPrice={isFetchingPrice}
          priceError={priceError}
          result={result}
          marketMeta={marketMeta}
          isQuickUpdating={isQuickUpdating}
          isQuickUpdateClicked={isQuickUpdateClicked}
          quickUpdateSuccess={quickUpdateSuccess}
          settings={settings}
          priceLock={priceLock}
          onQuickUpdate={handleQuickUpdate}
          onFetchCurrentPrice={fetchCurrentPrice}
          onSetNotification={setNotification}
          bindModeForEntry={bindModeForEntry}
          lastManualAt={lastManualAt}
          onSetBindMode={setBindModeForEntry}
          onSetLastManualAt={setLastManualAt}
        />

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
            <div className="space-y-2">
              <Label>{t('stopPrice')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.stopPrice || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('stopPrice', e.target.value)}
                placeholder={t('enterStopPrice')}
                className={formErrors.stopPrice ? 'border-red-500' : ''}
              />
              
              {/* 价格止损模式的快速设置按钮组 */}
              <div className="flex gap-1 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStopWithPercentage(0.5)}
                  className="text-xs px-2 py-1 h-7"
                  title="设置0.5%止损距离"
                >
                  0.5%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStopWithPercentage(1)}
                  className="text-xs px-2 py-1 h-7"
                  title="设置1%止损距离"
                >
                  1%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStopWithPercentage(2)}
                  className="text-xs px-2 py-1 h-7"
                  title="设置2%止损距离"
                >
                  2%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStopWithPercentage(3)}
                  className="text-xs px-2 py-1 h-7"
                  title="设置3%止损距离"
                >
                  3%
                </Button>
              </div>
              
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
                {t('stopPipsHelp')}
              </p>
              {formData.stopPips && getEffectiveEntryPriceForDisplay() && marketMeta && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('calculatedStopPrice')}:</span>
                    <span className="font-mono font-medium text-red-600">
                      {(() => {
                        try {
                          const effectiveEntryPrice = getEffectiveEntryPriceForDisplay();
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
                  {formData.orderType === 'MARKET' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {priceLock.isLocked ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          🔒 计算锁定价格: {priceLock.lockedEntryPrice}
                        </span>
                      ) : realTimePrice && (
                        <span>
                          📈 {t('basedOnRealTimePrice')}: {realTimePrice}
                          {priceChange && (
                            <span className={`ml-1 ${
                              priceChange === 'up' ? 'text-green-600' : 
                              priceChange === 'down' ? 'text-red-600' : ''
                            }`}>
                              {priceChange === 'up' ? '↑' : priceChange === 'down' ? '↓' : ''}
                            </span>
                          )}
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
        <TakeProfitSection
          formData={formData}
          onInputChange={handleInputChange}
          formErrors={formErrors}
          isOfflineMode={isOfflineMode}
          realTimePrice={realTimePrice}
          priceChange={priceChange}
          marketMeta={marketMeta}
          lockedPipsTakeProfitPrice={lockedPipsTakeProfitPrice}
          lockedEntryPriceForPips={lockedEntryPriceForPips}
          getEffectiveEntryPrice={getEffectiveEntryPriceForDisplay}
        />

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
        <LeverageSection
          formData={formData}
          onInputChange={handleInputChange}
        />

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
              <div className="space-y-3 mt-3">
                {/* Opening Fees */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 border-b pb-1">
                    开仓费率 & 滑点 (Opening)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-green-600 dark:text-green-400">Maker 开仓 (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={formatPercentageDisplay(formData.feeOpenMaker || settings.defaultFeeOpenMaker)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = (percentValue / 100).toFixed(5);
                          handleInputChange('feeOpenMaker', decimalValue);
                        }}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-orange-600 dark:text-orange-400">Taker 开仓 (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={formatPercentageDisplay(formData.feeOpenTaker || settings.defaultFeeOpenTaker)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = (percentValue / 100).toFixed(5);
                          handleInputChange('feeOpenTaker', decimalValue);
                        }}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">开仓滑点 (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={formatPercentageDisplay(formData.slippageOpen || settings.defaultSlippageOpen)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = (percentValue / 100).toFixed(5);
                          handleInputChange('slippageOpen', decimalValue);
                        }}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Closing Fees */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 border-b pb-1">
                    平仓费率 & 滑点 (Closing)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-green-600 dark:text-green-400">Maker 平仓 (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={formatPercentageDisplay(formData.feeCloseMaker || settings.defaultFeeCloseMaker)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = (percentValue / 100).toFixed(5);
                          handleInputChange('feeCloseMaker', decimalValue);
                        }}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-orange-600 dark:text-orange-400">Taker 平仓 (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={formatPercentageDisplay(formData.feeCloseTaker || settings.defaultFeeCloseTaker)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = (percentValue / 100).toFixed(5);
                          handleInputChange('feeCloseTaker', decimalValue);
                        }}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">平仓滑点 (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={formatPercentageDisplay(formData.slippageClose || settings.defaultSlippageClose)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = (percentValue / 100).toFixed(5);
                          handleInputChange('slippageClose', decimalValue);
                        }}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Quick Info */}
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  💡 {formData.orderType === 'MARKET' 
                    ? `Market订单自动使用Taker费率(${formatPercentageDisplay(settings.defaultFeeOpenTaker)}%)和滑点` 
                    : (formData.feeType === 'MAKER' 
                       ? `Limit订单全部使用Maker费率(${formatPercentageDisplay(settings.defaultFeeOpenMaker)}%)（无滑点）`
                       : formData.feeType === 'TAKER'
                       ? `Limit订单全部使用Taker费率(${formatPercentageDisplay(settings.defaultFeeOpenTaker)}%)（有滑点）` 
                       : `Limit订单混合费率：开仓Maker(${formatPercentageDisplay(settings.defaultFeeOpenMaker)}%)，止损Taker(${formatPercentageDisplay(settings.defaultFeeCloseTaker)}%)`)
                  }
                </div>
                
                {/* Rebate Settings */}
                <div className="space-y-3 mt-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2 border-b pb-1">
                    返佣设置 (Rebate Settings)
                  </div>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.enableRebate || false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleInputChange('enableRebate', e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs">启用返佣计算</span>
                  </label>
                  
                  {formData.enableRebate && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">返佣比例 (%)</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="50"
                          value={formData.rebatePercent || (
                            formData.exchange === 'BINANCE' ? settings.defaultRebateBinance :
                            formData.exchange === 'BYBIT' ? settings.defaultRebateBybit :
                            formData.exchange === 'BITGET' ? settings.defaultRebateBitget :
                            settings.defaultRebateOkx
                          )}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            handleInputChange('rebatePercent', e.target.value)
                          }
                          className="text-xs h-8"
                          placeholder={`当前交易所默认: ${
                            formData.exchange === 'BINANCE' ? settings.defaultRebateBinance :
                            formData.exchange === 'BYBIT' ? settings.defaultRebateBybit :
                            formData.exchange === 'BITGET' ? settings.defaultRebateBitget :
                            settings.defaultRebateOkx
                          }%`}
                        />
                      </div>
                      
                      <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-2 rounded">
                        💰 返佣后实际费率: 原费率 × (1 - {formData.rebatePercent || 30}%) = 实际使用费率
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calculate Button */}
        <ActionButtonsSection
          onCalculate={handleCalculate}
          isCalculating={isCalculating}
          marketMeta={marketMeta}
          calculationError={calculationError}
        />
      </CardContent>
    </Card>
  );
}