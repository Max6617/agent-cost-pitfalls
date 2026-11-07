// Sub-problem 2: undefined is a value, not an omission - and it is not null.
import test from 'node:test'
import assert from 'node:assert/strict'
import { merge, patch, diff, hasOwn } from '../src/index.js'

test('a source key set to undefined overwrites the target value', () => {
  const out = merge({ port: 8080, host: '127.0.0.1' }, { port: undefined })
  assert.ok(hasOwn(out, 'port'), 'the key is present on the result')
  assert.equal(out.port, undefined)
  assert.ok(hasOwn(out, 'host'), 'untouched keys survive')
  assert.equal(out.host, '127.0.0.1')
})

test('a patch that sets a key to undefined does not wipe the settings it never mentioned', () => {
  const base = { retries: { count: 3, backoffMs: 250 }, listen: { port: 80 } }
  const out = patch(base, { retries: { backoffMs: undefined } })

  assert.deepEqual(out.listen, { port: 80 })
  assert.equal(out.retries.count, 3)
  assert.ok(hasOwn(out.retries, 'backoffMs'))
  assert.equal(out.retries.backoffMs, undefined)
})

test('undefined replaces rather than merging into the target value', () => {
  const out = merge({ a: { x: 1 } }, { a: undefined })
  assert.ok(hasOwn(out, 'a'))
  assert.equal(out.a, undefined)
  assert.deepEqual(Object.keys(out), ['a'])
})

test('an absent key and a key set to undefined are different objects', () => {
  const absent = merge({ a: 1 }, {})
  const present = merge({ a: 1 }, { a: undefined })

  assert.equal(hasOwn(absent, 'a'), true)
  assert.equal(absent.a, 1)
  assert.equal(hasOwn(present, 'a'), true)
  assert.equal(present.a, undefined)
})

test('a key introduced as undefined is a change the diff has to report', () => {
  const out = merge({ b: 1 }, { a: undefined })
  assert.deepEqual(Object.keys(out).sort(), ['a', 'b'])

  const change = diff({ b: 1 }, { a: undefined, b: 1 })
  assert.ok(change, 'there is something to report')
  assert.ok(hasOwn(change, 'a'), 'the patch speaks about the key')
  assert.equal(hasOwn(change, 'b'), false, 'the patch says nothing about a key that did not change')
})

test('the difference between undefined and absent survives the diff and the patch', () => {
  const absent = { limits: { cpu: 1 } }
  const mentioned = { limits: { cpu: undefined } }

  assert.notEqual(diff(absent, mentioned), null, 'a key named as undefined is a change')
  assert.equal(hasOwn(patch(absent, diff(absent, mentioned)).limits, 'cpu'), true)
  assert.equal(patch(absent, diff(absent, mentioned)).limits.cpu, undefined)
})
