/**
 * Available to promise.
 *
 * The order service asks for the same shelf and channel over and over between
 * two movements of stock — the checkout page, the promise date calculator and
 * the console all read it — so the answer is computed once and kept.
 *
 * It is the only stateful thing in the engine, and it is a cache and nothing
 * else: every value in it is a replay that could be done again from the ledgers.
 * Anything that changes what is on hand or what is promised invalidates it.
 */
import { toIso } from './clock.js'

export function createAtpCache() {
  const cache = new Map()

  return {
    /** The identity of a cached answer. */
    key({ sku, warehouse = null, channel = null, at }) {
      return [sku, channel, toIso(at)].join('|')
    },

    get(key) {
      return cache.has(key) ? cache.get(key) : null
    },

    set(key, value) {
      cache.set(key, value)
      return value
    },

    /** Called by everything that changes stock or promises. */
    clear() {
      cache.clear()
    },

    size() {
      return cache.size
    },
  }
}

/**
 * The report itself: what the shelf holds, what is promised, what the channel
 * is keeping back, and what is left to sell.
 */
export function buildAtp({ sku, warehouse, channel = null, at, onHand, held, buffer }) {
  return {
    sku,
    warehouse,
    channel,
    at: toIso(at),
    onHand,
    held,
    buffer,
    available: onHand - held - buffer,
  }
}
