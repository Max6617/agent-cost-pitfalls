import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

test('an expired offer moves down the line', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  svc.join('cyd', 'standard', 60)
  assert.equal(svc.offerFor('amy'), null)
  assert.deepEqual(svc.offerFor('bob'), { offerId: 'O-2', expiresAt: 110 })
})

test('declining keeps your place in the queue', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  svc.join('cyd', 'standard', 3)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  assert.deepEqual(svc.decline(res.offer.offerId, 20), { status: 'declined' })
  assert.equal(svc.positionOf('amy'), 1)
  assert.deepEqual(svc.offerFor('bob'), { offerId: 'O-2', expiresAt: 70 })
})

test('a lapsed offer with nobody waiting frees the seat', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  svc.cancel('T-1', 10)
  svc.leave('amy', 20)
  svc.leave('bob', 20)
  assert.deepEqual(svc.purchase('dan', 100), { status: 'sold', ticketId: 'T-2' })
})
