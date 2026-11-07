/**
 * Returns (docs/fulfilment-rules.md section 5). The customer states how many
 * units are coming back and in what condition; the refund is qty times the
 * price the order paid, and the units go back on the shelf for the next
 * order.
 */

export function applyReturn(world, order, event) {
  const item = order.items.get(event.sku)
  if (!item) return 'unknown-item'
  const outThere = item.shipped - item.returned
  if (event.qty > outThere) return 'over-quantity'
  item.returned += event.qty
  const refund = event.qty * item.price
  order.refunded += refund
  world.money.refunded += refund
  world.stock.set(event.sku, (world.stock.get(event.sku) ?? 0) + event.qty)
  return 'applied'
}
