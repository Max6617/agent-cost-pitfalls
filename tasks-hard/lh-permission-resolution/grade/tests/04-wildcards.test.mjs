// Sub-problem 4: `*` is exactly one segment, `**` is any number of them
// including none, and the two are not interchangeable.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine, matches } from '../src/index.js'

const ask = (rules, resource) =>
  createEngine({ subjects: [{ id: 'u-1', roles: ['r-1'] }], groups: [], roles: [{ id: 'r-1' }], rules })
    .authorize('u-1', 'doc.read', resource)

test('** covers no segments at all as readily as it covers several', () => {
  assert.equal(matches('project/**', 'project'), true)
  assert.equal(matches('**/secret', 'secret'), true)
  assert.equal(matches('**', 'project/42/secret'), true)
})

test('** covers a run of segments wherever it stands in the pattern', () => {
  assert.equal(matches('project/**/secret', 'project/secret'), true)
  assert.equal(matches('project/**/secret', 'project/42/secret'), true)
  assert.equal(matches('project/**/secret', 'project/42/team/secret'), true)
  assert.equal(matches('project/**', 'project/42/team'), true)
})

test('* is exactly one segment, never none and never more than one', () => {
  assert.equal(matches('project/*', 'project/42'), true)
  assert.equal(matches('project/*', 'project'), false)
  assert.equal(matches('project/*/*', 'project/42/team'), true)
  assert.equal(matches('project/*/*', 'project/42'), false)
})

// Wildcards and precedence at once: the two patterns differ only in which
// wildcard they use, and the depth of the resource is what decides whether the
// deny is in play at all.
const wide = [
  { id: 'p-100', role: 'r-1', effect: 'allow', action: 'doc.read', resource: 'project/**' },
  { id: 'p-200', role: 'r-1', effect: 'deny', action: 'doc.read', resource: 'project/*' },
]

test('a deny written with one wildcard does not outrank a grant written with the other', () => {
  const deep = ask(wide, 'project/42/team')
  assert.equal(deep.allowed, true)
  assert.equal(deep.rule, 'p-100')

  const one = ask(wide, 'project/42')
  assert.equal(one.allowed, false)
  assert.equal(one.rule, 'p-200')

  const bare = ask(wide, 'project')
  assert.equal(bare.allowed, true)
  assert.equal(bare.rule, 'p-100')
})
