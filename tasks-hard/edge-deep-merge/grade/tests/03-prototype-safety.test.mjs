// Sub-problem 3: the keys that can reach a prototype.
import test from 'node:test'
import assert from 'node:assert/strict'
import { merge, patch, diff, hasOwn, REMOVED } from '../src/index.js'

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

test('a source key named __proto__ is carried as data and reaches no prototype', () => {
  const before = Object.keys(Object.prototype).length
  const source = JSON.parse('{"__proto__": {"merged": true}, "level": "debug"}')
  const out = merge({ service: 'checkout' }, source)

  assert.equal(out.level, 'debug')
  assert.equal(hasOwn(out, '__proto__'), true, 'the key is an own key of the result')
  assert.equal(out.merged, undefined, 'nothing was inherited from the key')
  assert.equal(Object.getPrototypeOf(out), Object.prototype, 'the result is an ordinary object')
  assert.equal(Object.keys(Object.prototype).length, before)
  assert.equal({}.merged, undefined)
})

test('a __proto__ key inside a nested object is data at that depth, through diff and patch too', () => {
  const target = JSON.parse('{"a": {"b": {"__proto__": 1, "keep": 1, "drop": 2}}}')
  const source = JSON.parse('{"a": {"b": {"__proto__": 2, "keep": 1, "extra": 3}}}')
  const change = diff(target, source)

  assert.ok(change, 'there is a change to report')
  assert.equal(own(change.a.b, '__proto__'), true, 'the patch names the key')
  assert.equal(change.a.b.__proto__, 2)
  assert.equal(change.a.b.drop, REMOVED, 'a removed key is carried as the removal marker')
  assert.equal(own(change.a.b, 'keep'), false, 'an unchanged key is not in the patch')

  const applied = patch(target, change)
  assert.equal(own(applied.a.b, '__proto__'), true)
  assert.equal(applied.a.b.extra, 3)
  assert.equal(own(applied.a.b, 'drop'), false)
  assert.equal(applied.a.b.keep, 1)
})

test('a __proto__ key survives a merge into a target that has one of its own', () => {
  const target = JSON.parse('{"__proto__": {"kept": 1}, "service": "checkout"}')
  const source = { service: 'checkout', extra: true }

  const out = merge(target, source)

  assert.equal(own(out, '__proto__'), true, 'the key survives a pass through the target')
  assert.deepEqual(out.__proto__, { kept: 1 })
  assert.equal(out.extra, true)
  assert.equal(Object.getPrototypeOf(out), Object.prototype)
  assert.equal({}.kept, undefined)
})

test('a __proto__ key whose value is not an object is data as well', () => {
  const out = merge({ service: 'checkout' }, JSON.parse('{"__proto__": "text", "level": "debug"}'))

  assert.equal(own(out, '__proto__'), true)
  assert.equal(out.__proto__, 'text')
  assert.equal(out.level, 'debug')
  assert.equal(Object.getPrototypeOf(out), Object.prototype)
})

test('in one source the dangerous key and an undefined key obey their own rules', () => {
  const source = JSON.parse('{"__proto__": {"both": true}}')
  Object.defineProperty(source, 'gone', { value: undefined, writable: true, enumerable: true, configurable: true })
  const out = merge({ gone: 1, keep: 2 }, source)

  assert.equal(own(out, '__proto__'), true, 'the dangerous key is data')
  assert.equal(out.both, undefined, 'and reached no prototype')
  assert.equal(own(out, 'gone'), true, 'the undefined key is present')
  assert.equal(out.gone, undefined)
  assert.equal(out.keep, 2)
})
