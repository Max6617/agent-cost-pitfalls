// Sub-problem: the weekly rollup counts under the canonical vocabulary.
import test from 'node:test'
import assert from 'node:assert/strict'
import { summarise } from '../src/index.js'

test('legacy spellings roll up under their canonical status', () => {
  const { counts, total } = summarise(['dispatched', 'in-progress', 'shipped'])
  assert.deepEqual(counts, { 'in-progress': 3 })
  assert.equal(total, 3)
})

test('every legacy spelling rolls up, not only the dispatch ones', () => {
  const { counts } = summarise(['new', 'done', 'paused'])
  assert.deepEqual(counts, { open: 1, resolved: 1, 'on-hold': 1 })
})

test('closed and cancelled records are not active', () => {
  const { active, total } = summarise(['open', 'resolved', 'cancelled', 'closed'])
  assert.equal(total, 4)
  assert.equal(active, 2)
})

test('a spelling nobody knows is refused', () => {
  assert.throws(
    () => summarise(['open', 'bogus']),
    (err) => err.code === 'unknown-status',
  )
})

test('a canonical export rolls up as written', () => {
  const result = summarise(['open', 'triaged', 'closed'])
  assert.deepEqual(result, { counts: { open: 1, triaged: 1, closed: 1 }, active: 2, total: 3 })
})
