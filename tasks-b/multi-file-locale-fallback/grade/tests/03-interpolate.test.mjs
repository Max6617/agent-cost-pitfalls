// Sub-problem 3: placeholder substitution and the missing-value policy.
import test from 'node:test'
import assert from 'node:assert/strict'
import { interpolate, createMessageService, MissingValueError } from '../src/index.js'

test('placeholders are filled and values are stringified', () => {
  assert.equal(
    interpolate('Report for {name}: {count} rows', { name: 'Q1', count: 7 }),
    'Report for Q1: 7 rows',
  )
})

test('strict mode throws when a value is missing', () => {
  assert.throws(
    () => interpolate('Hello, {name}!', {}, { mode: 'strict' }),
    MissingValueError,
  )
})

test('lenient mode blanks a missing value', () => {
  assert.equal(interpolate('Hello, {name}!', {}), 'Hello, !')
})

test('the policy applies to a message that arrived through the fallback chain', () => {
  const service = createMessageService({
    bundles: { en: { 'profile.greeting': 'Hello, {name}!' }, fr: {} },
    mode: 'strict',
  })
  assert.throws(() => service.t('profile.greeting', { locale: 'fr-CA' }), MissingValueError)
})
