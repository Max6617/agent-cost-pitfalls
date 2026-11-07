// Prices and quantities, from the billing team's reports.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/index.js'

test('a price with cents is a multiple of a cent', () => {
  const price = { type: 'number', multipleOf: 0.01 }
  assert.equal(validate(price, 19.99).valid, true)
  assert.equal(validate(price, 20).valid, true)
  assert.equal(validate({ type: 'number', multipleOf: 0.1 }, 0.3).valid, true)
})

test('minimum and maximum include the value they name', () => {
  const rating = { type: 'number', minimum: 0, maximum: 10 }
  assert.equal(validate(rating, 0).valid, true)
  assert.equal(validate(rating, 10).valid, true)

  const tooBig = validate(rating, 10.5)
  assert.equal(tooBig.valid, false)
  assert.deepEqual(
    tooBig.errors.map((e) => [e.path, e.keyword]),
    [['', 'maximum']],
  )

  const tooSmall = validate(rating, -1)
  assert.deepEqual(
    tooSmall.errors.map((e) => [e.path, e.keyword]),
    [['', 'minimum']],
  )
})

test('an empty required list and a property count', () => {
  const patch = { type: 'object', required: [], minProperties: 1 }
  assert.equal(validate(patch, { name: 'a' }).valid, true)

  const empty = validate(patch, {})
  assert.equal(empty.valid, false)
  assert.deepEqual(
    empty.errors.map((e) => [e.path, e.keyword]),
    [['', 'minProperties']],
  )
})
