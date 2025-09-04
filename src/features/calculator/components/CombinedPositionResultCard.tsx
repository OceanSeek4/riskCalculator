import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BarChart3, TrendingUp, DollarSign, AlertTriangle, RotateCcw, Target, Activity, ArrowUpCircle, Copy, Check, Shield, Edit3 } from 'lucide-react';
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
  onUpdateStopLoss?: (newStopPrice: string) => void;
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
  onUpdateStopLoss,
  originalRiskBudget = 0,
  remainingRisk = 0,
  side = 'LONG',
  rrRatios = [1, 1.5, 2],
  feeRates,
  rebateInfo
}: CombinedPositionResultCardProps) {
  const [exitFeeType, setExitFeeType] = useState<'MAKER' | 'TAKER'>('TAKER');
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [newStopPrice, setNewStopPrice] = useState<string>('');
  const [isAdjustingStop, setIsAdjustingStop] = useState<boolean>(false);

  // 确认止损调整
  const handleConfirmStopAdjustment = () => {
    if (newStopPrice && adjustedStopCalculation?.isValidAdjustment && onUpdateStopLoss) {
      onUpdateStopLoss(newStopPrice);
      setNewStopPrice('');
      setIsAdjustingStop(false);
    }
  };

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

  // 计算新止损价格下的风险和盈亏 - 考虑每个仓位的开仓费用
  const calculateAdjustedStopLoss = (adjustedStopPrice: number) => {
    const avgEntryPrice = parseFloat(combinedData.totals.averageEntryPrice);
    const avgStopPrice = parseFloat(combinedData.totals.weightedStopPrice);
    const totalQuantity = parseFloat(combinedData.totals.totalQuantity);
    
    if (!avgEntryPrice || !avgStopPrice || !totalQuantity || !feeRates) return null;

    // 方向性验证：多单止损必须高于平均止损，空单止损必须低于平均止损
    const isDirectionValid = side === 'LONG' 
      ? adjustedStopPrice > avgStopPrice  // 多单：新止损 > 平均止损（向上移动）
      : adjustedStopPrice < avgStopPrice; // 空单：新止损 < 平均止损（向下移动）

    // 计算总开仓成本和调整后的净盈亏
    let totalOpenCosts = 0;
    let totalNetPnL = 0;
    let totalCloseFees = 0;
    let totalCloseSlippage = 0;

    combinedData.entries.forEach((entry) => {
      const entryPrice = parseFloat(entry.entryPrice);
      const quantity = parseFloat(entry.quantity);
      
      if (!entryPrice || !quantity) return;

      // 1. 计算该仓位的开仓成本
      let openFeeRate = 0;
      let openSlippageRate = 0;
      
      if (entry.orderType === 'MARKET') {
        openFeeRate = parseFloat(feeRates.openTaker);
        openSlippageRate = parseFloat(feeRates.slippageOpen);
      } else {
        const feeType = entry.feeType;
        if (feeType === '全部Maker') {
          openFeeRate = parseFloat(feeRates.openMaker);
          openSlippageRate = 0;
        } else if (feeType === '全部Taker') {
          openFeeRate = parseFloat(feeRates.openTaker);
          openSlippageRate = parseFloat(feeRates.slippageOpen);
        } else if (feeType === '开仓Maker止损Taker' || feeType === '仅开仓Maker') {
          openFeeRate = parseFloat(feeRates.openMaker);
          openSlippageRate = 0;
        } else {
          openFeeRate = parseFloat(feeRates.openTaker);
          openSlippageRate = parseFloat(feeRates.slippageOpen);
        }
      }
      
      // 应用开仓返佣
      const effectiveOpenFeeRate = rebateInfo?.enabled && rebateInfo.rebatePercent 
        ? openFeeRate * (1 - parseFloat(rebateInfo.rebatePercent) / 100)
        : openFeeRate;

      const openFeeAmount = entryPrice * quantity * effectiveOpenFeeRate;
      const openSlippageAmount = entryPrice * quantity * openSlippageRate;
      const positionOpenCost = openFeeAmount + openSlippageAmount;
      totalOpenCosts += positionOpenCost;

      // 2. 计算该仓位在新止损价下的平仓成本
      const closeFeeRate = parseFloat(feeRates.closeTaker);
      const closeSlippageRate = parseFloat(feeRates.slippageClose);
      
      const effectiveCloseFeeRate = rebateInfo?.enabled && rebateInfo.rebatePercent 
        ? closeFeeRate * (1 - parseFloat(rebateInfo.rebatePercent) / 100)
        : closeFeeRate;

      const closeFeeAmount = adjustedStopPrice * quantity * effectiveCloseFeeRate;
      const closeSlippageAmount = adjustedStopPrice * quantity * closeSlippageRate;
      
      totalCloseFees += closeFeeAmount;
      totalCloseSlippage += closeSlippageAmount;

      // 3. 计算该仓位的净盈亏
      const priceDiff = side === 'LONG' 
        ? (adjustedStopPrice - entryPrice) * quantity
        : (entryPrice - adjustedStopPrice) * quantity;
      
      const positionNetPnL = priceDiff - positionOpenCost - closeFeeAmount - closeSlippageAmount;
      totalNetPnL += positionNetPnL;
    });

    // 使用Taker手续费 + 滑点计算平均止损成本（用于显示）
    const stopCloseFeeRate = parseFloat(feeRates.closeTaker);
    const stopSlippageRate = parseFloat(feeRates.slippageClose);
    
    // 应用返佣
    const effectiveStopFeeRate = rebateInfo?.enabled && rebateInfo.rebatePercent 
      ? stopCloseFeeRate * (1 - parseFloat(rebateInfo.rebatePercent) / 100)
      : stopCloseFeeRate;

    // 计算新风险金额：
    // 如果止损在盈利区域，风险为0（因为最坏情况也是盈利）
    // 如果止损在亏损区域，风险为实际亏损金额
    const newRiskAmount = totalNetPnL >= 0 ? 0 : Math.abs(totalNetPnL);
    
    // 判断是否为移动止损到盈利区域
    const isTrailingToProfit = side === 'LONG' 
      ? adjustedStopPrice > avgEntryPrice
      : adjustedStopPrice < avgEntryPrice;

    // 综合验证：方向正确 + 风险在预算内
    const isValidAdjustment = isDirectionValid && newRiskAmount <= originalRiskBudget;

    return {
      newRiskAmount,
      netProfitAtStop: totalNetPnL,
      effectiveStopFeeRate,
      stopSlippageRate,
      totalOpenCosts,
      totalCloseFees,
      totalCloseSlippage,
      isTrailingToProfit,
      isDirectionValid,
      isValidAdjustment,
      avgStopPrice
    };
  };

  // 保本和止盈计算 - 考虑每个仓位的开仓费用
  const calculateBreakevenAndTargets = () => {
    const totalQuantity = parseFloat(combinedData.totals.totalQuantity);
    const totalRiskAmount = parseFloat(combinedData.totals.totalRisk);
    
    if (!totalQuantity || !feeRates || !combinedData.entries.length) return null;

    // 计算总开仓成本
    let totalOpenCosts = 0;
    let totalNotionalValue = 0;

    combinedData.entries.forEach((entry) => {
      const entryPrice = parseFloat(entry.entryPrice);
      const quantity = parseFloat(entry.quantity);
      
      if (!entryPrice || !quantity) return;

      const notional = entryPrice * quantity;
      totalNotionalValue += notional;

      // 计算该仓位的开仓成本
      let openFeeRate = 0;
      let openSlippageRate = 0;
      
      if (entry.orderType === 'MARKET') {
        openFeeRate = parseFloat(feeRates.openTaker);
        openSlippageRate = parseFloat(feeRates.slippageOpen);
      } else {
        const feeType = entry.feeType;
        if (feeType === '全部Maker') {
          openFeeRate = parseFloat(feeRates.openMaker);
          openSlippageRate = 0;
        } else if (feeType === '全部Taker') {
          openFeeRate = parseFloat(feeRates.openTaker);
          openSlippageRate = parseFloat(feeRates.slippageOpen);
        } else if (feeType === '开仓Maker止损Taker' || feeType === '仅开仓Maker') {
          openFeeRate = parseFloat(feeRates.openMaker);
          openSlippageRate = 0;
        } else {
          openFeeRate = parseFloat(feeRates.openTaker);
          openSlippageRate = parseFloat(feeRates.slippageOpen);
        }
      }
      
      // 应用开仓返佣
      const effectiveOpenFeeRate = rebateInfo?.enabled && rebateInfo.rebatePercent 
        ? openFeeRate * (1 - parseFloat(rebateInfo.rebatePercent) / 100)
        : openFeeRate;

      const openCost = notional * (effectiveOpenFeeRate + openSlippageRate);
      totalOpenCosts += openCost;
    });

    // 平仓费率设置
    const closeFeeRate = parseFloat(exitFeeType === 'MAKER' ? feeRates.closeMaker : feeRates.closeTaker);
    const closeSlippageRate = exitFeeType === 'MAKER' ? 0 : parseFloat(feeRates.slippageClose);
    
    // 应用平仓返佣
    const effectiveCloseFeeRate = rebateInfo?.enabled && rebateInfo.rebatePercent 
      ? closeFeeRate * (1 - parseFloat(rebateInfo.rebatePercent) / 100)
      : closeFeeRate;

    const avgEntryPrice = parseFloat(combinedData.totals.averageEntryPrice);

    // 保本位计算：需要覆盖开仓成本 + 平仓成本
    // 保本时的盈亏 = 0，即：(保本价 - 平均入场价) × 总数量 - 开仓成本 - 平仓成本 = 0
    // 平仓成本 = 保本价 × 总数量 × (平仓费率 + 滑点)
    // 求解保本价：
    const totalCloseCostRate = effectiveCloseFeeRate + closeSlippageRate;
    
    let breakevenPrice;
    if (side === 'LONG') {
      // (保本价 - 平均入场价) × 总数量 = 开仓成本 + 保本价 × 总数量 × 平仓费率
      // 保本价 × 总数量 × (1 - 平仓费率) = 平均入场价 × 总数量 + 开仓成本
      breakevenPrice = (avgEntryPrice * totalQuantity + totalOpenCosts) / (totalQuantity * (1 - totalCloseCostRate));
    } else {
      // (平均入场价 - 保本价) × 总数量 = 开仓成本 + 保本价 × 总数量 × 平仓费率
      breakevenPrice = (avgEntryPrice * totalQuantity - totalOpenCosts) / (totalQuantity * (1 + totalCloseCostRate));
    }

    // 止盈位计算
    const targets = rrRatios.map(ratio => {
      // 所需的目标盈利 = 风险 * 止盈比例
      const targetProfit = totalRiskAmount * ratio;
      
      // 目标价格需要覆盖：开仓成本 + 平仓成本 + 目标盈利
      // (目标价 - 平均入场价) × 总数量 = 开仓成本 + 目标价 × 总数量 × 平仓费率 + 目标盈利
      let targetPrice;
      if (side === 'LONG') {
        // 目标价 × 总数量 × (1 - 平仓费率) = 平均入场价 × 总数量 + 开仓成本 + 目标盈利
        targetPrice = (avgEntryPrice * totalQuantity + totalOpenCosts + targetProfit) / (totalQuantity * (1 - totalCloseCostRate));
      } else {
        // (平均入场价 - 目标价) × 总数量 = 开仓成本 + 目标价 × 总数量 × 平仓费率 + 目标盈利
        targetPrice = (avgEntryPrice * totalQuantity - totalOpenCosts - targetProfit) / (totalQuantity * (1 + totalCloseCostRate));
      }
      
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
      closeSlippageRate,
      totalOpenCosts,
      totalNotionalValue
    };
  };

  const calculations = calculateBreakevenAndTargets();
  const adjustedStopCalculation = newStopPrice ? calculateAdjustedStopLoss(parseFloat(newStopPrice)) : null;
  
  // 只在当前正在调整时显示调整信息（不显示已确认的调整）
  const displayedStopAdjustment = adjustedStopCalculation;

  // 计算当前止损线盈亏 - 逐个仓位精确计算（包含开仓和平仓成本）
  const calculateCurrentStopLossPnL = () => {
    if (!combinedData.entries.length || !feeRates) return null;

    let totalNetPnL = 0;
    let totalOpenFees = 0;
    let totalCloseFees = 0;
    let totalOpenSlippage = 0;
    let totalCloseSlippage = 0;
    
    // 对每个仓位单独计算止损触发时的盈亏
    combinedData.entries.forEach((entry) => {
      const entryPrice = parseFloat(entry.entryPrice);
      const stopPrice = parseFloat(entry.stopPrice);
      const quantity = parseFloat(entry.quantity);
      
      if (!entryPrice || !stopPrice || !quantity) return;

      // 1. 计算开仓成本
      let openFeeRate = 0;
      let openSlippageRate = 0;
      
      // 根据订单类型和手续费类型确定开仓费率
      if (entry.orderType === 'MARKET') {
        // 市价单使用Taker费率和滑点
        openFeeRate = parseFloat(feeRates.openTaker);
        openSlippageRate = parseFloat(feeRates.slippageOpen);
      } else {
        // 限价单根据feeType确定费率
        const feeType = entry.feeType;
        if (feeType === '全部Maker') {
          openFeeRate = parseFloat(feeRates.openMaker);
          openSlippageRate = 0;
        } else if (feeType === '全部Taker') {
          openFeeRate = parseFloat(feeRates.openTaker);
          openSlippageRate = parseFloat(feeRates.slippageOpen);
        } else if (feeType === '开仓Maker止损Taker' || feeType === '仅开仓Maker') {
          openFeeRate = parseFloat(feeRates.openMaker);
          openSlippageRate = 0;
        } else {
          // 默认使用Taker费率
          openFeeRate = parseFloat(feeRates.openTaker);
          openSlippageRate = parseFloat(feeRates.slippageOpen);
        }
      }
      
      // 应用开仓返佣
      const effectiveOpenFeeRate = rebateInfo?.enabled && rebateInfo.rebatePercent 
        ? openFeeRate * (1 - parseFloat(rebateInfo.rebatePercent) / 100)
        : openFeeRate;

      // 计算开仓成本
      const openFeeAmount = entryPrice * quantity * effectiveOpenFeeRate;
      const openSlippageAmount = entryPrice * quantity * openSlippageRate;
      
      totalOpenFees += openFeeAmount;
      totalOpenSlippage += openSlippageAmount;

      // 2. 计算平仓成本（止损执行）
      const closeFeeRate = parseFloat(feeRates.closeTaker);
      const closeSlippageRate = parseFloat(feeRates.slippageClose);
      
      // 应用平仓返佣
      const effectiveCloseFeeRate = rebateInfo?.enabled && rebateInfo.rebatePercent 
        ? closeFeeRate * (1 - parseFloat(rebateInfo.rebatePercent) / 100)
        : closeFeeRate;

      // 计算平仓成本
      const closeFeeAmount = stopPrice * quantity * effectiveCloseFeeRate;
      const closeSlippageAmount = stopPrice * quantity * closeSlippageRate;
      
      totalCloseFees += closeFeeAmount;
      totalCloseSlippage += closeSlippageAmount;

      // 3. 计算价格差异盈亏
      const priceDiff = side === 'LONG' 
        ? (stopPrice - entryPrice) * quantity
        : (entryPrice - stopPrice) * quantity;
      
      // 该仓位的总净盈亏 = 价格差异 - 开仓成本 - 平仓成本
      const positionNetPnL = priceDiff - openFeeAmount - openSlippageAmount - closeFeeAmount - closeSlippageAmount;
      
      totalNetPnL += positionNetPnL;
    });

    const avgEntryPrice = parseFloat(combinedData.totals.averageEntryPrice);
    const avgStopPrice = parseFloat(combinedData.totals.weightedStopPrice);

    return {
      netPnL: totalNetPnL,
      stopPrice: avgStopPrice,
      entryPrice: avgEntryPrice,
      totalOpenFees,
      totalCloseFees,
      totalOpenSlippage,
      totalCloseSlippage,
      totalFees: totalOpenFees + totalCloseFees,
      totalSlippage: totalOpenSlippage + totalCloseSlippage,
      isProfit: totalNetPnL > 0
    };
  };

  const currentStopLossPnL = calculateCurrentStopLossPnL();

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
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

          {/* 平均止损价 */}
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">平均止损价</span>
            </div>
            <div className="text-lg font-bold text-red-800 dark:text-red-200">
              {formatCurrency(combinedData.totals.weightedStopPrice)}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">
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

          {/* 止损线盈亏 */}
          {currentStopLossPnL && (
            <div className={`p-3 rounded-lg border ${
              currentStopLossPnL.isProfit
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-gray-600" />
                <span className={`text-xs font-medium ${
                  currentStopLossPnL.isProfit
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  止损线盈亏
                </span>
              </div>
              <div className={`text-lg font-bold ${
                currentStopLossPnL.isProfit
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {currentStopLossPnL.isProfit ? '+' : ''}{formatCurrency(currentStopLossPnL.netPnL)}
              </div>
              <div className={`text-xs ${
                currentStopLossPnL.isProfit
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                止损价 {formatCurrency(currentStopLossPnL.stopPrice)}
                <br />
                开仓费用: {formatCurrency(currentStopLossPnL.totalOpenFees + currentStopLossPnL.totalOpenSlippage)}
                <br />
                平仓费用: {formatCurrency(currentStopLossPnL.totalCloseFees + currentStopLossPnL.totalCloseSlippage)}
                <br />
                总费用: {formatCurrency(currentStopLossPnL.totalFees + currentStopLossPnL.totalSlippage)}
                {rebateInfo?.enabled && (
                  <span className="text-blue-600 dark:text-blue-400"> (返佣: {rebateInfo.rebatePercent}%)</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 调整止损功能 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">止损调整</h4>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setIsAdjustingStop(!isAdjustingStop)}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              {isAdjustingStop ? '取消' : '调整止损'}
            </Button>
          </div>

          {isAdjustingStop && (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      新止损价格
                    </label>
                    <Input
                      type="number"
                      value={newStopPrice}
                      onChange={(e) => setNewStopPrice(e.target.value)}
                      className="mt-1"
                      placeholder={`当前: ${formatNumber(parseFloat(combinedData.totals.weightedStopPrice), 2)}`}
                      step="0.01"
                    />
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      平均入场价: {formatNumber(parseFloat(combinedData.totals.averageEntryPrice), 2)}
                      <br />
                      平均止损价: {formatNumber(parseFloat(combinedData.totals.weightedStopPrice), 2)}
                      <br />
                      {side === 'LONG' ? '多单止损须高于平均止损价' : '空单止损须低于平均止损价'}
                    </div>
                  </div>
                  
                  {adjustedStopCalculation && (
                    <div className="space-y-2 pt-2 border-t border-orange-200">
                      {/* 有效性检查 */}
                      <div className={`p-2 rounded text-xs ${
                        adjustedStopCalculation.isValidAdjustment
                          ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-200'
                          : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200'
                      }`}>
                        {!adjustedStopCalculation.isDirectionValid
                          ? `✗ 方向错误: ${side === 'LONG' ? '多单止损须高于' : '空单止损须低于'}平均止损价 ${formatCurrency(adjustedStopCalculation.avgStopPrice)}`
                          : adjustedStopCalculation.newRiskAmount > originalRiskBudget
                          ? `✗ 超出风险预算: 新风险 ${formatCurrency(adjustedStopCalculation.newRiskAmount)} > 总风险预算 ${formatCurrency(originalRiskBudget)}`
                          : adjustedStopCalculation.isTrailingToProfit
                            ? `✓ 移动止损到盈利区: 风险降为 ${formatCurrency(adjustedStopCalculation.newRiskAmount)} (保护利润)`
                            : `✓ 有效调整: 新风险 ${formatCurrency(adjustedStopCalculation.newRiskAmount)} ≤ 总风险预算 ${formatCurrency(originalRiskBudget)}`
                        }
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-orange-600 dark:text-orange-400">新风险金额:</span>
                          <div className="font-semibold text-orange-800 dark:text-orange-200">
                            {formatCurrency(adjustedStopCalculation.newRiskAmount)}
                            {adjustedStopCalculation.isTrailingToProfit && (
                              <span className="text-green-600 dark:text-green-400 ml-1">(盈利区)</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-orange-600 dark:text-orange-400">风险变化:</span>
                          <div className={`font-semibold ${
                            adjustedStopCalculation.newRiskAmount < parseFloat(combinedData.totals.totalRisk)
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {adjustedStopCalculation.newRiskAmount < parseFloat(combinedData.totals.totalRisk) ? '-' : '+'}
                            {formatCurrency(Math.abs(adjustedStopCalculation.newRiskAmount - parseFloat(combinedData.totals.totalRisk)))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        开仓成本: {formatCurrency(adjustedStopCalculation.totalOpenCosts)}
                        <br />
                        平仓费用: {formatCurrency(adjustedStopCalculation.totalCloseFees + adjustedStopCalculation.totalCloseSlippage)}
                        <br />
                        Taker费率: {formatNumber(adjustedStopCalculation.effectiveStopFeeRate * 100, 3)}% + 
                        滑点: {formatNumber(adjustedStopCalculation.stopSlippageRate * 100, 3)}%
                        {rebateInfo?.enabled && (
                          <span className="text-green-600 dark:text-green-400"> (返佣: {rebateInfo.rebatePercent}%)</span>
                        )}
                      </div>

                      {/* 确认按钮 */}
                      {adjustedStopCalculation.isValidAdjustment && (
                        <div className="pt-3 border-t border-orange-200">
                          <Button
                            onClick={handleConfirmStopAdjustment}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            确认调整止损价格
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 新止损下的最低盈利卡片 */}
          {displayedStopAdjustment && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    新止损下的最低盈亏
                  </span>
                </div>
                <div className={`text-lg font-bold ${
                  displayedStopAdjustment.netProfitAtStop >= 0
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {displayedStopAdjustment.netProfitAtStop >= 0 ? '+' : ''}{formatCurrency(displayedStopAdjustment.netProfitAtStop)}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  在新止损价格 {formatCurrency(parseFloat(newStopPrice))} 下触发止损的盈亏
                </div>
                <div className="text-xs text-red-500 dark:text-red-400 mt-2 opacity-75">
                  包含开仓成本 {formatCurrency(displayedStopAdjustment.totalOpenCosts)} + 平仓费用 {formatCurrency(displayedStopAdjustment.totalCloseFees + displayedStopAdjustment.totalCloseSlippage)}
                </div>
              </CardContent>
            </Card>
          )}
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
                    开仓成本: {formatCurrency(calculations.totalOpenCosts)}
                    <br />
                    平仓费率: {exitFeeType} {formatNumber(calculations.effectiveCloseFeeRate * 100, 3)}%
                    {calculations.closeSlippageRate > 0 && (
                      <span> + 滑点: {formatNumber(calculations.closeSlippageRate * 100, 3)}%</span>
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