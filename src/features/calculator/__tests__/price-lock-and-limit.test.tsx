import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePriceLock } from '../hooks/usePriceLock';
import { getEffectiveEntryPrice } from '../lib/price';

describe('Price Lock and Limit Order Behavior', () => {
  describe('usePriceLock Hook', () => {
    it('should initialize unlocked', () => {
      const { result } = renderHook(() => usePriceLock());
      
      expect(result.current.isLocked).toBe(false);
      expect(result.current.lockedEntryPrice).toBe(null);
    });

    it('should lock market price', () => {
      const { result } = renderHook(() => usePriceLock());
      
      act(() => {
        result.current.lock(108000);
      });
      
      expect(result.current.isLocked).toBe(true);
      expect(result.current.lockedEntryPrice).toBe(108000);
    });

    it('should unlock price', () => {
      const { result } = renderHook(() => usePriceLock());
      
      act(() => {
        result.current.lock(108000);
        result.current.unlock();
      });
      
      expect(result.current.isLocked).toBe(false);
      expect(result.current.lockedEntryPrice).toBe(null);
    });
  });

  describe('Market Order Price Locking', () => {
    it('should use locked price for MARKET order calculations', () => {
      const price = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: null,
        marketRefPrice: 108500,
        lockedEntryPrice: 108000
      });
      
      expect(price).toBe(108000);
    });

    it('should fall back to market reference when not locked', () => {
      const price = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: null,
        marketRefPrice: 108500,
        lockedEntryPrice: null
      });
      
      expect(price).toBe(108500);
    });

    it('should ignore market price changes when locked', () => {
      // Simulate: ticker=100 → click "Calculate" (lock to 100) → ticker changes to 120
      const lockedPrice = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: null,
        marketRefPrice: 120000, // Market moved up
        lockedEntryPrice: 100000 // Locked at previous price
      });
      
      expect(lockedPrice).toBe(100000); // Should still use locked price
    });

    it('should use new price when recalculating after unlock and lock again', () => {
      // Simulate: locked at 100 → unlock → ticker now 120 → click "Calculate" again (lock to 120)
      const newLockedPrice = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: null,
        marketRefPrice: 120000,
        lockedEntryPrice: 120000 // New lock at current price
      });
      
      expect(newLockedPrice).toBe(120000);
    });
  });

  describe('Limit Order Input Value Usage', () => {
    it('should use limitPrice input for LIMIT order calculations', () => {
      const price = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: 108000,
        marketRefPrice: 108500,
        lockedEntryPrice: null
      });
      
      expect(price).toBe(108000);
    });

    it('should ignore market price changes for LIMIT orders', () => {
      // limitPrice=108000, ticker=108500 → click "Calculate" → ticker changes to 109000
      const price = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: 108000,
        marketRefPrice: 109000, // Market moved up
        lockedEntryPrice: null
      });
      
      expect(price).toBe(108000); // Should still use input value
    });

    it('should update calculation when limitPrice input changes', () => {
      // limitPrice=108000 → change to 109000 → click "Calculate"
      const oldPrice = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: 108000,
        marketRefPrice: 108500,
        lockedEntryPrice: null
      });
      
      const newPrice = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: 109000, // User changed input
        marketRefPrice: 108500,
        lockedEntryPrice: null
      });
      
      expect(oldPrice).toBe(108000);
      expect(newPrice).toBe(109000);
    });

    it('should throw error when limitPrice is missing for LIMIT orders', () => {
      expect(() => {
        getEffectiveEntryPrice({
          orderType: 'LIMIT',
          limitPrice: null,
          marketRefPrice: 108500,
          lockedEntryPrice: null
        });
      }).toThrow('Limit price is required for LIMIT orders');
    });
  });

  describe('Context Switching and Unlocking', () => {
    it('should support switching from locked market to limit mode', () => {
      // Simulate: MARKET locked at 100000 → switch to LIMIT
      // Should unlock and use limit input
      const limitPrice = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: 108000,
        marketRefPrice: 100000,
        lockedEntryPrice: null // Unlocked when switching to LIMIT
      });
      
      expect(limitPrice).toBe(108000);
    });

    it('should support switching exchanges/symbols to unlock', () => {
      const { result } = renderHook(() => usePriceLock());
      
      // Lock price
      act(() => {
        result.current.lock(108000);
      });
      expect(result.current.isLocked).toBe(true);
      
      // Simulate exchange/symbol change (unlock should be called)
      act(() => {
        result.current.unlock();
      });
      expect(result.current.isLocked).toBe(false);
    });
  });

  describe('Manual Price Lock Button Behavior', () => {
    it('should allow manual locking of current market price', () => {
      const { result } = renderHook(() => usePriceLock());
      
      // Simulate manual lock button click
      act(() => {
        result.current.lock(108500); // User clicks lock when price is 108500
      });
      
      expect(result.current.isLocked).toBe(true);
      expect(result.current.lockedEntryPrice).toBe(108500);
    });

    it('should allow manual unlocking', () => {
      const { result } = renderHook(() => usePriceLock());
      
      // Lock first
      act(() => {
        result.current.lock(108500);
      });
      
      // Then unlock manually
      act(() => {
        result.current.unlock();
      });
      
      expect(result.current.isLocked).toBe(false);
      expect(result.current.lockedEntryPrice).toBe(null);
    });

    it('should preserve manual lock during price changes', () => {
      // User manually locks at 108500, then market moves to 109000
      const manuallyLockedPrice = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: null,
        marketRefPrice: 109000, // Market moved after manual lock
        lockedEntryPrice: 108500 // Manually locked price
      });
      
      expect(manuallyLockedPrice).toBe(108500); // Should maintain manual lock
    });
  });

  describe('Get Current Price Button Behavior', () => {
    it('should write to limitPrice for LIMIT orders without affecting lock', () => {
      // For LIMIT orders: click "Get Current Price" should only fill input, not lock
      const priceAfterFetch = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: 108500, // Filled from "Get Current Price"
        marketRefPrice: 108500,
        lockedEntryPrice: null // No locking for LIMIT orders
      });
      
      expect(priceAfterFetch).toBe(108500);
    });

    it('should update entryPrice for MARKET orders without locking', () => {
      // For MARKET orders: "Get Current Price" updates entryPrice but doesn't lock
      // Locking only happens on "Calculate" click
      const price = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: null,
        marketRefPrice: 108500, // Updated by "Get Current Price"
        lockedEntryPrice: null // Not locked yet
      });
      
      expect(price).toBe(108500);
    });
  });

  describe('Price Display vs Calculation Consistency', () => {
    it('should show locked price in results when MARKET order is calculated', () => {
      // Results should display the locked price, not the current market price
      const displayPrice = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: null,
        marketRefPrice: 109000, // Market moved after calculation
        lockedEntryPrice: 108000 // Locked at calculation time
      });
      
      expect(displayPrice).toBe(108000); // Should display locked price
    });

    it('should show input value in results when LIMIT order is calculated', () => {
      const displayPrice = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: 108000,
        marketRefPrice: 109000, // Market reference (ignored)
        lockedEntryPrice: null
      });
      
      expect(displayPrice).toBe(108000); // Should display input value
    });
  });
});