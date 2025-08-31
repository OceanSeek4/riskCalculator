import React, { useState, useEffect } from 'react';
import { CalculatorForm } from './CalculatorForm';
import { CompactCalculatorForm } from './CompactCalculatorForm';
import { QuickCalculatorForm } from './QuickCalculatorForm';
import { QuickHintsPanel } from './QuickHintsPanel';
import { ResultCard } from './ResultCard';
import { useCalculatorStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';

type ViewMode = 'full' | 'compact' | 'quick';

export function CalculatorPageManager() {
  const { t } = useTranslation();
  const { 
    result, 
    setResult, 
    resetFormData,
    setCurrentATR,
    setCurrentMA,
    setCalculationError,
    setATRError,
    setMAError,
    setIsPriceLocked,
    setLockedPrice,
    setRealTimePrice,
    setLastPriceUpdate,
    setPriceChange,
    setTrailingEnabled,
    setIsCalculating,
    setIsFetchingATR,
    setIsFetchingMA,
  } = useCalculatorStore();
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [currentFeeType, setCurrentFeeType] = useState<'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY'>('MAKER_OPEN_TAKER_CLOSE');
  const [hasStopPriceInput, setHasStopPriceInput] = useState(false);

  // 当有计算结果时，自动切换到简易模式
  useEffect(() => {
    if (result && viewMode === 'full') {
      setViewMode('compact');
    }
  }, [result, viewMode]);

  // 切换到快速模式
  const handleSwitchToQuick = () => {
    setViewMode('quick');
  };

  // 切换回完整表单模式
  const handleBackToFull = () => {
    // 清空计算结果
    setResult(null);
    
    // 重置表单数据到默认状态
    resetFormData();
    
    // 重置所有相关状态
    setCurrentATR(null);
    setCurrentMA(null);
    setCalculationError(null);
    setATRError(null);
    setMAError(null);
    setIsPriceLocked(false);
    setLockedPrice(null);
    setRealTimePrice('');
    setLastPriceUpdate(null);
    setPriceChange(null);
    setTrailingEnabled(false);
    setIsCalculating(false);
    setIsFetchingATR(false);
    setIsFetchingMA(false);
    
    // 切换回完整视图
    setViewMode('full');
  };

  // 从快速模式切换回完整模式
  const handleQuickToFull = () => {
    setViewMode('full');
  };

  return (
    <div className="max-w-[1920px] mx-auto px-4">
      {viewMode === 'full' ? (
        // 完整的计算器表单（初始状态）
        <div className="flex justify-center">
          <CalculatorForm onSwitchToQuick={handleSwitchToQuick} />
        </div>
      ) : viewMode === 'quick' ? (
        // 快速模式：简化的4字段界面
        <div className="w-full">
          {/* 快速模式标题和返回按钮 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t('quickCalculator')}</h2>
              <p className="text-sm text-muted-foreground">{t('quickCalculatorDescription')}</p>
            </div>
          </div>
          
          {/* 快速模式主要内容 */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 左侧：快速计算表单 */}
            <div className="space-y-4">
              <QuickCalculatorForm 
                onFeeTypeChange={setCurrentFeeType}
                onBackToFull={handleQuickToFull}
                onStopPriceChange={setHasStopPriceInput}
              />
            </div>
            
            {/* 右侧：参数显示和结果 */}
            <div className="space-y-4">
              <QuickHintsPanel 
                currentFeeType={currentFeeType} 
                hasStopPriceInput={hasStopPriceInput}
              />
              
              {/* 结果显示 */}
              {result && (
                <div className="mt-6">
                  <ResultCard />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // 简易模式：显示紧凑计算器和结果
        <div className="w-full">
          {/* 简易版计算器（包含左侧参数和右侧计算器） */}
          <div className="mb-6">
            <CompactCalculatorForm onBackToFull={handleBackToFull} />
          </div>
          {/* 结果卡片 */}
          {result && (
            <div className="flex justify-center">
              <ResultCard />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
