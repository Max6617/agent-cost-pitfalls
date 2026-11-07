import { COUPONS } from './promotions.js'

/**
 * Coupons.
 *
 * A coupon is applied to the amount that is left after the promotions and the
 * loyalty discount. A fixed coupon larger than what is left reduces the total
 * to zero rather than going negative: the customer is never owed money by a
 * coupon.
 */

/**
 * @param {string|undefined|null} code
 * @param {number} afterDiscounts
 * @returns {{ code: string|null, discount: number, reason?: string }}
 */
export function applyCoupon(code, afterDiscounts) {
  if (!code) return { code: null, discount: 0 }

  const coupon = COUPONS[String(code).trim().toUpperCase()]
  if (!coupon) return { code: null, discount: 0, reason: 'unknown-coupon' }

  const raw = coupon.kind === 'percent' ? (afterDiscounts * coupon.value) / 100 : coupon.value
  return { code: String(code).trim().toUpperCase(), discount: Math.min(raw, afterDiscounts) }
}
