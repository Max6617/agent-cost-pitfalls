// Sub-problem 4: expiry - an offer whose time runs out is reclaimed, the seat
// moves on (or comes back on sale even when nobody is waiting), and a pending
// offer keeps its seat out of general sale.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

test('an expired offer moves to the next entry', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  svc.join('cyd', 'standard', 60)
  assert.equal(svc.offerFor('amy'), null)
  assert.deepEqual(svc.offerFor('bob'), { offerId: 'O-2', expiresAt: 110 })
  assert.deepEqual(
    ['amy', 'bob', 'cyd'].map((m) => svc.positionOf(m)),
    [1, 2, 3],
  )
})

test('expiry is not a decline: the member keeps their place and takes the next seat', () => {
  const svc = createService({ capacity: 2, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.purchase('y', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const first = svc.cancel('T-1', 10)
  assert.equal(first.offer?.memberId, 'amy')
  const second = svc.cancel('T-2', 70)
  assert.deepEqual(svc.offerFor('bob'), { offerId: 'O-2', expiresAt: 120 })
  assert.deepEqual(second.offer, { offerId: 'O-3', memberId: 'amy', expiresAt: 120 })
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-3', expiresAt: 120 })
  assert.deepEqual(
    ['amy', 'bob'].map((m) => svc.positionOf(m)),
    [1, 2],
  )
})

test('an offer that lapses with nobody waiting frees the seat', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  svc.cancel('T-1', 10)
  svc.leave('amy', 20)
  svc.leave('bob', 20)
  const res = svc.purchase('dan', 100)
  assert.equal(res.status, 'sold')
  assert.equal(svc.ticketOf('dan'), res.ticketId)
})

test('a pending offer holds its seat even when the member steps off the waitlist', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const res = svc.cancel('T-1', 10)
  svc.leave('amy', 20)
  svc.leave('bob', 20)
  assert.deepEqual(svc.purchase('dan', 30), { status: 'full' })
  assert.notEqual(svc.offerFor(res.offer.memberId), null)
})

test('an offer expires at its expiry instant, not after', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  assert.deepEqual(svc.accept(res.offer.offerId, 60), { status: 'expired' })
  assert.equal(svc.ticketOf('amy'), null)
  svc.leave('amy', 61)
  assert.equal(svc.purchase('yan', 62).status, 'sold')
})
