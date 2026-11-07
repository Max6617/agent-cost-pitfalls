/**
 * retention-pilot.test.mjs - the pilot's per-arm retention statistic.
 *
 * Run: node --test tools/retention-pilot.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { perArmRetention } from './prefix-retention.mjs'

test('perArmRetention groups by arm and task, and bootstraps over tasks', () => {
  const rows = []
  for (let t = 0; t < 6; t++) for (const arm of ['opencode-anthropic', 'cline-anthropic']) {
    rows.push({ arm, task: 'task-' + t, meanRetention: arm === 'opencode-anthropic' ? 0.99 : 0.5 })
  }
  const out = perArmRetention(rows, { iters: 2000, seed: 1 })
  assert.equal(out.length, 2)
  const oc = out.find((a) => a.arm === 'opencode-anthropic')
  const cl = out.find((a) => a.arm === 'cline-anthropic')
  assert.equal(oc.tasks, 6)
  assert.ok(Math.abs(oc.meanRetention - 0.99) < 1e-9)
  assert.ok(Math.abs(cl.meanRetention - 0.5) < 1e-9)
  assert.ok(oc.ciLo <= oc.meanRetention && oc.meanRetention <= oc.ciHi)
  assert.ok(cl.ciLo <= cl.meanRetention && cl.meanRetention <= cl.ciHi)
})

test('perArmRetention averages seeds within a task before bootstrapping', () => {
  const rows = [
    { arm: 'a', task: 't1', meanRetention: 0.2 }, { arm: 'a', task: 't1', meanRetention: 0.8 },
    { arm: 'a', task: 't2', meanRetention: 0.5 },
  ]
  const out = perArmRetention(rows, { iters: 1000, seed: 1 })
  assert.ok(Math.abs(out[0].meanRetention - 0.5) < 1e-9, 't1 averages to 0.5, t2 is 0.5')
  assert.equal(out[0].tasks, 2)
  assert.equal(out[0].runs, 3)
})

test('a single task yields no interval rather than a fake one', () => {
  const out = perArmRetention([{ arm: 'a', task: 't1', meanRetention: 0.7 }], { iters: 100, seed: 1 })
  assert.equal(out[0].tasks, 1)
  assert.equal(out[0].ciLo, null)
  assert.equal(out[0].ciHi, null)
})
