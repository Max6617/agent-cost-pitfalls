/**
 * Shipping (docs/fulfilment-rules.md section 3). A ship event names one sku
 * and a quantity; partial shipments are normal and whatever could not ship
 * stays backordered until a later ship event covers it. A ship never moves
 * more than the shelf holds.
 */

export function applyShip(world, order, event) {
  if (!order.packed) return 'out-of-sequence'
  const item = order.items.get(event.sku)
  if (!item) return 'unknown-item'
  const outstanding = item.created - item.shipped
  if (outstanding === 0) return 'over-quantity'
  const onHand = world.stock.get(event.sku) ?? 0
  const qty = Math.min(event.qty, outstanding, onHand)
  item.shipped += qty
  world.stock.set(event.sku, onHand - qty)
  return 'applied'
}
