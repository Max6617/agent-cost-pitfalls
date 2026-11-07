import test from 'node:test'
import assert from 'node:assert/strict'
import { snapshot } from '../src/index.js'

const account = () => ({
  id: 'acct_01', name: 'Ada Lovelace', email: 'ada.lovelace@example.com',
  phone: '+44 20 7946 0018', address: '12 Analytical Way, London', plan: 'pro',
})

test('a snapshot masks the entity it captures', () => {
  const snap = snapshot({
    at: '2024-03-04T09:30:00Z', actor: 'svc-billing', action: 'account.updated',
    kind: 'account', entity: account(),
  })
  assert.equal(snap.entity.email, '***@example.com')
  assert.equal(snap.entity.phone, '***')
})

test('taking a snapshot leaves the source record alone', () => {
  const source = account()
  snapshot({
    at: '2024-03-04T09:30:00Z', actor: 'svc-billing', action: 'account.updated',
    kind: 'account', entity: source,
  })
  assert.equal(source.email, 'ada.lovelace@example.com')
  assert.equal(source.phone, '+44 20 7946 0018')
})
