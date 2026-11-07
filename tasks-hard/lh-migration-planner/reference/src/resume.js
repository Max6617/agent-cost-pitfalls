/**
 * Applying a plan, and picking it up again after it stops.
 *
 * The runner applies one step at a time and writes down what it got through. A
 * run that dies half way is resumed from that record rather than from the
 * beginning, because re-running a step that already succeeded is as bad as
 * skipping one that never ran.
 */
import { estimatePlan } from './estimate.js'
import { configFor, planMigrations } from './planner.js'
import { rollbackPlan } from './rollback.js'

/**
 * Walk the plan the way the runner does and return what it recorded.
 *
 * `options.failAt` names the step that fails: everything before it completed,
 * it did not. With no `failAt` the whole plan applies.
 */
export function applyPlan(plan, options = {}) {
  const failAt = options.failAt ?? null
  const applied = []
  let failed = null

  for (const step of plan.steps) {
    if (failAt !== null && step.id === failAt) {
      failed = step.id
      break
    }
    applied.push(step.id)
  }
  return { applied, failed }
}

/**
 * The plan for the work that is left.
 *
 * The declared migrations are re-planned in full - the dependencies of the
 * remaining steps are still in the release - and then everything the record says
 * has run is taken out of the plan. The step the run died on never completed, so
 * it stays in: dropping it is how a release ends up missing a migration nobody
 * noticed was never applied.
 */
export function resumeFrom(record, migrations, options = {}) {
  const plan = planMigrations(migrations, options)
  const applied = record?.applied ?? []
  const done = new Set(applied)

  const skipped = plan.steps.filter((step) => done.has(step.id)).map((step) => step.id)
  const steps = plan.steps.filter((step) => !done.has(step.id))

  return {
    ...plan,
    steps,
    skipped,
    resumedFrom: record ?? null,
    estimate: estimatePlan(steps, configFor(options)),
    rollback: rollbackPlan(steps),
  }
}
