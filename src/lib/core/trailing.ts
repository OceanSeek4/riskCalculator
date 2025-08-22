import { SafeDecimal } from './math.js';

export type Side = 'LONG' | 'SHORT';
export type MaType = 'EMA' | 'SMA';
export type Strategy = 'MA_CROSS_EXIT' | 'MA_BAND_STOP' | 'MA_CHANDELIER';
export type OffsetType = 'ATRx' | 'PCT' | 'ABS';

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface TrailingConfig {
  side: Side;
  strategy: Strategy;
  maType: MaType;
  maLen: number;
  atrLen: number;
  tfMs: number;              // timeframe in milliseconds
  offsetType?: OffsetType;   // Only for BAND/CHANDELIER strategies
  k?: number;                // ATRx multiplier, e.g. 2
  pct?: number;              // PCT, e.g. 0.005 = 0.5%
  abs?: number;              // ABS, absolute price difference
  roundTick: number;         // tickSize from market metadata
  onCloseOnly: boolean;      // Only update on bar close
  rrTargets?: number[];      // e.g. [1, 1.5, 2] for TP reference
}

export interface IndicatorState {
  ma?: number;
  atr?: number;
  prevClose?: number;
  // For incremental calculations
  emaMultiplier?: number;
  atrTrueRanges?: number[];  // Rolling window for ATR
  smaWindow?: number[];      // Rolling window for SMA
}

export interface TrailingState {
  indicators: IndicatorState;
  stop?: number;      // Current effective stop (B/C strategies only)
  exitTrigger?: number; // A strategy's "trigger line" (MA)
}

/**
 * Calculate True Range for ATR
 */
function calculateTrueRange(current: Candle, previous?: Candle): number {
  if (!previous) {
    return current.h - current.l;
  }
  
  const hl = current.h - current.l;
  const hc = Math.abs(current.h - previous.c);
  const lc = Math.abs(current.l - previous.c);
  
  return Math.max(hl, hc, lc);
}

/**
 * Round price to tick size with direction
 */
export function roundToTick(price: number, tickSize: number, direction: 'up' | 'down' = 'down'): number {
  if (tickSize <= 0) return price;
  
  const ratio = price / tickSize;
  
  if (direction === 'up') {
    return Math.ceil(ratio) * tickSize;
  } else {
    return Math.floor(ratio) * tickSize;
  }
}

/**
 * Incremental EMA calculation
 */
function updateEmaIncremental(prevEma: number | undefined, newValue: number, multiplier: number): number {
  if (prevEma === undefined) {
    return newValue;
  }
  return (newValue * multiplier) + (prevEma * (1 - multiplier));
}

/**
 * Initialize EMA with SMA for better accuracy
 */
function initializeEmaWithSma(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices[prices.length - 1] || 0;
  }
  
  // Use SMA of first 'period' values as EMA seed
  const smaWindow = prices.slice(0, period);
  const sma = smaWindow.reduce((sum, price) => sum + price, 0) / period;
  
  // Apply EMA to remaining values
  const multiplier = 2 / (period + 1);
  let ema = sma;
  
  for (let i = period; i < prices.length; i++) {
    ema = updateEmaIncremental(ema, prices[i], multiplier);
  }
  
  return ema;
}

/**
 * Incremental ATR calculation using rolling window
 */
function updateAtrIncremental(trueRanges: number[], newTrueRange: number, period: number): number {
  // Add new true range
  trueRanges.push(newTrueRange);
  
  // Keep only the required period
  if (trueRanges.length > period) {
    trueRanges.shift();
  }
  
  // Calculate average
  const sum = trueRanges.reduce((acc, tr) => acc + tr, 0);
  return sum / trueRanges.length;
}

/**
 * SMA calculation using rolling window
 */
function updateSmaIncremental(window: number[], newValue: number, period: number): number {
  window.push(newValue);
  
  if (window.length > period) {
    window.shift();
  }
  
  const sum = window.reduce((acc, val) => acc + val, 0);
  return sum / window.length;
}

/**
 * Ratchet logic: only move stop in favorable direction
 */
function ratchetStop(currentStop: number | undefined, candidateStop: number, side: Side): number {
  if (currentStop === undefined) {
    return candidateStop;
  }
  
  if (side === 'LONG') {
    // For LONG, stop can only move up (higher prices)
    return Math.max(currentStop, candidateStop);
  } else {
    // For SHORT, stop can only move down (lower prices)
    return Math.min(currentStop, candidateStop);
  }
}

/**
 * Update trailing state on bar close
 */
export function updateOnClose(state: TrailingState, closed: Candle, config: TrailingConfig): TrailingState {
  const newState: TrailingState = {
    indicators: { ...state.indicators },
    stop: state.stop,
    exitTrigger: state.exitTrigger,
  };
  
  // Calculate MA
  const emaMultiplier = newState.indicators.emaMultiplier ?? 2 / (config.maLen + 1);
  newState.indicators.emaMultiplier = emaMultiplier;
  
  let ma: number;
  if (config.maType === 'EMA') {
    ma = updateEmaIncremental(newState.indicators.ma, closed.c, emaMultiplier);
  } else {
    newState.indicators.smaWindow = newState.indicators.smaWindow || [];
    ma = updateSmaIncremental(newState.indicators.smaWindow, closed.c, config.maLen);
  }
  newState.indicators.ma = ma;
  
  // Calculate ATR (for strategies that need it)
  if (config.strategy === 'MA_BAND_STOP' || config.strategy === 'MA_CHANDELIER') {
    const trueRange = calculateTrueRange(closed, newState.indicators.prevClose ? {
      t: 0, o: 0, h: 0, l: 0, c: newState.indicators.prevClose, v: 0
    } : undefined);
    
    newState.indicators.atrTrueRanges = newState.indicators.atrTrueRanges || [];
    const atr = updateAtrIncremental(newState.indicators.atrTrueRanges, trueRange, config.atrLen);
    newState.indicators.atr = atr;
  }
  
  newState.indicators.prevClose = closed.c;
  
  // Apply strategy logic
  switch (config.strategy) {
    case 'MA_CROSS_EXIT':
      newState.exitTrigger = roundToTick(ma, config.roundTick);
      newState.stop = undefined; // No stop for this strategy
      break;
      
    case 'MA_BAND_STOP':
      if (newState.indicators.atr !== undefined && config.offsetType) {
        let offset = 0;
        
        switch (config.offsetType) {
          case 'ATRx':
            offset = newState.indicators.atr * (config.k || 2);
            break;
          case 'PCT':
            offset = ma * (config.pct || 0.005);
            break;
          case 'ABS':
            offset = config.abs || 0;
            break;
        }
        
        let candidateStop: number;
        if (config.side === 'LONG') {
          candidateStop = roundToTick(ma - offset, config.roundTick, 'down');
        } else {
          candidateStop = roundToTick(ma + offset, config.roundTick, 'up');
        }
        
        newState.stop = ratchetStop(newState.stop, candidateStop, config.side);
      }
      break;
      
    case 'MA_CHANDELIER':
      if (newState.indicators.atr !== undefined) {
        const k = config.k || 2;
        let candidateStop: number;
        
        if (config.side === 'LONG') {
          candidateStop = roundToTick(ma - k * newState.indicators.atr, config.roundTick, 'down');
        } else {
          candidateStop = roundToTick(ma + k * newState.indicators.atr, config.roundTick, 'up');
        }
        
        newState.stop = ratchetStop(newState.stop, candidateStop, config.side);
      }
      break;
  }
  
  return newState;
}

/**
 * Preview intra-bar update (doesn't change state)
 */
export function previewIntrabar(state: TrailingState, lastPrice: number, config: TrailingConfig): { candidateStop?: number; candidateExit?: number } {
  if (config.onCloseOnly) {
    return { candidateStop: state.stop, candidateExit: state.exitTrigger };
  }
  
  // For real-time preview, we can estimate what would happen if bar closed now
  // This is a simplified preview - in practice you'd want more sophisticated logic
  const result: { candidateStop?: number; candidateExit?: number } = {};
  
  switch (config.strategy) {
    case 'MA_CROSS_EXIT':
      result.candidateExit = state.exitTrigger;
      break;
      
    case 'MA_BAND_STOP':
    case 'MA_CHANDELIER':
      result.candidateStop = state.stop;
      break;
  }
  
  return result;
}

/**
 * Calculate expected profit/loss
 */
export interface ExpectedPnL {
  expectedLoss?: number;
  expectedProfits: { rr: number; profit: number; price: number }[];
}

export function calculateExpectedPnL(
  entryPrice: number,
  qty: number,
  exitTriggerPrice: number | undefined,
  config: TrailingConfig,
  fees?: { open: number; close: number },
  slippage?: { open: number; close: number }
): ExpectedPnL {
  const result: ExpectedPnL = {
    expectedProfits: [],
  };
  
  // Calculate expected P&L when price reaches exit trigger price and trailing stop activates
  // This shows the profit/loss when exiting at the exit trigger price with all costs included
  if (exitTriggerPrice !== undefined) {
    // Price difference based profit/loss
    let priceDiff: number;
    if (config.side === 'LONG') {
      priceDiff = exitTriggerPrice - entryPrice; // Positive for profit, negative for loss
    } else {
      priceDiff = entryPrice - exitTriggerPrice; // Positive for profit, negative for loss
    }
    
    let netPnL = priceDiff * qty;
    
    // Subtract all trading costs
    if (fees) {
      // Opening fees (based on entry price)
      netPnL -= fees.open * entryPrice * qty;
      // Closing fees (based on exit trigger price)
      netPnL -= fees.close * exitTriggerPrice * qty;
    }
    
    if (slippage) {
      // Opening slippage cost (based on entry price)
      netPnL -= slippage.open * entryPrice * qty;
      // Closing slippage cost (based on exit trigger price)
      netPnL -= slippage.close * exitTriggerPrice * qty;
    }
    
    // Store as expectedLoss if negative, or as a single profit entry if positive
    if (netPnL < 0) {
      result.expectedLoss = Math.abs(netPnL);
    } else {
      result.expectedProfits.push({
        rr: 0, // Special marker for exit trigger P&L
        profit: netPnL,
        price: exitTriggerPrice,
      });
    }
  }
  
  return result;
}