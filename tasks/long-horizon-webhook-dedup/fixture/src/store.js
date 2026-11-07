/**
 * Delivery records.
 *
 * A provider retries until it gets a 2xx, so the same event arrives more than
 * once and sometimes out of order. Two rules make the intake safe:
 *
 *   1. an event id is processed once, ever — a second delivery is acknowledged
 *      and dropped
 *   2. an event older than the newest one already applied for the same subject
 *      is ignored, because it describes a state that has been superseded
 *
 * Both rules are decided by the store, not by the handler: the handler sees the
 * order of arrival and the store sees the order of events.
 */

/** What happened to a delivery. */
export const OUTCOME = {
  APPLIED: 'applied',
  DUPLICATE: 'duplicate',
  STALE: 'stale',
}

export class DeliveryStore {
  constructor() {
    /** event id -> the record we applied it as */
    this.seen = new Map()
    /** subject -> the instant of the newest applied event */
    this.latest = new Map()
  }

  /** Has this event id been applied before? */
  has(eventId) {
    return this.seen.has(eventId)
  }

  /** The newest instant applied for a subject, or null. */
  latestFor(subject) {
    return this.latest.get(subject) ?? null
  }

  /**
   * Record an applied event.
   *
   * The sequence is a number the provider increments per subject; a delivery
   * whose sequence is not greater than the newest one for that subject is
   * stale, however it is ordered by arrival.
   */
  record(event) {
    this.seen.set(event.id, event)
    const current = this.latest.get(event.subject)
    if (current === null || current === undefined || event.sequence > current) {
      this.latest.set(event.subject, event.sequence)
    }
    return this
  }

  /** How many distinct events have been applied. */
  get size() {
    return this.seen.size
  }
}
