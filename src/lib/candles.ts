import { Candle } from './core/trailing.js';
import { getOHLCVData } from './market-service.js';
import type { Exchange, InstType } from './adapters';

/**
 * Ring buffer for storing candles efficiently
 */
export class CandleRing {
  private buffer: Candle[] = [];
  private head: number = 0;
  private size: number = 0;
  
  constructor(private capacity: number = 2000) {}

  /**
   * Add a new candle to the ring buffer
   */
  push(candle: Candle): void {
    if (this.size < this.capacity) {
      this.buffer.push(candle);
      this.size++;
    } else {
      this.buffer[this.head] = candle;
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Get the last N candles
   */
  last(n: number): Candle[] {
    if (n <= 0 || this.size === 0) return [];
    
    const count = Math.min(n, this.size);
    const result: Candle[] = [];
    
    if (this.size < this.capacity) {
      // Buffer not full, simple slice
      return this.buffer.slice(-count);
    } else {
      // Buffer is full, need to handle wrap-around
      for (let i = 0; i < count; i++) {
        const index = (this.head - count + i + this.capacity) % this.capacity;
        result.push(this.buffer[index]);
      }
    }
    
    return result;
  }

  /**
   * Get a slice of candles
   */
  slice(start: number, end?: number): Candle[] {
    if (this.size === 0) return [];
    
    if (this.size < this.capacity) {
      return this.buffer.slice(start, end);
    }
    
    // Handle wrap-around for full buffer
    const actualStart = Math.max(0, start);
    const actualEnd = end !== undefined ? Math.min(end, this.size) : this.size;
    const count = actualEnd - actualStart;
    
    if (count <= 0) return [];
    
    const result: Candle[] = [];
    for (let i = 0; i < count; i++) {
      const index = (this.head - this.size + actualStart + i + this.capacity) % this.capacity;
      result.push(this.buffer[index]);
    }
    
    return result;
  }

  /**
   * Get the current size
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get the last candle
   */
  getLastCandle(): Candle | undefined {
    if (this.size === 0) return undefined;
    
    if (this.size < this.capacity) {
      return this.buffer[this.size - 1];
    } else {
      const lastIndex = (this.head - 1 + this.capacity) % this.capacity;
      return this.buffer[lastIndex];
    }
  }

  /**
   * Clear all candles
   */
  clear(): void {
    this.buffer = [];
    this.head = 0;
    this.size = 0;
  }
}

/**
 * Real-time bar aggregator that builds candles from tick data
 */
export class BarAggregator {
  private currentBar: Partial<Candle> | null = null;
  private isBarActive: boolean = false;

  constructor(
    private tfMs: number,
    private ring: CandleRing,
    private onBarClose?: (candle: Candle) => void
  ) {}

  /**
   * Process incoming trade or ticker data
   */
  onTradeOrTicker(price: number, volume: number = 0, timestamp: number = Date.now()): void {
    const barStartTime = this.getBarStartTime(timestamp);
    
    // Check if we need to start a new bar
    if (!this.isBarActive || (this.currentBar && this.currentBar.t !== barStartTime)) {
      // Close current bar if exists
      if (this.currentBar && this.isBarActive) {
        this.closeCurrentBar();
      }
      
      // Start new bar
      this.startNewBar(barStartTime, price, volume);
    } else {
      // Update current bar
      this.updateCurrentBar(price, volume);
    }
  }

  /**
   * Force close current bar if timestamp indicates it should be closed
   */
  closeIfNeeded(now: number = Date.now()): void {
    if (!this.currentBar || !this.isBarActive) return;
    
    const currentBarEnd = this.currentBar.t! + this.tfMs;
    if (now >= currentBarEnd) {
      this.closeCurrentBar();
    }
  }

  /**
   * Get current incomplete bar (for preview)
   */
  getCurrentBar(): Partial<Candle> | null {
    return this.currentBar;
  }

  private getBarStartTime(timestamp: number): number {
    return Math.floor(timestamp / this.tfMs) * this.tfMs;
  }

  private startNewBar(startTime: number, price: number, volume: number): void {
    this.currentBar = {
      t: startTime,
      o: price,
      h: price,
      l: price,
      c: price,
      v: volume,
    };
    this.isBarActive = true;
  }

  private updateCurrentBar(price: number, volume: number): void {
    if (!this.currentBar) return;
    
    this.currentBar.h = Math.max(this.currentBar.h || price, price);
    this.currentBar.l = Math.min(this.currentBar.l || price, price);
    this.currentBar.c = price;
    this.currentBar.v = (this.currentBar.v || 0) + volume;
  }

  private closeCurrentBar(): void {
    if (!this.currentBar || !this.isBarActive) return;
    
    const completeBar: Candle = {
      t: this.currentBar.t!,
      o: this.currentBar.o!,
      h: this.currentBar.h!,
      l: this.currentBar.l!,
      c: this.currentBar.c!,
      v: this.currentBar.v || 0,
    };
    
    this.ring.push(completeBar);
    
    if (this.onBarClose) {
      this.onBarClose(completeBar);
    }
    
    this.isBarActive = false;
    this.currentBar = null;
  }
}

/**
 * Convert timeframe string to milliseconds
 */
export function timeframeToMs(tf: string): number {
  const timeframes: Record<string, number> = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000, // Approximate
  };
  
  return timeframes[tf] || 60 * 60 * 1000; // Default to 1h
}

/**
 * Candle manager that handles REST preheating and WS aggregation
 */
export class CandleManager {
  private ring: CandleRing;
  private aggregator: BarAggregator;
  private wsConnection: any = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeouts: number[] = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

  constructor(
    private exchange: Exchange,
    private symbol: string,
    private instType: InstType,
    private timeframe: string,
    private onBarClose?: (candle: Candle) => void,
    private onError?: (error: string) => void
  ) {
    this.ring = new CandleRing(2000);
    const tfMs = timeframeToMs(timeframe);
    this.aggregator = new BarAggregator(tfMs, this.ring, onBarClose);
  }

  /**
   * Initialize with historical data from REST API
   */
  async preheatWithRest(requiredCandles: number = 200): Promise<void> {
    try {
      const klineData = await getOHLCVData(
        this.exchange,
        this.symbol,
        this.timeframe,
        requiredCandles,
        this.instType
      );

      // Convert to Candle format and push to ring
      for (const kline of klineData) {
        const candle: Candle = {
          t: kline.t,
          o: kline.o,
          h: kline.h,
          l: kline.l,
          c: kline.c,
          v: kline.v,
        };
        this.ring.push(candle);
      }

      console.log(`Preheated with ${klineData.length} candles for ${this.symbol}`);
    } catch (error) {
      const message = `Failed to preheat candles: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(message);
      if (this.onError) {
        this.onError(message);
      }
      throw error;
    }
  }

  /**
   * Start WebSocket subscription for real-time updates
   */
  async startWebSocket(): Promise<void> {
    // Note: This is a placeholder for WebSocket implementation
    // In a real implementation, you would use the exchange's WebSocket API
    console.log(`Starting WebSocket for ${this.exchange} ${this.symbol} ${this.timeframe}`);
    
    // Simulate WebSocket connection
    this.isConnected = true;
    this.reconnectAttempts = 0;
  }

  /**
   * Stop WebSocket subscription
   */
  stopWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.isConnected = false;
    console.log(`Stopped WebSocket for ${this.exchange} ${this.symbol}`);
  }

  /**
   * Handle WebSocket reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const message = `Max reconnection attempts reached for ${this.symbol}`;
      console.error(message);
      if (this.onError) {
        this.onError(message);
      }
      return;
    }

    const timeout = this.reconnectTimeouts[this.reconnectAttempts] || 16000;
    this.reconnectAttempts++;

    console.log(`Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${timeout}ms`);

    setTimeout(async () => {
      try {
        await this.startWebSocket();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.handleReconnect();
      }
    }, timeout);
  }

  /**
   * Simulate ticker update (in real implementation, this would be called by WebSocket)
   */
  onTickerUpdate(price: number, volume: number = 0, timestamp: number = Date.now()): void {
    this.aggregator.onTradeOrTicker(price, volume, timestamp);
    
    // Check if bar should be closed
    this.aggregator.closeIfNeeded(timestamp);
  }

  /**
   * Get historical candles
   */
  getCandles(count: number = 100): Candle[] {
    return this.ring.last(count);
  }

  /**
   * Get the latest complete candle
   */
  getLastCandle(): Candle | undefined {
    return this.ring.getLastCandle();
  }

  /**
   * Get current incomplete bar (for preview)
   */
  getCurrentBar(): Partial<Candle> | null {
    return this.aggregator.getCurrentBar();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopWebSocket();
    this.ring.clear();
  }
}