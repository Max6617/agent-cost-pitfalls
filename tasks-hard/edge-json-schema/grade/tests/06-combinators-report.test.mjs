// Sub-problem 6: the combinators and the shape of the report.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/index.js'

const pairs = (report) => report.errors.map((entry) => [entry.path, entry.keyword])

test('oneOf rejects an instance that two branches accept', () => {
  const amount = { oneOf: [{ type: 'number' }, { type: 'integer' }] }
  assert.equal(validate(amount, 2.5).valid, true)
  assert.equal(validate(amount, '2').valid, false)

  const ambiguous = validate(amount, 2)
  assert.equal(ambiguous.valid, false)
  assert.deepEqual(pairs(ambiguous), [['', 'oneOf']])

  const none = { oneOf: [{ type: 'string' }, { type: 'boolean' }] }
  const neither = validate(none, 2)
  assert.equal(neither.valid, false)
  assert.deepEqual(pairs(neither), [['', 'oneOf']])
})

test('anyOf and not collapse to a single entry', () => {
  const either = { anyOf: [{ type: 'string' }, { type: 'number' }] }
  assert.equal(validate(either, '1').valid, true)
  assert.equal(validate(either, 1).valid, true)

  const neither = validate(either, true)
  assert.equal(neither.valid, false)
  assert.deepEqual(pairs(neither), [['', 'anyOf']])

  const forbidden = { not: { type: 'number' } }
  assert.equal(validate(forbidden, 'x').valid, true)

  const matched = validate(forbidden, 5)
  assert.equal(matched.valid, false)
  assert.deepEqual(pairs(matched), [['', 'not']])
})

test('the report collects every failure in the order the walk finds it', () => {
  const schema = {
    type: 'object',
    properties: { name: { type: 'string' }, id: { type: 'string' } },
    required: ['tag'],
  }

  const report = validate(schema, { name: 1, id: 2 })
  assert.equal(report.valid, false)
  assert.deepEqual(pairs(report), [['/name', 'type'], ['/id', 'type'], ['', 'required']])
})

test('allOf adds nothing of its own and keeps its branch order', () => {
  const schema = { allOf: [{ properties: { b: { type: 'string' } } }, { required: ['a'] }] }
  const report = validate(schema, { b: 1 })

  assert.equal(report.valid, false)
  assert.deepEqual(pairs(report), [['/b', 'type'], ['', 'required']])
  assert.equal(report.errors.some((entry) => entry.keyword === 'allOf'), false)

  assert.equal(validate({ allOf: [{ type: 'number' }, { minimum: 0 }] }, 5).valid, true)
  assert.equal(validate({ allOf: [{ type: 'number' }, { minimum: 0 }] }, -5).valid, false)
})
