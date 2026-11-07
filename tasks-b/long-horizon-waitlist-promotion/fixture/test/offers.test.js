import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

test('a cancelled seat goes to the head of the waitlist', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.status, 'cancelled')
  assert.equal(res.offer?.memberId, 'amy')
  assert.equal(res.offer?.expiresAt, 60)
})

test('the only person waiting gets the offer', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-1', expiresAt: 60 })
})

test('accepting an offer hands over a fresh ticket', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  const accepted = svc.accept(res.offer.offerId, 20)
  assert.equal(accepted.status, 'accepted')
  assert.equal(svc.ticketOf('amy'), accepted.ticketId)
  assert.notEqual(accepted.ticketId, 'T-1')
  assert.equal(svc.positionOf('amy'), null)
  assert.equal(svc.positionOf('bob'), 1)
})

test('cancelling a ticket that does not exist is refused', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  assert.deepEqual(svc.cancel('T-9', 1), { status: 'unknown-ticket' })
  assert.deepEqual(svc.cancel('T-1', 2), { status: 'cancelled', offer: null })
  assert.deepEqual(svc.cancel('T-1', 3), { status: 'unknown-ticket' })
})
