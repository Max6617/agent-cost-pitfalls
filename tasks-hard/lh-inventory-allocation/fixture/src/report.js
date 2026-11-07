/**
 * Read-only views for the ops console.
 *
 * These are summaries of the engine's ledgers, not a second source of truth:
 * they ask the engine the same questions the pick line asks and format the
 * answers for a human.
 */
import { requireInstant } from './clock.js'
import { canonicalDemand } from './demand.js'
import { formatQty } from './util/quantities.js'

/** On hand, promised and free for every shelf the ledger has seen. */
export function stockReport(allocator, { at, channel = null, allowBuffer = false } = {}) {
  requireInstant(at, 'stockReport')
  return allocator.stock.shelves().map(({ warehouse, sku }) => {
    const onHand = allocator.onHand(warehouse, sku)
    const held = allocator.held({ warehouse, sku, at })
    const buffer = allocator.bufferFor({ channel, sku, warehouse })
    const free = allocator.freeStock({ warehouse, sku, channel, at, allowBuffer })
    return { warehouse, sku, channel, onHand, held, buffer, free }
  })
}

/** Everything still waiting for stock, most urgent first. */
export function backorderReport(allocator, { warehouse = null, sku = null } = {}) {
  const lines = allocator.backorders({ warehouse, sku })
  return {
    count: lines.length,
    units: lines.reduce((n, line) => n + line.outstanding, 0),
    lines: canonicalDemand(lines).map((line) => ({
      orderId: line.orderId,
      shelf: line.warehouse + '/' + line.sku,
      priority: line.priority,
      outstanding: formatQty(line.outstanding),
    })),
  }
}

/** One line per shelf and channel, in the shape the console renders. */
export function promiseReport(allocator, { at, warehouse = null, sku = null, channels = [] } = {}) {
  requireInstant(at, 'promiseReport')
  const shelves = allocator.stock.shelves()
    .filter((s) => warehouse === null || s.warehouse === warehouse)
    .filter((s) => sku === null || s.sku === sku)
  const rows = []
  for (const shelf of shelves) {
    for (const channel of channels) {
      const atp = allocator.atp({ ...shelf, channel, at })
      rows.push({ ...atp, available: formatQty(atp.available) })
    }
  }
  return rows
}
