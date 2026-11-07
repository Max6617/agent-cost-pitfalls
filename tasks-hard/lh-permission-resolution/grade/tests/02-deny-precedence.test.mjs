// Sub-problem 2: an explicit deny outranks every grant, wherever the two of
// them sit in the graph and whatever order they are declared in.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine } from '../src/index.js'

const doc = (extra) => ({ subjects: [], groups: [], roles: [], rules: [], ...extra })

test('a deny outranks a grant that carries the lower rule id', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-1', roles: ['r-viewer', 'r-guard'] }],
    roles: [{ id: 'r-viewer' }, { id: 'r-guard' }],
    rules: [
      { id: 'p-100', role: 'r-viewer', effect: 'allow', action: 'doc.read', resource: '**' },
      { id: 'p-900', role: 'r-guard', effect: 'deny', action: 'doc.read', resource: 'doc/classified' },
    ],
  }))

  const decision = engine.authorize('u-1', 'doc.read', 'doc/classified')
  assert.equal(decision.allowed, false)
  assert.equal(decision.effect, 'deny')
  assert.equal(decision.rule, 'p-900')
  assert.equal(decision.reason, 'explicit-deny')
})

// Precedence and scope at once: the deny is reached through two levels of group
// nesting, it is written with a wildcard, and the grant it beats is spelled out
// in full.
const nested = () => doc({
  subjects: [{ id: 'u-2', groups: ['g-2'], roles: ['r-owner'] }],
  groups: [
    { id: 'g-2', groups: ['g-2b'] },
    { id: 'g-2b', roles: ['r-guard'] },
  ],
  roles: [{ id: 'r-owner' }, { id: 'r-guard' }],
  rules: [
    { id: 'p-200', role: 'r-owner', effect: 'allow', action: 'project.deploy', resource: 'project/42' },
    { id: 'p-900', role: 'r-guard', effect: 'deny', action: 'project.deploy', resource: 'project/*' },
  ],
})

test('a wildcard deny two groups away outranks a grant spelled out in full', () => {
  // One engine per question: this is about the verdict, not about the cache.
  const decision = createEngine(nested()).authorize('u-2', 'project.deploy', 'project/42')
  assert.equal(decision.allowed, false)
  assert.equal(decision.rule, 'p-900')
})

test('the same wildcard deny does not reach a segment below the one it names', () => {
  const decision = createEngine(nested()).authorize('u-2', 'project.deploy', 'project/42/secret')
  assert.equal(decision.allowed, false)
  assert.equal(decision.rule, null)
  assert.equal(decision.reason, 'no-matching-rule')
})

test('a deny outranks a grant that a role inherited from another role carries', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-3', roles: ['r-parent'] }],
    roles: [
      { id: 'r-parent', roles: ['r-child'] },
      { id: 'r-child' },
    ],
    rules: [
      { id: 'p-300', role: 'r-child', effect: 'allow', action: 'doc.read', resource: '**' },
      { id: 'p-700', role: 'r-parent', effect: 'deny', action: 'doc.read', resource: 'doc/secret' },
    ],
  }))

  const decision = engine.authorize('u-3', 'doc.read', 'doc/secret')
  assert.equal(decision.allowed, false)
  assert.equal(decision.rule, 'p-700')
})

test('a deny aimed at another action or another resource leaves the grant alone', () => {
  const engine = createEngine(doc({
    subjects: [{ id: 'u-4', roles: ['r-4'] }],
    roles: [{ id: 'r-4' }],
    rules: [
      { id: 'p-400', role: 'r-4', effect: 'allow', action: 'doc.read', resource: 'doc/*' },
      { id: 'p-500', role: 'r-4', effect: 'deny', action: 'doc.delete', resource: '**' },
      { id: 'p-600', role: 'r-4', effect: 'deny', action: 'doc.read', resource: 'doc/other' },
    ],
  }))

  const decision = engine.authorize('u-4', 'doc.read', 'doc/mine')
  assert.equal(decision.allowed, true)
  assert.equal(decision.rule, 'p-400')
})
