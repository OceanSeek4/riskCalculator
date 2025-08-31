import { useCalculatorStore } from '@/lib/store';

export type PriceBindMode = 'market' | 'manual';

/**
 * Hook for managing entry price binding modes and limit order protection
 * 
 * Provides unified logic for preventing automatic price overwrites in limit orders
 * while allowing market order price following behavior.
 */
export function useEntryPriceBinding() {
  const {
    bindModeForEntry,
    setBindModeForEntry,
    lastManualAt,
    setLastManualAt,
    formData,
    setFormData
  } = useCalculatorStore();

  /**
   * Check if automatic price writes should be allowed
   * Only allows auto-writes for market orders in 'market' mode without manual protection
   */
  const shouldAllowAutoWrite = (orderType: 'MARKET' | 'LIMIT'): boolean => {
    if (orderType === 'LIMIT') {
      return false; // Never auto-write for limit orders
    }
    
    // For market orders, check binding mode and manual protection
    const isManualProtected = lastManualAt && (Date.now() - lastManualAt < 15000);
    return bindModeForEntry === 'market' && !isManualProtected;
  };

  /**
   * Mark a manual user interaction to prevent auto-overwrites
   */
  const markManualTouch = () => {
    setBindModeForEntry('manual');
    setLastManualAt(Date.now());
  };

  /**
   * Set to market mode (allows auto-following for market orders)
   */
  const setMarketMode = () => {
    setBindModeForEntry('market');
    setLastManualAt(null);
  };

  /**
   * Handle price input change with proper field routing
   * Routes to limitPrice for LIMIT orders, entryPrice for MARKET orders
   */
  const handlePriceInputChange = (newValue: string, orderType: 'MARKET' | 'LIMIT') => {
    if (orderType === 'LIMIT') {
      setFormData({ limitPrice: newValue });
      markManualTouch();
    } else {
      setFormData({ entryPrice: newValue });
    }
  };

  /**
   * Get effective price value for display (limitPrice for LIMIT, entryPrice for MARKET)
   */
  const getEffectivePriceValue = (orderType: 'MARKET' | 'LIMIT'): string => {
    return orderType === 'LIMIT' 
      ? (formData.limitPrice || formData.entryPrice || '')
      : (formData.entryPrice || '');
  };

  /**
   * Handle "Get Current Price" button click with proper field targeting
   */
  const handleFetchCurrentPrice = async (
    fetchPriceFn: () => Promise<string>,
    orderType: 'MARKET' | 'LIMIT'
  ) => {
    try {
      const price = await fetchPriceFn();
      
      if (orderType === 'LIMIT') {
        // For limit orders: write to limitPrice, keep manual mode
        setFormData({ limitPrice: price });
        markManualTouch();
      } else {
        // For market orders: write to entryPrice  
        setFormData({ entryPrice: price });
      }
      
      return price;
    } catch (error) {
      console.error('Failed to fetch current price:', error);
      throw error;
    }
  };

  /**
   * Handle order type switching with price field synchronization
   */
  const handleOrderTypeSwitch = (newOrderType: 'MARKET' | 'LIMIT', oldOrderType: 'MARKET' | 'LIMIT') => {
    if (newOrderType === 'LIMIT' && oldOrderType === 'MARKET') {
      // Switching to LIMIT: copy entryPrice to limitPrice if needed
      if (formData.entryPrice && !formData.limitPrice) {
        setFormData({ limitPrice: formData.entryPrice });
      }
      markManualTouch();
    } else if (newOrderType === 'MARKET' && oldOrderType === 'LIMIT') {
      // Switching to MARKET: copy limitPrice to entryPrice if needed  
      if (formData.limitPrice && !formData.entryPrice) {
        setFormData({ entryPrice: formData.limitPrice });
      }
      setMarketMode();
    }
  };

  return {
    bindModeForEntry,
    lastManualAt,
    shouldAllowAutoWrite,
    markManualTouch,
    setMarketMode,
    handlePriceInputChange,
    getEffectivePriceValue,
    handleFetchCurrentPrice,
    handleOrderTypeSwitch
  };
}