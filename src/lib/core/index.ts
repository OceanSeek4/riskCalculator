// Core types
export * from './types.js';

// Math utilities
export * from './math.js';

// ATR calculations
export * from './atr.js';

// Position calculation formulas
export * from './formulas.js';

// Trailing exits functionality
export {
  type MaType,
  type Strategy,
  type OffsetType,
  type Candle,
  type TrailingConfig,
  type IndicatorState,
  type TrailingState,
  type ExpectedPnL,
  updateOnClose,
  previewIntrabar,
  calculateExpectedPnL,
  roundToTick as trailingRoundToTick
} from './trailing.js';

// Re-export Decimal for convenience
export { Decimal } from 'decimal.js';