/**
 * Promotion rules.
 *
 * Three kinds of offer exist and they stack in a fixed order, because the order
 * changes the answer whenever a percentage and a fixed amount meet:
 *
 *   1. line promotions (multi-buy) apply to the line they belong to
 *   2. the loyalty discount applies to the running subtotal
 *   3. the coupon applies last, and may be a percentage or a fixed amount
 *
 * A percentage applied before a fixed amount and the same pair applied in the
 * other order differ by the percentage of the fixed amount. Finance picked the
 * order above and it is not negotiable per order.
 */

export const PROMOTIONS = {
  'TEA-01': { kind: 'multiBuy', buy: 3, payFor: 2 },
  'MUG-04': { kind: 'multiBuy', buy: 2, payFor: 1 },
}

export const COUPONS = {
  SAVE10: { kind: 'percent', value: 10 },
  MINUS5: { kind: 'fixed', value: 5 },
  FREESHIP: { kind: 'fixed', value: 4.95 },
}

/** Loyalty tiers by lifetime spend, in currency units. */
export const LOYALTY = [
  { from: 0, percent: 0 },
  { from: 250, percent: 3 },
  { from: 1000, percent: 7 },
  { from: 5000, percent: 12 },
]

/** The loyalty percentage for a lifetime spend, highest applicable tier. */
export function loyaltyPercent(spend) {
  let best = LOYALTY[0]
  for (const tier of LOYALTY) if (spend >= tier.from) best = tier
  return best.percent
}
