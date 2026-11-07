/**
 * Amounts in a currency: printing them and converting between them.
 *
 * Both entry points round the exact value once, at the target currency's minor
 * units, which is the only scale an amount in that currency can be written at.
 */
import { mul } from './decimal.js'
import { roundTo } from './rounding.js'
import { minorUnits } from './currencies.js'

/** Round to the currency's minor units and write it fixed-scale. */
export function formatAmount(value, currency, options = {}) {
  return roundTo(value, minorUnits(currency), options.mode ?? 'half-up')
}

/**
 * Convert at a declared rate - target units per one unit of the source - and
 * round the exact product once, at the target currency's minor units.
 */
export function convert(value, rate, currency, options = {}) {
  return roundTo(mul(value, rate), minorUnits(currency), options.mode ?? 'half-up')
}
