import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, DollarSign, AlertTriangle, RotateCcw, Target, Activity, ArrowUpCircle, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalcResult } from '@/lib/core';

interface PositionEntry {
  id: string;
  entryPrice: string;
  quantity: string;
  orderType: 'MARKET' | 'LIMIT';
  feeType: string;
  stopPrice: string;
  timestamp: Date;
  fees: {
    openFee: string;
    closeFee: string;
    totalFee: string;
  };
  riskAmount: string;
  notionalValue: string;
}

interface CombinedPositionData {
  entries: PositionEntry[];
  totals: {
    totalQuantity: string;
    totalNotional: string;
    totalFees: string;
    totalRisk: string;
    averageEntryPrice: string;
    weightedStopPrice: string;
  };
  riskMetrics: {
    maxDrawdown: string;
    riskRewardRatio: string;
    marginUsage: string;
  };
}

interface CombinedPositionResultCardProps {
  baseResult: CalcResult | null;
  combinedData: CombinedPositionData;
  isVisible: boolean;
  onClearPositions?: () => void;
  originalRiskBudget?: number;
  remainingRisk?: number;
  side?: 'LONG' | 'SHORT';
  rrRatios?: number[];
  feeRates?: {
    openMaker: string;
    openTaker: string;
    closeMaker: string;
    closeTaker: string;
    slippageOpen: string;
    slippageClose: string;
  };
  rebateInfo?: {
    enabled: boolean;
    rebatePercent: string;
  };
}

export function CombinedPositionResultCard({ 
  baseResult, 
  combinedData, 
  isVisible,
  onClearPositions,
  originalRiskBudget = 0,
  remainingRisk = 0,
  side = 'LONG',
  rrRatios = [1, 1.5, 2],
  feeRates,
  rebateInfo
}: CombinedPositionResultCardProps) {
  const [exitFeeType, setExitFeeType] = useState<'MAKER' | 'TAKER'>('TAKER');
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  // 复制到剪贴板的函数
  const copyToClipboard = async (text: string, itemKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set(prev).add(itemKey));
      
      // 2秒后移除复制状态
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };
  const { t } = useTranslation();

  if (!isVisible || !baseResult) {
    return null;
  }

  const formatNumber = (value: string | number, decimals: number = 2): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.00' : num.toFixed(decimals);
  };

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 计算风险等级颜色
  const getRiskLevelColor = (riskPercent: number): string => {
    if (riskPercent <= 1) return 'text-green-600 dark:text-green-400';
    if (riskPercent <= 3) return 'text-yellow-600 dark:text-yellow-400';
    if (riskPercent <= 5) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  // 计算已用风险的百分比(相对于总风险预算)
  const usedRiskPercent = originalRiskBudget > 0 ? (parseFloat(combinedData.totals.totalRisk) / originalRiskBudget * 100) : 0;
  const totalRiskPercent = usedRiskPercent; // 保持兼容性

  // 保本和止盈计算
  const calculateBreakevenAndTargets = () => {
    const avgEntryPrice = parseFloat(combinedData.totals.averageEntryPrice);
    const totalQuantity = parseFloat(combinedData.totals.totalQuantity);
    const totalRiskAmount = parseFloat(combinedData.totals.totalRisk);
    
    if (!avgEntryPrice || !totalQuantity || !feeRates) return null;

    // 使用该费率进行计算
    const closeFeeRate = parseFloat(exitFeeType === 'MAKER' ? feeRates.closeMaker : feeRates.closeTaker);
    const slippageRate = exitFeeType === 'MAKER' ? 0 : parseFloat(feeRates.slippageClose);
    
    // 应用返佣
    const effectiveCloseFeeRate = rebateInfo?.enabled && rebateInfo.rebatePercent 
      ? closeFeeRate * (1 - parseFloat(rebateInfo.rebatePercent) / 100)
      : closeFeeRate;

    // 保本位计算：考虑平仓手续费和滑点
    const breakevenPrice = side === 'LONG' 
      ? avgEntryPrice * (1 + effectiveCloseFeeRate + slippageRate)
      : avgEntryPrice * (1 - effectiveCloseFeeRate - slippageRate);

    // 止盈位计算
    const targets = rrRatios.map(ratio => {
      // 所需的目标盈利 = 风险 * 止盈比例
      const targetProfit = totalRiskAmount * ratio;
      
      // 考虑手续费和滑点的目标价格
      const targetPrice = side === 'LONG'
        ? avgEntryPrice + (targetProfit / totalQuantity) + avgEntryPrice * (effectiveCloseFeeRate + slippageRate)
        : avgEntryPrice - (targetProfit / totalQuantity) - avgEntryPrice * (effectiveCloseFeeRate + slippageRate);
      
      return {
        ratio,
        price: targetPrice,
        profit: targetProfit
      };
    });

    return {
      breakevenPrice,
      targets,
      effectiveCloseFeeRate,
      slippageRate
    };
  };

  const calculations = calculateBreakevenAndTargets();

  return (
    <Card className="w-full border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              综合持仓信息
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              所有仓位的汇总数据和风险分析
            </p>
          </div>
          {onClearPositions && combinedData.entries.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearPositions}
              className="flex items-center gap-2 text-xs px-3 py-1 h-8 text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700"
              title="重置到初始仓位，清除所有加仓"
            >
              <RotateCcw className="w-3 h-3" />
              重置
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 仓位汇总 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 总仓位 */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">总仓位</span>
            </div>
            <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
              {formatNumber(combinedData.totals.totalQuantity, 4)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {formatCurrency(combinedData.totals.totalNotional)}
            </div>
          </div>

          {/* 平均入场价 */}
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">平均入场价</span>
            </div>
            <div className="text-lg font-bold text-green-800 dark:text-green-200">
              {formatCurrency(combinedData.totals.averageEntryPrice)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              加权平均价格
            </div>
          </div>

          {/* 总手续费 */}
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">总手续费</span>
            </div>
            <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
              {formatCurrency(combinedData.totals.totalFees)}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400">
              开仓+平仓费用
            </div>
          </div>

          {/* 总风险(固定预算) */}
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">总风险预算</span>
            </div>
            <div className="text-lg font-bold text-purple-800 dark:text-purple-200">
              {formatCurrency(originalRiskBudget)}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              根据风险设置计算(固定值)
            </div>
          </div>

          {/* 已用风险(累积) */}
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-red-700 dark:text-red-300">已用风险</span>
            </div>
            <div className="text-lg font-bold text-red-800 dark:text-red-200">
              {formatCurrency(combinedData.totals.totalRisk)}
            </div>
            <div className={`text-xs font-medium ${getRiskLevelColor(totalRiskPercent)}`}>
              {formatNumber(usedRiskPercent, 1)}% 已使用
            </div>
          </div>

          {/* 剩余风险 */}
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-green-700 dark:text-green-300">剩余风险</span>
            </div>
            <div className="text-lg font-bold text-green-800 dark:text-green-200">
              {formatCurrency(remainingRisk)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              可用于继续加仓
            </div>
          </div>
        </div>

        {/* 保本位和止盈位 */}
        {calculations && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">保本位和止盈位</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">平仓手续费:</span>
                <Button
                  variant={exitFeeType === 'MAKER' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setExitFeeType('MAKER')}
                >
                  Maker
                </Button>
                <Button
                  variant={exitFeeType === 'TAKER' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setExitFeeType('TAKER')}
                >
                  Taker
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 保本位卡片 */}
              <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => copyToClipboard(calculations.breakevenPrice.toString(), 'breakeven')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">保本位</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {copiedItems.has('breakeven') ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-yellow-600" />
                      )}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                    {formatCurrency(calculations.breakevenPrice)}
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    {exitFeeType} 费率: {formatNumber(calculations.effectiveCloseFeeRate * 100, 3)}%
                    {calculations.slippageRate > 0 && (
                      <span> + 滑点: {formatNumber(calculations.slippageRate * 100, 3)}%</span>
                    )}
                    {rebateInfo?.enabled && (
                      <div className="text-green-600 dark:text-green-400">
                        返佣: {rebateInfo.rebatePercent}%
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-yellow-500 dark:text-yellow-400 mt-2 opacity-75">
                    点击复制价格
                  </div>
                </CardContent>
              </Card>

              {/* 止盈位列表 */}
              <div className="space-y-2">
                {calculations.targets.map((target, index) => {
                  const targetKey = `target-${target.ratio}`;
                  return (
                    <Card key={index} 
                          className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => copyToClipboard(target.price.toString(), targetKey)}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                              止盈 {target.ratio}R
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-sm font-bold text-green-800 dark:text-green-200">
                                {formatCurrency(target.price)}
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                +{formatCurrency(target.profit)}
                              </div>
                            </div>
                            <div className="flex items-center">
                              {copiedItems.has(targetKey) ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-green-500 dark:text-green-400 mt-1 opacity-75 text-center">
                          点击复制价格
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 入场点位明细 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">入场点位明细</h4>
          <div className="space-y-2">
            {combinedData.entries.map((entry, index) => (
              <div 
                key={entry.id} 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={entry.orderType === 'MARKET' ? 'default' : 'secondary'} className="text-xs">
                    #{index + 1}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium">
                      {formatCurrency(entry.entryPrice)} 
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({entry.orderType === 'MARKET' ? '市价' : '限价'})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      数量: {formatNumber(entry.quantity, 4)} | 止损: {formatCurrency(entry.stopPrice)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatCurrency(entry.notionalValue)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    风险: {formatCurrency(entry.riskAmount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* 风险提醒 */}
        {usedRiskPercent > 80 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">风险提醒</span>
            </div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              已使用{formatNumber(usedRiskPercent, 1)}%风险预算，建议谨慎管理仓位大小
            </div>
          </div>
        )}
        
        {usedRiskPercent >= 100 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">风险已满</span>
            </div>
            <div className="text-xs text-red-700 dark:text-red-300 mt-1">
              风险预算已用完，无法继续加仓
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}