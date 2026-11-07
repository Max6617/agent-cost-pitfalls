import test from 'node:test'
import assert from 'node:assert/strict'
import { summarise } from '../src/index.js'

test('legacy spellings roll up under the canonical status', () => {
  const { counts, total } = summarise(['dispatched', 'shipped'])
  assert.deepEqual(counts, { 'in-progress': 2 })
  assert.equal(total, 2)
})

test('cancelled records are not active', () => {
  const { active, total } = summarise(['open', 'cancelled'])
  assert.equal(total, 2)
  assert.equal(active, 1)
})
