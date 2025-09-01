import React, { useState, useEffect } from 'react';
import { CalculatorForm } from './CalculatorForm';
import { CompactCalculatorForm } from './CompactCalculatorForm';
import { QuickCalculatorForm } from './QuickCalculatorForm';
import { QuickHintsPanel } from './QuickHintsPanel';
import { ResultCard } from './ResultCard';
import { useCalculatorStore, useSettingsStore } from '@/lib/store';

type ViewMode = 'full' | 'compact' | 'quick';

export function CalculatorPageManager() {
  const { settings } = useSettingsStore();
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
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // 当有计算结果时，自动切换到简易模式
  useEffect(() => {
    if (result && viewMode === 'full') {
      setViewMode('compact');
    }
  }, [result, viewMode]);

  // 快速模式下有计算结果时，自动跳转到compact模式
  useEffect(() => {
    if (result && viewMode === 'quick') {
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
    
    // 根据设置决定返回到哪个模式
    const targetMode = settings.defaultViewMode || 'full';
    setViewMode(targetMode);
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
          
          {/* 快速模式主要内容 */}
          <div className={`transition-all duration-500 ease-in-out ${
            showSettingsPanel 
              ? 'grid lg:grid-cols-2 gap-6' 
              : 'flex justify-center'
          }`}>
            {/* 快速计算表单 */}
            <div className={`space-y-4 transition-all duration-500 ease-in-out ${
              showSettingsPanel 
                ? 'w-full' 
                : 'w-full max-w-2xl'
            }`}>
              <QuickCalculatorForm 
                onFeeTypeChange={setCurrentFeeType}
                onBackToFull={handleQuickToFull}
                onStopPriceChange={setHasStopPriceInput}
                showSettingsPanel={showSettingsPanel}
                onToggleSettingsPanel={() => setShowSettingsPanel(!showSettingsPanel)}
              />
            </div>
            
            {/* 参数显示 */}
            <div className={`space-y-4 transition-all duration-500 ease-in-out ${
              showSettingsPanel 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-4 pointer-events-none'
            } ${!showSettingsPanel ? 'absolute' : 'relative'}`}>
              {showSettingsPanel && (
                <QuickHintsPanel 
                  currentFeeType={currentFeeType} 
                  hasStopPriceInput={hasStopPriceInput}
                />
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
