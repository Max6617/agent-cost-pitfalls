/**
 * The replay engine: fold an event list into the state of the world. The
 * caller supplies the events in canonical order (docs section 1); this module
 * does not re-sort them.
 */
import { createIndex } from './idempotency.js'
import { advance, cancelOrder, createOrder, markPaid } from './lifecycle.js'
import { applyShip } from './fulfilment.js'
import { applyReturn } from './returns.js'

export function replayEvents(events, stock0 = {}) {
  const world = {
    orders: new Map(),
    stock: new Map(Object.entries(stock0).map(([sku, n]) => [sku, Number(n)])),
    money: { collected: 0, refunded: 0 },
    seen: createIndex(),
    envelopes: [],
  }
  for (const event of events) {
    let status
    if (world.seen.has(event)) {
      status = 'duplicate'
    } else {
      world.seen.add(event)
      status = applyEvent(world, event)
    }
    world.envelopes.push({ event, status })
  }
  return world
}

function applyEvent(world, event) {
  if (event.type === 'created') return createOrder(world, event)
  const order = world.orders.get(event.order)
  if (!order) return 'unknown-order'
  if (order.cancelled) return 'out-of-sequence'
  switch (event.type) {
    case 'paid': return markPaid(world, order)
    case 'pick':
    case 'pack':
    case 'deliver': return advance(order, event.type)
    case 'ship': return applyShip(world, order, event)
    case 'cancel': return cancelOrder(world, order)
    case 'return': return applyReturn(world, order, event)
    default: return 'out-of-sequence'
  }
}
