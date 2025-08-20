export type Exchange = 'BINANCE' | 'BYBIT' | 'OKX' | 'BITGET'
export type InstType = 'SPOT' | 'USDT_PERP'

export interface Ticker {
  last: number
  mark?: number
  ts?: number
}

export interface MarketMeta {
  symbol: string
  tickSize: string
  stepSize: string
  minQty: string
  minNotional: string
  leverageMax: number
  mmr: string // Maintenance margin rate
}

export interface ExchangeAdapter {
  // 统一符号转换（OKX 需要 BTC-USDT / BTC-USDT-SWAP）
  toExchangeSymbol(symbol: string, type: InstType): string
  fetchTicker(symbol: string, type: InstType): Promise<Ticker>
  fetchKlines(symbol: string, type: InstType, interval: string, limit: number): Promise<Array<{ t:number,o:number,h:number,l:number,c:number,v:number }>>
  fetchMarketMeta(symbol: string, type: InstType): Promise<MarketMeta>
  // 可选：WS 订阅实时价
  subscribeTicker?(symbol: string, type: InstType, onTick: (t:Ticker)=>void): () => void
}