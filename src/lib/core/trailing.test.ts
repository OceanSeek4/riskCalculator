import { describe, it, expect } from 'vitest';
import {
  updateOnClose,
  previewIntrabar,
  roundToTick,
  calculateExpectedPnL,
  type TrailingConfig,
  type TrailingState,
  type Candle,
} from './trailing.js';

describe('Trailing Exits Core Module', () => {
  const mockConfig: TrailingConfig = {
    side: 'LONG',
    strategy: 'MA_BAND_STOP',
    maType: 'EMA',
    maLen: 20,
    atrLen: 14,
    tfMs: 3600000, // 1 hour
    offsetType: 'ATRx',
    k: 2,
    roundTick: 0.01,
    onCloseOnly: true,
    rrTargets: [1, 1.5, 2],
  };

  const mockCandles: Candle[] = [
    { t: 1000, o: 100, h: 102, l: 98, c: 101, v: 1000 },
    { t: 2000, o: 101, h: 103, l: 99, c: 102, v: 1000 },
    { t: 3000, o: 102, h: 104, l: 100, c: 103, v: 1000 },
    { t: 4000, o: 103, h: 105, l: 101, c: 104, v: 1000 },
    { t: 5000, o: 104, h: 106, l: 102, c: 105, v: 1000 },
  ];

  describe('roundToTick', () => {
    it('should round down correctly', () => {
      expect(roundToTick(100.123, 0.01, 'down')).toBe(100.12);
      expect(roundToTick(100.127, 0.01, 'down')).toBe(100.12);
    });

    it('should round up correctly', () => {
      expect(roundToTick(100.123, 0.01, 'up')).toBe(100.13);
      expect(roundToTick(100.127, 0.01, 'up')).toBe(100.13);
    });
  });

  describe('EMA Incremental Calculation', () => {
    it('should calculate EMA incrementally', () => {
      let state: TrailingState = {
        indicators: {},
      };

      // Feed candles one by one
      for (const candle of mockCandles) {
        state = updateOnClose(state, candle, {
          ...mockConfig,
          strategy: 'MA_CROSS_EXIT',
        });
      }

      expect(state.indicators.ma).toBeDefined();
      expect(state.exitTrigger).toBeDefined();
      expect(state.stop).toBeUndefined(); // MA_CROSS_EXIT doesn't have stop
    });
  });

  describe('ATR Incremental Calculation', () => {
    it('should calculate ATR incrementally', () => {
      let state: TrailingState = {
        indicators: {},
      };

      for (const candle of mockCandles) {
        state = updateOnClose(state, candle, mockConfig);
      }

      expect(state.indicators.atr).toBeDefined();
      expect(state.indicators.atr).toBeGreaterThan(0);
    });
  });

  describe('MA_BAND_STOP Strategy', () => {
    it('should generate stop prices that ratchet correctly for LONG', () => {
      let state: TrailingState = {
        indicators: {},
      };

      const stops: number[] = [];

      for (const candle of mockCandles) {
        state = updateOnClose(state, candle, mockConfig);
        if (state.stop !== undefined) {
          stops.push(state.stop);
        }
      }

      // For LONG positions, stops should only move up (ratchet)
      for (let i = 1; i < stops.length; i++) {
        expect(stops[i]).toBeGreaterThanOrEqual(stops[i - 1]);
      }
    });

    it('should generate stop prices that ratchet correctly for SHORT', () => {
      let state: TrailingState = {
        indicators: {},
      };

      const shortConfig: TrailingConfig = {
        ...mockConfig,
        side: 'SHORT',
      };

      const stops: number[] = [];

      for (const candle of mockCandles) {
        state = updateOnClose(state, candle, shortConfig);
        if (state.stop !== undefined) {
          stops.push(state.stop);
        }
      }

      // For SHORT positions, stops should only move down (ratchet)
      for (let i = 1; i < stops.length; i++) {
        expect(stops[i]).toBeLessThanOrEqual(stops[i - 1]);
      }
    });
  });

  describe('MA_CHANDELIER Strategy', () => {
    it('should calculate Chandelier stops correctly', () => {
      let state: TrailingState = {
        indicators: {},
      };

      const chandelierConfig: TrailingConfig = {
        ...mockConfig,
        strategy: 'MA_CHANDELIER',
      };

      for (const candle of mockCandles) {
        state = updateOnClose(state, candle, chandelierConfig);
      }

      expect(state.stop).toBeDefined();
      expect(state.indicators.ma).toBeDefined();
      expect(state.indicators.atr).toBeDefined();
    });
  });

  describe('Expected P/L Calculation', () => {
    it('should calculate expected loss correctly', () => {
      const result = calculateExpectedPnL(
        100, // entry price
        10,  // quantity
        98,  // stop price
        mockConfig,
        { open: 0.001, close: 0.001 } // fees
      );

      expect(result.expectedLoss).toBeDefined();
      expect(result.expectedLoss).toBeGreaterThan(0);
      
      // Expected loss = |100 - 98| * 10 + fees
      const expectedBaseLoss = 2 * 10; // 20
      expect(result.expectedLoss).toBeGreaterThan(expectedBaseLoss);
    });

    it('should calculate expected profits for different R:R ratios', () => {
      const result = calculateExpectedPnL(
        100, // entry price
        10,  // quantity
        98,  // stop price (2 point risk)
        mockConfig
      );

      expect(result.expectedProfits).toHaveLength(3); // [1, 1.5, 2]
      
      // For 1:1 R:R, profit should be 2 * 10 = 20
      expect(result.expectedProfits[0].rr).toBe(1);
      expect(result.expectedProfits[0].profit).toBe(20);
      expect(result.expectedProfits[0].price).toBe(102); // 100 + 2
    });
  });

  describe('Tick Size Compliance', () => {
    it('should respect tick size in all calculations', () => {
      let state: TrailingState = {
        indicators: {},
      };

      const preciseConfig: TrailingConfig = {
        ...mockConfig,
        roundTick: 0.05, // 5 cent tick size
      };

      for (const candle of mockCandles) {
        state = updateOnClose(state, candle, preciseConfig);
      }

      if (state.stop !== undefined) {
        // Stop should be a multiple of tick size
        expect(state.stop % 0.05).toBeCloseTo(0, 10);
      }
    });
  });

  describe('Preview Functionality', () => {
    it('should provide preview without changing state', () => {
      let state: TrailingState = {
        indicators: { ma: 100, atr: 2 },
        stop: 98,
      };

      const originalState = { ...state };
      const preview = previewIntrabar(state, 101, mockConfig);

      // State should remain unchanged
      expect(state).toEqual(originalState);
      expect(preview.candidateStop).toBeDefined();
    });
  });
});