/**
 * The planner.
 *
 * Planning is a pure function of what the tickets declare: read them, check that
 * the release can run at all, put them in order, size each step and add up the
 * time. Nothing here talks to a database and nothing here measures anything.
 */
import { expandBatches } from './batches.js'
import { loadConfig } from './config.js'
import { destructiveFindings, isDestructive } from './danger.js'
import { estimatePlan, stepEstimateMs } from './estimate.js'
import { findCycle, missingDependencies } from './graph.js'
import { lockFindings, lockWindowMs } from './locks.js'
import { normalizeAll } from './migrations.js'
import { orderMigrations } from './order.js'
import { rollbackPlan } from './rollback.js'

export const STATUSES = Object.freeze([
  'ok',
  'missing-dependency',
  'cycle',
  'unacknowledged-destructive',
])

const NO_ESTIMATE = Object.freeze({ setupMs: 0, stepsMs: 0, totalMs: 0 })

/** The configuration one call runs with. */
export function configFor(options = {}) {
  return { ...loadConfig(), ...(options.config ?? {}) }
}

/** A plan that carries no steps. */
function blocked(status, errors, extra = {}) {
  return {
    status,
    steps: [],
    skipped: [],
    resumedFrom: null,
    cycle: null,
    errors,
    warnings: [],
    estimate: { ...NO_ESTIMATE },
    rollback: { steps: [], skipped: [] },
    ...extra,
  }
}

/** Everything the planner knows about one migration, ready for the plan. */
function toStep(migration, config) {
  const step = {
    id: migration.id,
    requires: migration.requires,
    kind: migration.operation.kind,
    table: migration.operation.table ?? null,
    rows: migration.rows,
    batches: expandBatches(migration, config),
    destructive: isDestructive(migration),
    acknowledgement: migration.acknowledgement,
    reversible: migration.reversible,
  }
  step.lockMs = lockWindowMs(step, config)
  step.estimateMs = stepEstimateMs(step, config)
  return step
}

/**
 * The plan for a release, or the reason there is no plan.
 *
 * `options.config` overrides the checkout's configuration for this call and
 * `options.acknowledgements` signs off destructive operations for the whole
 * plan.
 */
export function planMigrations(migrations, options = {}) {
  const config = configFor(options)
  const declared = normalizeAll(migrations)

  // A dependency the planner cannot see is fatal before anything else is looked
  // at: an order computed around a missing migration is an order nobody can run.
  const missing = missingDependencies(declared)
  if (missing.length) {
    return blocked('missing-dependency', missing.map((entry) => ({
      code: 'missing-dependency',
      migration: entry.migration,
      detail: "requires '" + entry.missing + "', which is not declared",
    })))
  }

  const cycle = findCycle(declared)
  if (cycle) {
    return blocked('cycle', [{
      code: 'cycle',
      migration: cycle[0],
      detail: 'dependency cycle: ' + cycle.join(' -> '),
    }], { cycle })
  }

  const steps = orderMigrations(declared).map((migration) => toStep(migration, config))

  // A destructive step nobody signed off blocks the release; one that was signed
  // off is planned and listed, so the release notes can carry it.
  const danger = destructiveFindings(steps, options)
  if (danger.errors.length) return blocked('unacknowledged-destructive', danger.errors)

  const at = new Map(steps.map((step, index) => [step.id, index]))
  const warnings = [...danger.warnings, ...lockFindings(steps, config)]
    .sort((a, b) => at.get(a.migration) - at.get(b.migration))

  return {
    status: 'ok',
    steps,
    skipped: [],
    resumedFrom: null,
    cycle: null,
    errors: [],
    warnings,
    estimate: estimatePlan(steps, config),
    rollback: rollbackPlan(steps),
  }
}
