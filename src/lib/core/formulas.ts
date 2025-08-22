import { SafeDecimal, roundDownToStep, roundToTick, validateMinRequirements, formatPriceByTickSize, formatQuantityByStepSize } from './math.js';
import { CalcInput, CalcResult, Side, ContractMode, ValidationError, DecimalError, RiskMode, WarningKey, TakeProfitMode } from './types.js';

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
  slippage?: SafeDecimal,
  includeFees?: boolean
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
      
      if (!includeFees || !feeOpen || !feeClose || !slippage) {
        // Simple calculation without fees
        return side === 'LONG'
          ? entryPrice.safeAdd(requiredReward)
          : entryPrice.safeSub(requiredReward);
      }
      
      // Calculate target price accounting for all fees and slippage
      // Use the same logic as calculateTargets function
      if (side === 'LONG') {
        // target_price = (entry_price * (1 + fee_open + slippage) + required_reward) / (1 - fee_close - slippage)
        const numerator = entryPrice.safeMul(SafeDecimal.one().safeAdd(feeOpen).safeAdd(slippage)).safeAdd(requiredReward);
        const denominator = SafeDecimal.one().safeSub(feeClose).safeSub(slippage);
        return numerator.safeDiv(denominator);
      } else {
        // target_price = (entry_price * (1 - fee_open - slippage) - required_reward) / (1 + fee_close + slippage)
        const numerator = entryPrice.safeMul(SafeDecimal.one().safeSub(feeOpen).safeSub(slippage)).safeSub(requiredReward);
        const denominator = SafeDecimal.one().safeAdd(feeClose).safeAdd(slippage);
        return numerator.safeDiv(denominator);
      }
      
    default:
      throw new ValidationError(`Unsupported take profit mode: ${takeProfitMode}`);
  }
}

/**
 * Calculate risk per unit (BTC) including fees and slippage
 * @param entryPrice Entry price
 * @param stopPrice Stop price
 * @param feeOpen Opening fee rate
 * @param feeClose Closing fee rate
 * @param slippage Slippage rate
 * @param includeFees Whether to include fees in risk calculation
 * @param side Trading side
 * @returns Risk per unit
 */
export function calculateRiskPerUnit(
  entryPrice: SafeDecimal,
  stopPrice: SafeDecimal,
  feeOpen: SafeDecimal,
  feeClose: SafeDecimal,
  slippage: SafeDecimal,
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
  // - Opening slippage per unit = entry price × slippage rate
  // - Closing fee per unit = stop price × close fee rate  
  // - Closing slippage per unit = stop price × slippage rate
  const entryFeePerUnit = entryPrice.safeMul(feeOpen);
  const entrySlippagePerUnit = entryPrice.safeMul(slippage);
  const exitFeePerUnit = stopPrice.safeMul(feeClose);
  const exitSlippagePerUnit = stopPrice.safeMul(slippage);
  
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
  slippage: SafeDecimal,
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
  if (includeFees && (!feeOpen.isZero() || !feeClose.isZero() || !slippage.isZero())) {
    let breakevenPrice: SafeDecimal;
    
    if (side === 'LONG') {
      // For LONG: breakeven where price gain covers all costs
      // Net P&L = 0: (breakeven_price - entry) = entry*fee_open + entry*slippage + breakeven_price*fee_close + breakeven_price*slippage
      // Rearranging: breakeven_price - entry = entry*(fee_open + slippage) + breakeven_price*(fee_close + slippage)
      // breakeven_price * (1 - fee_close - slippage) = entry + entry*(fee_open + slippage)
      // breakeven_price = entry * (1 + fee_open + slippage) / (1 - fee_close - slippage)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeAdd(feeOpen).safeAdd(slippage));
      const denominator = SafeDecimal.one().safeSub(feeClose).safeSub(slippage);
      breakevenPrice = numerator.safeDiv(denominator);
    } else {
      // For SHORT: breakeven where price gain covers all costs
      // Net P&L = 0: (entry - breakeven_price) = entry*fee_open + entry*slippage + breakeven_price*fee_close + breakeven_price*slippage
      // Rearranging: entry - breakeven_price = entry*(fee_open + slippage) + breakeven_price*(fee_close + slippage)
      // breakeven_price * (1 + fee_close + slippage) = entry - entry*(fee_open + slippage)
      // breakeven_price = entry * (1 - fee_open - slippage) / (1 + fee_close + slippage)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeSub(feeOpen).safeSub(slippage));
      const denominator = SafeDecimal.one().safeAdd(feeClose).safeAdd(slippage);
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
      // For LONG: net_profit = (target_price - entry_price) - entry_price*fee_open - entry_price*slippage - target_price*fee_close - target_price*slippage
      // Required equation: (target_price - entry_price) - entry_price*(fee_open + slippage) - target_price*(fee_close + slippage) = required_reward
      // Rearranging: target_price * (1 - fee_close - slippage) = entry_price + required_reward + entry_price*(fee_open + slippage)
      // target_price = (entry_price * (1 + fee_open + slippage) + required_reward) / (1 - fee_close - slippage)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeAdd(feeOpen).safeAdd(slippage)).safeAdd(requiredReward);
      const denominator = SafeDecimal.one().safeSub(feeClose).safeSub(slippage);
      targetPrice = numerator.safeDiv(denominator);
    } else {
      // For SHORT: net_profit = (entry_price - target_price) - entry_price*fee_open - entry_price*slippage - target_price*fee_close - target_price*slippage
      // Required equation: (entry_price - target_price) - entry_price*(fee_open + slippage) - target_price*(fee_close + slippage) = required_reward
      // Rearranging: target_price * (1 + fee_close + slippage) = entry_price - required_reward - entry_price*(fee_open + slippage)
      // target_price = (entry_price * (1 - fee_open - slippage) - required_reward) / (1 + fee_close + slippage)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeSub(feeOpen).safeSub(slippage)).safeSub(requiredReward);
      const denominator = SafeDecimal.one().safeAdd(feeClose).safeAdd(slippage);
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
    stopMode,
    // Take profit settings
    useTakeProfit,
    takeProfitMode,
    takeProfitPrice,
    takeProfitATRMultiplier,
    takeProfitRRRatio,
    riskMode,
    riskUSDT: riskUSDTStr,
    accountEquity: accountEquityStr,
    riskPercent: riskPercentStr,
    includeFees,
    feeOpen: feeOpenStr,
    feeClose: feeCloseStr,
    slippage: slippageStr,
    leverage,
    contractMode,
    marketMeta
  } = input;

  const warnings: string[] = [];
  const warningKeys: WarningKey[] = [];
  
  try {
    // Convert inputs to SafeDecimal
    const entryPrice = SafeDecimal.from(entryPriceStr);
    const riskAmount = calculateRiskAmount(riskMode, riskUSDTStr, accountEquityStr, riskPercentStr);
    const feeOpen = SafeDecimal.from(feeOpenStr);
    const feeClose = SafeDecimal.from(feeCloseStr);
    const slippage = SafeDecimal.from(slippageStr);
    
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
          takeProfitATRMultiplier
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
      slippage,
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
      openSlippageAmount = qtyRounded.safeMul(entryPrice).safeMul(slippage);
      // 止损平仓滑点成本
      closeSlippageAmount = qtyRounded.safeMul(stopPrice).safeMul(slippage);
      
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
      ...(slippage && !slippage.isZero() ? {
        slippageAmount: openSlippageAmount.safeAdd(closeSlippageAmount).toString(),
        slippageAmountFormatted: openSlippageAmount.safeAdd(closeSlippageAmount).toLocaleString(),
      } : {})
    };
    
    // Calculate RR_RATIO take profit price now that we have stopLossRisk
    if (useTakeProfit && takeProfitMode === 'RR_RATIO' && !takeProfitPriceCalculated) {
      try {
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
          feeClose,
          slippage,
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
      
      // 止盈平仓手续费 (成本，负数)
      const profitCloseFeeAmount = includeFees ? SafeDecimal.from('0').safeSub(qtyRounded.safeMul(takeProfitPriceCalculated).safeMul(feeClose)) : SafeDecimal.from('0');
      
      // 开仓滑点成本 (成本，负数)
      const profitOpenSlippageAmount = includeFees && slippage && !slippage.isZero() ? SafeDecimal.from('0').safeSub(qtyRounded.safeMul(entryPrice).safeMul(slippage)) : SafeDecimal.from('0');
      
      // 平仓滑点成本 (成本，负数) - 止盈时也有滑点
      const profitCloseSlippageAmount = includeFees && slippage && !slippage.isZero() ? SafeDecimal.from('0').safeSub(qtyRounded.safeMul(takeProfitPriceCalculated).safeMul(slippage)) : SafeDecimal.from('0');
      
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
        ...(includeFees && slippage && !slippage.isZero() ? {
          slippageAmount: profitOpenSlippageAmount.safeAdd(profitCloseSlippageAmount).toString(),
          slippageAmountFormatted: profitOpenSlippageAmount.safeAdd(profitCloseSlippageAmount).toLocaleString(),
        } : {})
      };
    }

    // Calculate targets using the calculated stop loss risk
    const targets = calculateTargets(
      entryPrice, 
      stopPrice, 
      input.rrRatios, 
      side, 
      feeOpen, 
      feeClose, 
      slippage, 
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
      includeFees
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
    includeFees
  } = params;
  
  let summary = `${side} ${marketMeta.symbol}\n`;
  summary += `Entry: ${entryPrice} | Stop: ${stopPrice}\n`;
  summary += `Qty: ${qtyRounded} | Notional: ${notional} USDT\n`;
  
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