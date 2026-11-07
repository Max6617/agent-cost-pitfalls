// Sub-problem 5: the report and the decision are one thing - the rule that
// decided it and the route from the subject to that rule, or neither.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine } from '../src/index.js'

const doc = (extra) => ({ subjects: [], groups: [], roles: [], rules: [], ...extra })

test('a grant names the rule that decided it and the route from the subject to it', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-1', groups: ['g-1'] }],
    groups: [{ id: 'g-1', roles: ['r-1'] }],
    roles: [{ id: 'r-1' }],
    rules: [
      { id: 'p-1', role: 'r-1', effect: 'allow', action: 'doc.read', resource: 'doc/*' },
      { id: 'p-2', role: 'r-1', effect: 'deny', action: 'doc.delete', resource: '**' },
    ],
  }))

  const decision = engine.authorize('u-1', 'doc.read', 'doc/1')
  assert.equal(decision.allowed, true)
  assert.equal(decision.rule, 'p-1')
  assert.deepEqual(decision.path, ['u-1', 'g-1', 'r-1', 'p-1'])
  assert.equal(decision.reason, 'allowed')
})

test('a question that no rule covers names no rule at all', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-2', roles: ['r-2'] }],
    roles: [{ id: 'r-2' }],
    rules: [{ id: 'p-3', role: 'r-2', effect: 'allow', action: 'doc.read', resource: 'doc/public' }],
  }))

  assert.deepEqual(engine.authorize('u-2', 'doc.read', 'doc/private'), {
    allowed: false,
    effect: 'deny',
    rule: null,
    path: [],
    reason: 'no-matching-rule',
  })
})

// Explanation and inheritance at once: the rule that decided is only reachable
// through two levels of group nesting, and the decision has to say so.
test('a deny two groups down is cited with the route that reaches it, never a grant', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-3', groups: ['g-3'] }],
    groups: [
      { id: 'g-3', groups: ['g-3b'] },
      { id: 'g-3b', roles: ['r-3'] },
    ],
    roles: [{ id: 'r-3' }],
    rules: [
      { id: 'p-4', role: 'r-3', effect: 'allow', action: 'doc.read', resource: 'doc/public' },
      { id: 'p-5', role: 'r-3', effect: 'deny', action: 'doc.read', resource: 'doc/secret' },
    ],
  }))

  const decision = engine.authorize('u-3', 'doc.read', 'doc/secret')
  assert.equal(decision.allowed, false)
  assert.equal(decision.effect, 'deny')
  assert.equal(decision.rule, 'p-5')
  assert.equal(decision.reason, 'explicit-deny')
  assert.deepEqual(decision.path, ['u-3', 'g-3', 'g-3b', 'r-3', 'p-5'])
})

// Explanation and inheritance again, the other way round: two routes reach the
// role, so the path is a choice the decision has to make correctly.
test('the route reported is the shortest one, not the first one the walk finds', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-4', groups: ['g-alpha', 'g-beta'] }],
    groups: [
      { id: 'g-alpha', groups: ['g-gamma'] },
      { id: 'g-gamma', roles: ['r-x'] },
      { id: 'g-beta', roles: ['r-x'] },
    ],
    roles: [{ id: 'r-x' }],
    rules: [{ id: 'p-6', role: 'r-x', effect: 'allow', action: 'doc.read', resource: '**' }],
  }))

  const decision = engine.authorize('u-4', 'doc.read', 'doc/1')
  assert.equal(decision.rule, 'p-6')
  assert.deepEqual(decision.path, ['u-4', 'g-beta', 'r-x', 'p-6'])
})
