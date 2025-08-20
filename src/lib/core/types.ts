export type Side = 'LONG' | 'SHORT';
export type StopMode = 'PRICE' | 'ATR';
export type ContractMode = 'SPOT' | 'USDT_PERP' | 'INVERSE';

export type Exchange = 'BINANCE' | 'BYBIT' | 'BITGET' | 'OKX';

export interface MarketMeta {
  symbol: string;
  tickSize: string;
  stepSize: string;
  minQty: string;
  minNotional: string;
  leverageMax: number;
  mmr: string; // Maintenance margin rate
}

export type RiskMode = 'FIXED_USDT' | 'ACCOUNT_PERCENT';
export type OrderType = 'MARKET' | 'LIMIT';

export type WarningKey = 
  | 'warningExchangeRule'
  | 'warningTightStop'
  | 'warningWideStop'
  | 'warningHighRiskPercent'
  | 'warningElevatedRiskPercent'
  | 'warningCriticalLiquidation'
  | 'warningHighRiskLiquidation'
  | 'warningModerateRiskLiquidation'
  | 'warningExtremeLeverage'
  | 'warningHighLeverage'
  | 'warningHighMarginUsage'
  | 'warningModerateMarginUsage'
  | 'warningLeverageNotSpecified';

export interface CalcInput {
  side: Side;
  entryPrice: string;
  stopPrice?: string;
  atr?: string;
  atrMultiplier?: string;
  stopMode: StopMode;
  riskMode: RiskMode;
  riskUSDT?: string;
  accountEquity?: string;
  riskPercent?: string;
  includeFees: boolean;
  feeOpen: string;
  feeClose: string;
  slippage: string;
  leverage?: number;
  contractMode: ContractMode;
  marketMeta: MarketMeta;
  orderType?: OrderType;
  rrRatios: number[];
}

export interface CalcResult {
  qtyRaw: string;
  qtyRounded: string;
  notional: string;
  initialMargin?: string;
  stopPrice: string;
  liquidationPrice?: string;
  targets: Array<{ rr: number; price: string }>;
  warnings: string[];
  warningKeys: WarningKey[];
  orderSummary: string;
}

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export class DecimalError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'DecimalError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}