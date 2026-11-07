/**
 * The job graph.
 *
 * A job is `{ name, needs, priority, explicit }`. `needs` names the jobs that
 * must finish first; a name that refers to nothing is a typo and is reported
 * rather than ignored, because a silently dropped dependency runs a job before
 * the thing it reads from is ready.
 */

/** Names referenced by `needs` that are not jobs in the list. */
export function missingDependencies(jobs) {
  const known = new Set(jobs.map((j) => j.name))
  const out = []
  for (const job of jobs) {
    for (const need of job.needs ?? []) if (!known.has(need)) out.push({ job: job.name, need })
  }
  return out
}

/**
 * Depth of a job: how many dependencies sit under it.
 *
 * The depth is what lets a scheduler that ignores priorities still produce an
 * order that never runs a job before something it depends on.
 */
export function depthOf(name, jobs, seen = new Set()) {
  const byName = new Map(jobs.map((j) => [j.name, j]))
  const job = byName.get(name)
  if (!job || seen.has(name)) return 0
  seen.add(name)
  const needs = job.needs ?? []
  if (!needs.length) return 0
  return 1 + Math.max(...needs.map((need) => depthOf(need, jobs, seen)))
}

/** Every job's depth, keyed by name. */
export function depths(jobs) {
  return new Map(jobs.map((job) => [job.name, depthOf(job.name, jobs)]))
}

/** A stable order with no dependencies violated, ignoring priorities. */
export function topological(jobs) {
  const byName = new Map(jobs.map((j) => [j.name, j]))
  const out = []
  const done = new Set()

  const visit = (name) => {
    if (done.has(name)) return
    const job = byName.get(name)
    if (!job) return
    done.add(name)
    for (const need of job.needs ?? []) visit(need)
    out.push(job)
  }

  for (const job of jobs) visit(job.name)
  return out
}
