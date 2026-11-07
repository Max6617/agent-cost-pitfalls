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

  const planned = []
  // A run waiting on a retry is owed too, and it is the earliest thing the job
  // will do, so it leads the job's share of the plan.
  if (state.retryAt !== null && state.retryAt !== undefined && state.retryAt <= until) {
    planned.push({ at: state.retryAt, retry: true, attempt: (state.attempt ?? 0) + 1 })
  }

  const room = limit - planned.length
  if (room > 0) {
    const slots = instantsBetween(job.schedule, state.watermark, until, offsets)
    for (const at of slots.slice(0, room)) planned.push({ at, retry: false, attempt: 1 })
  }
  return planned
}
