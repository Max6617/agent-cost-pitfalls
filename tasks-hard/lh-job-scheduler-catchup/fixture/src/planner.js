/**
 * The plan.
 *
 * `planRuns` answers the question the on-call rota asks: given everything this
 * job still owes, which instants is it going to be offered at, and when? The
 * lower bound is the watermark, not the tick instant, so a run that is overdue
 * but still owed is part of the plan.
 */
import { instantsBetween } from './schedule.js'

/**
 * @param {object} job the normalized job
 * @param {object} state the job's live state: `{ watermark, retryAt, attempt }`
 * @param {number} until the end of the planning window
 * @param {number} perJob how many entries this job may contribute
 * @returns {{ at: number, retry: boolean, attempt: number }[]} ascending
 */
export function planRuns(job, state, until, perJob = 3, offsets) {
  const limit = Math.max(0, Math.trunc(Number(perJob ?? 1)))
  if (!limit) return []
  return upcoming(job, state.watermark, until, limit, offsets)
    .map((at) => ({ at, retry: false, attempt: 1 }))
}

function upcoming(job, after, until, limit, offsets) {
  if (!(until > after)) return []
  const schedule = job.schedule
  if (schedule.kind === 'interval') {
    // Stepping from the frontier is cheaper than rebuilding the whole grid, and
    // the job runs every `everyMs` from now on anyway.
    const every = schedule.everyMs
    const out = []
    for (let at = after + every; at <= until && out.length < limit; at += every) out.push(at)
    return out
  }
  return instantsBetween(schedule, after, until, offsets).slice(0, limit)
}
