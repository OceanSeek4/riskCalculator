import { httpGet } from '../http'
import type { ExchangeAdapter, InstType, Ticker, MarketMeta } from './types'

export const bitget: ExchangeAdapter = {
  toExchangeSymbol(s) { 
    return s.replace('/', '').toUpperCase() 
  },

  async fetchTicker(symbol, type): Promise<Ticker> {
    const sym = this.toExchangeSymbol(symbol, type)
    if (type === 'USDT_PERP') {
      const d = await httpGet(`https://api.bitget.com/api/v2/mix/market/ticker?productType=USDT-FUTURES&symbol=${sym}`)
      const x = d.data?.[0]
      if (!x) {
        throw new Error(`No ticker data for ${sym} on Bitget USDT-FUTURES`)
      }
      return { last: +x.lastPr, mark: x.markPrice ? +x.markPrice : undefined, ts: +x.ts }
    } else {
      const d = await httpGet(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${sym}`)
      const x = d.data?.[0]
      if (!x) {
        throw new Error(`No ticker data for ${sym} on Bitget Spot`)
      }
      return { last: +x.lastPr, ts: +x.ts }
    }
  },

  async fetchKlines(symbol, type, interval, limit) {
    const sym = this.toExchangeSymbol(symbol, type)
    if (type === 'USDT_PERP') {
      const d = await httpGet(`https://api.bitget.com/api/v2/mix/market/candles?productType=USDT-FUTURES&symbol=${sym}&granularity=${interval}&limit=${limit}`)
      return d.data.map((r:any)=>({ t:+r[0], o:+r[1], h:+r[2], l:+r[3], c:+r[4], v:+r[5] }))
    } else {
      const d = await httpGet(`https://api.bitget.com/api/v2/spot/market/candles?symbol=${sym}&granularity=${interval}&limit=${limit}`)
      return d.data.map((r:any)=>({ t:+r[0], o:+r[1], h:+r[2], l:+r[3], c:+r[4], v:+r[5] }))
    }
  },

  async fetchMarketMeta(symbol, type): Promise<MarketMeta> {
    const sym = this.toExchangeSymbol(symbol, type)
    if (type === 'USDT_PERP') {
      const d = await httpGet(`https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES&symbol=${sym}`)
      const s = d.data?.[0]
      if (!s) {
        throw new Error(`Symbol ${sym} not found on Bitget USDT-FUTURES`)
      }
      // Convert pricePlace (decimal places) to tickSize value
      const pricePlaces = s.pricePlace != null ? +s.pricePlace : 1
      const tick = Math.pow(10, -pricePlaces).toString()
      
      // Convert sizePlace (decimal places) to stepSize value  
      const sizePlaces = s.sizePlace != null ? +s.sizePlace : 3
      const step = Math.pow(10, -sizePlaces).toString()
      
      return { 
        symbol: sym,
        tickSize: tick, 
        stepSize: step, 
        minQty: s.minTradeNum ?? '0.001', 
        minNotional: '5', 
        leverageMax: s.maxLeverage ? +s.maxLeverage : 100,
        mmr: '0.004' // Default maintenance margin rate
      }
    } else {
      const d = await httpGet(`https://api.bitget.com/api/v2/spot/public/symbols`)
      const s = d.data?.find((x:any)=> x.symbol === sym) ?? d.data?.[0]
      if (!s) {
        throw new Error(`Symbol ${sym} not found on Bitget Spot`)
      }
      // 防守型解析
      const tick = (s?.pricePrecision != null) ? Math.pow(10, -s.pricePrecision).toString() : '0.01'
      const step = (s?.quantityPrecision != null) ? Math.pow(10, -s.quantityPrecision).toString() : '0.0001'
      return { 
        symbol: sym,
        tickSize: tick, 
        stepSize: step, 
        minQty: s?.minTradeNum ?? '0.001', 
        minNotional: s?.minTradeUSDT ?? '5', 
        leverageMax: 1,
        mmr: '0.001' // Lower maintenance margin for spot
      }
    }
  },

  subscribeTicker(symbol, type, onTick) {
    const instId = this.toExchangeSymbol(symbol, type)
    const ws = new WebSocket('wss://ws.bitget.com/v2/ws/public')
    
    let reconnectCount = 0
    const maxReconnects = 5
    
    const connect = () => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ 
          op:'subscribe', 
          args:[{ 
            instType: type==='USDT_PERP' ? 'USDT-FUTURES':'SPOT', 
            channel:'ticker', 
            instId 
          }] 
        }))
        reconnectCount = 0
      }
      
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data as string)
          const d = m.data?.[0]
          if (d?.lastPr) {
            onTick({ 
              last:+d.lastPr, 
              mark:d.markPrice?+d.markPrice:undefined, 
              ts:+d.ts 
            })
          }
        } catch (error) {
          console.warn('Failed to parse Bitget WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        if (reconnectCount < maxReconnects) {
          reconnectCount++
          console.log(`Bitget WebSocket disconnected, reconnecting... (${reconnectCount}/${maxReconnects})`)
          setTimeout(connect, 1000 * reconnectCount)
        } else {
          console.error('Bitget WebSocket max reconnection attempts reached')
        }
      }
      
      ws.onerror = (error) => {
        console.error('Bitget WebSocket error:', error)
      }
    }
    
    connect()
    return () => ws.close()
  }
}