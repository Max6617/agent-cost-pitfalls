/**
 * Hold queues, one per title.
 *
 * Queue order is member class first (staff, then students, then standard),
 * and inside one class the member who has waited longest comes first. A hold
 * is placed on a title, not a copy: the first copy of the title to come back
 * readies the first waiting hold in the queue.
 */
export class Holds {
  constructor(members) {
    this.members = members
    this.holds = new Map()
    this.nextId = 1
  }

  place(titleId, memberId, placedAt) {
    const hold = { id: `H-${this.nextId++}`, titleId, memberId, placedAt, status: 'waiting' }
    this.holds.set(hold.id, hold)
    return hold
  }

  byId(holdId) {
    return this.holds.get(holdId) ?? null
  }

  cancel(holdId) {
    const hold = this.byId(holdId)
    if (!hold || hold.status === 'cancelled' || hold.status === 'fulfilled') return false
    hold.status = 'cancelled'
    return true
  }

  /** Active holds on a title: waiting for a copy, or ready and awaiting pickup. */
  activeFor(titleId) {
    return [...this.holds.values()].filter(
      (h) => h.titleId === titleId && (h.status === 'waiting' || h.status === 'ready'),
    )
  }

  /** The queue for a title, in the order copies will be offered. */
  queue(titleId) {
    return this.activeFor(titleId).sort((a, b) => this.compare(a, b))
  }

  compare(a, b) {
    const rank = this.members.rankOf(a.memberId) - this.members.rankOf(b.memberId)
    if (rank !== 0) return rank
    if (a.placedAt !== b.placedAt) return a.placedAt < b.placedAt ? 1 : -1
    return a.id < b.id ? -1 : 1
  }
}
