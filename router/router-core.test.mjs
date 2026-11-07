/**
 * router-core tests. Run offline - no network, no API key, no DSH.
 *   node --test router/
 *
 * Each test pins one design rule from notes/plans/PLAN.md §4.2, so a later "optimisation"
 * that quietly breaks a rule fails here rather than silently in an experiment.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  BAND, TIER, DEFAULT_CONFIG, classifyTask, isComplexTask, shouldRoute, tierFor,
  decide, detectStall, PolicyCache, assertPrefixStable, countHits,
} from './router-core.mjs'

const here = dirname(fileURLToPath(import.meta.url))

test('classification picks a stable band on clear evidence', () => {
  assert.equal(classifyTask('Build me a new CLI tool that generates reports').band, BAND.REACT)
  assert.equal(classifyTask('Fix the crash when the config file is missing').band, BAND.SPEC)
  assert.equal(classifyTask('Why does the parser break on empty input?').band, BAND.SPEC)
})

test('ambiguity routes to WEAK rather than guessing a side', () => {
  // no keyword evidence at all -> the model decides for itself
  assert.equal(classifyTask('Thoughts on the auth module?').band, BAND.WEAK)
  assert.equal(classifyTask('').band, BAND.WEAK)
  // equal evidence on both sides is also ambiguity, not a tie-break
  assert.equal(classifyTask('build and fix').band, BAND.WEAK)
})

test('ASCII keywords respect word boundaries', () => {
  // "prefix" contains "fix" but is not a fix task
  assert.equal(countHits(/(?<![a-z])(?:fix)(?![a-z])/gi, 'rename the prefix constant'), 0)
  // "rebuilding" must not register as "build"
  assert.equal(classifyTask('The rebuilding of the index is slow').band, BAND.WEAK)
})

test('CJK keywords classify without needing boundaries', () => {
  assert.equal(classifyTask('修复登录页面的崩溃问题').band, BAND.SPEC)
  assert.equal(classifyTask('帮我搭建一个新的项目结构').band, BAND.REACT)
})

test('rule 7: short inputs are not routed at all', () => {
  assert.equal(shouldRoute('hi').route, false)
  assert.equal(shouldRoute('hi').reason, 'below-min-chars')
  assert.equal(shouldRoute('x'.repeat(DEFAULT_CONFIG.minChars + 1)).route, true)
  // and decide() honours the gate
  assert.equal(decide({ text: 'ok' }).routed, false)
  assert.equal(decide({ text: 'ok' }).tier, null)
})

test('rule 6: ambiguity follows the declared cost mode', () => {
  const weak = 'Thoughts on the auth module?'
  assert.equal(decide({ text: weak, config: { costMode: 'cost-first' } }).tier, TIER.STANDARD)
  assert.equal(decide({ text: weak, config: { costMode: 'quality-first' } }).tier, TIER.STRONG)
})

test('rule 3: tier comes from phase and complexity, not judged difficulty', () => {
  assert.equal(tierFor(BAND.SPEC, { complex: false }), TIER.STANDARD)
  assert.equal(tierFor(BAND.SPEC, { complex: true }), TIER.STRONG)
  assert.equal(isComplexTask('refactor the whole persistence layer'), true)
  assert.equal(isComplexTask('fix typo'), false)
})

test('tierFor is not degenerate: the router must actually be able to route', () => {
  // Regression guard. An earlier version mapped EVERY band to STANDARD under the
  // default cost-first mode, so the router injected persona text and never
  // changed the model. Every other test still passed. That is a false negative
  // waiting to be written up as "routing does not help".
  const bands = [BAND.REACT, BAND.SPEC, BAND.WEAK]
  for (const costMode of ['cost-first', 'quality-first']) {
    const reachable = new Set(bands.map((b) => tierFor(b, { costMode })))
    assert.ok(reachable.size >= 2,
      'with costMode=' + costMode + ' only ' + [...reachable].join(',') + ' is reachable - the router cannot route')
  }
  const all = new Set([...bands.map((b) => tierFor(b, { costMode: 'cost-first' })), TIER.STRONG])
  assert.equal(all.size, 3, 'expected cheap, standard and strong all reachable')
  assert.equal(tierFor(BAND.REACT, { costMode: 'cost-first' }), TIER.CHEAP)
  assert.equal(tierFor(BAND.SPEC, { costMode: 'cost-first' }), TIER.STANDARD)
})

test('a gated input reports no tier at all', () => {
  const d = decide({ text: 'hi' })
  assert.equal(d.routed, false)
  assert.equal(d.tier, null, 'an unrouted input must not claim a tier')
})

test('rule 2: one decision per input, reused for every step', () => {
  const cache = new PolicyCache()
  const first = cache.begin('in-1', 'Fix the crash when the config file is missing')
  assert.equal(first.cached, false)
  assert.equal(first.band, BAND.SPEC)
  // every later step of the SAME input gets the identical decision, marked cached
  for (let step = 0; step < 5; step++) {
    const again = cache.forStep('in-1')
    assert.equal(again.cached, true)
    assert.equal(again.tier, first.tier)
    assert.equal(again.band, first.band)
  }
  // a different input is not served a stale decision
  assert.equal(cache.forStep('in-2'), null)
})

test('rule 4: escalation is triggered by observed stalls, not prediction', () => {
  const ok = [{ tool: 'pwsh', args: { command: 'a' }, ok: true }]
  assert.equal(detectStall(ok).stalled, false)

  const failing = [
    { tool: 'pwsh', args: { command: 'test' }, ok: false },
    { tool: 'pwsh', args: { command: 'test' }, ok: false },
    { tool: 'pwsh', args: { command: 'test' }, ok: false },
  ]
  const s = detectStall(failing)
  assert.equal(s.stalled, true)
  assert.match(s.reason, /repeat|consecutive/)

  // a different failure each time still counts as consecutive failures
  const varied = [
    { tool: 'read', args: { p: '1' }, ok: false },
    { tool: 'grep', args: { p: '2' }, ok: false },
    { tool: 'edit', args: { p: '3' }, ok: false },
  ]
  assert.equal(detectStall(varied).stalled, true)
  assert.equal(detectStall(varied).reason, 'consecutive-failures')

  // a success resets the streak
  const recovering = [...varied.slice(0, 2), { tool: 'edit', args: {}, ok: true }]
  assert.equal(detectStall(recovering).stalled, false)
})

test('escalation pins the strong tier and records why', () => {
  const cache = new PolicyCache()
  cache.begin('in-1', 'add a small helper')
  const esc = cache.escalate('consecutive-failures')
  assert.equal(esc.tier, TIER.STRONG)
  assert.match(esc.reason, /^escalated:/)
  assert.equal(cache.forStep('in-1').tier, TIER.STRONG)
})

test('H2 guard: a changed prefix between steps is detected', () => {
  assert.equal(assertPrefixStable('abc', 'abc').stable, true)
  assert.equal(assertPrefixStable('abc', 'abd').stable, false)
  assert.equal(assertPrefixStable(null, 'abc').checked, false)
})

test('decide() is pure and deterministic', () => {
  const input = { text: 'Fix the flaky test in the parser', inputId: 'x', config: { costMode: 'cost-first' } }
  const a = decide(input), b = decide(input)
  assert.deepEqual({ ...a, decidedAt: 0 }, { ...b, decidedAt: 0 })
})

test('rule 5 + no-key guarantee: the core imports nothing and calls nothing', () => {
  const src = readFileSync(join(here, 'router-core.mjs'), 'utf8')
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.equal(/^\s*import\s/m.test(code), false, 'router-core must have no imports')
  assert.equal(/\bfetch\s*\(/.test(code), false, 'router-core must make no network calls')
  assert.equal(/process\.env/.test(code), false, 'router-core must not read credentials')
})
