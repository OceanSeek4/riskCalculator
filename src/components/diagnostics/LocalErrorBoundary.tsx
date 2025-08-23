/**
 * 局部错误边界组件 - 用于包装单个功能模块
 * Local Error Boundary Component - Wraps individual feature modules
 */

import React, { Component, ReactNode } from 'react';
import { captureError } from '@/lib/error';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class LocalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = await captureError(error, {
      where: 'LocalErrorBoundary',
      module: this.props.moduleName,
      componentStack: errorInfo.componentStack,
      local: true,
    });

    this.setState({ errorId });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: '',
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义回退组件，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认局部错误卡片
      return (
        <div className="p-4 border rounded-lg bg-background">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="font-semibold text-sm">
                {this.props.moduleName ? `${this.props.moduleName} 加载失败` : '模块加载失败'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Module failed to load
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground mb-3">
            <p>错误代码: {this.state.errorId}</p>
            <p>可尝试重新加载此模块，或刷新整个页面。</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={this.handleRetry} size="sm" variant="outline">
              <RefreshCw className="h-3 w-3 mr-1" />
              重试 Retry
            </Button>
            <Button onClick={this.handleRefresh} size="sm" variant="ghost">
              刷新页面 Refresh
            </Button>
          </div>

          {import.meta.env.VITE_DEBUG === '1' && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">调试信息:</p>
              <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                {this.state.error?.message}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// 便捷的 HOC 包装器
export function withLocalErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  moduleName?: string,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <LocalErrorBoundary moduleName={moduleName} fallback={fallback}>
        <Component {...props} />
      </LocalErrorBoundary>
    );
  };
}