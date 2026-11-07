// Schemas assembled out of branches, and the shape of the report itself.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/index.js'

test('oneOf wants one branch, not one or more', () => {
  const amount = { oneOf: [{ type: 'number' }, { type: 'integer' }] }
  assert.equal(validate(amount, 2.5).valid, true)

  const ambiguous = validate(amount, 2)
  assert.equal(ambiguous.valid, false)
  assert.deepEqual(
    ambiguous.errors.map((e) => [e.path, e.keyword]),
    [['', 'oneOf']],
  )
})

test('allOf and anyOf accept a value that satisfies the branches', () => {
  const positive = { allOf: [{ type: 'number' }, { minimum: 0 }] }
  assert.equal(validate(positive, 5).valid, true)

  const either = { anyOf: [{ type: 'string' }, { type: 'number' }] }
  assert.equal(validate(either, 5).valid, true)
  assert.equal(validate(either, '5').valid, true)
})

test('a tuple checks the positions it describes', () => {
  const pair = { type: 'array', items: [{ type: 'string' }, { type: 'number' }] }
  assert.equal(validate(pair, ['a', 1]).valid, true)

  const wrong = validate(pair, ['a', 'b'])
  assert.equal(wrong.valid, false)
  assert.deepEqual(
    wrong.errors.map((e) => [e.path, e.keyword]),
    [['/1', 'type']],
  )

  const capped = { type: 'array', items: [{ type: 'string' }], additionalItems: false }
  assert.equal(validate(capped, ['a']).valid, true)

  const extra = validate(capped, ['a', 1])
  assert.equal(extra.valid, false)
  assert.deepEqual(
    extra.errors.map((e) => [e.path, e.keyword]),
    [['', 'additionalItems']],
  )
})
