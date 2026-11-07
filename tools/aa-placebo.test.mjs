/**
 * aa-placebo.test.mjs - the A/A placebo's plan and its byte-identity rule.
 *
 * WRITTEN BEFORE THE IMPLEMENTATION. The corrected placebo (REVIEW-4 objection 9 / limitation 9)
 * is a repeated baseline: the SAME arm collected twice. The old "placebo" failed because two
 * differently-named arms put the arm id into the working-directory string the model sees (30 + 20
 * bytes, measured). The rule this file pins: in AA mode the workdir is a deterministic function of
 * (harness, task, seed) with NO arm id, NO matrix id and NO random suffix, so the two passes see
 * the identical string.
 *
 * Run: node --test tools/aa-placebo.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { AA_PLANS, AA_ARM, aaCells, aaWorkdir } from './aa-plans.mjs'

test('the A/A plan is one arm, two seeds, two passes, and 124 cells', () => {
  const p = AA_PLANS.aaplacebo
  assert.ok(p, 'the aaplacebo plan must exist')
  assert.deepEqual(p.armsList, [AA_ARM], 'exactly one arm')
  assert.equal(AA_ARM, 'dsh:native')
  assert.equal(p.tasks, 31)
  assert.equal(p.seeds, 2)
  assert.equal(p.passes, 2)
  assert.equal(aaCells(p), 124, '31 tasks x 1 arm x 2 seeds x 2 passes')
  assert.equal(p.aaWorkdir, true, 'the plan must use the deterministic workdir')
})

test('the smoke plan is the cheapest task, both seeds, both passes', () => {
  const p = AA_PLANS['aaplacebo-smoke']
  assert.ok(p, 'the smoke plan must exist')
  assert.deepEqual(p.armsList, [AA_ARM])
  assert.equal(p.tasks, 1)
  assert.equal(p.only, 'example-fix', 'the smallest fixture, the rule the pilot uses')
  assert.equal(p.seeds, 2)
  assert.equal(p.passes, 2)
  assert.equal(aaCells(p), 4)
})

test('the AA workdir is identical for identical runs and free of identifying text', () => {
  const a = aaWorkdir({ harness: 'dsh', task: 'example-fix', seed: 1 })
  const b = aaWorkdir({ harness: 'dsh', task: 'example-fix', seed: 1 })
  assert.equal(a, b, 'same (harness, task, seed) must give the same string')
  assert.ok(!/native|ptc|aaplacebo|c[0-9a-z]{8,}/.test(a), 'no arm id, plan name or matrix id in the path: ' + a)
  assert.ok(!/-[a-z0-9]{6}$/.test(a.replace(/-s[12]$/, '')), 'no random suffix: ' + a)
  assert.ok(a.startsWith(tmpdir()), 'inside the OS temp directory so safe-fs may clean it')
  assert.match(a, /dsh-exp-/, 'a dsh-exp- name is what tools/safe-fs.mjs is allowed to delete')
  assert.notEqual(a, aaWorkdir({ harness: 'dsh', task: 'example-fix', seed: 2 }), 'seeds must differ')
  assert.notEqual(a, aaWorkdir({ harness: 'dsh', task: 'single-step-csv-quoting', seed: 1 }), 'tasks must differ')
})
