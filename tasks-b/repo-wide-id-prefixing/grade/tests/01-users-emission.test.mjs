// Sub-problem 1: every id the users module emits is the canonical typed id.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createUser, parseUserId, serializeUser } from '../src/index.js'

test('createUser returns the canonical typed id for a legacy bare input', () => {
  const user = createUser({ id: 'aB9x', name: 'Ada', email: 'ada@example.com' })
  assert.equal(user.id, 'usr_aB9x')
})

test('serializeUser emits the canonical typed id', () => {
  const user = createUser({ id: '7Qa', name: 'Grace', email: null })
  const dto = serializeUser(user)
  assert.equal(dto.id, 'usr_7Qa')
  assert.equal(dto.name, 'Grace')
  assert.equal(dto.email, null)
})

test('emission is idempotent: a typed input is emitted unchanged, never doubled', () => {
  const fromTyped = createUser({ id: 'usr_7Qa', name: 'Hopper', email: null })
  assert.equal(fromTyped.id, 'usr_7Qa')
  assert.equal(serializeUser(fromTyped).id, 'usr_7Qa')
})

test('a user read rejects another type id as wrong-prefix', () => {
  assert.throws(() => parseUserId('ord_7Qa'), (e) => e.name === 'IdError' && e.code === 'wrong-prefix')
})
