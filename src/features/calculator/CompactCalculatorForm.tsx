import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Calculator, Lock, Unlock, TrendingUp, ArrowLeft, RotateCcw, Download, Settings, Eye, EyeOff, Activity } from 'lucide-react';
import { SavedParametersCard } from './components/SavedParametersCard';
import { QuickCopyCard } from './components/QuickCopyCard';
import { TrailingPanel } from './TrailingPanelWrapper';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';
import { useEntryPriceBinding } from './hooks/useEntryPriceBinding';
import { calculatePosition } from '@/lib/core';
import { validateNumberString } from '@/lib/validation';
import { getCurrentPrice, getATRValue, getMarketMeta } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';
import { getEffectiveEntryPrice } from './utils/effectivePrice';
import { getEffectiveEntryPrice as getNewEffectiveEntryPrice } from './lib/price';
import { usePriceLock } from './hooks/usePriceLock';

interface CompactCalculatorFormProps {
  onBackToFull: () => void;
}

export function CompactCalculatorForm({ onBackToFull }: CompactCalculatorFormProps) {
  const {
    formData,
    setFormData,
    result,
    setResult,
    lastCalculationInput,
    setLastCalculationInput,
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
    // Trailing exits
    trailingEnabled,
    setTrailingEnabled,
    trailingConfig,
    updateTrailingConfig,
    trailingState,
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
  
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [marketMeta, setMarketMeta] = useState<any>(null);
  const [showSavedParams, setShowSavedParams] = useState(true);
  const [showTrailingPanel, setShowTrailingPanel] = useState(false);
  const [initialPositionPercentage, setInitialPositionPercentage] = useState<number>(100);
  const [isFetchingATR, setIsFetchingATR] = useState(false);
  const [atrError, setATRError] = useState<string>('');
  const [isStopPriceLocked, setIsStopPriceLocked] = useState(true);
  const [lockedStopPrice, setLockedStopPrice] = useState<string | null>(null);
  
  // 实时价格显示的独立状态（不受锁定影响）
  const [displayPrice, setDisplayPrice] = useState<string>('');
  const [displayPriceChange, setDisplayPriceChange] = useState<'up' | 'down' | 'same' | null>(null);
  const [displayLastUpdate, setDisplayLastUpdate] = useState<Date | null>(null);
  const [displayPriceDiff, setDisplayPriceDiff] = useState<number>(0);
  const [displayPreviousPrice, setDisplayPreviousPrice] = useState<number>(0);

  // 保存原始计算时使用的所有参数（来自完整版或快速模式的实际计算输入）
  const baseSavedCalculationParams = React.useMemo(() => {
    // 如果有保存的最后计算输入，使用它；否则回退到当前formData
    const sourceData = lastCalculationInput || formData;
    
    return {
      // 基础市场参数（来自实际计算输入）
      exchange: sourceData.exchange,
      symbol: sourceData.symbol,
      contractMode: sourceData.contractMode,
      side: sourceData.side,
      
      // 止损参数（来自实际计算输入）
      stopMode: sourceData.stopMode,
      atrPeriod: sourceData.atrPeriod,
      atrTimeframe: sourceData.atrTimeframe,
      atrMultiplier: sourceData.atrMultiplier,
      stopPrice: sourceData.stopPrice,
      stopPips: sourceData.stopPips,
      
      // 止盈参数（来自实际计算输入）
      useTakeProfit: sourceData.useTakeProfit,
      takeProfitMode: sourceData.takeProfitMode,
      takeProfitPrice: sourceData.takeProfitPrice,
      takeProfitATRMultiplier: sourceData.takeProfitATRMultiplier,
      takeProfitRRRatio: sourceData.takeProfitRRRatio,
      takeProfitPips: sourceData.takeProfitPips,
      
      // 风险管理参数（来自实际计算输入）
      riskMode: sourceData.riskMode,
      riskAmount: sourceData.riskAmount,
      accountEquity: sourceData.accountEquity,
      riskPercent: sourceData.riskPercent,
      leverage: sourceData.leverage,
      
      // 费率参数（来自实际计算输入）
      includeFees: sourceData.includeFees,
      feeType: sourceData.feeType,
      feeOpenMaker: sourceData.feeOpenMaker,
      feeOpenTaker: sourceData.feeOpenTaker,
      feeCloseMaker: sourceData.feeCloseMaker,
      feeCloseTaker: sourceData.feeCloseTaker,
      slippageOpen: sourceData.slippageOpen,
      slippageClose: sourceData.slippageClose,
      enableRebate: sourceData.enableRebate,
      rebatePercent: sourceData.rebatePercent,
      feeOpen: sourceData.feeOpen,
      feeClose: sourceData.feeClose,
      slippage: sourceData.slippage,
      
      // 高级参数（来自实际计算输入）
      autoLeverage: sourceData.autoLeverage,
      maxEquityUsage: sourceData.maxEquityUsage,
      
      // 加仓参数（来自实际计算输入）
      enablePositionScaling: sourceData.enablePositionScaling,
      initialPositionPercentage: sourceData.initialPositionPercentage,
    };
  }, [lastCalculationInput, formData]);

  // 显示参数：显示原始计算参数，包括实际的加仓设置状态
  const savedCalculationParams = React.useMemo(() => ({
    ...baseSavedCalculationParams,
    // 只在CompactForm计算时才使用当前简易表单的加仓设置，显示时使用原始参数
  }), [baseSavedCalculationParams]);

  // 获取市场元数据
  React.useEffect(() => {
    const fetchMarketMeta = async () => {
      if (savedCalculationParams.exchange && savedCalculationParams.symbol && savedCalculationParams.contractMode) {
        try {
          const instType: InstType = savedCalculationParams.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const meta = await getMarketMeta(savedCalculationParams.exchange as Exchange, savedCalculationParams.symbol, instType);
          setMarketMeta(meta);
        } catch (error) {
          console.error('Failed to fetch market meta:', error);
          setMarketMeta(null);
        }
      }
    };
    
    fetchMarketMeta();
  }, [savedCalculationParams.exchange, savedCalculationParams.symbol, savedCalculationParams.contractMode]);

  // 初始化时自动锁定止损价格
  React.useEffect(() => {
    if (isStopPriceLocked && !lockedStopPrice) {
      const lastUsedStopPrice = result?.stopPrice || baseSavedCalculationParams.stopPrice;
      if (lastUsedStopPrice) {
        setLockedStopPrice(lastUsedStopPrice);
        // 如果表单数据中没有止损价格，设置为锁定的价格
        if (!formData.stopPrice) {
          setFormData({ stopPrice: lastUsedStopPrice });
        }
      } else {
        // 如果没有可锁定的价格，设置为未锁定状态
        setIsStopPriceLocked(false);
      }
    }
  }, [result, baseSavedCalculationParams.stopPrice, lockedStopPrice, formData.stopPrice, isStopPriceLocked, setFormData]);

  // 实时价格更新（市价单模式，未锁定时）
  useEffect(() => {
    let priceUpdateInterval: NodeJS.Timeout | null = null;

    if (formData.orderType === 'MARKET' && !priceLock.isLocked && 
        savedCalculationParams.exchange && savedCalculationParams.symbol && 
        savedCalculationParams.contractMode) {
      
      const updatePrice = async () => {
        try {
          const instType: InstType = savedCalculationParams.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const price = await getCurrentPrice(savedCalculationParams.exchange as Exchange, savedCalculationParams.symbol!, instType);
          
          const oldPrice = parseFloat(realTimePrice || formData.entryPrice || '0');
          
          // Only update form data if allowed by binding protection
          if (priceBinding.shouldAllowAutoWrite(formData.orderType as 'MARKET' | 'LIMIT')) {
            setFormData({ entryPrice: price.toString() });
          }
          
          setRealTimePrice(price.toString());
          setLastPriceUpdate(new Date());
          
          // 设置价格变化指示
          if (oldPrice > 0) {
            if (price > oldPrice) {
              setPriceChange('up');
            } else if (price < oldPrice) {
              setPriceChange('down');
            } else {
              setPriceChange('same');
            }
            setTimeout(() => setPriceChange(null), 1500);
          }
        } catch (error) {
          console.warn('Failed to update real-time price:', error);
        }
      };

      // 立即更新一次
      updatePrice();
      
      // 设置定时更新（每3秒）
      priceUpdateInterval = setInterval(updatePrice, 3000);
    }

    return () => {
      if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
      }
    };
  }, [formData.orderType, priceLock.isLocked, savedCalculationParams.exchange, savedCalculationParams.symbol, savedCalculationParams.contractMode, realTimePrice, formData.entryPrice, formData.limitPrice, setFormData, setRealTimePrice, setLastPriceUpdate, setPriceChange]);

  // 独立的价格显示更新逻辑（不受订单类型和锁定状态影响）
  useEffect(() => {
    let displayPriceInterval: NodeJS.Timeout | null = null;

    if (savedCalculationParams.exchange && savedCalculationParams.symbol && savedCalculationParams.contractMode) {
      const updateDisplayPrice = async () => {
        try {
          const instType: InstType = savedCalculationParams.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const price = await getCurrentPrice(savedCalculationParams.exchange as Exchange, savedCalculationParams.symbol!, instType);
          
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
  }, [savedCalculationParams.exchange, savedCalculationParams.symbol, savedCalculationParams.contractMode, displayPrice]);

  // 表单输入处理
  const handleInputChange = (field: 'entryPrice' | 'limitPrice' | 'orderType' | 'stopPrice' | 'feeType', value: string) => {
    if (field === 'entryPrice' || field === 'limitPrice' || field === 'stopPrice') {
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
  };

  // 获取当前价格
  const handleFetchCurrentPrice = async () => {
    if (!savedCalculationParams.exchange || !savedCalculationParams.symbol || !savedCalculationParams.contractMode) {
      setPriceError(t('marketDataNotAvailable'));
      return;
    }

    setIsFetchingPrice(true);
    setPriceError('');

    try {
      const instType: InstType = savedCalculationParams.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      const price = await getCurrentPrice(savedCalculationParams.exchange as Exchange, savedCalculationParams.symbol, instType);
      
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

  // Market order status display helpers
  const getMarketOrderStatusText = () => {
    if (priceLock.isLocked) {
      return `🔒 计算锁定: ${priceLock.lockedEntryPrice}`;
    }
    return '📈 实时跟随';
  };


  // 根据指定百分比设置快速止损
  const handleQuickStopWithPercentage = async (percentage: number) => {
    if (!formData.entryPrice || !savedCalculationParams.side) {
      setNotification('请先设置入场价格和方向', 'error');
      return;
    }

    const entryPrice = parseFloat(formData.entryPrice);
    if (isNaN(entryPrice)) {
      setNotification('请输入有效的入场价格', 'error');
      return;
    }

    try {
      // 计算指定百分比的止损距离
      const stopDistance = entryPrice * (percentage / 100);
      const rawStopPrice = savedCalculationParams.side === 'LONG'
        ? entryPrice - stopDistance
        : entryPrice + stopDistance;
      
      // 根据tickSize格式化
      const stopPrice = parseFloat(formatPriceWithTickSize(rawStopPrice, marketMeta?.tickSize));
      
      // 更新止损价格
      setFormData({ stopPrice: stopPrice.toString() });
      setNotification(`已设置${percentage}%止损距离`, 'success');
      
    } catch (error) {
      console.error('百分比止损计算错误:', error);
      setNotification('止损计算失败，请检查参数', 'error');
    }
  };

  // ATR止损设置
  const handleATRStopSet = async () => {
    if (!formData.entryPrice || !baseSavedCalculationParams.side) {
      setNotification('请先设置入场价格和方向', 'error');
      return;
    }

    const entryPrice = parseFloat(formData.entryPrice);
    if (isNaN(entryPrice)) {
      setNotification('请输入有效的入场价格', 'error');
      return;
    }

    setIsFetchingATR(true);
    setATRError('');

    try {
      // 从设置中获取ATR参数
      const atrPeriod = settings.defaultAtrPeriod || 14;
      const atrTimeframe = settings.defaultAtrTimeframe || '15m';
      const atrMultiplier = parseFloat(settings.defaultAtrMultiplier?.toString() || '2');

      // 获取市场参数从原始计算参数
      const exchange = baseSavedCalculationParams.exchange as Exchange;
      const symbol = baseSavedCalculationParams.symbol!;
      const contractMode = baseSavedCalculationParams.contractMode;
      
      if (!exchange || !symbol || !contractMode) {
        setNotification('缺少市场数据，无法获取ATR', 'error');
        return;
      }

      const instType: InstType = contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      
      // 获取ATR值
      const atrValue = await getATRValue(exchange, symbol, instType, atrTimeframe as any, atrPeriod as any);
      const atrDistance = atrValue * atrMultiplier;
      
      // 计算止损价格
      const rawStopPrice = baseSavedCalculationParams.side === 'LONG'
        ? entryPrice - atrDistance
        : entryPrice + atrDistance;
        
      const stopPrice = parseFloat(formatPriceWithTickSize(rawStopPrice, marketMeta?.tickSize));
      
      // 更新止损价格
      setFormData({ stopPrice: stopPrice.toString() });
      setNotification(`已设置ATR止损 (${atrMultiplier}x ATR = ${atrDistance.toFixed(4)})`, 'success');
      
    } catch (error: any) {
      console.error('ATR止损计算错误:', error);
      setATRError(error.message || 'ATR获取失败');
      setNotification('ATR止损设置失败', 'error');
    } finally {
      setIsFetchingATR(false);
    }
  };

  // PIPS止损设置
  const handlePipsStopSet = async () => {
    if (!formData.entryPrice || !baseSavedCalculationParams.side) {
      setNotification('请先设置入场价格和方向', 'error');
      return;
    }

    const entryPrice = parseFloat(formData.entryPrice);
    if (isNaN(entryPrice)) {
      setNotification('请输入有效的入场价格', 'error');
      return;
    }

    try {
      // 从设置中获取PIPS参数
      const stopPips = parseFloat(settings.defaultStopPips || '50');
      
      if (!marketMeta || !marketMeta.tickSize) {
        setNotification('缺少市场元数据，无法计算PIPS止损', 'error');
        return;
      }

      const tickSize = parseFloat(marketMeta.tickSize);
      const pipsDistance = stopPips * tickSize;
      
      // 计算止损价格
      const rawStopPrice = baseSavedCalculationParams.side === 'LONG'
        ? entryPrice - pipsDistance
        : entryPrice + pipsDistance;
        
      const stopPrice = parseFloat(formatPriceWithTickSize(rawStopPrice, marketMeta.tickSize));
      
      // 更新止损价格
      setFormData({ stopPrice: stopPrice.toString() });
      setNotification(`已设置PIPS止损 (${stopPips} PIPS = ${pipsDistance.toFixed(4)})`, 'success');
      
    } catch (error) {
      console.error('PIPS止损计算错误:', error);
      setNotification('PIPS止损设置失败', 'error');
    }
  };

  // 锁定/解锁止损价格
  const handleToggleStopPriceLock = () => {
    if (!isStopPriceLocked) {
      // 锁定：使用上次计算结果的止损价格，或保存参数中的止损价格
      const lastUsedStopPrice = result?.stopPrice || baseSavedCalculationParams.stopPrice;
      
      if (lastUsedStopPrice) {
        setLockedStopPrice(lastUsedStopPrice);
        // 如果当前输入框为空，填入锁定的价格
        if (!formData.stopPrice) {
          setFormData({ stopPrice: lastUsedStopPrice });
        }
        setIsStopPriceLocked(true);
        setNotification('已锁定上次计算的止损价格', 'success');
      } else {
        setNotification('没有可用的止损价格进行锁定', 'error');
      }
    } else {
      // 解锁：清除锁定状态，但保留输入框中的价格
      setLockedStopPrice(null);
      setIsStopPriceLocked(false);
      setNotification('已解锁止损价格', 'info');
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


  // 重新计算（使用保存的参数）
  const handleRecalculate = async () => {
    // 验证必要字段
    if (!formData.entryPrice) {
      setFormErrors({ entryPrice: t('required') });
      setCalculationError('请输入价格');
      return;
    }

    setIsCalculating(true);
    setCalculationError('');

    try {
      // CompactForm 不使用ATR模式，跳过ATR获取

      // CompactForm 强制使用价格止损模式
      // 止损价格处理逻辑：
      // 1. 如果价格被锁定，使用锁定的价格
      // 2. 否则优先使用用户输入，其次使用保存的参数
      const effectiveStopPrice = isStopPriceLocked && lockedStopPrice 
        ? lockedStopPrice 
        : formData.stopPrice || savedCalculationParams.stopPrice;
      
      // Get effective price - lock market price if MARKET order
      let calculationEntryPrice: number;
      
      if (formData.orderType === 'MARKET') {
        try {
          // Lock current market price for MARKET orders
          const instType: InstType = savedCalculationParams.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const latestPrice = await getCurrentPrice(
            savedCalculationParams.exchange as Exchange,
            savedCalculationParams.symbol!,
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
        side: savedCalculationParams.side!,
        entryPrice: effectivePrice,
        stopPrice: effectiveStopPrice,
        atr: undefined, // CompactForm 强制不使用ATR
        atrMultiplier: undefined, // CompactForm 强制不使用ATR
        stopPips: undefined, // CompactForm 强制不使用PIPS
        stopMode: 'PRICE' as const, // CompactForm 强制使用价格模式
        useTakeProfit: savedCalculationParams.useTakeProfit || false,
        takeProfitMode: savedCalculationParams.takeProfitMode,
        takeProfitPrice: savedCalculationParams.takeProfitPrice,
        takeProfitATRMultiplier: savedCalculationParams.takeProfitATRMultiplier,
        takeProfitRRRatio: savedCalculationParams.takeProfitRRRatio,
        takeProfitPips: savedCalculationParams.takeProfitPips,
        riskMode: savedCalculationParams.riskMode || 'FIXED_USDT',
        riskUSDT: savedCalculationParams.riskMode === 'FIXED_USDT' ? (
          settings.defaultEnablePositionScaling && initialPositionPercentage !== 100
            ? String(Number(savedCalculationParams.riskAmount || '100') * initialPositionPercentage / 100)
            : savedCalculationParams.riskAmount
        ) : undefined,
        accountEquity: savedCalculationParams.riskMode === 'ACCOUNT_PERCENT' ? savedCalculationParams.accountEquity : undefined,
        riskPercent: savedCalculationParams.riskMode === 'ACCOUNT_PERCENT' ? (
          settings.defaultEnablePositionScaling && initialPositionPercentage !== 100
            ? String(Number(savedCalculationParams.riskPercent || '1') * initialPositionPercentage / 100)
            : savedCalculationParams.riskPercent
        ) : undefined,
        includeFees: savedCalculationParams.includeFees || false,
        feeOpenMaker: savedCalculationParams.feeOpenMaker || '0.0002',
        feeOpenTaker: savedCalculationParams.feeOpenTaker || '0.0006',
        feeCloseMaker: savedCalculationParams.feeCloseMaker || '0.0002',
        feeCloseTaker: savedCalculationParams.feeCloseTaker || '0.0006',
        slippageOpen: savedCalculationParams.slippageOpen || '0.0005',
        slippageClose: savedCalculationParams.slippageClose || '0.0005',
        enableRebate: savedCalculationParams.enableRebate || false,
        rebatePercent: savedCalculationParams.rebatePercent || '0',
        feeOpen: savedCalculationParams.feeOpen || '0.0004',
        feeClose: savedCalculationParams.feeClose || '0.0004',
        slippage: savedCalculationParams.slippage || '0.0005',
        leverage: savedCalculationParams.leverage || 10,
        contractMode: savedCalculationParams.contractMode || 'USDT_PERP',
        marketMeta: marketMeta,
        orderType: formData.orderType || 'MARKET',
        feeType: formData.feeType || savedCalculationParams.feeType || 'MAKER_OPEN_TAKER_CLOSE',
        rrRatios: settings.rrRatios || [1, 1.5, 2],
        
        // Position scaling settings from current CompactForm state
        enablePositionScaling: settings.defaultEnablePositionScaling && initialPositionPercentage !== -1,
        initialPositionPercentage: initialPositionPercentage === -1 ? 100 : initialPositionPercentage,
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
    <div className={`w-full ${showSavedParams ? 'max-w-[1920px]' : 'max-w-5xl'} transition-all duration-300`}>
      <div className="space-y-6">
        {/* 上方：简易计算器和快速复制 */}
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：简易计算器 */}
            <Card className="w-full">
      <CardHeader className="pb-4">
        {/* 实时价格显示栏 - 独立显示，不受订单类型限制 */}
        {savedCalculationParams.exchange && savedCalculationParams.symbol && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="space-y-2">
              {/* 第一行：交易对信息和更新时间 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {savedCalculationParams.exchange} {savedCalculationParams.symbol}
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
                    <span className={`text-3xl font-bold font-mono ${
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
                      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-medium ${
                        displayPriceChange === 'up' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        <span className="text-lg">
                          {displayPriceChange === 'up' ? '↗' : '↘'}
                        </span>
                        <span className="text-sm">
                          {displayPriceChange === 'up' ? '+' : ''}
                          {Math.abs(displayPriceDiff).toLocaleString('en-US', {
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
        
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 whitespace-nowrap">
            <Calculator className="w-5 h-5 text-blue-600" />
            重新计算
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {/* 显示/隐藏保存参数切换 */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSavedParams(!showSavedParams)}
              className="flex items-center gap-2 whitespace-nowrap"
              title={showSavedParams ? '隐藏保存参数' : '显示保存参数'}
            >
              {showSavedParams ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="text-xs whitespace-nowrap">{showSavedParams ? '隐藏参数' : '显示参数'}</span>
            </Button>
            
            {/* 显示/隐藏移动止盈止损切换 */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTrailingPanel(!showTrailingPanel)}
              className="flex items-center gap-2 whitespace-nowrap"
              title={showTrailingPanel ? '隐藏移动止盈止损' : '显示移动止盈止损'}
            >
              <Activity className="w-4 h-4" />
              <span className="text-xs whitespace-nowrap">{showTrailingPanel ? '隐藏追踪' : '显示追踪'}</span>
            </Button>
            
            {/* 返回完整表单 */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBackToFull} 
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs whitespace-nowrap">返回</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          只需调整订单类型和价格，其他参数保持不变
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 订单类型 */}
        <div className="space-y-2">
          <Label htmlFor="orderType">{t('orderType')}</Label>
          <select
            value={formData.orderType || ''}
            onChange={(e) => handleInputChange('orderType', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="MARKET">{t('marketOrder')}</option>
            <option value="LIMIT">{t('limitOrder')}</option>
          </select>
        </div>

        {/* 费率类型选择 - 限价单专用 */}
        {formData.orderType === 'LIMIT' && (
          <div className="space-y-2">
            <Label htmlFor="feeType">{t('feeType')}</Label>
            <select
              value={formData.feeType || 'MAKER_OPEN_TAKER_CLOSE'}
              onChange={(e) => handleInputChange('feeType', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="MAKER">{t('allMaker')}</option>
              <option value="TAKER">{t('allTaker')}</option>
              <option value="MAKER_OPEN_TAKER_CLOSE">{t('makerOpenTakerClose')}</option>
              <option value="MAKER_OPEN_ONLY">{t('makerOpenOnly')}</option>
            </select>
            <div className="text-xs text-muted-foreground p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="space-y-1">
                <div>
                  💡 {formData.feeType === 'MAKER' ? t('feeTypeAllMakerDesc') : 
                      formData.feeType === 'TAKER' ? t('feeTypeAllTakerDesc') :
                      formData.feeType === 'MAKER_OPEN_TAKER_CLOSE' ? t('feeTypeMakerOpenTakerCloseDesc') :
                      formData.feeType === 'MAKER_OPEN_ONLY' ? t('feeTypeMakerOpenOnlyDesc') : ''}
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

        {/* 入场价格设置 */}
        <div className="space-y-2">
          <Label>
            {formData.orderType === 'MARKET' ? '市场价格' : t('entryPrice')}
          </Label>
          
          {/* LIMIT Order: Input field with fetch button */}
          {formData.orderType === 'LIMIT' && (
            <div className="flex gap-2">
              <Input
                id="limitPrice"
                type="text"
                value={formData.limitPrice || ''}
                onChange={(e) => priceBinding.handlePriceInputChange(e.target.value, formData.orderType as 'MARKET' | 'LIMIT')}
                placeholder={t('enterPrice')}
                className="flex-1"
              />
              
              {/* 获取价格按钮 */}
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchCurrentPrice}
                disabled={isFetchingPrice}
                className="flex items-center gap-2 px-4 whitespace-nowrap"
              >
                {isFetchingPrice ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs whitespace-nowrap">获取中</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="text-xs whitespace-nowrap">获取价格</span>
                  </>
                )}
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

        {/* 止损设置 */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="stopPrice" className="text-sm font-medium">{t('stopPrice')}</Label>
              <Button
                type="button"
                variant={isStopPriceLocked ? "default" : "outline"}
                size="sm"
                onClick={handleToggleStopPriceLock}
                disabled={!isStopPriceLocked && !result?.stopPrice && !baseSavedCalculationParams.stopPrice}
                className={`flex items-center gap-2 text-xs px-3 ${
                  isStopPriceLocked 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'border-gray-300'
                }`}
                title={isStopPriceLocked ? '解锁止损价格' : '锁定上次计算的止损价格'}
              >
                {isStopPriceLocked ? (
                  <>
                    <Lock className="w-3 h-3" />
                    已锁定
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" />
                    锁定止损
                  </>
                )}
              </Button>
            </div>
            <Input
              id="stopPrice"
              type="text"
              value={formData.stopPrice || ''}
              onChange={(e) => handleInputChange('stopPrice', e.target.value)}
              placeholder={isStopPriceLocked ? "已锁定上次计算的止损价格" : "输入止损价格或使用下方快速按钮"}
              className={`w-full text-base ${isStopPriceLocked ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : ''}`}
              disabled={isStopPriceLocked}
              readOnly={isStopPriceLocked}
            />
            
            {/* 锁定状态提示 */}
            {isStopPriceLocked && lockedStopPrice && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                🔒 已锁定止损价格: {lockedStopPrice} - 重新计算时将使用此固定价格
              </p>
            )}
          </div>
          
          {/* 快速止损按钮组 - 优化显示 */}
          {!isStopPriceLocked && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground font-medium">快速止损设置</div>
            <div className="space-y-3">
              {/* 百分比止损按钮 */}
              <div>
                <div className="text-xs text-gray-500 mb-2">百分比止损</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickStopWithPercentage(0.5)}
                    className="h-10 text-sm font-medium bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400 transition-all"
                    title="设置0.5%止损距离"
                  >
                    0.5%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickStopWithPercentage(1)}
                    className="h-10 text-sm font-medium bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400 transition-all"
                    title="设置1%止损距离"
                  >
                    1%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickStopWithPercentage(2)}
                    className="h-10 text-sm font-medium bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400 transition-all"
                    title="设置2%止损距离"
                  >
                    2%
                  </Button>
                </div>
              </div>
              
              {/* ATR和PIPS止损按钮 */}
              <div>
                <div className="text-xs text-gray-500 mb-2">动态止损</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleATRStopSet}
                    disabled={isFetchingATR}
                    className="h-10 text-sm font-medium bg-blue-50 hover:bg-blue-100 border-blue-300 hover:border-blue-400 transition-all"
                    title="使用ATR动态止损"
                  >
                    {isFetchingATR ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        获取中
                      </>
                    ) : (
                      'ATR止损'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePipsStopSet}
                    className="h-10 text-sm font-medium bg-green-50 hover:bg-green-100 border-green-300 hover:border-green-400 transition-all"
                    title="使用点差止损"
                  >
                    PIPS止损
                  </Button>
                </div>
              </div>
            </div>
          </div>
          )}
          
          {formErrors.stopPrice && (
            <p className="text-sm text-red-600">{formErrors.stopPrice}</p>
          )}
        </div>

        {/* 初始建仓比例 - Position Scaling */}
        {settings.defaultEnablePositionScaling && settings.defaultPositionScalingPercentages && settings.defaultPositionScalingPercentages.length > 0 && (
          <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">初始建仓比例</Label>
              <div className="text-xs text-muted-foreground">
                当前: <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {initialPositionPercentage}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {(settings.defaultPositionScalingPercentages || []).map((percentage) => (
                <div
                  key={percentage}
                  onClick={() => setInitialPositionPercentage(percentage)}
                  className={`p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    initialPositionPercentage === percentage
                      ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 shadow-sm ring-1 ring-purple-300 dark:ring-purple-600'
                      : 'border-border hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-sm font-bold ${
                      initialPositionPercentage === percentage 
                        ? 'text-purple-700 dark:text-purple-300' 
                        : 'text-foreground'
                    }`}>
                      {percentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      初始仓
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Risk Preview for Compact */}
            {initialPositionPercentage < 100 && (
              <div className="p-2 bg-white dark:bg-gray-900 rounded border border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">风险分配:</span>
                  <div className="text-purple-600 dark:text-purple-400 font-medium">
                    {formData.riskMode === 'FIXED_USDT' 
                      ? `${((Number(formData.riskAmount || '100') * initialPositionPercentage) / 100).toFixed(0)} USDT`
                      : `${((Number(formData.riskPercent || '1') * initialPositionPercentage) / 100).toFixed(2)}%`
                    } (初始)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 重新计算按钮 */}
        <Button
          onClick={handleRecalculate}
          disabled={isCalculating}
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
              <RotateCcw className="w-5 h-5 mr-2" />
              {t('calculate')}
            </>
          )}
        </Button>

        {calculationError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <Calculator className="w-4 h-4" />
            {calculationError}
          </div>
        )}

        {/* 移动止盈止损面板（条件显示） */}
        {showTrailingPanel && (
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-600" />
              移动止盈止损设置
            </h4>
            <TrailingPanel
              enabled={trailingEnabled}
              config={trailingConfig}
              state={trailingState}
              currentPrice={parseFloat(realTimePrice || formData.entryPrice || '0')}
              entryPrice={parseFloat(formData.entryPrice || '0')}
              quantity={0} // 从result中获取，或者使用默认值
              tickSize={marketMeta?.tickSize || 0.01}
              fees={{ open: 0.0004, close: 0.0004 }} // 可以从formData中获取
              onConfigChange={updateTrailingConfig}
              onEnabledChange={setTrailingEnabled}
            />
          </div>
        )}
      </CardContent>
            </Card>

            {/* 右侧：快速复制 */}
            <QuickCopyCard 
              result={result} 
              marketMeta={marketMeta}
            />
          </div>
        </div>

        {/* 下方：保存的参数（条件显示） */}
        {showSavedParams && (
          <div className="w-full">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  原始计算参数
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  来自完整版或快速模式的计算参数设置
                </p>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex flex-wrap gap-4 items-start">
                  <SavedParametersCard savedParams={savedCalculationParams} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
