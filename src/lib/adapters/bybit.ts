import { httpGet } from '../http'
import type { ExchangeAdapter, InstType, Ticker, MarketMeta } from './types'

export const bybit: ExchangeAdapter = {
  toExchangeSymbol(s) { 
    return s.replace('/', '').toUpperCase() 
  },

  async fetchTicker(symbol, type): Promise<Ticker> {
    const sym = this.toExchangeSymbol(symbol, type)
    const category = type === 'USDT_PERP' ? 'linear' : 'spot'
    const data = await httpGet(`https://api.bybit.com/v5/market/tickers?category=${category}&symbol=${sym}`)
    const d = data.result.list[0]
    if (!d) {
      throw new Error(`No ticker data for ${sym} on Bybit ${category}`)
    }
    return { last: Number(d.lastPrice), mark: d.markPrice ? Number(d.markPrice) : undefined, ts: Date.now() }
  },

  async fetchKlines(symbol, type, interval, limit) {
    const sym = this.toExchangeSymbol(symbol, type)
    const category = type === 'USDT_PERP' ? 'linear' : 'spot'
    
    try {
      const data = await httpGet(`https://api.bybit.com/v5/market/kline?category=${category}&symbol=${sym}&interval=${interval}&limit=${limit}`)
      
      if (!data.result || !data.result.list || data.result.list.length === 0) {
        throw new Error(`No kline data returned for ${sym} on Bybit ${category} with interval ${interval}`)
      }
      
      return data.result.list.map((r:any)=>({ 
        t: +r[0], 
        o: +r[1], 
        h: +r[2], 
        l: +r[3], 
        c: +r[4], 
        v: +r[5] 
      }))
    } catch (error) {
      console.error(`Bybit fetchKlines error for ${sym} ${interval}:`, error)
      throw error
    }
  },

  async fetchMarketMeta(symbol, type): Promise<MarketMeta> {
    const sym = this.toExchangeSymbol(symbol, type)
    const category = type === 'USDT_PERP' ? 'linear' : 'spot'
    const data = await httpGet(`https://api.bybit.com/v5/market/instruments-info?category=${category}&symbol=${sym}`)
    const s = data.result.list[0]
    if (!s) {
      throw new Error(`Symbol ${sym} not found on Bybit ${category}`)
    }
    const lot = s.lotSizeFilter
    const pf = s.priceFilter
    return { 
      symbol: sym,
      tickSize: pf?.tickSize ?? '0.01', 
      stepSize: lot?.qtyStep ?? '0.001', 
      minQty: lot?.minOrderQty ?? '0.001', 
      minNotional: s?.minNotionalValue ?? '5', 
      leverageMax: Number(s?.leverageFilter?.maxLeverage ?? 100),
      mmr: '0.004' // Default maintenance margin rate
    }
  },

  subscribeTicker(symbol, type, onTick) {
    const sym = this.toExchangeSymbol(symbol, type)
    const category = type==='USDT_PERP' ? 'linear' : 'spot'
    const ws = new WebSocket('wss://stream.bybit.com/v5/public/'+category)
    
    let reconnectCount = 0
    const maxReconnects = 5
    
    const connect = () => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ op:'subscribe', args:[`tickers.${sym}`] }))
        reconnectCount = 0
      }
      
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data as string)
          if (m.topic?.startsWith('tickers.')) {
            const d = m.data
            onTick({ last: +d.lastPrice, mark: d.markPrice ? +d.markPrice : undefined, ts: Date.now() })
          }
        } catch (error) {
          console.warn('Failed to parse Bybit WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        if (reconnectCount < maxReconnects) {
          reconnectCount++
          console.log(`Bybit WebSocket disconnected, reconnecting... (${reconnectCount}/${maxReconnects})`)
          setTimeout(connect, 1000 * reconnectCount)
        } else {
          console.error('Bybit WebSocket max reconnection attempts reached')
        }
      }
      
      ws.onerror = (error) => {
        console.error('Bybit WebSocket error:', error)
      }
    }
    
    connect()
    return () => ws.close()
  }
}