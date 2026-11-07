import test from 'node:test'
import assert from 'node:assert/strict'
import { createMessageService, builtinBundles, MissingKeyError } from '../src/index.js'

test('an english lookup renders english text', () => {
  const service = createMessageService({ bundles: builtinBundles })
  assert.equal(service.t('app.title', { locale: 'en' }), 'Survey')
})

test('lenient mode echoes a missing key', () => {
  const service = createMessageService({ bundles: builtinBundles, mode: 'lenient' })
  assert.equal(service.t('no.such.key', { locale: 'en' }), 'no.such.key')
})

test('strict mode throws on a missing key', () => {
  const service = createMessageService({ bundles: builtinBundles, mode: 'strict' })
  assert.throws(() => service.t('no.such.key', { locale: 'en' }), MissingKeyError)
})

test('the effective bundle for fr-CA includes the french translations', () => {
  const service = createMessageService({ bundles: builtinBundles })
  assert.equal(service.effectiveBundle('fr-CA')['app.title'], 'Sondage')
})
