// Sub-problem 3: a pattern is a scope over whole segments, never a string
// prefix, a subpath or a case-insensitive match.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine, matches } from '../src/index.js'

const doc = (extra) => ({
  subjects: [{ id: 'u-1', roles: ['r-1'] }],
  roles: [{ id: 'r-1' }],
  rules: [],
  ...extra,
})

// One engine per question: this file is about matching, so nothing here may
// turn on what an earlier question left in a cache.
const ask = (rules, resource) => createEngine(doc({ rules })).authorize('u-1', 'doc.read', resource)

// Scope and precedence at once: the deny names one resource exactly, the grant
// covers the whole subtree with a trailing `**`, and which of them applies
// depends on how many segments the resource has.
const scoped = [
  { id: 'p-100', role: 'r-1', effect: 'allow', action: 'doc.read', resource: 'project/**' },
  { id: 'p-600', role: 'r-1', effect: 'deny', action: 'doc.read', resource: 'project/42' },
]

test('a deny on one resource does not outrank a grant that covers a deeper path', () => {
  const denied = ask(scoped, 'project/42')
  assert.equal(denied.allowed, false)
  assert.equal(denied.rule, 'p-600')

  const allowed = ask(scoped, 'project/42/secret')
  assert.equal(allowed.allowed, true)
  assert.equal(allowed.rule, 'p-100')
})

test('a grant on project/42 is not a grant on project/421', () => {
  const exactly = [{ id: 'p-1', role: 'r-1', effect: 'allow', action: 'doc.read', resource: 'project/42' }]

  assert.equal(ask(exactly, 'project/42').allowed, true)

  const leaked = ask(exactly, 'project/421')
  assert.equal(leaked.allowed, false)
  assert.equal(leaked.rule, null)
  assert.equal(leaked.reason, 'no-matching-rule')
})

test('a grant on project/42 does not reach anything inside it', () => {
  const one = [{ id: 'p-2', role: 'r-1', effect: 'allow', action: 'doc.read', resource: 'project/42' }]
  assert.equal(ask(one, 'project/42/secret').allowed, false)
  assert.equal(matches('project/42', 'project/42/secret'), false)
  assert.equal(matches('project/42', 'project/421'), false)
})

test('a literal segment matches that segment and nothing that merely starts with it', () => {
  assert.equal(matches('org/acme', 'org/acme'), true)
  assert.equal(matches('org/acme', 'org/acmex'), false)
  assert.equal(matches('Project/42', 'Project/42'), true)
  assert.equal(matches('Project/42', 'project/42'), false)
})
