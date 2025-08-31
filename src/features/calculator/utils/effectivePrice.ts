/**
 * Utility for selecting the correct entry price based on order type
 * 
 * Ensures consistent price source selection across all calculator forms:
 * - LIMIT orders: Use user-input limitPrice
 * - MARKET orders: Use entryPrice (which may be auto-updated from ticker)
 */

export interface EffectivePriceParams {
  orderType: 'MARKET' | 'LIMIT';
  limitPrice?: string | number | null;   // User input limit price
  entryPrice?: string | number | null;   // Market mode price (may be ticker-updated)
  marketRefPrice?: string | number | null; // Reference price for display only
}

/**
 * Get the effective entry price for calculations based on order type
 * 
 * @param params Price selection parameters
 * @returns Effective price as string for calculations
 * @throws Error if no valid price is available
 */
export function getEffectiveEntryPrice(params: EffectivePriceParams): string {
  const { orderType, limitPrice, entryPrice, marketRefPrice } = params;
  
  if (orderType === 'LIMIT') {
    // For limit orders, MUST use limitPrice (user input)
    if (limitPrice && !isNaN(Number(limitPrice))) {
      return String(limitPrice);
    }
    
    // Fallback to entryPrice if limitPrice not set (backward compatibility)
    if (entryPrice && !isNaN(Number(entryPrice))) {
      return String(entryPrice);
    }
    
    throw new Error('Limit price is required for LIMIT orders');
  }
  
  // For market orders, use entryPrice or fall back to reference price
  if (entryPrice && !isNaN(Number(entryPrice))) {
    return String(entryPrice);
  }
  
  if (marketRefPrice && !isNaN(Number(marketRefPrice))) {
    return String(marketRefPrice);
  }
  
  throw new Error('Entry price is required for MARKET orders');
}

/**
 * Check if the effective price should trigger recalculation
 * Used in dependency arrays to ensure proper calculation triggers
 */
export function getEffectivePriceForDependency(params: EffectivePriceParams): string | null {
  try {
    return getEffectiveEntryPrice(params);
  } catch {
    return null;
  }
}

/**
 * Get numeric effective entry price for calculations
 */
export function getEffectiveEntryPriceNumber(params: EffectivePriceParams): number {
  const priceStr = getEffectiveEntryPrice(params);
  const price = Number(priceStr);
  
  if (isNaN(price) || price <= 0) {
    throw new Error('Invalid entry price for calculation');
  }
  
  return price;
}