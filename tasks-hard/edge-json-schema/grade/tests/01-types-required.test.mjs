// Sub-problem 1: the type names, and required.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/index.js'

const pairs = (report) => report.errors.map((entry) => [entry.path, entry.keyword])

test('integer is a whole number however the client wrote it', () => {
  const schema = { type: 'integer' }
  for (const whole of [1, 1.0, 2.0, -3, 0, 1e2]) {
    assert.equal(validate(schema, whole).valid, true, `expected ${whole} to be an integer`)
  }
  for (const fractional of [1.5, -0.5, 1e-3]) {
    const report = validate(schema, fractional)
    assert.equal(report.valid, false, `expected ${fractional} to be rejected`)
    assert.deepEqual(pairs(report), [['', 'type']])
  }
})

test('null is not undefined, and an array is not an object', () => {
  assert.equal(validate({ type: 'null' }, null).valid, true)
  assert.equal(validate({ type: 'object' }, {}).valid, true)
  assert.equal(validate({ type: 'array' }, []).valid, true)

  assert.equal(validate({ type: 'null' }, undefined).valid, false)
  assert.equal(validate({ type: 'object' }, []).valid, false)
  assert.equal(validate({ type: 'array' }, {}).valid, false)
  assert.equal(validate({ type: 'number' }, '1').valid, false)

  const report = validate({ type: 'null' }, undefined)
  assert.deepEqual(pairs(report), [['', 'type']])
})

test('required is about the property, not about its value', () => {
  const schema = { type: 'object', required: ['id'] }
  assert.equal(validate(schema, { id: undefined }).valid, true)
  assert.equal(validate({ type: 'object', required: [] }, {}).valid, true)

  const report = validate({ type: 'object', required: ['id', 'name'] }, { name: 'n' })
  assert.equal(report.valid, false)
  assert.deepEqual(pairs(report), [['', 'required']])
})

test('a non-finite number is a type failure and nothing else', () => {
  assert.equal(validate({ type: 'number' }, NaN).valid, false)
  assert.equal(validate({ type: 'integer' }, Infinity).valid, false)
  assert.equal(validate({ type: 'number' }, -Infinity).valid, false)

  const report = validate({ minimum: 0, maximum: 10 }, Infinity)
  assert.equal(report.valid, false)
  assert.deepEqual(pairs(report), [['', 'type']])

  const nan = validate({ type: 'number' }, NaN)
  assert.deepEqual(pairs(nan), [['', 'type']])
})
