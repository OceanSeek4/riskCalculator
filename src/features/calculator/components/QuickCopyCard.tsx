import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalcResult } from '@/lib/core';
import { MarketMeta } from '@/lib/adapters';
import { useState } from 'react';

interface QuickCopyCardProps {
  result: CalcResult | null;
  entryPrice: string;
  marketMeta?: MarketMeta | null;
}

export function QuickCopyCard({ result, entryPrice, marketMeta }: QuickCopyCardProps) {
  const { t } = useTranslation();
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

  // 根据步长舍入价格
  const roundPrice = (price: number | string): number => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (!marketMeta?.tickSize) return numPrice;
    
    const tickSize = parseFloat(marketMeta.tickSize.toString());
    return Math.round(numPrice / tickSize) * tickSize;
  };

  // 根据步长舍入数量
  const roundQuantity = (quantity: number | string): number => {
    const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    if (!marketMeta?.stepSize) return numQuantity;
    
    const stepSize = parseFloat(marketMeta.stepSize.toString());
    return Math.round(numQuantity / stepSize) * stepSize;
  };

  // 计算tickSize的小数位数
  const getTickSizeDecimals = (): number => {
    if (!marketMeta?.tickSize) return 2;
    const tickSize = parseFloat(marketMeta.tickSize);
    if (tickSize >= 1) return 0;
    return Math.abs(Math.floor(Math.log10(tickSize)));
  };

  // 计算stepSize的小数位数
  const getStepSizeDecimals = (): number => {
    if (!marketMeta?.stepSize) return 0;
    const stepSize = parseFloat(marketMeta.stepSize);
    if (stepSize >= 1) return 0;
    return Math.abs(Math.floor(Math.log10(stepSize)));
  };

  // 格式化价格显示（根据tickSize确定小数位）
  const formatPrice = (price: number | string): string => {
    const roundedPrice = roundPrice(price);
    const decimals = getTickSizeDecimals();
    
    // 使用固定小数位数，然后去掉不必要的尾随零
    const formatted = roundedPrice.toFixed(decimals);
    
    // 如果小数位都是0，则去掉小数点和后面的零
    if (decimals > 0 && parseFloat(formatted) === Math.floor(parseFloat(formatted))) {
      return Math.floor(parseFloat(formatted)).toString();
    }
    
    // 去掉尾随的零，但保留至少一位小数（如果原本有小数）
    return formatted.replace(/\.?0+$/, '');
  };

  // 格式化数量显示（根据stepSize确定小数位）
  const formatQuantity = (quantity: number | string): string => {
    const roundedQuantity = roundQuantity(quantity);
    const decimals = getStepSizeDecimals();
    
    // 使用固定小数位数，然后去掉不必要的尾随零
    const formatted = roundedQuantity.toFixed(decimals);
    
    // 如果小数位都是0，则去掉小数点和后面的零
    if (decimals > 0 && parseFloat(formatted) === Math.floor(parseFloat(formatted))) {
      return Math.floor(parseFloat(formatted)).toString();
    }
    
    // 去掉尾随的零
    return formatted.replace(/\.?0+$/, '');
  };

  // 不再需要单独的复制按钮组件，已改为整行点击复制

  if (!result) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Copy className="w-4 h-4 text-purple-600" />
            快速复制
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            请先进行计算以显示复制信息
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Copy className="w-4 h-4 text-purple-600" />
          快速复制
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          点击任意行快速复制对应的交易信息
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* 入场价格 */}
        <div 
          className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all duration-200 hover:shadow-sm group"
          onClick={() => copyToClipboard(formatPrice(entryPrice), 'entryPrice-row')}
          title="点击复制入场价格"
        >
          <span className="text-sm text-muted-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">入场价格:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              ${formatPrice(entryPrice)}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* 开仓数量 */}
        <div 
          className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-green-950/50 transition-all duration-200 hover:shadow-sm group"
          onClick={() => copyToClipboard(formatQuantity(result.qtyRounded), 'quantity-row')}
          title="点击复制开仓数量"
        >
          <span className="text-sm text-muted-foreground group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">开仓数量:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
              {formatQuantity(result.qtyRounded)}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Copy className="w-3 h-3 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* 止损价格 */}
        <div 
          className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200 hover:shadow-sm group"
          onClick={() => copyToClipboard(formatPrice(result.stopPrice), 'stopPrice-row')}
          title="点击复制止损价格"
        >
          <span className="text-sm text-muted-foreground group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">止损价格:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-red-600 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
              ${formatPrice(result.stopPrice)}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Copy className="w-3 h-3 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* 预期止盈价格 */}
        {result.takeProfitPrice && (
          <div 
            className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all duration-200 hover:shadow-sm group"
            onClick={() => copyToClipboard(formatPrice(result.takeProfitPrice), 'takeProfitPrice-row')}
            title="点击复制止盈价格"
          >
            <span className="text-sm text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">止盈价格:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-green-600 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                ${formatPrice(result.takeProfitPrice)}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Copy className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* 目标位 */}
        {result.targets && result.targets.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1">
              <span className="text-sm text-muted-foreground">目标位:</span>
            </div>
            {result.targets.map((target, index) => {
              // 目标1显示为保本，其他显示正常的风险回报比
              const isBreakeven = index === 0 || target.isBreakeven;
              const label = isBreakeven ? '保本' : `目标${index + 1} (1:${target.rr})`;
              const displayText = isBreakeven ? '保本' : `目标${index + 1}`;
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center justify-between pl-4 pr-2 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm group ${
                    isBreakeven 
                      ? 'hover:bg-blue-50 dark:hover:bg-blue-950/50' 
                      : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                  }`}
                  onClick={() => copyToClipboard(formatPrice(target.price), `target-${index}-row`)}
                  title={`点击复制${displayText}价格`}
                >
                  <span className={`text-xs text-muted-foreground transition-colors ${
                    isBreakeven 
                      ? 'group-hover:text-blue-700 dark:group-hover:text-blue-300' 
                      : 'group-hover:text-emerald-700 dark:group-hover:text-emerald-300'
                  }`}>
                    {label}:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs font-medium transition-colors ${
                      isBreakeven 
                        ? 'text-blue-600 group-hover:text-blue-700 dark:group-hover:text-blue-400' 
                        : 'text-emerald-600 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                    }`}>
                      ${formatPrice(target.price)}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Copy className={`w-3 h-3 ${
                        isBreakeven 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 全部复制按钮 */}
        <div className="pt-3 border-t">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              const allInfo = [
                `入场价格: $${formatPrice(entryPrice)}`,
                `开仓数量: ${formatQuantity(result.qtyRounded)}`,
                `止损价格: $${formatPrice(result.stopPrice)}`,
                result.takeProfitPrice ? `止盈价格: $${formatPrice(result.takeProfitPrice)}` : '',
                ...(result.targets?.map((target, index) => {
                  const isBreakeven = index === 0 || target.isBreakeven;
                  return isBreakeven 
                    ? `保本: $${formatPrice(target.price)}`
                    : `目标${index + 1}: $${formatPrice(target.price)} (1:${target.rr})`;
                }) || [])
              ].filter(Boolean).join('\n');
              
              copyToClipboard(allInfo, 'all');
            }}
            className="w-full text-xs"
          >
            {copiedItems.has('all') ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                已复制全部
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                复制全部信息
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
