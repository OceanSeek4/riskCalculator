import { ExchangeMarketMeta, MarketDataResponse, Exchange, MarketType } from './types.js';

/**
 * Get market metadata from static fallback data
 * @param exchange Exchange name
 * @param symbol Trading symbol
 * @param marketType Market type
 * @returns Market metadata
 */
export function getStaticMarketMeta(
  exchange: Exchange,
  symbol: string,
  marketType: MarketType
): MarketDataResponse {
  try {
    // Inline static market data
    const data = {
      BINANCE: {
        BTCUSDT: {
          spot: {
            symbol: 'BTCUSDT',
            tickSize: '0.01',
            stepSize: '0.00001',
            minQty: '0.00001',
            minNotional: '5',
            leverageMax: 1,
            mmr: '0'
          },
          usdm: {
            symbol: 'BTCUSDT',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '5',
            leverageMax: 125,
            mmr: '0.004'
          },
          linear: {
            symbol: 'BTCUSDT',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '5',
            leverageMax: 100,
            mmr: '0.006'
          },
          inverse: {
            symbol: 'BTCUSDT',
            tickSize: '0.5',
            stepSize: '1',
            minQty: '1',
            minNotional: '1',
            leverageMax: 100,
            mmr: '0.005'
          }
        }
      },
      BYBIT: {
        BTCUSDT: {
          spot: {
            symbol: 'BTCUSDT',
            tickSize: '0.01',
            stepSize: '0.00001',
            minQty: '0.00001',
            minNotional: '5',
            leverageMax: 1,
            mmr: '0'
          },
          linear: {
            symbol: 'BTCUSDT',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '5',
            leverageMax: 100,
            mmr: '0.006'
          },
          usdm: {
            symbol: 'BTCUSDT',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '5',
            leverageMax: 100,
            mmr: '0.006'
          },
          inverse: {
            symbol: 'BTCUSDT',
            tickSize: '0.5',
            stepSize: '1',
            minQty: '1',
            minNotional: '1',
            leverageMax: 100,
            mmr: '0.005'
          }
        }
      },
      BITGET: {
        BTCUSDT: {
          spot: {
            symbol: 'BTCUSDT',
            tickSize: '0.01',
            stepSize: '0.00001',
            minQty: '0.00001',
            minNotional: '5',
            leverageMax: 1,
            mmr: '0'
          },
          usdm: {
            symbol: 'BTCUSDT',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '5',
            leverageMax: 125,
            mmr: '0.004'
          },
          linear: {
            symbol: 'BTCUSDT',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '5',
            leverageMax: 125,
            mmr: '0.004'
          },
          inverse: {
            symbol: 'BTCUSDT',
            tickSize: '0.5',
            stepSize: '1',
            minQty: '1',
            minNotional: '1',
            leverageMax: 100,
            mmr: '0.005'
          }
        }
      },
      OKX: {
        'BTC-USDT': {
          spot: {
            symbol: 'BTC-USDT',
            tickSize: '0.1',
            stepSize: '0.00001',
            minQty: '0.00001',
            minNotional: '1',
            leverageMax: 1,
            mmr: '0'
          },
          usdm: {
            symbol: 'BTC-USDT-SWAP',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '1',
            leverageMax: 100,
            mmr: '0.004'
          },
          linear: {
            symbol: 'BTC-USDT-SWAP',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '1',
            leverageMax: 100,
            mmr: '0.004'
          },
          inverse: {
            symbol: 'BTC-USD-SWAP',
            tickSize: '0.1',
            stepSize: '0.001',
            minQty: '0.001',
            minNotional: '1',
            leverageMax: 100,
            mmr: '0.005'
          }
        }
      }
    } as Record<Exchange, Record<string, Record<MarketType, ExchangeMarketMeta>>>;
    
    const exchangeData = data[exchange];
    if (!exchangeData) {
      return {
        success: false,
        error: `Exchange ${exchange} not found in static data`,
        source: 'static'
      };
    }
    
    const symbolData = exchangeData[symbol];
    if (!symbolData) {
      return {
        success: false,
        error: `Symbol ${symbol} not found for ${exchange} in static data`,
        source: 'static'
      };
    }
    
    const marketData = symbolData[marketType];
    if (!marketData) {
      return {
        success: false,
        error: `Market type ${marketType} not found for ${exchange} ${symbol} in static data`,
        source: 'static'
      };
    }
    
    return {
      success: true,
      data: marketData,
      source: 'static'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to read static market data: ${errorMessage}`,
      source: 'static'
    };
  }
}

/**
 * Get default market metadata for emergency fallback
 * @param symbol Trading symbol
 * @param marketType Market type
 * @returns Default market metadata
 */
export function getDefaultMarketMeta(
  symbol: string = 'BTCUSDT',
  marketType: MarketType = 'usdm'
): ExchangeMarketMeta {
  const defaults: Record<string, Record<MarketType, ExchangeMarketMeta>> = {
    'BTCUSDT': {
      'spot': {
        symbol: 'BTCUSDT',
        tickSize: '0.01',
        stepSize: '0.00001',
        minQty: '0.00001',
        minNotional: '5',
        leverageMax: 1,
        mmr: '0'
      },
      'usdm': {
        symbol: 'BTCUSDT',
        tickSize: '0.1',
        stepSize: '0.001',
        minQty: '0.001',
        minNotional: '5',
        leverageMax: 125,
        mmr: '0.004'
      },
      'linear': {
        symbol: 'BTCUSDT',
        tickSize: '0.1',
        stepSize: '0.001',
        minQty: '0.001',
        minNotional: '5',
        leverageMax: 100,
        mmr: '0.006'
      },
      'inverse': {
        symbol: 'BTCUSDT',
        tickSize: '0.5',
        stepSize: '1',
        minQty: '1',
        minNotional: '1',
        leverageMax: 100,
        mmr: '0.005'
      }
    },
    'ETHUSDT': {
      'spot': {
        symbol: 'ETHUSDT',
        tickSize: '0.01',
        stepSize: '0.0001',
        minQty: '0.0001',
        minNotional: '5',
        leverageMax: 1,
        mmr: '0'
      },
      'usdm': {
        symbol: 'ETHUSDT',
        tickSize: '0.01',
        stepSize: '0.001',
        minQty: '0.001',
        minNotional: '5',
        leverageMax: 100,
        mmr: '0.005'
      },
      'linear': {
        symbol: 'ETHUSDT',
        tickSize: '0.01',
        stepSize: '0.01',
        minQty: '0.01',
        minNotional: '5',
        leverageMax: 100,
        mmr: '0.01'
      },
      'inverse': {
        symbol: 'ETHUSDT',
        tickSize: '0.05',
        stepSize: '0.1',
        minQty: '0.1',
        minNotional: '1',
        leverageMax: 100,
        mmr: '0.01'
      }
    }
  };
  
  return defaults[symbol]?.[marketType] || defaults['BTCUSDT'][marketType] || defaults['BTCUSDT']['usdm'];
}

/**
 * Fallback adapter object for use in other adapters
 */
export const fallbackAdapter = {
  fetchMarketMeta: getStaticMarketMeta,
  getDefaultMarketMeta
};