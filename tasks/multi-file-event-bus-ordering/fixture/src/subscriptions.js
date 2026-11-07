/**
 * Subscription records.
 *
 * A subscription has a handler, an optional priority and an insertion order.
 * The insertion order is what makes two equal-priority handlers run in the
 * order they were registered — a Map would keep that for free, but it cannot be
 * sorted by priority without losing it, so the sequence number is explicit.
 */

let SEQUENCE = 0

export function makeSubscription(name, handler, { priority = 0, once = false } = {}) {
  if (typeof handler !== 'function') throw new Error('a subscription needs a handler')
  return { name, handler, priority, once, seq: SEQUENCE++ }
}

/**
 * Sort subscriptions the way they will be called.
 *
 * Higher priority first; ties broken by registration order. The sort must be
 * total, or two runs of the same subscriptions produce different orders.
 */
export function inCallOrder(subscriptions) {
  return [...subscriptions].sort((a, b) => a.seq - b.seq)
}

/** Reset the sequence counter. Test-only. */
export function resetSequence() {
  SEQUENCE = 0
}
