import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/lib/store';

interface QuickHintsPanelProps {
  currentFeeType?: 'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY';
  hasStopPriceInput?: boolean;
  enablePositionScaling?: boolean;
  initialPositionPercentage?: number;
}

export function QuickHintsPanel({ currentFeeType, hasStopPriceInput, enablePositionScaling, initialPositionPercentage }: QuickHintsPanelProps) {
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  
  // Use current fee type from form, fallback to settings
  const effectiveFeeType = currentFeeType || settings.defaultFeeType || 'MAKER_OPEN_TAKER_CLOSE';
  
  // Determine effective stop mode
  const effectiveStopMode = hasStopPriceInput ? 'PRICE' : (settings.defaultStopMode || 'PRICE');
  
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
              <span className="ml-2 font-medium">{
                settings.defaultContractMode === 'SPOT' ? t('spot') :
                settings.defaultContractMode === 'USDT_PERP' ? t('usdtPerp') :
                settings.defaultContractMode === 'INVERSE' ? t('inverse') :
                t('usdtPerp')
              }</span>
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

        {/* Position Scaling Settings */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">加仓设置</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">加仓模式:</span>
              <span className="ml-2 font-medium">
                {enablePositionScaling ? '启用' : '禁用'}
              </span>
            </div>
            {enablePositionScaling && initialPositionPercentage && initialPositionPercentage < 100 && (
              <>
                <div>
                  <span className="text-muted-foreground">初始建仓比例:</span>
                  <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">
                    {initialPositionPercentage}%
                  </span>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-md">
                  <div className="text-xs font-medium text-purple-800 dark:text-purple-300 mb-1">
                    风险分配预览
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">初始风险:</span>
                      <span className="font-medium text-purple-700 dark:text-purple-300">
                        {settings.defaultRiskMode === 'FIXED_USDT'
                          ? `${((Number(settings.defaultRiskAmount || '100') * initialPositionPercentage) / 100).toFixed(0)} USDT`
                          : `${((Number(settings.defaultRiskPercent || '1') * initialPositionPercentage) / 100).toFixed(2)}%`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">可加仓余量:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {settings.defaultRiskMode === 'FIXED_USDT'
                          ? `${((Number(settings.defaultRiskAmount || '100') * (100 - initialPositionPercentage)) / 100).toFixed(0)} USDT`
                          : `${((Number(settings.defaultRiskPercent || '1') * (100 - initialPositionPercentage)) / 100).toFixed(2)}%`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </>
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
          
          {/* Current Stop Mode Display */}
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md">
            <div className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
              {t('currentStopMode')}
            </div>
            <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {hasStopPriceInput ? (
                <span>{t('priceStop')} - {t('usingManualPrice')}</span>
              ) : (
                <span>{t(`${effectiveStopMode.toLowerCase()}Stop`)} - {t('usingSettingsDefault')}</span>
              )}
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
                {settings.defaultStopMode?.toLowerCase() || 'price'} / {settings.defaultUseTakeProfit ? t('on') : t('off')}
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
                    <span className="font-medium">{
                      settings.defaultTakeProfitMode === 'RR_RATIO' ? t('rrRatioTakeProfit') :
                      settings.defaultTakeProfitMode === 'PRICE' ? t('priceTakeProfit') :
                      settings.defaultTakeProfitMode === 'ATR' ? t('atrTakeProfit') :
                      t('priceTakeProfit')
                    }</span>
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