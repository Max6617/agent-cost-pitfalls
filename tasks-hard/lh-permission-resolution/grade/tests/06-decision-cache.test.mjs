// Sub-problem 6: a cached decision is keyed by the whole question and dies
// with the graph it was taken from.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine } from '../src/index.js'

const doc = (extra) => ({ subjects: [], groups: [], roles: [], rules: [], ...extra })

test('the cache keeps two resources apart', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-1', roles: ['r-1'] }],
    roles: [{ id: 'r-1' }],
    rules: [{ id: 'p-1', role: 'r-1', effect: 'allow', action: 'doc.read', resource: 'project/42' }],
  }))

  assert.equal(engine.authorize('u-1', 'doc.read', 'project/42').allowed, true)
  assert.equal(engine.authorize('u-1', 'doc.read', 'project/43').allowed, false)
  assert.equal(engine.authorize('u-1', 'doc.read', 'Project/42').allowed, false)
})

test('a revoked rule is gone from the very next decision', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-2', roles: ['r-2'] }],
    roles: [{ id: 'r-2' }],
    rules: [{ id: 'p-2', role: 'r-2', effect: 'allow', action: 'doc.read', resource: 'doc/1' }],
  }))

  assert.equal(engine.authorize('u-2', 'doc.read', 'doc/1').allowed, true)
  engine.revoke('p-2')

  const after = engine.authorize('u-2', 'doc.read', 'doc/1')
  assert.equal(after.allowed, false)
  assert.equal(after.rule, null)
  assert.equal(after.reason, 'no-matching-rule')
})

// Cache and inheritance at once: the role arrives through a group the subject
// is nested under, so the first decision needs the deep walk and the second one
// needs the walk to be redone.
test('removing a membership that a role is nested under is gone from the next decision', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-3', groups: ['g-outer'] }],
    groups: [
      { id: 'g-outer', groups: ['g-inner'] },
      { id: 'g-inner', roles: ['r-3'] },
    ],
    roles: [{ id: 'r-3' }],
    rules: [{ id: 'p-3', role: 'r-3', effect: 'allow', action: 'doc.read', resource: 'doc/1' }],
  }))

  assert.equal(engine.authorize('u-3', 'doc.read', 'doc/1').allowed, true)
  engine.removeMember('u-3', 'g-outer')
  assert.equal(engine.authorize('u-3', 'doc.read', 'doc/1').allowed, false)
  assert.deepEqual(engine.effectiveRoles('u-3'), [])
})

test('a repeated question is a cache hit and a new grant is visible at once', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-4', roles: ['r-4'] }],
    roles: [{ id: 'r-4' }],
  }))

  assert.equal(engine.authorize('u-4', 'doc.read', 'doc/1').allowed, false)
  assert.equal(engine.authorize('u-4', 'doc.read', 'doc/1').allowed, false)
  assert.equal(engine.stats().cacheHits, 1)

  engine.grant({ id: 'p-4', role: 'r-4', effect: 'allow', action: 'doc.read', resource: 'doc/1' })
  assert.equal(engine.authorize('u-4', 'doc.read', 'doc/1').allowed, true)
  assert.equal(engine.stats().decisions, 3)
})
