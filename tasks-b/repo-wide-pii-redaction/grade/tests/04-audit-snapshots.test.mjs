// Sub-problem 4: an audit snapshot captures the redacted entity without
// touching the record it was taken from, and shares no state with it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { snapshot } from '../src/index.js'

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

const at = '2024-03-04T09:30:00Z'

test('a snapshot masks the entity and leaves the source record as it was', () => {
  const source = account()
  const snap = snapshot({ at, actor: 'svc-billing', action: 'account.updated', kind: 'account', entity: source })
  assert.equal(snap.entity.email, '***@example.com')
  assert.equal(snap.entity.phone, '***')
  assert.equal(source.email, 'ada.lovelace@example.com')
  assert.equal(source.phone, '+44 20 7946 0018')
  assert.equal(source.address, '12 Analytical Way, London')
})

test('the captured entity is masked the way the policy pins it', () => {
  const snap = snapshot({ at, actor: 'svc-billing', action: 'account.updated', kind: 'account', entity: account() })
  assert.deepEqual(snap.entity, {
    id: 'acct_01', name: 'Ada Lovelace', email: '***@example.com',
    phone: '***', address: '***', plan: 'pro',
  })
})

test('the snapshot shares no state with the source', () => {
  const source = charge()
  const snap = snapshot({ at, actor: 'svc-billing', action: 'charge.refunded', kind: 'charge', entity: source })
  snap.entity.card.brand = 'MUTATED'
  snap.entity.account.name = 'MUTATED'
  snap.entity.amountCents = 0
  assert.equal(source.card.brand, 'Visa')
  assert.equal(source.account.name, 'Ada Lovelace')
  assert.equal(source.amountCents, 1200)
})

test('a charge snapshot masks what it carries without clobbering the original', () => {
  const source = charge()
  const snap = snapshot({ at, actor: 'svc-billing', action: 'charge.refunded', kind: 'charge', entity: source })
  assert.equal(snap.entity.card.cardNumber, '***1111')
  assert.equal(snap.entity.card.cardholder, '***')
  assert.equal(snap.entity.account.email, '***@example.com')
  assert.equal(source.card.cardNumber, '4111111111111111')
  assert.equal(source.card.cardholder, 'ADA LOVELACE')
  assert.equal(source.account.email, 'ada.lovelace@example.com')
})

test('the audit metadata is carried verbatim', () => {
  const snap = snapshot({ at, actor: 'svc-billing', action: 'account.updated', kind: 'account', entity: account() })
  assert.equal(snap.at, '2024-03-04T09:30:00Z')
  assert.equal(snap.actor, 'svc-billing')
  assert.equal(snap.action, 'account.updated')
  assert.equal(snap.kind, 'account')
})
