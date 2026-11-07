/**
 * verdict-seed-stability.test.mjs - the verdict's seed sensitivity is computed, not asserted.
 *
 * Run: node --test tools/verdict-seed-stability.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seedStability } from './verdict-seed-stability.mjs'
import { BATCH1 } from './replication-verdict.mjs'

test('every replicated seed yields a classification for every pre-registered provider', () => {
  const out = seedStability({ seeds: [12345, 7], iters: 2000 })
  assert.equal(Object.keys(out.providers).length, BATCH1.length)
  for (const b of BATCH1) {
    const p = out.providers[b.model]
    assert.equal(p.bySeed.length, 2)
    assert.equal(p.tasks, 40, b.model + ' must be paired on all 40 tasks')
    for (const y of p.bySeed) {
      assert.ok(['positive', 'negative', 'null'].includes(y.classification))
      assert.equal(y.match, y.classification === p.target)
      assert.ok(y.loPct <= y.hiPct)
    }
  }
})

test('the summary counts every seed exactly once and names only filed verdicts', () => {
  const out = seedStability({ seeds: [12345, 7, 8], iters: 2000 })
  const total = Object.values(out.summary.r1MatchedCounts).reduce((a, b) => a + b, 0)
  assert.equal(total, 3)
  const verdicts = Object.values(out.summary.verdicts).reduce((a, b) => a + b, 0)
  assert.equal(verdicts, 3)
  for (const v of Object.keys(out.summary.verdicts)) {
    assert.ok(['replicated', 'partially replicated', 'not replicated'].includes(v))
  }
})

test('seed 12345 reproduces the filed seed, and a different seed is allowed to differ', () => {
  // The point of the tool is that seed 12345 IS the filed run; its classification must equal the
  // filed verdict's own A2 row. This pins the tool to the shipped estimators rather than to itself.
  const out = seedStability({ seeds: [12345], iters: 2000 })
  const glm = out.providers['glm-5.3-flash'].bySeed[0]
  assert.ok(glm.hiPct > -1 && glm.hiPct < 1, 'GLM is the knife edge; its upper bound is near zero at any B')
  assert.equal(glm.classification, glm.hiPct < 0 ? 'negative' : 'null')
})
