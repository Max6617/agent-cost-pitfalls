/**
 * The audit trail.
 *
 * One record per run, written once, at the end. The record is what the on-call
 * reads at 3am: it has to say whether the request succeeded, failed or was
 * cancelled, and - for a cancellation - which stage stopped, because "the
 * customer was not charged" and "the request died somewhere in the gateway" are
 * very different pages. See docs/pipeline-policy.md section 4.
 *
 * Nothing here is ever rolled back. Undoing bookkeeping is how a run becomes
 * invisible.
 */
export function createAuditLog() {
  const records = []

  return {
    all() {
      return records.slice()
    },
    ofKind(kind) {
      return records.filter((r) => r.kind === kind)
    },
    last() {
      return records[records.length - 1] ?? null
    },
    /**
     * Append the record for a cancelled run. `reason` is the abort cause and
     * `stage` the stage that observed it.
     */
    cancel(reason, stage) {
      const record = { kind: 'cancelled', reason, stage: stage ?? null }
      records.push(record)
      return record
    },
    deny(reason) {
      const record = { kind: 'denied', reason }
      records.push(record)
      return record
    },
    fail(kind, message) {
      const record = { kind, message }
      records.push(record)
      return record
    },
    complete(result) {
      const record = {
        kind: 'completed',
        ref: result.ref,
        reused: result.reused,
        calls: result.attempts,
        response: result.response,
      }
      records.push(record)
      return record
    },
  }
}
