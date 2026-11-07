import test from 'node:test'
import assert from 'node:assert/strict'
import { paymentMethodLine } from '../src/index.js'

const card = () => ({
  brand: 'Visa', cardNumber: '4111111111111111', cardholder: 'ADA LOVELACE', expiry: '08/29',
})

test('the payment method line shows the last four digits', () => {
  assert.equal(paymentMethodLine(card()), 'Visa ***1111')
})

test('a grouped card number still masks to its last four digits', () => {
  assert.equal(paymentMethodLine({ ...card(), cardNumber: '4111 1111 1111 1111' }), 'Visa ***1111')
})
