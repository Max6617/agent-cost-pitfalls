/**
 * Offers and the slots they promote.
 *
 * A cancelled ticket frees a seat; while the waitlist is non-empty the seat is
 * held in a "slot" and offered down the waitlist, one member at a time, with a
 * TTL on each offer. A slot remembers everyone who already passed on it -
 * declined it or let it lapse - so the same seat is never offered to the same
 * member twice. A slot nobody can take is closed and its seat goes back on
 * general sale.
 */
export class OfferDesk {
  constructor({ offerTtl, nextOfferId }) {
    this.offerTtl = offerTtl
    this.nextOfferId = nextOfferId
    this.slots = new Map()   // slotId -> { skips: Set<memberId>, offerId }
    this.offers = new Map()  // offerId -> { offerId, slotId, memberId, expiresAt, status }
    this.nextSlotId = 1
  }

  /** Seats currently held out of general sale by an open slot. */
  get openSlots() {
    return this.slots.size
  }

  holdingOffer(memberId) {
    for (const offer of this.offers.values()) {
      if (offer.memberId === memberId && offer.status === 'pending') return offer
    }
    return null
  }

  offerFor(memberId) {
    const offer = this.holdingOffer(memberId)
    return offer ? { offerId: offer.offerId, expiresAt: offer.expiresAt } : null
  }

  offerById(offerId) {
    return this.offers.get(offerId) ?? null
  }

  /** The entry a slot is offered to: the head of the waitlist that can still take it. */
  #nextEligible(queue, slot) {
    const eligible = queue
      .ordered()
      .filter((entry) => !slot.skips.has(entry.memberId) && !this.holdingOffer(entry.memberId))
    // positions are 1-based; position 1 is the head of the waitlist
    return eligible.at(0) ?? null
  }

  #openOffer(slotId, memberId, now) {
    const offerId = this.nextOfferId()
    const offer = { offerId, slotId, memberId, expiresAt: now + this.offerTtl, status: 'pending' }
    this.offers.set(offerId, offer)
    this.slots.get(slotId).offerId = offerId
    return offer
  }

  /** Offer a freed seat to the waitlist, if anyone can take it. */
  openSlot(queue, now) {
    const slotId = `slot-${this.nextSlotId++}`
    this.slots.set(slotId, { skips: new Set(), offerId: null })
    const entry = this.#nextEligible(queue, this.slots.get(slotId))
    if (!entry) {
      this.slots.delete(slotId)
      return null
    }
    return this.#openOffer(slotId, entry.memberId, now)
  }

  /** Move a slot on to the next entry after its offer ended. */
  #reoffer(slotId, queue, now) {
    const entry = this.#nextEligible(queue, this.slots.get(slotId))
    if (!entry) {
      this.slots.delete(slotId)
      return null
    }
    return this.#openOffer(slotId, entry.memberId, now)
  }

  /** Reclaim every offer whose TTL has lapsed; the member keeps their place. */
  reclaimExpired(queue, now) {
    for (const offer of [...this.offers.values()]) {
      if (offer.status !== 'pending' || now < offer.expiresAt) continue
      offer.status = 'expired'
      this.slots.get(offer.slotId).skips.add(offer.memberId)
      this.#reoffer(offer.slotId, queue, now)
    }
  }

  accept(offerId) {
    const offer = this.offers.get(offerId)
    if (!offer) return { status: 'unknown-offer' }
    if (offer.status !== 'pending') return { status: offer.status }
    offer.status = 'accepted'
    this.slots.delete(offer.slotId)
    return { status: 'accepted', memberId: offer.memberId }
  }

  decline(offerId, queue, now) {
    const offer = this.offers.get(offerId)
    if (!offer) return { status: 'unknown-offer' }
    if (offer.status !== 'pending') return { status: offer.status }
    offer.status = 'declined'
    this.slots.get(offer.slotId).skips.add(offer.memberId)
    queue.noteDecline(offer.memberId)
    this.#reoffer(offer.slotId, queue, now)
    return { status: 'declined' }
  }
}
