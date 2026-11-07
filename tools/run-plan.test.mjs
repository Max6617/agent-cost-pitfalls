/**
 * run-plan.test.mjs - the runner's plan: block order, counterbalancing, the A/A twin, the workdir lock.
 *
 * Run: node --test tools/run-plan.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRunPlan, twinArms, TWIN_SUFFIX, nextRunnable, workdirKey } from './run-plan.mjs'

const NATIVE = { id: 'dsh:native', harness: 'dsh', patch: 'shipped.yml', mode: 'native', promptSuffix: null }
const PTC = { id: 'dsh:ptc', harness: 'dsh', patch: 'shipped.yml', mode: 'ptc', promptSuffix: null }
const TASKS = Array.from({ length: 31 }, (_, i) => 'task-' + String(i).padStart(2, '0'))

test('without --counterbalance the plan is exactly the old one: every block, every arm, the shuffled order', () => {
  const plan = buildRunPlan({ tasks: ['a', 'b'], seeds: 2, arms: [NATIVE, PTC], matrixId: 'm' })
  assert.equal(plan.length, 2 * 2 * 2)
  for (const p of plan) assert.ok(p.position === 0 || p.position === 1)
  // blocks stay contiguous: the runner queues block by block
  assert.deepEqual(plan.map((p) => p.task + '|' + p.seed), ['a|1', 'a|1', 'a|2', 'a|2', 'b|1', 'b|1', 'b|2', 'b|2'])
})

test('--counterbalance: each arm leads in exactly half the blocks, and positions are 0/1 within a block', () => {
  const plan = buildRunPlan({ tasks: TASKS, seeds: 2, arms: [NATIVE, PTC], matrixId: 'rerun-b1-ds-full', counterbalance: true })
  assert.equal(plan.length, 31 * 2 * 2)
  const leads = plan.filter((p) => p.position === 0)
  assert.equal(leads.filter((p) => p.arm === 'dsh:ptc').length, 31)
  assert.equal(leads.filter((p) => p.arm === 'dsh:native').length, 31)
  for (const p of plan) assert.equal(p.counterbalanced, true)
})

test('--counterbalance refuses anything but two arms', () => {
  assert.throws(() => buildRunPlan({ tasks: TASKS, seeds: 2, arms: [NATIVE], matrixId: 'm', counterbalance: true }), /exactly two arms/)
})

test('the A/A twin is the same treatment under a second arm id, and nothing else differs', () => {
  const arms = twinArms([NATIVE])
  assert.equal(arms.length, 2)
  assert.equal(arms[1].id, 'dsh:native' + TWIN_SUFFIX)
  const { id: _a, ...a } = arms[0]
  const { id: _b, twinOf, ...b } = arms[1]
  assert.deepEqual(a, b, 'harness, patch, mode and prompt suffix must be identical')
  assert.equal(twinOf, 'dsh:native')
  assert.throws(() => twinArms([NATIVE, PTC]), /exactly one arm/)
})

test('a twin plan counterbalances which copy runs first', () => {
  const plan = buildRunPlan({ tasks: TASKS, seeds: 2, arms: twinArms([NATIVE]), matrixId: 'rerun-aa-ds-full', counterbalance: true })
  const leads = plan.filter((p) => p.position === 0)
  assert.equal(leads.filter((p) => p.arm === 'dsh:native').length, 31)
  assert.equal(leads.filter((p) => p.arm === 'dsh:native' + TWIN_SUFFIX).length, 31)
})

test('the workdir lock: an item whose AA workdir is busy is skipped, never run beside its twin', () => {
  const plan = buildRunPlan({ tasks: ['a', 'b'], seeds: 1, arms: twinArms([NATIVE]), matrixId: 'm', counterbalance: true })
  const queue = [...plan]
  const busy = new Set()
  const k = (p) => workdirKey(p, true)
  const first = nextRunnable(queue, busy, k)
  busy.add(k(first))
  const second = nextRunnable(queue, busy, k)
  assert.notEqual(second.task + '|' + second.seed, first.task + '|' + first.seed, 'the twin of a running item must wait')
  busy.add(k(second))
  assert.equal(nextRunnable(queue, busy, k), null, 'both remaining items are twins of running ones')
  busy.delete(k(first))
  const third = nextRunnable(queue, busy, k)
  assert.equal(third.task + '|' + third.seed, first.task + '|' + first.seed, 'released, the twin runs next')
})

test('outside AA mode the lock never blocks: workdirs are unique per run', () => {
  const queue = buildRunPlan({ tasks: ['a'], seeds: 1, arms: [NATIVE, PTC], matrixId: 'm' })
  const busy = new Set()
  const k = (p) => workdirKey(p, false)
  const a = nextRunnable(queue, busy, k)
  if (k(a)) busy.add(k(a))
  assert.ok(nextRunnable(queue, busy, k), 'the second arm of the block is free to start')
})

// ---- releasing a shared AA workdir (found by the first A/A smoke, 2026-10-11) -----------------

import { retryUntil } from './run-plan.mjs'

test('retryUntil: a cleanup that fails while a handle is held succeeds once it is released', async () => {
  let calls = 0
  const flaky = () => { calls++; if (calls < 3) { const e = new Error('EPERM, Permission denied'); e.code = 'EPERM'; throw e } }
  const r = await retryUntil(flaky, { attempts: 5, delayMs: 1 })
  assert.equal(r.attempts, 3)
  assert.equal(calls, 3)
})

test('retryUntil: a handle that is never released fails loudly, with the last error', async () => {
  const stuck = () => { throw Object.assign(new Error('EPERM, Permission denied'), { code: 'EPERM' }) }
  await assert.rejects(retryUntil(stuck, { attempts: 3, delayMs: 1 }), /EPERM.*after 3 attempts/)
})
