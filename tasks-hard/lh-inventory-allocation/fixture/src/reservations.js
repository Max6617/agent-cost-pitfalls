/**
 * The reservation registry.
 *
 * A reservation is a promise to a customer that a number of units of one shelf
 * will not be sold to anybody else until its deadline. The registry stores the
 * promises; the question "how much of this shelf is promised at this instant?"
 * is answered by replaying them, never from a counter that a background job has
 * to keep up to date.
 */
import { requireInstant, toIso } from './clock.js'
import { expiryOf, isExpired } from './expiry.js'
import { createSequence } from './util/ids.js'

export const RESERVATION_STATUSES = ['active', 'released', 'cancelled', 'expired', 'shipped']

export function createReservationRegistry() {
  const byId = new Map()
  const ids = createSequence('rs-', 4)

  return {
    create({ orderId, sku, warehouse, qty, channel = null, priority = null, expiresAt = null, at, reason = null }) {
      const reservation = {
        id: ids.next(),
        orderId,
        sku,
        warehouse,
        qty,
        channel,
        priority,
        expiresAt,
        createdAt: toIso(at),
        status: 'active',
        closedAt: null,
        reason,
      }
      byId.set(reservation.id, reservation)
      return reservation
    },

    get(id) {
      return byId.get(id) ?? null
    },

    all() {
      return [...byId.values()]
    },

    forOrder(orderId) {
      return [...byId.values()].filter((r) => String(r.orderId) === String(orderId))
    },

    forShelf(warehouse, sku) {
      return [...byId.values()].filter((r) => r.warehouse === warehouse && r.sku === sku)
    },

    close(id, status, at, reason = null) {
      const reservation = byId.get(id)
      if (!reservation) return null
      reservation.status = status
      reservation.closedAt = toIso(at)
      reservation.reason = reason
      return reservation
    },

    /**
     * Units promised on one shelf at one instant.
     *
     * Replayed from the holds every time, so a release is visible to the next
     * caller without anything having to be rebuilt.
     */
    heldUnits(warehouse, sku, at = null) {
      let total = 0
      for (const reservation of byId.values()) {
        if (reservation.warehouse !== warehouse || reservation.sku !== sku) continue
        if (reservation.status !== 'active') continue
        // Holds whose deadline has passed are marked by expireDue(); this read
        // stays on the stored status so the pick line can be served from the
        // hot path without touching the clock for every hold on the shelf.
        total += reservation.qty
      }
      return total
    },

    /**
     * The reconciliation job's view: mark every hold whose deadline has passed.
     * Nothing depends on this having run — it exists so the console can show a
     * hold as expired rather than as still active.
     */
    expireDue({ at } = {}) {
      requireInstant(at, 'expireDue')
      let marked = 0
      for (const reservation of byId.values()) {
        if (reservation.status !== 'active') continue
        if (!isExpired(reservation, at)) continue
        this.close(reservation.id, 'expired', at)
        marked += 1
      }
      return marked
    },

    /** Holds that are still holding stock at `at`. */
    live(at) {
      requireInstant(at, 'live')
      return [...byId.values()].filter((r) => r.status === 'active' && !isExpired(r, at))
    },

    deadlineFor(instant, ttlMs) {
      return expiryOf(instant, ttlMs)
    },
  }
}
