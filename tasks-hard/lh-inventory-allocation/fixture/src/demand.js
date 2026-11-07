/**
 * Demand lines and the backorder queue.
 *
 * A demand line is what a customer asked for from one shelf: the quantity, the
 * channel it was sold through and how urgent it is. Lines that are still
 * waiting for stock are the backorders the pick line reads every morning.
 *
 * The queue holds lines in the order they were added. That order is an artefact
 * of how the day went and means nothing to anybody: everything that walks the
 * queue for stock sorts it first (see `canonicalDemand`).
 */
import { requireInstant, toEpoch } from './clock.js'
import { requirePositiveQty, requireQty } from './util/quantities.js'

export const DEMAND_STATUSES = ['open', 'partial', 'allocated', 'cancelled']

export const DEFAULT_PRIORITY = 100

/** The identity of a demand line: one order, one sku, one site. */
export function demandKey(orderId, sku, warehouse) {
  return [orderId, sku, warehouse].join('|')
}

/**
 * Policy order: priority ascending (1 is the most urgent), then the older
 * line, then the id. Nothing about arrival order is part of it.
 */
export function compareDemand(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority
  const placed = toEpoch(a.placedAt) - toEpoch(b.placedAt)
  if (placed !== 0) return placed
  return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0
}

/** A new array in policy order; the input is not modified. */
export function canonicalDemand(lines) {
  return [...lines].sort(compareDemand)
}

export function createDemandQueue() {
  const byKey = new Map()

  return {
    add({ orderId, sku, warehouse, qty, priority = DEFAULT_PRIORITY, channel = null, placedAt }) {
      requireInstant(placedAt, 'demand')
      requirePositiveQty(qty, 'demand quantity')
      requireQty(priority, 'priority')
      const key = demandKey(orderId, sku, warehouse)
      if (byKey.has(key)) return { status: 'duplicate', line: byKey.get(key) }
      const line = {
        id: String(orderId),
        orderId,
        sku,
        warehouse,
        qty,
        priority,
        channel,
        placedAt: new Date(toEpoch(placedAt)).toISOString(),
        filled: 0,
        status: 'open',
      }
      byKey.set(key, line)
      return { status: 'accepted', line }
    },

    get(orderId, sku, warehouse) {
      return byKey.get(demandKey(orderId, sku, warehouse)) ?? null
    },

    all() {
      return [...byKey.values()]
    },

    /** Lines with something left to fill, in the order they were added. */
    open() {
      return [...byKey.values()].filter((line) => line.status === 'open' || line.status === 'partial')
    },

    forOrder(orderId) {
      return [...byKey.values()].filter((line) => String(line.orderId) === String(orderId))
    },

    /** What is still outstanding on a shelf. */
    outstanding({ warehouse = null, sku = null } = {}) {
      return [...byKey.values()]
        .filter((line) => line.status === 'open' || line.status === 'partial')
        .filter((line) => warehouse === null || line.warehouse === warehouse)
        .filter((line) => sku === null || line.sku === sku)
        .map((line) => ({ ...line, outstanding: line.qty - line.filled }))
        .filter((line) => line.outstanding > 0)
    },
  }
}
