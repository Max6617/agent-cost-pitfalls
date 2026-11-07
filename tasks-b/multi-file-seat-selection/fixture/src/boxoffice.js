/**
 * boxoffice.js - the service the front of house talks to.
 *
 * Everything here takes `now` from the caller: the kiosk passes its session
 * clock, the batch expiry job passes its sweep time, the tests pass whatever
 * they like. Nothing in this module reads the wall clock.
 */
import { parseSeat, seatLabel } from './labels.js'
import { isContiguous } from './venue.js'
import { createHoldStore } from './holds.js'
import { allocate } from './allocator.js'

export function createBoxOffice(venue, store = createHoldStore()) {
  return {
    venue,
    holds: store,

    /** The best block for a group, per the rules in docs/seating-rules.md. */
    requestGroup(request, now) {
      return allocate(venue, store, request, now)
    },

    /** Reserve an explicit block of seats for `ttl` minutes. */
    placeHold({ id, seats, ttl } = {}, now) {
      if (!id || !Array.isArray(seats) || seats.length === 0 || !Number.isInteger(ttl) || ttl < 1) {
        return { status: 'invalid-request' }
      }
      const parsed = seats.map(parseSeat)
      if (parsed.some((p) => p === null)) return { status: 'unknown-seat' }
      const rowId = parsed[0].row
      const row = venue.rows.find((r) => r.id === rowId)
      if (!row) return { status: 'unknown-seat' }
      if (parsed.some((p) => p.row !== rowId)) return { status: 'not-contiguous' }
      const ns = parsed.map((p) => p.n)
      if (ns.some((n) => !row.seats.some((s) => s.n === n))) return { status: 'unknown-seat' }
      if (new Set(ns).size !== ns.length) return { status: 'invalid-request' }
      if (!isContiguous(row, ns)) return { status: 'not-contiguous' }
      const labels = [...ns].sort((a, b) => a - b).map((n) => seatLabel(rowId, n))
      const blocked = store.blockedSeats(now)
      if (labels.some((l) => blocked.has(l))) return { status: 'conflict' }
      return store.place({ id, seats: labels, ttl }, now)
    },

    confirmHold(id, now) {
      return store.confirm(id, now)
    },

    releaseHold(id) {
      return store.release(id)
    },

    activeHolds(now) {
      return store.activeHolds(now)
    },

    blockedSeats(now) {
      return store.blockedSeats(now)
    },
  }
}
