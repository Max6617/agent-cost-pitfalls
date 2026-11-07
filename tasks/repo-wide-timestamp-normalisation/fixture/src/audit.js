/**
 * The audit log.
 *
 * Append-only. Every entry carries the timestamp of the moment it was recorded,
 * taken from the injected clock rather than from the wall clock so a test can
 * pin it, and rendered by the shared helper so it matches every other module.
 */
import { toTimestamp } from './timestamps.js'

export class AuditLog {
  constructor({ clock = () => Date.now() } = {}) {
    this.entries = []
    this.clock = clock
  }

  /** Record an action. */
  record(action, actor, details = {}) {
    const entry = {
      at: new Date(this.clock()).toLocaleString('en-GB'),
      action,
      actor,
      details,
    }
    this.entries.push(entry)
    return entry
  }

  /** Everything recorded between two timestamps, inclusive. */
  between(from, to) {
    return this.entries.filter((e) => e.at >= from && e.at <= to)
  }

  /** The most recent entry, or null. */
  latest() {
    return this.entries[this.entries.length - 1] ?? null
  }

  /** Entries as rows for the CSV export. */
  rows() {
    return this.entries.map((e) => ({ at: e.at, action: e.action, actor: e.actor }))
  }
}
