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
import { calculatePosition } from '@/lib/core';
import { validateNumberString } from '@/lib/validation';
import { getCurrentPrice, getATRValue, getMarketMeta } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';

interface CompactCalculatorFormProps {
  onBackToFull: () => void;
}

export function CompactCalculatorForm({ onBackToFull }: CompactCalculatorFormProps) {
  const {
    formData,
    setFormData,
    result,
    setResult,
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
    // Trailing exits
    trailingEnabled,
    setTrailingEnabled,
    trailingConfig,
    updateTrailingConfig,
    trailingState,
  } = useCalculatorStore();

  const { settings, isOfflineMode, setNotification } = useSettingsStore();
  const { t } = useTranslation();
  
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [marketMeta, setMarketMeta] = useState<any>(null);
  const [showSavedParams, setShowSavedParams] = useState(true);
  const [showTrailingPanel, setShowTrailingPanel] = useState(false);
  const [keepOriginalStopPrice, setKeepOriginalStopPrice] = useState(false);
  const [lockedStopPrice, setLockedStopPrice] = useState<string | null>(null);
  
  // 实时价格显示的独立状态（不受锁定影响）
  const [displayPrice, setDisplayPrice] = useState<string>('');
  const [displayPriceChange, setDisplayPriceChange] = useState<'up' | 'down' | 'same' | null>(null);
  const [displayLastUpdate, setDisplayLastUpdate] = useState<Date | null>(null);
  const [displayPriceDiff, setDisplayPriceDiff] = useState<number>(0);
  const [displayPreviousPrice, setDisplayPreviousPrice] = useState<number>(0);

  // 保存当前计算时使用的所有参数（除了价格和订单类型）
  const [baseSavedCalculationParams] = useState(() => ({
    exchange: formData.exchange,
    symbol: formData.symbol,
    contractMode: formData.contractMode,
    side: formData.side,
    stopMode: formData.stopMode,
    atrPeriod: formData.atrPeriod,
    atrTimeframe: formData.atrTimeframe,
    atrMultiplier: formData.atrMultiplier,
    stopPrice: formData.stopPrice,
    stopPips: formData.stopPips,
    useTakeProfit: formData.useTakeProfit,
    takeProfitMode: formData.takeProfitMode,
    takeProfitPrice: formData.takeProfitPrice,
    takeProfitATRMultiplier: formData.takeProfitATRMultiplier,
    takeProfitRRRatio: formData.takeProfitRRRatio,
    takeProfitPips: formData.takeProfitPips,
    riskMode: formData.riskMode,
    riskAmount: formData.riskAmount,
    accountEquity: formData.accountEquity,
    riskPercent: formData.riskPercent,
    leverage: formData.leverage,
    includeFees: formData.includeFees,
    feeType: formData.feeType,
    feeOpenMaker: formData.feeOpenMaker,
    feeOpenTaker: formData.feeOpenTaker,
    feeCloseMaker: formData.feeCloseMaker,
    feeCloseTaker: formData.feeCloseTaker,
    slippageOpen: formData.slippageOpen,
    slippageClose: formData.slippageClose,
    enableRebate: formData.enableRebate,
    rebatePercent: formData.rebatePercent,
    feeOpen: formData.feeOpen,
    feeClose: formData.feeClose,
    slippage: formData.slippage,
    autoLeverage: formData.autoLeverage,
    maxEquityUsage: formData.maxEquityUsage,
  }));

  // 动态合并当前表单数据与保存参数，用于显示和计算
  const savedCalculationParams = React.useMemo(() => ({
    ...baseSavedCalculationParams,
    // 如果用户选择了新的费率类型，使用新的，否则使用保存的
    feeType: formData.feeType || baseSavedCalculationParams.feeType,
  }), [baseSavedCalculationParams, formData.feeType]);

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

  // 实时价格更新（市价单模式，未锁定时）
  useEffect(() => {
    let priceUpdateInterval: NodeJS.Timeout | null = null;

    if (formData.orderType === 'MARKET' && !isPriceLocked && 
        savedCalculationParams.exchange && savedCalculationParams.symbol && 
        savedCalculationParams.contractMode) {
      
      const updatePrice = async () => {
        try {
          const instType: InstType = savedCalculationParams.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const price = await getCurrentPrice(savedCalculationParams.exchange as Exchange, savedCalculationParams.symbol!, instType);
          
          const oldPrice = parseFloat(realTimePrice || formData.entryPrice || '0');
          setFormData({ entryPrice: price.toString() });
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
  }, [formData.orderType, isPriceLocked, savedCalculationParams.exchange, savedCalculationParams.symbol, savedCalculationParams.contractMode, realTimePrice, formData.entryPrice, setFormData, setRealTimePrice, setLastPriceUpdate, setPriceChange]);

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
  const handleInputChange = (field: 'entryPrice' | 'orderType' | 'stopPrice' | 'feeType', value: string) => {
    if (field === 'entryPrice' || field === 'stopPrice') {
      const validationResult = validateNumberString(value, field);
      if (validationResult) {
        setFormErrors(prev => ({ ...prev, [field]: validationResult }));
        return;
      } else {
        setFormErrors(prev => ({ ...prev, [field]: '' }));
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

  // 价格锁定处理函数（沿用完整版逻辑）
  const handleLockPrice = () => {
    if (realTimePrice) {
      setLockedPrice(realTimePrice);
      setIsPriceLocked(true);
      setNotification('价格已锁定', 'info');
    }
  };

  const handleUnlockPrice = () => {
    setIsPriceLocked(false);
    setLockedPrice(null);
    setNotification('价格已解锁', 'info');
  };

  // 快速止损设置 - 基于保存的计算参数中的止损模式设置止损
  const handleQuickStopSet = async () => {
    if (!formData.entryPrice || !savedCalculationParams.side) {
      setNotification('请先设置入场价格和方向', 'error');
      return;
    }

    const entryPrice = parseFloat(formData.entryPrice);
    if (isNaN(entryPrice)) {
      setNotification('请输入有效的入场价格', 'error');
      return;
    }

    let stopPrice: number;
    let notificationMessage = '';

    try {
      switch (savedCalculationParams.stopMode) {
        case 'PRICE':
          // 如果有保存的止损价格，使用它
          if (savedCalculationParams.stopPrice) {
            stopPrice = parseFloat(savedCalculationParams.stopPrice);
            notificationMessage = '已应用保存的止损价格';
          } else {
            // 价格止损模式使用0.5%的止损距离
            const stopDistance = entryPrice * 0.005;
            const rawStopPrice = savedCalculationParams.side === 'LONG' 
              ? entryPrice - stopDistance 
              : entryPrice + stopDistance;
            // 根据tickSize格式化
            stopPrice = parseFloat(formatPriceWithTickSize(rawStopPrice, marketMeta?.tickSize));
            notificationMessage = '已设置0.5%止损距离';
          }
          break;

        case 'ATR':
          // 基于ATR计算止损
          if (currentATR && savedCalculationParams.atrMultiplier) {
            const atrValue = parseFloat(currentATR);
            const multiplier = parseFloat(savedCalculationParams.atrMultiplier);
            const atrDistance = atrValue * multiplier;
            
            const rawStopPrice = savedCalculationParams.side === 'LONG'
              ? entryPrice - atrDistance
              : entryPrice + atrDistance;
            // 根据tickSize格式化
            stopPrice = parseFloat(formatPriceWithTickSize(rawStopPrice, marketMeta?.tickSize));
            notificationMessage = `已设置ATR止损 (${multiplier}x ATR)`;
          } else {
            setNotification('ATR数据不可用，请先获取ATR数据', 'error');
            return;
          }
          break;

        case 'PIPS':
          // 基于PIPS计算止损
          if (savedCalculationParams.stopPips && marketMeta) {
            const pips = parseFloat(savedCalculationParams.stopPips);
            const tickSize = parseFloat(marketMeta.tickSize);
            const pipsDistance = pips * tickSize;
            
            const rawStopPrice = savedCalculationParams.side === 'LONG'
              ? entryPrice - pipsDistance
              : entryPrice + pipsDistance;
            // 根据tickSize格式化
            stopPrice = parseFloat(formatPriceWithTickSize(rawStopPrice, marketMeta.tickSize));
            notificationMessage = `已设置${pips}点止损`;
          } else {
            setNotification('PIPS止损参数不完整或市场数据不可用', 'error');
            return;
          }
          break;

        default:
          // 默认情况：使用2%止损
          const stopDistance = entryPrice * 0.02;
          const rawStopPrice = savedCalculationParams.side === 'LONG'
            ? entryPrice - stopDistance
            : entryPrice + stopDistance;
          // 根据tickSize格式化
          stopPrice = parseFloat(formatPriceWithTickSize(rawStopPrice, marketMeta?.tickSize));
          notificationMessage = '已设置2%默认止损距离';
          break;
      }

      // 更新止损价格
      setFormData({ stopPrice: stopPrice.toString() });
      setNotification(notificationMessage, 'success');
      
    } catch (error) {
      console.error('快速止损计算错误:', error);
      setNotification('止损计算失败，请检查参数', 'error');
    }
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

  // 获取止损模式描述
  const getStopModeDescription = () => {
    switch (savedCalculationParams.stopMode) {
      case 'PRICE':
        return savedCalculationParams.stopPrice ? '保存止损' : '0.5%止损';
      case 'ATR':
        const multiplier = savedCalculationParams.atrMultiplier || '2';
        return `${multiplier}x ATR`;
      case 'PIPS':
        const pips = savedCalculationParams.stopPips || '50';
        return `${pips}点止损`;
      default:
        return '快速止损';
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
      // 获取ATR值（如果需要）
      let atrValue = currentATR;
      if (savedCalculationParams.stopMode === 'ATR' && !atrValue && !isOfflineMode) {
        try {
          const fetchedATR = await getATRValue(
            savedCalculationParams.exchange as Exchange,
            savedCalculationParams.symbol!,
            savedCalculationParams.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP',
            (savedCalculationParams.atrTimeframe || '15m') as any,
            (savedCalculationParams.atrPeriod || 14) as any
          );
          atrValue = fetchedATR.toString();
          setCurrentATR(atrValue);
        } catch (error) {
          console.warn('Failed to fetch ATR, using fallback calculation');
        }
      }

      // 使用保存的参数和当前的价格、订单类型进行计算
      // 止损价格处理逻辑：
      // 1. 如果锁定原止损价格选项开启，直接使用保存的止损设置
      // 2. 如果用户手动输入了止损价格，则强制使用PRICE模式
      // 3. 如果止损价格为空，则沿用原本的止损价格不做更改
      let effectiveStopMode: 'PRICE' | 'ATR' | 'PIPS';
      let effectiveStopPrice: string | undefined;
      
      if (keepOriginalStopPrice && lockedStopPrice) {
        // 锁定当前结果中的止损价格数值，强制使用PRICE模式
        effectiveStopMode = 'PRICE';
        effectiveStopPrice = lockedStopPrice;
      } else {
        // 正常逻辑：支持手动输入覆盖
        const userInputStopPrice = formData.stopPrice;
        effectiveStopMode = userInputStopPrice ? 'PRICE' : ((savedCalculationParams.stopMode || 'ATR') as 'PRICE' | 'ATR' | 'PIPS');
        effectiveStopPrice = userInputStopPrice || savedCalculationParams.stopPrice;
      }
      
      const input = {
        side: savedCalculationParams.side!,
        entryPrice: formData.entryPrice!,
        stopPrice: effectiveStopPrice,
        atr: atrValue || undefined,
        atrMultiplier: savedCalculationParams.atrMultiplier,
        stopPips: savedCalculationParams.stopPips,
        stopMode: effectiveStopMode,
        useTakeProfit: savedCalculationParams.useTakeProfit || false,
        takeProfitMode: savedCalculationParams.takeProfitMode,
        takeProfitPrice: savedCalculationParams.takeProfitPrice,
        takeProfitATRMultiplier: savedCalculationParams.takeProfitATRMultiplier,
        takeProfitRRRatio: savedCalculationParams.takeProfitRRRatio,
        takeProfitPips: savedCalculationParams.takeProfitPips,
        riskMode: savedCalculationParams.riskMode || 'FIXED_USDT',
        riskUSDT: savedCalculationParams.riskMode === 'FIXED_USDT' ? savedCalculationParams.riskAmount : undefined,
        accountEquity: savedCalculationParams.riskMode === 'ACCOUNT_PERCENT' ? savedCalculationParams.accountEquity : undefined,
        riskPercent: savedCalculationParams.riskMode === 'ACCOUNT_PERCENT' ? savedCalculationParams.riskPercent : undefined,
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
            快速计算
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
              <span className="text-xs whitespace-nowrap">返回完整</span>
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

        {/* 入场价格 */}
        <div className="space-y-2">
          <Label htmlFor="entryPrice">
            {t('entryPrice')}
          </Label>
          <div className="flex gap-2">
            <Input
              id="entryPrice"
              type="text"
              value={formData.entryPrice || ''}
              onChange={(e) => handleInputChange('entryPrice', e.target.value)}
              placeholder={formData.orderType === 'MARKET' ? t('getCurrentPrice') : t('enterPrice')}
              className={
                priceChange === 'up' ? 'border-green-400 bg-green-50' : 
                priceChange === 'down' ? 'border-red-400 bg-red-50' :
                formData.orderType === 'MARKET' && !isPriceLocked ? 'border-blue-300 bg-blue-50' :
                isPriceLocked ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : ''
              }
              disabled={formData.orderType === 'MARKET' && !isPriceLocked}
              readOnly={formData.orderType === 'MARKET' && !isPriceLocked}
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

            
            {/* Price Lock Button for Market Orders */}
            {formData.orderType === 'MARKET' && realTimePrice && (
              <Button
                type="button"
                variant={isPriceLocked ? "default" : "outline"}
                onClick={isPriceLocked ? handleUnlockPrice : handleLockPrice}
                className={`px-3 ${
                  isPriceLocked 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                title={isPriceLocked ? '解锁价格' : '锁定价格'}
              >
                {isPriceLocked ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
          {formErrors.entryPrice && (
            <p className="text-sm text-red-600">{formErrors.entryPrice}</p>
          )}
          {priceError && (
            <p className="text-sm text-red-600">{priceError}</p>
          )}
          
          {/* 市价单锁定状态显示 */}
          {formData.orderType === 'MARKET' && (
            <>
              {isPriceLocked ? (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                  🔒 价格已锁定在 ${lockedPrice} - 点击"解锁"按钮恢复实时价格更新
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  📈 市价单使用锁定价格计算 - 点击"锁定"按钮固定当前价格
                </p>
              )}
            </>
          )}
        </div>

        {/* 止损设置 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="stopPrice">{t('stopPrice')}</Label>
            <Button
              type="button"
              variant={keepOriginalStopPrice ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!keepOriginalStopPrice) {
                  // 锁定时：使用当前结果中的止损价格
                  const currentStopPrice = result?.stopPrice || savedCalculationParams.stopPrice || null;
                  setLockedStopPrice(currentStopPrice);
                  setKeepOriginalStopPrice(true);
                } else {
                  // 解锁时：清除锁定的止损价格
                  setLockedStopPrice(null);
                  setKeepOriginalStopPrice(false);
                }
              }}
              className={`flex items-center gap-2 text-xs px-3 ${
                keepOriginalStopPrice 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'border-gray-300'
              }`}
              title={keepOriginalStopPrice ? '解锁止损价格修改' : '锁定当前结果中的止损价格'}
              disabled={!result && !savedCalculationParams.stopPrice}
            >
              {keepOriginalStopPrice ? (
                <>
                  <Lock className="w-3 h-3" />
                  锁定止损
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" />
                  可修改止损
                </>
              )}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              id="stopPrice"
              type="text"
              value={formData.stopPrice || ''}
              onChange={(e) => handleInputChange('stopPrice', e.target.value)}
              placeholder={keepOriginalStopPrice ? "已锁定原止损设置" : "输入止损价格"}
              className={`flex-1 ${keepOriginalStopPrice ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : ''}`}
              disabled={keepOriginalStopPrice}
              readOnly={keepOriginalStopPrice}
            />
            {/* 快速设置按钮 */}
            <Button
              type="button"
              variant="outline"
              onClick={handleQuickStopSet}
              disabled={keepOriginalStopPrice}
              className="flex items-center gap-2 px-4 whitespace-nowrap"
              title={keepOriginalStopPrice ? "已锁定原止损设置" : `快速设置止损 (${getStopModeDescription()})`}
            >
              <Calculator className="w-4 h-4" />
              <span className="text-xs whitespace-nowrap">
                {getStopModeDescription()}
              </span>
            </Button>
          </div>
          
          {/* 价格止损模式的快速设置按钮组 */}
          {savedCalculationParams.stopMode === 'PRICE' && !keepOriginalStopPrice && (
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
          )}
          
          {/* 锁定状态提示 */}
          {keepOriginalStopPrice && lockedStopPrice && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
              🔒 已锁定结果中的止损价格 ({lockedStopPrice}) - 重新计算时将使用此固定价格
            </p>
          )}
          
          {formErrors.stopPrice && (
            <p className="text-sm text-red-600">{formErrors.stopPrice}</p>
          )}
        </div>

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
              entryPrice={formData.entryPrice || ''} 
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
                  保存的计算参数
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  当前计算使用的所有设置参数
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
