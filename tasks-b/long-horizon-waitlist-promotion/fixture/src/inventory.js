/**
 * The tickets themselves. A seat is either sold, reserved by an open offer
 * slot, or free; the count lives here so there is exactly one place that can
 * oversell the event.
 */
export class Inventory {
  constructor({ capacity, nextTicketId }) {
    this.capacity = capacity
    this.nextTicketId = nextTicketId
    this.tickets = new Map()   // ticketId -> memberId
    this.byMember = new Map()  // memberId -> ticketId
  }

  get sold() {
    return this.tickets.size
  }

  sell(memberId) {
    const ticketId = this.nextTicketId()
    this.tickets.set(ticketId, memberId)
    this.byMember.set(memberId, ticketId)
    return ticketId
  }

  release(ticketId) {
    const memberId = this.tickets.get(ticketId)
    if (memberId === undefined) return null
    this.tickets.delete(ticketId)
    this.byMember.delete(memberId)
    return memberId
  }

  has(ticketId) {
    return this.tickets.has(ticketId)
  }

  ticketOf(memberId) {
    return this.byMember.get(memberId) ?? null
  }
}
