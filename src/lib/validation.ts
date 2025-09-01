import { z } from 'zod';

export const calculatorFormSchema = z.object({
  // Market settings
  exchange: z.enum(['BINANCE', 'BYBIT', 'BITGET', 'OKX']),
  symbol: z.string().min(1, 'Symbol is required'),
  contractMode: z.enum(['SPOT', 'USDT_PERP', 'INVERSE']),
  
  // Position settings
  side: z.enum(['LONG', 'SHORT']),
  entryPrice: z.string()
    .min(1, 'Entry price is required')
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, 'Entry price must be a positive number'),
  
  // Limit order specific price (separate from entryPrice to prevent auto-overwrite)
  limitPrice: z.string().optional(),
  
  // Stop loss settings
  stopMode: z.enum(['PRICE', 'ATR', 'PIPS']),
  stopPrice: z.string().optional(),
  stopPips: z.string().optional(),
  
  
  // ATR settings
  atrPeriod: z.number().min(1).max(50).default(14),
  atrTimeframe: z.string().default('1h'),
  atrMultiplier: z.string().optional(),
  
  // Take profit settings
  useTakeProfit: z.boolean().default(false),
  takeProfitMode: z.enum(['PRICE', 'ATR', 'RR_RATIO', 'PIPS']).optional(),
  takeProfitPrice: z.string().optional(),
  takeProfitATRMultiplier: z.string().optional(),
  takeProfitRRRatio: z.string().optional(),
  takeProfitPips: z.string().optional(),
  
  // Risk settings
  riskMode: z.enum(['FIXED_USDT', 'ACCOUNT_PERCENT']).default('FIXED_USDT'),
  riskAmount: z.string().optional(),
  riskPercent: z.string().optional(),
  
  // Fees and costs
  includeFees: z.boolean().default(false),
  feeOpenMaker: z.string().default('0.0002'),
  feeOpenTaker: z.string().default('0.0006'),
  feeCloseMaker: z.string().default('0.0002'),
  feeCloseTaker: z.string().default('0.0006'),
  slippageOpen: z.string().default('0.0005'),
  slippageClose: z.string().default('0.0005'),
  
  // Rebate settings
  enableRebate: z.boolean().default(true),
  rebatePercent: z.string().default('30'), // Default rebate percentage
  
  // Backward compatibility fields
  feeOpen: z.string().default('0.0004'),
  feeClose: z.string().default('0.0004'),
  slippage: z.string().default('0.0005'),
  
  // Leverage (for contracts)
  leverage: z.number().min(1).max(200).optional(),
  
  // Order type
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  
  // Fee type selection (for limit orders)
  feeType: z.enum(['MAKER', 'TAKER', 'MAKER_OPEN_TAKER_CLOSE', 'MAKER_OPEN_ONLY']).default('MAKER_OPEN_TAKER_CLOSE'),
  
  // Auto-leverage settings
  autoLeverage: z.boolean().default(false),
  accountEquity: z.string().optional(),
  maxEquityUsage: z.string().default('0.8'),

  // Position scaling settings
  enablePositionScaling: z.boolean().default(false),
  initialPositionPercentage: z.number().min(1).max(100).default(100),
});

export type CalculatorFormData = z.infer<typeof calculatorFormSchema>;

export const settingsSchema = z.object({
  // Default values
  defaultExchange: z.enum(['BINANCE', 'BYBIT', 'BITGET', 'OKX']).default('BINANCE'),
  defaultSymbol: z.string().default('BTCUSDT'),
  defaultContractMode: z.enum(['SPOT', 'USDT_PERP', 'INVERSE']).default('USDT_PERP'),
  
  // Default modes
  defaultStopMode: z.enum(['PRICE', 'ATR', 'PIPS']).default('PRICE'),
  defaultTakeProfitMode: z.enum(['PRICE', 'ATR', 'RR_RATIO', 'PIPS']).default('PRICE'),
  defaultUseTakeProfit: z.boolean().default(false),
  defaultRiskMode: z.enum(['FIXED_USDT', 'ACCOUNT_PERCENT']).default('FIXED_USDT'),
  defaultOrderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  defaultFeeType: z.enum(['MAKER', 'TAKER', 'MAKER_OPEN_TAKER_CLOSE', 'MAKER_OPEN_ONLY']).default('MAKER_OPEN_TAKER_CLOSE'),
  defaultLeverage: z.number().min(1).max(200).default(10),
  
  // Default risk settings
  defaultAccountEquity: z.string().default('10000'),
  defaultRiskPercent: z.string().default('1'),
  defaultRiskAmount: z.string().default('100'),
  
  // Default fees
  defaultFeeOpenMaker: z.string().default('0.0002'),
  defaultFeeOpenTaker: z.string().default('0.0006'),
  defaultFeeCloseMaker: z.string().default('0.0002'),
  defaultFeeCloseTaker: z.string().default('0.0006'),
  defaultSlippageOpen: z.string().default('0.0005'),
  defaultSlippageClose: z.string().default('0.0005'),
  defaultIncludeFees: z.boolean().default(false),
  
  // Rebate settings
  defaultEnableRebate: z.boolean().default(true),
  defaultRebateBinance: z.string().default('30'), // 30% rebate
  defaultRebateBybit: z.string().default('40'), // 40% rebate
  defaultRebateBitget: z.string().default('40'), // 40% rebate
  defaultRebateOkx: z.string().default('30'), // 30% rebate
  
  // Backward compatibility fields
  defaultFeeOpen: z.string().default('0.0004'),
  defaultFeeClose: z.string().default('0.0004'),
  defaultSlippage: z.string().default('0.0005'),
  
  // ATR settings
  defaultAtrPeriod: z.number().default(14),
  defaultAtrTimeframe: z.string().default('1h'),
  defaultAtrMultiplier: z.string().default('2'),
  
  
  // Take profit defaults
  defaultTakeProfitPrice: z.string().default(''),
  defaultTakeProfitATRMultiplier: z.string().default('2'),
  defaultTakeProfitRRRatio: z.string().default('2'),
  defaultStopPips: z.string().default('50'),
  defaultTakeProfitPips: z.string().default('100'),
  
  // Risk/Reward ratios
  rrRatios: z.array(z.number()).default([1, 1.5, 2]),
  
  // UI preferences
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['en', 'zh']).default('en'),
  defaultViewMode: z.enum(['full', 'quick']).default('full'),
  
  // Trailing stop defaults
  defaultTrailingEnabled: z.boolean().default(false),
  defaultTrailingStrategy: z.enum(['MA_CROSS_EXIT', 'MA_BAND_STOP', 'MA_CHANDELIER']).default('MA_BAND_STOP'),
  defaultTrailingMaType: z.enum(['EMA', 'SMA']).default('EMA'),
  defaultTrailingMaPeriod: z.number().min(1).max(200).default(20),
  defaultTrailingAtrPeriod: z.number().min(1).max(100).default(14),
  defaultTrailingTimeframe: z.string().default('1h'),
  defaultTrailingOffsetType: z.enum(['ATRx', 'PCT', 'ABS']).default('ATRx'),
  defaultTrailingAtrMultiplier: z.number().min(0.1).max(10).default(2),
  defaultTrailingPercentage: z.number().min(0.01).max(10).default(0.5),
  defaultTrailingAbsolute: z.number().min(0.01).default(10),
  defaultTrailingOnCloseOnly: z.boolean().default(true),

  // Symbol list for dropdown
  symbolList: z.array(z.string()).default(['BTCUSDT', 'ETHUSDT', 'SUIUSDT', 'ADAUSDT', 'XRPUSDT']),

  // Advanced
  autoFetchATR: z.boolean().default(true),
  showAdvancedOptions: z.boolean().default(false),
  
  // Offline mode settings
  defaultOfflineMode: z.boolean().default(false),
  offlineStopMode: z.enum(['PRICE', 'PIPS']).default('PIPS'),
  offlineTakeProfitMode: z.enum(['PRICE', 'RR_RATIO', 'PIPS']).default('RR_RATIO'),
  offlineOrderType: z.enum(['LIMIT']).default('LIMIT'),
  offlineDefaultEntryPrice: z.string().default('100000'),
  offlineTrailingEnabled: z.boolean().default(false),

  // Position scaling settings
  defaultEnablePositionScaling: z.boolean().default(false),
  defaultPositionScalingPercentages: z.array(z.number().min(1).max(100)).default([20, 50, 100]),
});

export type SettingsData = z.infer<typeof settingsSchema>;

// Validation helper functions
export function validateNumberString(value: string, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (num <= 0) {
    return `${fieldName} must be positive`;
  }
  
  return null;
}

export function validateStopPrice(
  entryPrice: string,
  stopPrice: string,
  side: 'LONG' | 'SHORT'
): string | null {
  const entry = Number(entryPrice);
  const stop = Number(stopPrice);
  
  if (isNaN(entry) || isNaN(stop)) {
    return 'Invalid price values';
  }
  
  if (side === 'LONG' && stop >= entry) {
    return 'Stop price must be below entry price for LONG positions';
  }
  
  if (side === 'SHORT' && stop <= entry) {
    return 'Stop price must be above entry price for SHORT positions';
  }
  
  return null;
}

export function validateLeverage(
  leverage: number,
  maxLeverage: number
): string | null {
  if (leverage < 1) {
    return 'Leverage must be at least 1x';
  }
  
  if (leverage > maxLeverage) {
    return `Leverage cannot exceed ${maxLeverage}x`;
  }
  
  return null;
}