/**
 * Who starts first when more jobs are due than the pools can take.
 *
 * The order has to be total: when a pool hands out its last free slot it does so
 * on the strength of this comparison, and two runs that are equal in every other
 * way still have to come out in a stable order.
 */
export function compareJobs(a, b) {
  const byPriority = (b.priority ?? 0) - (a.priority ?? 0)
  if (byPriority !== 0) return byPriority

  const bySeq = (a.seq ?? 0) - (b.seq ?? 0)
  if (bySeq !== 0) return bySeq

  const left = String(a.id)
  const right = String(b.id)
  return left < right ? -1 : left > right ? 1 : 0
}

export function orderJobs(jobs) {
  return jobs.slice().sort(compareJobs)
}
