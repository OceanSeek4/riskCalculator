import { MarketDataResponse, KlineResponse, MarketType } from './types.js';
import { EXCHANGE_CONFIGS, DEFAULT_TIMEOUT } from './config.js';

/**
 * Fetch market metadata from Binance API
 * @param symbol Trading symbol (e.g., 'BTCUSDT')
 * @param marketType Market type ('spot' or 'usdm')
 * @returns Market metadata
 */
export async function fetchBinanceMarketMeta(
  symbol: string,
  marketType: MarketType = 'usdm'
): Promise<MarketDataResponse> {
  const config = EXCHANGE_CONFIGS.BINANCE[marketType];
  if (!config) {
    return {
      success: false,
      error: `Unsupported market type: ${marketType}`,
      source: 'api'
    };
  }

  try {
    const url = `${config.baseUrl}${config.endpoints.exchangeInfo}`;
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

    const data = await response.json();
    
    // Find the specific symbol
    const symbolInfo = data.symbols?.find((s: any) => s.symbol === symbol);
    if (!symbolInfo) {
      return {
        success: false,
        error: `Symbol ${symbol} not found on Binance ${marketType}`,
        source: 'api'
      };
    }

    // Parse filters for spot markets
    if (marketType === 'spot') {
      const priceFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'PRICE_FILTER');
      const lotSizeFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'LOT_SIZE');
      const minNotionalFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'MIN_NOTIONAL');

      return {
        success: true,
        data: {
          symbol: symbolInfo.symbol,
          tickSize: priceFilter?.tickSize || '0.01',
          stepSize: lotSizeFilter?.stepSize || '0.00001',
          minQty: lotSizeFilter?.minQty || '0.00001',
          minNotional: minNotionalFilter?.minNotional || '5',
          leverageMax: 1,
          mmr: '0'
        },
        source: 'api'
      };
    }

    // Parse filters for futures markets
    const priceFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'PRICE_FILTER');
    const lotSizeFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'LOT_SIZE');
    const minNotionalFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'MIN_NOTIONAL');

    // Get leverage and margin info (simplified)
    const leverageMax = symbolInfo.maxLeverage || 125;
    const mmr = '0.004'; // Default maintenance margin rate

    return {
      success: true,
      data: {
        symbol: symbolInfo.symbol,
        tickSize: priceFilter?.tickSize || '0.1',
        stepSize: lotSizeFilter?.stepSize || '0.001',
        minQty: lotSizeFilter?.minQty || '0.001',
        minNotional: minNotionalFilter?.minNotional || '5',
        leverageMax,
        mmr
      },
      source: 'api'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to fetch Binance market data: ${errorMessage}`,
      source: 'api'
    };
  }
}

/**
 * Fetch kline data from Binance API
 * @param symbol Trading symbol
 * @param interval Time interval (1m, 5m, 15m, 1h, 4h, 1d)
 * @param limit Number of klines to fetch
 * @param marketType Market type
 * @returns Kline data
 */
export async function fetchBinanceKlines(
  symbol: string,
  interval: string = '1h',
  limit: number = 100,
  marketType: MarketType = 'usdm'
): Promise<KlineResponse> {
  const config = EXCHANGE_CONFIGS.BINANCE[marketType];
  if (!config) {
    return {
      success: false,
      error: `Unsupported market type: ${marketType}`,
      source: 'api'
    };
  }

  try {
    const params = new URLSearchParams({
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

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid kline data format');
    }

    return {
      success: true,
      data,
      source: 'api'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to fetch Binance klines: ${errorMessage}`,
      source: 'api'
    };
  }
}