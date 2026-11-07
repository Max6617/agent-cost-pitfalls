// Sub-problem 3: declining - the member keeps their original position exactly
// once, the seat moves on without them, and a second decline takes them off.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

test('declining keeps your place and the seat moves to the next entry', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  svc.join('cyd', 'standard', 3)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  assert.deepEqual(svc.decline(res.offer.offerId, 20), { status: 'declined' })
  assert.deepEqual(
    ['amy', 'bob', 'cyd'].map((m) => svc.positionOf(m)),
    [1, 2, 3],
  )
  assert.equal(svc.offerFor('amy'), null)
  assert.deepEqual(svc.offerFor('bob'), { offerId: 'O-2', expiresAt: 70 })
  assert.equal(svc.offerFor('cyd'), null)
})

test('a declined seat skips you, but the next seat is yours again', () => {
  const svc = createService({ capacity: 2, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.purchase('y', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const first = svc.cancel('T-1', 10)
  assert.equal(first.offer?.memberId, 'amy')
  svc.decline(first.offer.offerId, 20)
  const second = svc.cancel('T-2', 30)
  assert.deepEqual(second.offer, { offerId: 'O-3', memberId: 'amy', expiresAt: 80 })
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-3', expiresAt: 80 })
  assert.deepEqual(svc.offerFor('bob'), { offerId: 'O-2', expiresAt: 70 })
  assert.equal(svc.positionOf('amy'), 1)
})

test('declining twice removes you from the waitlist', () => {
  const svc = createService({ capacity: 2, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.purchase('y', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const first = svc.cancel('T-1', 10)
  const second = svc.cancel('T-2', 11)
  assert.equal(first.offer?.memberId, 'amy')
  assert.equal(second.offer?.memberId, 'bob')
  assert.equal(svc.decline(first.offer.offerId, 20).status, 'declined')
  assert.equal(svc.decline(second.offer.offerId, 21).status, 'declined')
  const third = svc.offerFor('amy')
  assert.deepEqual(third, { offerId: 'O-3', expiresAt: 71 })
  assert.equal(svc.decline(third.offerId, 22).status, 'declined')
  assert.equal(svc.positionOf('amy'), null)
  assert.equal(svc.positionOf('bob'), 1)
  assert.equal(svc.offerFor('amy'), null)
  assert.equal(svc.offerFor('bob'), null)
})

test('a priority member who declines keeps their tier position', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('pat', 'priority', 2)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'pat')
  assert.equal(svc.decline(res.offer.offerId, 20).status, 'declined')
  assert.equal(svc.positionOf('pat'), 1)
  assert.equal(svc.positionOf('amy'), 2)
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-2', expiresAt: 70 })
})

test('commands on a resolved offer report its status and change nothing', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const res = svc.cancel('T-1', 10)
  assert.equal(svc.decline(res.offer.offerId, 20).status, 'declined')
  assert.deepEqual(svc.accept(res.offer.offerId, 30), { status: 'declined' })
  assert.deepEqual(svc.decline(res.offer.offerId, 40), { status: 'declined' })
  assert.equal(svc.offerFor(res.offer.memberId), null)
  assert.deepEqual(svc.accept('O-9', 50), { status: 'unknown-offer' })
  assert.equal(svc.ticketOf(res.offer.memberId), null)
})
