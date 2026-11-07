// Sub-problem 1: inheritance is transitive, unlimited in depth, and a cycle in
// the graph is an error rather than an answer from part of the walk.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine, AuthzError } from '../src/index.js'

const doc = (extra) => ({ subjects: [], groups: [], roles: [], rules: [], ...extra })

test('a group nested under a group confers its roles, however deep the nesting goes', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-1', groups: ['g-1'] }],
    groups: [
      { id: 'g-1', groups: ['g-2'] },
      { id: 'g-2', groups: ['g-3'] },
      { id: 'g-3', groups: ['g-4'] },
      { id: 'g-4', roles: ['r-deep'] },
    ],
    roles: [{ id: 'r-deep' }],
    rules: [{ id: 'p-deep', role: 'r-deep', effect: 'allow', action: 'doc.read', resource: '**' }],
  }))

  assert.deepEqual(engine.effectiveRoles('u-1'), ['r-deep'])
  const decision = engine.authorize('u-1', 'doc.read', 'doc/1')
  assert.equal(decision.allowed, true)
  assert.equal(decision.rule, 'p-deep')
})

test('role inheritance is transitive and not depth limited', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-2', roles: ['r-1'] }],
    roles: [
      { id: 'r-1', roles: ['r-2'] },
      { id: 'r-2', roles: ['r-3'] },
      { id: 'r-3', roles: ['r-4'] },
      { id: 'r-4' },
    ],
    rules: [{ id: 'p-chain', role: 'r-4', effect: 'allow', action: 'doc.read', resource: '**' }],
  }))

  assert.deepEqual(engine.effectiveRoles('u-2'), ['r-1', 'r-2', 'r-3', 'r-4'])
  assert.equal(engine.authorize('u-2', 'doc.read', 'doc/1').rule, 'p-chain')
})

// Inheritance and precedence at once: the deny is two hops away behind a
// diamond, and the grant it has to beat is the one the subject holds directly.
test('a deny on the far side of a diamond still outranks a grant held directly', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-3', groups: ['g-left', 'g-right'], roles: ['r-direct'] }],
    groups: [
      { id: 'g-left', groups: ['g-shared'] },
      { id: 'g-right', groups: ['g-shared'] },
      { id: 'g-shared', roles: ['r-x'] },
    ],
    roles: [
      { id: 'r-direct' },
      { id: 'r-x', roles: ['r-y'] },
      { id: 'r-y' },
    ],
    rules: [
      { id: 'p-100', role: 'r-direct', effect: 'allow', action: 'doc.read', resource: '**' },
      { id: 'p-800', role: 'r-y', effect: 'deny', action: 'doc.read', resource: 'doc/**' },
    ],
  }))

  const decision = engine.authorize('u-3', 'doc.read', 'doc/1')
  assert.equal(decision.allowed, false)
  assert.equal(decision.effect, 'deny')
  assert.equal(decision.rule, 'p-800')
})

test('a cycle below the subject is reported as an error rather than answered from part of it', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-4', groups: ['g-1'] }],
    groups: [
      { id: 'g-1', groups: ['g-2'] },
      { id: 'g-2', groups: ['g-3'], roles: ['r-loop'] },
      { id: 'g-3', groups: ['g-2'] },
    ],
    roles: [{ id: 'r-loop' }],
    rules: [{ id: 'p-loop', role: 'r-loop', effect: 'allow', action: 'doc.read', resource: '**' }],
  }))

  const isCycle = (error) =>
    error instanceof AuthzError &&
    error.code === 'cycle' &&
    Array.isArray(error.cycle) &&
    error.cycle.length >= 3 &&
    error.cycle[0] === error.cycle.at(-1) &&
    error.cycle.includes('g-2') &&
    error.cycle.includes('g-3')

  assert.throws(() => engine.authorize('u-4', 'doc.read', 'doc/1'), isCycle)
  assert.throws(() => engine.effectiveRoles('u-4'), isCycle)
})
