// Sub-problem 3: an error payload's details redact like every other surface;
// the envelope itself is free text and structure.
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

const charge = () => ({
  id: 'ch_1', amountCents: 1200, currency: 'USD', account: account(), card: card(),
})

test('a rejected account in the details is redacted', () => {
  const payload = toErrorPayload({
    code: 'account-invalid', message: 'the account was rejected',
    details: { account: account() },
  })
  assert.equal(payload.error.details.account.email, '***@example.com')
  assert.equal(payload.error.details.account.phone, '***')
  assert.equal(payload.error.details.account.address, '***')
  assert.equal(payload.error.details.account.id, 'acct_01')
})

test('a declined card in the details shows the last four only', () => {
  const payload = toErrorPayload({
    code: 'card-declined', message: 'the card was declined',
    details: { card: card() },
  })
  assert.equal(payload.error.details.card.cardNumber, '***1111')
  assert.equal(payload.error.details.card.cardholder, '***')
  assert.equal(payload.error.details.card.brand, 'Visa')
})

test('a failed charge redacts the account and card it carries', () => {
  const payload = toErrorPayload({
    code: 'charge-failed', message: 'the charge did not go through',
    details: { charge: charge() },
  })
  const detail = payload.error.details.charge
  assert.equal(detail.account.email, '***@example.com')
  assert.equal(detail.card.cardNumber, '***1111')
  assert.equal(detail.card.cardholder, '***')
  assert.equal(detail.amountCents, 1200)
})

test('the envelope keeps the code and message verbatim', () => {
  const payload = toErrorPayload({
    code: 'rate-limited', message: 'slow down; ask ada.lovelace@example.com',
    details: { account: account() },
  })
  assert.equal(payload.error.code, 'rate-limited')
  assert.equal(payload.error.message, 'slow down; ask ada.lovelace@example.com')
})
