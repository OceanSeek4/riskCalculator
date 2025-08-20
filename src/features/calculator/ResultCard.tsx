import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, AlertTriangle, TrendingUp, DollarSign, Calculator, Target } from 'lucide-react';
import { useCalculatorStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';

export function ResultCard() {
  const { result } = useCalculatorStore();
  const { t } = useTranslation();

  const handleCopyToClipboard = async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result.orderSummary);
      // You could add a toast notification here
      console.log(t('copiedToClipboard'));
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (!result) {
    return (
      <Card className="w-full max-w-md">
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
    <div className="w-full max-w-md space-y-4">
      {/* Main Position Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('positionResults')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('roundedQuantity')}</p>
              <p className="text-xl font-bold font-mono">{parseFloat(result.qtyRounded).toFixed(8)}</p>
              <p className="text-xs text-muted-foreground">
                Raw: {parseFloat(result.qtyRaw).toFixed(8)}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('notionalValue')}</p>
              <p className="text-xl font-bold">${parseFloat(result.notional).toLocaleString()}</p>
            </div>
          </div>

          {/* Stop Price */}
          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Stop Loss</p>
            </div>
            <p className="text-lg font-bold font-mono text-red-600">${parseFloat(result.stopPrice).toLocaleString()}</p>
          </div>

          {/* Contract Details */}
          {result.initialMargin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('initialMargin')}</p>
                <p className="text-lg font-bold font-mono text-blue-900 dark:text-blue-100">
                  ${parseFloat(result.initialMargin).toLocaleString()}
                </p>
              </div>
              {result.liquidationPrice && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <p className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide">{t('estLiquidation')}</p>
                  <p className="text-lg font-bold font-mono text-orange-900 dark:text-orange-100">
                    ${parseFloat(result.liquidationPrice).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit Targets */}
      {result.targets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t('targets')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {result.targets.map((target: any, index: number) => (
                <div key={index} className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">1:{target.rr}</p>
                  <p className="text-sm font-bold font-mono text-green-900 dark:text-green-100">
                    ${parseFloat(target.price).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5" />
              {t('warnings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.warnings.map((warning: string, index: number) => (
                <div key={index} className="p-2 bg-amber-50 dark:bg-amber-950 rounded border-l-4 border-amber-400">
                  <p className="text-sm text-amber-800 dark:text-amber-200">{warning}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t('orderSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
              {result.orderSummary}
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