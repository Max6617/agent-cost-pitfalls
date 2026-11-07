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

/** What one step costs, table preparation included. */
export function stepEstimateMs(step, config = DEFAULT_CONFIG) {
  return config.overheadMs
    + step.batches.length * config.batchOverheadMs
    + rowsMs(step, config)
    + (step.table ? config.tableSetupMs : 0)
}

/** Preparing a table is part of every step that has a table to prepare. */
export function setupMs(steps, config = DEFAULT_CONFIG) {
  return steps.filter((step) => step.table).length * config.tableSetupMs
}

/** `{ setupMs, stepsMs, totalMs }` for a list of steps. */
export function estimatePlan(steps, config = DEFAULT_CONFIG) {
  const stepsMs = steps.reduce((total, step) => total + stepEstimateMs(step, config), 0)
  const setup = setupMs(steps, config)
  return { setupMs: setup, stepsMs, totalMs: setup + stepsMs }
}
