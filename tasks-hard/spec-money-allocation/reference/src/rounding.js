/**
 * Rounding modes.
 *
 * Rounding is a decision about an exact decimal, so it is taken on the exact
 * digits and never on the nearest double: `2.675` is above `2.67` by exactly
 * five thousandths and rounds up to `2.68`, whatever a binary double thinks.
 *
 * Every mode produces a fixed-scale string - that is the point of the
 * function - and a rounded zero is never written with a minus sign.
 */
import { parseExact, renderExact, pow10 } from './decimal.js'

/** The modes billing signed off, in the order docs/billing-rules.md lists them. */
export const ROUNDING_MODES = ['half-up', 'half-even', 'half-down', 'floor', 'ceiling']

export function roundTo(value, scale = 2, mode = 'half-up') {
  if (!ROUNDING_MODES.includes(mode)) throw new Error('unknown rounding mode: ' + mode)
  if (!Number.isInteger(scale) || scale < 0) throw new Error('not a rounding scale: ' + scale)
  const { sign, digits, scale: own } = parseExact(value)
  let scaled = sign * digits
  if (own > scale) {
    const drop = pow10(own - scale)
    const kept = scaled / drop
    const remainder = scaled % drop
    const magnitude = remainder < 0n ? -remainder : remainder
    const twice = magnitude * 2n
    const negative = scaled < 0n
    let away = false
    if (mode === 'half-up') away = twice >= drop
    else if (mode === 'half-down') away = twice > drop
    else if (mode === 'half-even') {
      if (twice > drop) away = true
      else if (twice === drop) away = kept % 2n !== 0n
    } else if (mode === 'floor') away = negative && remainder !== 0n
    else if (mode === 'ceiling') away = !negative && remainder !== 0n
    scaled = away ? kept + (negative ? -1n : 1n) : kept
  } else {
    scaled = scaled * pow10(scale - own)
  }
  return renderExact(scaled, scale, true)
}

/**
 * Round an exact rational `numerator / denominator` to an integer, on the same
 * five modes. Allocation works in whole minor units, so it never has to write
 * the share down as a decimal it would then have to re-read.
 */
export function roundRatio(numerator, denominator, mode = 'half-up') {
  if (!ROUNDING_MODES.includes(mode)) throw new Error('unknown rounding mode: ' + mode)
  if (denominator === 0n) throw new Error('division by zero')
  const negative = (numerator < 0n) !== (denominator < 0n)
  const n = numerator < 0n ? -numerator : numerator
  const d = denominator < 0n ? -denominator : denominator
  const kept = n / d
  const remainder = n % d
  const twice = remainder * 2n
  let away = false
  if (mode === 'half-up') away = twice >= d
  else if (mode === 'half-down') away = twice > d
  else if (mode === 'half-even') {
    if (twice > d) away = true
    else if (twice === d) away = kept % 2n !== 0n
  } else if (mode === 'floor') away = negative && remainder !== 0n
  else if (mode === 'ceiling') away = !negative && remainder !== 0n
  const magnitude = away ? kept + 1n : kept
  return negative ? -magnitude : magnitude
}
