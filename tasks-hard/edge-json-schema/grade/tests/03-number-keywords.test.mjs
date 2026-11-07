// Sub-problem 3: the numeric keywords, including the divisors.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate, SchemaError } from '../src/index.js'

const pairs = (report) => report.errors.map((entry) => [entry.path, entry.keyword])

test('the exclusive bounds reject the value they name', () => {
  const above = { type: 'number', exclusiveMinimum: 0 }
  assert.equal(validate(above, 1).valid, true)
  assert.equal(validate(above, 0.5).valid, true)

  const zero = validate(above, 0)
  assert.equal(zero.valid, false)
  assert.deepEqual(pairs(zero), [['', 'exclusiveMinimum']])

  const below = { type: 'number', exclusiveMaximum: 1 }
  assert.equal(validate(below, 0.5).valid, true)

  const one = validate(below, 1)
  assert.equal(one.valid, false)
  assert.deepEqual(pairs(one), [['', 'exclusiveMaximum']])
})

test('a multiple is judged on the value, not on the binary division', () => {
  const cent = { type: 'number', multipleOf: 0.01 }
  assert.equal(validate(cent, 19.99).valid, true)
  assert.equal(validate(cent, 0.01).valid, true)
  assert.equal(validate(cent, 0).valid, true)
  assert.equal(validate({ type: 'number', multipleOf: 0.1 }, 0.3).valid, true)
  assert.equal(validate({ type: 'number', multipleOf: 0.25 }, 1.75).valid, true)

  const artefact = validate({ type: 'number', multipleOf: 0.1 }, 0.1 + 0.2)
  assert.equal(artefact.valid, false)
  assert.deepEqual(pairs(artefact), [['', 'multipleOf']])

  const odd = validate(cent, 0.015)
  assert.deepEqual(pairs(odd), [['', 'multipleOf']])
})

test('a divisor nothing can be a multiple of is a schema bug', () => {
  assert.throws(() => validate({ type: 'number', multipleOf: 0 }, 5), SchemaError)
  assert.throws(() => validate({ type: 'number', multipleOf: -2 }, 5), SchemaError)

  const report = validate({ type: 'number', multipleOf: 2 }, 5)
  assert.equal(report.valid, false)
  assert.deepEqual(pairs(report), [['', 'multipleOf']])
})

test('minimum and maximum include the boundary they name', () => {
  const size = { type: 'number', minimum: 1, maximum: 3 }
  assert.equal(validate(size, 1).valid, true)
  assert.equal(validate(size, 3).valid, true)
  assert.equal(validate(size, 2.5).valid, true)

  const low = validate(size, 0.5)
  assert.equal(low.valid, false)
  assert.deepEqual(pairs(low), [['', 'minimum']])

  const high = validate(size, 3.5)
  assert.deepEqual(pairs(high), [['', 'maximum']])
})
