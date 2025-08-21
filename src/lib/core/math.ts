import { Decimal } from 'decimal.js';
import { DecimalError } from './types.js';

// Configure Decimal.js for high precision financial calculations
Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_DOWN,
  toExpNeg: -20,
  toExpPos: 20,
});

export class SafeDecimal extends Decimal {
  constructor(value: string | number | Decimal) {
    try {
      super(value);
    } catch (error) {
      throw new DecimalError(`Invalid decimal value: ${value}`, { value, error });
    }
  }

  static from(value: string | number | Decimal): SafeDecimal {
    return new SafeDecimal(value);
  }

  static zero(): SafeDecimal {
    return new SafeDecimal(0);
  }

  static one(): SafeDecimal {
    return new SafeDecimal(1);
  }

  safeAdd(other: string | number | Decimal): SafeDecimal {
    try {
      return new SafeDecimal(this.add(other));
    } catch (error) {
      throw new DecimalError(`Addition failed: ${this} + ${other}`, { left: this.toString(), right: other, error });
    }
  }

  safeSub(other: string | number | Decimal): SafeDecimal {
    try {
      return new SafeDecimal(this.sub(other));
    } catch (error) {
      throw new DecimalError(`Subtraction failed: ${this} - ${other}`, { left: this.toString(), right: other, error });
    }
  }

  safeMul(other: string | number | Decimal): SafeDecimal {
    try {
      return new SafeDecimal(this.mul(other));
    } catch (error) {
      throw new DecimalError(`Multiplication failed: ${this} * ${other}`, { left: this.toString(), right: other, error });
    }
  }

  safeDiv(other: string | number | Decimal): SafeDecimal {
    try {
      const divisor = new SafeDecimal(other);
      if (divisor.isZero()) {
        throw new DecimalError('Division by zero', { dividend: this.toString(), divisor: divisor.toString() });
      }
      return new SafeDecimal(this.div(divisor));
    } catch (error) {
      if (error instanceof DecimalError) throw error;
      throw new DecimalError(`Division failed: ${this} / ${other}`, { left: this.toString(), right: other, error });
    }
  }

  safePow(exponent: string | number | Decimal): SafeDecimal {
    try {
      return new SafeDecimal(this.pow(exponent));
    } catch (error) {
      throw new DecimalError(`Power failed: ${this} ^ ${exponent}`, { base: this.toString(), exponent, error });
    }
  }

  isPositive(): boolean {
    return this.gt(0);
  }

  isNegative(): boolean {
    return this.lt(0);
  }

  abs(): SafeDecimal {
    return new SafeDecimal(super.abs());
  }
}

/**
 * Round down to the nearest step size
 * @param value The value to round
 * @param stepSize The step size for rounding
 * @returns Rounded value
 */
export function roundDownToStep(value: SafeDecimal, stepSize: SafeDecimal): SafeDecimal {
  if (stepSize.isZero()) {
    throw new DecimalError('Step size cannot be zero', { value: value.toString(), stepSize: stepSize.toString() });
  }
  
  const steps = new SafeDecimal(value.safeDiv(stepSize).floor());
  return steps.safeMul(stepSize);
}

/**
 * Round to the nearest tick size (for prices)
 * @param price The price to round
 * @param tickSize The tick size for rounding
 * @returns Rounded price
 */
export function roundToTick(price: SafeDecimal, tickSize: SafeDecimal): SafeDecimal {
  if (tickSize.isZero()) {
    throw new DecimalError('Tick size cannot be zero', { price: price.toString(), tickSize: tickSize.toString() });
  }
  
  const ticks = new SafeDecimal(price.safeDiv(tickSize).round());
  return ticks.safeMul(tickSize);
}

/**
 * Get the number of decimal places for a step size
 * @param stepSize The step size
 * @returns Number of decimal places
 */
export function getDecimalPlaces(stepSize: SafeDecimal): number {
  const str = stepSize.toString();
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) return 0;
  return str.length - decimalIndex - 1;
}

/**
 * Format a decimal value to a string with appropriate precision
 * @param value The value to format
 * @param precision Number of decimal places
 * @returns Formatted string
 */
export function formatDecimal(value: SafeDecimal, precision: number): string {
  return value.toFixed(precision);
}

/**
 * Format a price based on tickSize with fallback to 3 decimal places
 * @param price The price to format
 * @param tickSize The tick size (optional)
 * @returns Formatted price string
 */
export function formatPriceByTickSize(price: SafeDecimal, tickSize?: SafeDecimal): string {
  if (!tickSize || tickSize.isZero()) {
    // Fallback to 3 decimal places when tickSize is unavailable
    return price.toFixed(3);
  }
  
  const decimalPlaces = getDecimalPlaces(tickSize);
  return price.toFixed(decimalPlaces);
}

/**
 * Format quantity based on stepSize with fallback to 3 decimal places
 * @param quantity The quantity to format
 * @param stepSize The step size (optional)
 * @returns Formatted quantity string
 */
export function formatQuantityByStepSize(quantity: SafeDecimal, stepSize?: SafeDecimal): string {
  if (!stepSize || stepSize.isZero()) {
    // Fallback to 3 decimal places when stepSize is unavailable
    return quantity.toFixed(3);
  }
  
  const decimalPlaces = getDecimalPlaces(stepSize);
  return quantity.toFixed(decimalPlaces);
}

/**
 * Check if a value satisfies minimum quantity and notional requirements
 * @param qty Quantity
 * @param price Price
 * @param minQty Minimum quantity
 * @param minNotional Minimum notional value
 * @returns Validation result
 */
export function validateMinRequirements(
  qty: SafeDecimal,
  price: SafeDecimal,
  minQty: SafeDecimal,
  minNotional: SafeDecimal
): { valid: boolean; reason?: string } {
  if (qty.lt(minQty)) {
    return { valid: false, reason: `Quantity ${qty} is below minimum ${minQty}` };
  }
  
  const notional = qty.safeMul(price);
  if (notional.lt(minNotional)) {
    return { valid: false, reason: `Notional ${notional} is below minimum ${minNotional}` };
  }
  
  return { valid: true };
}