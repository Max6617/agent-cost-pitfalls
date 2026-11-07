import { depths, missingDependencies } from './graph.js'

/**
 * The batch plan.
 *
 * Two rules decide the order, and they are not the same rule:
 *
 *   1. A job never runs before anything in its `needs`. This is a hard
 *      constraint and it holds however the priorities fall out.
 *   2. Among the jobs that are allowed to run, a higher priority goes first,
 *      and jobs with the same priority keep the order the operator wrote them
 *      in.
 *
 * The second rule is what makes a plan reviewable: two runs of the same input
 * produce the same plan, and an operator can reorder the list to change it.
 */

/**
 * Order a job list into an executable plan.
 *
 * @param {{ name: string, needs?: string[], priority?: number }[]} jobs
 * @returns {{ plan: string[], unknown: {job:string,need:string}[], cycle: string[] }}
 */
export function planOrder(jobs) {
  const unknown = missingDependencies(jobs)

  const names = new Set(jobs.map((j) => j.name))
  const byName = new Map(jobs.map((j) => [j.name, j]))
  const depth = depths(jobs)
  const index = new Map(jobs.map((j, i) => [j.name, i]))

  const ready = []
  const placed = new Set()
  const plan = []

  const blockedBy = (job) => (job.needs ?? []).filter((need) => names.has(need) && !placed.has(need))

  // Priority first, then the order the operator wrote, then depth. Depth is the
  // tie-breaker rather than the leader: it only decides between jobs that the
  // operator gave the same priority.
  const queue = [...jobs]
  while (queue.length) {
    const candidates = queue.filter((job) => blockedBy(job).length === 0)
    if (!candidates.length) break

    candidates.sort((a, b) => {
      const pa = a.priority ?? 0
      const pb = b.priority ?? 0
      if (pa !== pb) return pb - pa
      const da = depth.get(a.name) ?? 0
      const db = depth.get(b.name) ?? 0
      if (da !== db) return da - db
      return index.get(a.name) - index.get(b.name)
    })

    const next = candidates[0]
    placed.add(next.name)
    plan.push(next.name)
    queue.splice(queue.indexOf(next), 1)
    ready.push(next.name)
  }

  return { plan, unknown, cycle: queue.map((j) => j.name) }
}

/** The plan, or a thrown explanation when the graph cannot be ordered. */
export function mustPlan(jobs) {
  const result = planOrder(jobs)
  if (result.cycle.length) {
    throw new Error('dependency cycle among: ' + result.cycle.join(', '))
  }
  return result.plan
}

/** Group a plan into waves that could run concurrently. */
export function waves(jobs) {
  const order = mustPlan(jobs)
  const byName = new Map(jobs.map((j) => [j.name, j]))
  const level = new Map()
  const out = []

  for (const name of order) {
    const job = byName.get(name)
    const needs = (job.needs ?? []).filter((need) => level.has(need))
    const l = needs.length ? Math.max(...needs.map((need) => level.get(need))) + 1 : 0
    level.set(name, l)
    if (!out[l]) out[l] = []
    out[l].push(name)
  }

  return out.map((wave) => [...wave].sort())
}
