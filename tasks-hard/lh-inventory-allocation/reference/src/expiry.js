/**
 * Reservation deadlines.
 *
 * A hold lasts until its deadline. The deadline is exclusive: `expiresAt` is
 * the first instant at which the hold has already lapsed, which is why a
 * consumer that reads at exactly `expiresAt` must find the stock free.
 *
 * Liveness is a property of the pair (hold, instant being asked about) and not
 * of anything stored on the hold, so reading it never depends on a job having
 * run.
 */
import { addMs, toEpoch } from './clock.js'

/** The deadline produced by asking for a hold at `instant` with `ttlMs`. */
export function expiryOf(instant, ttlMs) {
  if (ttlMs === null || ttlMs === undefined) return null
  if (typeof ttlMs !== 'number' || !Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new TypeError('ttlMs must be a non-negative number of milliseconds or null')
  }
  return addMs(instant, ttlMs)
}

/** Has this hold lapsed by `at`? A hold without a deadline never does. */
export function isExpired(reservation, at) {
  if (!reservation || !reservation.expiresAt) return false
  return toEpoch(reservation.expiresAt) <= toEpoch(at)
}
