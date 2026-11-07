// Sub-problem 6: the outbox - one outbid notice per displacement, in the
// order the displacements happen, including challenges a standing proxy beats.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionHouse } from '../src/index.js'

test('outbid notices arrive in the order bidders are displaced', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, at: 200 })
  house.placeBid('lot', { bidder: 'cy', amount: 60000, at: 300 })
  assert.deepEqual(house.outbox('lot'), [
    { type: 'outbid', bidder: 'amy', at: 200 },
    { type: 'outbid', bidder: 'bo', at: 300 },
  ])
})

test('a challenge the standing proxy beats is notified exactly once', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 90000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 56000, at: 200 })
  assert.deepEqual(house.outbox('lot'), [{ type: 'outbid', bidder: 'bo', at: 200 }])
  assert.deepEqual(house.state('lot').highBid, { bidder: 'amy', amount: 57000 })
})

test('each displaced bidder is notified once, in order, through a proxy war', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 60000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, max: 75000, at: 200 })
  house.placeBid('lot', { bidder: 'cy', amount: 62000, max: 80000, at: 300 })
  assert.deepEqual(house.outbox('lot'), [
    { type: 'outbid', bidder: 'amy', at: 200 },
    { type: 'outbid', bidder: 'bo', at: 300 },
  ])
  assert.deepEqual(house.state('lot').highBid, { bidder: 'cy', amount: 76000 })
})
