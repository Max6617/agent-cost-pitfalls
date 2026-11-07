// Reproductions: "the deploy bot is still shipping to legacy" and the console's
// "why was I denied?" panel, which has been reading oddly since the last release.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngine } from '../src/index.js'

test('a deny beats a grant on the same question', () => {
  const engine = createEngine()

  // u-anna holds r-deployer (and, through it, r-operator), so both p-103 and
  // p-109 are candidates for a deploy into project/prod/legacy.
  const decision = engine.authorize('u-anna', 'project.deploy', 'project/prod/legacy')
  assert.equal(decision.allowed, false)
  assert.equal(decision.effect, 'deny')
  assert.equal(decision.rule, 'p-109')
  assert.equal(decision.reason, 'explicit-deny')
})

test('the report names the rule that decided it and the route to that rule', () => {
  const engine = createEngine()

  const decision = engine.authorize('u-anna', 'project.read', 'project/42')
  assert.equal(decision.allowed, true)
  assert.equal(decision.rule, 'p-101')
  assert.deepEqual(decision.path, ['u-anna', 'g-platform', 'g-engineering', 'r-reader', 'p-101'])
  assert.equal(decision.path.at(-1), decision.rule)
})

test('a question that no rule covers is reported as such', () => {
  const engine = createEngine()

  const decision = engine.authorize('u-dara', 'project.read', 'project/42')
  assert.deepEqual(decision, {
    allowed: false,
    effect: 'deny',
    rule: null,
    path: [],
    reason: 'no-matching-rule',
  })
})

test('a deny on one resource leaves its neighbours alone', () => {
  const engine = createEngine()

  assert.equal(engine.authorize('u-anna', 'project.deploy', 'project/prod/app').allowed, true)
  assert.equal(engine.authorize('u-bruno', 'project.read', 'project/42').allowed, true)
})
