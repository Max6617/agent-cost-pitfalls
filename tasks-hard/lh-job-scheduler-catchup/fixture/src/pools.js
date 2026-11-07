/**
 * Pools.
 *
 * A pool is a named budget of runs in flight. The scheduler asks the pool for
 * capacity before it starts anything and hands the slot back when the run
 * finishes, so the budget is a property of the pool, not of whoever is using it.
 */
export function poolLimit(config, name) {
  const configured = config?.pools?.[name]
  if (Number.isFinite(configured) && configured >= 0) return Math.trunc(configured)
  const fallback = config?.defaultPoolLimit
  return Number.isFinite(fallback) && fallback >= 0 ? Math.trunc(fallback) : 1
}

export function createPools(config, jobs = []) {
  const pools = new Map()

  const register = (job) => {
    const pool = { name: job.pool, limit: poolLimit(config, job.pool), running: new Set() }
    pools.set(job.id, pool)
    return pool
  }

  const api = {
    register,
    /** The pool a job belongs to; registers it on first sight. */
    get(job) {
      return pools.get(job.id) ?? register(job)
    },
    hasCapacity(pool) {
      return pool.running.size < pool.limit
    },
    acquire(pool, jobId) {
      pool.running.add(jobId)
      return pool.running.size
    },
    release(pool, jobId) {
      pool.running.delete(jobId)
      return pool.running.size
    },
    inFlight(job) {
      return api.get(job).running.size
    },
  }

  for (const job of jobs) register(job)
  return api
}
