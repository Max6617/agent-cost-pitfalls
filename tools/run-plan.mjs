/**
 * run-plan.mjs - the runner's plan, extracted so it can be tested (tools/run-experiment.mjs is a
 * script: importing it starts a collection).
 *
 * Three things live here, all for the randomised-order re-run (notes/plans/RERUN-PLAN.md):
 *
 *  1. buildRunPlan - the (task, seed) blocks in queue order, each block's arms in execution order.
 *     Without `counterbalance` it is exactly the rule the runner always used (tools/arm-order.mjs
 *     armOrder, seeded on matrix | task | seed). With it, a two-arm matrix puts each arm first in
 *     exactly half the blocks (counterbalancedFirst), so the order effect cancels in the contrast and
 *     can be measured directly.
 *
 *  2. twinArms - the interleaved A/A. The one arm under test is duplicated under a second arm id
 *     (`<id>-twin`) with an identical treatment: same harness, patch, mode and prompt suffix. The arm
 *     id reaches only the run id and the synthetic credential (a header), never the request body, and
 *     in AA mode the workdir excludes it too (tools/aa-plans.mjs), so what the model sees is
 *     identical. The two copies then run inside one matrix, interleaved block by block, instead of as
 *     two back-to-back passes - which is what let the first A/A's second pass reuse the first pass's
 *     cache (hit share 93.3% -> 95.7%).
 *
 *  3. nextRunnable + workdirKey - the workdir lock. In AA mode both copies of a block use the SAME
 *     workdir path (that is the byte-identity rule), so they must never run at the same time: a
 *     worker takes the earliest queued item whose workdir is free, and an item whose twin is running
 *     waits. Outside AA mode every run has its own random workdir and the lock never blocks.
 */
import { armOrder, counterbalancedFirst, counterbalancedOrder } from './arm-order.mjs'

export const TWIN_SUFFIX = '-twin'

export function twinArms (arms) {
  if (arms.length !== 1) throw new Error('an A/A twin needs exactly one arm under test, got ' + arms.length)
  const [a] = arms
  return [a, { ...a, id: a.id + TWIN_SUFFIX, twinOf: a.id }]
}

export function buildRunPlan ({ tasks, seeds, arms, matrixId, counterbalance = false }) {
  const first = counterbalance
    ? counterbalancedFirst(tasks.flatMap((t) => Array.from({ length: seeds }, (_, i) => t + '|' + (i + 1))), matrixId)
    : null
  if (counterbalance && arms.length !== 2) throw new Error('counterbalancing needs exactly two arms, got ' + arms.length)
  const plan = []
  for (const task of tasks) {
    for (let seed = 1; seed <= seeds; seed++) {
      const order = counterbalance
        ? counterbalancedOrder(arms, first.get(task + '|' + seed))
        : armOrder(arms, matrixId, task, seed)
      order.forEach((arm, position) => {
        plan.push({
          task, arm: arm.id, harness: arm.harness, patch: arm.patch, mode: arm.mode,
          promptSuffix: arm.promptSuffix ?? null, seed, position,
          ...(counterbalance ? { counterbalanced: true } : {}),
          ...(arm.twinOf ? { twinOf: arm.twinOf } : {}),
        })
      })
    }
  }
  return plan
}

/** The key two runs share when they would use the same workdir; null when every run has its own. */
export function workdirKey (p, aaWorkdirMode) {
  return aaWorkdirMode ? p.harness + '|' + p.task + '|' + p.seed : null
}

/**
 * Remove and return the earliest queued item whose workdir is not in use, or null if every remaining
 * item waits on a running one (the caller then waits and asks again). Mutates `queue`.
 */
export function nextRunnable (queue, busy, keyOf) {
  const i = queue.findIndex((p) => { const k = keyOf(p); return k === null || !busy.has(k) })
  if (i < 0) return null
  return queue.splice(i, 1)[0]
}

/**
 * Retry a step that fails while Windows still holds a handle - the A/A's shared workdir.
 *
 * FOUND BY THE FIRST INTERLEAVED A/A SMOKE (2026-10-11). The second copy of a block starts the moment
 * the first finishes, and a process the harness spawned can keep the directory open for a few seconds
 * after the run returns: the twin's pre-run clean then failed with EPERM, and the pilot stopped the
 * matrix (correctly). The original A/A never hit this because its passes ran minutes apart. So the
 * clean is retried until the handle is released, and a handle that is NEVER released still fails - with
 * the last error, so the record says why.
 */
export async function retryUntil (fn, { attempts = 30, delayMs = 2000 } = {}) {
  let last = null
  for (let i = 1; i <= attempts; i++) {
    try { await fn(); return { attempts: i } } catch (e) { last = e }
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs))
  }
  const err = new Error(String(last?.message ?? last) + ' (after ' + attempts + ' attempts)')
  err.code = last?.code
  throw err
}
