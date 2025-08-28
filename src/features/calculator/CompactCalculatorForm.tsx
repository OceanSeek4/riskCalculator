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
  const [autoUpdatePrice, setAutoUpdatePrice] = useState(false);
  const [showSavedParams, setShowSavedParams] = useState(true);
  const [showTrailingPanel, setShowTrailingPanel] = useState(false);

  // 保存当前计算时使用的所有参数（除了价格和订单类型）
  const [savedCalculationParams] = useState(() => ({
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

  // 实时价格更新（市价单模式）
  useEffect(() => {
    let priceUpdateInterval: NodeJS.Timeout | null = null;

    if (formData.orderType === 'MARKET' && autoUpdatePrice && 
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
  }, [formData.orderType, autoUpdatePrice, savedCalculationParams.exchange, savedCalculationParams.symbol, savedCalculationParams.contractMode, realTimePrice, formData.entryPrice, setFormData, setRealTimePrice, setLastPriceUpdate, setPriceChange]);

  // 表单输入处理
  const handleInputChange = (field: 'entryPrice' | 'orderType', value: string) => {
    if (field === 'entryPrice') {
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
      const input = {
        side: savedCalculationParams.side!,
        entryPrice: formData.entryPrice!,
        stopPrice: savedCalculationParams.stopPrice,
        atr: atrValue || undefined,
        atrMultiplier: savedCalculationParams.atrMultiplier,
        stopPips: savedCalculationParams.stopPips,
        stopMode: savedCalculationParams.stopMode || 'ATR',
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
        feeType: savedCalculationParams.feeType || 'MAKER_OPEN_TAKER_CLOSE',
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 whitespace-nowrap">
            <Calculator className="w-5 h-5 text-blue-600" />
            快速重新计算
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

            {/* 实时更新切换按钮（仅市价单） */}
            {formData.orderType === 'MARKET' && (
              <Button
                type="button"
                variant={autoUpdatePrice ? "default" : "outline"}
                onClick={() => setAutoUpdatePrice(!autoUpdatePrice)}
                className="flex items-center gap-2 px-4 whitespace-nowrap"
                title={autoUpdatePrice ? '停止实时更新' : '开始实时更新'}
              >
                <div className={`w-2 h-2 rounded-full ${autoUpdatePrice ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-xs whitespace-nowrap">{autoUpdatePrice ? '实时' : '手动'}</span>
              </Button>
            )}
            
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

        {/* 实时价格状态显示 */}
        {formData.orderType === 'MARKET' && autoUpdatePrice && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-700 dark:text-green-300">实时价格更新中</span>
            </div>
            {lastPriceUpdate && (
              <span className="text-xs text-green-600 dark:text-green-400">
                最后更新: {lastPriceUpdate.toLocaleTimeString()}
              </span>
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
重新计算
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
