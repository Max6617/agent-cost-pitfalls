import test from 'node:test'
import assert from 'node:assert/strict'
import { FLAGS, byOwner, isDefined, percentOf, validateDefinition } from '../src/flags.js'
import { hash32, bucketOf, inRollout } from '../src/bucketing.js'
import { Evaluator } from '../src/evaluate.js'
import { FlagAudit } from '../src/audit.js'
import { FlagAdmin } from '../src/admin.js'
import { toTimestamp } from '../src/clock.js'

const AT = Date.UTC(2026, 2, 4, 5, 6, 7, 0)
const ISO = '2026-03-04T05:06:07.000Z'

test('the definitions are indexed by name and owner', () => {
  assert.equal(isDefined('ui.dark'), true)
  assert.equal(isDefined('nope'), false)
  assert.deepEqual(byOwner('search'), ['search.rerank'])
  assert.equal(percentOf('search.rerank'), 25)
  assert.equal(percentOf('ui.dark'), null)
})

test('a definition is checked for shape', () => {
  assert.deepEqual(validateDefinition('a', { kind: 'boolean', enabled: true }), [])
  assert.deepEqual(validateDefinition('a', { kind: 'rollout', percent: 50 }), [])
  assert.equal(validateDefinition('a', { kind: 'rollout', percent: 150 }).length, 1)
  assert.equal(validateDefinition('a', { kind: 'rollout', percent: 12.5 }).length, 1)
  assert.equal(validateDefinition('', { kind: 'boolean', enabled: true }).length, 1)
})

test('the hash is stable and unsigned', () => {
  assert.equal(hash32('a'), hash32('a'))
  assert.notEqual(hash32('a'), hash32('b'))
  assert.ok(hash32('anything') >= 0)
  assert.ok(hash32('anything') < 2 ** 32)
})

test('bucketing is stable for a subject', () => {
  assert.equal(bucketOf('search.rerank', 'user-1'), bucketOf('search.rerank', 'user-1'))
  assert.ok(bucketOf('search.rerank', 'user-1') < 100)
})

test('the flag name is part of the bucket, so two flags differ', () => {
  const subjects = Array.from({ length: 200 }, (_, i) => 'user-' + i)
  const a = subjects.filter((s) => inRollout('flag.a', s, 25))
  const b = subjects.filter((s) => inRollout('flag.b', s, 25))
  assert.ok(a.length > 0 && b.length > 0)
  assert.notDeepEqual(a, b, 'two rollouts must not select the same users')
})

test('a rollout of 0 selects nobody and 100 selects everybody', () => {
  const subjects = Array.from({ length: 50 }, (_, i) => 'user-' + i)
  assert.equal(subjects.filter((s) => inRollout('f', s, 0)).length, 0)
  assert.equal(subjects.filter((s) => inRollout('f', s, 100)).length, 50)
})

test('a boolean flag follows its definition', () => {
  const evaluator = new Evaluator()
  assert.equal(evaluator.isOn('ui.dark'), true)
  assert.equal(evaluator.isOn('checkout.v2'), false)
})

test('an unknown flag is off', () => {
  assert.equal(new Evaluator().isOn('nope'), false)
})

test('an override wins over the definition', () => {
  const evaluator = new Evaluator()
  evaluator.override('checkout.v2', 'user-1', true)
  assert.equal(evaluator.isOn('checkout.v2', 'user-1'), true)
  assert.equal(evaluator.isOn('checkout.v2', 'user-2'), false)
})

test('an override can turn a flag off for one subject', () => {
  const evaluator = new Evaluator()
  evaluator.override('ui.dark', 'user-1', false)
  assert.equal(evaluator.isOn('ui.dark', 'user-1'), false)
  assert.equal(evaluator.isOn('ui.dark', 'user-2'), true)
})

test('an override beats a rollout bucket', () => {
  const evaluator = new Evaluator()
  evaluator.override('search.rerank', 'user-1', true)
  assert.equal(evaluator.isOn('search.rerank', 'user-1'), true)
})

test('a rollout is stable across evaluations', () => {
  const evaluator = new Evaluator()
  const first = evaluator.isOn('search.rerank', 'user-7')
  for (let i = 0; i < 5; i++) assert.equal(evaluator.isOn('search.rerank', 'user-7'), first)
})

test('the snapshot reports every flag rather than omitting the off ones', () => {
  const all = new Evaluator().all('user-1')
  assert.deepEqual(Object.keys(all).sort(), Object.keys(FLAGS).sort())
  assert.equal(all['ui.dark'], true)
  assert.equal(typeof all['search.rerank'], 'boolean')
})

test('explain says which rule decided', () => {
  const evaluator = new Evaluator()
  assert.deepEqual(evaluator.explain('ui.dark'), { value: true, reason: 'definition' })
  assert.equal(evaluator.explain('nope').reason, 'unknown-flag')

  evaluator.override('ui.dark', 'user-1', false)
  assert.deepEqual(evaluator.explain('ui.dark', 'user-1'), { value: false, reason: 'override' })
})

test('explain reports the bucket for a rollout', () => {
  const detail = new Evaluator().explain('search.rerank', 'user-1')
  assert.equal(detail.reason, 'rollout')
  assert.equal(detail.percent, 25)
  assert.equal(detail.bucket, bucketOf('search.rerank', 'user-1'))
  assert.equal(detail.value, detail.bucket < 25)
})

test('an audit entry records the injected instant', () => {
  const audit = new FlagAudit({ clock: () => AT })
  const entry = audit.record('override', 'ui.dark', 'ada', { subject: 'user-1' })
  assert.equal(entry.at, ISO)
  assert.equal(toTimestamp(AT), ISO)
})

test('the audit keeps history per flag', () => {
  const audit = new FlagAudit({ clock: () => AT })
  audit.record('override', 'ui.dark', 'ada')
  audit.record('override', 'search.rerank', 'bob')
  audit.record('override', 'ui.dark', 'bob')
  assert.equal(audit.history('ui.dark').length, 2)
  assert.equal(audit.lastActor('ui.dark'), 'bob')
  assert.equal(audit.lastActor('nothing'), null)
})

test('an override through the admin surface is audited', () => {
  const audit = new FlagAudit({ clock: () => AT })
  const admin = new FlagAdmin({ audit, actor: 'ada' })
  admin.override('checkout.v2', 'user-1', true)
  assert.equal(admin.snapshot('user-1')['checkout.v2'], true)
  assert.deepEqual(audit.history('checkout.v2')[0], {
    at: ISO,
    action: 'override',
    flag: 'checkout.v2',
    actor: 'ada',
    details: { subject: 'user-1', value: true },
  })
})

test('the debug endpoint agrees with the evaluator', () => {
  const admin = new FlagAdmin({ actor: 'ada' })
  admin.override('checkout.v2', 'user-1', true)
  assert.equal(admin.explain('checkout.v2', 'user-1').value, true)
  assert.equal(admin.explain('checkout.v2', 'user-1').reason, 'override')
})
