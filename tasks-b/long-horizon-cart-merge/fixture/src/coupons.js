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

/** Does the cart's final contents earn this coupon? */
export function qualifies(coupon, view, now) {
  return withinWindow(coupon, now)
}
