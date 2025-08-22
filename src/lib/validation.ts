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
  
  // Stop loss settings
  stopMode: z.enum(['PRICE', 'ATR']),
  stopPrice: z.string().optional(),
  
  
  // ATR settings
  atrPeriod: z.number().min(1).max(50).default(14),
  atrTimeframe: z.string().default('1h'),
  atrMultiplier: z.string().optional(),
  
  // Take profit settings
  useTakeProfit: z.boolean().default(false),
  takeProfitMode: z.enum(['PRICE', 'ATR', 'RR_RATIO']).optional(),
  takeProfitPrice: z.string().optional(),
  takeProfitATRMultiplier: z.string().optional(),
  takeProfitRRRatio: z.string().optional(),
  
  // Risk settings
  riskMode: z.enum(['FIXED_USDT', 'ACCOUNT_PERCENT']).default('FIXED_USDT'),
  riskAmount: z.string().optional(),
  riskPercent: z.string().optional(),
  
  // Fees and costs
  includeFees: z.boolean().default(false),
  feeOpen: z.string().default('0.0004'),
  feeClose: z.string().default('0.0004'),
  slippage: z.string().default('0.0005'),
  
  // Leverage (for contracts)
  leverage: z.number().min(1).max(200).optional(),
  
  // Order type
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  
  // Auto-leverage settings
  autoLeverage: z.boolean().default(false),
  accountEquity: z.string().optional(),
  maxEquityUsage: z.string().default('0.8'),
});

export type CalculatorFormData = z.infer<typeof calculatorFormSchema>;

export const settingsSchema = z.object({
  // Default values
  defaultExchange: z.enum(['BINANCE', 'BYBIT', 'BITGET', 'OKX']).default('BINANCE'),
  defaultSymbol: z.string().default('BTCUSDT'),
  defaultContractMode: z.enum(['SPOT', 'USDT_PERP', 'INVERSE']).default('USDT_PERP'),
  
  // Default modes
  defaultStopMode: z.enum(['PRICE', 'ATR']).default('PRICE'),
  defaultTakeProfitMode: z.enum(['PRICE', 'ATR', 'RR_RATIO']).default('PRICE'),
  defaultUseTakeProfit: z.boolean().default(false),
  defaultRiskMode: z.enum(['FIXED_USDT', 'ACCOUNT_PERCENT']).default('FIXED_USDT'),
  defaultOrderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  defaultLeverage: z.number().min(1).max(200).default(10),
  
  // Default risk settings
  defaultAccountEquity: z.string().default('10000'),
  defaultRiskPercent: z.string().default('1'),
  defaultRiskAmount: z.string().default('100'),
  
  // Default fees
  defaultFeeOpen: z.string().default('0.0004'),
  defaultFeeClose: z.string().default('0.0004'),
  defaultSlippage: z.string().default('0.0005'),
  defaultIncludeFees: z.boolean().default(false),
  
  // ATR settings
  defaultAtrPeriod: z.number().default(14),
  defaultAtrTimeframe: z.string().default('1h'),
  defaultAtrMultiplier: z.string().default('2'),
  
  
  // Take profit defaults
  defaultTakeProfitPrice: z.string().default(''),
  defaultTakeProfitATRMultiplier: z.string().default('2'),
  defaultTakeProfitRRRatio: z.string().default('2'),
  
  // Risk/Reward ratios
  rrRatios: z.array(z.number()).default([1, 1.5, 2]),
  
  // UI preferences
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['en', 'zh']).default('en'),
  
  // Advanced
  autoFetchATR: z.boolean().default(true),
  showAdvancedOptions: z.boolean().default(false),
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