/**
 * Job definitions.
 *
 * A job spec is what an operator writes down; a job is what the scheduler runs.
 * Normalizing fills in every default from config/scheduler.config.json so the
 * rest of the code never has to ask whether a field is there.
 */
import { POLICIES } from './catchup.js'
import { validateSchedule } from './schedule.js'

export function normalizeJob(spec, config = {}) {
  if (!spec || typeof spec !== 'object') throw new TypeError('a job must be an object')
  if (typeof spec.id !== 'string' || !spec.id) throw new TypeError('a job needs an id')

  const schedule = validateSchedule(spec.schedule)
  const catchup = spec.catchup ?? config.defaultCatchup ?? 'all'
  if (!POLICIES.includes(catchup)) {
    throw new RangeError('unknown catchup policy ' + JSON.stringify(catchup))
  }

  return {
    id: spec.id,
    pool: typeof spec.pool === 'string' && spec.pool ? spec.pool : 'default',
    priority: integer(spec.priority, 0),
    seq: integer(spec.seq, 0),
    enabled: spec.enabled !== false,
    catchup,
    misfireAfterMs: integer(spec.misfireAfterMs, integer(config.defaultMisfireAfterMs, 0)),
    maxAttempts: integer(spec.maxAttempts, integer(config.defaultMaxAttempts, 1)),
    backoffMs: integer(spec.backoffMs, integer(config.defaultBackoffMs, 30000)),
    maxBackoffMs: integer(spec.maxBackoffMs, integer(config.maxBackoffMs, 600000)),
    schedule: { ...schedule },
  }
}

function integer(value, fallback) {
  const n = Number(value)
  if (Number.isFinite(n) && n >= 0) return Math.trunc(n)
  return fallback
}
