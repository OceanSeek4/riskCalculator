/**
 * Unified price selection and market locking utilities
 * 
 * Implements clear behavior:
 * - MARKET orders: Lock current market price on "Calculate" click
 * - LIMIT orders: Use input box value for calculations
 */

export type OrderType = 'MARKET' | 'LIMIT';

export interface EffectivePriceOptions {
  orderType: OrderType;
  limitPrice?: number | string | null;      // 限价输入框
  marketRefPrice?: number | string | null;  // 当前参考价/最新价（仅显示或回退）
  lockedEntryPrice?: number | string | null;// 市价锁定价（有则优先）
}

/**
 * Get effective entry price for calculations based on order type and lock state
 * 
 * @param opts Price selection parameters
 * @returns Effective price as number for calculations
 * @throws Error if no valid price is available
 */
export function getEffectiveEntryPrice(opts: EffectivePriceOptions): number {
  const { orderType, limitPrice, marketRefPrice, lockedEntryPrice } = opts;
  
  if (orderType === 'LIMIT') {
    // 限价单：使用输入框值
    if (limitPrice != null && !Number.isNaN(Number(limitPrice))) {
      return Number(limitPrice);
    }
    throw new Error('Limit price is required for LIMIT orders');
  }
  
  // 市价单：优先使用锁定价，否则用当前市场价
  if (lockedEntryPrice != null && !Number.isNaN(Number(lockedEntryPrice))) {
    return Number(lockedEntryPrice);
  }
  
  if (marketRefPrice != null && !Number.isNaN(Number(marketRefPrice))) {
    return Number(marketRefPrice);
  }
  
  throw new Error('Market price is required for MARKET orders');
}

/**
 * Get display price for UI (string format)
 */
export function getEffectiveEntryPriceDisplay(opts: EffectivePriceOptions): string {
  try {
    return String(getEffectiveEntryPrice(opts));
  } catch {
    return '';
  }
}