/**
 * Which of a job's missed runs are honoured.
 *
 * `selectRuns` is the whole of the catch-up policy: it splits the candidates
 * that survived the misfire check into the ones to start - in the order they
 * will be offered to the pool - and the ones that settle without running.
 */
export const POLICIES = ['all', 'last', 'none']

export function isPolicy(value) {
  return POLICIES.includes(value)
}

/**
 * @param {object} job the normalized job, for its `catchup` policy
 * @param {number[]} candidates scheduled instants, ascending, all on time
 * @returns {{ start: number[], settled: { at: number, status: string, reason: string }[] }}
 */
export function selectRuns(job, candidates) {
  if (!candidates.length) return { start: [], settled: [] }
  const policy = isPolicy(job.catchup) ? job.catchup : 'all'
  const newest = candidates[candidates.length - 1]
  const older = candidates.slice(0, -1)

  // The newest slot is the one worth running; what happens to the rest is what
  // the policy is for.
  if (policy === 'none') {
    return {
      start: [newest],
      settled: older.map((at) => ({ at, status: 'dropped', reason: 'catchup-none' })),
    }
  }
  return { start: candidates.slice(), settled: [] }
}
