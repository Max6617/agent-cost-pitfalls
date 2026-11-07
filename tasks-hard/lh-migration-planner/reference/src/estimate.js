/**
 * Duration estimates.
 *
 * The number the release calendar publishes is the sum of the planner's own
 * numbers, so every term is an integer number of milliseconds. Nothing here
 * measures anything: the cost of a migration is a function of what it declares.
 */
import { DEFAULT_CONFIG } from './config.js'

/** Row work, charged in whole seconds and rounded up. */
export function rowsMs(step, config = DEFAULT_CONFIG) {
  if (!(step.rows > 0)) return 0
  return Math.ceil(step.rows / config.rowsPerSecond) * 1000
}

/**
 * What one step costs. Preparing the table is not part of this: it happens once
 * per table per plan, however many steps touch that table, so it is charged in
 * the plan's setup and never in a step.
 */
export function stepEstimateMs(step, config = DEFAULT_CONFIG) {
  return config.overheadMs
    + step.batches.length * config.batchOverheadMs
    + rowsMs(step, config)
}

/** Preparing a table happens once per table, whatever touches it. */
export function setupMs(steps, config = DEFAULT_CONFIG) {
  const tables = new Set()
  for (const step of steps) {
    if (step.table) tables.add(step.table)
  }
  return tables.size * config.tableSetupMs
}

/** `{ setupMs, stepsMs, totalMs }` for a list of steps. */
export function estimatePlan(steps, config = DEFAULT_CONFIG) {
  const stepsMs = steps.reduce((total, step) => total + stepEstimateMs(step, config), 0)
  const setup = setupMs(steps, config)
  return { setupMs: setup, stepsMs, totalMs: setup + stepsMs }
}
