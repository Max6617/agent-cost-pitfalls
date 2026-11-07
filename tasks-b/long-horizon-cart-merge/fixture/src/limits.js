/**
 * Quantity policy.
 *
 * The cap for a SKU is the smaller of the stock on hand and the per-customer
 * maximum. Both move: stock changes as the warehouse reports it, so the cap
 * is computed against the stock of the moment, every time it is needed.
 */
export function effectiveCap(sku, { stock, maxPerCustomer }) {
  const onHand = stock[sku] ?? 0
  return Math.min(onHand, maxPerCustomer)
}

/** Join two carts' quantities for one SKU under the cap. */
export function combineQuantities(accountQty, guestQty, cap) {
  return Math.min(accountQty, cap) + Math.min(guestQty, cap)
}
