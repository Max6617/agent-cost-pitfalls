// Sub-problem 2: a cancelled seat is offered to the head of the line, one
// offer per member, and accepting issues a fresh ticket.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

test('a cancelled seat is offered to the head of the waitlist', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.status, 'cancelled')
  assert.deepEqual(res.offer, { offerId: 'O-1', memberId: 'amy', expiresAt: 60 })
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-1', expiresAt: 60 })
  assert.equal(svc.offerFor('bob'), null)
})

test('the only person waiting receives the offer', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-1', expiresAt: 60 })
})

test('cancelling a ticket that does not exist is refused', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  assert.deepEqual(svc.cancel('T-9', 1), { status: 'unknown-ticket' })
  assert.deepEqual(svc.cancel('T-1', 2), { status: 'cancelled', offer: null })
  assert.deepEqual(svc.cancel('T-1', 3), { status: 'unknown-ticket' })
  assert.equal(svc.ticketOf('x'), null)
})

test('a second cancellation passes over a member who already holds an offer', () => {
  const svc = createService({ capacity: 2, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.purchase('y', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const first = svc.cancel('T-1', 10)
  const second = svc.cancel('T-2', 11)
  assert.equal(first.offer?.memberId, 'amy')
  assert.deepEqual(second.offer, { offerId: 'O-2', memberId: 'bob', expiresAt: 61 })
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-1', expiresAt: 60 })
  assert.deepEqual(svc.offerFor('bob'), { offerId: 'O-2', expiresAt: 61 })
})

test('accepting hands over a fresh ticket and clears the entry', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  const accepted = svc.accept(res.offer.offerId, 59)
  assert.equal(accepted.status, 'accepted')
  assert.equal(accepted.ticketId, 'T-2')
  assert.equal(svc.ticketOf('amy'), 'T-2')
  assert.equal(svc.positionOf('amy'), null)
  assert.equal(svc.positionOf('bob'), 1)
  assert.equal(svc.offerFor('amy'), null)
})
