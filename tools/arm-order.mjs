/**
 * arm-order.mjs - the execution order of the arms within a (task, seed) block.
 *
 * WHY THIS IS ITS OWN MODULE. The rule lives in tools/run-experiment.mjs, which is a script: importing
 * it in a test would start a collection. The rule is the one thing about the runner that has already
 * produced a published defect and a half-finished repair, so it is extracted where it can be tested.
 *
 * THE DEFECT THIS FIXES. The order is a Fisher-Yates shuffle seeded by an FNV-1a hash of the seed
 * string. That string used to be `taskName + '|' + seed` - no matrix - so every matrix drew the SAME
 * permutation for a given (task, seed). Measured on the five tasks-b matrices: the assigned position is
 * identical in all five for all 320 (task, seed) blocks (DEFECT-position-standardisation-artefact-
 * 2026-10-09.md). Two consequences, and the second is the serious one:
 *
 *   1. the execution-order nuisance is SHARED by every matrix rather than independent between them, so
 *      it cannot average out across the study;
 *   2. no matrix can serve as an independent check on another, because they were all run in the same
 *      order.
 *
 * WHAT CHANGES. The seed string becomes `matrixId | task | seed`. Determinism is preserved - the same
 * three inputs give the same order, which is what makes a --resume reproducible - and two matrices now
 * draw independent permutations.
 *
 * FIXED FORWARD ONLY, and a matrix must not be SPLIT across this change. Every matrix on disk carries
 * the old assignment, and re-shuffling data that already exists would be rewriting evidence. For the
 * same reason a collection started under the old rule should be finished under it: the runner skips
 * already-done cells, so changing the rule mid-matrix would give the remaining cells a different
 * assignment from the completed ones, and `position` would stop meaning one thing within a matrix.
 */
import { makeRng, shuffleWith } from './rng.mjs'

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** FNV-1a over the matrix, the task and the seed. Exported so a test can assert the dependency. */
export function orderSeed (matrixId, taskName, seed) {
  let h = FNV_OFFSET
  const s = String(matrixId) + '|' + String(taskName) + '|' + String(seed)
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, FNV_PRIME) >>> 0 }
  return h >>> 0
}

/** The arms in execution order for one (matrix, task, seed) block. A permutation of `arr`. */
export function armOrder (arr, matrixId, taskName, seed) {
  return shuffleWith(arr, makeRng(orderSeed(matrixId, taskName, seed)))
}

/**
 * COUNTERBALANCED TWO-ARM ORDER, for the randomised-order re-run (notes/plans/RERUN-PLAN.md section 3).
 *
 * With two arms a per-block shuffle is a coin flip, and 62 coin flips can easily put one arm first in
 * 36 blocks and the other in 26 - an imbalance that leaves part of the order effect in the contrast.
 * Counterbalancing assigns "arm 0 first" to EXACTLY half the blocks of a matrix, choosing which half
 * with the matrix's own seeded stream. The order effect then cancels in the contrast and can be
 * estimated directly (ptc-first blocks against native-first blocks).
 *
 * `blockKeys` are "task|seed" strings. The keys are sorted before shuffling, so the assignment does not
 * depend on the order the caller lists them in, and the same (matrix, block set) always gives the same
 * assignment - which is what makes a --resume reproduce it. With an odd block count the extra block
 * goes to arm 1 first; the re-run's suites (62 and 80 blocks) are even.
 */
export function counterbalancedFirst (blockKeys, matrixId) {
  const keys = [...new Set(blockKeys)].sort()
  const order = shuffleWith(keys, makeRng(orderSeed(matrixId, '__counterbalance__', 0)))
  const half = Math.floor(order.length / 2)
  const first = new Map()
  order.forEach((k, i) => first.set(k, i < half ? 0 : 1))
  return first
}

/** The two arms in the order a counterbalanced block runs them: `firstIndex` names the one that leads. */
export function counterbalancedOrder (arms, firstIndex) {
  if (arms.length !== 2) throw new Error('counterbalancing needs exactly two arms, got ' + arms.length)
  return firstIndex === 0 ? [arms[0], arms[1]] : [arms[1], arms[0]]
}