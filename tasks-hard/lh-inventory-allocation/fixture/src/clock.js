/**
 * Instants.
 *
 * The engine is a library, not a service: it does not own the clock. Every call
 * that depends on "when" is given the instant it should reason about, so an
 * allocation run is reproducible from its inputs alone and a test never has to
 * wait for anything.
 *
 * The canonical form crossing the public surface is an ISO-8601 UTC string
 * ('2024-05-01T09:00:00.000Z'). Epoch milliseconds are accepted anywhere an
 * instant is accepted.
 */

/** Convert an instant to epoch milliseconds. `null` means "no instant". */
export function toEpoch(instant) {
  if (instant === null || instant === undefined) return null
  if (typeof instant === 'number') {
    if (!Number.isFinite(instant)) throw new TypeError('not an instant: ' + String(instant))
    return Math.trunc(instant)
  }
  const ms = Date.parse(instant)
  if (Number.isNaN(ms)) throw new TypeError('not an instant: ' + String(instant))
  return ms
}

/** Convert an instant to the canonical ISO-8601 UTC string. */
export function toIso(instant) {
  if (instant === null || instant === undefined) return null
  return new Date(toEpoch(instant)).toISOString()
}

/** An instant, offset by a number of milliseconds. `null` propagates. */
export function addMs(instant, ms) {
  if (instant === null || instant === undefined) return null
  if (ms === null || ms === undefined) return null
  return toIso(toEpoch(instant) + ms)
}

/**
 * Every reader that depends on liveness demands the instant it is reading at.
 * There is no implicit "now"; a missing instant is a caller bug, not a default.
 */
export function requireInstant(instant, where = 'this call') {
  if (instant === null || instant === undefined) {
    throw new TypeError(where + ' needs an instant: pass `at` (ISO-8601 string or epoch ms)')
  }
  try {
    return toEpoch(instant)
  } catch {
    throw new TypeError(where + ' was given an instant it cannot read: ' + String(instant))
  }
}
