import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, AlertTriangle, TrendingUp, DollarSign, Calculator, Target } from 'lucide-react';
import { useCalculatorStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';

export function ResultCard() {
  const { result } = useCalculatorStore();
  const { t } = useTranslation();

  const generateLocalizedOrderSummary = (result: any) => {
    if (!result) return '';
    
    // Extract values from original result
    const side = result.orderSummary.match(/^(LONG|SHORT)/)?.[1] || '';
    const symbol = result.orderSummary.match(/(LONG|SHORT)\s+(\S+)/)?.[2] || '';
    
    // Parse values from original summary
    const entryMatch = result.orderSummary.match(/Entry:\s*([^\s|]+)/);
    const stopMatch = result.orderSummary.match(/Stop:\s*([^\s\n]+)/);
    const qtyMatch = result.orderSummary.match(/Qty:\s*([^\s|]+)/);
    const notionalMatch = result.orderSummary.match(/Notional:\s*([^\s\n]+)/);
    const leverageMatch = result.orderSummary.match(/Leverage:\s*([^\s|]+)/);
    const marginMatch = result.orderSummary.match(/Margin:\s*([^\s\n]+)/);
    const liquidationMatch = result.orderSummary.match(/Est\.\s*Liquidation:\s*([^\s\n]+)/);
    const feesMatch = result.orderSummary.match(/Fees:\s*Open\s*([^\s]+)\s*\+\s*Close\s*([^\s]+)\s*=\s*([^\s]+)/);
    const breakevenMatch = result.orderSummary.match(/Breakeven:\s*([^\s\n]+)/);
    const targetMatch = result.orderSummary.match(/Target\s*1:([^:]+):\s*([^\s\n]+)/);
    const stepSizeMatch = result.orderSummary.match(/stepSize=([^,\s]+)/);
    const tickSizeMatch = result.orderSummary.match(/tickSize=([^\s\n]+)/);
    
    let summary = `${t(side.toLowerCase())} ${symbol}\n`;
    
    if (entryMatch && stopMatch) {
      summary += `${t('orderSummaryEntry')}: ${entryMatch[1]} | ${t('orderSummaryStop')}: ${stopMatch[1]}\n`;
    }
    
    if (qtyMatch && notionalMatch) {
      summary += `${t('orderSummaryQty')}: ${qtyMatch[1]} | ${t('orderSummaryNotional')}: ${notionalMatch[1]} USDT\n`;
    }
    
    if (leverageMatch && marginMatch) {
      summary += `${t('orderSummaryLeverage')}: ${leverageMatch[1]} | ${t('orderSummaryMargin')}: ${marginMatch[1]} USDT\n`;
    }
    
    if (liquidationMatch) {
      summary += `${t('orderSummaryEstLiquidation')}: ${liquidationMatch[1]}\n`;
    }
    
    if (feesMatch) {
      summary += `${t('orderSummaryFees')}: ${t('orderSummaryOpen')} ${feesMatch[1]} + ${t('orderSummaryClose')} ${feesMatch[2]} = ${feesMatch[3]} USDT\n`;
    }
    
    if (breakevenMatch) {
      summary += `${t('orderSummaryBreakeven')}: ${breakevenMatch[1]}\n`;
    }
    
    if (targetMatch) {
      summary += `${t('orderSummaryTarget')} 1:${targetMatch[1]}: ${targetMatch[2]}\n`;
    }
    
    if (stepSizeMatch && tickSizeMatch) {
      summary += `${t('orderSummaryCompliance')}: stepSize=${stepSizeMatch[1]}, tickSize=${tickSizeMatch[1]}\n`;
    }
    
    if (result.warningKeys && result.warningKeys.length > 0) {
      const localizedWarnings = result.warningKeys.map((key: string) => t(key)).join('; ');
      summary += `${t('orderSummaryWarnings')}: ${localizedWarnings}\n`;
    }
    
    summary += t('orderSummaryNote');
    
    return summary;
  };

  const handleCopyToClipboard = async () => {
    if (!result) return;
    
    try {
      const localizedSummary = generateLocalizedOrderSummary(result);
      await navigator.clipboard.writeText(localizedSummary);
      // You could add a toast notification here
      console.log(t('copiedToClipboard'));
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleCopyValue = async (value: string, type: string) => {
    try {
      await navigator.clipboard.writeText(value);
      console.log(`${type} copied: ${value}`);
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
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('positionResults')}
          </CardTitle>
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
              {result.takeProfitRR && (
                <div className="text-xs text-green-700 dark:text-green-300">
                  <div className="flex justify-between">
                    <span>{t('riskRewardRatio')}:</span>
                    <span className="font-mono">1:{result.takeProfitRR.toFixed(2)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('includesFees')}: {result.includeFees ? t('yes') : t('no')}
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