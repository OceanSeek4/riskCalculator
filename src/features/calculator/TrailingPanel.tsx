import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, Target, Activity, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { 
  TrailingConfig, 
  TrailingState, 
  Strategy, 
  MaType, 
  OffsetType,
  ExpectedPnL
} from '@/lib/core';
import { timeframeToMs } from '@/lib/candles';

interface TrailingPanelProps {
  enabled: boolean;
  config: TrailingConfig;
  state: TrailingState;
  currentPrice?: number;
  entryPrice?: number;
  quantity?: number;
  tickSize?: number;
  fees?: { open: number; close: number };
  onConfigChange: (config: Partial<TrailingConfig>) => void;
  onEnabledChange: (enabled: boolean) => void;
  expectedPnL?: ExpectedPnL;
  isInitializing?: boolean;
}

export function TrailingPanel({
  enabled,
  config,
  state,
  currentPrice,
  entryPrice,
  quantity,
  tickSize = 0.01,
  fees,
  onConfigChange,
  onEnabledChange,
  expectedPnL,
  isInitializing = false,
}: TrailingPanelProps) {
  const { t } = useTranslation();
  
  const [isExpanded, setIsExpanded] = useState(false);

  // Available options
  const strategies: { value: Strategy; label: string; description: string }[] = [
    { 
      value: 'MA_CROSS_EXIT', 
      label: t('trailingStrategies.maCrossExit', 'MA Cross Exit'),
      description: t('trailingStrategies.maCrossExitDesc', 'Exit when price crosses moving average')
    },
    { 
      value: 'MA_BAND_STOP', 
      label: t('trailingStrategies.maBandStop', 'MA Band Stop'),
      description: t('trailingStrategies.maBandStopDesc', 'Trailing stop based on MA with offset')
    },
    { 
      value: 'MA_CHANDELIER', 
      label: t('trailingStrategies.maChandelier', 'MA Chandelier'),
      description: t('trailingStrategies.maChandelierDesc', 'Chandelier stop using MA and ATR')
    },
  ];

  const maTypes: { value: MaType; label: string }[] = [
    { value: 'EMA', label: t('trailingParams.ema', 'EMA') },
    { value: 'SMA', label: t('trailingParams.sma', 'SMA') },
  ];

  const offsetTypes: { value: OffsetType; label: string }[] = [
    { value: 'ATRx', label: t('trailingParams.atrMultiplier', 'ATR x') },
    { value: 'PCT', label: t('trailingParams.percentage', 'Percentage') },
    { value: 'ABS', label: t('trailingParams.absolute', 'Absolute') },
  ];

  const timeframes = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'];

  const needsOffset = config.strategy === 'MA_BAND_STOP' || config.strategy === 'MA_CHANDELIER';

  // Real-time status indicators
  const getStatusColor = (value: number | undefined, isPrice: boolean = false) => {
    if (value === undefined) return 'text-muted-foreground';
    if (!currentPrice || !entryPrice) return 'text-muted-foreground';
    
    if (isPrice) {
      if (config.side === 'LONG') {
        return value > entryPrice ? 'text-green-600' : 'text-red-600';
      } else {
        return value < entryPrice ? 'text-green-600' : 'text-red-600';
      }
    }
    
    return 'text-blue-600';
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return '—';
    return price.toFixed(Math.max(0, -Math.log10(tickSize)));
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toFixed(0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            {t('trailingExits.title', 'Trailing Exits')}
            <Badge variant="secondary" className="text-xs">
              {t('trailingExits.optional', 'Optional')}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="trailing-enabled" className="text-sm">
              {t('trailingExits.enable', 'Enable')}
            </Label>
            <Checkbox
              id="trailing-enabled"
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2"
            >
              {isExpanded ? '−' : '+'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-6">
          {/* Strategy Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('trailingParams.strategy', 'Strategy')}</Label>
              <Select
                value={config.strategy}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  onConfigChange({ strategy: e.target.value as Strategy })
                }
              >
                {strategies.map(strategy => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {strategies.find(s => s.value === config.strategy)?.description}
              </p>
            </div>

            <div>
              <Label>{t('trailingParams.maType', 'MA Type')}</Label>
              <Select
                value={config.maType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  onConfigChange({ maType: e.target.value as MaType })
                }
              >
                {maTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>{t('trailingParams.maPeriod', 'MA Period')}</Label>
              <Input
                type="number"
                min="1"
                max="200"
                value={config.maLen}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  onConfigChange({ maLen: parseInt(e.target.value) || 20 })
                }
              />
            </div>

            <div>
              <Label>{t('trailingParams.atrPeriod', 'ATR Period')}</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={config.atrLen}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  onConfigChange({ atrLen: parseInt(e.target.value) || 14 })
                }
              />
            </div>

            <div>
              <Label>{t('trailingParams.timeframe', 'Timeframe')}</Label>
              <Select
                value={timeframes.find(tf => timeframeToMs(tf) === config.tfMs) || '1h'}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  onConfigChange({ tfMs: timeframeToMs(e.target.value) })
                }
              >
                {timeframes.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="on-close-only"
                checked={config.onCloseOnly}
                onCheckedChange={(checked) => onConfigChange({ onCloseOnly: checked })}
              />
              <Label htmlFor="on-close-only" className="text-sm">
                {t('trailingParams.onCloseOnly', 'On Close Only')}
              </Label>
            </div>
          </div>

          {/* Offset Configuration (for applicable strategies) */}
          {needsOffset && (
            <div className="space-y-4">
              <Label className="text-sm font-semibold">
                {t('trailingParams.offsetConfiguration', 'Offset Configuration')}
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t('trailingParams.offsetType', 'Offset Type')}</Label>
                  <Select
                    value={config.offsetType || 'ATRx'}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                      onConfigChange({ offsetType: e.target.value as OffsetType })
                    }
                  >
                    {offsetTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {config.offsetType === 'ATRx' && (
                  <div>
                    <Label>{t('trailingParams.multiplier', 'Multiplier')}</Label>
                    <Input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={config.k || 2}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        onConfigChange({ k: parseFloat(e.target.value) || 2 })
                      }
                    />
                  </div>
                )}

                {config.offsetType === 'PCT' && (
                  <div>
                    <Label>{t('trailingParams.percentage', 'Percentage %')}</Label>
                    <Input
                      type="number"
                      min="0.01"
                      max="10"
                      step="0.01"
                      value={(config.pct || 0.005) * 100}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        onConfigChange({ pct: (parseFloat(e.target.value) || 0.5) / 100 })
                      }
                    />
                  </div>
                )}

                {config.offsetType === 'ABS' && (
                  <div>
                    <Label>{t('trailingParams.absoluteValue', 'Absolute Value')}</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step={tickSize.toString()}
                      value={config.abs || tickSize * 10}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        onConfigChange({ abs: parseFloat(e.target.value) || tickSize * 10 })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real-time Readings */}
          {isExpanded && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">
                  {t('trailingReadings.title', 'Real-time Readings')}
                </Label>
                {isInitializing && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Loading indicators...
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('trailingReadings.currentPrice', 'Current Price')}</p>
                  <p className={`text-lg font-mono font-bold ${getStatusColor(currentPrice, true)}`}>
                    ${formatPrice(currentPrice)}
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    {config.maType}{config.maLen}
                  </p>
                  <p className={`text-lg font-mono font-bold ${getStatusColor(state.indicators.ma)}`}>
                    ${formatPrice(state.indicators.ma)}
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">ATR{config.atrLen}</p>
                  <p className={`text-lg font-mono font-bold ${getStatusColor(state.indicators.atr)}`}>
                    {formatPrice(state.indicators.atr)}
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    {config.strategy === 'MA_CROSS_EXIT' 
                      ? t('trailingReadings.exitTrigger', 'Exit Trigger')
                      : t('trailingReadings.stopPrice', 'Stop Price')
                    }
                  </p>
                  <p className={`text-lg font-mono font-bold ${
                    config.strategy === 'MA_CROSS_EXIT' 
                      ? getStatusColor(state.exitTrigger, true)
                      : getStatusColor(state.stop, true)
                  }`}>
                    ${formatPrice(config.strategy === 'MA_CROSS_EXIT' ? state.exitTrigger : state.stop)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Exit Trigger P&L */}
          {expectedPnL && (
            <div className="space-y-4">
              <Label className="text-sm font-semibold">
                {t('trailingResults.exitTriggerPnL', 'Exit Trigger P&L')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('trailingResults.exitTriggerPnLDesc', 'Expected P&L when price reaches exit trigger and trailing stop activates')}
              </p>
              
              {/* Single P&L Result */}
              <Card className={expectedPnL.expectedLoss !== undefined ? "border-red-200" : "border-green-200"}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {expectedPnL.expectedLoss !== undefined ? (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        {t('trailingResults.exitTriggerLoss', 'Exit Trigger Loss')}
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        {t('trailingResults.exitTriggerProfit', 'Exit Trigger Profit')}
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold font-mono ${expectedPnL.expectedLoss !== undefined ? 'text-red-600' : 'text-green-600'}`}>
                    ${expectedPnL.expectedLoss !== undefined 
                      ? expectedPnL.expectedLoss.toFixed(2) 
                      : (expectedPnL.expectedProfits[0]?.profit.toFixed(2) || '0.00')
                    }
                  </p>
                  {quantity && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('trailingResults.basedOnQuantity', 'Based on {{qty}} units', { qty: formatVolume(quantity) })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('trailingResults.priceIncludesFees', 'Includes fees and slippage if enabled')}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Rounding Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium">{t('trailingNotices.roundingTitle', 'Price Rounding')}</p>
              <p>
                {t('trailingNotices.roundingDescription', 
                  'Prices are rounded to tickSize={{tickSize}}. LONG stops round down, SHORT stops round up.',
                  { tickSize: tickSize }
                )}
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}