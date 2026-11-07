/**
 * Per-order lifecycle (docs/fulfilment-rules.md sections 2 and 4): the legal
 * sequence, the money a paid order collects, and what cancelling does.
 */

export function createOrder(world, event) {
  if (world.orders.has(event.order)) return 'out-of-sequence'
  const items = new Map()
  for (const item of event.items ?? []) {
    items.set(item.sku, { created: item.qty, price: item.price, shipped: 0, returned: 0 })
  }
  world.orders.set(event.order, {
    id: event.order,
    items,
    paid: false,
    paidAmount: 0,
    picked: false,
    packed: false,
    delivered: false,
    cancelled: false,
    returnOpen: false,
    refunded: 0,
  })
  return 'applied'
}

export function orderValue(order) {
  let value = 0
  for (const item of order.items.values()) value += item.created * item.price
  return value
}

export function shippedTotal(order) {
  let n = 0
  for (const item of order.items.values()) n += item.shipped
  return n
}

export function returnedTotal(order) {
  let n = 0
  for (const item of order.items.values()) n += item.returned
  return n
}

export function allShipped(order) {
  for (const item of order.items.values()) if (item.shipped < item.created) return false
  return true
}

/** The display status, derived from the flags - never stored (docs section 2). */
export function statusOf(order) {
  if (order.cancelled) return 'cancelled'
  if (order.returnOpen) {
    return returnedTotal(order) === shippedTotal(order) ? 'closed' : 'return-open'
  }
  if (order.delivered) return 'delivered'
  if (!order.paid) return 'created'
  if (!order.picked) return 'paid'
  if (!order.packed) return 'picked'
  if (shippedTotal(order) === 0) return 'packed'
  return allShipped(order) ? 'shipped' : 'partially-shipped'
}

/** A `paid` event collects the order's full created value. */
export function markPaid(world, order) {
  if (order.paid) return 'out-of-sequence'
  order.paid = true
  order.paidAmount = orderValue(order)
  world.money.collected += order.paidAmount
  return 'applied'
}

const STEPS = {
  pick: { ok: (order) => order.paid && !order.picked, run: (order) => { order.picked = true } },
  pack: { ok: (order) => order.picked && !order.packed, run: (order) => { order.packed = true } },
  deliver: {
    ok: (order) => order.packed && allShipped(order) && !order.delivered,
    run: (order) => { order.delivered = true },
  },
}

/** pick, pack and deliver are whole-order steps with a single prerequisite. */
export function advance(order, type) {
  const step = STEPS[type]
  if (!step || !step.ok(order)) return 'out-of-sequence'
  step.run(order)
  return 'applied'
}

/** Cancelling (docs section 4). A delivered order can no longer cancel. */
export function cancelOrder(world, order) {
  if (order.delivered) return 'out-of-sequence'
  order.cancelled = true
  if (order.paidAmount > 0) {
    order.refunded += order.paidAmount
    world.money.refunded += order.paidAmount
  }
  return 'applied'
}
