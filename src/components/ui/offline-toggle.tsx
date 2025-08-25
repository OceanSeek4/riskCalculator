import React from 'react';
import { Wifi, WifiOff, Globe, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/lib/store';
import { Button } from './button';

export function OfflineToggle() {
  const { 
    isOfflineMode, 
    offlineReason, 
    networkFailureCount,
    setOfflineMode,
    resetNetworkFailures
  } = useSettingsStore();

  const handleToggleOffline = () => {
    if (isOfflineMode) {
      // Switch back to online mode and reset failure count
      setOfflineMode(false);
      resetNetworkFailures();
    } else {
      // Switch to offline mode manually
      setOfflineMode(true, '手动切换到离线模式');
    }
  };

  const getStatusIcon = () => {
    if (isOfflineMode) {
      return <WifiOff className="w-4 h-4" />;
    } else {
      return networkFailureCount > 0 ? <AlertCircle className="w-4 h-4" /> : <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusLabel = () => {
    if (isOfflineMode) {
      return '离线模式';
    } else if (networkFailureCount > 0) {
      return `在线 (失败${networkFailureCount}次)`;
    } else {
      return '在线模式';
    }
  };

  const getStatusColor = () => {
    if (isOfflineMode) {
      return 'text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-600 dark:hover:bg-orange-950';
    } else if (networkFailureCount > 0) {
      return 'text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-600 dark:hover:bg-yellow-950';
    } else {
      return 'text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-950';
    }
  };

  const getTooltip = () => {
    if (isOfflineMode) {
      return `离线模式 ${offlineReason ? `(${offlineReason})` : ''} - 点击切换到在线模式`;
    } else if (networkFailureCount > 0) {
      return `在线模式 - 网络失败${networkFailureCount}次 (达到3次将自动切换离线) - 点击手动切换离线模式`;
    } else {
      return '在线模式 - 可获取实时市场数据 - 点击切换到离线模式';
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggleOffline}
      className={`gap-2 text-xs ${getStatusColor()}`}
      title={getTooltip()}
    >
      {getStatusIcon()}
      <span className="hidden sm:inline">{getStatusLabel()}</span>
      {networkFailureCount > 0 && !isOfflineMode && (
        <span className="text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1 rounded">
          {networkFailureCount}
        </span>
      )}
    </Button>
  );
}