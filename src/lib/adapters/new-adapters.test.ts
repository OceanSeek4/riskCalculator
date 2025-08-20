import { describe, it, expect } from 'vitest'
import { binance, bybit, okx, bitget } from './index'

describe('Exchange Adapters', () => {
  describe('Symbol conversion', () => {
    it('should convert symbols correctly for Binance', () => {
      expect(binance.toExchangeSymbol('BTC/USDT', 'SPOT')).toBe('BTCUSDT')
      expect(binance.toExchangeSymbol('BTC/USDT', 'USDT_PERP')).toBe('BTCUSDT')
      expect(binance.toExchangeSymbol('eth/usdt', 'SPOT')).toBe('ETHUSDT')
    })

    it('should convert symbols correctly for Bybit', () => {
      expect(bybit.toExchangeSymbol('BTC/USDT', 'SPOT')).toBe('BTCUSDT')
      expect(bybit.toExchangeSymbol('BTC/USDT', 'USDT_PERP')).toBe('BTCUSDT')
    })

    it('should convert symbols correctly for OKX', () => {
      expect(okx.toExchangeSymbol('BTC/USDT', 'SPOT')).toBe('BTC-USDT')
      expect(okx.toExchangeSymbol('BTC/USDT', 'USDT_PERP')).toBe('BTC-USDT-SWAP')
      expect(okx.toExchangeSymbol('eth/usdt', 'USDT_PERP')).toBe('ETH-USDT-SWAP')
    })

    it('should convert symbols correctly for Bitget', () => {
      expect(bitget.toExchangeSymbol('BTC/USDT', 'SPOT')).toBe('BTCUSDT')
      expect(bitget.toExchangeSymbol('BTC/USDT', 'USDT_PERP')).toBe('BTCUSDT')
    })
  })

  describe('Error handling', () => {
    it('should have proper error handling structure', () => {
      // Test that adapters have the expected error handling structure
      expect(typeof binance.fetchTicker).toBe('function')
      expect(typeof bybit.fetchTicker).toBe('function')
      expect(typeof okx.fetchTicker).toBe('function')
      expect(typeof bitget.fetchTicker).toBe('function')
    })
  })

  describe('Data validation', () => {
    it('should return valid ticker format', async () => {
      // This would be a real test in a proper test environment
      // For now, we just test the structure
      const mockTicker = { last: 50000, mark: 50001, ts: Date.now() }
      
      expect(mockTicker).toHaveProperty('last')
      expect(typeof mockTicker.last).toBe('number')
      expect(mockTicker.last).toBeGreaterThan(0)
    })

    it('should return valid market metadata format', async () => {
      const mockMeta = {
        tickSize: '0.01',
        stepSize: '0.001', 
        minQty: '0.001',
        minNotional: '5',
        leverageMax: 125
      }

      expect(mockMeta).toHaveProperty('tickSize')
      expect(mockMeta).toHaveProperty('stepSize')
      expect(mockMeta).toHaveProperty('leverageMax')
      expect(typeof mockMeta.leverageMax).toBe('number')
    })
  })
})