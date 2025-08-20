import { MarketDataResponse, KlineResponse, Exchange, MarketType } from './types.js';
import { calculateATR, parseKlineData, KlineData } from '@/lib/core';
import { fetchBinanceMarketMeta, fetchBinanceKlines } from './binance.js';
import { fetchBybitMarketMeta, fetchBybitKlines } from './bybit.js';
import { fetchBitgetMarketMeta, fetchBitgetKlines } from './bitget.js';
import { fetchOKXMarketMeta, fetchOKXKlines } from './okx.js';
import { getStaticMarketMeta, getDefaultMarketMeta } from './fallback.js';

// Re-export types
export * from './types.js';
export * from './config.js';

/**
 * Fetch market metadata with automatic fallback
 * @param exchange Exchange name
 * @param symbol Trading symbol
 * @param marketType Market type
 * @returns Market metadata
 */
export async function fetchMarketMeta(
  exchange: Exchange,
  symbol: string,
  marketType: MarketType = 'usdm'
): Promise<MarketDataResponse> {
  let response: MarketDataResponse;
  
  // Try API first
  try {
    if (exchange === 'BINANCE') {
      response = await fetchBinanceMarketMeta(symbol, marketType);
    } else if (exchange === 'BYBIT') {
      response = await fetchBybitMarketMeta(symbol, marketType);
    } else if (exchange === 'BITGET') {
      response = await fetchBitgetMarketMeta(symbol, marketType);
    } else if (exchange === 'OKX') {
      response = await fetchOKXMarketMeta(symbol, marketType);
    } else {
      response = {
        success: false,
        error: `Unsupported exchange: ${exchange}`,
        source: 'api'
      };
    }
    
    if (response.success && response.data) {
      return response;
    }
  } catch (error) {
    // API failed, continue to fallback
  }
  
  // Try static data fallback
  try {
    response = getStaticMarketMeta(exchange, symbol, marketType);
    if (response.success && response.data) {
      return response;
    }
  } catch (error) {
    // Static data failed, continue to default
  }
  
  // Use default fallback
  const defaultData = getDefaultMarketMeta(symbol, marketType);
  return {
    success: true,
    data: defaultData,
    source: 'static'
  };
}

/**
 * Fetch kline data with automatic fallback
 * @param exchange Exchange name
 * @param symbol Trading symbol
 * @param interval Time interval
 * @param limit Number of klines
 * @param marketType Market type
 * @returns Kline data
 */
export async function fetchKlines(
  exchange: Exchange,
  symbol: string,
  interval: string = '1h',
  limit: number = 100,
  marketType: MarketType = 'usdm'
): Promise<KlineResponse> {
  try {
    if (exchange === 'BINANCE') {
      return await fetchBinanceKlines(symbol, interval, limit, marketType);
    } else if (exchange === 'BYBIT') {
      // Convert Binance interval format to Bybit format
      const bybitInterval = convertIntervalToBybit(interval);
      return await fetchBybitKlines(symbol, bybitInterval, limit, marketType);
    } else if (exchange === 'BITGET') {
      return await fetchBitgetKlines(symbol, interval, limit, marketType);
    } else if (exchange === 'OKX') {
      return await fetchOKXKlines(symbol, interval, limit, marketType);
    } else {
      return {
        success: false,
        error: `Unsupported exchange: ${exchange}`,
        source: 'api'
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to fetch klines: ${errorMessage}`,
      source: 'api'
    };
  }
}

/**
 * Fetch kline data and calculate ATR
 * @param exchange Exchange name
 * @param symbol Trading symbol
 * @param interval Time interval
 * @param period ATR period
 * @param limit Number of klines
 * @param marketType Market type
 * @returns ATR calculation result
 */
export async function fetchATR(
  exchange: Exchange,
  symbol: string,
  interval: string = '1h',
  period: number = 14,
  limit: number = 100,
  marketType: MarketType = 'usdm'
): Promise<{ success: boolean; atr?: string; error?: string; source: 'api' | 'static' }> {
  try {
    // Need at least period + 1 klines for ATR calculation
    const requiredKlines = Math.max(limit, period + 10); // Add buffer
    
    const klineResponse = await fetchKlines(exchange, symbol, interval, requiredKlines, marketType);
    
    if (!klineResponse.success || !klineResponse.data) {
      return {
        success: false,
        error: klineResponse.error || 'Failed to fetch kline data',
        source: klineResponse.source
      };
    }
    
    // Parse kline data
    const klines: KlineData[] = parseKlineData(klineResponse.data);
    
    if (klines.length < period + 1) {
      return {
        success: false,
        error: `Insufficient kline data: need ${period + 1}, got ${klines.length}`,
        source: klineResponse.source
      };
    }
    
    // Calculate ATR
    const atr = calculateATR(klines, period);
    
    return {
      success: true,
      atr: atr.toString(),
      source: klineResponse.source
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `ATR calculation failed: ${errorMessage}`,
      source: 'api'
    };
  }
}

/**
 * Convert Binance interval format to Bybit format
 * @param interval Binance interval (1m, 5m, 15m, 1h, 4h, 1d)
 * @returns Bybit interval (1, 5, 15, 60, 240, D)
 */
function convertIntervalToBybit(interval: string): string {
  const intervalMap: Record<string, string> = {
    '1m': '1',
    '3m': '3',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '2h': '120',
    '4h': '240',
    '6h': '360',
    '12h': '720',
    '1d': 'D',
    '1w': 'W',
    '1M': 'M'
  };
  
  return intervalMap[interval] || '60'; // Default to 1 hour
}

/**
 * Get supported intervals for an exchange
 * @param exchange Exchange name
 * @returns Array of supported intervals
 */
export function getSupportedIntervals(exchange: Exchange): string[] {
  if (exchange === 'BINANCE') {
    return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
  } else if (exchange === 'BYBIT') {
    return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M'];
  } else if (exchange === 'BITGET') {
    return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
  } else if (exchange === 'OKX') {
    return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
  }
  
  return ['1h']; // Default
}

/**
 * Validate if an interval is supported by an exchange
 * @param exchange Exchange name
 * @param interval Interval string
 * @returns Whether the interval is supported
 */
export function isIntervalSupported(exchange: Exchange, interval: string): boolean {
  const supportedIntervals = getSupportedIntervals(exchange);
  return supportedIntervals.includes(interval);
}