export interface ExchangeMarketMeta {
  symbol: string;
  tickSize: string;
  stepSize: string;
  minQty: string;
  minNotional: string;
  leverageMax: number;
  mmr: string;
}

export interface MarketDataResponse {
  success: boolean;
  data?: ExchangeMarketMeta;
  error?: string;
  source: 'api' | 'static';
}

export interface KlineResponse {
  success: boolean;
  data?: any[];
  error?: string;
  source: 'api' | 'static';
}

export type Exchange = 'BINANCE' | 'BYBIT' | 'BITGET' | 'OKX';
export type MarketType = 'spot' | 'usdm' | 'linear' | 'inverse';

export interface ExchangeConfig {
  baseUrl: string;
  endpoints: {
    exchangeInfo: string;
    klines: string;
  };
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
}