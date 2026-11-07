/**
 * The fulfilment service. The event log is the only state it holds; every
 * answer is derived by replaying the log in canonical order, so the order
 * events arrived in can never change an answer (docs/fulfilment-rules.md
 * section 1).
 */
import { canonicalOrder, normalizeEvent } from './event-log.js'
import { replayEvents } from './replay.js'
import { statusOf } from './lifecycle.js'
import { buildReport } from './report.js'

export class FulfilmentService {
  constructor({ stock = {} } = {}) {
    this.stock0 = { ...stock }
    this.log = []
    this.view = replayEvents([], this.stock0)
  }

  recompute() {
    this.view = replayEvents(canonicalOrder(this.log), this.stock0)
    return this.view
  }

  /** Record one event; returns `{ id, status }` for that envelope. */
  apply(event) {
    return this.applyAll([event])[0]
  }

  /** Record many; one result per event, in the order given. */
  applyAll(events = []) {
    const fresh = events.map((raw) => normalizeEvent(raw))
    for (const event of fresh) this.log.push(event)
    const view = this.recompute()
    return fresh.map((event) => ({
      id: event.id,
      status: view.envelopes.find((envelope) => envelope.event === event)?.status ?? 'unknown',
    }))
  }

  /** A snapshot of one order, or null if it was never created. */
  state(orderId) {
    const order = this.view.orders.get(String(orderId))
    if (!order) return null
    const items = {}
    for (const [sku, item] of [...order.items].sort(([a], [b]) => (a < b ? -1 : 1))) {
      items[sku] = {
        created: item.created,
        shipped: item.shipped,
        returned: item.returned,
        backordered: order.paid && !order.cancelled ? item.created - item.shipped : 0,
      }
    }
    return {
      order: order.id,
      status: statusOf(order),
      items,
      paid: order.paidAmount,
      refunded: order.refunded,
    }
  }

  /** Reconciliation after the first `through` canonical events (docs section 7). */
  report({ through = null } = {}) {
    return buildReport(this.log, this.stock0, through)
  }
}
