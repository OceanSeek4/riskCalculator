import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, Target, DollarSign, Zap, Activity } from 'lucide-react';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { TrailingPanel } from '../TrailingPanelWrapper';

export function SettingsInfoCard() {
  const { 
    formData,
    currentATR,
    trailingEnabled,
    trailingConfig,
    trailingState,
    setTrailingEnabled,
    updateTrailingConfig
  } = useCalculatorStore();
  
  const { settings, isOfflineMode } = useSettingsStore();
  const { t } = useTranslation();

  const formatFeeRate = (rate: string) => {
    const percentage = (parseFloat(rate || '0') * 100).toFixed(3);
    return parseFloat(percentage).toString() + '%';
  };

  return (
    <div className="w-full max-w-4xl space-y-6 animate-in fade-in duration-500">
      {/* 风险管理设置 */}
      <Card className="animate-in slide-in-from-bottom-2 duration-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            {t('riskManagement')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 止损设置 */}
            <div className="p-4 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {t('stopLoss')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('stopMode')}:</span>
                  <span className="font-mono">
                    {formData.stopMode === 'PRICE' ? t('priceMode') : 
                     formData.stopMode === 'ATR' ? 'ATR' : 'PIPS'}
                  </span>
                </div>
                {formData.stopMode === 'ATR' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ATR {t('period')}:</span>
                      <span className="font-mono">{formData.atrPeriod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('timeframe')}:</span>
                      <span className="font-mono">{formData.atrTimeframe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('multiplier')}:</span>
                      <span className="font-mono">{formData.atrMultiplier}</span>
                    </div>
                    {currentATR && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ATR {t('value')}:</span>
                        <span className="font-mono">{parseFloat(currentATR).toFixed(4)}</span>
                      </div>
                    )}
                  </>
                )}
                {formData.stopMode === 'PIPS' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('stopDistance')}:</span>
                    <span className="font-mono">{formData.stopPips} PIPS</span>
                  </div>
                )}
              </div>
            </div>

            {/* 止盈设置 */}
            {formData.useTakeProfit && (
              <div className="p-4 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t('takeProfit')}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('takeProfitMode')}:</span>
                    <span className="font-mono">
                      {formData.takeProfitMode === 'PRICE' ? t('priceMode') :
                       formData.takeProfitMode === 'ATR' ? 'ATR' :
                       formData.takeProfitMode === 'RR_RATIO' ? t('rrRatio') : 'PIPS'}
                    </span>
                  </div>
                  {formData.takeProfitMode === 'RR_RATIO' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('rrRatio')}:</span>
                      <span className="font-mono">1:{formData.takeProfitRRRatio}</span>
                    </div>
                  )}
                  {formData.takeProfitMode === 'ATR' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ATR {t('multiplier')}:</span>
                      <span className="font-mono">{formData.takeProfitATRMultiplier}</span>
                    </div>
                  )}
                  {formData.takeProfitMode === 'PIPS' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('takeProfitDistance')}:</span>
                      <span className="font-mono">{formData.takeProfitPips} PIPS</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 费率和滑点设置 */}
      <Card className="animate-in slide-in-from-bottom-3 duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
费率与滑点
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 费率设置 */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/50 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">
                {t('tradingFees')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('feeType')}:</span>
                  <span className="font-mono text-xs">
                    {formData.feeType === 'MAKER' ? '全部Maker' :
                     formData.feeType === 'TAKER' ? '全部Taker' :
                     formData.feeType === 'MAKER_OPEN_TAKER_CLOSE' ? '开仓Maker,止损Taker' :
                     '仅开仓Maker'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('openFee')} (Maker):</span>
                  <span className="font-mono">{formatFeeRate(formData.feeOpenMaker || '0.0002')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('openFee')} (Taker):</span>
                  <span className="font-mono">{formatFeeRate(formData.feeOpenTaker || '0.0006')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('closeFee')} (Maker):</span>
                  <span className="font-mono">{formatFeeRate(formData.feeCloseMaker || '0.0002')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('closeFee')} (Taker):</span>
                  <span className="font-mono">{formatFeeRate(formData.feeCloseTaker || '0.0006')}</span>
                </div>
                {formData.enableRebate && formData.rebatePercent && parseFloat(formData.rebatePercent) > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/50 rounded border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between text-blue-700 dark:text-blue-300">
                      <span className="font-medium">{t('rebate')}:</span>
                      <span className="font-mono">{formData.rebatePercent}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 滑点设置 */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/50 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-3">
                {t('slippage')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('openSlippage')}:</span>
                  <span className="font-mono">{formatFeeRate(formData.slippageOpen || '0.0005')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('closeSlippage')}:</span>
                  <span className="font-mono">{formatFeeRate(formData.slippageClose || '0.0005')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('includeFees')}:</span>
                  <span className="font-mono">{formData.includeFees ? t('yes') : t('no')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('leverage')}:</span>
                  <span className="font-mono">{formData.leverage}x</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 高级设置 */}
      <Card className="animate-in slide-in-from-bottom-4 duration-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
高级设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 自动杠杆设置 */}
            {formData.autoLeverage && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/50 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
                  {t('autoLeverage')}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('maxEquityUsage')}:</span>
                    <span className="font-mono">{(parseFloat(formData.maxEquityUsage || '0.8') * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
自动调整杠杆以符合最大权益使用率
                  </div>
                </div>
              </div>
            )}

            {/* 拖尾止损设置 */}
            {trailingEnabled && (
              <div className="p-4 bg-cyan-50 dark:bg-cyan-950/50 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <h4 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  {t('trailingStop')}
                </h4>
                <div className="space-y-3">
                  <TrailingPanel
                    enabled={trailingEnabled}
                    config={trailingConfig}
                    state={trailingState}
                    onConfigChange={updateTrailingConfig}
                    onEnabledChange={setTrailingEnabled}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 离线模式指示器 */}
      {isOfflineMode && (
        <Card className="border-orange-200 dark:border-orange-800 animate-in slide-in-from-bottom-5 duration-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-orange-800 dark:text-orange-200">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold">{t('offlineMode')}</h4>
                <p className="text-sm text-orange-600 dark:text-orange-400">
正在使用默认市场数据，无法获取实时价格和ATR
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
