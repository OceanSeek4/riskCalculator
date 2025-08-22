import { httpGet } from '../http'
import type { ExchangeAdapter, InstType, Ticker, MarketMeta } from './types'

export const binance: ExchangeAdapter = {
  toExchangeSymbol(s, type) { 
    return s.replace('/', '').toUpperCase() 
  },

  async fetchTicker(symbol, type): Promise<Ticker> {
    const sym = this.toExchangeSymbol(symbol, type)
    if (type === 'USDT_PERP') {
      const data = await httpGet(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`)
      const premium = await httpGet(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${sym}`)
      return { last: Number(data.price), mark: Number(premium.markPrice), ts: Date.now() }
    } else {
      const data = await httpGet(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`)
      return { last: Number(data.price), ts: Date.now() }
    }
  },

  async fetchKlines(symbol, type, interval, limit) {
    const sym = this.toExchangeSymbol(symbol, type)
    const base = type === 'USDT_PERP' ? 'https://fapi.binance.com/fapi/v1' : 'https://api.binance.com/api/v3'
    const arr = await httpGet(`${base}/klines?symbol=${sym}&interval=${interval}&limit=${limit}`)
    return arr.map((r:any)=>({ t:r[0], o:+r[1], h:+r[2], l:+r[3], c:+r[4], v:+r[5] }))
  },

  async fetchMarketMeta(symbol, type): Promise<MarketMeta> {
    const base = type === 'USDT_PERP' ? 'https://fapi.binance.com/fapi/v1' : 'https://api.binance.com/api/v3'
    const info = await httpGet(`${base}/exchangeInfo`)
    const sym = this.toExchangeSymbol(symbol, type)
    const s = info.symbols.find((x:any)=> x.symbol === sym)
    if (!s) {
      throw new Error(`Symbol ${sym} not found on ${type === 'USDT_PERP' ? 'Binance Futures' : 'Binance Spot'}`)
    }
    const pf = s.filters.find((f:any)=> f.filterType === 'PRICE_FILTER')
    const lf = s.filters.find((f:any)=> f.filterType === 'LOT_SIZE')
    const mn = s.filters.find((f:any)=> f.filterType === 'MIN_NOTIONAL')
    return { 
      symbol: sym,
      tickSize: pf?.tickSize ?? '0.01', 
      stepSize: lf?.stepSize ?? '0.001', 
      minQty: lf?.minQty ?? '0.001', 
      minNotional: mn?.notional ?? '5', 
      leverageMax: 125,
      mmr: '0.004' // Default maintenance margin rate for most pairs
    }
  },

  subscribeTicker(symbol, type, onTick) {
    const sym = this.toExchangeSymbol(symbol, type)
    const ws = new WebSocket(type==='USDT_PERP'
      ? `wss://fstream.binance.com/ws/${sym.toLowerCase()}@ticker`
      : `wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@ticker`)
    
    let reconnectCount = 0
    const maxReconnects = 5
    
    const connect = () => {
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string)
          const last = Number(d.c)
          const mark = d?.m ? Number(d.m) : undefined
          onTick({ last, mark, ts: Date.now() })
          reconnectCount = 0 // Reset on successful message
        } catch (error) {
          console.warn('Failed to parse Binance WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        if (reconnectCount < maxReconnects) {
          reconnectCount++

          setTimeout(connect, 1000 * reconnectCount)
        } else {
          console.error('Binance WebSocket max reconnection attempts reached')
        }
      }
      
      ws.onerror = (error) => {
        console.error('Binance WebSocket error:', error)
      }
    }
    
    connect()
    return () => ws.close()
  }
}