// Sub-problem 5: bundle merges, and the policies the merged view interacts with.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fallbackChain, createMessageService, MissingValueError } from '../src/index.js'

const bundles = {
  en: { 'app.title': 'Survey', 'checkout.cta': 'Checkout', 'nav.home': 'Home' },
  fr: { 'app.title': 'Sondage', 'checkout.cta': 'Commander' },
  'fr-CA': { 'checkout.cta': 'Caisse' },
}

test('the effective bundle merges the whole chain and the child wins per key', () => {
  const service = createMessageService({ bundles })
  const merged = service.effectiveBundle('fr-CA')
  assert.equal(merged['checkout.cta'], 'Caisse')
  assert.equal(merged['app.title'], 'Sondage')
  assert.equal(merged['nav.home'], 'Home')
})

test('the effective bundle of an unregistered locale still includes its parents', () => {
  const service = createMessageService({ bundles: { en: bundles.en, fr: bundles.fr } })
  const merged = service.effectiveBundle('fr-CA')
  assert.equal(merged['app.title'], 'Sondage')
  assert.equal(merged['nav.home'], 'Home')
})

test('the default locale is configurable and ends every chain', () => {
  assert.deepEqual(fallbackChain('de-AT', 'fr'), ['de-AT', 'de', 'fr'])
})

test('a missing value in strict mode names the placeholder and the key', () => {
  const service = createMessageService({
    bundles: { en: { 'profile.greeting': 'Hello, {name}!' } },
    mode: 'strict',
  })
  assert.throws(
    () => service.t('profile.greeting', { locale: 'en' }),
    (err) => err instanceof MissingValueError
      && err.message.includes('"name"')
      && err.message.includes('"profile.greeting"'),
  )
})
