import { createContext, useContext } from 'react';
import type { CalculatorFormData } from '@/lib/validation';

export interface CalculatorFormContextValue {
  // Form data access
  formData: Partial<CalculatorFormData>;
  formErrors: Record<string, string>;
  
  // Form actions
  handleInputChange: (field: string, value: any) => void;
  
  // Market metadata and states
  marketMeta: any;
  isFetchingMeta: boolean;
  supportedIntervals: string[];
  
  // Price states
  displayPrice: string;
  displayPriceChange: 'up' | 'down' | 'same' | null;
  displayLastUpdate: Date | null;
  displayPriceDiff: number;
  realTimePrice: string | null;
  priceChange: 'up' | 'down' | 'same' | null;
  lastPriceUpdate: number | null;
  isPriceLocked: boolean;
  isQuickUpdating: boolean;
  
  // ATR states
  currentATR: string | null;
  isFetchingATR: boolean;
  
  // MA states  
  currentMA: string | null;
  isFetchingMA: boolean;
  
  // Actions
  fetchCurrentPrice: () => void;
  fetchMarketMetadata: () => void;
  handleFetchATR: () => void;
  handleLockPrice: () => void;
  handleUnlockPrice: () => void;
  handleQuickUpdate: () => void;
  handleManualPriceChange: (newPrice: string) => void;
  handleSavePreset: () => void;
  handleLoadPreset: (id: string) => void;
  handleCopyPlan: () => void;
}

export const CalculatorFormContext = createContext<CalculatorFormContextValue | null>(null);

export function useCalculatorFormContext() {
  const context = useContext(CalculatorFormContext);
  if (!context) {
    throw new Error('useCalculatorFormContext must be used within CalculatorFormProvider');
  }
  return context;
}