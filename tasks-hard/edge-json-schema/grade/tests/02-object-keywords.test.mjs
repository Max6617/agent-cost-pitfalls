// Sub-problem 2: the object keywords and how they overlap.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../src/index.js'

const pairs = (report) => report.errors.map((entry) => [entry.path, entry.keyword])

test('additionalProperties still applies next to patternProperties', () => {
  const schema = {
    type: 'object',
    properties: { id: { type: 'string' } },
    patternProperties: { '^x-': { type: 'string' } },
    additionalProperties: false,
  }

  assert.equal(validate(schema, { id: 'a', 'x-trace': 't' }).valid, true)

  const report = validate(schema, { id: 'a', 'x-trace': 't', count: 1, other: 2 })
  assert.equal(report.valid, false)
  assert.deepEqual(
    report.errors.map((entry) => entry.keyword),
    ['additionalProperties', 'additionalProperties'],
  )
})

test('a key described twice has to satisfy both descriptions', () => {
  const schema = {
    type: 'object',
    properties: { 'x-rate': { type: 'number' } },
    patternProperties: { '^x-': { minimum: 10 } },
  }

  assert.equal(validate(schema, { 'x-rate': 12 }).valid, true)
  assert.equal(validate(schema, { 'x-count': 12 }).valid, true)

  const named = validate(schema, { 'x-rate': 5 })
  assert.equal(named.valid, false)
  assert.deepEqual(pairs(named), [['/x-rate', 'minimum']])

  const patterned = validate(schema, { 'x-count': 5 })
  assert.deepEqual(pairs(patterned), [['/x-count', 'minimum']])
})

test('patternProperties searches the key, it does not match the whole key', () => {
  const schema = { type: 'object', patternProperties: { name: { type: 'string' } } }

  assert.equal(validate(schema, { name: 'a' }).valid, true)
  assert.equal(validate(schema, { username: 'a' }).valid, true)
  assert.equal(validate(schema, { surname: 'a' }).valid, true)

  const report = validate(schema, { username: 5 })
  assert.equal(report.valid, false)
  assert.deepEqual(pairs(report), [['/username', 'type']])
})

test('propertyNames and a subschema of additionalProperties both reach a key', () => {
  const schema = {
    type: 'object',
    propertyNames: { pattern: '^[a-z][a-z0-9-]*$' },
    patternProperties: { '^x-': { type: 'string' } },
    additionalProperties: { type: 'number' },
  }

  assert.equal(validate(schema, { count: 3, 'x-trace': 't' }).valid, true)

  const named = validate(schema, { count: 3, 'Bad-Key': 'x' })
  assert.equal(named.valid, false)
  assert.deepEqual(pairs(named), [['', 'propertyNames'], ['/Bad-Key', 'type']])

  const typed = validate(schema, { count: 3, other: 'nope' })
  assert.equal(typed.valid, false)
  assert.deepEqual(pairs(typed), [['/other', 'type']])
})
