// Sub-problem 5: card numbers show '***' plus the last four digits of the
// number - on the receipt lines, and identically on every other surface.
import test from 'node:test'
import assert from 'node:assert/strict'
import { cardToJson, createLogger, describeCharge, paymentMethodLine } from '../src/index.js'

const card = () => ({
  brand: 'Visa', cardNumber: '4111111111111111', cardholder: 'ADA LOVELACE', expiry: '08/29',
})

const account = () => ({
  id: 'acct_01', name: 'Ada Lovelace', email: 'ada.lovelace@example.com',
  phone: '+44 20 7946 0018', address: '12 Analytical Way, London', plan: 'pro',
})

const charge = () => ({
  id: 'ch_1', amountCents: 1200, currency: 'USD', account: account(), card: card(),
})

test('the payment method line shows the last four digits of the number', () => {
  assert.equal(paymentMethodLine(card()), 'Visa ***1111')
})

test('grouping characters in the stored number do not change the mask', () => {
  assert.equal(paymentMethodLine({ ...card(), cardNumber: '4111-1111-1111-1111' }), 'Visa ***1111')
  assert.equal(paymentMethodLine({ ...card(), cardNumber: '4111 1111 1111 1111' }), 'Visa ***1111')
})

test('the same card masks to the same shape on every surface', () => {
  const c = card()
  const log = createLogger()
  log.info('card.stored', { card: c })
  assert.equal(cardToJson(c).cardNumber, '***1111')
  assert.ok(log.lines[0].includes('***1111'))
  assert.ok(!log.lines[0].includes('4111111111111111'))
  assert.ok(paymentMethodLine(c).endsWith('***1111'))
})

test('a charge receipt names the amount and the masked card', () => {
  assert.equal(describeCharge(charge()), 'charge ch_1: USD 1200 on Visa ***1111')
})
