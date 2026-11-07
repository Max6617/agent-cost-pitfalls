import test from 'node:test'
import assert from 'node:assert/strict'
import { interpolate, createMessageService, builtinBundles, MissingValueError } from '../src/index.js'

test('placeholders are filled from values', () => {
  assert.equal(
    interpolate('Report for {name}: {count} rows', { name: 'Q1', count: 7 }),
    'Report for Q1: 7 rows',
  )
})

test('strict mode refuses to render a placeholder with no value', () => {
  const service = createMessageService({ bundles: builtinBundles, mode: 'strict' })
  assert.throws(() => service.t('profile.greeting', { locale: 'en' }), MissingValueError)
})
