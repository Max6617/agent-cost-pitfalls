// Sub-problem 1: fallback chains, and lookups that must walk every link.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fallbackChain, createMessageService } from '../src/index.js'

const bundles = {
  en: { 'app.title': 'Survey', 'checkout.cta': 'Checkout' },
  fr: { 'app.title': 'Sondage', 'checkout.cta': 'Commander' },
  'fr-CA': { 'checkout.cta': 'Caisse' },
}

test('a lookup in the default locale renders its own text', () => {
  const service = createMessageService({ bundles })
  assert.equal(service.t('app.title', { locale: 'en' }), 'Survey')
})

test('a key only the parent language defines still reaches a regional locale', () => {
  const service = createMessageService({ bundles })
  assert.equal(service.t('app.title', { locale: 'fr-CA' }), 'Sondage')
})

test('the chain walks every parent before the default locale', () => {
  assert.deepEqual(fallbackChain('fr-CA'), ['fr-CA', 'fr', 'en'])
})

test('a three-part tag sheds one segment at a time', () => {
  assert.deepEqual(fallbackChain('zh-Hant-TW'), ['zh-Hant-TW', 'zh-Hant', 'zh', 'en'])
})

test('a requested locale with no bundle of its own falls through to its parents', () => {
  // no 'fr-CA' bundle registered here; the fr translations must still beat en
  const service = createMessageService({ bundles: { en: bundles.en, fr: bundles.fr } })
  assert.equal(service.t('app.title', { locale: 'fr-CA' }), 'Sondage')
})
