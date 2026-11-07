// Sub-problem 3: validation. A field the patch does not mention cannot be
// wrong, a field that is null has been cleared, and an empty value is validated
// as the value it is.
import {
  test,
} from 'node:test'
import {
  default as strict,
} from 'node:assert/strict'
import { reportFields, validatePatch, validateRecord } from '../src/index.js'

const assert = strict

const PROFILE_SCHEMA = {
  id: { type: 'string', minLength: 1, required: true, nullable: false },
  name: { type: 'string', minLength: 1 },
  email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+$' },
  phone: { type: 'string', minLength: 1 },
  notes: { type: 'string' },
  marketingOptIn: { type: 'boolean' },
  tags: { type: 'array' },
  address: { type: 'object' },
  creditLimit: { type: 'number' },
}

const codesOf = (result) => result.errors.map((error) => error.code)

test('validation says nothing about the fields a patch leaves alone, and everything about the ones it names', () => {
  const result = validatePatch(PROFILE_SCHEMA, { name: 'Ada' })
  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.value, { name: 'Ada' })
  assert.deepEqual(codesOf(validatePatch(PROFILE_SCHEMA, { name: '' })), ['too-short'])
  assert.equal(validatePatch(PROFILE_SCHEMA, { notes: '' }).ok, true)
  assert.deepEqual(codesOf(validatePatch(PROFILE_SCHEMA, { email: '' })), ['format'])
  assert.equal(validatePatch(PROFILE_SCHEMA, { tags: [] }).ok, true)
  assert.equal(validatePatch(PROFILE_SCHEMA, { marketingOptIn: false }).ok, true)
  assert.deepEqual(codesOf(validatePatch(PROFILE_SCHEMA, { marketingOptIn: 'yes' })), ['wrong-type'])
  assert.deepEqual(codesOf(validatePatch(PROFILE_SCHEMA, { tags: {} })), ['wrong-type'])
})

test('clearing a nullable field is accepted, and a field that refuses clearing is not', () => {
  const cleared = validatePatch(PROFILE_SCHEMA, { phone: null })
  assert.equal(cleared.ok, true)
  assert.equal(cleared.value.phone, null)
  assert.deepEqual(codesOf(validatePatch(PROFILE_SCHEMA, { creditLimit: null })), [])
  assert.deepEqual(codesOf(validatePatch(PROFILE_SCHEMA, { name: null })), [])
  assert.deepEqual(codesOf(validatePatch(PROFILE_SCHEMA, { id: null })), ['nullable'])
})

test('a record still has to carry the fields the schema requires', () => {
  const incomplete = validateRecord(PROFILE_SCHEMA, { name: 'Ada' })
  assert.equal(incomplete.ok, false)
  assert.equal(codesOf(incomplete).includes('required'), true)
  assert.equal(incomplete.errors.some((error) => error.field === 'id' && error.code === 'required'), true)
  const withEmpty = validateRecord(PROFILE_SCHEMA, { id: 'p1', name: '' })
  assert.equal(withEmpty.errors.some((error) => error.field === 'name' && error.code === 'too-short'), true)
  assert.equal(withEmpty.errors.some((error) => error.field === 'notes' && error.code === 'required'), true)
  assert.equal(withEmpty.errors.some((error) => error.field === 'name' && error.code === 'required'), false)
  const complete = validateRecord(PROFILE_SCHEMA, {
    id: 'p1',
    name: 'Ada',
    email: 'ada@example.com',
    phone: '+49 30 1234',
    notes: '',
    marketingOptIn: false,
    tags: [],
    address: {},
    creditLimit: 0,
  })
  assert.equal(complete.ok, true)
  assert.deepEqual(codesOf(complete), [])
})

test('clearing a field skips the value checks that field would otherwise face', () => {
  assert.deepEqual(codesOf(validatePatch(PROFILE_SCHEMA, { email: 'not-an-address' })), ['format'])
  const result = validatePatch(PROFILE_SCHEMA, { email: null })
  assert.equal(result.ok, true)
  assert.deepEqual(codesOf(result), [])
  const [report] = reportFields(PROFILE_SCHEMA, { email: null })
  assert.equal(report.field, 'email')
  assert.equal(report.state, 'null')
  assert.deepEqual(report.codes, [])
  assert.equal(reportFields(PROFILE_SCHEMA, { name: '' })[0].state, 'empty')
  assert.equal(reportFields(PROFILE_SCHEMA, { name: null })[0].state, 'null')
  assert.equal(reportFields(PROFILE_SCHEMA, { name: null })[0].codes.length, 0)
})
