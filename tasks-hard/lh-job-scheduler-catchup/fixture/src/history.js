/**
 * The run history.
 *
 * One entry per attempt, in the order the scheduler took the decisions, plus one
 * entry per decision it took about a candidate that was not started. `finish`
 * stamps the outcome onto the entry of the attempt it belongs to, so a retried
 * run leaves one row per attempt rather than one row that keeps changing.
 */
import { toIso } from './time.js'

export function createHistory() {
  const entries = []

  return {
    append(fields) {
      const entry = {
        seq: entries.length + 1,
        status: 'unknown',
        reason: 'unknown',
        attempt: 0,
        ...fields,
      }
      if (entry.at !== undefined && entry.iso === undefined) entry.iso = toIso(entry.at)
      entries.push(entry)
      return entry
    },

    amend(seq, patch) {
      const entry = entries.find((candidate) => candidate.seq === seq)
      if (!entry) throw new RangeError('no history entry with seq ' + seq)
      Object.assign(entry, patch)
      return entry
    },

    list({ jobId, status, limit } = {}) {
      let out = entries
      if (jobId !== undefined) out = out.filter((entry) => entry.jobId === jobId)
      if (status !== undefined) out = out.filter((entry) => entry.status === status)
      if (Number.isFinite(limit)) out = out.slice(-Math.max(0, Math.trunc(limit)))
      return out.map((entry) => ({ ...entry }))
    },

    size() {
      return entries.length
    },
  }
}
