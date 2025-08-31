import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/lib/store';

interface QuickHintsPanelProps {
  currentFeeType?: 'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY';
}

export function QuickHintsPanel({ currentFeeType }: QuickHintsPanelProps) {
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  
  // Use current fee type from form, fallback to settings
  const effectiveFeeType = currentFeeType || settings.defaultFeeType || 'MAKER_OPEN_TAKER_CLOSE';
  
  // Collapse state for different sections
  const [showRebateSettings, setShowRebateSettings] = useState(false);
  const [showTakeProfitSettings, setShowTakeProfitSettings] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          {t('parametersFromSettings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Settings from Settings */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">{t('marketSettings')}</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{t('exchange')}:</span>
              <span className="ml-2 font-medium">{t(settings.defaultExchange?.toLowerCase() || 'binance')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('symbol')}:</span>
              <span className="ml-2 font-medium">{settings.defaultSymbol || 'BTCUSDT'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('contractMode')}:</span>
              <span className="ml-2 font-medium">{t(settings.defaultContractMode?.toLowerCase() || 'usdtPerp')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('side')}:</span>
              <span className="ml-2 font-medium">{t('long')}</span>
            </div>
          </div>
        </div>

        {/* Risk Settings from Settings */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">{t('riskSettings')}</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('riskMode')}:</span>
              <span className="ml-2 font-medium">{t(settings.defaultRiskMode === 'FIXED_USDT' ? 'fixedUSDT' : 'accountPercent')}</span>
            </div>
            {settings.defaultRiskMode === 'FIXED_USDT' ? (
              <div>
                <span className="text-muted-foreground">{t('riskAmount')}:</span>
                <span className="ml-2 font-medium">{settings.defaultRiskAmount || '100'} USDT</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">{t('accountEquity')}:</span>
                  <span className="ml-2 font-medium">{settings.defaultAccountEquity || '10000'} USDT</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('riskPercent')}:</span>
                  <span className="ml-2 font-medium">{settings.defaultRiskPercent || '1'}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fee Settings from Settings */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">{t('feeSettings')}</h4>
          
          {/* Current Fee Type Display */}
          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md">
            <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
              {t('currentFeeStrategy')}
            </div>
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {effectiveFeeType === 'MAKER' && t('feeTypeAllMaker')}
              {effectiveFeeType === 'TAKER' && t('feeTypeAllTaker')}
              {effectiveFeeType === 'MAKER_OPEN_TAKER_CLOSE' && t('feeTypeMakerOpenTakerClose')}
              {effectiveFeeType === 'MAKER_OPEN_ONLY' && t('feeTypeMakerOpenOnly')}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{t('makerFee')}:</span>
              <span className="ml-2 font-medium">{Number(settings.defaultFeeOpenMaker || 0.0002) * 100}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('takerFee')}:</span>
              <span className="ml-2 font-medium">{Number(settings.defaultFeeOpenTaker || 0.0006) * 100}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('slippage')}:</span>
              <span className="ml-2 font-medium">{Number(settings.defaultSlippageOpen || 0.0005) * 100}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('leverage')}:</span>
              <span className="ml-2 font-medium">{settings.defaultLeverage || 10}x</span>
            </div>
          </div>
        </div>

        {/* Rebate Settings from Settings */}
        <div className="space-y-2">
          <button
            onClick={() => setShowRebateSettings(!showRebateSettings)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-sm text-muted-foreground">{t('rebateSettings')}</h4>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${settings.defaultEnableRebate ? 'text-green-600' : 'text-gray-500'}`}>
                {settings.defaultEnableRebate ? t('yes') : t('no')}
              </span>
              {showRebateSettings ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </button>
          
          {showRebateSettings && (
            <div className="grid grid-cols-1 gap-2 text-sm pl-2">
              <div>
                <span className="text-muted-foreground">{t('rebateEnabled')}:</span>
                <span className={`ml-2 font-medium ${settings.defaultEnableRebate ? 'text-green-600' : 'text-gray-500'}`}>
                  {settings.defaultEnableRebate ? t('yes') : t('no')}
                </span>
              </div>
              {settings.defaultEnableRebate && (
                <div className="pl-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('binance')}:</span>
                    <span className="font-medium">{settings.defaultRebateBinance || '30'}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('bybit')}:</span>
                    <span className="font-medium">{settings.defaultRebateBybit || '40'}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('bitget')}:</span>
                    <span className="font-medium">{settings.defaultRebateBitget || '40'}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('okx')}:</span>
                    <span className="font-medium">{settings.defaultRebateOkx || '30'}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Take Profit / Stop Loss Settings from Settings */}
        <div className="space-y-2">
          <button
            onClick={() => setShowTakeProfitSettings(!showTakeProfitSettings)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-sm text-muted-foreground">{t('takeProfitStopLossSettings')}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">
                {settings.defaultStopMode?.toLowerCase() || 'price'} / {settings.defaultUseTakeProfit ? 'ON' : 'OFF'}
              </span>
              {showTakeProfitSettings ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </button>
          
          {showTakeProfitSettings && (
            <div className="grid grid-cols-1 gap-2 text-sm pl-2">
              {/* Stop Loss Mode */}
              <div>
                <span className="text-muted-foreground">{t('stopMode')}:</span>
                <span className="ml-2 font-medium">{t(`${settings.defaultStopMode?.toLowerCase() || 'price'}Stop`)}</span>
              </div>
              
              {/* Take Profit Settings */}
              <div>
                <span className="text-muted-foreground">{t('useTakeProfit')}:</span>
                <span className={`ml-2 font-medium ${settings.defaultUseTakeProfit ? 'text-green-600' : 'text-gray-500'}`}>
                  {settings.defaultUseTakeProfit ? t('yes') : t('no')}
                </span>
              </div>
              
              {settings.defaultUseTakeProfit && (
                <div className="pl-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('takeProfitMode')}:</span>
                    <span className="font-medium">{t(`${settings.defaultTakeProfitMode?.toLowerCase() || 'price'}TakeProfit`)}</span>
                  </div>
                  
                  {settings.defaultTakeProfitMode === 'RR_RATIO' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{t('defaultRRRatio')}:</span>
                      <span className="font-medium">{settings.defaultTakeProfitRRRatio || '2'}:1</span>
                    </div>
                  )}
                  
                  {settings.defaultTakeProfitMode === 'ATR' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{t('atrMultiplier')}:</span>
                      <span className="font-medium">{settings.defaultTakeProfitATRMultiplier || '2'}x</span>
                    </div>
                  )}
                </div>
              )}

              {/* ATR Settings for Stop Loss */}
              {settings.defaultStopMode === 'ATR' && (
                <div className="pl-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('atrPeriod')}:</span>
                    <span className="font-medium">{settings.defaultAtrPeriod || 14}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('atrTimeframe')}:</span>
                    <span className="font-medium">{settings.defaultAtrTimeframe || '1h'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('atrMultiplier')}:</span>
                    <span className="font-medium">{settings.defaultAtrMultiplier || '2'}x</span>
                  </div>
                </div>
              )}

              {/* Risk/Reward Ratios */}
              <div>
                <span className="text-muted-foreground">{t('rrRatios')}:</span>
                <span className="ml-2 font-medium">
                  {(settings.rrRatios || [1, 1.5, 2]).map(ratio => `${ratio}:1`).join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
          <div className="flex items-start gap-2">
            <Settings className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">{t('parametersFromSettingsNote')}</p>
              <p>{t('parametersFromSettingsDetails')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}