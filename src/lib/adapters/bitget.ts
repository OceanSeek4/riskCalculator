import { ExchangeMarketMeta, MarketDataResponse, KlineResponse, MarketType } from './types.js';
import { EXCHANGE_CONFIGS, DEFAULT_TIMEOUT, DEFAULT_KLINE_LIMIT } from './config.js';
import { fallbackAdapter } from './fallback.js';

/**
 * Bitget API adapter
 * API Documentation: https://www.bitget.com/api-doc/
 */

interface BitgetMarketInfo {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  minTradeAmount: string;
  maxTradeAmount: string;
  takerFeeRate: string;
  makerFeeRate: string;
  priceScale: string;
  quantityScale: string;
  quotePrecision: string;
  basePrecision: string;
  minTradeUSDT: string;
  status: string;
  buyLimitPriceRatio: string;
  sellLimitPriceRatio: string;
}

interface BitgetFuturesInfo {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  buyLimitPriceRatio: string;
  sellLimitPriceRatio: string;
  feeRateUpRatio: string;
  makerFeeRate: string;
  takerFeeRate: string;
  openCostUpRatio: string;
  supportMarginCoins: string[];
  minTradeNum: string;
  priceEndStep: string;
  volumePlace: string;
  pricePlace: string;
  sizeMultiplier: string;
  symbolType: string;
  minTradeUSDT: string;
  maxSymbolOrderNum: string;
  maxProductOrderNum: string;
  maxPositionNum: string;
  symbolStatus: string;
  offTime: string;
  limitOpenTime: string;
  deliveryTime: string;
  deliveryStatus: string;
  launchTime: string;
  fundingTime: string;
  minLever: string;
  maxLever: string;
  posLimit: string;
  maintainTime: string;
}

interface BitgetKlineData {
  open: string;
  high: string;
  low: string;
  close: string;
  baseVol: string;
  usdtVol: string;
  ts: string;
}

function transformBitgetMarketData(data: BitgetMarketInfo): ExchangeMarketMeta {
  const tickSize = Math.pow(10, -parseInt(data.priceScale)).toString();
  const stepSize = Math.pow(10, -parseInt(data.quantityScale)).toString();
  
  return {
    symbol: data.symbol,
    tickSize,
    stepSize,
    minQty: data.minTradeAmount || stepSize,
    minNotional: data.minTradeUSDT || '5',
    leverageMax: 1, // Spot trading
    mmr: '0.01' // Default 1%
  };
}

function transformBitgetFuturesData(data: BitgetFuturesInfo): ExchangeMarketMeta {
  const tickSize = Math.pow(10, -parseInt(data.pricePlace)).toString();
  const stepSize = Math.pow(10, -parseInt(data.volumePlace)).toString();
  
  return {
    symbol: data.symbol,
    tickSize,
    stepSize,
    minQty: data.minTradeNum || stepSize,
    minNotional: data.minTradeUSDT || '5',
    leverageMax: parseInt(data.maxLever) || 100,
    mmr: '0.004' // Default 0.4% for futures
  };
}

function transformBitgetKlineData(rawData: BitgetKlineData[]): any[] {
  return rawData.map(item => ({
    openTime: parseInt(item.ts),
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.baseVol,
    closeTime: parseInt(item.ts) + 60000, // Add 1 minute
    quoteVolume: item.usdtVol,
    trades: 0,
    buyBaseVolume: '0',
    buyQuoteVolume: '0'
  }));
}

export async function fetchBitgetMarketMeta(
  symbol: string, 
  marketType: MarketType = 'spot'
): Promise<MarketDataResponse> {
  try {
    const config = EXCHANGE_CONFIGS.BITGET?.[marketType];
    if (!config) {
      return fallbackAdapter.fetchMarketMeta('BITGET', symbol, marketType);
    }

    let url: string;
    if (marketType === 'spot') {
      url = `${config.baseUrl}${config.endpoints.exchangeInfo}?symbol=${symbol}`;
    } else {
      // For futures markets
      url = `${config.baseUrl}${config.endpoints.exchangeInfo}?symbol=${symbol}`;
    }

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
    
    if (result.code !== '00000') {
      throw new Error(result.msg || 'Unknown API error');
    }

    let marketMeta: ExchangeMarketMeta;
    if (marketType === 'spot') {
      if (!result.data || result.data.length === 0) {
        throw new Error('Symbol not found');
      }
      marketMeta = transformBitgetMarketData(result.data[0]);
    } else {
      if (!result.data || result.data.length === 0) {
        throw new Error('Symbol not found');
      }
      marketMeta = transformBitgetFuturesData(result.data[0]);
    }

    return {
      success: true,
      data: marketMeta,
      source: 'api' as const
    };

  } catch (error) {
    console.warn('Bitget API failed, falling back to static data:', error);
    return fallbackAdapter.fetchMarketMeta('BITGET', symbol, marketType);
  }
}

export async function fetchBitgetKlines(
  symbol: string,
  interval: string,
  limit: number = DEFAULT_KLINE_LIMIT,
  marketType: MarketType = 'spot'
): Promise<KlineResponse> {
  try {
    const config = EXCHANGE_CONFIGS.BITGET?.[marketType];
    if (!config) {
      return { success: false, error: 'Market type not supported', source: 'api' };
    }

    // Convert interval to Bitget format
    const intervalMap: Record<string, string> = {
      '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6H', '8h': '8H', '12h': '12H',
      '1d': '1D', '3d': '3D', '1w': '1W', '1M': '1M'
    };

    const bitgetInterval = intervalMap[interval] || '1H';
    const endTime = Date.now();
    const url = `${config.baseUrl}${config.endpoints.klines}?symbol=${symbol}&granularity=${bitgetInterval}&limit=${limit}&endTime=${endTime}`;

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
    
    if (result.code !== '00000') {
      throw new Error(result.msg || 'Unknown API error');
    }

    const klineData = transformBitgetKlineData(result.data || []);

    return {
      success: true,
      data: klineData,
      source: 'api' as const
    };

  } catch (error) {
    console.warn('Bitget klines API failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'api' as const
    };
  }
}

export const bitgetAdapter = {
  fetchMarketMeta: fetchBitgetMarketMeta,
  fetchKlines: fetchBitgetKlines
};