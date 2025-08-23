/**
 * 错误边界组件 - 捕获 React 组件树中的错误
 * Error Boundary Component - Catches errors in React component tree
 */

import React, { Component, ReactNode } from 'react';
import { captureError, copyErrorToClipboard } from '@/lib/error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  showDetails: boolean;
  copyStatus: 'idle' | 'copying' | 'copied' | 'failed';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      copyStatus: 'idle',
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
      where: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    this.setState({
      errorInfo,
      errorId,
    });

    // 调用可选的错误回调
    this.props.onError?.(error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleRestart = async () => {
    try {
      // 尝试调用 Tauri 重启应用
      const processModule = await import('@tauri-apps/plugin-process');
      await processModule.relaunch();
    } catch (restartError) {
      // 回退到页面刷新
      if (import.meta.env.VITE_DEBUG === '1') {
        console.warn('Failed to restart via Tauri, falling back to reload:', restartError);
      }
      window.location.reload();
    }
  };

  handleCopyError = async () => {
    if (!this.state.error) return;

    this.setState({ copyStatus: 'copying' });

    const success = await copyErrorToClipboard(
      this.state.errorId,
      this.state.error,
      {
        where: 'ErrorBoundary',
        componentStack: this.state.errorInfo?.componentStack,
      }
    );

    this.setState({
      copyStatus: success ? 'copied' : 'failed',
    });

    // 重置状态
    setTimeout(() => {
      this.setState({ copyStatus: 'idle' });
    }, 2000);
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义回退组件，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认全屏错误页面
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  应用程序遇到错误
                </h1>
                <p className="text-sm text-muted-foreground">
                  Application encountered an error
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-muted-foreground">
                    错误代码 Error Code:
                  </span>
                  <span className="text-sm font-mono font-semibold">
                    {this.state.errorId}
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  应用程序已自动记录此错误。您可以尝试刷新页面或重启应用。
                </p>
                <p>
                  The error has been automatically logged. You can try refreshing or restarting the app.
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleRefresh} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新页面 Refresh
                </Button>

                <Button onClick={this.handleRestart} variant="outline">
                  重启应用 Restart App
                </Button>

                <Button
                  onClick={this.handleCopyError}
                  variant="outline"
                  disabled={this.state.copyStatus === 'copying'}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {this.state.copyStatus === 'copying' && '复制中...'}
                  {this.state.copyStatus === 'copied' && '已复制 ✓'}
                  {this.state.copyStatus === 'failed' && '复制失败 ✗'}
                  {this.state.copyStatus === 'idle' && '复制详情 Copy Details'}
                </Button>
              </div>

              {/* 技术细节（可展开） */}
              <div className="border-t pt-4">
                <Button
                  onClick={this.toggleDetails}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                >
                  <span>技术细节 Technical Details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {this.state.showDetails && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">错误消息 Message:</h4>
                      <p className="text-xs bg-muted p-2 rounded font-mono break-words">
                        {this.state.error?.message}
                      </p>
                    </div>

                    {this.state.error?.stack && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">堆栈跟踪 Stack Trace:</h4>
                        <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}

                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">组件栈 Component Stack:</h4>
                        <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground text-center">
                如果问题持续出现，请联系技术支持并提供错误代码。
                <br />
                If the issue persists, please contact support with the error code.
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// 函数式组件包装器，方便使用
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}