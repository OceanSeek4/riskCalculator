import { binance, bybit, okx, bitget, type Exchange, type InstType } from './adapters'
import { calculateATR, type KlineData } from '@/lib/core'

const ADAPTERS: Record<Exchange, any> = { BINANCE: binance, BYBIT: bybit, OKX: okx, BITGET: bitget }

// 获取当前市价
export async function getCurrentPrice(
  exchange: Exchange,
  symbol: string,
  instType: InstType = 'SPOT'
): Promise<number> {
  try {
    const adapter = ADAPTERS[exchange]
    if (!adapter) {
      throw new Error(`Unsupported exchange: ${exchange}`)
    }
    
    const ticker = await adapter.fetchTicker(symbol, instType)
    
    if (!ticker || typeof ticker.last !== 'number') {
      throw new Error('Failed to fetch current price')
    }
    
    return ticker.last
  } catch (error) {
    // Only log non-HTTP plugin errors to reduce noise
    if (!error || !String(error).includes('invoke')) {
      console.error('Error fetching current price:', error)
    }
    throw new Error(`Failed to fetch price for ${symbol} on ${exchange}: ${error instanceof Error ? error.message : 'Network error'}`)
  }
}

// 获取K线数据用于ATR计算
export async function getOHLCVData(
  exchange: Exchange,
  symbol: string,
  timeframe: string,
  limit: number = 100,
  instType: InstType = 'SPOT'
): Promise<Array<{ t:number,o:number,h:number,l:number,c:number,v:number }>> {
  try {
    const adapter = ADAPTERS[exchange]
    if (!adapter) {
      throw new Error(`Unsupported exchange: ${exchange}`)
    }
    
    // 注意：这里的timeframe应该已经被上层函数转换过了，直接使用
    const klines = await adapter.fetchKlines(symbol, instType, timeframe, limit)
    
    if (!klines || klines.length === 0) {
      throw new Error('No OHLCV data available')
    }
    
    return klines
  } catch (error) {
    // Only log non-HTTP plugin errors to reduce noise
    if (!error || !String(error).includes('invoke')) {
      console.error('Error fetching OHLCV data:', error)
    }
    throw new Error(`Failed to fetch OHLCV data for ${symbol} on ${exchange}: ${error instanceof Error ? error.message : 'Network error'}`)
  }
}

// 转换时间框架格式以适配不同交易所
function convertTimeframeForExchange(exchange: Exchange, timeframe: string): string {
  // Bybit需要特殊格式转换
  if (exchange === 'BYBIT') {
    const timeframeMap: Record<string, string> = {
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
    }
    return timeframeMap[timeframe] || timeframe
  }
  
  // Bitget需要特定格式转换（使用分钟数表示）
  if (exchange === 'BITGET') {
    const timeframeMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m', 
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '2h': '2H',
      '4h': '4H',
      '6h': '6H',
      '12h': '12H',
      '1d': '1D',
      '1w': '1W'
    }
    return timeframeMap[timeframe] || timeframe
  }
  
  // OKX使用不同的格式，日线使用UTC时间以确保一致性
  if (exchange === 'OKX') {
    const timeframeMap: Record<string, string> = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '2h': '2H',
      '4h': '4H',
      '6h': '6Hutc',   // 使用UTC时间
      '12h': '12Hutc', // 使用UTC时间
      '1d': '1Dutc',   // 使用UTC时间，确保与其他交易所一致
      '1w': '1Wutc',   // 使用UTC时间
      '1M': '1Mutc'    // 使用UTC时间
    }
    return timeframeMap[timeframe] || timeframe
  }
  
  // Binance和其他交易所使用标准格式
  return timeframe
}

// 获取ATR值
export async function getATRValue(
  exchange: Exchange,
  symbol: string,
  timeframe: string,
  period: number = 14,
  instType: InstType = 'SPOT'
): Promise<number> {
  try {
    // 转换时间框架格式
    const convertedTimeframe = convertTimeframeForExchange(exchange, timeframe)
    

    // 获取足够的历史数据
    const klineData = await getOHLCVData(exchange, symbol, convertedTimeframe, period + 20, instType)
    
    // 转换为ATR计算所需的格式
    const klines: KlineData[] = klineData.map(k => ({
      openTime: k.t,
      open: k.o.toString(),
      high: k.h.toString(),
      low: k.l.toString(),
      close: k.c.toString(),
      volume: k.v.toString(),
      closeTime: k.t + 60000 // Approximate close time
    }))
    
    if (klines.length < period + 1) {
      throw new Error(`Insufficient data for ATR calculation. Need at least ${period + 1} candles, got ${klines.length}`)
    }
    
    // 计算ATR
    const atr = calculateATR(klines, period)
    
    return parseFloat(atr.toString())
  } catch (error) {
    console.error(`Error calculating ATR for ${exchange} ${symbol} ${timeframe}:`, error)
    
    // 对于特定错误尝试回退到较短时间框架
    if (error instanceof Error && error.message.includes('data')) {
      const fallbackTimeframes = ['1h', '30m', '15m', '5m', '1m']
      const currentIndex = fallbackTimeframes.indexOf(timeframe)
      
      if (currentIndex < fallbackTimeframes.length - 1) {
        return await getATRValue(exchange, symbol, fallbackTimeframes[currentIndex + 1], period, instType)
      }
    }
    
    throw new Error(`Failed to calculate ATR for ${symbol} on ${exchange} (${timeframe}): ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// MA calculation functions
function calculateMA(prices: number[], period: number): number {
  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((acc, price) => acc + price, 0);
  return sum / period;
}

function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

// 获取移动平均线值
export async function getMAValue(
  exchange: Exchange,
  symbol: string,
  timeframe: string,
  period: number = 20,
  maType: 'MA' | 'EMA' = 'MA',
  instType: InstType = 'SPOT'
): Promise<number> {
  try {
    // 转换时间框架格式
    const convertedTimeframe = convertTimeframeForExchange(exchange, timeframe)
    

    // 获取足够的历史数据
    const klineData = await getOHLCVData(exchange, symbol, convertedTimeframe, period + 20, instType);
    
    if (klineData.length < period) {
      throw new Error(`Insufficient data for MA calculation. Need at least ${period} candles, got ${klineData.length}`);
    }
    
    // 提取收盘价数组
    const closePrices = klineData.map(k => k.c);
    
    // 根据类型计算MA
    let ma: number;
    if (maType === 'EMA') {
      ma = calculateEMA(closePrices, period);
    } else {
      ma = calculateMA(closePrices, period);
    }
    
    return ma;
  } catch (error) {
    console.error(`Error calculating MA for ${exchange} ${symbol} ${timeframe}:`, error);
    
    // 对于特定错误尝试回退到较短时间框架
    if (error instanceof Error && error.message.includes('data')) {
      const fallbackTimeframes = ['1h', '30m', '15m', '5m', '1m']
      const currentIndex = fallbackTimeframes.indexOf(timeframe)
      
      if (currentIndex < fallbackTimeframes.length - 1) {
        return await getMAValue(exchange, symbol, fallbackTimeframes[currentIndex + 1], period, maType, instType)
      }
    }
    
    throw new Error(`Failed to calculate ${maType} for ${symbol} on ${exchange} (${timeframe}): ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 获取市场元数据
export async function getMarketMeta(
  exchange: Exchange,
  symbol: string,
  instType: InstType = 'SPOT'
) {
  try {
    const adapter = ADAPTERS[exchange]
    if (!adapter) {
      throw new Error(`Unsupported exchange: ${exchange}`)
    }
    
    const meta = await adapter.fetchMarketMeta(symbol, instType)
    return meta
  } catch (error) {
    console.error('Error fetching market meta:', error)
    throw new Error(`Failed to fetch market metadata for ${symbol} on ${exchange}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 获取支持的时间框架
export function getSupportedTimeframes(exchange: Exchange): string[] {
  // 通用的时间框架，各交易所基本都支持
  const defaultTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
  
  // 根据交易所返回支持的时间框架 - 移除有问题的高时间框架
  switch (exchange) {
    case 'BINANCE':
      return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d']
    case 'BYBIT':
      return ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] // 简化支持列表，避免API错误
    case 'BITGET':
      return ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] // 限制到测试过的时间框架
    case 'OKX':
      return ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] // 限制到测试过的时间框架
    default:
      return defaultTimeframes
  }
}

// 检查交易对是否受支持（简单实现，尝试获取ticker）
export async function checkSymbolSupport(
  exchange: Exchange,
  symbol: string,
  instType: InstType = 'SPOT'
): Promise<boolean> {
  try {
    const adapter = ADAPTERS[exchange]
    if (!adapter) {
      return false
    }
    
    // 尝试获取ticker数据来验证交易对是否存在
    await adapter.fetchTicker(symbol, instType)
    return true
  } catch (error) {
    console.error('Error checking symbol support:', error)
    return false
  }
}

// 格式化价格显示
export function formatPrice(price: number, symbol: string): string {
  // 根据交易对决定小数位数
  if (symbol.includes('USDT') || symbol.includes('USD')) {
    if (price >= 1000) return price.toFixed(2)
    if (price >= 100) return price.toFixed(3)
    if (price >= 10) return price.toFixed(4)
    if (price >= 1) return price.toFixed(5)
    return price.toFixed(8)
  }
  
  // BTC对等高价值交易对
  if (symbol.includes('BTC')) {
    return price.toFixed(8)
  }
  
  // 默认格式
  return price.toFixed(6)
}

// WebSocket 价格订阅管理
export class PriceSubscriptionManager {
  private subscriptions: Map<string, () => void> = new Map()
  
  subscribe(
    exchange: Exchange,
    symbol: string,
    instType: InstType,
    onPriceUpdate: (price: number) => void
  ): string {
    const key = `${exchange}-${symbol}-${instType}`
    
    // 如果已经有订阅，先取消
    if (this.subscriptions.has(key)) {
      this.unsubscribe(key)
    }
    
    const adapter = ADAPTERS[exchange]
    if (!adapter || !adapter.subscribeTicker) {
      throw new Error(`Exchange ${exchange} does not support WebSocket subscriptions`)
    }
    
    const unsubscribe = adapter.subscribeTicker(symbol, instType, (ticker: any) => {
      onPriceUpdate(ticker.last)
    })
    
    this.subscriptions.set(key, unsubscribe)
    return key
  }
  
  unsubscribe(key: string) {
    const unsubscribe = this.subscriptions.get(key)
    if (unsubscribe) {
      unsubscribe()
      this.subscriptions.delete(key)
    }
  }
  
  unsubscribeAll() {
    for (const [key, unsubscribe] of this.subscriptions) {
      unsubscribe()
    }
    this.subscriptions.clear()
  }
}

// 创建全局实例
export const priceSubscriptionManager = new PriceSubscriptionManager()