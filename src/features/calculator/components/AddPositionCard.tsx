import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, TrendingUp, Download, Activity, Plus } from 'lucide-react';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';
import { getCurrentPrice } from '@/lib/market-service';
import type { Exchange, InstType } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';
import { validateNumberString } from '@/lib/validation';

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

interface AddPositionCardProps {
  onAddPosition: (addPositionData: any) => void;
  isVisible: boolean;
  onSwitchToRecalculate: () => void;
  initialPositionPercentage: number;
  positionEntries: PositionEntry[];
  totalRiskAmount: number;
}

export function AddPositionCard({ onAddPosition, isVisible, onSwitchToRecalculate, initialPositionPercentage, positionEntries, totalRiskAmount }: AddPositionCardProps) {
  const {
    formData,
    setFormData,
    result,
    realTimePrice,
    setRealTimePrice,
    lastPriceUpdate,
    setLastPriceUpdate,
    priceChange,
    setPriceChange,
  } = useCalculatorStore();

  const { settings, setNotification } = useSettingsStore();
  const { t } = useTranslation();

  const [addPositionData, setAddPositionData] = useState({
    orderType: 'MARKET' as 'MARKET' | 'LIMIT',
    feeType: 'MAKER_OPEN_TAKER_CLOSE',
    entryPrice: '',
    limitPrice: '',
    stopPrice: '',
    positionValue: '',
  });

  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [remainingPositionValue, setRemainingPositionValue] = useState<number>(0);

  // 实时价格显示
  const [displayPrice, setDisplayPrice] = useState<string>('');
  const [displayPriceChange, setDisplayPriceChange] = useState<'up' | 'down' | 'same' | null>(null);
  const [displayLastUpdate, setDisplayLastUpdate] = useState<Date | null>(null);

  // 计算剩余风险额度（基于实际已使用的风险）
  useEffect(() => {
    if (totalRiskAmount > 0) {
      // 计算实际已使用的风险（从所有position entries的总和）
      const usedRiskAmount = positionEntries.reduce((total, entry) => {
        return total + parseFloat(entry.riskAmount || '0');
      }, 0);
      
      // 剩余风险 = 总风险 - 实际已使用的风险
      const remainingRiskAmount = totalRiskAmount - usedRiskAmount;
      
      setRemainingPositionValue(Math.max(0, remainingRiskAmount));
    } else {
      setRemainingPositionValue(0);
    }
  }, [totalRiskAmount, positionEntries]);

  // 实时价格更新
  useEffect(() => {
    let priceUpdateInterval: NodeJS.Timeout | null = null;

    if (formData.exchange && formData.symbol && formData.contractMode && isVisible) {
      const updatePrice = async () => {
        try {
          const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
          const price = await getCurrentPrice(formData.exchange as Exchange, formData.symbol!, instType);
          
          const oldPrice = parseFloat(displayPrice || '0');
          setDisplayPrice(price.toString());
          setDisplayLastUpdate(new Date());
          
          // 价格变化指示
          if (oldPrice > 0) {
            const diff = price - oldPrice;
            if (diff > 0) {
              setDisplayPriceChange('up');
            } else if (diff < 0) {
              setDisplayPriceChange('down');
            } else {
              setDisplayPriceChange('same');
            }
            setTimeout(() => setDisplayPriceChange(null), 2000);
          }

          // 如果是市价单，自动更新入场价格
          if (addPositionData.orderType === 'MARKET') {
            setAddPositionData(prev => ({ ...prev, entryPrice: price.toString() }));
          }
        } catch (error) {
          console.warn('Failed to update real-time price:', error);
        }
      };

      updatePrice();
      priceUpdateInterval = setInterval(updatePrice, 3000);
    }

    return () => {
      if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
      }
    };
  }, [formData.exchange, formData.symbol, formData.contractMode, isVisible, addPositionData.orderType, displayPrice]);

  // 处理输入变化
  const handleInputChange = (field: keyof typeof addPositionData, value: string) => {
    if (field === 'entryPrice' || field === 'limitPrice' || field === 'stopPrice' || field === 'positionValue') {
      const validationResult = validateNumberString(value, field as any);
      if (validationResult) {
        setFormErrors(prev => ({ ...prev, [field]: validationResult }));
        return;
      } else {
        setFormErrors(prev => ({ ...prev, [field]: '' }));
      }
    }

    setAddPositionData(prev => ({ ...prev, [field]: value }));
  };

  // 获取当前价格
  const handleFetchCurrentPrice = async () => {
    if (!formData.exchange || !formData.symbol || !formData.contractMode) {
      setPriceError(t('marketDataNotAvailable'));
      return;
    }

    setIsFetchingPrice(true);
    setPriceError('');

    try {
      const instType: InstType = formData.contractMode === 'SPOT' ? 'SPOT' : 'USDT_PERP';
      const price = await getCurrentPrice(formData.exchange as Exchange, formData.symbol, instType);
      
      const targetField = addPositionData.orderType === 'MARKET' ? 'entryPrice' : 'limitPrice';
      setAddPositionData(prev => ({ ...prev, [targetField]: price.toString() }));
      
      setNotification(t('priceUpdated'), 'success');
    } catch (error: any) {
      setPriceError(error.message || t('failedToFetchPrice'));
      setNotification(t('failedToFetchPrice'), 'error');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // 快速设置风险额度比例
  const handleQuickRiskPercent = (percentage: number) => {
    if (remainingPositionValue > 0) {
      const riskAmount = (remainingPositionValue * percentage / 100).toFixed(2);
      setAddPositionData(prev => ({ ...prev, positionValue: riskAmount }));
    }
  };

  // 设置全部剩余风险额度
  const handleSetAllRemainingRisk = () => {
    if (remainingPositionValue > 0) {
      setAddPositionData(prev => ({ ...prev, positionValue: remainingPositionValue.toFixed(2) }));
    }
  };

  // 锁定上次计算的止损价格
  const handleLockPreviousStopPrice = () => {
    if (result?.stopPrice) {
      const stopPrice = result.stopPrice;
      setAddPositionData(prev => ({ ...prev, stopPrice }));
      setNotification('已锁定上次计算的止损价格', 'success');
    }
  };

  // 根据百分比设置止损价格
  const handleQuickStopWithPercentage = (percentage: number) => {
    const entryPrice = parseFloat(
      addPositionData.orderType === 'MARKET' 
        ? addPositionData.entryPrice 
        : addPositionData.limitPrice
    );
    
    if (!entryPrice || isNaN(entryPrice)) {
      setNotification('请先设置入场价格', 'error');
      return;
    }

    if (!formData.side) {
      setNotification('无法确定交易方向', 'error');
      return;
    }

    // 计算止损距离
    const stopDistance = entryPrice * (percentage / 100);
    const rawStopPrice = formData.side === 'LONG'
      ? entryPrice - stopDistance
      : entryPrice + stopDistance;
    
    // 格式化价格（保留8位小数，去除尾随零）
    const stopPrice = parseFloat(rawStopPrice.toFixed(8)).toString();
    
    setAddPositionData(prev => ({ ...prev, stopPrice }));
    setNotification(`已设置${percentage}%止损距离`, 'success');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="w-full border-green-200 dark:border-green-800">
      <CardHeader className="pb-4">
        {/* 实时价格显示 */}
        {formData.exchange && formData.symbol && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="space-y-2">
              {/* 交易对信息和更新时间 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {formData.exchange} {formData.symbol}
                  </span>
                  <span className="text-xs text-green-600/70 dark:text-green-300/70 font-normal">
                    加仓参考价
                  </span>
                </div>
                {displayLastUpdate && (
                  <span className="text-xs text-green-600/70 dark:text-green-300/70">
                    {displayLastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              {/* 价格显示 */}
              {displayPrice && (
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-bold font-mono ${
                      displayPriceChange === 'up' ? 'text-green-600 dark:text-green-400' :
                      displayPriceChange === 'down' ? 'text-red-600 dark:text-red-400' :
                      'text-green-700 dark:text-green-300'
                    }`}>
                      ${parseFloat(displayPrice).toLocaleString('en-US', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8
                      })}
                    </span>
                    
                    {displayPriceChange && displayPriceChange !== 'same' && (
                      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-medium ${
                        displayPriceChange === 'up' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        <span className="text-lg">
                          {displayPriceChange === 'up' ? '↗' : '↘'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            加仓计算
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className={`text-sm ${remainingPositionValue > 0 ? 'text-muted-foreground' : 'text-orange-600 dark:text-orange-400'}`}>
              剩余风险: ${remainingPositionValue.toFixed(2)}
              {remainingPositionValue === 0 && (
                <span className="ml-2 text-xs">(已满额)</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchToRecalculate}
              className="flex items-center gap-2 text-xs px-3 py-1 h-8"
              title="切换到重新计算模式"
            >
              <RefreshCw className="w-3 h-3" />
              重新计算
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          基于当前计算结果进行加仓设置
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 订单类型 */}
        <div className="space-y-2">
          <Label htmlFor="addOrderType">{t('orderType')}</Label>
          <select
            value={addPositionData.orderType}
            onChange={(e) => handleInputChange('orderType', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="MARKET">{t('marketOrder')}</option>
            <option value="LIMIT">{t('limitOrder')}</option>
          </select>
        </div>

        {/* 费率类型选择 - 限价单专用 */}
        {addPositionData.orderType === 'LIMIT' && (
          <div className="space-y-2">
            <Label htmlFor="addFeeType">{t('feeType')}</Label>
            <select
              value={addPositionData.feeType}
              onChange={(e) => handleInputChange('feeType', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="MAKER">{t('allMaker')}</option>
              <option value="TAKER">{t('allTaker')}</option>
              <option value="MAKER_OPEN_TAKER_CLOSE">{t('makerOpenTakerClose')}</option>
              <option value="MAKER_OPEN_ONLY">{t('makerOpenOnly')}</option>
            </select>
          </div>
        )}

        {/* 入场价格设置 */}
        <div className="space-y-2">
          <Label>
            {addPositionData.orderType === 'MARKET' ? '市场价格' : t('entryPrice')}
          </Label>
          
          {/* 市价单：仅显示信息提示 */}
          {addPositionData.orderType === 'MARKET' ? (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 dark:text-blue-400">📊</span>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  市价单将以实时市场价格执行
                </span>
              </div>
              {displayPrice && (
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  当前参考价格: ${parseFloat(displayPrice).toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 限价单：显示输入框和获取价格按钮 */
            <div className="flex gap-2">
              <Input
                type="text"
                value={addPositionData.limitPrice}
                onChange={(e) => handleInputChange('limitPrice', e.target.value)}
                placeholder={t('enterPrice')}
                className="flex-1"
              />
              
              {/* 获取价格按钮 */}
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchCurrentPrice}
                disabled={isFetchingPrice}
                className="flex items-center gap-2 px-4 whitespace-nowrap"
              >
                {isFetchingPrice ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs">获取中</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="text-xs">获取价格</span>
                  </>
                )}
              </Button>
            </div>
          )}
          
          {formErrors.entryPrice && (
            <p className="text-sm text-red-600">{formErrors.entryPrice}</p>
          )}
          {formErrors.limitPrice && (
            <p className="text-sm text-red-600">{formErrors.limitPrice}</p>
          )}
          {priceError && (
            <p className="text-sm text-red-600">{priceError}</p>
          )}
        </div>

        {/* 止损价格 */}
        <div className="space-y-3">
          <Label htmlFor="addStopPrice">{t('stopPrice')}</Label>
          <Input
            id="addStopPrice"
            type="text"
            value={addPositionData.stopPrice}
            onChange={(e) => handleInputChange('stopPrice', e.target.value)}
            placeholder="输入加仓止损价格"
            className="w-full"
          />
          {formErrors.stopPrice && (
            <p className="text-sm text-red-600">{formErrors.stopPrice}</p>
          )}
          
          {/* 快速止损按钮 */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">快速止损设置</div>
            <div className="grid grid-cols-3 gap-2">
              {/* 锁定上次计算的止损价格 */}
              <Button
                type="button"
                variant="outline"
                onClick={handleLockPreviousStopPrice}
                disabled={!result?.stopPrice}
                className="h-10 text-sm font-medium bg-orange-50 hover:bg-orange-100 border-orange-300 hover:border-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="锁定上次计算的止损价格"
              >
                锁定止损
              </Button>
              
              {/* 0.5%止损距离 */}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickStopWithPercentage(0.5)}
                className="h-10 text-sm font-medium bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400 transition-all"
                title="设置0.5%止损距离"
              >
                0.5%
              </Button>
              
              {/* 1.0%止损距离 */}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickStopWithPercentage(1.0)}
                className="h-10 text-sm font-medium bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400 transition-all"
                title="设置1.0%止损距离"
              >
                1.0%
              </Button>
            </div>
          </div>
        </div>

        {/* 风险金额选择 */}
        <div className="space-y-3">
          <Label htmlFor="addPositionValue">风险金额 (USDT)</Label>
          <Input
            id="addPositionValue"
            type="text"
            value={addPositionData.positionValue}
            onChange={(e) => handleInputChange('positionValue', e.target.value)}
            placeholder="输入加仓风险金额"
            className="w-full"
          />
          {formErrors.positionValue && (
            <p className="text-sm text-red-600">{formErrors.positionValue}</p>
          )}
          
          {/* 快速按钮 */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">快速选择</div>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickRiskPercent(10)}
                className="h-10 text-sm"
                disabled={remainingPositionValue <= 0}
                title="使用剩余风险的10%"
              >
                10%
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickRiskPercent(20)}
                className="h-10 text-sm"
                disabled={remainingPositionValue <= 0}
                title="使用剩余风险的20%"
              >
                20%
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickRiskPercent(50)}
                className="h-10 text-sm"
                disabled={remainingPositionValue <= 0}
                title="使用剩余风险的50%"
              >
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSetAllRemainingRisk}
                className="h-10 text-sm font-medium"
                disabled={remainingPositionValue <= 0}
                title="使用全部剩余风险"
              >
                全部
              </Button>
            </div>
            
            <div className="text-xs text-center">
              {remainingPositionValue > 0 ? (
                <span className="text-muted-foreground">
                  可用风险额度: ${remainingPositionValue.toFixed(2)} USDT
                </span>
              ) : (
                <span className="text-orange-600 dark:text-orange-400">
                  当前已满风险额度 ({initialPositionPercentage}%)，无剩余风险可加仓
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 加仓计算按钮 */}
        <Button
          onClick={() => onAddPosition(addPositionData)}
          className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
          size="lg"
          disabled={!addPositionData.positionValue || parseFloat(addPositionData.positionValue) <= 0 || remainingPositionValue <= 0}
        >
          <Plus className="w-5 h-5 mr-2" />
          计算加仓
        </Button>
      </CardContent>
    </Card>
  );
}