import { SafeDecimal } from './math.js';
import { KlineData, DecimalError } from './types.js';

/**
 * Calculate True Range for a single period
 * @param high Current high
 * @param low Current low
 * @param prevClose Previous close
 * @returns True Range value
 */
export function calculateTrueRange(
  high: SafeDecimal,
  low: SafeDecimal,
  prevClose: SafeDecimal
): SafeDecimal {
  const hl = high.safeSub(low);
  const hc = high.safeSub(prevClose).abs();
  const lc = low.safeSub(prevClose).abs();
  
  return SafeDecimal.from(Math.max(hl.toNumber(), hc.toNumber(), lc.toNumber()));
}

/**
 * Calculate ATR using Wilder's smoothing method (original ATR)
 * @param klines Array of kline data
 * @param period ATR period (default 14)
 * @returns ATR value
 */
export function calculateATR(klines: KlineData[], period: number = 14): SafeDecimal {
  if (klines.length < period + 1) {
    throw new DecimalError(`Insufficient data: need ${period + 1} periods, got ${klines.length}`, {
      required: period + 1,
      actual: klines.length
    });
  }

  const trueRanges: SafeDecimal[] = [];
  
  // Calculate True Range for each period (starting from index 1)
  for (let i = 1; i < klines.length; i++) {
    const current = klines[i];
    const previous = klines[i - 1];
    
    const high = SafeDecimal.from(current.high);
    const low = SafeDecimal.from(current.low);
    const prevClose = SafeDecimal.from(previous.close);
    
    const tr = calculateTrueRange(high, low, prevClose);
    trueRanges.push(tr);
  }
  
  if (trueRanges.length < period) {
    throw new DecimalError(`Insufficient true range data: need ${period}, got ${trueRanges.length}`, {
      required: period,
      actual: trueRanges.length
    });
  }
  
  // Initial ATR: Simple average of first 'period' true ranges
  let sum = SafeDecimal.zero();
  for (let i = 0; i < period; i++) {
    sum = sum.safeAdd(trueRanges[i]);
  }
  let atr = sum.safeDiv(period);
  
  // Apply Wilder's smoothing for remaining periods
  // ATR = ((Previous ATR * (period - 1)) + Current TR) / period
  const alpha = SafeDecimal.one().safeDiv(period); // 1/period
  const oneMinusAlpha = SafeDecimal.one().safeSub(alpha); // (period-1)/period
  
  for (let i = period; i < trueRanges.length; i++) {
    atr = atr.safeMul(oneMinusAlpha).safeAdd(trueRanges[i].safeMul(alpha));
  }
  
  return atr;
}

/**
 * Calculate ATR using Exponential Moving Average (alternative method)
 * @param klines Array of kline data
 * @param period ATR period (default 14)
 * @returns ATR value
 */
export function calculateATR_EMA(klines: KlineData[], period: number = 14): SafeDecimal {
  if (klines.length < period + 1) {
    throw new DecimalError(`Insufficient data: need ${period + 1} periods, got ${klines.length}`, {
      required: period + 1,
      actual: klines.length
    });
  }

  const trueRanges: SafeDecimal[] = [];
  
  // Calculate True Range for each period
  for (let i = 1; i < klines.length; i++) {
    const current = klines[i];
    const previous = klines[i - 1];
    
    const high = SafeDecimal.from(current.high);
    const low = SafeDecimal.from(current.low);
    const prevClose = SafeDecimal.from(previous.close);
    
    const tr = calculateTrueRange(high, low, prevClose);
    trueRanges.push(tr);
  }
  
  if (trueRanges.length < period) {
    throw new DecimalError(`Insufficient true range data: need ${period}, got ${trueRanges.length}`, {
      required: period,
      actual: trueRanges.length
    });
  }
  
  // Initial ATR: Simple average of first 'period' true ranges
  let sum = SafeDecimal.zero();
  for (let i = 0; i < period; i++) {
    sum = sum.safeAdd(trueRanges[i]);
  }
  let atr = sum.safeDiv(period);
  
  // EMA smoothing factor: 2 / (period + 1)
  const alpha = SafeDecimal.from(2).safeDiv(SafeDecimal.from(period + 1));
  const oneMinusAlpha = SafeDecimal.one().safeSub(alpha);
  
  // Apply EMA for remaining periods
  for (let i = period; i < trueRanges.length; i++) {
    atr = trueRanges[i].safeMul(alpha).safeAdd(atr.safeMul(oneMinusAlpha));
  }
  
  return atr;
}

/**
 * Parse kline data from exchange format to internal format
 * @param rawKlines Raw kline data from exchange
 * @returns Parsed kline data
 */
export function parseKlineData(rawKlines: any[]): KlineData[] {
  return rawKlines.map((kline, index) => {
    try {
      // Handle both array and object formats
      if (Array.isArray(kline)) {
        // Binance format: [openTime, open, high, low, close, volume, closeTime, ...]
        return {
          openTime: parseInt(kline[0]),
          open: kline[1].toString(),
          high: kline[2].toString(),
          low: kline[3].toString(),
          close: kline[4].toString(),
          volume: kline[5].toString(),
          closeTime: parseInt(kline[6]),
        };
      } else {
        // Object format: {openTime, open, high, low, close, volume, closeTime}
        return {
          openTime: parseInt(kline.openTime),
          open: kline.open.toString(),
          high: kline.high.toString(),
          low: kline.low.toString(),
          close: kline.close.toString(),
          volume: kline.volume.toString(),
          closeTime: parseInt(kline.closeTime),
        };
      }
    } catch (error) {
      throw new DecimalError(`Failed to parse kline data at index ${index}`, { kline, error });
    }
  });
}