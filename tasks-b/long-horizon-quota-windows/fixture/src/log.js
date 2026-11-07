/**
 * The per-key event log.
 *
 * Events arrive in whatever order the gateways happen to deliver them. The
 * log keeps the arrival order for auditing and answers the canonical order
 * the service replays in (docs/quota-rules.md section 2). Events that arrive
 * out of timestamp order are tracked in a side buffer, so the reconciler can
 * see how much of the stream needed reconciliation.
 */
export function compareEvents(a, b) {
  return a.at - b.at
}

export class EventLog {
  constructor() {
    this.events = []
    this.late = []
    this.maxAt = null
  }

  append(event) {
    if (this.maxAt !== null && event.at < this.maxAt) this.late.push(event)
    if (this.maxAt === null || event.at > this.maxAt) this.maxAt = event.at
    this.events.push(event)
  }

  /** Everything seen so far, in replay order. */
  canonical() {
    return [...this.events, ...this.late].sort(compareEvents)
  }

  size() {
    return this.events.length
  }
}
