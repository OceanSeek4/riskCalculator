import { ExchangeConfig, Exchange } from './types.js';

export const EXCHANGE_CONFIGS: Record<Exchange, Record<string, ExchangeConfig>> = {
  BINANCE: {
    spot: {
      baseUrl: 'https://api.binance.com',
      endpoints: {
        exchangeInfo: '/api/v3/exchangeInfo',
        klines: '/api/v3/klines'
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 1200
      }
    },
    usdm: {
      baseUrl: 'https://fapi.binance.com',
      endpoints: {
        exchangeInfo: '/fapi/v1/exchangeInfo',
        klines: '/fapi/v1/klines'
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 1200
      }
    }
  },
  BYBIT: {
    linear: {
      baseUrl: 'https://api.bybit.com',
      endpoints: {
        exchangeInfo: '/v5/market/instruments-info',
        klines: '/v5/market/mark-price-kline'
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 600
      }
    }
  },
  BITGET: {
    spot: {
      baseUrl: 'https://api.bitget.com',
      endpoints: {
        exchangeInfo: '/api/spot/v1/public/products',
        klines: '/api/spot/v1/market/candles'
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 1200
      }
    },
    usdm: {
      baseUrl: 'https://api.bitget.com',
      endpoints: {
        exchangeInfo: '/api/mix/v1/market/contracts',
        klines: '/api/mix/v1/market/candles'
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 1200
      }
    }
  },
  OKX: {
    spot: {
      baseUrl: 'https://www.okx.com',
      endpoints: {
        exchangeInfo: '/api/v5/public/instruments',
        klines: '/api/v5/market/candles'
      },
      rateLimits: {
        requestsPerSecond: 20,
        requestsPerMinute: 1200
      }
    },
    usdm: {
      baseUrl: 'https://www.okx.com',
      endpoints: {
        exchangeInfo: '/api/v5/public/instruments',
        klines: '/api/v5/market/candles'
      },
      rateLimits: {
        requestsPerSecond: 20,
        requestsPerMinute: 1200
      }
    },
    linear: {
      baseUrl: 'https://www.okx.com',
      endpoints: {
        exchangeInfo: '/api/v5/public/instruments',
        klines: '/api/v5/market/candles'
      },
      rateLimits: {
        requestsPerSecond: 20,
        requestsPerMinute: 1200
      }
    }
  }
};

export const DEFAULT_TIMEOUT = 10000; // 10 seconds
export const DEFAULT_KLINE_LIMIT = 100;
export const DEFAULT_ATR_PERIOD = 14;