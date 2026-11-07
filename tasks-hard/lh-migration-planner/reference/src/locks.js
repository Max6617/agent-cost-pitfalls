/**
 * Lock windows.
 *
 * A batch holds the write lock for as long as it runs, and the batches of one
 * step run one after another, so the longest a step can block its table for is
 * its batch count times the per-batch lock time. The release window has a budget
 * for that: a step that blows it does not stop the release, it tells the release
 * manager to widen the window.
 */
import { DEFAULT_CONFIG } from './config.js'

/** How long a step can hold the write lock. */
export function lockWindowMs(step, config = DEFAULT_CONFIG) {
  return step.batches.length * config.batchLockMs
}

/**
 * The steps that do not fit in the lock budget, in plan order.
 *
 * The budget is a budget, not a limit: a step that lands exactly on it fits, and
 * flagging it sends the release manager to widen a window that did not need it.
 */
export function lockFindings(steps, config = DEFAULT_CONFIG) {
  return steps
    .filter((step) => lockWindowMs(step, config) > config.lockBudgetMs)
    .map((step) => ({
      code: 'long-lock',
      migration: step.id,
      detail: lockWindowMs(step, config) + ' ms of write lock',
    }))
}
