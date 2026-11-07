import test from 'node:test'
import assert from 'node:assert/strict'
import { fallbackChain, createMessageService, builtinBundles } from '../src/index.js'

test('a regional locale falls back through its language before the default', () => {
  assert.deepEqual(fallbackChain('fr-CA'), ['fr-CA', 'fr', 'en'])
})

test('a key translated in french shows french text to fr-CA users', () => {
  const service = createMessageService({ bundles: builtinBundles })
  assert.equal(service.t('app.title', { locale: 'fr-CA' }), 'Sondage')
})
