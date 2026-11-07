import { TIERS } from './tables.js'

/**
 * Quantity discount tiers.
 *
 * Kept in its own module because the same lookup is needed by the quote screen,
 * the invoice job and the sales-console preview.
 */

/**
 * The tier that applies to a quantity.
 *
 * A tier applies when the quantity is at or above its threshold. When more than
 * one applies the one with the highest threshold wins.
 *
 * @param {number} qty
 * @param {{threshold:number,rate:number}[]} [tiers]
 */
export function pickTier(qty, tiers = TIERS) {
  for (const tier of tiers) {
    if (qty >= tier.threshold) return tier
  }
  return tiers[0]
}

/** The discount rate for a quantity. */
export function rateForQty(qty, tiers = TIERS) {
  return pickTier(qty, tiers).rate
}

/** A human-readable label for the quote screen: "10+ (12%)". */
export function tierLabel(tier) {
  return tier.threshold + '+ (' + Math.round(tier.rate * 100) + '%)'
}
