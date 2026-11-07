/**
 * The per-key event log.
 *
 * Events arrive in whatever order the gateways happen to deliver them. The
 * log keeps the arrival order for auditing and answers the canonical order
 * the service replays in (docs/quota-rules.md section 2): ascending
 * timestamp, ties broken by id. Arrival order never shows through a replay.
 */
export function compareEvents(a, b) {
  if (a.at !== b.at) return a.at - b.at
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
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
    return [...this.events].sort(compareEvents)
  }

  size() {
    return this.events.length
  }
}
