// Sub-problem 1: accounts must match and de-duplicate by the canonical form
// from docs/email-rules.md §3, while display keeps what the customer typed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAccounts } from '../src/index.js'

test('an account is found under a differently-cased local part', () => {
  const accounts = createAccounts()
  accounts.register('Rowan.Park@example.com')
  assert.equal(accounts.lookup('rowan.park@example.com')?.id, 'a-1')
})

test('a re-registration with a tag and different case is the same account', () => {
  const accounts = createAccounts()
  accounts.register('Rita.Moss+news@example.com')
  const again = accounts.register('rita.moss@example.com')
  assert.equal(again.status, 'exists')
  assert.equal(again.account.id, 'a-1')
  assert.equal(accounts.count(), 1)
})

test('alias domain, dots, tag and case all resolve to one account', () => {
  const accounts = createAccounts()
  accounts.register('Sam.Ochoa+alerts@googlemail.com')
  assert.equal(accounts.lookup('samochoa@gmail.com')?.id, 'a-1')
  assert.equal(accounts.register('SAM.OCHOA@GMAIL.COM').status, 'exists')
  assert.equal(accounts.count(), 1)
})

test('the display address is kept as typed', () => {
  const accounts = createAccounts()
  accounts.register('Dana.White@Gmail.com')
  assert.equal(accounts.lookup('Dana.White@Gmail.com').email, 'Dana.White@Gmail.com')
})

test('an empty tag still resolves to the same account', () => {
  const accounts = createAccounts()
  accounts.register('pat+@example.com')
  assert.equal(accounts.register('pat@example.com').status, 'exists')
  assert.equal(accounts.lookup('PAT@example.com')?.id, 'a-1')
})
