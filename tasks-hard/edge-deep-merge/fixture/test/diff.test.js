import test from 'node:test'
import assert from 'node:assert/strict'
import { merge, patch, diff, clone, deepEqual, hasOwn, REMOVED } from '../src/index.js'

test('the diff of a config against itself is null', () => {
  const config = { listen: { port: 80 }, tags: ['a', 'b'] }
  assert.equal(diff(config, clone(config)), null)
})

test('the diff of a key that went away deletes it when the patch is applied', () => {
  const base = { listen: { port: 80 }, legacy: true }
  const other = { listen: { port: 80 } }

  const change = diff(base, other)
  assert.ok(change, 'dropping a key is a change')
  assert.equal(change.legacy, REMOVED)

  const applied = patch(base, change)
  assert.ok(!hasOwn(applied, 'legacy'), 'the patch removes the key it names')
  assert.deepEqual(applied, other)
})

test('the diff names an added key and the patch applies it', () => {
  const base = { listen: { port: 80 } }
  const other = { listen: { port: 80, host: '0.0.0.0' } }

  const change = diff(base, other)
  assert.ok(change, 'there is a change to report')
  assert.equal(change.listen.host, '0.0.0.0')
  assert.deepEqual(patch(base, change), other)
})

test('a key set to undefined is a key, not an omission', () => {
  const change = diff({}, { note: undefined })
  assert.ok(change, 'a key present with the value undefined is a change')
  assert.ok(hasOwn(change, 'note'), 'the patch key is present')

  const out = merge({}, { note: undefined })
  assert.ok(hasOwn(out, 'note'))
})

test('values the toolkit does not own are passed through, not rebuilt', () => {
  const at = new Date(0)
  const lookup = new Map([['a', 1]])
  class Window {
    constructor(size) { this.size = size }
    contains(n) { return n < this.size }
  }
  const window = new Window(10)
  const base = { at, lookup, window, nested: { tags: ['x'] } }

  const out = merge(base, {})
  assert.equal(out.at, at)
  assert.equal(out.lookup, lookup)
  assert.equal(out.window, window, 'a config value that is an object with behaviour is not a record')

  const copy = clone(base)
  assert.equal(copy.at, at, 'a date is passed through by reference')
  assert.equal(copy.lookup, lookup, 'a map is passed through by reference')
  assert.equal(copy.window, window, 'an instance is passed through by reference')
  assert.notEqual(copy.nested, base.nested)
})

test('equality and the diff terminate on a structure that points at itself', () => {
  const one = { name: 'a' }
  one.self = one
  const two = { name: 'a' }
  two.self = two

  assert.equal(deepEqual(one, two), true)
  assert.equal(diff(one, two), null)
})
