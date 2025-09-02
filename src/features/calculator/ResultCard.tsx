import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, AlertTriangle, TrendingUp, DollarSign, Calculator, Target } from 'lucide-react';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { calculateExpectedPnL, calculatePosition } from '@/lib/core';
import { getCurrentPrice, getMarketMeta } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';


export function ResultCard() {
  const { 
    result, 
    setResult,
    formData,
    lastCalculationInput,
    currentATR,
    trailingEnabled,
    trailingConfig,
    trailingState,
    isPriceLocked,
    lockedPrice,
    realTimePrice,
    setRealTimePrice,
    lastPriceUpdate,
    setLastPriceUpdate,
    priceChange,
  } = useCalculatorStore();
  
  // Get current price from CalculatorForm's state if available
  const [currentPrice, setCurrentPrice] = React.useState<number | undefined>(undefined);
  const [marketMeta, setMarketMeta] = React.useState<any>(null);
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  
  // Fetch market meta when form data changes - prioritize lastCalculationInput
  React.useEffect(() => {
    const fetchMarketMeta = async () => {
      const exchange = lastCalculationInput?.exchange || formData.exchange;
      const symbol = lastCalculationInput?.symbol || formData.symbol;
      const contractMode = lastCalculationInput?.contractMode || formData.contractMode;
      
      if (exchange && symbol && contractMode) {
        try {
          const instType: InstType = contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const meta = await getMarketMeta(exchange as Exchange, symbol, instType);
          setMarketMeta(meta);
        } catch (error) {
          console.error('Failed to fetch market meta:', error);
          setMarketMeta(null);
        }
      } else {
        setMarketMeta(null);
      }
    };

    fetchMarketMeta();
  }, [formData.exchange, formData.symbol, formData.contractMode, lastCalculationInput?.exchange, lastCalculationInput?.symbol, lastCalculationInput?.contractMode]);
  
  const [copiedItem, setCopiedItem] = React.useState<string>('');

  // Utility functions for formatting values with proper precision
  const formatPrice = (value: string | number | undefined, isPrice = true): string => {
    if (!value) return '0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0.00';
    
    if (marketMeta && isPrice) {
      const tickSize = parseFloat(marketMeta.tickSize || '0.01');
      const decimals = Math.max(0, -Math.log10(tickSize));
      return numValue.toFixed(decimals);
    }
    return numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  };
  
  const formatQuantity = (value: string | number | undefined): string => {
    if (!value) return '0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    
    if (marketMeta) {
      const stepSize = parseFloat(marketMeta.stepSize || '0.001');
      const decimals = Math.max(0, -Math.log10(stepSize));
      return numValue.toFixed(decimals);
    }
    return numValue.toLocaleString();
  };
  
  const formatUSDT = (value: string | number | undefined): string => {
    if (!value) return '0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Price Update Effect - prioritize lastCalculationInput
  React.useEffect(() => {
    const updatePrice = async () => {
      const exchange = lastCalculationInput?.exchange || formData.exchange;
      const symbol = lastCalculationInput?.symbol || formData.symbol;
      const contractMode = lastCalculationInput?.contractMode || formData.contractMode;
      
      if (exchange && symbol) {
        try {
          const instType: InstType = contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const price = await getCurrentPrice(exchange as Exchange, symbol, instType);
          setCurrentPrice(price);
        } catch (error) {
          console.warn('Failed to fetch current price:', error);
          setCurrentPrice(undefined);
        }
      }
    };

    const interval = setInterval(updatePrice, 5000);
    updatePrice();

    return () => clearInterval(interval);
  }, [formData.exchange, formData.symbol, formData.contractMode, lastCalculationInput?.exchange, lastCalculationInput?.symbol, lastCalculationInput?.contractMode]);

  // Copy to clipboard handler
  const handleCopyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(''), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Copy complete order summary
  const handleCopyToClipboard = async () => {
    if (!result) return;

    const symbol = formData.symbol || 'SYMBOL';
    const side = formData.side || 'LONG';
    const entryPrice = result.entryPrice || formData.entryPrice || '0';
    
    let summary = `📊 ${t('positionResults').toUpperCase()}\n`;
    summary += `════════════════════════════════════════\n`;
    summary += `${t('symbol')}: ${symbol}\n`;
    summary += `${t('side')}: ${t(side.toLowerCase())}\n`;
    summary += `${t('entryPrice')}: $${parseFloat(entryPrice).toLocaleString()}\n`;
    summary += `${t('quantity')}: ${result.qtyRounded ? result.qtyRounded.toLocaleString() : '0'}\n`;
    summary += `${t('stopPrice')}: $${result.stopPrice ? parseFloat(result.stopPrice.toString()).toLocaleString() : '0.00'}\n`;
    
    if (result.takeProfitPrice) {
      summary += `${t('takeProfitPrice')}: $${result.takeProfitPrice ? parseFloat(result.takeProfitPrice.toString()).toLocaleString() : '0.00'}\n`;
    }
    
    summary += `${t('leverage')}: ${result.leverage ? (typeof result.leverage === 'string' ? parseFloat(result.leverage) : result.leverage) : formData.leverage || '1'}x\n`;
    summary += `${t('notional')}: $${result.notional ? (typeof result.notional === 'string' ? parseFloat(result.notional) : result.notional).toLocaleString() : '0'}\n`;
    summary += `${t('margin')}: $${result.margin ? (typeof result.margin === 'string' ? parseFloat(result.margin) : result.margin).toLocaleString() : '0'}\n`;
    summary += `${t('maxLoss')}: $${result.stopLossRisk ? Math.abs(parseFloat(String(result.stopLossRisk))).toLocaleString() : '0'}\n`;
    
    if (result.targets && result.targets.length > 0) {
      summary += `\n🎯 ${t('targets').toUpperCase()}\n`;
      result.targets.forEach((target, index) => {
        const isBreakeven = index === 0 || target.isBreakeven;
        const label = isBreakeven ? t('breakeven') : `${t('target')} ${index + 1}`;
        summary += `${label}: $${target.price ? parseFloat(target.price.toString()).toLocaleString() : '0.00'}`;
        if (!isBreakeven) {
          summary += ` (1:${target.rr})`;
        }
        summary += `\n`;
      });
    }
    
    // Market Settings Section - Use actual calculation parameters
    summary += `\n🏦 ${t('orderSummaryMarketSettings').toUpperCase()}\n`;
    summary += `${t('exchange')}: ${t((lastCalculationInput?.exchange || formData.exchange)?.toLowerCase() || 'binance')}\n`;
    summary += `${t('symbol')}: ${lastCalculationInput?.symbol || formData.symbol || symbol}\n`;
    
    // Contract mode translation
    const contractModeMap: Record<string, string> = {
      'SPOT': 'spot',
      'USDT_PERP': 'usdtPerp',
      'INVERSE': 'inverse'
    };
    const contractModeKey = contractModeMap[lastCalculationInput?.contractMode || formData.contractMode || 'USDT_PERP'] || 'spot';
    summary += `${t('contractMode')}: ${t(contractModeKey)}\n`;
    summary += `${t('side')}: ${t(side.toLowerCase())}\n`;
    summary += `${t('orderType')}: ${(lastCalculationInput?.orderType || formData.orderType) === 'MARKET' ? t('marketOrder') : t('limitOrder')}\n`;
    
    // Add fee type for limit orders
    if ((lastCalculationInput?.orderType || formData.orderType) === 'LIMIT' && (lastCalculationInput?.feeType || formData.feeType)) {
      const feeTypeMap = {
        'MAKER': '(全部Maker)',
        'TAKER': '(全部Taker)', 
        'MAKER_OPEN_TAKER_CLOSE': '(开仓Maker,止损Taker)',
        'MAKER_OPEN_ONLY': '(仅开仓Maker)'
      };
      const actualFeeTypeForSummary = lastCalculationInput?.feeType || formData.feeType;
      summary += `费率策略: ${actualFeeTypeForSummary ? feeTypeMap[actualFeeTypeForSummary] || '' : ''}\n`;
    }
    
    // Add fee rates information
    const formatFeeRate = (rate: string) => {
      const percentage = (parseFloat(rate || '0') * 100).toFixed(3);
      return parseFloat(percentage).toString() + '%';
    };
    
    if ((lastCalculationInput?.orderType || formData.orderType) === 'LIMIT' && (lastCalculationInput?.feeType || formData.feeType)) {
      summary += `\n💰 费率详情\n`;
      
      const actualFeeType = lastCalculationInput?.feeType || formData.feeType;
      if (actualFeeType === 'MAKER') {
        summary += `开仓: ${formatFeeRate(lastCalculationInput?.feeOpenMaker || formData.feeOpenMaker || '0.0002')} (Maker)\n`;
        summary += `止损: ${formatFeeRate(lastCalculationInput?.feeCloseMaker || formData.feeCloseMaker || '0.0002')} (Maker)\n`;
        summary += `止盈: ${formatFeeRate(lastCalculationInput?.feeCloseMaker || formData.feeCloseMaker || '0.0002')} (Maker)\n`;
        summary += `滑点: 0% (挂单无滑点)\n`;
      } else if (actualFeeType === 'TAKER') {
        summary += `开仓: ${formatFeeRate(lastCalculationInput?.feeOpenTaker || formData.feeOpenTaker || '0.0006')} (Taker)\n`;
        summary += `止损: ${formatFeeRate(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')} (Taker)\n`;
        summary += `止盈: ${formatFeeRate(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')} (Taker)\n`;
        summary += `滑点: ${formatFeeRate(lastCalculationInput?.slippageOpen || formData.slippageOpen || '0.0005')} + ${formatFeeRate(lastCalculationInput?.slippageClose || formData.slippageClose || '0.0005')}\n`;
      } else if (actualFeeType === 'MAKER_OPEN_TAKER_CLOSE') {
        summary += `开仓: ${formatFeeRate(lastCalculationInput?.feeOpenMaker || formData.feeOpenMaker || '0.0002')} (Maker)\n`;
        summary += `止损: ${formatFeeRate(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')} (Taker)\n`;
        summary += `止盈: ${formatFeeRate(lastCalculationInput?.feeCloseMaker || formData.feeCloseMaker || '0.0002')} (Maker)\n`;
        summary += `滑点: 0% + ${formatFeeRate(lastCalculationInput?.slippageClose || formData.slippageClose || '0.0005')} + 0%\n`;
      } else if (actualFeeType === 'MAKER_OPEN_ONLY') {
        summary += `开仓: ${formatFeeRate(lastCalculationInput?.feeOpenMaker || formData.feeOpenMaker || '0.0002')} (Maker)\n`;
        summary += `止损: ${formatFeeRate(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')} (Taker)\n`;
        summary += `止盈: ${formatFeeRate(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')} (Taker)\n`;
        summary += `滑点: 0% + ${formatFeeRate(lastCalculationInput?.slippageClose || formData.slippageClose || '0.0005')} + ${formatFeeRate(lastCalculationInput?.slippageClose || formData.slippageClose || '0.0005')}\n`;
      }
    }

    summary += `\n⏰ ${new Date().toLocaleString()}\n`;
    summary += `🤖 ${t('generatedBy')} Claude Code`;

    try {
      await navigator.clipboard.writeText(summary);
      setCopiedItem('完整摘要');
      setTimeout(() => setCopiedItem(''), 3000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // Debug: log what we have
  console.log('ResultCard render check:', { 
    hasResult: !!result, 
    hasQtyRounded: !!(result?.qtyRounded), 
    hasStopPrice: !!(result?.stopPrice),
    hasNotional: !!(result?.notional),
    hasMargin: !!(result?.margin),
    result: result 
  });

  if (!result) {
    console.log('ResultCard: No result, not rendering');
    return null;
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto animate-in fade-in duration-300">
      {/* 宽屏横向布局 - 全新架构 */}
      <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 gap-6">
        {/* 1. 入场信息卡片 */}
        <Card className="col-span-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <DollarSign className="w-5 h-5" />
              {t('entrySettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 入场价格 */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('entryPrice')}</p>
              <p className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100">
                ${formatPrice(result.entryPrice || formData.entryPrice)}
              </p>
              {/* 价格状态 */}
              <div className="mt-2">
                {formData.orderType === 'MARKET' && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isPriceLocked 
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                  }`}>
                    {isPriceLocked ? '🔒 Locked' : '📈 Real-time'}
                  </span>
                )}
                {formData.orderType === 'LIMIT' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    📝 限价单
                  </span>
                )}
              </div>
            </div>
            
            {/* 基本信息 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('exchange')}:</span>
                <span className="font-medium">{lastCalculationInput?.exchange || formData.exchange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('symbol')}:</span>
                <span className="font-medium">{lastCalculationInput?.symbol || formData.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('side')}:</span>
                <span className={`font-medium ${(lastCalculationInput?.side || formData.side) === 'LONG' ? 'text-green-600' : 'text-red-600'}`}>
                  {(lastCalculationInput?.side || formData.side) === 'LONG' ? `📈 ${t('long')}` : `📉 ${t('short')}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('leverage')}:</span>
                <span className="font-medium">{result.leverage ? (typeof result.leverage === 'string' ? parseFloat(result.leverage) : result.leverage) : formData.leverage || '1'}x</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. 仓位信息卡片 */}
        <Card className="col-span-1 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Calculator className="w-5 h-5" />
              {t('positionSize')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 开仓数量 */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('roundedQuantity')}</p>
              <p className="text-2xl font-bold font-mono text-green-900 dark:text-green-100">
                {formatQuantity(result.qtyRounded)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                (Raw: {formatQuantity(result.qty)})
              </p>
            </div>
            
            {/* 仓位信息 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('notionalValue')}:</span>
                <span className="font-medium">${formatUSDT(result.notional)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('initialMargin')}:</span>
                <span className="font-medium">${formatUSDT(result.margin || result.initialMargin)}</span>
              </div>
              {result.leverageUsed && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('leverage')} Used:</span>
                  <span className="font-medium">{result.leverageUsed.toFixed(2)}x</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Risk Management Card */}
        <Card className="col-span-1 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-950 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" />
              {t('riskManagement')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 止损价格 */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('stopLoss')}</p>
              <p className="text-2xl font-bold font-mono text-red-900 dark:text-red-100">
                ${formatPrice(result.stopPrice)}
              </p>
            </div>
            
            {/* Risk Information */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('maximumLoss')}:</span>
                <span className="font-medium text-red-600">
                  ${formatUSDT(result.stopLossRisk)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('stopDistance')}:</span>
                <span className="font-medium">
                  {result.stopPrice && result.entryPrice ? (Math.abs((parseFloat(result.stopPrice.toString()) - parseFloat(result.entryPrice || formData.entryPrice || '0')) / parseFloat(result.entryPrice || formData.entryPrice || '0')) * 100).toFixed(2) : '0.00'}%
                </span>
              </div>
              {result.liquidationPrice && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('estLiquidation')}:</span>
                    <span className="font-medium text-orange-600">
                      ${formatPrice(result.liquidationPrice)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. 盈利目标卡片 */}
        <Card className="col-span-1 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Target className="w-5 h-5" />
              {t('riskReward')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 止盈价格 */}
            {result.takeProfitPrice ? (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Take Profit Price</p>
                <p className="text-xl font-bold font-mono text-purple-900 dark:text-purple-100">
                  ${formatPrice(result.takeProfitPrice)}
                </p>
              </div>
            ) : formData.useTakeProfit ? (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">止盈设置</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t('enabled')} but not calculated
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('takeProfitMode')}: {formData.takeProfitMode === 'PRICE' ? t('priceMode') : 
                         formData.takeProfitMode === 'ATR' ? 'ATR' :
                         formData.takeProfitMode === 'RR_RATIO' ? t('rrRatio') : 'Not set'}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{t('takeProfit')}</p>
                <p className="text-sm text-gray-500">Not enabled</p>
              </div>
            )}
            
            {/* Target List */}
            {result.targets && result.targets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">{t('riskReward')}</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.targets.slice(0, 4).map((target, index) => {
                    const isBreakeven = index === 0 || target.isBreakeven;
                    return (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">
                          {isBreakeven ? t('breakeven') : `Target ${index + 1} (1:${target.rr})`}:
                        </span>
                        <span className={`font-mono font-medium ${
                          isBreakeven ? 'text-blue-600' : 'text-emerald-600'
                        }`}>
                          ${formatPrice(target.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 第二行 - 详细分析 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 费率分析卡片 */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <DollarSign className="w-5 h-5" />
              {t('tradingFees')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('orderType')}:</span>
                <span className="font-medium">
                  {(lastCalculationInput?.orderType || formData.orderType) === 'MARKET' ? t('marketOrder') : t('limitOrder')}
                </span>
              </div>
              {(lastCalculationInput?.orderType || formData.orderType) === 'LIMIT' && (lastCalculationInput?.feeType || formData.feeType) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('feeType')}:</span>
                  <span className="font-medium text-xs">
                    {(lastCalculationInput?.feeType || formData.feeType) === 'MAKER' ? t('feeTypeAllMaker') :
                     (lastCalculationInput?.feeType || formData.feeType) === 'TAKER' ? t('feeTypeAllTaker') :
                     (lastCalculationInput?.feeType || formData.feeType) === 'MAKER_OPEN_TAKER_CLOSE' ? t('feeTypeMakerOpenTakerClose') :
                     t('feeTypeMakerOpenOnly')}
                  </span>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('fees')} Calc:</span>
                  <span className="font-medium">
                    {(lastCalculationInput?.includeFees ?? formData.includeFees) ? t('enabled') : 'Disabled'}
                  </span>
                </div>
                
                {(lastCalculationInput?.includeFees ?? formData.includeFees) ? (
                  <>
                    {(lastCalculationInput?.orderType || formData.orderType) === 'LIMIT' && (lastCalculationInput?.feeType || formData.feeType) && (
                      <div className="text-xs space-y-1 p-2 bg-muted/30 rounded">
                        <div className="font-medium text-center">费率策略详情</div>
                        {(lastCalculationInput?.feeType || formData.feeType) === 'MAKER' && (
                          <>
                            <div>开仓: {((parseFloat(lastCalculationInput?.feeOpenMaker || formData.feeOpenMaker || '0.0002')) * 100).toFixed(3)}% (Maker)</div>
                            <div>止损: {((parseFloat(lastCalculationInput?.feeCloseMaker || formData.feeCloseMaker || '0.0002')) * 100).toFixed(3)}% (Maker)</div>
                            <div>滑点: 0% (挂单无滑点)</div>
                          </>
                        )}
                        {(lastCalculationInput?.feeType || formData.feeType) === 'TAKER' && (
                          <>
                            <div>开仓: {((parseFloat(lastCalculationInput?.feeOpenTaker || formData.feeOpenTaker || '0.0006')) * 100).toFixed(3)}% (Taker)</div>
                            <div>止损: {((parseFloat(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')) * 100).toFixed(3)}% (Taker)</div>
                            <div>滑点: {((parseFloat(lastCalculationInput?.slippageOpen || formData.slippageOpen || '0.0005')) * 100).toFixed(3)}%</div>
                          </>
                        )}
                        {(lastCalculationInput?.feeType || formData.feeType) === 'MAKER_OPEN_TAKER_CLOSE' && (
                          <>
                            <div>开仓: {((parseFloat(lastCalculationInput?.feeOpenMaker || formData.feeOpenMaker || '0.0002')) * 100).toFixed(3)}% (Maker)</div>
                            <div>止损: {((parseFloat(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')) * 100).toFixed(3)}% (Taker)</div>
                            <div>滑点: 0% + {((parseFloat(lastCalculationInput?.slippageClose || formData.slippageClose || '0.0005')) * 100).toFixed(3)}%</div>
                          </>
                        )}
                        {(lastCalculationInput?.feeType || formData.feeType) === 'MAKER_OPEN_ONLY' && (
                          <>
                            <div>开仓: {((parseFloat(lastCalculationInput?.feeOpenMaker || formData.feeOpenMaker || '0.0002')) * 100).toFixed(3)}% (Maker)</div>
                            <div>止损: {((parseFloat(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')) * 100).toFixed(3)}% (Taker)</div>
                            <div>止盈: {((parseFloat(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')) * 100).toFixed(3)}% (Taker)</div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {(lastCalculationInput?.orderType || formData.orderType) === 'MARKET' && (
                      <div className="text-xs space-y-1 p-2 bg-muted/30 rounded">
                        <div className="font-medium text-center">市价单费率</div>
                        <div>开仓: {((parseFloat(lastCalculationInput?.feeOpenTaker || formData.feeOpenTaker || '0.0006')) * 100).toFixed(3)}% (Taker)</div>
                        <div>止损: {((parseFloat(lastCalculationInput?.feeCloseTaker || formData.feeCloseTaker || '0.0006')) * 100).toFixed(3)}% (Taker)</div>
                        <div>滑点: {((parseFloat(lastCalculationInput?.slippageOpen || formData.slippageOpen || '0.0005')) * 100).toFixed(3)}%</div>
                      </div>
                    )}
                    
                    {result.totalFees && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">总费用估算:</span>
                        <span className="font-medium text-orange-600">
                          ${formatUSDT(result.totalFees)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground text-center">
                    No fee calculations included
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 风险警告卡片 */}
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-950 dark:to-orange-950 border-yellow-200 dark:border-yellow-800 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="w-5 h-5" />
              {t('riskWarnings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 风险分析摘要 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="font-medium">{t('riskRatio')}</div>
                <div className="text-sm mt-1">
                  {/* Use actual calculation parameters when available */}
                  {(lastCalculationInput?.riskMode || formData.riskMode) === 'ACCOUNT_PERCENT' 
                    ? `${lastCalculationInput?.riskPercent || formData.riskPercent || '0'}%` 
                    : `$${lastCalculationInput?.riskAmount || formData.riskAmount || '0'}`
                  }
                </div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="font-medium">{t('leverageMultiple')}</div>
                <div className="text-sm mt-1">
                  {result.leverage ? (typeof result.leverage === 'string' ? parseFloat(result.leverage) : result.leverage) : (lastCalculationInput?.leverage || formData.leverage || '1')}x
                </div>
              </div>
            </div>
            
            {/* Risk Warnings */}
            {result.warningKeys && result.warningKeys.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                  {t('detectedRiskWarnings', { count: result.warningKeys.length })}
                </div>
                {result.warningKeys.slice(0, 4).map((warningKey, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-white/50 dark:bg-black/20 rounded text-xs">
                    <span className="text-yellow-600 mt-0.5">⚠️</span>
                    <span className="text-yellow-800 dark:text-yellow-200">{t(warningKey)}</span>
                  </div>
                ))}
                {result.warningKeys.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {t('moreWarnings', { count: result.warningKeys.length - 4 })}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-green-600 dark:text-green-400">{t('noMajorRisks')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('positionRelativelySafe')}</p>
              </div>
            )}
            
            {/* Estimated P&L Summary */}
            {result.takeProfitProfit && (
              <div className="pt-2 border-t space-y-1">
                <div className="text-xs font-medium text-center">{t('estimatedPnL')}</div>
                <div className="flex justify-between text-xs">
                  <span>{t('maximumLoss')}:</span>
                  <span className="text-red-600">-${formatUSDT(result.stopLossRisk)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>{t('targetProfit')}:</span>
                  <span className="text-green-600">+${formatUSDT(result.takeProfitProfit)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span>{t('riskRewardRatio')}:</span>
                  <span>1:{result.takeProfitRR ? result.takeProfitRR.toFixed(2) : '0'}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 操作按钮卡片 */}
        <Card className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950 dark:to-gray-950 border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Copy className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="default"
              onClick={handleCopyToClipboard}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Copy className="w-4 h-4 mr-2" />
              {t('copyOrderSummary')}
            </Button>
            
            {/* 快速复制主要信息 */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyValue(result.entryPrice || formData.entryPrice || '0', 'Entry Price')}
                className="text-xs"
              >
                Copy Entry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyValue(result.qtyRounded ? result.qtyRounded.toString() : '0', 'Quantity')}
                className="text-xs"
              >
                Copy Qty
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyValue(result.stopPrice ? String(result.stopPrice) : '0', 'Stop Price')}
                className="text-xs"
              >
                Copy Stop
              </Button>
              {result.takeProfitPrice && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyValue(result.takeProfitPrice ? result.takeProfitPrice.toString() : '0', 'Take Profit Price')}
                  className="text-xs"
                >
                  Copy TP
                </Button>
              )}
            </div>
            
            {/* 时间戳 */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Calculated: {new Date().toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 第三行 - 详细计算分解 */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 lg:grid-cols-1 gap-6">
        
        {/* Stop Loss Breakdown Card */}
        {result.riskBreakdown && (
          <Card className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-950 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-5 h-5" />
                {t('stopLossBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded">
                  <span className="text-muted-foreground">{t('priceRisk')}:</span>
                  <span className="font-medium text-red-600">
                    ${formatUSDT(result.riskBreakdown.priceRisk)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded">
                  <span className="text-muted-foreground">{t('openingFee')}:</span>
                  <span className="font-medium text-orange-600">
                    ${formatUSDT(result.riskBreakdown.openFeeAmount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded">
                  <span className="text-muted-foreground">{t('stopLossFee')}:</span>
                  <span className="font-medium text-orange-600">
                    ${formatUSDT(result.riskBreakdown.closeFeeAmount)}
                  </span>
                </div>
                
                {result.riskBreakdown.slippageAmount && (
                  <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded">
                    <span className="text-muted-foreground">{t('slippageCost')}:</span>
                    <span className="font-medium text-yellow-600">
                      ${formatUSDT(result.riskBreakdown.slippageAmount)}
                    </span>
                  </div>
                )}
                
                {result.riskBreakdown.rebateInfo?.enabled && (
                  <>
                    <div className="border-t pt-2">
                      <div className="text-xs font-medium text-center text-blue-600 mb-2">{t('rebateSavings')}</div>
                      <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                        <span className="text-muted-foreground text-xs">{t('rebatePercentage')}:</span>
                        <span className="font-medium text-blue-600 text-xs">
                          {result.riskBreakdown.rebateInfo.rebatePercent}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded mt-1">
                        <span className="text-muted-foreground text-xs">{t('savingsAmount')}:</span>
                        <span className="font-medium text-green-600 text-xs">
                          +${formatUSDT(result.riskBreakdown.rebateInfo.rebateSavings)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-red-700 dark:text-red-300">{t('totalRiskAmount')}:</span>
                    <span className="text-lg text-red-700 dark:text-red-300">
                      ${formatUSDT(result.stopLossRisk)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Take Profit Breakdown Card */}
        {result.profitBreakdown && result.takeProfitPrice && (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Target className="w-5 h-5" />
                {t('takeProfitBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded">
                  <span className="text-muted-foreground">{t('priceProfit')}:</span>
                  <span className="font-medium text-green-600">
                    ${formatUSDT(result.profitBreakdown.priceProfit)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded">
                  <span className="text-muted-foreground">{t('openingFee')}:</span>
                  <span className="font-medium text-orange-600">
                    ${formatUSDT(result.profitBreakdown.openFeeAmount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded">
                  <span className="text-muted-foreground">{t('takeProfitFee')}:</span>
                  <span className="font-medium text-orange-600">
                    ${formatUSDT(result.profitBreakdown.closeFeeAmount)}
                  </span>
                </div>
                
                {result.profitBreakdown.slippageAmount && (
                  <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-black/20 rounded">
                    <span className="text-muted-foreground">{t('slippageCost')}:</span>
                    <span className="font-medium text-yellow-600">
                      ${formatUSDT(result.profitBreakdown.slippageAmount)}
                    </span>
                  </div>
                )}
                
                {result.profitBreakdown.rebateInfo?.enabled && (
                  <>
                    <div className="border-t pt-2">
                      <div className="text-xs font-medium text-center text-blue-600 mb-2">{t('rebateSavings')}</div>
                      <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                        <span className="text-muted-foreground text-xs">{t('rebatePercentage')}:</span>
                        <span className="font-medium text-blue-600 text-xs">
                          {result.profitBreakdown.rebateInfo.rebatePercent}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded mt-1">
                        <span className="text-muted-foreground text-xs">{t('savingsAmount')}:</span>
                        <span className="font-medium text-green-600 text-xs">
                          +${formatUSDT(result.profitBreakdown.rebateInfo.rebateSavings)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-green-700 dark:text-green-300">{t('netProfitAmount')}:</span>
                    <span className="text-lg text-green-700 dark:text-green-300">
                      +${formatUSDT(result.takeProfitProfit)}
                    </span>
                  </div>
                  {result.takeProfitRR && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-muted-foreground">{t('riskRewardRatio')}:</span>
                      <span className="font-medium">1:{result.takeProfitRR.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}