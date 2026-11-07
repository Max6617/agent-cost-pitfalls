// Sub-problem 1: log lines carry the redacted payload, on every level, and
// only the payload is redacted - the message itself is free text.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLogger, toErrorPayload } from '../src/index.js'

const account = () => ({
  id: 'acct_01', name: 'Ada Lovelace', email: 'ada.lovelace@example.com',
  phone: '+44 20 7946 0018', address: '12 Analytical Way, London', plan: 'pro',
})

const card = () => ({
  brand: 'Visa', cardNumber: '4111111111111111', cardholder: 'ADA LOVELACE', expiry: '08/29',
})

test('an account payload is masked in the log line', () => {
  const log = createLogger()
  log.info('account.updated', { account: account() })
  const line = log.lines[0]
  assert.ok(line.startsWith('INFO account.updated '))
  assert.ok(line.includes('***@example.com'))
  assert.ok(!line.includes('ada.lovelace@example.com'))
  assert.ok(!line.includes('+44 20 7946 0018'))
  assert.ok(!line.includes('12 Analytical Way'))
  assert.ok(line.includes('"id":"acct_01"'))
  assert.ok(line.includes('"plan":"pro"'))
})

test('a card payload shows the last four digits and masks the cardholder', () => {
  const log = createLogger()
  log.warn('card.stored', { card: card() })
  const line = log.lines[0]
  assert.ok(line.includes('***1111'))
  assert.ok(!line.includes('4111111111111111'))
  assert.ok(!line.includes('ADA LOVELACE'))
  assert.ok(line.includes('"brand":"Visa"'))
  assert.ok(line.includes('"expiry":"08/29"'))
})

test('the message is carried verbatim even when it mentions an address', () => {
  const log = createLogger()
  log.info('login failed for ada.lovelace@example.com', { account: account() })
  const line = log.lines[0]
  assert.ok(line.includes('login failed for ada.lovelace@example.com'))
  assert.ok(line.includes('***@example.com'))
  assert.ok(!line.includes('+44 20 7946 0018'))
})

test('an error payload logged after it was built is still masked inside the line', () => {
  const log = createLogger()
  const payload = toErrorPayload({
    code: 'account-invalid', message: 'the account was rejected',
    details: { account: account() },
  })
  log.error('create.failed', payload)
  const line = log.lines[0]
  assert.ok(line.includes('"code":"account-invalid"'))
  assert.ok(line.includes('***@example.com'))
  assert.ok(!line.includes('ada.lovelace@example.com'))
  assert.ok(!line.includes('12 Analytical Way'))
})
