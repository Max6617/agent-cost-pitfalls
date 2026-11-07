import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionHouse } from '../src/index.js'

test('a challenge the standing ceiling beats raises the standing bid only enough to win', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 60000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, at: 200 })
  assert.deepEqual(house.state('lot').highBid, { bidder: 'amy', amount: 58000 })
})

test('a winning challenge pays the standing ceiling plus the increment', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 60000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, max: 75000, at: 200 })
  assert.deepEqual(house.state('lot').highBid, { bidder: 'bo', amount: 61000 })
})
