import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, AlertTriangle, TrendingUp, DollarSign, Calculator, Target } from 'lucide-react';
import { useCalculatorStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { calculateExpectedPnL } from '@/lib/core';
import { getCurrentPrice } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';

export function ResultCard() {
  const { 
    result, 
    formData,
    currentATR,
    trailingEnabled,
    trailingConfig,
    trailingState,
  } = useCalculatorStore();
  
  // Get current price from CalculatorForm's state if available
  const [currentPrice, setCurrentPrice] = React.useState<number | undefined>(undefined);
  const { t } = useTranslation();
  
  // Fetch current price when trailing is enabled
  React.useEffect(() => {
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
          console.error('Failed to fetch current price for trailing results:', error);
        }
      }
    };

    fetchPrice();
    
    // Update price every 5 seconds when trailing is enabled
    const interval = setInterval(fetchPrice, 5000);
    
    return () => clearInterval(interval);
  }, [trailingEnabled, formData.exchange, formData.symbol, formData.contractMode]);

  const generateLocalizedOrderSummary = (result: any) => {
    if (!result) return '';
    
    // Extract side and symbol from original order summary (for backward compatibility)
    const side = result.orderSummary.match(/^(LONG|SHORT)/)?.[1] || '';
    const symbol = result.orderSummary.match(/(LONG|SHORT)\s+(\S+)/)?.[2] || '';
    
    // Extract stepSize and tickSize from original order summary
    const stepSizeMatch = result.orderSummary.match(/stepSize=([^,\s]+)/);
    const tickSizeMatch = result.orderSummary.match(/tickSize=([^\s\n]+)/);
    
    // Generate timestamp
    const now = new Date();
    const timestamp = now.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    let summary = `📈 ${t('orderSummary').toUpperCase()}\n`;
    summary += `${'='.repeat(40)}\n`;
    
    // Market Settings Section
    summary += `\n🏦 ${t('orderSummaryMarketSettings').toUpperCase()}\n`;
    summary += `${t('exchange')}: ${t(formData.exchange?.toLowerCase() || 'binance')}\n`;
    summary += `${t('symbol')}: ${formData.symbol || symbol}\n`;
    
    // Contract mode translation
    const contractModeMap: Record<string, string> = {
      'SPOT': 'spot',
      'USDT_PERP': 'usdtPerp',
      'INVERSE': 'inverse'
    };
    const contractModeKey = contractModeMap[formData.contractMode || 'USDT_PERP'] || 'spot';
    summary += `${t('contractMode')}: ${t(contractModeKey)}\n`;
    summary += `${t('side')}: ${t(side.toLowerCase())}\n`;
    summary += `${t('orderType')}: ${formData.orderType === 'MARKET' ? t('marketOrder') : t('limitOrder')}\n`;
    
    // Timestamp
    summary += `${t('orderSummaryGeneratedAt')}: ${timestamp}\n`;
    
    summary += `\n💼 ${t('positionResults').toUpperCase()}\n`;
    
    // Basic Position Info
    summary += `${t('orderSummaryEntry')}: $${parseFloat(result.entryPrice || '0').toLocaleString()}\n`;
    summary += `${t('orderSummaryQty')}: ${result.qtyRoundedFormatted} | ${t('orderSummaryNotional')}: ${parseFloat(result.notional || '0').toLocaleString()} USDT\n`;
    
    // Add leverage and margin if available
    if (result.initialMargin) {
      const leverage = Math.round(parseFloat(result.notional) / parseFloat(result.initialMargin));
      summary += `${t('orderSummaryLeverage')}: ${leverage}x | ${t('orderSummaryMargin')}: ${parseFloat(result.initialMargin).toLocaleString()} USDT\n`;
    }
    
    // Add liquidation price if available
    if (result.liquidationPrice) {
      summary += `${t('orderSummaryEstLiquidation')}: $${result.liquidationPriceFormatted || parseFloat(result.liquidationPrice).toLocaleString()}\n`;
    }
    
    summary += `\n📊 ${t('orderSummaryStopMode').toUpperCase()}\n`;
    // Stop Loss Mode and Settings
    const stopModeMap: Record<string, string> = {
      'PRICE': 'orderSummaryStopModePrice',
      'ATR': 'orderSummaryStopModeATR', 
      'PIPS': 'orderSummaryStopModePIPS'
    };
    const stopModeKey = stopModeMap[formData.stopMode || 'PRICE'] || 'orderSummaryStopModePrice';
    summary += `${t('orderSummaryStopMode')}: ${t(stopModeKey)}\n`;
    summary += `${t('orderSummaryStop')}: $${result.stopPriceFormatted}\n`;
    
    // Add stop mode specific settings
    if (formData.stopMode === 'ATR') {
      summary += `ATR ${t('period')}: ${formData.atrPeriod} | ${t('timeframe')}: ${formData.atrTimeframe} | ${t('multiplier')}: ${formData.atrMultiplier}\n`;
      if (currentATR) {
        summary += `ATR ${t('value')}: ${parseFloat(currentATR).toFixed(4)}\n`;
      }
    } else if (formData.stopMode === 'PIPS') {
      summary += `${t('stopDistance')}: ${formData.stopPips} PIPS\n`;
    }
    
    // Stop Loss Risk Information
    if (result.stopLossRisk) {
      summary += `\n🔥 ${t('orderSummaryStopLossRisk').toUpperCase()}\n`;
      summary += `${t('orderSummaryStopLossRisk')}: $${result.stopLossRiskFormatted || parseFloat(result.stopLossRisk).toLocaleString()}\n`;
      
      // Risk breakdown if available
      if (result.riskBreakdown) {
        summary += `├─ ${t('priceRisk')}: $${result.riskBreakdown.priceRiskFormatted}\n`;
        if (result.includeFees) {
          if (parseFloat(result.riskBreakdown.openFeeAmount) > 0) {
            summary += `├─ ${t('openFee')}: $${result.riskBreakdown.openFeeAmountFormatted}\n`;
          }
          if (parseFloat(result.riskBreakdown.closeFeeAmount) > 0) {
            summary += `├─ ${t('closeFee')}: $${result.riskBreakdown.closeFeeAmountFormatted}\n`;
          }
          if (result.riskBreakdown.slippageAmount && parseFloat(result.riskBreakdown.slippageAmount) > 0) {
            summary += `├─ ${t('slippage')}: $${result.riskBreakdown.slippageAmountFormatted}\n`;
          }
        }
        summary += `└─ ${t('total')}: $${result.actualRiskAmountFormatted}\n`;
      }
    }
    
    // Take Profit Mode and Expected Profit
    if (formData.useTakeProfit && formData.takeProfitMode) {
      summary += `\n🎯 ${t('orderSummaryTakeProfitMode').toUpperCase()}\n`;
      
      const tpModeMap: Record<string, string> = {
        'PRICE': 'orderSummaryTPModePrice',
        'ATR': 'orderSummaryTPModeATR',
        'RR_RATIO': 'orderSummaryTPModeRR',
        'PIPS': 'orderSummaryTPModePIPS'
      };
      const tpModeKey = tpModeMap[formData.takeProfitMode] || 'orderSummaryTPModeRR';
      summary += `${t('orderSummaryTakeProfitMode')}: ${t(tpModeKey)}\n`;
      
      // Add take profit mode specific settings
      if (formData.takeProfitMode === 'PRICE' && formData.takeProfitPrice) {
        summary += `${t('takeProfitPrice')}: $${parseFloat(formData.takeProfitPrice).toLocaleString()}\n`;
      } else if (formData.takeProfitMode === 'ATR' && formData.takeProfitATRMultiplier) {
        summary += `ATR ${t('multiplier')}: ${formData.takeProfitATRMultiplier}\n`;
      } else if (formData.takeProfitMode === 'RR_RATIO' && formData.takeProfitRRRatio) {
        summary += `${t('orderSummaryRRRatio')}: 1:${formData.takeProfitRRRatio}\n`;
      } else if (formData.takeProfitMode === 'PIPS' && formData.takeProfitPips) {
        summary += `${t('takeProfitDistance')}: ${formData.takeProfitPips} PIPS\n`;
      }
      
      // Expected Take Profit and Profit
      if (result.takeProfitPrice) {
        summary += `${t('takeProfitPrice')}: $${result.takeProfitPriceFormatted || parseFloat(result.takeProfitPrice).toLocaleString()}\n`;
        
        if (result.takeProfitProfit) {
          summary += `${t('orderSummaryExpectedProfit')}: +$${result.takeProfitProfitFormatted || parseFloat(result.takeProfitProfit).toLocaleString()}\n`;
          
          // Profit breakdown if available
          if (result.profitBreakdown) {
            summary += `├─ ${t('priceProfit')}: +$${result.profitBreakdown.priceProfitFormatted}\n`;
            if (result.includeFees) {
              if (parseFloat(result.profitBreakdown.openFeeAmount) < 0) {
                summary += `├─ ${t('openFee')}: ${result.profitBreakdown.openFeeAmountFormatted}\n`;
              }
              if (parseFloat(result.profitBreakdown.closeFeeAmount) < 0) {
                summary += `├─ ${t('closeFee')}: ${result.profitBreakdown.closeFeeAmountFormatted}\n`;
              }
              if (result.profitBreakdown.slippageAmount && parseFloat(result.profitBreakdown.slippageAmount) < 0) {
                summary += `├─ ${t('slippage')}: ${result.profitBreakdown.slippageAmountFormatted}\n`;
              }
            }
            summary += `└─ ${t('netProfit')}: +$${result.takeProfitProfitFormatted}\n`;
          }
        }
        
        // Risk/Reward Ratio
        if (result.takeProfitRR) {
          summary += `${t('orderSummaryRRRatio')}: 1:${result.takeProfitRR.toFixed(2)}\n`;
        }
      }
    }
    
    // All Targets
    if (result.targets && result.targets.length > 0) {
      summary += `\n🎯 ${t('orderSummaryAllTargets').toUpperCase()}\n`;
      result.targets.forEach((target: any, index: number) => {
        const prefix = index === result.targets.length - 1 ? '└─' : '├─';
        if (target.isBreakeven) {
          summary += `${prefix} ${t('orderSummaryBreakeven')}: $${target.priceFormatted}\n`;
        } else {
          summary += `${prefix} ${t('orderSummaryTarget')} 1:${target.rr}: $${target.priceFormatted}\n`;
        }
      });
    }
    
    // Compliance and Warnings
    summary += `\n📋 ${t('orderSummaryCompliance').toUpperCase()}\n`;
    if (stepSizeMatch && tickSizeMatch) {
      summary += `stepSize=${stepSizeMatch[1]}, tickSize=${tickSizeMatch[1]}\n`;
    }
    
    if (result.warningKeys && result.warningKeys.length > 0) {
      summary += `\n⚠️  ${t('orderSummaryWarnings').toUpperCase()}\n`;
      result.warningKeys.forEach((key: string, index: number) => {
        const prefix = index === result.warningKeys.length - 1 ? '└─' : '├─';
        summary += `${prefix} ${t(key)}\n`;
      });
    }
    
    summary += `\n${t('orderSummaryNote')}`;
    
    return summary;
  };

  const handleCopyToClipboard = async () => {
    if (!result) return;
    
    try {
      const localizedSummary = generateLocalizedOrderSummary(result);
      await navigator.clipboard.writeText(localizedSummary);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleCopyValue = async (value: string, type: string) => {
    try {
      await navigator.clipboard.writeText(value);
      // TODO: Add toast notification for better UX
    } catch (error) {
      console.error('Failed to copy value:', error);
    }
  };

  if (!result) {
    return (
      <Card className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {t('results')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
          {t('enterAndCalculate')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl space-y-5 animate-in fade-in duration-300">
      {/* Main Position Card */}
      <Card className="animate-in slide-in-from-top-2 duration-300 hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" />
            {t('positionResults')}
          </CardTitle>
          
          {/* Enhanced Entry Price Display */}
          <div 
            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900 dark:hover:to-indigo-900 transition-all duration-200 cursor-pointer"
            onClick={() => handleCopyValue(parseFloat(result.entryPrice || formData.entryPrice || '0').toString(), 'Entry Price')}
            title={t('clickToCopy')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 text-white rounded-full">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium">
                    {formData.orderType === 'MARKET' ? t('entryPriceResult') : t('entryPriceLimit')}
                  </p>
                  <p className="text-lg font-bold font-mono text-blue-900 dark:text-blue-100">
                    ${parseFloat(result.entryPrice || formData.entryPrice || '0').toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {formData.orderType === 'MARKET' && result.entryPrice && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    {t('lockedAtCalculation')}
                  </div>
                )}
                {formData.orderType === 'LIMIT' && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {t('limitOrder')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              className="p-4 bg-muted/50 rounded-lg animate-in slide-in-from-left-2 duration-400 hover:bg-muted/70 transition-colors duration-200 cursor-pointer"
              onClick={() => handleCopyValue(result.qtyRoundedFormatted, 'Position Quantity')}
              title={t('clickToCopy')}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('roundedQuantity')}</p>
              <p className="text-xl font-bold font-mono mt-1">{result.qtyRoundedFormatted}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('rawQuantityPrefix')}: {parseFloat(result.qtyRaw).toFixed(8)}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg animate-in slide-in-from-right-2 duration-400 hover:bg-muted/70 transition-colors duration-200 cursor-pointer">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('notionalValue')}</p>
              <p className="text-xl font-bold mt-1">${parseFloat(result.notional).toLocaleString()}</p>
            </div>
          </div>

          {/* Stop Price */}
          <div 
            className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800 animate-in slide-in-from-bottom-2 duration-500 hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200 cursor-pointer"
            onClick={() => handleCopyValue(result.stopPriceFormatted, 'Stop Loss Price')}
            title={t('clickToCopy')}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm font-medium text-red-900 dark:text-red-100">{t('stopLoss')}</p>
            </div>
            <p className="text-xl font-bold font-mono text-red-600">${result.stopPriceFormatted}</p>
          </div>

          {/* Stop Loss Risk */}
          {result.stopLossRisk && (
            <div 
              className="p-4 bg-red-100 dark:bg-red-900 rounded-lg border border-red-300 dark:border-red-700 animate-in slide-in-from-bottom-3 duration-600 hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200 cursor-pointer"
              onClick={() => handleCopyValue(result.stopLossRisk || '0', 'Stop Loss Risk')}
              title={t('clickToCopy')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 text-red-700">⚠️</div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{t('stopLossRisk')}</p>
              </div>
              <p className="text-xl font-bold font-mono text-red-700 dark:text-red-300 mb-2">
                ${result.stopLossRiskFormatted || parseFloat(result.stopLossRisk).toLocaleString()}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {t('maxPotentialLoss')} {result.includeFees ? `(${t('includesFees')})` : ''}
              </p>
              {/* Risk Calculation Verification */}
              {result.actualRiskAmount && result.riskBreakdown && (
                <div className="mt-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950 p-3 rounded border border-red-200 dark:border-red-800">
                  <div className="flex justify-between font-medium mb-2">
                    <span>实际计算:</span>
                    <span className="font-mono">${result.actualRiskAmountFormatted}</span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    {/* 价格风险 */}
                    <div className="flex justify-between">
                      <span>价格风险 (数量×点差):</span>
                      <span className="font-mono">${result.riskBreakdown.priceRiskFormatted}</span>
                    </div>
                    
                    {/* 开仓手续费 */}
                    {result.includeFees && parseFloat(result.riskBreakdown.openFeeAmount) > 0 && (
                      <div className="flex justify-between">
                        <span>开仓手续费:</span>
                        <span className="font-mono">${result.riskBreakdown.openFeeAmountFormatted}</span>
                      </div>
                    )}
                    
                    {/* 平仓手续费 */}
                    {result.includeFees && parseFloat(result.riskBreakdown.closeFeeAmount) > 0 && (
                      <div className="flex justify-between">
                        <span>平仓手续费:</span>
                        <span className="font-mono">${result.riskBreakdown.closeFeeAmountFormatted}</span>
                      </div>
                    )}
                    
                    {/* 滑点成本 */}
                    {result.includeFees && result.riskBreakdown.slippageAmount && parseFloat(result.riskBreakdown.slippageAmount) > 0 && (
                      <div className="flex justify-between">
                        <span>滑点成本:</span>
                        <span className="font-mono">${result.riskBreakdown.slippageAmountFormatted}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-red-300 dark:border-red-700 pt-1 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>总计:</span>
                        <span className="font-mono">${result.actualRiskAmountFormatted}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contract Details */}
          {result.initialMargin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 animate-in slide-in-from-left-4 duration-600 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors duration-200 cursor-pointer"
                onClick={() => handleCopyValue(parseFloat(result.initialMargin || '0').toString(), 'Initial Margin')}
                title={t('clickToCopy')}
              >
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium">{t('initialMargin')}</p>
                <p className="text-lg font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
                  ${parseFloat(result.initialMargin).toLocaleString()}
                </p>
              </div>
              {result.liquidationPrice && (
                <div 
                  className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800 animate-in slide-in-from-right-4 duration-600 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors duration-200 cursor-pointer"
                  onClick={() => handleCopyValue(result.liquidationPriceFormatted || result.liquidationPrice || '0', 'Liquidation Price')}
                  title={t('clickToCopy')}
                >
                  <p className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide font-medium">{t('estLiquidation')}</p>
                  <p className="text-lg font-bold font-mono text-orange-900 dark:text-orange-100 mt-1">
                    ${result.liquidationPriceFormatted || result.liquidationPrice || '0'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Trading Fees */}
          {result.includeFees && result.totalFees && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800 animate-in slide-in-from-bottom-3 duration-700 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors duration-200 cursor-pointer"
                 onClick={() => handleCopyValue(parseFloat(result.totalFees || '0').toString(), 'Total Fees')}
                 title={t('clickToCopy')}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 text-purple-600">💰</div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">{t('tradingFees')}</p>
              </div>
              <p className="text-lg font-bold font-mono text-purple-600 mb-2">
                ${parseFloat(result.totalFees).toLocaleString()}
              </p>
              <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                <div className="flex justify-between">
                  <span>{t('openFee')}:</span>
                  <span>${parseFloat(result.openFee || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('closeFee')}:</span>
                  <span>${parseFloat(result.closeFee || '0').toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expected Take Profit */}
      {result.takeProfitPrice && (
        <Card className="animate-in slide-in-from-top-3 duration-400 hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              {t('expectedTakeProfit')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 transition-colors duration-200 cursor-pointer"
              onClick={() => handleCopyValue(result.takeProfitPriceFormatted || result.takeProfitPrice || '', 'Take Profit Price')}
              title={t('clickToCopy')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 text-green-600">🎯</div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">{t('takeProfitPrice')}</p>
              </div>
              <p className="text-xl font-bold font-mono text-green-600 mb-2">
                ${result.takeProfitPriceFormatted || parseFloat(result.takeProfitPrice).toLocaleString()}
              </p>
              
              {/* Expected Profit Amount */}
              {result.takeProfitProfit && (
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded border border-green-300 dark:border-green-700 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 text-green-700">💰</div>
                    <p className="text-xs font-medium text-green-800 dark:text-green-200">{t('expectedProfit')}</p>
                  </div>
                  <p className="text-lg font-bold font-mono text-green-700 dark:text-green-300 mb-2">
                    +${result.takeProfitProfitFormatted || parseFloat(result.takeProfitProfit).toLocaleString()}
                  </p>
                  
                  {/* Profit Calculation Details */}
                  {result.profitBreakdown && (
                    <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800 mt-2">
                      <div className="flex justify-between font-medium mb-1">
                        <span>盈利计算:</span>
                        <span className="font-mono">+${result.takeProfitProfitFormatted}</span>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        {/* 价格盈利 */}
                        <div className="flex justify-between">
                          <span>价格盈利 (数量×价差):</span>
                          <span className="font-mono text-green-600">+${result.profitBreakdown.priceProfitFormatted}</span>
                        </div>
                        
                        {/* 开仓手续费成本 */}
                        {result.includeFees && parseFloat(result.profitBreakdown.openFeeAmount) < 0 && (
                          <div className="flex justify-between">
                            <span>开仓手续费:</span>
                            <span className="font-mono text-red-600">{result.profitBreakdown.openFeeAmountFormatted}</span>
                          </div>
                        )}
                        
                        {/* 平仓手续费成本 */}
                        {result.includeFees && parseFloat(result.profitBreakdown.closeFeeAmount) < 0 && (
                          <div className="flex justify-between">
                            <span>平仓手续费:</span>
                            <span className="font-mono text-red-600">{result.profitBreakdown.closeFeeAmountFormatted}</span>
                          </div>
                        )}
                        
                        {/* 滑点成本 */}
                        {result.includeFees && result.profitBreakdown.slippageAmount && parseFloat(result.profitBreakdown.slippageAmount) < 0 && (
                          <div className="flex justify-between">
                            <span>滑点成本:</span>
                            <span className="font-mono text-red-600">{result.profitBreakdown.slippageAmountFormatted}</span>
                          </div>
                        )}
                        
                        <div className="border-t border-green-300 dark:border-green-700 pt-1 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>净盈利:</span>
                            <span className="font-mono text-green-600">+${result.takeProfitProfitFormatted}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    {t('potentialGain')} {result.includeFees ? `(${t('includesFees')})` : ''}
                  </p>
                </div>
              )}
              
              {result.takeProfitRR && (
                <div className="text-xs text-green-700 dark:text-green-300 mt-2">
                  <div className="flex justify-between">
                    <span>风险收益比 (盈利:风险):</span>
                    <span className="font-mono">1:{result.takeProfitRR.toFixed(2)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    预期盈利 ÷ 止损风险 • {t('includesFees')}: {result.includeFees ? t('yes') : t('no')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profit Targets */}
      {result.targets.length > 0 && (
        <Card className="animate-in slide-in-from-top-4 duration-500 hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t('targets')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.targets.map((target: any, index: number) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg text-center border animate-in slide-in-from-bottom-2 duration-300 hover:scale-105 transition-all duration-200 cursor-pointer ${
                    target.isBreakeven 
                      ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700' 
                      : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleCopyValue(target.priceFormatted, target.isBreakeven ? 'Breakeven' : `Target ${target.rr}`)}
                  title={t('clickToCopy')}
                >
                  <p className={`text-xs font-medium mb-1 ${
                    target.isBreakeven 
                      ? 'text-gray-600 dark:text-gray-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {target.isBreakeven ? t('breakeven') : `1:${target.rr}`}
                  </p>
                  <p className={`text-sm font-bold font-mono ${
                    target.isBreakeven 
                      ? 'text-gray-900 dark:text-gray-100' 
                      : 'text-green-900 dark:text-green-100'
                  }`}>
                    ${target.priceFormatted}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trailing Stop Results */}
      {trailingEnabled && (
        <Card className="animate-in slide-in-from-top-5 duration-600 hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-5 h-5 text-blue-600">🎯</div>
              {t('trailingStopResults')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Status */}
              <div className="space-y-4">
                {/* Price Information Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900 dark:hover:to-indigo-900 transition-all duration-200 cursor-pointer"
                  onClick={() => handleCopyValue(parseFloat(result.entryPrice || formData.entryPrice || '0').toString(), 'Entry Price')}
                  title={t('clickToCopy')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-blue-500 text-white rounded-full">
                      <DollarSign className="w-3 h-3" />
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium">
                      {formData.orderType === 'MARKET' ? t('entryPriceResult') : t('entryPriceLimit')}
                    </p>
                  </div>
                  <p className="text-lg font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
                    ${parseFloat(result.entryPrice || formData.entryPrice || '0').toLocaleString()}
                  </p>
                  {formData.orderType === 'MARKET' && result.entryPrice && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      {t('lockedAtCalculation')}
                    </div>
                  )}
                  {formData.orderType === 'LIMIT' && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {t('limitOrder')}
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-cyan-50 dark:bg-cyan-950 rounded-lg border border-cyan-200 dark:border-cyan-800">
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 uppercase tracking-wide font-medium">
                    {t('currentPrice')}
                  </p>
                  <p className="text-lg font-bold font-mono text-cyan-900 dark:text-cyan-100 mt-1">
                    {currentPrice ? `$${currentPrice.toLocaleString()}` : t('loading')}
                  </p>
                </div>
                </div>
                
                {/* Indicators Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trailingState.indicators?.ma ? (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide font-medium">
                        {trailingConfig.maType} ({trailingConfig.maLen})
                      </p>
                      <p className="text-lg font-bold font-mono text-green-900 dark:text-green-100 mt-1">
                        ${trailingState.indicators.ma.toFixed(4)}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium">
                        {trailingConfig.maType} ({trailingConfig.maLen})
                      </p>
                      <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100 mt-1">
                        {t('calculating')}
                      </p>
                    </div>
                  )}
                  
                  {(trailingConfig.strategy === 'MA_BAND_STOP' || trailingConfig.strategy === 'MA_CHANDELIER') && (
                    trailingState.indicators?.atr ? (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 uppercase tracking-wide font-medium">
                          ATR ({trailingConfig.atrLen})
                        </p>
                        <p className="text-lg font-bold font-mono text-yellow-900 dark:text-yellow-100 mt-1">
                          ${trailingState.indicators.atr.toFixed(4)}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium">
                          ATR ({trailingConfig.atrLen})
                        </p>
                        <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100 mt-1">
                          {t('calculating')}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
              
              {/* Trailing Stop Price */}
              <div 
                className={`p-4 rounded-lg border transition-colors duration-200 ${
                  (trailingState.stop || trailingState.exitTrigger)
                    ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900'
                    : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'
                }`}
                onClick={() => {
                  const price = trailingState.stop || trailingState.exitTrigger;
                  if (price) handleCopyValue(price.toString(), trailingConfig.strategy === 'MA_CROSS_EXIT' ? 'Exit Trigger' : 'Trailing Stop');
                }}
                title={(trailingState.stop || trailingState.exitTrigger) ? t('clickToCopy') : undefined}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`w-4 h-4 ${(trailingState.stop || trailingState.exitTrigger) ? 'text-orange-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${
                    (trailingState.stop || trailingState.exitTrigger)
                      ? 'text-orange-900 dark:text-orange-100'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {trailingConfig.strategy === 'MA_CROSS_EXIT' ? t('exitTriggerPrice') : t('trailingStopPrice')}
                  </p>
                </div>
                <p className={`text-xl font-bold font-mono ${
                  (trailingState.stop || trailingState.exitTrigger)
                    ? 'text-orange-600'
                    : 'text-gray-400'
                }`}>
                  {(() => {
                    const price = trailingState.stop || trailingState.exitTrigger;
                    return price ? `$${price.toFixed(4)}` : t('calculating');
                  })()}
                </p>
              </div>
              
              {/* Expected P&L */}
              {trailingEnabled && (trailingState.stop || trailingState.exitTrigger) && result?.qtyRounded && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-3">
                    {t('expectedPnL')}
                  </p>
                  {(() => {
                    // Use exit trigger price for P&L calculation
                    const exitTriggerPrice = trailingConfig.strategy === 'MA_CROSS_EXIT' 
                      ? trailingState.exitTrigger 
                      : trailingState.stop;
                    
                    const expectedPnL = calculateExpectedPnL(
                      parseFloat(result.entryPrice || formData.entryPrice || '0'),
                      parseFloat(result.qtyRounded),
                      exitTriggerPrice,
                      trailingConfig,
                      formData.includeFees ? {
                        open: parseFloat(formData.feeOpen || '0'),
                        close: parseFloat(formData.feeClose || '0')
                      } : undefined,
                      formData.includeFees ? {
                        open: parseFloat(formData.slippage || '0'),
                        close: parseFloat(formData.slippage || '0')
                      } : undefined
                    );
                    
                    return (
                      <div className="space-y-2">
                        {expectedPnL.expectedLoss && (
                          <div className="flex justify-between text-sm">
                            <span className="text-red-600 dark:text-red-400">{t('maxLoss')}:</span>
                            <span className="font-mono text-red-600 dark:text-red-400">
                              -${expectedPnL.expectedLoss.toLocaleString()}
                            </span>
                          </div>
                        )}
                        
                        {expectedPnL.expectedProfits.map((profit, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-green-600 dark:text-green-400">
                              {t('target')} {profit.rr}:
                            </span>
                            <span className="font-mono text-green-600 dark:text-green-400">
                              +${profit.profit.toLocaleString()} (${profit.price.toFixed(4)})
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Strategy Info */}
              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded border">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">{t('strategy')}:</span> {(() => {
                      // Map strategy enum to translation key
                      const strategyMap: Record<string, string> = {
                        'MA_CROSS_EXIT': 'maCrossExit',
                        'MA_BAND_STOP': 'maBandStop', 
                        'MA_CHANDELIER': 'maChandelier'
                      };
                      const translationKey = strategyMap[trailingConfig.strategy] || trailingConfig.strategy;
                      return t(translationKey);
                    })()}
                  </div>
                  <div>
                    <span className="font-medium">{t('timeframe')}:</span> {(() => {
                      const tf = trailingConfig.tfMs;
                      if (tf === 60000) return '1m';
                      if (tf === 300000) return '5m';
                      if (tf === 900000) return '15m';
                      if (tf === 1800000) return '30m';
                      if (tf === 3600000) return '1h';
                      if (tf === 14400000) return '4h';
                      if (tf === 86400000) return '1d';
                      return 'Unknown';
                    })()}
                  </div>
                  <div>
                    <span className="font-medium">{t('maType')}:</span> {trailingConfig.maType}({trailingConfig.maLen})
                  </div>
                  {(trailingConfig.strategy === 'MA_BAND_STOP' || trailingConfig.strategy === 'MA_CHANDELIER') && (
                    <div>
                      <span className="font-medium">ATR:</span> {trailingConfig.atrLen}×{trailingConfig.k}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 animate-in slide-in-from-top-6 duration-700 hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5" />
              {t('warnings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.warningKeys ? (
                // Use translated warning messages if available
                result.warningKeys.map((warningKey: string, index: number) => (
                  <div key={index} className="p-3 bg-amber-50 dark:bg-amber-950 rounded border-l-4 border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors duration-200 cursor-pointer">
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                      🚨 {t(warningKey)}
                    </p>
                  </div>
                ))
              ) : (
                // Fallback to original warning messages
                result.warnings.map((warning: string, index: number) => (
                  <div key={index} className="p-3 bg-amber-50 dark:bg-amber-950 rounded border-l-4 border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors duration-200 cursor-pointer">
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{warning}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      <Card className="animate-in slide-in-from-top-8 duration-900 hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t('orderSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg border">
            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
              {generateLocalizedOrderSummary(result)}
            </pre>
          </div>
          
          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            className="w-full"
          >
            <Copy className="w-4 h-4 mr-2" />
            {t('copyOrderSummary')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}