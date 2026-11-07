import { createSequence } from './ids.js'
import { Inventory } from './inventory.js'
import { OfferDesk } from './offers.js'
import { Waitlist } from './queue.js'

/**
 * The ticketing service for one event.
 *
 * Every command carries the current time; nothing in here reads a clock.
 * Time moves when a command carries it: an offer whose expiry has passed is
 * reclaimed as part of the next command, before that command runs.
 */
export class TicketingService {
  constructor({ capacity = 1, offerTtl = 60000 } = {}) {
    this.waitlist = new Waitlist()
    this.inventory = new Inventory({ capacity, nextTicketId: createSequence('T') })
    this.desk = new OfferDesk({ offerTtl, nextOfferId: createSequence('O') })
  }

  #advance(now) {
    // a lapsed offer frees its seat whether or not anyone is waiting
    this.desk.reclaimExpired(this.waitlist, now)
  }

  /** Buy a ticket outright. Only possible while nobody is waiting. */
  purchase(memberId, now) {
    this.#advance(now)
    if (!this.waitlist.isEmpty()) return { status: 'full' }
    if (this.inventory.sold + this.desk.openSlots >= this.inventory.capacity) return { status: 'full' }
    return { status: 'sold', ticketId: this.inventory.sell(memberId) }
  }

  join(memberId, tier, now) {
    this.#advance(now)
    return this.waitlist.join(memberId, tier)
  }

  leave(memberId, now) {
    this.#advance(now)
    return this.waitlist.leave(memberId)
  }

  /** Cancel a sold ticket; the freed seat is offered to the waitlist. */
  cancel(ticketId, now) {
    this.#advance(now)
    if (!this.inventory.has(ticketId)) return { status: 'unknown-ticket' }
    this.inventory.release(ticketId)
    if (this.waitlist.isEmpty()) return { status: 'cancelled', offer: null }
    const offer = this.desk.openSlot(this.waitlist, now)
    return {
      status: 'cancelled',
      offer: offer ? { offerId: offer.offerId, memberId: offer.memberId, expiresAt: offer.expiresAt } : null,
    }
  }

  accept(offerId, now) {
    this.#advance(now)
    const result = this.desk.accept(offerId)
    if (result.status !== 'accepted') return result
    this.waitlist.leave(result.memberId)
    return { status: 'accepted', ticketId: this.inventory.sell(result.memberId) }
  }

  decline(offerId, now) {
    this.#advance(now)
    return this.desk.decline(offerId, this.waitlist, now)
  }

  /** 1-based position in the waitlist, or null when not waiting. */
  positionOf(memberId) {
    return this.waitlist.positionOf(memberId)
  }

  /** The pending offer a member holds, or null. */
  offerFor(memberId) {
    return this.desk.offerFor(memberId)
  }

  ticketOf(memberId) {
    return this.inventory.ticketOf(memberId)
  }
}
