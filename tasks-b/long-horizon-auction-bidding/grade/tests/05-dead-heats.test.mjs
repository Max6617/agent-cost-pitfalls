// Sub-problem 5: dead heats - a challenger whose ceiling equals the standing
// ceiling loses, whenever it arrived; the standing bid rises to the shared
// ceiling.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionHouse } from '../src/index.js'

test('equal ceilings stand with the earlier bid', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 70000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 56000, max: 70000, at: 200 })
  assert.deepEqual(house.state('lot').highBid, { bidder: 'amy', amount: 70000 })
  assert.deepEqual(house.outbox('lot'), [{ type: 'outbid', bidder: 'bo', at: 200 }])
})

test('a later bid with the same ceiling but a higher amount still loses', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 70000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 69000, max: 70000, at: 200 })
  assert.deepEqual(house.state('lot').highBid, { bidder: 'amy', amount: 70000 })
})

test('a ceiling above the standing ceiling wins at the standing ceiling plus the increment', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 70000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 56000, max: 73000, at: 200 })
  assert.deepEqual(house.state('lot').highBid, { bidder: 'bo', amount: 71000 })
})
