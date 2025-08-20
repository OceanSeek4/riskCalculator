import { ExchangeMarketMeta, MarketDataResponse, KlineResponse, MarketType } from './types.js';
import { EXCHANGE_CONFIGS, DEFAULT_TIMEOUT, DEFAULT_KLINE_LIMIT } from './config.js';
import { fallbackAdapter } from './fallback.js';

/**
 * OKX API adapter
 * API Documentation: https://www.okx.com/docs-v5/en/
 */

interface OKXInstrument {
  instType: string;
  instId: string;
  uly: string;
  category: string;
  baseCcy: string;
  quoteCcy: string;
  settleCcy: string;
  ctVal: string;
  ctMult: string;
  ctValCcy: string;
  optType: string;
  stk: string;
  listTime: string;
  expTime: string;
  maxLmtSz: string;
  maxMktSz: string;
  minSz: string;
  lotSz: string;
  tickSz: string;
  lever: string;
  state: string;
  maxLmtAmt: string;
  maxMktAmt: string;
  ctType: string;
  alias: string;
  linear: string;
  maxTwap: string;
  maxAdl: string;
  maxIceberg: string;
  maxTriggerSz: string;
}

interface OKXKlineData {
  ts: string;        // timestamp
  o: string;         // open
  h: string;         // high  
  l: string;         // low
  c: string;         // close
  vol: string;       // volume
  volCcy: string;    // volume currency
  volCcyQuote: string; // volume in quote currency
  confirm: string;   // confirm
}

function transformOKXMarketData(data: OKXInstrument): ExchangeMarketMeta {
  const isContract = data.instType === 'FUTURES' || data.instType === 'SWAP' || data.instType === 'OPTION';
  
  return {
    symbol: data.instId,
    tickSize: data.tickSz,
    stepSize: data.lotSz,
    minQty: data.minSz,
    minNotional: '1', // OKX doesn't provide minNotional directly, using default
    leverageMax: isContract ? parseInt(data.lever) || 100 : 1,
    mmr: isContract ? '0.004' : '0.01' // Default maintenance margin rates
  };
}

function transformOKXKlineData(rawData: OKXKlineData[]): any[] {
  return rawData.map(item => ({
    openTime: parseInt(item.ts),
    open: item.o,
    high: item.h,
    low: item.l,
    close: item.c,
    volume: item.vol,
    closeTime: parseInt(item.ts) + 60000, // Add 1 minute (OKX doesn't provide close time)
    quoteVolume: item.volCcyQuote,
    trades: 0,
    buyBaseVolume: '0',
    buyQuoteVolume: '0'
  }));
}

export async function fetchOKXMarketMeta(
  symbol: string, 
  marketType: MarketType = 'spot'
): Promise<MarketDataResponse> {
  try {
    const config = EXCHANGE_CONFIGS.OKX?.[marketType];
    if (!config) {
      return fallbackAdapter.fetchMarketMeta('OKX', symbol, marketType);
    }

    // Map marketType to OKX instType
    let instType: string;
    switch (marketType) {
      case 'spot':
        instType = 'SPOT';
        break;
      case 'usdm':
      case 'linear':
        instType = 'SWAP'; // Perpetual swaps
        break;
      case 'inverse':
        instType = 'FUTURES'; // Futures contracts
        break;
      default:
        instType = 'SPOT';
    }

    const url = `${config.baseUrl}${config.endpoints.exchangeInfo}?instType=${instType}&instId=${symbol}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.code !== '0') {
      throw new Error(result.msg || 'Unknown API error');
    }

    if (!result.data || result.data.length === 0) {
      throw new Error('Symbol not found');
    }

    const marketMeta = transformOKXMarketData(result.data[0]);

    return {
      success: true,
      data: marketMeta,
      source: 'api' as const
    };

  } catch (error) {
    console.warn('OKX API failed, falling back to static data:', error);
    return fallbackAdapter.fetchMarketMeta('OKX', symbol, marketType);
  }
}

export async function fetchOKXKlines(
  symbol: string,
  interval: string,
  limit: number = DEFAULT_KLINE_LIMIT,
  marketType: MarketType = 'spot'
): Promise<KlineResponse> {
  try {
    const config = EXCHANGE_CONFIGS.OKX?.[marketType];
    if (!config) {
      return { success: false, error: 'Market type not supported', source: 'api' };
    }

    // Convert interval to OKX format
    const intervalMap: Record<string, string> = {
      '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6Hutc', '8h': '8Hutc', '12h': '12Hutc',
      '1d': '1D', '3d': '3D', '1w': '1W', '1M': '1M'
    };

    const okxInterval = intervalMap[interval] || '1H';
    const endTime = Date.now();
    const url = `${config.baseUrl}${config.endpoints.klines}?instId=${symbol}&bar=${okxInterval}&limit=${limit}&after=${endTime}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.code !== '0') {
      throw new Error(result.msg || 'Unknown API error');
    }

    const klineData = transformOKXKlineData(result.data || []);

    return {
      success: true,
      data: klineData,
      source: 'api' as const
    };

  } catch (error) {
    console.warn('OKX klines API failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'api' as const
    };
  }
}

export const okxAdapter = {
  fetchMarketMeta: fetchOKXMarketMeta,
  fetchKlines: fetchOKXKlines
};