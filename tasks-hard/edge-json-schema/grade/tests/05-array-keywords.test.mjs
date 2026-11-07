// Sub-problem 5: arrays, tuples and the element equality.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/index.js'

const pairs = (report) => report.errors.map((entry) => [entry.path, entry.keyword])

test('a tuple describes a prefix and allows the rest by default', () => {
  const pair = { type: 'array', items: [{ type: 'string' }, { type: 'number' }] }
  assert.equal(validate(pair, ['a', 1]).valid, true)
  assert.equal(validate(pair, ['a', 1, true, null]).valid, true)
  assert.equal(validate(pair, ['a']).valid, true)
  assert.equal(validate(pair, []).valid, true)

  const wrong = validate(pair, ['a', 'b'])
  assert.equal(wrong.valid, false)
  assert.deepEqual(pairs(wrong), [['/1', 'type']])

  const capped = { type: 'array', items: [{ type: 'string' }], additionalItems: false }
  assert.equal(validate(capped, ['a']).valid, true)
  const extra = validate(capped, ['a', 1])
  assert.equal(extra.valid, false)
  assert.deepEqual(pairs(extra), [['', 'additionalItems']])

  const typed = { type: 'array', items: [{ type: 'string' }], additionalItems: { type: 'number' } }
  assert.equal(validate(typed, ['a', 1]).valid, true)
  const bad = validate(typed, ['a', 'b'])
  assert.deepEqual(pairs(bad), [['/1', 'type']])
})

test('uniqueItems uses the equality of the subset', () => {
  const unique = { type: 'array', uniqueItems: true }
  assert.equal(validate(unique, [1, 2]).valid, true)
  assert.equal(validate(unique, [{ a: 1 }, { a: 1, b: 2 }]).valid, true)
  assert.equal(validate(unique, [true, 1]).valid, true)
  assert.equal(validate(unique, ['1', 1]).valid, true)

  const reordered = validate(unique, [{ a: 1, b: 2 }, { b: 2, a: 1 }])
  assert.equal(reordered.valid, false)
  assert.deepEqual(pairs(reordered), [['', 'uniqueItems']])

  const written = validate(unique, [1, 1.0])
  assert.equal(written.valid, false)
  assert.deepEqual(pairs(written), [['', 'uniqueItems']])

  const zeroes = validate(unique, [0, -0])
  assert.equal(zeroes.valid, false)
  assert.deepEqual(pairs(zeroes), [['', 'uniqueItems']])
})

test('items as a schema reaches every element and the counts are inclusive', () => {
  const list = { type: 'array', items: { type: 'number' }, minItems: 1, maxItems: 2 }
  assert.equal(validate(list, [1, 2]).valid, true)
  assert.equal(validate(list, [1]).valid, true)

  const empty = validate(list, [])
  assert.equal(empty.valid, false)
  assert.deepEqual(pairs(empty), [['', 'minItems']])

  const many = validate(list, [1, 2, 3])
  assert.equal(many.valid, false)
  assert.deepEqual(pairs(many), [['', 'maxItems']])

  const wrong = validate(list, [1, 'x'])
  assert.equal(wrong.valid, false)
  assert.deepEqual(pairs(wrong), [['/1', 'type']])

  const ignored = { type: 'array', items: { type: 'number' }, additionalItems: false }
  assert.equal(validate(ignored, [1, 2]).valid, true)
})

test('an empty tuple, and a tuple longer than the instance', () => {
  const open = { type: 'array', items: [] }
  assert.equal(validate(open, []).valid, true)
  assert.equal(validate(open, [1, 'a']).valid, true)

  const closed = { type: 'array', items: [], additionalItems: false }
  assert.equal(validate(closed, []).valid, true)
  const extra = validate(closed, [1])
  assert.equal(extra.valid, false)
  assert.deepEqual(pairs(extra), [['', 'additionalItems']])

  const two = { type: 'array', items: [{ type: 'string' }, { type: 'string' }] }
  assert.equal(validate(two, []).valid, true)
  assert.equal(validate(two, ['a']).valid, true)
  assert.equal(validate(two, ['a', 1]).valid, false)
})
