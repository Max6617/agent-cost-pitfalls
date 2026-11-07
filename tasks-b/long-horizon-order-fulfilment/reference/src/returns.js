/**
 * Returns (docs/fulfilment-rules.md section 5). The customer states how many
 * units are coming back and in what condition; the refund is qty times the
 * price the order paid, whatever the condition. Only units in a restockable
 * condition go back on the shelf; the rest are written off.
 */
import { RESTOCKABLE_CONDITIONS } from './constants.js'

export function applyReturn(world, order, event) {
  const item = order.items.get(event.sku)
  if (!item) return 'unknown-item'
  const outThere = item.shipped - item.returned
  if (event.qty > outThere) return 'over-quantity'
  item.returned += event.qty
  const refund = event.qty * item.price
  order.refunded += refund
  world.money.refunded += refund
  if (RESTOCKABLE_CONDITIONS.includes(event.condition)) {
    world.stock.set(event.sku, (world.stock.get(event.sku) ?? 0) + event.qty)
  }
  return 'applied'
}
