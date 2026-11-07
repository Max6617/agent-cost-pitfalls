// Sub-problem 2: the API serializers mask exactly the listed fields, in the
// shape the policy pins - including the email shape with its domain kept.
import test from 'node:test'
import assert from 'node:assert/strict'
import { accountToJson, cardToJson, chargeToJson, ticketToJson } from '../src/index.js'

const account = () => ({
  id: 'acct_01', name: 'Ada Lovelace', email: 'ada.lovelace@example.com',
  phone: '+44 20 7946 0018', address: '12 Analytical Way, London', plan: 'pro',
})

const card = () => ({
  brand: 'Visa', cardNumber: '4111111111111111', cardholder: 'ADA LOVELACE', expiry: '08/29',
})

const ticket = () => ({
  id: 't_101', accountId: 'acct_01', subject: 'Cannot sign in',
  body: 'I cannot sign in since Tuesday.', contactEmail: 'ada.lovelace@example.com', status: 'open',
})

const charge = () => ({
  id: 'ch_1', amountCents: 1200, currency: 'USD', account: account(), card: card(),
})

test('accountToJson masks the email but keeps the domain', () => {
  const out = accountToJson(account())
  assert.equal(out.email, '***@example.com')
  assert.equal(out.phone, '***')
  assert.equal(out.address, '***')
  assert.equal(out.name, 'Ada Lovelace')
  assert.equal(out.plan, 'pro')
})

test('ticketToJson applies the same email shape to the contact address', () => {
  const out = ticketToJson(ticket())
  assert.equal(out.contactEmail, '***@example.com')
  assert.equal(out.subject, 'Cannot sign in')
  assert.equal(out.body, 'I cannot sign in since Tuesday.')
  assert.equal(out.accountId, 'acct_01')
})

test('cardToJson keeps the brand and expiry and shows the last four', () => {
  const out = cardToJson(card())
  assert.equal(out.cardNumber, '***1111')
  assert.equal(out.cardholder, '***')
  assert.equal(out.brand, 'Visa')
  assert.equal(out.expiry, '08/29')
})

test('serializing an already-redacted account changes nothing', () => {
  const redacted = {
    id: 'acct_01', name: 'Ada Lovelace', email: '***@example.com',
    phone: '***', address: '***', plan: 'pro',
  }
  assert.deepEqual(accountToJson(redacted), redacted)
})

test('chargeToJson masks the account and card it carries and leaves the amount alone', () => {
  const out = chargeToJson(charge())
  assert.equal(out.account.email, '***@example.com')
  assert.equal(out.account.phone, '***')
  assert.equal(out.card.cardNumber, '***1111')
  assert.equal(out.card.cardholder, '***')
  assert.equal(out.amountCents, 1200)
  assert.equal(out.currency, 'USD')
})
