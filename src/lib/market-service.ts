import ccxt from 'ccxt';

// 支持的交易所映射
const EXCHANGE_MAP: Record<string, any> = {
  'BINANCE': ccxt.binance,
  'BYBIT': ccxt.bybit,
  'BITGET': ccxt.bitget,
  'OKX': ccxt.okx,
};

// 缓存实例
const exchangeInstances: Record<string, any> = {};

// 获取交易所实例
function getExchangeInstance(exchangeId: string) {
  if (!exchangeInstances[exchangeId]) {
    const ExchangeClass = EXCHANGE_MAP[exchangeId];
    if (!ExchangeClass) {
      throw new Error(`Unsupported exchange: ${exchangeId}`);
    }
    
    exchangeInstances[exchangeId] = new ExchangeClass({
      sandbox: false,
      enableRateLimit: true,
      options: {
        defaultType: 'spot', // 默认现货
      },
    });
  }
  return exchangeInstances[exchangeId];
}

// 获取当前市价
export async function getCurrentPrice(
  exchange: string,
  symbol: string,
  contractMode: string = 'SPOT'
): Promise<number> {
  try {
    const exchangeInstance = getExchangeInstance(exchange);
    
    // 设置市场类型
    if (contractMode !== 'SPOT') {
      exchangeInstance.options.defaultType = contractMode === 'USDT_PERP' ? 'swap' : 'future';
    } else {
      exchangeInstance.options.defaultType = 'spot';
    }
    
    // 获取ticker数据
    const ticker = await exchangeInstance.fetchTicker(symbol);
    
    if (!ticker || !ticker.last) {
      throw new Error('Failed to fetch current price');
    }
    
    return ticker.last;
  } catch (error) {
    console.error('Error fetching current price:', error);
    throw new Error(`Failed to fetch price for ${symbol} on ${exchange}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 获取OHLCV数据用于ATR计算
export async function getOHLCVData(
  exchange: string,
  symbol: string,
  timeframe: string,
  limit: number = 100,
  contractMode: string = 'SPOT'
): Promise<number[][]> {
  try {
    const exchangeInstance = getExchangeInstance(exchange);
    
    // 设置市场类型
    if (contractMode !== 'SPOT') {
      exchangeInstance.options.defaultType = contractMode === 'USDT_PERP' ? 'swap' : 'future';
    } else {
      exchangeInstance.options.defaultType = 'spot';
    }
    
    // 获取OHLCV数据
    const ohlcv = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, limit);
    
    if (!ohlcv || ohlcv.length === 0) {
      throw new Error('No OHLCV data available');
    }
    
    return ohlcv;
  } catch (error) {
    console.error('Error fetching OHLCV data:', error);
    throw new Error(`Failed to fetch OHLCV data for ${symbol} on ${exchange}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 计算ATR
export function calculateATR(ohlcvData: number[][], period: number = 14): number {
  if (ohlcvData.length < period + 1) {
    throw new Error(`Insufficient data for ATR calculation. Need at least ${period + 1} candles, got ${ohlcvData.length}`);
  }

  const trueRanges: number[] = [];
  
  // 计算True Range
  for (let i = 1; i < ohlcvData.length; i++) {
    const current = ohlcvData[i];
    const previous = ohlcvData[i - 1];
    
    const high = current[2]; // High
    const low = current[3];  // Low
    const prevClose = previous[4]; // Previous Close
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }
  
  // 计算ATR (简单移动平均)
  const recentTrueRanges = trueRanges.slice(-period);
  const atr = recentTrueRanges.reduce((sum, tr) => sum + tr, 0) / period;
  
  return atr;
}

// 获取ATR值
export async function getATRValue(
  exchange: string,
  symbol: string,
  timeframe: string,
  period: number = 14,
  contractMode: string = 'SPOT'
): Promise<number> {
  try {
    // 获取足够的历史数据
    const ohlcvData = await getOHLCVData(exchange, symbol, timeframe, period + 20, contractMode);
    
    // 计算ATR
    const atr = calculateATR(ohlcvData, period);
    
    return atr;
  } catch (error) {
    console.error('Error calculating ATR:', error);
    throw new Error(`Failed to calculate ATR for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 检查交易所是否支持指定的交易对
export async function checkSymbolSupport(
  exchange: string,
  symbol: string,
  contractMode: string = 'SPOT'
): Promise<boolean> {
  try {
    const exchangeInstance = getExchangeInstance(exchange);
    
    // 设置市场类型
    if (contractMode !== 'SPOT') {
      exchangeInstance.options.defaultType = contractMode === 'USDT_PERP' ? 'swap' : 'future';
    } else {
      exchangeInstance.options.defaultType = 'spot';
    }
    
    // 加载市场数据
    await exchangeInstance.loadMarkets();
    
    // 检查交易对是否存在
    return symbol in exchangeInstance.markets;
  } catch (error) {
    console.error('Error checking symbol support:', error);
    return false;
  }
}

// 获取支持的时间框架
export function getSupportedTimeframes(exchange: string): string[] {
  const defaultTimeframes = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'];
  
  try {
    const exchangeInstance = getExchangeInstance(exchange);
    
    if (exchangeInstance.timeframes) {
      return Object.keys(exchangeInstance.timeframes);
    }
    
    return defaultTimeframes;
  } catch (error) {
    console.error('Error getting supported timeframes:', error);
    return defaultTimeframes;
  }
}

// 格式化价格显示
export function formatPrice(price: number, symbol: string): string {
  // 根据交易对决定小数位数
  if (symbol.includes('USDT') || symbol.includes('USD')) {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 100) return price.toFixed(3);
    if (price >= 10) return price.toFixed(4);
    if (price >= 1) return price.toFixed(5);
    return price.toFixed(8);
  }
  
  // BTC对等高价值交易对
  if (symbol.includes('BTC')) {
    return price.toFixed(8);
  }
  
  // 默认格式
  return price.toFixed(6);
}
