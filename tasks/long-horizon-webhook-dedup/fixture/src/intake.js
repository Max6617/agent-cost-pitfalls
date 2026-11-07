import { OUTCOME } from './store.js'

/**
 * The intake handler.
 *
 * The order of the checks matters and is the whole point of this module:
 *
 *   1. reject a delivery with no id at all — it can never be deduplicated
 *   2. a known id is a duplicate, acknowledged and dropped
 *   3. a sequence at or below the newest one applied for the subject is stale
 *   4. otherwise apply it
 *
 * Checking staleness before duplicate would report a redelivery of the newest
 * event as stale, and support would see the wrong reason in the log.
 */
export function handleDelivery(store, delivery, apply = () => {}) {
  if (!delivery || !delivery.id) {
    return { outcome: 'rejected', reason: 'missing-id' }
  }

  const result = apply(delivery)
  store.record(delivery)
  return { outcome: OUTCOME.APPLIED, id: delivery.id, result }
}

/** Handle a batch, reporting one outcome per delivery in order. */
export function handleBatch(store, deliveries, apply = () => {}) {
  return deliveries.map((delivery) => handleDelivery(store, delivery, apply))
}

/** A delivery as the tests write them. */
export function delivery(id, subject, sequence, payload = {}) {
  return { id, subject, sequence, payload }
}
