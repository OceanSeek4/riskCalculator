import staticMarkets from './markets.json'
import type { MarketMeta, InstType, Exchange, Ticker } from '../types'

const MARKET_MAP = staticMarkets as Record<string, Record<string, Record<string, MarketMeta>>>

export function getStaticMarketMeta(exchange: Exchange, symbol: string, type: InstType): MarketMeta | null {
  try {
    const exchangeData = MARKET_MAP[exchange]
    if (!exchangeData) return null
    
    const symbolData = exchangeData[symbol]
    if (!symbolData) return null
    
    let contractType: string
    switch (type) {
      case 'SPOT':
        contractType = 'spot'
        break
      case 'USDT_PERP':
        contractType = exchange === 'BYBIT' ? 'linear' : 'usdm'
        break
      default:
        return null
    }
    
    return symbolData[contractType] || null
  } catch (error) {
    console.warn(`Failed to load static market data for ${exchange} ${symbol} ${type}:`, error)
    return null
  }
}

export function getDefaultTicker(symbol: string): Ticker {
  const symbolPrices: Record<string, number> = {
    'BTCUSDT': 65000,
    'BTC-USDT': 65000,
    'ETHUSDT': 3200, 
    'ETH-USDT': 3200,
    'SUIUSDT': 1.8,
    'SUI-USDT': 1.8,
    'ADAUSDT': 0.45,
    'ADA-USDT': 0.45,
    'SOLUSDT': 140,
    'SOL-USDT': 140,
    'XRPUSDT': 0.52,
    'XRP-USDT': 0.52,
    'DOTUSDT': 6.8,
    'DOT-USDT': 6.8
  }
  
  const price = symbolPrices[symbol] || 100
  return { last: price, ts: Date.now() }
}

const DEFAULT_KLINES = [
  { t: Date.now() - 24 * 60 * 60 * 1000, o: 100, h: 105, l: 95, c: 102, v: 1000 },
  { t: Date.now() - 23 * 60 * 60 * 1000, o: 102, h: 108, l: 100, c: 106, v: 1200 },
  { t: Date.now() - 22 * 60 * 60 * 1000, o: 106, h: 110, l: 104, c: 108, v: 900 },
  { t: Date.now() - 21 * 60 * 60 * 1000, o: 108, h: 112, l: 105, c: 110, v: 800 },
  { t: Date.now() - 20 * 60 * 60 * 1000, o: 110, h: 115, l: 108, c: 112, v: 950 },
  { t: Date.now() - 19 * 60 * 60 * 1000, o: 112, h: 118, l: 110, c: 115, v: 1100 },
  { t: Date.now() - 18 * 60 * 60 * 1000, o: 115, h: 120, l: 113, c: 118, v: 1050 },
  { t: Date.now() - 17 * 60 * 60 * 1000, o: 118, h: 122, l: 115, c: 120, v: 900 },
  { t: Date.now() - 16 * 60 * 60 * 1000, o: 120, h: 125, l: 118, c: 122, v: 1200 },
  { t: Date.now() - 15 * 60 * 60 * 1000, o: 122, h: 128, l: 120, c: 125, v: 1000 },
  { t: Date.now() - 14 * 60 * 60 * 1000, o: 125, h: 130, l: 123, c: 127, v: 1150 },
  { t: Date.now() - 13 * 60 * 60 * 1000, o: 127, h: 132, l: 125, c: 130, v: 950 },
  { t: Date.now() - 12 * 60 * 60 * 1000, o: 130, h: 135, l: 128, c: 132, v: 800 },
  { t: Date.now() - 11 * 60 * 60 * 1000, o: 132, h: 138, l: 130, c: 135, v: 1100 }
]

export function getDefaultKlines(symbol: string) {
  const symbolPrices: Record<string, number> = {
    'BTCUSDT': 65000,
    'BTC-USDT': 65000,
    'ETHUSDT': 3200,
    'ETH-USDT': 3200,
    'SUIUSDT': 1.8,
    'SUI-USDT': 1.8,
    'ADAUSDT': 0.45,
    'ADA-USDT': 0.45,
    'SOLUSDT': 140,
    'SOL-USDT': 140,
    'XRPUSDT': 0.52,
    'XRP-USDT': 0.52,
    'DOTUSDT': 6.8,
    'DOT-USDT': 6.8
  }
  
  const basePrice = symbolPrices[symbol] || 100
  return DEFAULT_KLINES.map(k => ({
    ...k,
    o: k.o * basePrice / 100,
    h: k.h * basePrice / 100,
    l: k.l * basePrice / 100,
    c: k.c * basePrice / 100
  }))
}