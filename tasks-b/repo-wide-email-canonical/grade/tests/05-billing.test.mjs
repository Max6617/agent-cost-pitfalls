// Sub-problem 5: billing's identity index must follow an address update —
// the new address resolves at once, the old one stops, and both are matched
// by the canonical form.
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
  assert.equal(billing.contactFor('c-1'), 'ana@example.net')
})

test('only the latest address resolves after two updates, and an invalid update changes nothing', () => {
  const billing = createBilling()
  billing.setContact('c-1', 'first@example.com')
  billing.updateEmail('c-1', 'second@example.com')
  billing.updateEmail('c-1', 'third@example.com')
  assert.equal(billing.customerFor('first@example.com'), null)
  assert.equal(billing.customerFor('second@example.com'), null)
  assert.equal(billing.customerFor('third@example.com'), 'c-1')
  assert.equal(billing.updateEmail('c-1', 'bogus').status, 'invalid-email')
  assert.equal(billing.customerFor('third@example.com'), 'c-1')
  assert.equal(billing.contactFor('c-1'), 'third@example.com')
})

test('an updated address is matched canonically, dots and all', () => {
  const billing = createBilling()
  billing.setContact('c-1', 'Sam.Ochoa+billing@googlemail.com')
  billing.updateEmail('c-1', 'sam.ochoa@fastmail.fm')
  assert.equal(billing.customerFor('SAM.OCHOA@fastmail.fm'), 'c-1')
  assert.equal(billing.customerFor('samochoa@fastmail.fm'), null)
  assert.equal(billing.customerFor('samochoa@gmail.com'), null)
})
