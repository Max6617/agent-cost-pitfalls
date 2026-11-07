/**
 * Coupons.
 *
 * A coupon attaches to a cart on the strength of its code and its validity
 * window alone - whether the cart actually earns it is judged when the cart's
 * contents are final: at merge, and again at checkout.
 */
export function findCoupon(coupons, code) {
  return (coupons ?? []).find((c) => c.code === code) ?? null
}

/** The window is inclusive: a coupon is good through the day it names. */
export function withinWindow(coupon, now) {
  if (!coupon.validUntil) return true
  return now <= coupon.validUntil
}

/** Can this coupon attach to a cart right now? */
export function attachable(coupon, now) {
  return coupon !== null && withinWindow(coupon, now)
}

/**
 * Does the cart's final contents earn this coupon? The window must hold, the
 * subtotal must reach the coupon's minimum when it names one, and a required
 * SKU must be present, wrapped or not.
 */
export function qualifies(coupon, view, now) {
  if (!withinWindow(coupon, now)) return false
  if (coupon.minSubtotalCents != null && view.subtotalCents < coupon.minSubtotalCents) return false
  if (coupon.requiredSku != null && !view.lines.some((l) => l.sku === coupon.requiredSku && l.qty > 0)) return false
  return true
}
