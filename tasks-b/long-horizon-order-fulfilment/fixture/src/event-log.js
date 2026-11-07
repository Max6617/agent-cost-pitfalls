/**
 * The event log: envelope normalisation and the canonical order
 * (docs/fulfilment-rules.md section 1). The log is the only state the service
 * keeps; everything else is derived by replaying it in canonical order.
 */

/** A defensive copy with the fields the replay relies on coerced. */
export function normalizeEvent(raw) {
  const event = { ...raw }
  event.id = String(event.id)
  event.order = String(event.order)
  if (event.qty != null) event.qty = Number(event.qty)
  if (event.items) {
    event.items = event.items.map((item) => ({
      sku: String(item.sku),
      qty: Number(item.qty),
      price: Number(item.price),
    }))
  }
  return event
}

/**
 * Canonical order: ascending `at`, ties broken by ascending `id`. Every `at`
 * is an ISO-8601 UTC timestamp, so string comparison is chronological.
 */
export function compareEvents(a, b) {
  if (a.at < b.at) return -1
  if (a.at > b.at) return 1
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

/** The events sorted into canonical order; the input is not mutated. */
export function canonicalOrder(events) {
  return events.slice().sort(compareEvents)
}
