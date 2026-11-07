import test from 'node:test'
import assert from 'node:assert/strict'
import { createAccounts } from '../src/index.js'

test('registering the same address with a different case is the same account', () => {
  const accounts = createAccounts()
  accounts.register('Rowan.Park@example.com')
  const again = accounts.register('rowan.park@example.com')
  assert.equal(again.status, 'exists')
  assert.equal(again.account.id, 'a-1')
  assert.equal(accounts.count(), 1)
})

test('the display address is kept as typed', () => {
  const accounts = createAccounts()
  accounts.register('Dana.White@Gmail.com')
  assert.equal(accounts.lookup('Dana.White@Gmail.com').email, 'Dana.White@Gmail.com')
})
