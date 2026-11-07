/**
 * The audit writer.
 *
 * Audit entries are recorded while a request is being served and are written out
 * later, in order, when the writer is flushed. An entry is a fact about the span
 * that recorded it, so the span is captured when the entry is recorded - the
 * flush usually happens once the request that produced the entries is over.
 */
import { currentContext } from './context.js'

export function createAuditWriter({ events, clock } = {}) {
  const pending = []
  const written = []
  let recorded = 0

  return {
    /** Record an entry. Returns the entry as stored. */
    record(action, meta = {}) {
      recorded += 1
      const entry = {
        seq: recorded,
        action,
        meta: { ...meta },
        // Recorded while the request is running: this is the span the entry is
        // about, and the flush it is written by may happen long after.
        context: null,
      }
      pending.push(entry)
      return entry
    },

    /** Write every pending entry, oldest first. Returns what was written. */
    flush() {
      const batch = pending.splice(0, pending.length)
      for (const entry of batch) {
        const event = events?.emitWith(undefined, {
          name: 'audit.written',
          meta: { action: entry.action, seq: entry.seq, ...entry.meta },
        })
        if (event) written.push({ ...entry, at: event.at })
      }
      return batch
    },

    /** Number of entries recorded but not written. */
    get pending() {
      return pending.length
    },

    get written() {
      return written.map((w) => ({ ...w }))
    },
  }
}
