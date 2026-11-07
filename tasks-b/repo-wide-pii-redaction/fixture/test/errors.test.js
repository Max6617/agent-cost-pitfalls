import test from 'node:test'
import assert from 'node:assert/strict'
import { toErrorPayload } from '../src/index.js'

const account = () => ({
  id: 'acct_01', name: 'Ada Lovelace', email: 'ada.lovelace@example.com',
  phone: '+44 20 7946 0018', address: '12 Analytical Way, London', plan: 'pro',
})

const card = () => ({
  brand: 'Visa', cardNumber: '4111111111111111', cardholder: 'ADA LOVELACE', expiry: '08/29',
})

test('an error payload redacts the account in its details', () => {
  const payload = toErrorPayload({
    code: 'account-invalid', message: 'the account was rejected',
    details: { account: account() },
  })
  assert.equal(payload.error.details.account.email, '***@example.com')
  assert.equal(payload.error.details.account.phone, '***')
})

test('an error payload redacts the card in its details', () => {
  const payload = toErrorPayload({
    code: 'card-declined', message: 'the card was declined',
    details: { card: card() },
  })
  assert.equal(payload.error.details.card.cardNumber, '***1111')
  assert.equal(payload.error.details.card.cardholder, '***')
})
