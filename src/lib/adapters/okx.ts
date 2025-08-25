import { httpGet } from '../http'
import { getStaticMarketMeta, getDefaultTicker, getDefaultKlines } from './static/fallback'
import type { ExchangeAdapter, Ticker, MarketMeta } from './types'

export const okx: ExchangeAdapter = {
  toExchangeSymbol(s, type) {
    // Handle both "BTCUSDT" and "BTC/USDT" formats
    let base: string;
    if (s.includes('/')) {
      base = s.replace('/', '-').toUpperCase();
    } else {
      // Convert "BTCUSDT" to "BTC-USDT"
      // Assume the quote currency is the last 3 or 4 characters (USDT, USDC, etc.)
      const symbol = s.toUpperCase();
      if (symbol.endsWith('USDT')) {
        const baseCurrency = symbol.slice(0, -4);
        base = `${baseCurrency}-USDT`;
      } else if (symbol.endsWith('USDC')) {
        const baseCurrency = symbol.slice(0, -4);
        base = `${baseCurrency}-USDC`;
      } else if (symbol.endsWith('BTC')) {
        const baseCurrency = symbol.slice(0, -3);
        base = `${baseCurrency}-BTC`;
      } else if (symbol.endsWith('ETH')) {
        const baseCurrency = symbol.slice(0, -3);
        base = `${baseCurrency}-ETH`;
      } else {
        // Default fallback - assume last 4 chars are quote currency
        const baseCurrency = symbol.slice(0, -4);
        const quoteCurrency = symbol.slice(-4);
        base = `${baseCurrency}-${quoteCurrency}`;
      }
    }
    return type==='USDT_PERP' ? `${base}-SWAP` : base;
  },

  async fetchTicker(symbol, type): Promise<Ticker> {
    const instId = this.toExchangeSymbol(symbol, type)
    try {
      const data = await httpGet(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`)
      const d = data.data?.[0]
      if (!d) {
        throw new Error(`No ticker data for ${instId} on OKX`)
      }
      return { last: Number(d.last), ts: Number(d.ts) }
    } catch (error) {
      console.warn(`OKX fetchTicker failed, using fallback for ${instId}:`, error)
      return getDefaultTicker(instId)
    }
  },

  async fetchKlines(symbol, type, interval, limit) {
    const instId = this.toExchangeSymbol(symbol, type)
    
    try {
      const data = await httpGet(`https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${interval}&limit=${limit}`)
      
      if (!data.data || data.data.length === 0) {
        throw new Error(`No kline data returned for ${instId} on OKX with bar ${interval}`)
      }
      
      // 映射数据并按时间戳升序排序（确保最老的数据在前）
      const klines = data.data.map((r:any)=>({ 
        t: +r[0], 
        o: +r[1], 
        h: +r[2], 
        l: +r[3], 
        c: +r[4], 
        v: +r[5] 
      }));
      
      // 按时间戳升序排序，确保时间序列正确
      return klines.sort((a: any, b: any) => a.t - b.t);
    } catch (error) {
      console.warn(`OKX fetchKlines failed, using fallback for ${instId}:`, error)
      return getDefaultKlines(instId)
    }
  },

  async fetchMarketMeta(symbol, type): Promise<MarketMeta> {
    const instType = type==='USDT_PERP' ? 'SWAP' : 'SPOT'
    const instId = this.toExchangeSymbol(symbol, type)
    
    // Extract base and quote from the converted symbol format
    let base: string, quote: string;
    if (symbol.includes('/')) {
      base = symbol.split('/')[0].toUpperCase();
      quote = symbol.split('/')[1].toUpperCase();
    } else {
      // Parse from "BTCUSDT" format
      const s = symbol.toUpperCase();
      if (s.endsWith('USDT')) {
        base = s.slice(0, -4);
        quote = 'USDT';
      } else if (s.endsWith('USDC')) {
        base = s.slice(0, -4);
        quote = 'USDC';
      } else if (s.endsWith('BTC')) {
        base = s.slice(0, -3);
        quote = 'BTC';
      } else if (s.endsWith('ETH')) {
        base = s.slice(0, -3);
        quote = 'ETH';
      } else {
        base = s.slice(0, -4);
        quote = s.slice(-4);
      }
    }
    
    try {
      const data = await httpGet(`https://www.okx.com/api/v5/public/instruments?instType=${instType}&uly=${base}-${quote}`)
      const s = data.data.find((x:any)=> x.instId === instId) ?? data.data[0]
      if (!s) {
        throw new Error(`Symbol ${instId} not found on OKX ${instType}`)
      }
      return { 
        symbol: instId,
        tickSize: s.tickSz ?? '0.01', 
        stepSize: s.lotSz ?? '0.001', 
        minQty: s.minSz ?? '0.001', 
        minNotional: '5', 
        leverageMax: 125,
        mmr: '0.004'
      }
    } catch (error) {
      console.warn(`OKX fetchMarketMeta failed, using fallback for ${instId}:`, error)
      const fallback = getStaticMarketMeta('OKX', instId, type)
      if (!fallback) {
        throw new Error(`Symbol ${instId} not supported on OKX ${instType} (offline mode)`)
      }
      return fallback
    }
  },

  subscribeTicker(symbol, type, onTick) {
    const instId = this.toExchangeSymbol(symbol, type)
    const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')
    
    let reconnectCount = 0
    const maxReconnects = 5
    
    const connect = () => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ op:'subscribe', args:[{ channel:'tickers', instId }] }))
        reconnectCount = 0
      }
      
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data as string)
          const d = m.data?.[0]
          if (d?.last) {
            onTick({ last:+d.last, ts:+d.ts })
          }
        } catch (error) {
          console.warn('Failed to parse OKX WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        if (reconnectCount < maxReconnects) {
          reconnectCount++

          setTimeout(connect, 1000 * reconnectCount)
        } else {
          console.error('OKX WebSocket max reconnection attempts reached')
        }
      }
      
      ws.onerror = (error) => {
        console.error('OKX WebSocket error:', error)
      }
    }
    
    connect()
    return () => ws.close()
  }
}