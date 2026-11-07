// The payloads the support team sent us. The first case is the one that started
// the ticket: a body the schema allows was rejected anyway, and a body it should
// have rejected went through.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/index.js'

test('additionalProperties still rejects the keys nothing described', () => {
  const schema = {
    type: 'object',
    properties: { id: { type: 'string' } },
    patternProperties: { '^x-': { type: 'string' } },
    additionalProperties: false,
  }

  assert.equal(validate(schema, { id: 'a1', 'x-trace': 't1' }).valid, true)

  const report = validate(schema, { id: 'a1', 'x-trace': 't1', extra: 1 })
  assert.equal(report.valid, false)
  assert.deepEqual(
    report.errors.map((e) => [e.path, e.keyword]),
    [['', 'additionalProperties']],
  )
})

test('a body that only uses the described properties is accepted', () => {
  const schema = {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' }, count: { type: 'integer' } },
    additionalProperties: false,
  }

  assert.equal(validate(schema, { id: 'a1', count: 2 }).valid, true)

  const missing = validate(schema, { count: 2 })
  assert.equal(missing.valid, false)
  assert.deepEqual(
    missing.errors.map((e) => [e.path, e.keyword]),
    [['', 'required']],
  )
})

test('a length limit counts the characters the client sent', () => {
  const label = { type: 'string', maxLength: 3 }
  assert.equal(validate(label, '😀😀😀').valid, true)

  const short = validate({ type: 'string', minLength: 2 }, '😀')
  assert.equal(short.valid, false)
  assert.deepEqual(
    short.errors.map((e) => [e.path, e.keyword]),
    [['', 'minLength']],
  )
})

test('pattern matches anywhere in the string', () => {
  assert.equal(validate({ type: 'string', pattern: 'b' }, 'abc').valid, true)

  const anchored = validate({ type: 'string', pattern: '^b' }, 'abc')
  assert.equal(anchored.valid, false)
  assert.deepEqual(
    anchored.errors.map((e) => [e.path, e.keyword]),
    [['', 'pattern']],
  )
})
