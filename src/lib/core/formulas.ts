import { SafeDecimal, roundDownToStep, roundToTick, validateMinRequirements, formatPriceByTickSize, formatQuantityByStepSize } from './math.js';
import { CalcInput, CalcResult, Side, ContractMode, ValidationError, DecimalError, RiskMode, WarningKey } from './types.js';

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
  
  // Add fees and slippage to risk
  const entryFeeAndSlippage = entryPrice.safeMul(feeOpen.safeAdd(slippage));
  const exitFee = stopPrice.safeMul(feeClose);
  
  return priceRisk.safeAdd(entryFeeAndSlippage).safeAdd(exitFee);
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
 * Calculate target prices for different Risk/Reward ratios including fees
 * @param entryPrice Entry price
 * @param stopPrice Stop price
 * @param ratios Array of R:R ratios to calculate
 * @param side Trading side
 * @param feeOpen Opening fee rate
 * @param feeClose Closing fee rate
 * @param includeFees Whether to include fees in calculation
 * @returns Array of target prices
 */
export function calculateTargets(
  entryPrice: SafeDecimal,
  stopPrice: SafeDecimal,
  ratios: number[],
  side: Side,
  feeOpen: SafeDecimal = SafeDecimal.from('0'),
  feeClose: SafeDecimal = SafeDecimal.from('0'),
  includeFees: boolean = false,
  tickSize?: SafeDecimal
): Array<{ rr: number; price: string; priceFormatted: string; isBreakeven?: boolean }> {
  // Calculate total risk per unit including fees
  const priceRisk = side === 'LONG' 
    ? entryPrice.safeSub(stopPrice)
    : stopPrice.safeSub(entryPrice);
  
  let totalRisk = priceRisk;
  if (includeFees) {
    // Add entry and exit fees to the risk
    const entryFeePerUnit = entryPrice.safeMul(feeOpen);
    const exitFeePerUnit = stopPrice.safeMul(feeClose);
    totalRisk = priceRisk.safeAdd(entryFeePerUnit).safeAdd(exitFeePerUnit);
  }
  
  const targets: Array<{ rr: number; price: string; priceFormatted: string; isBreakeven?: boolean }> = [];
  
  // Add breakeven target (0 risk) as first target when fees are included
  if (includeFees && !feeOpen.isZero() && !feeClose.isZero()) {
    let breakevenPrice: SafeDecimal;
    
    if (side === 'LONG') {
      // For LONG: breakeven = entry * (1 + fee_open) / (1 - fee_close)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeAdd(feeOpen));
      const denominator = SafeDecimal.one().safeSub(feeClose);
      breakevenPrice = numerator.safeDiv(denominator);
    } else {
      // For SHORT: breakeven = entry * (1 - fee_open) / (1 + fee_close)
      const numerator = entryPrice.safeMul(SafeDecimal.one().safeSub(feeOpen));
      const denominator = SafeDecimal.one().safeAdd(feeClose);
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
    const requiredReward = totalRisk.safeMul(ratio);
    
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
    
    // Calculate target price accounting for fees
    // For the target, we need: net_profit = target_price_diff - target_exit_fee = required_reward
    // So: target_price_diff = required_reward + target_exit_fee
    
    let targetPrice: SafeDecimal;
    if (side === 'LONG') {
      // For LONG: target_price = entry_price + required_reward + target_exit_fee
      // Since target_exit_fee = target_price * fee_close, we need to solve:
      // target_price = entry_price + required_reward + target_price * fee_close
      // target_price * (1 - fee_close) = entry_price + required_reward
      // target_price = (entry_price + required_reward) / (1 - fee_close)
      const numerator = entryPrice.safeAdd(requiredReward);
      const denominator = SafeDecimal.one().safeSub(feeClose);
      targetPrice = numerator.safeDiv(denominator);
    } else {
      // For SHORT: target_price = entry_price - required_reward - target_exit_fee
      // Since target_exit_fee = target_price * fee_close, we need to solve:
      // target_price = entry_price - required_reward - target_price * fee_close
      // target_price * (1 + fee_close) = entry_price - required_reward
      // target_price = (entry_price - required_reward) / (1 + fee_close)
      const numerator = entryPrice.safeSub(requiredReward);
      const denominator = SafeDecimal.one().safeAdd(feeClose);
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
    
    // Calculate targets
    const targets = calculateTargets(entryPrice, stopPrice, input.rrRatios, side, feeOpen, feeClose, includeFees, tickSize);
    
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
      stopPrice: stopPrice.toString(),
      liquidationPrice: liquidationPrice?.toString(),
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