/**
 * Channel safety stock.
 *
 * A channel's buffer is stock the channel refuses to sell: merchandising keeps
 * a few units back so a campaign does not clear a shelf that the trade counter
 * still needs. The table is keyed so that every channel, sku and site keeps its
 * own number; a buffer that was never set reads as zero.
 */
import { requireQty } from './util/quantities.js'

/**
 * The identity of a buffer.
 *
 * The buffer belongs to a shelf (sku, warehouse); the channel is what decides
 * who is allowed to spend it.
 */
export function bufferKey({ channel, sku, warehouse }) {
  return [sku, warehouse].join('|')
}

export function createBufferTable() {
  const table = new Map()

  return {
    set({ channel = null, sku, warehouse, qty }) {
      requireQty(qty, 'buffer')
      if (qty < 0) throw new RangeError('a safety-stock buffer cannot be negative')
      table.set(bufferKey({ channel, sku, warehouse }), qty)
      return qty
    },

    get({ channel = null, sku, warehouse }) {
      return table.get(bufferKey({ channel, sku, warehouse })) ?? 0
    },

    /** Every buffer that has been set, for the merchandising console. */
    entries() {
      return [...table.entries()].map(([key, qty]) => ({ key, qty }))
    },
  }
}
