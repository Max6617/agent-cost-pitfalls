// Sub-problem 5: the rules in combination - tier decides who is offered a
// seat, skip-lists are per seat, a member holds at most one offer, and a long
// command stream replays deterministically.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

test('priority jumps the line for the offer itself', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  svc.join('pat', 'priority', 3)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'pat')
  assert.deepEqual(svc.offerFor('pat'), { offerId: 'O-1', expiresAt: 60 })
  assert.equal(svc.positionOf('pat'), 1)
})

test('two seats lapse together and nobody holds two offers', () => {
  const svc = createService({ capacity: 2, offerTtl: 20 })
  svc.purchase('x', 0)
  svc.purchase('y', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  svc.join('cyd', 'standard', 3)
  const first = svc.cancel('T-1', 10)
  const second = svc.cancel('T-2', 10)
  assert.equal(first.offer?.memberId, 'amy')
  assert.equal(second.offer?.memberId, 'bob')
  svc.join('dan', 'standard', 30)
  assert.equal(svc.offerFor('bob'), null)
  assert.deepEqual(svc.offerFor('cyd'), { offerId: 'O-3', expiresAt: 50 })
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-4', expiresAt: 50 })
  assert.deepEqual(
    ['amy', 'bob', 'cyd', 'dan'].map((m) => svc.positionOf(m)),
    [1, 2, 3, 4],
  )
})

test('stepping off the waitlist keeps the offer; rejoining starts at the tail', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  svc.join('cyd', 'standard', 3)
  const res = svc.cancel('T-1', 10)
  assert.equal(res.offer?.memberId, 'amy')
  assert.deepEqual(svc.leave('amy', 20), { status: 'left' })
  assert.equal(svc.positionOf('amy'), null)
  assert.deepEqual(svc.join('amy', 'standard', 25), { status: 'joined', position: 3 })
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-1', expiresAt: 60 })
  const accepted = svc.accept('O-1', 30)
  assert.equal(accepted.status, 'accepted')
  assert.equal(svc.ticketOf('amy'), accepted.ticketId)
  assert.equal(svc.positionOf('amy'), null)
  assert.deepEqual(
    ['bob', 'cyd'].map((m) => svc.positionOf(m)),
    [1, 2],
  )
})

test('a full evening at the box office', () => {
  const svc = createService({ capacity: 2, offerTtl: 50 })
  svc.purchase('x', 0)
  svc.purchase('y', 0)
  svc.join('amy', 'standard', 1)
  svc.join('pat', 'priority', 2)
  svc.join('bob', 'standard', 3)

  const first = svc.cancel('T-1', 10)
  assert.equal(first.offer?.memberId, 'pat')
  assert.equal(svc.decline(first.offer.offerId, 15).status, 'declined')
  assert.deepEqual(svc.offerFor('amy'), { offerId: 'O-2', expiresAt: 65 })

  const acceptedFirst = svc.accept('O-2', 20)
  assert.equal(acceptedFirst.status, 'accepted')

  const second = svc.cancel('T-2', 25)
  assert.equal(second.offer?.memberId, 'pat')

  assert.equal(svc.purchase('yan', 80).status, 'full')
  assert.equal(svc.offerFor('pat'), null)
  assert.deepEqual(svc.offerFor('bob'), { offerId: 'O-4', expiresAt: 130 })

  const acceptedSecond = svc.accept('O-4', 90)
  assert.equal(acceptedSecond.status, 'accepted')

  assert.equal(svc.ticketOf('x'), null)
  assert.equal(svc.ticketOf('y'), null)
  assert.equal(svc.ticketOf('amy'), acceptedFirst.ticketId)
  assert.equal(svc.ticketOf('bob'), acceptedSecond.ticketId)
  assert.equal(svc.positionOf('pat'), 1)
  assert.equal(svc.positionOf('amy'), null)
  assert.equal(svc.positionOf('bob'), null)
  assert.equal(svc.purchase('zed', 95).status, 'full')
})
