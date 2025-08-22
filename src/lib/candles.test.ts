import { describe, it, expect, beforeEach } from 'vitest';
import { CandleRing, BarAggregator, timeframeToMs, CandleManager } from './candles.js';
import type { Candle } from './core/trailing.js';

describe('Candle Management System', () => {
  describe('CandleRing', () => {
    let ring: CandleRing;
    
    beforeEach(() => {
      ring = new CandleRing(5); // Small capacity for testing
    });

    it('should store candles in order', () => {
      const candles: Candle[] = [
        { t: 1000, o: 100, h: 102, l: 98, c: 101, v: 1000 },
        { t: 2000, o: 101, h: 103, l: 99, c: 102, v: 1000 },
        { t: 3000, o: 102, h: 104, l: 100, c: 103, v: 1000 },
      ];

      candles.forEach(candle => ring.push(candle));
      
      expect(ring.getSize()).toBe(3);
      expect(ring.last(3)).toEqual(candles);
    });

    it('should handle ring buffer overflow', () => {
      const candles: Candle[] = [];
      for (let i = 0; i < 7; i++) {
        const candle: Candle = { t: i * 1000, o: 100 + i, h: 102 + i, l: 98 + i, c: 101 + i, v: 1000 };
        candles.push(candle);
        ring.push(candle);
      }

      expect(ring.getSize()).toBe(5); // Capacity limit
      
      // Should contain the last 5 candles
      const lastCandles = ring.last(5);
      expect(lastCandles).toEqual(candles.slice(-5));
    });

    it('should return correct last N candles', () => {
      const candles: Candle[] = [
        { t: 1000, o: 100, h: 102, l: 98, c: 101, v: 1000 },
        { t: 2000, o: 101, h: 103, l: 99, c: 102, v: 1000 },
        { t: 3000, o: 102, h: 104, l: 100, c: 103, v: 1000 },
      ];

      candles.forEach(candle => ring.push(candle));
      
      expect(ring.last(2)).toEqual(candles.slice(-2));
      expect(ring.last(1)).toEqual([candles[2]]);
      expect(ring.last(10)).toEqual(candles); // More than available
    });
  });

  describe('BarAggregator', () => {
    let ring: CandleRing;
    let aggregator: BarAggregator;
    let closedBars: Candle[] = [];

    beforeEach(() => {
      ring = new CandleRing(100);
      closedBars = [];
      aggregator = new BarAggregator(
        60000, // 1 minute bars
        ring,
        (candle) => closedBars.push(candle)
      );
    });

    it('should create bars from tick data', () => {
      const baseTime = Math.floor(1000000 / 60000) * 60000; // Ensure it's aligned to minute boundary
      
      // First tick starts a new bar
      aggregator.onTradeOrTicker(100, 10, baseTime);
      
      // More ticks in the same minute
      aggregator.onTradeOrTicker(101, 5, baseTime + 10000);
      aggregator.onTradeOrTicker(99, 8, baseTime + 20000);
      aggregator.onTradeOrTicker(102, 12, baseTime + 30000);
      
      const currentBar = aggregator.getCurrentBar();
      expect(currentBar).toBeDefined();
      expect(currentBar!.o).toBe(100); // First price
      expect(currentBar!.h).toBe(102); // Highest price
      expect(currentBar!.l).toBe(99);  // Lowest price
      expect(currentBar!.c).toBe(102); // Last price
      expect(currentBar!.v).toBe(35);  // Total volume
    });

    it('should close bars at the correct time', () => {
      const baseTime = Math.floor(Date.now() / 60000) * 60000; // Round to minute
      
      // Add ticks to first bar
      aggregator.onTradeOrTicker(100, 10, baseTime);
      aggregator.onTradeOrTicker(101, 5, baseTime + 30000);
      
      // Force close
      aggregator.closeIfNeeded(baseTime + 60000);
      
      expect(closedBars).toHaveLength(1);
      expect(closedBars[0].o).toBe(100);
      expect(closedBars[0].c).toBe(101);
      expect(closedBars[0].v).toBe(15);
    });

    it('should start new bar when timeframe changes', () => {
      const baseTime = Math.floor(Date.now() / 60000) * 60000;
      
      // First bar
      aggregator.onTradeOrTicker(100, 10, baseTime);
      aggregator.onTradeOrTicker(101, 5, baseTime + 30000);
      
      // New bar (next minute)
      aggregator.onTradeOrTicker(102, 8, baseTime + 60000);
      
      expect(closedBars).toHaveLength(1);
      expect(closedBars[0].c).toBe(101); // Previous bar closed at 101
      
      const currentBar = aggregator.getCurrentBar();
      expect(currentBar!.o).toBe(102); // New bar starts at 102
    });
  });

  describe('timeframeToMs', () => {
    it('should convert timeframe strings correctly', () => {
      expect(timeframeToMs('1m')).toBe(60 * 1000);
      expect(timeframeToMs('5m')).toBe(5 * 60 * 1000);
      expect(timeframeToMs('1h')).toBe(60 * 60 * 1000);
      expect(timeframeToMs('4h')).toBe(4 * 60 * 60 * 1000);
      expect(timeframeToMs('1d')).toBe(24 * 60 * 60 * 1000);
    });

    it('should return default for unknown timeframes', () => {
      expect(timeframeToMs('unknown')).toBe(60 * 60 * 1000); // 1h default
    });
  });

  describe('CandleManager', () => {
    let manager: CandleManager;
    let errors: string[] = [];
    let closedBars: Candle[] = [];

    beforeEach(() => {
      errors = [];
      closedBars = [];
      manager = new CandleManager(
        'BINANCE',
        'BTCUSDT',
        'SPOT',
        '1h',
        (candle) => closedBars.push(candle),
        (error) => errors.push(error)
      );
    });

    it('should initialize correctly', () => {
      expect(manager).toBeDefined();
      expect(manager.getCandles(10)).toEqual([]);
    });

    it('should handle ticker updates', () => {
      const now = Date.now();
      
      manager.onTickerUpdate(100, 10, now);
      manager.onTickerUpdate(101, 5, now + 30000);
      
      const currentBar = manager.getCurrentBar();
      expect(currentBar).toBeDefined();
      expect(currentBar!.o).toBe(100);
      expect(currentBar!.c).toBe(101);
    });

    it('should manage WebSocket lifecycle', async () => {
      await manager.startWebSocket();
      manager.stopWebSocket();
      
      // Should not throw errors
      expect(errors).toEqual([]);
    });
  });
});