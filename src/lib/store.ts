import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CalculatorFormData, SettingsData } from './validation';
import { CalcResult } from './core';

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
  
  // Loading states
  isCalculating: boolean;
  setIsCalculating: (loading: boolean) => void;
  
  isFetchingATR: boolean;
  setIsFetchingATR: (loading: boolean) => void;
  
  isFetchingMarketData: boolean;
  setIsFetchingMarketData: (loading: boolean) => void;
  
  // Error states
  calculationError: string | null;
  setCalculationError: (error: string | null) => void;
  
  marketDataError: string | null;
  setMarketDataError: (error: string | null) => void;
  
  atrError: string | null;
  setATRError: (error: string | null) => void;
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
  riskMode: 'FIXED_USDT',
  orderType: 'MARKET',
  leverage: 10,
  atrPeriod: 14,
  atrTimeframe: '1h',
  includeFees: false,
  feeOpen: '0.0004',
  feeClose: '0.0004',
  slippage: '0.0005',
  autoLeverage: false,
  maxEquityUsage: '0.8',
};

// Default settings
const defaultSettings: SettingsData = {
  defaultExchange: 'BINANCE',
  defaultSymbol: 'BTCUSDT',
  defaultContractMode: 'USDT_PERP',
  defaultStopMode: 'PRICE',
  defaultTakeProfitMode: 'PRICE',
  defaultUseTakeProfit: false,
  defaultRiskMode: 'FIXED_USDT',
  defaultOrderType: 'MARKET',
  defaultLeverage: 10,
  defaultAccountEquity: '10000',
  defaultRiskPercent: '1',
  defaultRiskAmount: '100',
  defaultFeeOpen: '0.0004',
  defaultFeeClose: '0.0004',
  defaultSlippage: '0.0005',
  defaultAtrPeriod: 14,
  defaultAtrTimeframe: '1h',
  defaultAtrMultiplier: '2',
  defaultTakeProfitATRMultiplier: '2',
  defaultTakeProfitMAPeriod: '20',
  defaultTakeProfitMATimeframe: '1h',
  rrRatios: [1, 1.5, 2],
  theme: 'system',
  language: 'en',
  autoFetchATR: true,
  showAdvancedOptions: false,
};

// Calculator store
export const useCalculatorStore = create<CalculatorState>((set) => ({
  // Form data
  formData: defaultFormData,
  setFormData: (data) => set((state) => ({
    formData: { ...state.formData, ...data }
  })),
  resetFormData: () => set({ formData: defaultFormData }),
  syncWithSettings: (settings) => set((state) => ({
    formData: {
      ...state.formData,
      exchange: settings.defaultExchange,
      symbol: settings.defaultSymbol,
      contractMode: settings.defaultContractMode,
      stopMode: settings.defaultStopMode,
      useTakeProfit: settings.defaultUseTakeProfit,
      takeProfitMode: settings.defaultTakeProfitMode,
      takeProfitATRMultiplier: settings.defaultTakeProfitATRMultiplier,
      takeProfitMAPeriod: settings.defaultTakeProfitMAPeriod,
      takeProfitMATimeframe: settings.defaultTakeProfitMATimeframe,
      riskMode: settings.defaultRiskMode,
      orderType: settings.defaultOrderType,
      leverage: settings.defaultLeverage,
      accountEquity: settings.defaultAccountEquity,
      riskPercent: settings.defaultRiskPercent,
      riskAmount: settings.defaultRiskAmount,
      atrPeriod: settings.defaultAtrPeriod,
      atrTimeframe: settings.defaultAtrTimeframe,
      atrMultiplier: settings.defaultAtrMultiplier,
      feeOpen: settings.defaultFeeOpen,
      feeClose: settings.defaultFeeClose,
      slippage: settings.defaultSlippage,
    }
  })),
  
  // Calculation result
  result: null,
  setResult: (result) => set({ result }),
  
  // Market data
  currentATR: null,
  setCurrentATR: (atr) => set({ currentATR: atr }),
  
  // Loading states
  isCalculating: false,
  setIsCalculating: (loading) => set({ isCalculating: loading }),
  
  isFetchingATR: false,
  setIsFetchingATR: (loading) => set({ isFetchingATR: loading }),
  
  isFetchingMarketData: false,
  setIsFetchingMarketData: (loading) => set({ isFetchingMarketData: loading }),
  
  // Error states
  calculationError: null,
  setCalculationError: (error) => set({ calculationError: error }),
  
  marketDataError: null,
  setMarketDataError: (error) => set({ marketDataError: error }),
  
  atrError: null,
  setATRError: (error) => set({ atrError: error }),
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