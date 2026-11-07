// Reproductions: an access review revoked a role and the subject kept working
// for the rest of the day. The cache is the only thing between a decision and
// the graph it came from.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine } from '../src/index.js'

const doc = (extra) => ({ subjects: [], groups: [], roles: [], rules: [], ...extra })

test('a revoked rule is gone from the very next decision', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-1', roles: ['r-1'] }],
    roles: [{ id: 'r-1' }],
    rules: [{ id: 'p-1', role: 'r-1', effect: 'allow', action: 'doc.read', resource: 'doc/1' }],
  }))

  assert.equal(engine.authorize('u-1', 'doc.read', 'doc/1').allowed, true)
  engine.revoke('p-1')
  assert.equal(engine.authorize('u-1', 'doc.read', 'doc/1').allowed, false)
})

test('a removed group membership is gone from the very next decision', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-2', groups: ['g-2'] }],
    groups: [{ id: 'g-2', roles: ['r-2'] }],
    roles: [{ id: 'r-2' }],
    rules: [{ id: 'p-2', role: 'r-2', effect: 'allow', action: 'doc.read', resource: 'doc/1' }],
  }))

  assert.equal(engine.authorize('u-2', 'doc.read', 'doc/1').allowed, true)
  engine.removeMember('u-2', 'g-2')
  assert.equal(engine.authorize('u-2', 'doc.read', 'doc/1').allowed, false)
})

test('the same question twice is answered from the cache', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-3', roles: ['r-3'] }],
    roles: [{ id: 'r-3' }],
    rules: [{ id: 'p-3', role: 'r-3', effect: 'allow', action: 'doc.read', resource: 'doc/1' }],
  }))

  const first = engine.authorize('u-3', 'doc.read', 'doc/1')
  const second = engine.authorize('u-3', 'doc.read', 'doc/1')
  assert.deepEqual(second, first)
  assert.equal(engine.stats().cacheHits, 1)
})
