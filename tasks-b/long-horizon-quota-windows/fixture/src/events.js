/**
 * Request events.
 *
 * The gateway stamps every request it forwards and the reconciler replays the
 * same stream. The shape is pinned in docs/quota-rules.md section 1; anything
 * that does not match it is a bug upstream and is refused loudly here rather
 * than silently mis-accounted.
 */
export function normalizeEvent(raw) {
  const event = raw ?? {}
  if (typeof event.id !== 'string' || event.id.length === 0) {
    throw new TypeError('event.id must be a non-empty string')
  }
  if (typeof event.key !== 'string' || event.key.length === 0) {
    throw new TypeError('event.key must be a non-empty string')
  }
  if (!Number.isInteger(event.at) || event.at < 0) {
    throw new TypeError('event.at must be a non-negative integer (seconds since the epoch)')
  }
  const cost = event.cost ?? 1
  if (!Number.isInteger(cost) || cost < 1) {
    throw new TypeError('event.cost must be a positive integer')
  }
  return { id: event.id, key: event.key, at: event.at, cost }
}
