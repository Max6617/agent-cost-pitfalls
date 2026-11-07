// Reproductions: "the reviewer from the other team could open our financials"
// turned out to be a resource pattern matching a path prefix.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine, matches } from '../src/index.js'

const doc = (rule) => ({
  subjects: [{ id: 'u-1', roles: ['r-1'] }],
  roles: [{ id: 'r-1' }],
  rules: [{ role: 'r-1', effect: 'allow', action: 'doc.read', ...rule }],
})

// A fresh engine per question, so that one answer cannot come out of the cache
// of another.
const ask = (rule, resource) => createEngine(doc(rule)).authorize('u-1', 'doc.read', resource)

test('a grant covers exactly the resource it names, and nothing further down the path', () => {
  const scoped = { id: 'p-scoped', resource: 'project/42' }

  assert.equal(ask(scoped, 'project/42').allowed, true)
  assert.equal(ask(scoped, 'project/421').allowed, false)
  assert.equal(ask(scoped, 'project/42/secret').allowed, false)

  assert.equal(matches('project/*', 'project/42'), true)
  assert.equal(matches('project/*', 'project/42/secret'), false)
  assert.equal(matches('project/*', 'project'), false)
})

test('resources are compared exactly, including case', () => {
  assert.equal(matches('Project/42', 'Project/42'), true)
  assert.equal(matches('Project/42', 'project/42'), false)
})
