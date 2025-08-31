import { describe, it, expect } from 'vitest';
import { getEffectiveEntryPrice } from '../utils/effectivePrice';

describe('Effective Entry Price Selection', () => {
  describe('LIMIT Order Mode', () => {
    it('should use limitPrice when available', () => {
      const result = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: '108000',
        entryPrice: '107500',
        marketRefPrice: '108500'
      });
      
      expect(result).toBe('108000');
    });

    it('should fall back to entryPrice if limitPrice is null', () => {
      const result = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: null,
        entryPrice: '107500',
        marketRefPrice: '108500'
      });
      
      expect(result).toBe('107500');
    });

    it('should throw error if no valid price for LIMIT order', () => {
      expect(() => {
        getEffectiveEntryPrice({
          orderType: 'LIMIT',
          limitPrice: null,
          entryPrice: null,
          marketRefPrice: '108500'
        });
      }).toThrow('Limit price is required for LIMIT orders');
    });
  });

  describe('MARKET Order Mode', () => {
    it('should use entryPrice when available', () => {
      const result = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: '108000',
        entryPrice: '107500',
        marketRefPrice: '108500'
      });
      
      expect(result).toBe('107500');
    });

    it('should fall back to marketRefPrice if entryPrice is null', () => {
      const result = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: '108000',
        entryPrice: null,
        marketRefPrice: '108500'
      });
      
      expect(result).toBe('108500');
    });

    it('should throw error if no valid price for MARKET order', () => {
      expect(() => {
        getEffectiveEntryPrice({
          orderType: 'MARKET',
          limitPrice: null,
          entryPrice: null,
          marketRefPrice: null
        });
      }).toThrow('Entry price is required for MARKET orders');
    });
  });

  describe('Price Change Scenarios', () => {
    it('LIMIT order should not use market reference price', () => {
      // Even if market price changes, limit order should use limitPrice
      const result = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: '108000',
        entryPrice: '107500',
        marketRefPrice: '109000' // Higher market price should be ignored
      });
      
      expect(result).toBe('108000');
    });

    it('MARKET order should ignore limitPrice', () => {
      // Market order should not use limitPrice even if set
      const result = getEffectiveEntryPrice({
        orderType: 'MARKET',
        limitPrice: '108000', // Should be ignored
        entryPrice: '107500',
        marketRefPrice: '108500'
      });
      
      expect(result).toBe('107500');
    });
  });

  describe('Numeric Validation', () => {
    it('should handle string numbers correctly', () => {
      const result = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: '108000.50',
        entryPrice: '107500',
        marketRefPrice: '108500'
      });
      
      expect(result).toBe('108000.50');
    });

    it('should handle numeric inputs correctly', () => {
      const result = getEffectiveEntryPrice({
        orderType: 'LIMIT',
        limitPrice: 108000.50,
        entryPrice: '107500',
        marketRefPrice: '108500'
      });
      
      expect(result).toBe('108000.5');
    });
  });
});