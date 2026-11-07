import test from 'node:test'
import assert from 'node:assert/strict'
import { createLogger } from '../src/index.js'

const account = () => ({
  id: 'acct_01', name: 'Ada Lovelace', email: 'ada.lovelace@example.com',
  phone: '+44 20 7946 0018', address: '12 Analytical Way, London', plan: 'pro',
})

const card = () => ({
  brand: 'Visa', cardNumber: '4111111111111111', cardholder: 'ADA LOVELACE', expiry: '08/29',
})

test('a logged account has its listed fields masked', () => {
  const log = createLogger()
  log.info('account.updated', { account: account() })
  const line = log.lines[0]
  assert.ok(line.includes('***@example.com'))
  assert.ok(!line.includes('ada.lovelace@example.com'))
  assert.ok(!line.includes('+44 20 7946 0018'))
})

test('a logged card shows only the last four digits', () => {
  const log = createLogger()
  log.info('card.stored', { card: card() })
  const line = log.lines[0]
  assert.ok(line.includes('***1111'))
  assert.ok(!line.includes('4111111111111111'))
})
