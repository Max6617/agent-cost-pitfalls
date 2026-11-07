// Sub-problem 4: the missing-key policy, strict vs lenient.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createMessageService, MissingKeyError } from '../src/index.js'

const bundles = {
  en: { 'app.title': 'Survey' },
  fr: { 'app.title': 'Sondage', 'checkout.cta': 'Commander' },
  'fr-CA': {},
}

test('lenient mode echoes the missing key', () => {
  const service = createMessageService({ bundles, mode: 'lenient' })
  assert.equal(service.t('no.such.key', { locale: 'en' }), 'no.such.key')
})

test('strict mode throws on a missing key', () => {
  const service = createMessageService({ bundles, mode: 'strict' })
  assert.throws(() => service.t('no.such.key', { locale: 'en' }), MissingKeyError)
})

test('the error names the key and the requested locale, not the fallback', () => {
  const service = createMessageService({ bundles, mode: 'strict' })
  assert.throws(
    () => service.t('no.such.key', { locale: 'fr-CA' }),
    (err) => err instanceof MissingKeyError
      && err.message.includes('"no.such.key"')
      && err.message.includes('"fr-CA"'),
  )
})

test('a key the parent language defines is not missing for the regional locale', () => {
  const service = createMessageService({ bundles, mode: 'strict' })
  assert.equal(service.t('checkout.cta', { locale: 'fr-CA' }), 'Commander')
})
