import test from 'node:test'
import assert from 'node:assert/strict'
import { createMessageService, builtinBundles } from '../src/index.js'

test('english uses the singular form at one', () => {
  const service = createMessageService({ bundles: builtinBundles })
  assert.equal(service.t('cart.items', { locale: 'en', n: 1 }), '1 item')
})

test('french treats zero as singular', () => {
  const service = createMessageService({ bundles: builtinBundles })
  assert.equal(service.t('cart.items', { locale: 'fr', n: 0 }), '0 article')
})
