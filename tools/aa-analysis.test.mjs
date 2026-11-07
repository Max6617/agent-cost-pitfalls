/**
 * aa-analysis.test.mjs - the analysis tool's wiring, pinned before the data exists.
 *
 * Run: node --test tools/aa-analysis.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PASS_DIRS, registerPasses, AA_MODEL, ARM, ARM_P2 } from './aa-analysis.mjs'
import { DATASETS } from './cost-panel.mjs'

test('the pass paths are what collect.mjs --plan aaplacebo --name-prefix aa- writes', () => {
  assert.deepEqual(PASS_DIRS, {
    'aa-pass1': 'results/aa-ds-full/pass1/runs.jsonl',
    'aa-pass2': 'results/aa-ds-full/pass2/runs.jsonl',
  })
  assert.equal(AA_MODEL, 'deepseek-flash')
  assert.equal(ARM, 'dsh:native')
  assert.notEqual(ARM, ARM_P2, 'pass 2 needs its own label or pairedDiffs cannot pair it')
})

test('registering the passes is idempotent and keeps them out of the default population', () => {
  registerPasses(); registerPasses()
  const aa = DATASETS.filter((d) => d.suite === 'aa').map((d) => d.id).sort()
  assert.deepEqual(aa, ['aa-pass1', 'aa-pass2'])
  assert.equal(DATASETS.filter((d) => d.id === 'aa-pass1').length, 1, 'no duplicate registration')
})
