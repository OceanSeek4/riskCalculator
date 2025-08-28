import React, { useState, useEffect } from 'react';
import { CalculatorForm } from './CalculatorForm';
import { CompactCalculatorForm } from './CompactCalculatorForm';
import { ResultCard } from './ResultCard';
import { useCalculatorStore } from '@/lib/store';

type ViewMode = 'full' | 'compact';

export function CalculatorPageManager() {
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

  // 当有计算结果时，自动切换到简易模式
  useEffect(() => {
    if (result && viewMode === 'full') {
      setViewMode('compact');
    }
  }, [result, viewMode]);

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

  return (
    <div className="max-w-[1920px] mx-auto px-4">
      {viewMode === 'full' ? (
        // 完整的计算器表单（初始状态）
        <div className="flex justify-center">
          <CalculatorForm />
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
