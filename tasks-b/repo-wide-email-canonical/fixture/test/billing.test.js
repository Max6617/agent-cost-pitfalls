import test from 'node:test'
import assert from 'node:assert/strict'
import { createBilling } from '../src/index.js'

test('the new address resolves after an email update', () => {
  const billing = createBilling()
  billing.setContact('c-1', 'ana@example.com')
  assert.equal(billing.updateEmail('c-1', 'ana@example.net').status, 'updated')
  assert.equal(billing.customerFor('ana@example.net'), 'c-1')
})

test('the old address stops resolving after an email update', () => {
  const billing = createBilling()
  billing.setContact('c-1', 'ana@example.com')
  billing.updateEmail('c-1', 'ana@example.net')
  assert.equal(billing.customerFor('ana@example.com'), null)
})
