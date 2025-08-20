import { httpGet } from '../http'
import type { ExchangeAdapter, InstType, Ticker, MarketMeta } from './types'

export const okx: ExchangeAdapter = {
  toExchangeSymbol(s, type) {
    const base = s.replace('/', '-').toUpperCase()
    return type==='USDT_PERP' ? `${base}-SWAP` : base
  },

  async fetchTicker(symbol, type): Promise<Ticker> {
    const instId = this.toExchangeSymbol(symbol, type)
    const data = await httpGet(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`)
    const d = data.data?.[0]
    if (!d) {
      throw new Error(`No ticker data for ${instId} on OKX`)
    }
    return { last: Number(d.last), ts: Number(d.ts) }
  },

  async fetchKlines(symbol, type, interval, limit) {
    const instId = this.toExchangeSymbol(symbol, type)
    const data = await httpGet(`https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${interval}&limit=${limit}`)
    return data.data.map((r:any)=>({ t:+r[0], o:+r[1], h:+r[2], l:+r[3], c:+r[4], v:+r[5] }))
  },

  async fetchMarketMeta(symbol, type): Promise<MarketMeta> {
    const instType = type==='USDT_PERP' ? 'SWAP' : 'SPOT'
    const base = symbol.split('/')[0].toUpperCase()
    const quote = symbol.split('/')[1].toUpperCase()
    const data = await httpGet(`https://www.okx.com/api/v5/public/instruments?instType=${instType}&uly=${base}-${quote}`)
    const instId = this.toExchangeSymbol(symbol, type)
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
      mmr: '0.004' // Default maintenance margin rate
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
          console.log(`OKX WebSocket disconnected, reconnecting... (${reconnectCount}/${maxReconnects})`)
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