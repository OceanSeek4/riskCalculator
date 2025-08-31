import { useRef, useState } from 'react';

/**
 * Hook for managing market price locking behavior
 * 
 * Market orders: Lock current price on "Calculate" click for stable calculations
 * Price remains locked until user clicks "Calculate" again or switches contexts
 */
export function usePriceLock() {
  const [locked, setLocked] = useState<number | null>(null);
  const lastLockedAt = useRef<number | null>(null);

  return {
    lockedEntryPrice: locked,
    isLocked: locked !== null,
    
    /**
     * Lock a market price for calculations
     * @param price Market price to lock
     */
    lock(price: number) {
      setLocked(price);
      lastLockedAt.current = Date.now();
    },
    
    /**
     * Clear the locked price (on symbol/exchange change or order type switch)
     */
    unlock() {
      setLocked(null);
      lastLockedAt.current = null;
    },
    
    lastLockedAt: lastLockedAt.current,
  };
}