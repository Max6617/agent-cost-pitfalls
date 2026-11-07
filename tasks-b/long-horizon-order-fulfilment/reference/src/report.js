/**
 * Reconciliation (docs/fulfilment-rules.md section 7): units and money as
 * they stand after a prefix of the canonical event log.
 */
import { canonicalOrder } from './event-log.js'
import { replayEvents } from './replay.js'

export function buildReport(log, stock0, through = null) {
  const ordered = canonicalOrder(log)
  const slice = through == null ? ordered : ordered.slice(0, through)
  return summarize(replayEvents(slice, stock0))
}

export function summarize(world) {
  const onHand = {}
  const shipped = {}
  const backordered = {}
  for (const [sku, n] of world.stock) {
    if (n !== 0) onHand[sku] = n
  }
  for (const order of world.orders.values()) {
    for (const [sku, item] of order.items) {
      if (item.shipped !== 0) shipped[sku] = (shipped[sku] ?? 0) + item.shipped
      if (order.paid && !order.cancelled && item.created - item.shipped > 0) {
        backordered[sku] = (backordered[sku] ?? 0) + (item.created - item.shipped)
      }
    }
  }
  return {
    events: world.envelopes.length,
    onHand: sorted(onHand),
    shipped: sorted(shipped),
    backordered: sorted(backordered),
    money: {
      collected: world.money.collected,
      refunded: world.money.refunded,
      net: world.money.collected - world.money.refunded,
    },
  }
}

function sorted(map) {
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}
