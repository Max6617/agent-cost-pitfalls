/**
 * The stock ledger.
 *
 * One append-only list of movements. On hand is a replay of that list and
 * nothing else — no running total is parked anywhere that a later movement
 * could leave stale, because the console and the pick line both read it while
 * goods are still being booked in.
 */
import { requireInstant, toIso } from './clock.js'
import { createSequence } from './util/ids.js'
import { requireQty } from './util/quantities.js'

export const MOVEMENT_KINDS = ['receipt', 'shipment', 'adjustment']

/** A movement is signed: receipts and positive adjustments go up, shipments down. */
function signedQty(kind, qty) {
  return kind === 'shipment' ? -qty : qty
}

export function createStockLedger() {
  const movements = []
  const ids = createSequence('mv-', 5)

  const shelf = (warehouse, sku) => warehouse + '|' + sku

  return {
    /**
     * Append one movement. `qty` is the size of the movement: positive for a
     * receipt, the count of units leaving for a shipment, and either sign for
     * an adjustment.
     */
    record({ warehouse, sku, qty, kind, at, ref = null }) {
      requireInstant(at, 'record')
      requireQty(qty)
      if (!MOVEMENT_KINDS.includes(kind)) throw new TypeError('unknown movement kind: ' + String(kind))
      if (kind !== 'adjustment' && qty < 0) {
        throw new RangeError('a ' + kind + ' is stated as a positive number of units; use adjustment for a signed correction')
      }
      const movement = {
        id: ids.next(),
        warehouse,
        sku,
        kind,
        qty,
        delta: signedQty(kind, qty),
        at: toIso(at),
        ref,
      }
      movements.push(movement)
      return movement
    },

    /** Units physically in the building on one shelf. */
    onHand(warehouse, sku) {
      let total = 0
      for (const m of movements) {
        if (m.warehouse !== warehouse || m.sku !== sku) continue
        total += m.delta
      }
      return total
    },

    movements({ warehouse = null, sku = null } = {}) {
      return movements.filter((m) =>
        (warehouse === null || m.warehouse === warehouse) && (sku === null || m.sku === sku))
    },

    /** Every shelf the ledger has ever seen a movement for. */
    shelves() {
      const seen = new Map()
      for (const m of movements) seen.set(shelf(m.warehouse, m.sku), { warehouse: m.warehouse, sku: m.sku })
      return [...seen.values()]
    },
  }
}
