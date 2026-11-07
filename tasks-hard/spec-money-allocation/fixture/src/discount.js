/**
 * Discounts.
 *
 * A discount is a voucher and a percentage, either of them optional. The
 * percentage is the headline number on the pricing sheet, so it is taken off
 * the amount first and the voucher comes off what is left.
 *
 * The discount figure itself is rounded before it is taken off, because that is
 * the number the quote shows.
 */
import { compare, isDecimal, sub, toNumber } from './decimal.js'
import { roundTo } from './rounding.js'

/** `amount x percent / 100`. */
export function percentageOf(amount, percent) {
  return String((toNumber(amount) * toNumber(percent)) / 100)
}

function read(discount, field, fallback) {
  const value = discount[field]
  if (value === undefined || value === null) return fallback
  if (!isDecimal(value)) throw new Error('not a decimal: ' + value)
  return value
}

export function applyDiscount(amount, discount = {}, options = {}) {
  const scale = options.scale ?? 2
  const percent = read(discount, 'percent', '0')
  const fixed = read(discount, 'fixed', '0')
  if (compare(percent, '0') < 0 || compare(percent, '100') > 0) {
    throw new Error('a percentage discount must be between 0 and 100: ' + percent)
  }
  const taken = roundTo(percentageOf(amount, percent), scale)
  return sub(sub(amount, taken), fixed)
}
