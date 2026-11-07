// Reproductions: the reproduction the platform team sent with the ticket.
// Resolution is supposed to walk the whole graph; these are the two shapes that
// keep coming back from the console.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine, AuthzError } from '../src/index.js'

const doc = (extra) => ({
  subjects: [],
  groups: [],
  roles: [],
  rules: [],
  ...extra,
})

test('roles arrive through a group that is nested under the group the subject is in', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-1', groups: ['g-1'] }],
    groups: [
      { id: 'g-1', groups: ['g-2'] },
      { id: 'g-2', groups: ['g-3'] },
      { id: 'g-3', roles: ['r-leaf'] },
    ],
    roles: [{ id: 'r-leaf' }],
    rules: [{ id: 'p-leaf', role: 'r-leaf', effect: 'allow', action: 'doc.read', resource: 'doc/*' }],
  }))

  assert.deepEqual(engine.effectiveRoles('u-1'), ['r-leaf'])
  assert.equal(engine.authorize('u-1', 'doc.read', 'doc/1').allowed, true)
})

test('a role inherits the roles of the roles it inherits', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-2', roles: ['r-1'] }],
    roles: [
      { id: 'r-1', roles: ['r-2'] },
      { id: 'r-2', roles: ['r-3'] },
      { id: 'r-3', roles: ['r-4'] },
      { id: 'r-4' },
    ],
    rules: [{ id: 'p-chain', role: 'r-4', effect: 'allow', action: 'doc.read', resource: 'doc/*' }],
  }))

  assert.deepEqual(engine.effectiveRoles('u-2'), ['r-1', 'r-2', 'r-3', 'r-4'])
  assert.equal(engine.authorize('u-2', 'doc.read', 'doc/1').rule, 'p-chain')
})

test('an unknown subject is a caller error, not a silent deny', () => {
  const engine = createEngine(doc({ subjects: [{ id: 'u-known' }] }))

  assert.throws(
    () => engine.authorize('u-nobody', 'doc.read', 'doc/1'),
    (error) => error instanceof AuthzError && error.code === 'unknown-subject',
  )
})

test('a loop in the graph is reported instead of answered from a partial walk', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-3', roles: ['r-loop-a'] }],
    roles: [
      { id: 'r-loop-a', roles: ['r-loop-b'] },
      { id: 'r-loop-b', roles: ['r-loop-a'] },
    ],
    rules: [{ id: 'p-loop', role: 'r-loop-a', effect: 'allow', action: 'doc.read', resource: 'doc/*' }],
  }))

  assert.throws(
    () => engine.authorize('u-3', 'doc.read', 'doc/1'),
    (error) => error instanceof AuthzError && error.code === 'cycle',
  )
})
