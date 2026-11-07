/**
 * Discounts.
 *
 * A voucher comes off first and the percentage comes off what is left, because
 * that is the order the pricing team sells: "10% off after the voucher" is not
 * the same number as "the voucher off after 10%".
 *
 * Nothing is rounded until the end. Rounding the intermediate step and then
 * rounding again is how an invoice ends up a minor unit away from the quote.
 */
import { compare, div, mul, sub, normalize, isDecimal } from './decimal.js'
import { roundTo } from './rounding.js'

/** `amount x percent / 100`, exactly, unrounded. */
export function percentageOf(amount, percent) {
  return normalize(div(mul(amount, percent), '100'))
}

function read(discount, field, fallback) {
  const value = discount[field]
  if (value === undefined || value === null) return fallback
  if (!isDecimal(value)) throw new Error('not a decimal: ' + value)
  return value
}

export function applyDiscount(amount, discount = {}, options = {}) {
  const scale = options.scale ?? 2
  const mode = options.mode ?? 'half-up'
  const percent = read(discount, 'percent', '0')
  const fixed = read(discount, 'fixed', '0')
  if (compare(percent, '0') < 0 || compare(percent, '100') > 0) {
    throw new Error('a percentage discount must be between 0 and 100: ' + percent)
  }
  const afterFixed = sub(amount, fixed)
  const afterPercent = div(mul(afterFixed, sub('100', percent)), '100')
  return roundTo(afterPercent, scale, mode)
}
