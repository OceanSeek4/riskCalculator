import { MarketDataResponse, KlineResponse, MarketType } from './types.js';
import { EXCHANGE_CONFIGS, DEFAULT_TIMEOUT } from './config.js';

/**
 * Fetch market metadata from Bybit API
 * @param symbol Trading symbol (e.g., 'BTCUSDT')
 * @param marketType Market type ('linear' for USDT perpetuals)
 * @returns Market metadata
 */
export async function fetchBybitMarketMeta(
  symbol: string,
  marketType: MarketType = 'linear'
): Promise<MarketDataResponse> {
  const config = EXCHANGE_CONFIGS.BYBIT[marketType];
  if (!config) {
    return {
      success: false,
      error: `Unsupported market type: ${marketType}`,
      source: 'api'
    };
  }

  try {
    const params = new URLSearchParams({
      category: 'linear',
      symbol
    });

    const url = `${config.baseUrl}${config.endpoints.exchangeInfo}?${params}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    if (responseData.retCode !== 0) {
      throw new Error(`Bybit API error: ${responseData.retMsg}`);
    }

    const symbolInfo = responseData.result?.list?.[0];
    if (!symbolInfo) {
      return {
        success: false,
        error: `Symbol ${symbol} not found on Bybit ${marketType}`,
        source: 'api'
      };
    }

    // Parse Bybit response
    const leverageFilter = symbolInfo.leverageFilter || {};
    const priceFilter = symbolInfo.priceFilter || {};
    const lotSizeFilter = symbolInfo.lotSizeFilter || {};

    return {
      success: true,
      data: {
        symbol: symbolInfo.symbol,
        tickSize: priceFilter.tickSize || '0.1',
        stepSize: lotSizeFilter.qtyStep || '0.001',
        minQty: lotSizeFilter.minOrderQty || '0.001',
        minNotional: lotSizeFilter.minOrderAmt || '5',
        leverageMax: parseInt(leverageFilter.maxLeverage) || 100,
        mmr: '0.006' // Default maintenance margin rate for BTCUSDT
      },
      source: 'api'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to fetch Bybit market data: ${errorMessage}`,
      source: 'api'
    };
  }
}

/**
 * Fetch kline data from Bybit API
 * @param symbol Trading symbol
 * @param interval Time interval (1, 5, 15, 60, 240, D for daily)
 * @param limit Number of klines to fetch
 * @param marketType Market type
 * @returns Kline data
 */
export async function fetchBybitKlines(
  symbol: string,
  interval: string = '60', // 60 minutes = 1 hour
  limit: number = 100,
  marketType: MarketType = 'linear'
): Promise<KlineResponse> {
  const config = EXCHANGE_CONFIGS.BYBIT[marketType];
  if (!config) {
    return {
      success: false,
      error: `Unsupported market type: ${marketType}`,
      source: 'api'
    };
  }

  try {
    const params = new URLSearchParams({
      category: 'linear',
      symbol,
      interval,
      limit: limit.toString()
    });

    const url = `${config.baseUrl}${config.endpoints.klines}?${params}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    if (responseData.retCode !== 0) {
      throw new Error(`Bybit API error: ${responseData.retMsg}`);
    }

    const klineList = responseData.result?.list;
    if (!Array.isArray(klineList)) {
      throw new Error('Invalid kline data format from Bybit');
    }

    // Convert Bybit format to standard format
    // Bybit returns: [startTime, open, high, low, close, volume, turnover]
    const standardizedData = klineList.map((kline: string[]) => [
      parseInt(kline[0]), // openTime
      kline[1],          // open
      kline[2],          // high
      kline[3],          // low
      kline[4],          // close
      kline[5],          // volume
      parseInt(kline[0]) + (getIntervalMs(interval) || 3600000) // closeTime
    ]);

    return {
      success: true,
      data: standardizedData,
      source: 'api'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to fetch Bybit klines: ${errorMessage}`,
      source: 'api'
    };
  }
}

/**
 * Convert interval string to milliseconds
 * @param interval Interval string
 * @returns Milliseconds
 */
function getIntervalMs(interval: string): number | null {
  const intervalMap: Record<string, number> = {
    '1': 60000,      // 1 minute
    '3': 180000,     // 3 minutes  
    '5': 300000,     // 5 minutes
    '15': 900000,    // 15 minutes
    '30': 1800000,   // 30 minutes
    '60': 3600000,   // 1 hour
    '120': 7200000,  // 2 hours
    '240': 14400000, // 4 hours
    '360': 21600000, // 6 hours
    '720': 43200000, // 12 hours
    'D': 86400000,   // 1 day
    'W': 604800000,  // 1 week
    'M': 2592000000  // 30 days
  };
  
  return intervalMap[interval] || null;
}