/**
 * status-merge.mjs - how the pipeline status file is updated, in one testable place.
 *
 * WHY IT IS A MODULE. writeStatus merged every patch into whatever was already in the file, so any
 * key a later patch did not mention survived forever. During the hard-suite pilot the entry read
 * stage: matrix, spendUsd: 0 - and also provider: anthropic-sonnet, records: 620, cells: 620,
 * solved: 618, which are the SONNET matrix's final numbers from an earlier run. Anyone watching the
 * pilot saw a run with 620 records and 618 solves that had written nothing.
 *
 * THE RULE. A different matrixId is a run boundary: the new run starts from an empty object, so every
 * run-scoped number disappears at exactly the moment it stops being true. Same matrixId keeps the
 * merge, which incremental updates need.
 */

/** Keys that are run-scoped and must never survive a matrixId change. Implicit: clearing everything. */
export function mergeStatus (cur, patch, at = new Date().toISOString()) {
  const prev = cur && typeof cur === 'object' ? cur : {}
  const inbound = patch && typeof patch === 'object' ? patch : {}
  // A new run never inherits the last run's numbers. failedStage is cleared on every write: a
  // previous failure must not sit in the file through a matrix that is running perfectly.
  const sameRun = !prev.matrixId || !inbound.matrixId || prev.matrixId === inbound.matrixId
  const base = sameRun ? prev : {}
  return { ...base, failedStage: null, ...inbound, at }
}
