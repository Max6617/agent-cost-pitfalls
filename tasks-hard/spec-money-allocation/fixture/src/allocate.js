/**
 * Allocating one amount across several weighted shares.
 *
 * Money does not divide: a third of a cent has to go somewhere. The shares are
 * worked out in whole minor units, each is rounded, and the units the rounding
 * left over are handed back so that the parts add up to the total.
 *
 * The rounding is done on the minor unit, which is why everything here is in
 * cents.
 */
import { toNumber } from './decimal.js'

const CENTS = 100

export function allocate(total, weights, options = {}) {
  if (!Array.isArray(weights) || weights.length === 0) {
    throw new Error('allocate needs at least one weight')
  }

  const totalCents = Math.round(toNumber(total) * CENTS)
  let weightSum = 0
  for (const weight of weights) weightSum += toNumber(weight)

  const parts = weights.map((weight) => {
    const share = (totalCents * toNumber(weight)) / weightSum
    return Math.round(share)
  })

  let residual = totalCents - parts.reduce((running, part) => running + part, 0)
  for (let i = 0; residual !== 0 && i < parts.length; i += 1) {
    parts[i] += residual > 0 ? 1 : -1
    residual += residual > 0 ? -1 : 1
  }

  return parts.map((part) => (part / CENTS).toFixed(2))
}
