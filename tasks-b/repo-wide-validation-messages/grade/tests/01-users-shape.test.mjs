// Sub-problem 1: users returns issue objects, not flat sentences - and the
// objects follow the convention on nested paths, null and check order too.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateUser } from '../src/index.js'

test('a blank user is two structured issues in documented field order', () => {
  assert.deepEqual(validateUser({}), [
    { field: 'name', code: 'required', message: 'is required' },
    { field: 'email', code: 'required', message: 'is required' },
  ])
})

test('a nested address reports the dotted path of the missing field', () => {
  assert.deepEqual(
    validateUser({ name: 'Ada Lovelace', email: 'ada@example.com', address: { city: 'London' } }),
    [{ field: 'address.zip', code: 'required', message: 'is required' }],
  )
})

test('null counts as missing on required fields and as absent on optional ones', () => {
  assert.deepEqual(validateUser({ name: null, email: null, age: null }), [
    { field: 'name', code: 'required', message: 'is required' },
    { field: 'email', code: 'required', message: 'is required' },
  ])
})

test('one issue per field, the first failing check in registry order', () => {
  assert.deepEqual(
    validateUser({ name: 'A', email: 'not-an-email', age: 17.5, address: 'nowhere' }),
    [
      { field: 'name', code: 'min-length', message: 'must be at least 2 characters' },
      { field: 'email', code: 'format', message: 'is not a valid email address' },
      { field: 'age', code: 'integer', message: 'must be a whole number' },
      { field: 'address', code: 'type', message: 'must be of type object' },
    ],
  )
})
