import test from 'node:test'
import assert from 'node:assert/strict'
import { accountToJson, ticketToJson } from '../src/index.js'

const account = () => ({
  id: 'acct_01', name: 'Ada Lovelace', email: 'ada.lovelace@example.com',
  phone: '+44 20 7946 0018', address: '12 Analytical Way, London', plan: 'pro',
})

const ticket = () => ({
  id: 't_101', accountId: 'acct_01', subject: 'Cannot sign in',
  body: 'I cannot sign in since Tuesday.', contactEmail: 'ada.lovelace@example.com', status: 'open',
})

test('the API shape of an account masks the email but keeps the domain', () => {
  const out = accountToJson(account())
  assert.equal(out.email, '***@example.com')
  assert.equal(out.phone, '***')
  assert.equal(out.name, 'Ada Lovelace')
})

test('the API shape of a ticket masks the contact email the same way', () => {
  const out = ticketToJson(ticket())
  assert.equal(out.contactEmail, '***@example.com')
  assert.equal(out.subject, 'Cannot sign in')
})
