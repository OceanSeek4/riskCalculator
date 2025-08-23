/**
 * 错误处理与日志系统
 * Error handling and logging utilities
 */

import { invoke } from '@tauri-apps/api/core';

// 错误 ID 生成器
export function makeErrorId(error: unknown): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // yyyymmddHHMMss
  
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack || '' : '';
  const content = message + stack;
  
  // 简单哈希函数生成 4 位十六进制
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32 位整数
  }
  const hashHex = Math.abs(hash).toString(16).slice(0, 4).padStart(4, '0');
  
  return `${timestamp}-${hashHex}`;
}

// 格式化错误信息
export function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || '',
    };
  }
  
  if (typeof error === 'string') {
    return {
      name: 'StringError',
      message: error,
      stack: '',
    };
  }
  
  return {
    name: 'UnknownError',
    message: String(error),
    stack: '',
  };
}

// 错误上下文接口
export interface ErrorContext {
  where?: string;
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
  [key: string]: any;
}

// 错误记录载荷
export interface ErrorPayload {
  id: string;
  timestamp: string;
  error: ReturnType<typeof formatError>;
  context?: ErrorContext;
  level: 'error' | 'warn' | 'info';
}

// 主要错误捕获函数
export async function captureError(
  error: unknown, 
  context?: ErrorContext,
  level: 'error' | 'warn' | 'info' = 'error'
): Promise<string> {
  const id = makeErrorId(error);
  const timestamp = new Date().toISOString();
  
  const payload: ErrorPayload = {
    id,
    timestamp,
    error: formatError(error),
    context: {
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      ...context,
    },
    level,
  };
  
  // 开发模式下详细输出
  if (import.meta.env.VITE_DEBUG === '1') {
    console.group(`🚨 Error ${id} (${level})`);
    console.error('Error:', payload.error);
    console.log('Context:', payload.context);
    console.log('Full payload:', payload);
    console.groupEnd();
  }
  
  // 尝试写入 Tauri 日志
  try {
    // 动态导入 Tauri 日志插件，避免在非 Tauri 环境报错
    // TODO: 在 Step F 中正确配置 Tauri 日志插件
    // const logModule = await import('@tauri-apps/plugin-log');
    // const { error: tauriLogError, warn: tauriLogWarn, info: tauriLogInfo } = logModule;
    
    const logMessage = JSON.stringify(payload);
    
    // 暂时跳过 Tauri 日志写入，在 Step F 中完成
    if (import.meta.env.VITE_DEBUG === '1') {
      console.log(`📝 Tauri log (${level}):`, logMessage);
    }
    
    // switch (level) {
    //   case 'error':
    //     await tauriLogError(logMessage);
    //     break;
    //   case 'warn':
    //     await tauriLogWarn(logMessage);
    //     break;
    //   case 'info':
    //     await tauriLogInfo(logMessage);
    //     break;
    // }
  } catch (logError) {
    // 静默失败，不影响主要功能
    if (import.meta.env.VITE_DEBUG === '1') {
      console.warn('Failed to write to Tauri log:', logError);
    }
  }
  
  return id;
}

// 便捷方法
export const logError = (error: unknown, context?: ErrorContext) => 
  captureError(error, context, 'error');

export const logWarning = (error: unknown, context?: ErrorContext) => 
  captureError(error, context, 'warn');

export const logInfo = (error: unknown, context?: ErrorContext) => 
  captureError(error, context, 'info');

// 全局错误处理器设置
export function setupGlobalErrorHandlers() {
  // 捕获同步错误
  window.addEventListener('error', (event) => {
    captureError(event.error || event.message, {
      where: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  
  // 捕获 Promise 未处理的拒绝
  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason || event, {
      where: 'unhandledrejection',
      promise: event.promise?.toString(),
    });
  });
  
  if (import.meta.env.VITE_DEBUG === '1') {
    console.log('🛡️ Global error handlers initialized');
  }
}

// 创建错误详情的可复制文本
export function createErrorSummary(errorId: string, error: unknown, context?: ErrorContext): string {
  const formatted = formatError(error);
  const summary = {
    errorId,
    timestamp: new Date().toISOString(),
    error: formatted,
    context,
    app: 'Risk Calculator',
    version: '1.0.0', // 可以从 package.json 动态获取
  };
  
  return JSON.stringify(summary, null, 2);
}

// 复制到剪贴板的辅助函数
export async function copyErrorToClipboard(errorId: string, error: unknown, context?: ErrorContext): Promise<boolean> {
  try {
    const summary = createErrorSummary(errorId, error, context);
    
    // 优先使用 Tauri 剪贴板 API
    try {
      await invoke('plugin:clipboard-manager|write_text', { data: summary });
      return true;
    } catch {
      // 回退到 Web API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(summary);
        return true;
      } else {
        // 最后回退到传统方法
        const textArea = document.createElement('textarea');
        textArea.value = summary;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      }
    }
  } catch (clipboardError) {
    console.warn('Failed to copy error to clipboard:', clipboardError);
    return false;
  }
}