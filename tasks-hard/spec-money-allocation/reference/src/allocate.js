/**
 * Allocating one amount across several weighted shares.
 *
 * The whole difficulty is that money does not divide: a third of a cent has to
 * go somewhere, and the caller is entitled to see it go. Each share is rounded
 * to the allocation scale, and the units the rounding left over are handed to
 * the shares that were rounded hardest, so that the parts always add back up to
 * the total, exactly.
 *
 * The scale is a parameter because the minor unit is a property of the currency
 * being allocated in - 2 for USD, 0 for JPY, 3 for BHD - and the toolkit has no
 * business picking one.
 */
import { parseExact, renderExact, pow10 } from './decimal.js'
import { roundRatio } from './rounding.js'

export function allocate(total, weights, options = {}) {
  const scale = options.scale ?? 2
  const mode = options.mode ?? 'half-up'
  if (!Number.isInteger(scale) || scale < 0) throw new Error('not an allocation scale: ' + scale)
  if (!Array.isArray(weights) || weights.length === 0) {
    throw new Error('allocate needs at least one weight')
  }

  const parsedTotal = parseExact(total)
  if (parsedTotal.scale > scale) {
    // The total has to be a whole number of minor units, or there is a
    // remainder nobody can be given.
    const drop = pow10(parsedTotal.scale - scale)
    if (parsedTotal.digits % drop !== 0n) {
      throw new Error('the total is not a whole number of minor units: ' + total)
    }
  }
  const units =
    parsedTotal.scale > scale
      ? parsedTotal.sign * (parsedTotal.digits / pow10(parsedTotal.scale - scale))
      : parsedTotal.sign * parsedTotal.digits * pow10(scale - parsedTotal.scale)

  const parsedWeights = weights.map((weight) => parseExact(weight))
  const weightScale = parsedWeights.reduce((widest, one) => Math.max(widest, one.scale), 0)
  let shares = parsedWeights.map((one) => one.sign * one.digits * pow10(weightScale - one.scale))
  let divisor = shares.reduce((running, one) => running + one, 0n)
  if (divisor === 0n) {
    // No proportions to honour: a pool with no shares is split equally.
    shares = shares.map(() => 1n)
    divisor = BigInt(shares.length)
  }

  const parts = []
  const errors = []
  for (const share of shares) {
    // The exact share is share / divisor of a minor unit; the numerator of the
    // whole allocation is units * share, so nothing is ever written down as a
    // decimal approximation.
    const numerator = units * share
    const part = roundRatio(numerator, divisor, mode)
    parts.push(part)
    const miss = numerator - part * divisor
    errors.push(miss < 0n ? -miss : miss)
  }

  const handed = parts.reduce((running, one) => running + one, 0n)
  const residual = units - handed
  if (residual !== 0n) {
    const order = parts.map((_, index) => index).sort((a, b) => {
      if (errors[a] !== errors[b]) return errors[a] > errors[b] ? -1 : 1
      return a - b
    })
    const step = residual > 0n ? 1n : -1n
    const count = Number(residual < 0n ? -residual : residual)
    for (let i = 0; i < count && i < order.length; i += 1) parts[order[i]] += step
  }

  return parts.map((part) => renderExact(part, scale, true))
}
