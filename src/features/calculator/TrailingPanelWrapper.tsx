/**
 * TrailingPanel 包装器 - 带局部错误边界
 * TrailingPanel Wrapper - with local error boundary
 */

import React from 'react';
import { LocalErrorBoundary } from '@/components/diagnostics';
import { TrailingPanel } from './TrailingPanel';
import type { 
  TrailingConfig, 
  TrailingState, 
  ExpectedPnL
} from '@/lib/core';

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

export function TrailingPanelWrapper(props: TrailingPanelProps) {
  return (
    <LocalErrorBoundary 
      moduleName="移动止盈/止损面板"
      fallback={
        <div className="p-4 text-sm border rounded-lg bg-background">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-600 text-xs">⚠</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">移动止盈/止损面板加载失败</h3>
              <p className="text-xs text-muted-foreground">
                Trailing Exit Panel failed to load
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            此模块暂时不可用，可尝试刷新重试。如持续失败请反馈错误码（已写入日志）。
          </p>
          <button 
            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90" 
            onClick={() => location.reload()}
          >
            刷新页面 Refresh
          </button>
        </div>
      }
    >
      <TrailingPanel {...props} />
    </LocalErrorBoundary>
  );
}

// 保持原始导出名称
export { TrailingPanelWrapper as TrailingPanel };