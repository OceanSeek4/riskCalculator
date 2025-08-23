import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CalculatorFormData, SettingsData } from './validation';
import { CalcResult } from './core';
import type { TrailingConfig, TrailingState } from './core/trailing';
// 步骤4.2：导入Tauri Store工具（追加）
import { loadJSON, saveJSON, cleanupExpiredStates } from './tauri-store';

// 步骤4.2：防抖工具（追加）
let saveTrailingTimer: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 400;

interface CalculatorState {
  // Form data
  formData: Partial<CalculatorFormData>;
  setFormData: (data: Partial<CalculatorFormData>) => void;
  resetFormData: () => void;
  syncWithSettings: (settings: SettingsData) => void;
  
  // Calculation result
  result: CalcResult | null;
  setResult: (result: CalcResult | null) => void;
  
  // Market data
  currentATR: string | null;
  setCurrentATR: (atr: string | null) => void;
  
  currentMA: string | null;
  setCurrentMA: (ma: string | null) => void;
  
  // Loading states
  isCalculating: boolean;
  setIsCalculating: (loading: boolean) => void;
  
  isFetchingATR: boolean;
  setIsFetchingATR: (loading: boolean) => void;
  
  isFetchingMA: boolean;
  setIsFetchingMA: (loading: boolean) => void;
  
  isFetchingMarketData: boolean;
  setIsFetchingMarketData: (loading: boolean) => void;
  
  // Error states
  calculationError: string | null;
  setCalculationError: (error: string | null) => void;
  
  marketDataError: string | null;
  setMarketDataError: (error: string | null) => void;
  
  atrError: string | null;
  setATRError: (error: string | null) => void;
  
  maError: string | null;
  setMAError: (error: string | null) => void;
  
  // Trailing exits state
  trailingEnabled: boolean;
  setTrailingEnabled: (enabled: boolean) => void;
  trailingConfig: TrailingConfig;
  updateTrailingConfig: (config: Partial<TrailingConfig>) => void;
  trailingState: TrailingState;
  setTrailingState: (state: TrailingState) => void;
  
  // 步骤4.2：持久化方法（追加）
  hydrate: () => Promise<void>;
  saveTrailing: () => void;
  saveTrailingState: (exchange: string, symbol: string, tfMs: number, state: TrailingState) => Promise<void>;
  loadTrailingState: (exchange: string, symbol: string, tfMs: number) => Promise<TrailingState | null>;
}

interface SettingsState {
  settings: SettingsData;
  setSettings: (settings: Partial<SettingsData>) => void;
  resetSettings: () => void;
  
  // Notification state
  showNotification: boolean;
  notificationMessage: string;
  notificationType: 'success' | 'error' | 'info';
  setNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;
}

interface PresetState {
  presets: Array<{
    id: string;
    name: string;
    data: Partial<CalculatorFormData>;
    createdAt: Date;
  }>;
  addPreset: (name: string, data: Partial<CalculatorFormData>) => void;
  removePreset: (id: string) => void;
  loadPreset: (id: string) => Partial<CalculatorFormData> | null;
}

// Default form values
const defaultFormData: Partial<CalculatorFormData> = {
  exchange: 'BINANCE',
  symbol: 'BTCUSDT',
  contractMode: 'USDT_PERP',
  side: 'LONG',
  stopMode: 'PRICE',
  riskMode: 'ACCOUNT_PERCENT',
  orderType: 'MARKET',
  leverage: 10,
  atrPeriod: 14,
  atrTimeframe: '15m',
  feeOpen: '0.0006',
  feeClose: '0.0006',
  slippage: '0.0005',
  autoLeverage: false,
  maxEquityUsage: '0.8',
};

// Default trailing configuration
const defaultTrailingConfig: TrailingConfig = {
  side: 'LONG',
  strategy: 'MA_CROSS_EXIT',
  maType: 'EMA',
  maLen: 20,
  atrLen: 14,
  tfMs: 900000, // 15 minutes
  offsetType: 'ATRx',
  k: 2,
  roundTick: 0.01,
  onCloseOnly: true,
  rrTargets: [1, 1.5, 2],
};

// Create trailing config from settings
function createTrailingConfigFromSettings(settings: SettingsData, side: 'LONG' | 'SHORT' = 'LONG'): TrailingConfig {
  // Convert timeframe string to milliseconds
  const timeframeToMs = (tf: string): number => {
    const timeframes: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return timeframes[tf] || 60 * 60 * 1000; // Default to 1h
  };

  return {
    side,
    strategy: settings.defaultTrailingStrategy,
    maType: settings.defaultTrailingMaType,
    maLen: settings.defaultTrailingMaPeriod,
    atrLen: settings.defaultTrailingAtrPeriod,
    tfMs: timeframeToMs(settings.defaultTrailingTimeframe),
    offsetType: settings.defaultTrailingOffsetType,
    k: settings.defaultTrailingAtrMultiplier,
    pct: settings.defaultTrailingPercentage / 100, // Convert percentage to decimal
    abs: settings.defaultTrailingAbsolute,
    roundTick: 0.01, // Will be updated from market metadata
    onCloseOnly: settings.defaultTrailingOnCloseOnly,
    rrTargets: settings.rrRatios,
  };
}

// Default trailing state
const defaultTrailingState: TrailingState = {
  indicators: {},
};

// Default settings
const defaultSettings: SettingsData = {
  defaultExchange: 'BINANCE',
  defaultSymbol: 'BTCUSDT',
  defaultContractMode: 'USDT_PERP',
  defaultStopMode: 'PRICE',
  defaultTakeProfitMode: 'PRICE',
  defaultUseTakeProfit: true,
  defaultRiskMode: 'ACCOUNT_PERCENT',
  defaultOrderType: 'MARKET',
  defaultLeverage: 10,
  defaultAccountEquity: '100000',
  defaultRiskPercent: '2',
  defaultRiskAmount: '1000',
  defaultFeeOpen: '0.0006',
  defaultFeeClose: '0.0006',
  defaultSlippage: '0.0005',
  defaultIncludeFees: true,
  defaultAtrPeriod: 14,
  defaultAtrTimeframe: '15m',
  defaultAtrMultiplier: '2',
  defaultTakeProfitPrice: '',
  defaultTakeProfitATRMultiplier: '2',
  defaultTakeProfitRRRatio: '2',
  defaultStopPips: '2000',
  defaultTakeProfitPips: '5000',
  // Trailing stop defaults
  defaultTrailingEnabled: false,
  defaultTrailingStrategy: 'MA_CROSS_EXIT',
  defaultTrailingMaType: 'EMA',
  defaultTrailingMaPeriod: 20,
  defaultTrailingAtrPeriod: 14,
  defaultTrailingTimeframe: '15m',
  defaultTrailingOffsetType: 'ATRx',
  defaultTrailingAtrMultiplier: 2,
  defaultTrailingPercentage: 0.5,
  defaultTrailingAbsolute: 10,
  defaultTrailingOnCloseOnly: true,
  // Symbol list for dropdown
  symbolList: ['BTCUSDT', 'ETHUSDT', 'SUIUSDT', 'ADAUSDT', 'XRPUSDT'],
  rrRatios: [1, 1.5, 2],
  theme: 'system',
  language: 'zh',
  autoFetchATR: true,
  showAdvancedOptions: true,
};

// Calculator store
export const useCalculatorStore = create<CalculatorState>((set) => ({
  // Form data
  formData: defaultFormData,
  setFormData: (data) => set((state) => ({
    formData: { ...state.formData, ...data }
  })),
  resetFormData: () => set({ formData: defaultFormData }),
  syncWithSettings: (settings) => set((state) => {
    // Create trailing config from settings using current side or default to LONG
    const currentSide = state.formData.side || 'LONG';
    const trailingConfigFromSettings = createTrailingConfigFromSettings(settings, currentSide);
    
    return {
      formData: {
        ...state.formData,
        exchange: settings.defaultExchange,
        symbol: settings.defaultSymbol,
        contractMode: settings.defaultContractMode,
        stopMode: settings.defaultStopMode,
        useTakeProfit: settings.defaultUseTakeProfit,
        takeProfitMode: settings.defaultTakeProfitMode,
        takeProfitPrice: settings.defaultTakeProfitPrice,
        takeProfitATRMultiplier: settings.defaultTakeProfitATRMultiplier,
        takeProfitRRRatio: settings.defaultTakeProfitRRRatio,
        stopPips: settings.defaultStopPips,
        takeProfitPips: settings.defaultTakeProfitPips,
        riskMode: settings.defaultRiskMode,
        orderType: settings.defaultOrderType,
        leverage: settings.defaultLeverage,
        accountEquity: settings.defaultAccountEquity,
        riskPercent: settings.defaultRiskPercent,
        riskAmount: settings.defaultRiskAmount,
        atrPeriod: settings.defaultAtrPeriod,
        atrTimeframe: settings.defaultAtrTimeframe,
        atrMultiplier: settings.defaultAtrMultiplier,
        includeFees: settings.defaultIncludeFees,
        feeOpen: settings.defaultFeeOpen,
        feeClose: settings.defaultFeeClose,
        slippage: settings.defaultSlippage,
      },
      // Apply trailing stop defaults
      trailingEnabled: settings.defaultTrailingEnabled,
      trailingConfig: {
        ...state.trailingConfig,
        ...trailingConfigFromSettings,
        // Preserve current roundTick if already set from market metadata
        roundTick: state.trailingConfig.roundTick || trailingConfigFromSettings.roundTick,
      }
    };
  }),
  
  // Calculation result
  result: null,
  setResult: (result) => set({ result }),
  
  // Market data
  currentATR: null,
  setCurrentATR: (atr) => set({ currentATR: atr }),
  
  currentMA: null,
  setCurrentMA: (ma) => set({ currentMA: ma }),
  
  // Loading states
  isCalculating: false,
  setIsCalculating: (loading) => set({ isCalculating: loading }),
  
  isFetchingATR: false,
  setIsFetchingATR: (loading) => set({ isFetchingATR: loading }),
  
  isFetchingMA: false,
  setIsFetchingMA: (loading) => set({ isFetchingMA: loading }),
  
  isFetchingMarketData: false,
  setIsFetchingMarketData: (loading) => set({ isFetchingMarketData: loading }),
  
  // Error states
  calculationError: null,
  setCalculationError: (error) => set({ calculationError: error }),
  
  marketDataError: null,
  setMarketDataError: (error) => set({ marketDataError: error }),
  
  atrError: null,
  setATRError: (error) => set({ atrError: error }),
  
  maError: null,
  setMAError: (error) => set({ maError: error }),
  
  // Trailing exits state
  trailingEnabled: false,
  setTrailingEnabled: (enabled) => set({ trailingEnabled: enabled }),
  trailingConfig: defaultTrailingConfig,
  updateTrailingConfig: (config) => set((state) => ({
    trailingConfig: { ...state.trailingConfig, ...config }
  })),
  trailingState: defaultTrailingState,
  setTrailingState: (state) => set({ trailingState: state }),
  
  // 步骤4.2：持久化方法实现（追加）
  hydrate: async () => {
    try {
      // 清理过期的trailingState数据
      await cleanupExpiredStates('trailingState:');
      
      // 加载trailing配置
      const savedTrailing = await loadJSON<{
        enabled: boolean;
        config: TrailingConfig;
      }>('trailing');
      
      if (savedTrailing) {
        set({
          trailingEnabled: savedTrailing.enabled,
          trailingConfig: { ...defaultTrailingConfig, ...savedTrailing.config }
        });
      }
    } catch (error) {
      console.warn('Failed to hydrate trailing config:', error);
    }
  },
  
  saveTrailing: () => {
    if (saveTrailingTimer) {
      clearTimeout(saveTrailingTimer);
    }
    
    saveTrailingTimer = setTimeout(async () => {
      const state = useCalculatorStore.getState();
      try {
        await saveJSON('trailing', {
          enabled: state.trailingEnabled,
          config: state.trailingConfig
        });
      } catch (error) {
        console.error('Failed to save trailing config:', error);
      }
    }, SAVE_DEBOUNCE_MS);
  },
  
  saveTrailingState: async (exchange: string, symbol: string, tfMs: number, state: TrailingState) => {
    try {
      const key = `trailingState:${exchange}:${symbol}:${tfMs}`;
      const data = {
        ...state,
        ts: Date.now() // 添加时间戳
      };
      await saveJSON(key, data);
    } catch (error) {
      console.error(`Failed to save trailing state for ${exchange}:${symbol}:${tfMs}:`, error);
    }
  },
  
  // 步骤4.2：加载特定市场的trailing状态（追加）
  loadTrailingState: async (exchange: string, symbol: string, tfMs: number): Promise<TrailingState | null> => {
    try {
      const key = `trailingState:${exchange}:${symbol}:${tfMs}`;
      const data = await loadJSON<TrailingState & { ts?: number }>(key);
      
      if (data) {
        // 检查是否过期（>12小时）
        const now = Date.now();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        
        if (data.ts && (now - data.ts) > TWELVE_HOURS) {
          return null;
        }
        
        // 移除时间戳，返回纯净的TrailingState
        const { ts, ...cleanState } = data;
        return cleanState;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to load trailing state for ${exchange}:${symbol}:${tfMs}:`, error);
      return null;
    }
  },
}));

// Settings store with persistence
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      resetSettings: () => set({ settings: defaultSettings }),
      
      // Notification state
      showNotification: false,
      notificationMessage: '',
      notificationType: 'info' as const,
      setNotification: (message, type) => set({
        showNotification: true,
        notificationMessage: message,
        notificationType: type
      }),
      clearNotification: () => set({
        showNotification: false,
        notificationMessage: '',
        notificationType: 'info' as const
      }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Version 0 to 1: Update symbol list with new defaults
        if (version < 1) {
          const state = persistedState as any;
          if (state && state.settings) {
            // If symbolList is empty or using old defaults, update it
            if (!state.settings.symbolList || state.settings.symbolList.length === 0 || 
                JSON.stringify(state.settings.symbolList) === JSON.stringify(['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'XRPUSDT', 'SUIUSDT'])) {
              state.settings.symbolList = ['BTCUSDT', 'ETHUSDT', 'SUIUSDT', 'ADAUSDT', 'XRPUSDT'];
            }
          }
        }
        return persistedState;
      },
    }
  )
);

// Presets store with persistence
export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      addPreset: (name, data) => {
        const preset = {
          id: crypto.randomUUID(),
          name,
          data,
          createdAt: new Date(),
        };
        set((state) => ({
          presets: [preset, ...state.presets]
        }));
      },
      removePreset: (id) => set((state) => ({
        presets: state.presets.filter(p => p.id !== id)
      })),
      loadPreset: (id) => {
        const preset = get().presets.find(p => p.id === id);
        return preset?.data || null;
      },
    }),
    {
      name: 'presets-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);