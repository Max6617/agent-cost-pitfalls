import { nextId } from './util/ids.js'

/**
 * The read-through cache in front of the upstream.
 *
 * Two different things live in here and they behave differently:
 *
 *   - a stored value, written when a request has been answered;
 *   - a reservation, written the moment a request starts looking something up,
 *     so that ten concurrent requests for the same key only make one upstream
 *     call. A reservation carries the frame that took it.
 *
 * docs/pipeline-policy.md section 5: a cancelled request rolls its reservation
 * back and touches nothing else. Whatever a concurrent request stored under the
 * same key stays, and a reservation somebody else still holds stays with them.
 */
export function createCache() {
  const values = new Map()
  const reservations = new Map()

  return {
    has(key) {
      return values.has(key)
    },
    peek(key) {
      return values.get(key)
    },
    put(key, value) {
      values.set(key, value)
    },
    drop(key) {
      values.delete(key)
    },

    /** True when a request is already looking this key up. */
    reserved(key) {
      return reservations.has(key)
    },
    holderOf(key) {
      return reservations.get(key)?.frame ?? null
    },

    /**
     * Reserve the key for `frame`. Returns the reservation, or null when
     * somebody else holds it - in which case this request waits rather than
     * taking a second one, and holds nothing to release.
     */
    begin(key, frame) {
      const held = reservations.get(key)
      reservations.set(key, { frame })
      return { key, id: nextId('rsv'), held }
    },

    /** The lookup found a value: the reservation has done its job. */
    settle(key) {
      reservations.delete(key)
    },

    /** The request is giving up: only this frame's reservation goes away. */
    release(reservation) {
      values.delete(reservation.key)
      reservations.delete(reservation.key)
    },
  }
}
