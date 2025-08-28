import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Building2, TrendingUp, Shield, DollarSign, Zap, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SavedParametersCardProps {
  savedParams: {
    exchange?: string;
    symbol?: string;
    contractMode?: string;
    side?: string;
    stopMode?: string;
    atrPeriod?: number;
    atrTimeframe?: string;
    atrMultiplier?: string;
    stopPrice?: string;
    stopPips?: string;
    useTakeProfit?: boolean;
    takeProfitMode?: string;
    takeProfitRRRatio?: string;
    riskMode?: string;
    riskAmount?: string;
    accountEquity?: string;
    riskPercent?: string;
    leverage?: number;
    includeFees?: boolean;
    feeType?: string;
    enableRebate?: boolean;
    rebatePercent?: string;
    autoLeverage?: boolean;
  };
}

export function SavedParametersCard({ savedParams }: SavedParametersCardProps) {
  const { t } = useTranslation();

  const formatFeeRate = (rate: string) => {
    const percentage = (parseFloat(rate || '0') * 100).toFixed(3);
    return parseFloat(percentage).toString() + '%';
  };

  return (
    <>
      {/* 基础市场设置 */}
      <Card className="flex-1 min-w-[280px] max-w-[350px] h-auto flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base whitespace-nowrap">
            <Building2 className="w-4 h-4 text-blue-600" />
            {t('marketSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('exchange')}:</span>
              <span className="font-mono ml-2 whitespace-nowrap">{t(savedParams.exchange?.toLowerCase() || 'binance')}</span>
            </div>
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('symbol')}:</span>
              <span className="font-mono font-medium ml-2 whitespace-nowrap">{savedParams.symbol}</span>
            </div>
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('contractMode')}:</span>
              <span className="font-mono ml-2 whitespace-nowrap">
                {savedParams.contractMode === 'SPOT' ? t('spot') : t('usdtPerp')}
              </span>
            </div>
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('side')}:</span>
              <span className={`font-mono font-medium ml-2 whitespace-nowrap ${
                savedParams.side === 'LONG' ? 'text-green-600' : 'text-red-600'
              }`}>
                {t(savedParams.side?.toLowerCase() || 'long')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 风险管理设置 */}
      <Card className="flex-1 min-w-[280px] max-w-[350px] h-auto flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base whitespace-nowrap">
            <Shield className="w-4 h-4 text-red-600" />
            {t('riskManagement')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('riskMode')}:</span>
              <span className="font-mono ml-2 whitespace-nowrap">
                {savedParams.riskMode === 'ACCOUNT_PERCENT' ? t('accountPercent') : t('fixedAmount')}
              </span>
            </div>
            {savedParams.riskMode === 'ACCOUNT_PERCENT' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('accountEquity')}:</span>
                  <span className="font-mono ml-2 whitespace-nowrap">${parseFloat(savedParams.accountEquity || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('riskPercent')}:</span>
                  <span className="font-mono ml-2 whitespace-nowrap">{savedParams.riskPercent}%</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('riskAmount')}:</span>
                <span className="font-mono ml-2 whitespace-nowrap">${parseFloat(savedParams.riskAmount || '0').toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('leverage')}:</span>
              <span className="font-mono font-medium">{savedParams.leverage}x</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 止损设置 */}
      <Card className="flex-1 min-w-[280px] max-w-[350px] h-auto flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base whitespace-nowrap">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            {t('stopLoss')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('stopMode')}:</span>
              <span className="font-mono ml-2 whitespace-nowrap">
                {savedParams.stopMode === 'PRICE' ? t('priceMode') :
                 savedParams.stopMode === 'ATR' ? 'ATR' : 'PIPS'}
              </span>
            </div>
            {savedParams.stopMode === 'ATR' && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ATR {t('period')}:</span>
                  <span className="font-mono ml-2 whitespace-nowrap">{savedParams.atrPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('timeframe')}:</span>
                  <span className="font-mono ml-2 whitespace-nowrap">{savedParams.atrTimeframe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('multiplier')}:</span>
                  <span className="font-mono ml-2 whitespace-nowrap">{savedParams.atrMultiplier}</span>
                </div>
              </>
            )}
            {savedParams.stopMode === 'PIPS' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('stopDistance')}:</span>
                <span className="font-mono ml-2 whitespace-nowrap">{savedParams.stopPips} PIPS</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 止盈设置 */}
      {savedParams.useTakeProfit && (
        <Card className="flex-1 min-w-[280px] max-w-[350px] h-auto flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base whitespace-nowrap">
              <Target className="w-4 h-4 text-emerald-600" />
              {t('takeProfit')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('takeProfitMode')}:</span>
                <span className="font-mono ml-2 whitespace-nowrap">
                  {savedParams.takeProfitMode === 'PRICE' ? t('priceMode') :
                   savedParams.takeProfitMode === 'ATR' ? 'ATR' :
                   savedParams.takeProfitMode === 'RR_RATIO' ? t('rrRatio') : 'PIPS'}
                </span>
              </div>
              {savedParams.takeProfitMode === 'RR_RATIO' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('rrRatio')}:</span>
                  <span className="font-mono ml-2 whitespace-nowrap">1:{savedParams.takeProfitRRRatio}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 费率设置 */}
      <Card className="flex-1 min-w-[280px] max-w-[350px] h-auto flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base whitespace-nowrap">
            <DollarSign className="w-4 h-4 text-purple-600" />
            {t('fees')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('includeFees')}:</span>
              <span className="font-mono ml-2 whitespace-nowrap">{savedParams.includeFees ? t('yes') : t('no')}</span>
            </div>
            <div className="flex justify-between items-center min-h-[20px]">
              <span className="text-muted-foreground whitespace-nowrap">{t('feeType')}:</span>
              <span className="font-mono text-xs">
                {savedParams.feeType === 'MAKER' ? '全部Maker' :
                 savedParams.feeType === 'TAKER' ? '全部Taker' :
                 savedParams.feeType === 'MAKER_OPEN_TAKER_CLOSE' ? '开仓Maker' :
                 '仅开仓Maker'}
              </span>
            </div>
            {savedParams.enableRebate && savedParams.rebatePercent && parseFloat(savedParams.rebatePercent) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('rebate')}:</span>
                <span className="font-mono text-blue-600">{savedParams.rebatePercent}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 高级设置 */}
      {savedParams.autoLeverage && (
        <Card className="flex-1 min-w-[280px] max-w-[350px] h-auto flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base whitespace-nowrap">
              <Zap className="w-4 h-4 text-yellow-600" />
              {t('advanced')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('autoLeverage')}:</span>
                <span className="font-mono text-yellow-600">{t('enabled')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
