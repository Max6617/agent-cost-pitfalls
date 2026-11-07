/**
 * Who starts first when more jobs are due than the pools can take.
 *
 * The order has to be total: when a pool hands out its last free slot it does so
 * on the strength of this comparison, and two runs that are equal in every other
 * way still have to come out in a stable order.
 */
export function compareJobs(a, b) {
  return (b.priority ?? 0) - (a.priority ?? 0)
}

export function orderJobs(jobs) {
  return jobs.slice().sort(compareJobs)
}
