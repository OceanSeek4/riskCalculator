import { SafeDecimal, roundDownToStep, roundToTick, validateMinRequirements, formatPriceByTickSize, formatQuantityByStepSize } from './math.js';
import { CalcInput, CalcResult, Side, ContractMode, ValidationError, DecimalError, RiskMode, WarningKey, TakeProfitMode, OrderType } from './types.js';

/**
 * Calculate stop price based on ATR
 * @param entryPrice Entry price
 * @param atr ATR value
 * @param multiplier ATR multiplier
 * @param side Trading side (LONG/SHORT)
 * @returns Stop price
 */
export function calculateATRStopPrice(
  entryPrice: SafeDecimal,
  atr: SafeDecimal,
  multiplier: SafeDecimal,
  side: Side
): SafeDecimal {
  const atrDistance = atr.safeMul(multiplier);
  
  if (side === 'LONG') {
    return entryPrice.safeSub(atrDistance);
  } else {
    return entryPrice.safeAdd(atrDistance);
  }
}

/**
 * Calculate stop price based on PIPS
 * @param entryPrice Entry price
 * @param pips PIPS distance
 * @param tickSize Tick size (pip value)
 * @param side Trading side (LONG/SHORT)
 * @returns Stop price
 */
export function calculatePipsStopPrice(
  entryPrice: SafeDecimal,
  pips: SafeDecimal,
  tickSize: SafeDecimal,
  side: Side
): SafeDecimal {
  const pipsDistance = pips.safeMul(tickSize);
  
  if (side === 'LONG') {
    return entryPrice.safeSub(pipsDistance);
  } else {
    return entryPrice.safeAdd(pipsDistance);
  }
}

/**
 * Calculate take profit price based on different modes
 * @param entryPrice Entry price
 * @param takeProfitMode Take profit mode
 * @param side Trading side
 * @param takeProfitPrice Fixed price (for PRICE mode)
 * @param atr ATR value (for ATR mode)
 * @param atrMultiplier ATR multiplier (for ATR mode)
 * @returns Take profit price
 */
export function calculateTakeProfitPrice(
  entryPrice: SafeDecimal,
  takeProfitMode: TakeProfitMode,
  side: Side,
  takeProfitPrice?: string,
  atr?: SafeDecimal,
  atrMultiplier?: string,
  rrRatio?: string,
  totalStopRisk?: SafeDecimal,
  positionSize?: SafeDecimal,
  feeOpen?: SafeDecimal,
  feeClose?: SafeDecimal,
  slippageOpen?: SafeDecimal,
  slippageClose?: SafeDecimal,
  includeFees?: boolean,
  takeProfitPips?: string,
  tickSize?: SafeDecimal
): SafeDecimal {
  switch (takeProfitMode) {
    case 'PRICE':
      if (!takeProfitPrice) {
        throw new ValidationError('Take profit price is required for PRICE mode');
      }
      return SafeDecimal.from(takeProfitPrice);
      
    case 'ATR':
      if (!atr || !atrMultiplier) {
        throw new ValidationError('ATR and multiplier are required for ATR take profit mode');
      }
      const atrDistance = atr.safeMul(SafeDecimal.from(atrMultiplier));
      
      if (side === 'LONG') {
        return entryPrice.safeAdd(atrDistance);
      } else {
        return entryPrice.safeSub(atrDistance);
      }

    case 'RR_RATIO':
      if (!rrRatio || !totalStopRisk || !positionSize) {
        throw new ValidationError('Risk/Reward ratio, total stop risk, and position size are required for RR_RATIO take profit mode');
      }
      
      // Calculate required reward distance to achieve the R:R ratio
      const ratio = SafeDecimal.from(rrRatio);
      const requiredReward = totalStopRisk.safeMul(ratio).safeDiv(positionSize); // Convert back to per-unit for price calculation
      
      if (!includeFees || !feeOpen || !feeClose || !slippageOpen || !slippageClose) {
        // Simple calculation without fees
        return side === 'LONG'
          ? entryPrice.safeAdd(requiredReward)
          : entryPrice.safeSub(requiredReward);
      }
      
      // Calculate target price accounting for all fees and slippage
      // Use the same logic as calculateTargets function
      if (side === 'LONG') {
        // target_price = (entry_price * (1 + fee_open + slippage_open) + required_reward) / (1 - fee_close - slippage_close)
        const numerator = entryPrice.safeMul(SafeDecimal.one().safeAdd(feeOpen).safeAdd(slippageOpen)).safeAdd(requiredReward);
        const denominator = SafeDecimal.one().safeSub(feeClose).safeSub(slippageClose);
        return numerator.safeDiv(denominator);
      } else {
        // target_price = (entry_price * (1 - fee_open - slippage_open) - required_reward) / (1 + fee_close + slippage_close)
        const numerator = entryPrice.safeMul(SafeDecimal.one().safeSub(feeOpen).safeSub(slippageOpen)).safeSub(requiredReward);
        const denominator = SafeDecimal.one().safeAdd(feeClose).safeAdd(slippageClose);
        return numerator.safeDiv(denominator);
      }
      
    case 'PIPS':
      if (!takeProfitPips) {
        throw new ValidationError('Take profit pips is required for PIPS mode');
      }
      if (!tickSize) {
        throw new ValidationError('Tick size is required for PIPS mode');
      }
      
      const pipsDistance = SafeDecimal.from(takeProfitPips).safeMul(tickSize);
      
      if (side === 'LONG') {
        return entryPrice.safeAdd(pipsDistance);
      } else {
        return entryPrice.safeSub(pipsDistance);
      }
      
    default:
      throw new ValidationError(`Unsupported take profit mode: ${takeProfitMode}`);
  }
}

/**
 * Calculate risk per unit (BTC) including fees and slippage
 * @param entryPrice Entry price
 * @param stopPrice Stop price
 * @param feeOpen Opening fee rate (maker/taker will be determined by orderType)
 * @param feeClose Closing fee rate (maker/taker will be determined by orderType)
 * @param slippageOpen Opening slippage rate
 * @param slippageClose Closing slippage rate
 * @param includeFees Whether to include fees in risk calculation
 * @param side Trading side
 * @returns Risk per unit
 */
export function calculateRiskPerUnit(
  entryPrice: SafeDecimal,
  stopPrice: SafeDecimal,
  feeOpen: SafeDecimal,
  feeClose: SafeDecimal,
  slippageOpen: SafeDecimal,
  slippageClose: SafeDecimal,
  includeFees: boolean,
  side: Side
): SafeDecimal {
  // Basic price difference risk
  const priceRisk = side === 'LONG' 
    ? entryPrice.safeSub(stopPrice)
    : stopPrice.safeSub(entryPrice);
  
  if (priceRisk.isNegative() || priceRisk.isZero()) {
    throw new ValidationError(`Invalid stop price: creates ${priceRisk} risk per unit`);
  }
  
  if (!includeFees) {
    return priceRisk;
  }
  
  // Calculate fees and slippage per unit:
  // - Opening fee per unit = entry price × fee rate
  // - Opening slippage per unit = entry price × opening slippage rate
  // - Closing fee per unit = stop price × close fee rate  
  // - Closing slippage per unit = stop price × closing slippage rate
  const entryFeePerUnit = entryPrice.safeMul(feeOpen);
  const entrySlippagePerUnit = entryPrice.safeMul(slippageOpen);
  const exitFeePerUnit = stopPrice.safeMul(feeClose);
  const exitSlippagePerUnit = stopPrice.safeMul(slippageClose);
  
  // Total risk per unit = price difference + entry fee + entry slippage + exit fee + exit slippage
  return priceRisk.safeAdd(entryFeePerUnit).safeAdd(entrySlippagePerUnit).safeAdd(exitFeePerUnit).safeAdd(exitSlippagePerUnit);
}

/**
 * Calculate position size based on fixed risk
 * @param riskAmount Total risk amount (USDT)
 * @param riskPerUnit Risk per unit (BTC)
 * @returns Raw position size
 */
export function calculatePositionSize(
  riskAmount: SafeDecimal,
  riskPerUnit: SafeDecimal
): SafeDecimal {
  if (riskPerUnit.isZero() || riskPerUnit.isNegative()) {
    throw new ValidationError(`Invalid risk per unit: ${riskPerUnit}`);
  }
  
  return riskAmount.safeDiv(riskPerUnit);
}

/**
 * Calculate liquidation price (simplified)
 * @param entryPrice Entry price
 * @param leverage Leverage
 * @param mmr Maintenance margin rate
 * @param side Trading side
 * @returns Estimated liquidation price
 */
export function calculateLiquidationPrice(
  entryPrice: SafeDecimal,
  leverage: SafeDecimal,
  mmr: SafeDecimal,
  side: Side
): SafeDecimal {
  // Simplified formula: P_liq = P_e × (1 ± (1/L - mmr))
  // For LONG: P_liq = P_e × (1 - (1/L - mmr))
  // For SHORT: P_liq = P_e × (1 + (1/L - mmr))
  
  const leverageReciprocal = SafeDecimal.one().safeDiv(leverage);
  const factor = leverageReciprocal.safeSub(mmr);
  
  if (side === 'LONG') {
    return entryPrice.safeMul(SafeDecimal.one().safeSub(factor));
  } else {
    return entryPrice.safeMul(SafeDecimal.one().safeAdd(factor));
  }
}

/**
 * Calculate target prices for different Risk/Reward ratios including fees and slippage
 * @param entryPrice Entry price
 * @param stopPrice Stop price  
 * @param ratios Array of R:R ratios to calculate
 * @param side Trading side
 * @param feeOpen Opening fee rate
 * @param feeClose Closing fee rate
 * @param slippage Slippage rate
 * @param includeFees Whether to include fees in calculation
 * @param totalStopRisk Total stop loss risk (already calculated, including position size)
 * @param positionSize Position size for per-unit calculations
 * @param tickSize Tick size for price formatting
 * @returns Array of target prices
 */
export function calculateTargets(
  entryPrice: SafeDecimal,
  stopPrice: SafeDecimal,
  ratios: number[],
  side: Side,
  feeOpen: SafeDecimal,
  feeClose: SafeDecimal,
  slippageOpen: SafeDecimal,
  slippageClose: SafeDecimal,
  includeFees: boolean,
  totalStopRisk: SafeDecimal,
  positionSize: SafeDecimal,
  tickSize?: SafeDecimal
): Array<{ rr: number; price: string; priceFormatted: string; isBreakeven?: boolean }> {
  // Use the already calculated total stop risk instead of recalculating
  // Convert back to per-unit risk for price calculations
  const totalRiskPerUnit = totalStopRisk.safeDiv(positionSize);
  
  const targets: Array<{ rr: number; price: string; priceFormatted: string; isBreakeven?: boolean }> = [];
  
  // Add breakeven target (0 net profit) as first target when fees/slippage are included
  // Breakeven means: price profit exactly covers all trading costs (fees + slippage), net P&L = 0
  if (includeFees && (!feeOpen.isZero() || !feeClose.isZero() || !slippageOpen.isZero() || !slippageClose.isZero())) {
    let breakevenPrice: SafeDecimal;
    
    if (side === 'LONG') {
      // For LONG: breakeven where price gain covers all costs
      // Net P&L = 0: (breakeven_price - entry) = entry*fee_open + entry*slippage_open + breakeven_price*fee_close + breakeven_price*slippage_close
      // Rearranging: breakeven_price - entry = entry*(fee_open + slippage_open) + breakeven_price*(fee_close + slippage_close)
      // breakeven_price * (1 - fee_close - slippage_close) = entry + entry*(fee_open + slippage_open)
      // breakeven_price = entry * (1 + fee_open + slippage_open) / (1 - fee_close - slippage_close)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeAdd(feeOpen).safeAdd(slippageOpen));
      const denominator = SafeDecimal.one().safeSub(feeClose).safeSub(slippageClose);
      breakevenPrice = numerator.safeDiv(denominator);
    } else {
      // For SHORT: breakeven where price gain covers all costs
      // Net P&L = 0: (entry - breakeven_price) = entry*fee_open + entry*slippage_open + breakeven_price*fee_close + breakeven_price*slippage_close
      // Rearranging: entry - breakeven_price = entry*(fee_open + slippage_open) + breakeven_price*(fee_close + slippage_close)
      // breakeven_price * (1 + fee_close + slippage_close) = entry - entry*(fee_open + slippage_open)
      // breakeven_price = entry * (1 - fee_open - slippage_open) / (1 + fee_close + slippage_close)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeSub(feeOpen).safeSub(slippageOpen));
      const denominator = SafeDecimal.one().safeAdd(feeClose).safeAdd(slippageClose);
      breakevenPrice = numerator.safeDiv(denominator);
    }
    
    targets.push({
      rr: 0,
      price: breakevenPrice.toString(),
      priceFormatted: formatPriceByTickSize(breakevenPrice, tickSize),
      isBreakeven: true
    });
  }
  
  // Add regular R:R targets
  targets.push(...ratios.map(ratio => {
    // Calculate required reward distance to achieve the R:R ratio
    // Use the total stop risk from the position calculation
    const requiredReward = totalStopRisk.safeMul(ratio).safeDiv(positionSize); // Convert back to per-unit for price calculation
    
    if (!includeFees) {
      // Simple calculation without fees
      const targetPrice = side === 'LONG'
        ? entryPrice.safeAdd(requiredReward)
        : entryPrice.safeSub(requiredReward);
      
      return {
        rr: ratio,
        price: targetPrice.toString(),
        priceFormatted: formatPriceByTickSize(targetPrice, tickSize)
      };
    }
    
    // Calculate target price accounting for all fees and slippage
    // For the target, we need: net_profit = required_reward (which is R:R × totalRisk)
    // net_profit = price_diff - open_fee - open_slippage - close_fee - close_slippage
    // So we need to solve for target_price where net_profit = required_reward
    
    let targetPrice: SafeDecimal;
    if (side === 'LONG') {
      // For LONG: net_profit = (target_price - entry_price) - entry_price*fee_open - entry_price*slippage_open - target_price*fee_close - target_price*slippage_close
      // Required equation: (target_price - entry_price) - entry_price*(fee_open + slippage_open) - target_price*(fee_close + slippage_close) = required_reward
      // Rearranging: target_price * (1 - fee_close - slippage_close) = entry_price + required_reward + entry_price*(fee_open + slippage_open)
      // target_price = (entry_price * (1 + fee_open + slippage_open) + required_reward) / (1 - fee_close - slippage_close)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeAdd(feeOpen).safeAdd(slippageOpen)).safeAdd(requiredReward);
      const denominator = SafeDecimal.one().safeSub(feeClose).safeSub(slippageClose);
      targetPrice = numerator.safeDiv(denominator);
    } else {
      // For SHORT: net_profit = (entry_price - target_price) - entry_price*fee_open - entry_price*slippage_open - target_price*fee_close - target_price*slippage_close
      // Required equation: (entry_price - target_price) - entry_price*(fee_open + slippage_open) - target_price*(fee_close + slippage_close) = required_reward
      // Rearranging: target_price * (1 + fee_close + slippage_close) = entry_price - required_reward - entry_price*(fee_open + slippage_open)
      // target_price = (entry_price * (1 - fee_open - slippage_open) - required_reward) / (1 + fee_close + slippage_close)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeSub(feeOpen).safeSub(slippageOpen)).safeSub(requiredReward);
      const denominator = SafeDecimal.one().safeAdd(feeClose).safeAdd(slippageClose);
      targetPrice = numerator.safeDiv(denominator);
    }
    
    return {
      rr: ratio,
      price: targetPrice.toString(),
      priceFormatted: formatPriceByTickSize(targetPrice, tickSize)
    };
  }));
  
  return targets;
}

/**
 * Suggest optimal leverage based on account equity and risk preferences
 * @param notional Notional value
 * @param accountEquity Account equity
 * @param maxEquityUsage Maximum equity usage ratio (default 0.8)
 * @param maxLeverage Maximum allowed leverage
 * @returns Suggested leverage
 */
export function suggestLeverage(
  notional: SafeDecimal,
  accountEquity: SafeDecimal,
  maxEquityUsage: SafeDecimal = SafeDecimal.from(0.8),
  maxLeverage: number = 100
): SafeDecimal {
  const maxMargin = accountEquity.safeMul(maxEquityUsage);
  const requiredLeverage = notional.safeDiv(maxMargin);
  
  const maxLeverageDecimal = SafeDecimal.from(maxLeverage);
  
  // Return the minimum of required leverage and max leverage
  return requiredLeverage.lte(maxLeverageDecimal) 
    ? new SafeDecimal(requiredLeverage.ceil())
    : maxLeverageDecimal;
}

/**
 * Calculate risk amount based on mode
 * @param riskMode Risk calculation mode
 * @param riskUSDT Fixed USDT risk amount
 * @param accountEquity Account equity
 * @param riskPercent Risk percentage
 * @returns Risk amount in USDT
 */
function calculateRiskAmount(
  riskMode: RiskMode,
  riskUSDT?: string,
  accountEquity?: string,
  riskPercent?: string
): SafeDecimal {
  if (riskMode === 'FIXED_USDT') {
    if (!riskUSDT) {
      throw new ValidationError('Risk amount in USDT is required for fixed USDT mode');
    }
    return SafeDecimal.from(riskUSDT);
  } else {
    if (!accountEquity || !riskPercent) {
      throw new ValidationError('Account equity and risk percentage are required for percentage mode');
    }
    const equity = SafeDecimal.from(accountEquity);
    const percent = SafeDecimal.from(riskPercent).safeDiv(100); // Convert percentage to decimal
    return equity.safeMul(percent);
  }
}

/**
 * Main calculation function
 * @param input Calculation input parameters
 * @returns Calculation result
 */
export function calculatePosition(input: CalcInput): CalcResult {
  const {
    side,
    entryPrice: entryPriceStr,
    stopPrice: stopPriceStr,
    atr: atrStr,
    atrMultiplier: atrMultiplierStr,
    stopPips: stopPipsStr,
    stopMode,
    // Take profit settings
    useTakeProfit,
    takeProfitMode,
    takeProfitPrice,
    takeProfitATRMultiplier,
    takeProfitRRRatio,
    takeProfitPips,
    riskMode,
    riskUSDT: riskUSDTStr,
    accountEquity: accountEquityStr,
    riskPercent: riskPercentStr,
    includeFees,
    // Maker/Taker fees
    feeOpenMaker: feeOpenMakerStr,
    feeOpenTaker: feeOpenTakerStr,
    feeCloseMaker: feeCloseMakerStr,
    feeCloseTaker: feeCloseTakerStr,
    slippageOpen: slippageOpenStr,
    slippageClose: slippageCloseStr,
    // Backward compatibility (keep for existing integrations)
    feeOpen: feeOpenStr,
    feeClose: feeCloseStr,
    slippage: slippageStr,
    leverage,
    contractMode,
    marketMeta,
    orderType,
    feeType
  } = input;

  const warnings: string[] = [];
  const warningKeys: WarningKey[] = [];
  
  try {
    // Convert inputs to SafeDecimal
    const entryPrice = SafeDecimal.from(entryPriceStr);
    const riskAmount = calculateRiskAmount(riskMode, riskUSDTStr, accountEquityStr, riskPercentStr);
    
    // Determine which fees to use based on order type and manual selection
    const useOrderType = orderType || 'MARKET';
    const useFeeType = useOrderType === 'MARKET' ? 'TAKER' : (feeType || 'MAKER');
    
    // Handle different fee combinations for opening, stop loss, and take profit
    let openFeeType: 'MAKER' | 'TAKER';
    let stopLossFeeType: 'MAKER' | 'TAKER';
    let takeProfitFeeType: 'MAKER' | 'TAKER';
    
    if (useFeeType === 'MAKER_OPEN_TAKER_CLOSE') {
      openFeeType = 'MAKER';
      stopLossFeeType = 'TAKER';
      takeProfitFeeType = 'MAKER'; // Take profit should have no slippage in this mode
    } else if (useFeeType === 'MAKER_OPEN_ONLY') {
      openFeeType = 'MAKER';
      stopLossFeeType = 'TAKER';
      takeProfitFeeType = 'TAKER';
    } else {
      openFeeType = useFeeType === 'MAKER' ? 'MAKER' : 'TAKER';
      stopLossFeeType = useFeeType === 'MAKER' ? 'MAKER' : 'TAKER';
      takeProfitFeeType = useFeeType === 'MAKER' ? 'MAKER' : 'TAKER';
    }
    
    // For calculations, we still need a single close fee for stop loss calculations
    const closeFeeType = stopLossFeeType;
    
    const feeOpen = openFeeType === 'MAKER'
      ? SafeDecimal.from(feeOpenMakerStr || '0.0002') 
      : SafeDecimal.from(feeOpenTakerStr || '0.0006');
    const feeClose = closeFeeType === 'MAKER'
      ? SafeDecimal.from(feeCloseMakerStr || '0.0002') 
      : SafeDecimal.from(feeCloseTakerStr || '0.0006');
    
    // Set slippage: Maker orders have no slippage, Taker orders have slippage
    const slippageOpen = openFeeType === 'MAKER' 
      ? SafeDecimal.from('0') 
      : SafeDecimal.from(slippageOpenStr || '0.0005');
    const slippageClose = closeFeeType === 'MAKER' 
      ? SafeDecimal.from('0') 
      : SafeDecimal.from(slippageCloseStr || '0.0005');
    
    const tickSize = SafeDecimal.from(marketMeta.tickSize);
    const stepSize = SafeDecimal.from(marketMeta.stepSize);
    const minQty = SafeDecimal.from(marketMeta.minQty);
    const minNotional = SafeDecimal.from(marketMeta.minNotional);
    const mmr = SafeDecimal.from(marketMeta.mmr);
    
    // Calculate stop price
    let stopPrice: SafeDecimal;
    if (stopMode === 'ATR') {
      if (!atrStr || !atrMultiplierStr) {
        throw new ValidationError('ATR and multiplier are required for ATR stop mode');
      }
      const atr = SafeDecimal.from(atrStr);
      const atrMultiplier = SafeDecimal.from(atrMultiplierStr);
      stopPrice = calculateATRStopPrice(entryPrice, atr, atrMultiplier, side);
    } else if (stopMode === 'PIPS') {
      if (!stopPipsStr) {
        throw new ValidationError('Stop pips is required for PIPS stop mode');
      }
      const stopPips = SafeDecimal.from(stopPipsStr);
      stopPrice = calculatePipsStopPrice(entryPrice, stopPips, tickSize, side);
    } else {
      if (!stopPriceStr) {
        throw new ValidationError('Stop price is required for price stop mode');
      }
      stopPrice = SafeDecimal.from(stopPriceStr);
    }
    
    // Round stop price to tick size
    stopPrice = roundToTick(stopPrice, tickSize);
    
    // Validate stop price direction
    if (side === 'LONG' && stopPrice.gte(entryPrice)) {
      throw new ValidationError('Stop price must be below entry price for LONG positions');
    }
    if (side === 'SHORT' && stopPrice.lte(entryPrice)) {
      throw new ValidationError('Stop price must be above entry price for SHORT positions');
    }
    
    // Calculate take profit price if enabled
    let takeProfitPriceCalculated: SafeDecimal | undefined;
    let takeProfitRR: number | undefined;
    
    if (useTakeProfit && takeProfitMode && takeProfitMode !== 'RR_RATIO') {
      try {
        const atr = atrStr ? SafeDecimal.from(atrStr) : undefined;
        takeProfitPriceCalculated = calculateTakeProfitPrice(
          entryPrice,
          takeProfitMode,
          side,
          takeProfitPrice,
          atr,
          takeProfitATRMultiplier,
          undefined, // rrRatio - not used for non-RR modes
          undefined, // totalStopRisk - not used for non-RR modes
          undefined, // positionSize - not used for non-RR modes
          undefined, // feeOpen - not used for non-RR modes
          undefined, // feeClose - not used for non-RR modes
          undefined, // slippageOpen - not used for non-RR modes
          undefined, // slippageClose - not used for non-RR modes
          undefined, // includeFees - not used for non-RR modes
          takeProfitPips,
          tickSize
        );
        
        // Round take profit price to tick size
        takeProfitPriceCalculated = roundToTick(takeProfitPriceCalculated, tickSize);
        
        // Validate take profit direction
        if (side === 'LONG' && takeProfitPriceCalculated.lte(entryPrice)) {
          throw new ValidationError('Take profit price must be above entry price for LONG positions');
        }
        if (side === 'SHORT' && takeProfitPriceCalculated.gte(entryPrice)) {
          throw new ValidationError('Take profit price must be below entry price for SHORT positions');
        }
        
      } catch (error) {
        // If take profit calculation fails, add warning but continue
        warnings.push(`Take profit calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        takeProfitPriceCalculated = undefined;
      }
    }
    
    // Calculate risk per unit
    const riskPerUnit = calculateRiskPerUnit(
      entryPrice,
      stopPrice,
      feeOpen,
      feeClose,
      slippageOpen,
      slippageClose,
      includeFees,
      side
    );
    
    // Calculate raw position size
    const qtyRaw = calculatePositionSize(riskAmount, riskPerUnit);
    
    // Round position size to step size
    const qtyRounded = roundDownToStep(qtyRaw, stepSize);
    
    // Validate minimum requirements
    const validation = validateMinRequirements(qtyRounded, entryPrice, minQty, minNotional);
    if (!validation.valid) {
      warnings.push(`❌ EXCHANGE RULE: ${validation.reason!}`);
      warningKeys.push('warningExchangeRule');
    }
    
    // Risk-to-stop distance analysis
    const stopDistancePercent = side === 'LONG'
      ? entryPrice.safeSub(stopPrice).safeDiv(entryPrice).safeMul(100)
      : stopPrice.safeSub(entryPrice).safeDiv(entryPrice).safeMul(100);
    
    if (stopDistancePercent.lt(0.5)) {
      warnings.push('🎯 TIGHT STOP: Stop distance <0.5% - high chance of premature stop-out');
      warningKeys.push('warningTightStop');
    } else if (stopDistancePercent.gt(10)) {
      warnings.push('📏 WIDE STOP: Stop distance >10% - consider reducing risk amount');
      warningKeys.push('warningWideStop');
    }
    
    // Position size warnings
    if (riskMode === 'ACCOUNT_PERCENT') {
      const riskPercent = SafeDecimal.from(riskPercentStr!);
      if (riskPercent.gt(5)) {
        warnings.push('🚨 HIGH RISK %: Risking >5% of account on single trade');
        warningKeys.push('warningHighRiskPercent');
      } else if (riskPercent.gt(2)) {
        warnings.push('⚡ ELEVATED RISK %: Risking >2% of account on single trade');
        warningKeys.push('warningElevatedRiskPercent');
      }
    }
    
    // Calculate notional value
    const notional = qtyRounded.safeMul(entryPrice);
    
    // Calculate fees if included
    let openFee: SafeDecimal | undefined;
    let closeFee: SafeDecimal | undefined; 
    let totalFees: SafeDecimal | undefined;
    
    if (includeFees) {
      // Opening fee = position size × entry price × fee rate
      openFee = qtyRounded.safeMul(entryPrice).safeMul(feeOpen);
      // Closing fee = position size × stop price × fee rate
      closeFee = qtyRounded.safeMul(stopPrice).safeMul(feeClose);
      totalFees = openFee.safeAdd(closeFee);
    }
    
    // Calculate take profit risk/reward ratio and profit if enabled
    let takeProfitProfit: SafeDecimal | undefined;
    let profitBreakdown: any = undefined;
    
    // Take profit profit calculation will be done after RR_RATIO calculation

    // NOTE: targets calculation moved to after stopLossRisk calculation
    
    let initialMargin: SafeDecimal | undefined;
    let liquidationPrice: SafeDecimal | undefined;
    
    // Contract-specific calculations
    if (contractMode !== 'SPOT') {
      if (leverage) {
        const leverageDecimal = SafeDecimal.from(leverage);
        initialMargin = notional.safeDiv(leverageDecimal);
        liquidationPrice = calculateLiquidationPrice(entryPrice, leverageDecimal, mmr, side);
        
        // Advanced liquidation risk analysis
        // For LONG: stop should be above liquidation price
        // For SHORT: stop should be below liquidation price
        let isCritical = false;
        let distancePercent = SafeDecimal.from('0');
        
        if (side === 'LONG') {
          // For LONG: critical if stop price <= liquidation price
          isCritical = stopPrice.lte(liquidationPrice);
          if (!isCritical) {
            // Distance from liquidation to stop (positive means safe)
            const distance = stopPrice.safeSub(liquidationPrice);
            distancePercent = distance.safeDiv(entryPrice).safeMul(100);
          }
        } else {
          // For SHORT: critical if stop price >= liquidation price  
          isCritical = stopPrice.gte(liquidationPrice);
          if (!isCritical) {
            // Distance from stop to liquidation (positive means safe)
            const distance = liquidationPrice.safeSub(stopPrice);
            distancePercent = distance.safeDiv(entryPrice).safeMul(100);
          }
        }
        
        if (isCritical) {
          warnings.push('⚠️ CRITICAL: Stop price is beyond liquidation price - position will be liquidated before stop trigger');
          warningKeys.push('warningCriticalLiquidation');
        } else if (distancePercent.lt(1)) {
          warnings.push('🚨 HIGH RISK: Liquidation price is within 1% of stop price');
          warningKeys.push('warningHighRiskLiquidation');
        } else if (distancePercent.lt(2)) {
          warnings.push('⚡ MODERATE RISK: Liquidation price is within 2% of stop price');
          warningKeys.push('warningModerateRiskLiquidation');
        }
        
        // Leverage warnings
        if (leverage > 50) {
          warnings.push('🎯 EXTREME LEVERAGE: Consider reducing leverage for better risk management');
          warningKeys.push('warningExtremeLeverage');
        } else if (leverage > 20) {
          warnings.push('📈 HIGH LEVERAGE: Monitor position closely for rapid price movements');
          warningKeys.push('warningHighLeverage');
        }
        
        // Margin utilization check
        if (accountEquityStr) {
          const accountEquity = SafeDecimal.from(accountEquityStr);
          const marginRatio = initialMargin.safeDiv(accountEquity).safeMul(100);
          
          if (marginRatio.gt(80)) {
            warnings.push('💰 HIGH MARGIN USAGE: Using >80% of account equity as margin');
            warningKeys.push('warningHighMarginUsage');
          } else if (marginRatio.gt(50)) {
            warnings.push('📊 MODERATE MARGIN USAGE: Using >50% of account equity as margin');
            warningKeys.push('warningModerateMarginUsage');
          }
        }
      } else {
        warnings.push('Leverage not specified for contract trading');
        warningKeys.push('warningLeverageNotSpecified');
      }
    }
    
    // Calculate stop loss risk based on actual position size
    // Formula: 数量 × 点差 + 数量 × 开仓价格 × 开仓手续费率 + 数量 × 平仓价格 × 平仓手续费率
    const priceRiskPerUnit = side === 'LONG' 
      ? entryPrice.safeSub(stopPrice)
      : stopPrice.safeSub(entryPrice);
    
    const priceRiskTotal = qtyRounded.safeMul(priceRiskPerUnit); // 数量 × 点差
    let stopLossRisk = priceRiskTotal;
    
    // Calculate detailed breakdown
    let openFeeAmount = SafeDecimal.from('0');
    let closeFeeAmount = SafeDecimal.from('0');
    let openSlippageAmount = SafeDecimal.from('0');
    let closeSlippageAmount = SafeDecimal.from('0');
    
    if (includeFees) {
      // 数量 × 开仓价格 × 开仓手续费率
      openFeeAmount = qtyRounded.safeMul(entryPrice).safeMul(feeOpen);
      // 数量 × 平仓价格 × 平仓手续费率
      closeFeeAmount = qtyRounded.safeMul(stopPrice).safeMul(feeClose);
      // 开仓滑点成本
      openSlippageAmount = qtyRounded.safeMul(entryPrice).safeMul(slippageOpen);
      // 止损平仓滑点成本
      closeSlippageAmount = qtyRounded.safeMul(stopPrice).safeMul(slippageClose);
      
      stopLossRisk = stopLossRisk.safeAdd(openFeeAmount).safeAdd(closeFeeAmount).safeAdd(openSlippageAmount).safeAdd(closeSlippageAmount);
    }
    
    // 用于验证的计算 - 显示实际计算出的风险
    const calculatedRisk = stopLossRisk;
    
    // Create detailed risk breakdown
    const riskBreakdown = {
      priceRisk: priceRiskTotal.toString(),
      priceRiskFormatted: priceRiskTotal.toLocaleString(),
      openFeeAmount: openFeeAmount.toString(),
      openFeeAmountFormatted: openFeeAmount.toLocaleString(),
      closeFeeAmount: closeFeeAmount.toString(),
      closeFeeAmountFormatted: closeFeeAmount.toLocaleString(),
      ...(((slippageOpen && !slippageOpen.isZero()) || (slippageClose && !slippageClose.isZero())) ? {
        slippageAmount: openSlippageAmount.safeAdd(closeSlippageAmount).toString(),
        slippageAmountFormatted: openSlippageAmount.safeAdd(closeSlippageAmount).toLocaleString(),
      } : {})
    };
    
    // Calculate RR_RATIO take profit price now that we have stopLossRisk
    if (useTakeProfit && takeProfitMode === 'RR_RATIO' && !takeProfitPriceCalculated) {
      try {
        // For RR_RATIO take profit, use appropriate fee and slippage for take profit
        const takeProfitCloseSlippage = takeProfitFeeType === 'MAKER' ? SafeDecimal.from('0') : slippageClose;
        const takeProfitCloseFee = takeProfitFeeType === 'MAKER'
          ? SafeDecimal.from(feeCloseMakerStr || '0.0002')
          : SafeDecimal.from(feeCloseTakerStr || '0.0006');
          
        takeProfitPriceCalculated = calculateTakeProfitPrice(
          entryPrice,
          takeProfitMode,
          side,
          takeProfitPrice,
          undefined, // atr not needed for RR_RATIO
          undefined, // atrMultiplier not needed for RR_RATIO
          takeProfitRRRatio,
          stopLossRisk,
          qtyRounded,
          feeOpen,
          takeProfitCloseFee, // Use take profit specific fee
          slippageOpen,
          takeProfitCloseSlippage, // Use take profit specific slippage
          includeFees
        );
        
        // Round take profit price to tick size
        takeProfitPriceCalculated = roundToTick(takeProfitPriceCalculated, tickSize);
        
        // Validate take profit direction
        if (side === 'LONG' && takeProfitPriceCalculated.lte(entryPrice)) {
          throw new ValidationError('Take profit price must be above entry price for LONG positions');
        }
        if (side === 'SHORT' && takeProfitPriceCalculated.gte(entryPrice)) {
          throw new ValidationError('Take profit price must be below entry price for SHORT positions');
        }
        
      } catch (error) {
        // If take profit calculation fails, add warning but continue
        warnings.push(`RR Ratio take profit calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        takeProfitPriceCalculated = undefined;
      }
    }

    // Calculate take profit profit now that we have both stopLossRisk and takeProfitPriceCalculated
    if (takeProfitPriceCalculated) {
      // Calculate profit components in detail
      const takeProfitPriceDistancePerUnit = side === 'LONG'
        ? takeProfitPriceCalculated.safeSub(entryPrice)
        : entryPrice.safeSub(takeProfitPriceCalculated);
      
      // 数量 × 价格差 (盈利部分)
      const priceProfitTotal = qtyRounded.safeMul(takeProfitPriceDistancePerUnit);
      
      // 开仓手续费 (成本，负数)
      const profitOpenFeeAmount = includeFees ? SafeDecimal.from('0').safeSub(qtyRounded.safeMul(entryPrice).safeMul(feeOpen)) : SafeDecimal.from('0');
      
      // 止盈平仓手续费 (成本，负数) - 使用止盈费率类型
      const takeProfitFee = takeProfitFeeType === 'MAKER'
        ? SafeDecimal.from(feeCloseMakerStr || '0.0002')
        : SafeDecimal.from(feeCloseTakerStr || '0.0006');
      const profitCloseFeeAmount = includeFees ? SafeDecimal.from('0').safeSub(qtyRounded.safeMul(takeProfitPriceCalculated).safeMul(takeProfitFee)) : SafeDecimal.from('0');
      
      // 开仓滑点成本 (成本，负数)
      const profitOpenSlippageAmount = includeFees && slippageOpen && !slippageOpen.isZero() ? SafeDecimal.from('0').safeSub(qtyRounded.safeMul(entryPrice).safeMul(slippageOpen)) : SafeDecimal.from('0');
      
      // 止盈滑点成本 (成本，负数) - 止盈时的滑点成本根据费率类型决定
      const takeProfitSlippage = takeProfitFeeType === 'MAKER' ? SafeDecimal.from('0') : (slippageClose || SafeDecimal.from('0.0005'));
      const profitCloseSlippageAmount = includeFees && takeProfitSlippage && !takeProfitSlippage.isZero() ? SafeDecimal.from('0').safeSub(qtyRounded.safeMul(takeProfitPriceCalculated).safeMul(takeProfitSlippage)) : SafeDecimal.from('0');
      
      // 总盈利 = 价格盈利 - 各种成本
      takeProfitProfit = priceProfitTotal.safeAdd(profitOpenFeeAmount).safeAdd(profitCloseFeeAmount).safeAdd(profitOpenSlippageAmount).safeAdd(profitCloseSlippageAmount);
      
      // Create detailed profit breakdown
      profitBreakdown = {
        priceProfit: priceProfitTotal.toString(),
        priceProfitFormatted: priceProfitTotal.toLocaleString(),
        openFeeAmount: profitOpenFeeAmount.toString(),
        openFeeAmountFormatted: profitOpenFeeAmount.toLocaleString(),
        closeFeeAmount: profitCloseFeeAmount.toString(),
        closeFeeAmountFormatted: profitCloseFeeAmount.toLocaleString(),
        ...(includeFees && ((slippageOpen && !slippageOpen.isZero()) || (slippageClose && !slippageClose.isZero())) ? {
          slippageAmount: profitOpenSlippageAmount.safeAdd(profitCloseSlippageAmount).toString(),
          slippageAmountFormatted: profitOpenSlippageAmount.safeAdd(profitCloseSlippageAmount).toLocaleString(),
        } : {})
      };
    }

    // Calculate take profit fees for targets (R:R ratios)
    const takeProfitTargetFee = takeProfitFeeType === 'MAKER'
      ? SafeDecimal.from(feeCloseMakerStr || '0.0002')
      : SafeDecimal.from(feeCloseTakerStr || '0.0006');
    const takeProfitTargetSlippage = takeProfitFeeType === 'MAKER' ? SafeDecimal.from('0') : slippageClose;

    // Calculate targets using the calculated stop loss risk
    const targets = calculateTargets(
      entryPrice, 
      stopPrice, 
      input.rrRatios, 
      side, 
      feeOpen, 
      takeProfitTargetFee, // Use take profit specific fee
      slippageOpen,
      takeProfitTargetSlippage, // Use take profit specific slippage
      includeFees, 
      stopLossRisk, 
      qtyRounded, 
      tickSize
    );
    
    // Calculate correct risk/reward ratio: 预期盈利 / 止损风险
    if (takeProfitProfit && !stopLossRisk.isZero()) {
      takeProfitRR = parseFloat(takeProfitProfit.safeDiv(stopLossRisk).toString());
    }
    
    // Generate order summary
    const orderSummary = generateOrderSummary({
      side,
      qtyRounded,
      entryPrice,
      stopPrice,
      notional,
      initialMargin,
      liquidationPrice,
      leverage,
      marketMeta,
      contractMode,
      warnings,
      targets,
      totalFees,
      openFee,
      closeFee,
      includeFees,
      orderType: useOrderType,
      feeType: useFeeType,
      feeRates: {
        openMaker: feeOpenMakerStr,
        openTaker: feeOpenTakerStr,
        closeMaker: feeCloseMakerStr,
        closeTaker: feeCloseTakerStr,
        slippageOpen: slippageOpenStr,
        slippageClose: slippageCloseStr
      }
    });
    
    return {
      qtyRaw: qtyRaw.toString(),
      qtyRounded: qtyRounded.toString(),
      notional: notional.toString(),
      initialMargin: initialMargin?.toString(),
      entryPrice: entryPrice.toString(), // Store the locked entry price used in calculation
      stopPrice: stopPrice.toString(),
      liquidationPrice: liquidationPrice?.toString(),
      // Take profit result
      takeProfitPrice: takeProfitPriceCalculated?.toString(),
      takeProfitPriceFormatted: takeProfitPriceCalculated ? formatPriceByTickSize(takeProfitPriceCalculated, tickSize) : undefined,
      takeProfitRR,
      takeProfitProfit: takeProfitProfit?.toString(),
      takeProfitProfitFormatted: takeProfitProfit?.toLocaleString(),
      profitBreakdown,
      // Stop loss risk
      stopLossRisk: stopLossRisk.toString(),
      stopLossRiskFormatted: stopLossRisk.toLocaleString(),
      actualRiskAmount: calculatedRisk.toString(),
      actualRiskAmountFormatted: calculatedRisk.toLocaleString(),
      riskBreakdown,
      targets,
      warnings,
      warningKeys,
      orderSummary,
      totalFees: totalFees?.toString(),
      openFee: openFee?.toString(),
      closeFee: closeFee?.toString(),
      includeFees,
      // Formatted values based on market metadata
      qtyRoundedFormatted: formatQuantityByStepSize(qtyRounded, stepSize),
      stopPriceFormatted: formatPriceByTickSize(stopPrice, tickSize),
      liquidationPriceFormatted: liquidationPrice ? formatPriceByTickSize(liquidationPrice, tickSize) : undefined
    };
    
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DecimalError) {
      throw error;
    }
    throw new ValidationError(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateOrderSummary(params: {
  side: Side;
  qtyRounded: SafeDecimal;
  entryPrice: SafeDecimal;
  stopPrice: SafeDecimal;
  notional: SafeDecimal;
  initialMargin?: SafeDecimal;
  liquidationPrice?: SafeDecimal;
  leverage?: number;
  marketMeta: any;
  contractMode: ContractMode;
  warnings: string[];
  targets: Array<{ rr: number; price: string; isBreakeven?: boolean }>;
  totalFees?: SafeDecimal;
  openFee?: SafeDecimal;
  closeFee?: SafeDecimal;
  includeFees: boolean;
  orderType?: OrderType;
  feeType?: 'MAKER' | 'TAKER' | 'MAKER_OPEN_TAKER_CLOSE' | 'MAKER_OPEN_ONLY';
  feeRates?: {
    openMaker: string;
    openTaker: string;
    closeMaker: string;
    closeTaker: string;
    slippageOpen: string;
    slippageClose: string;
  };
}): string {
  const {
    side,
    qtyRounded,
    entryPrice,
    stopPrice,
    notional,
    initialMargin,
    liquidationPrice,
    leverage,
    marketMeta,
    contractMode,
    warnings,
    targets,
    totalFees,
    openFee,
    closeFee,
    includeFees,
    orderType,
    feeType,
    feeRates
  } = params;
  
  let summary = `${side} ${marketMeta.symbol}\n`;
  summary += `Entry: ${entryPrice} | Stop: ${stopPrice}\n`;
  summary += `Qty: ${qtyRounded} | Notional: ${notional} USDT\n`;
  
  // Add order type and fee type information
  if (orderType) {
    const orderTypeText = orderType === 'MARKET' ? '市价单' : '限价单';
    summary += `Order Type: ${orderTypeText}`;
    
    if (orderType === 'LIMIT' && feeType) {
      const feeTypeMap = {
        'MAKER': ' (全部Maker)',
        'TAKER': ' (全部Taker)',
        'MAKER_OPEN_TAKER_CLOSE': ' (开仓Maker,止损Taker)',
        'MAKER_OPEN_ONLY': ' (仅开仓Maker)'
      };
      summary += feeTypeMap[feeType] || '';
    }
    summary += '\n';
    
    // Add detailed fee rate information for limit orders
    if (orderType === 'LIMIT' && feeType && feeRates) {
      const formatFeeRate = (rate: string) => (parseFloat(rate) * 100).toFixed(3) + '%';
      
      summary += `Fee Rates:\n`;
      
      if (feeType === 'MAKER') {
        summary += `  Opening: ${formatFeeRate(feeRates.openMaker)} (Maker)\n`;
        summary += `  Stop Loss: ${formatFeeRate(feeRates.closeMaker)} (Maker)\n`;
        summary += `  Take Profit: ${formatFeeRate(feeRates.closeMaker)} (Maker)\n`;
        summary += `  Slippage: 0% (Maker orders)\n`;
      } else if (feeType === 'TAKER') {
        summary += `  Opening: ${formatFeeRate(feeRates.openTaker)} (Taker)\n`;
        summary += `  Stop Loss: ${formatFeeRate(feeRates.closeTaker)} (Taker)\n`;
        summary += `  Take Profit: ${formatFeeRate(feeRates.closeTaker)} (Taker)\n`;
        summary += `  Slippage: ${formatFeeRate(feeRates.slippageOpen)} + ${formatFeeRate(feeRates.slippageClose)} + ${formatFeeRate(feeRates.slippageClose)}\n`;
      } else if (feeType === 'MAKER_OPEN_TAKER_CLOSE') {
        summary += `  Opening: ${formatFeeRate(feeRates.openMaker)} (Maker)\n`;
        summary += `  Stop Loss: ${formatFeeRate(feeRates.closeTaker)} (Taker)\n`;
        summary += `  Take Profit: ${formatFeeRate(feeRates.closeMaker)} (Maker)\n`;
        summary += `  Slippage: 0% + ${formatFeeRate(feeRates.slippageClose)} + 0%\n`;
      } else if (feeType === 'MAKER_OPEN_ONLY') {
        summary += `  Opening: ${formatFeeRate(feeRates.openMaker)} (Maker)\n`;
        summary += `  Stop Loss: ${formatFeeRate(feeRates.closeTaker)} (Taker)\n`;
        summary += `  Take Profit: ${formatFeeRate(feeRates.closeTaker)} (Taker)\n`;
        summary += `  Slippage: 0% + ${formatFeeRate(feeRates.slippageClose)}\n`;
      }
    } else if (orderType === 'MARKET' && feeRates) {
      const formatFeeRate = (rate: string) => (parseFloat(rate) * 100).toFixed(3) + '%';
      summary += `Fee Rates:\n`;
      summary += `  Opening: ${formatFeeRate(feeRates.openTaker)} (Market Taker)\n`;
      summary += `  Stop Loss: ${formatFeeRate(feeRates.closeTaker)} (Taker)\n`;
      summary += `  Slippage: ${formatFeeRate(feeRates.slippageOpen)} + ${formatFeeRate(feeRates.slippageClose)}\n`;
    }
  }
  
  if (contractMode !== 'SPOT' && leverage && initialMargin) {
    summary += `Leverage: ${leverage}x | Margin: ${initialMargin} USDT\n`;
  }
  
  if (liquidationPrice) {
    summary += `Est. Liquidation: ${liquidationPrice}\n`;
  }
  
  // Add trading fees if included
  if (includeFees && totalFees && openFee && closeFee) {
    summary += `Fees: Open ${openFee} + Close ${closeFee} = ${totalFees} USDT\n`;
  }
  
  // Add breakeven target if available
  const breakevenTarget = targets.find(t => t.isBreakeven);
  if (breakevenTarget) {
    summary += `Breakeven: ${breakevenTarget.price}\n`;
  }
  
  // Add first profit target if available
  const firstProfitTarget = targets.find(t => !t.isBreakeven && t.rr > 0);
  if (firstProfitTarget) {
    summary += `Target 1:${firstProfitTarget.rr}: ${firstProfitTarget.price}\n`;
  }
  
  summary += `Compliance: stepSize=${marketMeta.stepSize}, tickSize=${marketMeta.tickSize}\n`;
  
  if (warnings.length > 0) {
    summary += `Warnings: ${warnings.join('; ')}\n`;
  }
  
  summary += 'Note: Estimates only. Exchange rules prevail.';
  
  return summary;
}