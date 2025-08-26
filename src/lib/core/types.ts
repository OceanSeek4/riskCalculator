export type Side = 'LONG' | 'SHORT';
export type StopMode = 'PRICE' | 'ATR' | 'PIPS';
export type TakeProfitMode = 'PRICE' | 'ATR' | 'RR_RATIO' | 'PIPS';
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
  stopPips?: string;
  stopMode: StopMode;
  // Take profit settings
  useTakeProfit?: boolean;
  takeProfitMode?: TakeProfitMode;
  takeProfitPrice?: string;
  takeProfitATRMultiplier?: string;
  takeProfitRRRatio?: string;
  takeProfitPips?: string;
  riskMode: RiskMode;
  riskUSDT?: string;
  accountEquity?: string;
  riskPercent?: string;
  includeFees: boolean;
  // Maker/Taker fee structure
  feeOpenMaker: string;
  feeOpenTaker: string;
  feeCloseMaker: string;
  feeCloseTaker: string;
  slippageOpen: string;
  slippageClose: string;
  // Rebate settings
  enableRebate?: boolean;
  rebatePercent?: string;
  // Backward compatibility
  feeOpen: string;
  feeClose: string;
  slippage: string;
  leverage?: number;
  contractMode: ContractMode;
  marketMeta: MarketMeta;
  orderType?: OrderType;
  feeType?: 'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY';
  rrRatios: number[];
}

export interface CalcResult {
  qtyRaw: string;
  qtyRounded: string;
  notional: string;
  initialMargin?: string;
  entryPrice: string; // Store the entry price used in calculation
  stopPrice: string;
  liquidationPrice?: string;
  // Take profit result
  takeProfitPrice?: string;
  takeProfitPriceFormatted?: string;
  takeProfitRR?: number; // Risk/Reward ratio including fees
  takeProfitProfit?: string; // Expected profit amount in USDT
  takeProfitProfitFormatted?: string;
  // Detailed profit breakdown
  profitBreakdown?: {
    priceProfit: string; // 数量 × 价格差
    priceProfitFormatted: string;
    openFeeAmount: string; // 数量 × 开仓价格 × 开仓手续费率 (负数，成本)
    openFeeAmountFormatted: string;
    closeFeeAmount: string; // 数量 × 止盈价格 × 平仓手续费率 (负数，成本)
    closeFeeAmountFormatted: string;
    slippageAmount?: string; // 数量 × 开仓价格 × 滑点率 (负数，成本)
    slippageAmountFormatted?: string;
    // Rebate information
    rebateInfo?: {
      enabled: boolean;
      rebatePercent: string;
      originalOpenFeeAmount: string; // 原始开仓手续费（负数，成本）
      originalOpenFeeAmountFormatted: string;
      originalCloseFeeAmount: string; // 原始平仓手续费（负数，成本）
      originalCloseFeeAmountFormatted: string;
      rebateSavings: string; // 返佣节省金额（正数，节省的成本）
      rebateSavingsFormatted: string;
    };
  };
  // Stop loss risk
  stopLossRisk?: string; // Total risk including fees and price difference
  stopLossRiskFormatted?: string;
  actualRiskAmount?: string; // Actual calculated risk based on position size
  actualRiskAmountFormatted?: string;
  // Detailed risk breakdown
  riskBreakdown?: {
    priceRisk: string; // 数量 × 点差
    priceRiskFormatted: string;
    openFeeAmount: string; // 数量 × 开仓价格 × 开仓手续费率
    openFeeAmountFormatted: string;
    closeFeeAmount: string; // 数量 × 平仓价格 × 平仓手续费率
    closeFeeAmountFormatted: string;
    slippageAmount?: string; // 数量 × 开仓价格 × 滑点率
    slippageAmountFormatted?: string;
    // Rebate information
    rebateInfo?: {
      enabled: boolean;
      rebatePercent: string;
      originalOpenFeeAmount: string; // 原始开仓手续费
      originalOpenFeeAmountFormatted: string;
      originalCloseFeeAmount: string; // 原始平仓手续费
      originalCloseFeeAmountFormatted: string;
      rebateSavings: string; // 返佣节省金额
      rebateSavingsFormatted: string;
    };
  };
  targets: Array<{ rr: number; price: string; priceFormatted: string; isBreakeven?: boolean }>;
  warnings: string[];
  warningKeys: WarningKey[];
  orderSummary: string;
  totalFees?: string;
  openFee?: string;
  closeFee?: string;
  includeFees: boolean;
  // Formatted values based on market metadata
  qtyRoundedFormatted: string;
  stopPriceFormatted: string;
  liquidationPriceFormatted?: string;
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