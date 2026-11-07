// Sub-problem 2: proxy settlement - the winner pays the smaller of their own
// ceiling and the loser's ceiling plus the increment at that level.
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

test('a winning challenge pays the standing ceiling plus the increment, not its own ceiling', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 60000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, max: 75000, at: 200 })
  assert.deepEqual(house.state('lot').highBid, { bidder: 'bo', amount: 61000 })
})

test('a three-way proxy war settles each step from the current second', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 60000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, max: 62000, at: 200 })
  house.placeBid('lot', { bidder: 'cy', amount: 63000, max: 64000, at: 300 })
  assert.deepEqual(house.state('lot').highBid, { bidder: 'cy', amount: 63000 })
  assert.deepEqual(house.outbox('lot'), [
    { type: 'outbid', bidder: 'amy', at: 200 },
    { type: 'outbid', bidder: 'bo', at: 300 },
  ])
})

test('the standing bidder may raise their own ceiling without moving the price', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 60000, at: 100 })
  assert.equal(house.placeBid('lot', { bidder: 'amy', amount: 56000, max: 66000, at: 200 }).status, 'accepted')
  assert.deepEqual(house.state('lot').highBid, { bidder: 'amy', amount: 55000 })
  assert.deepEqual(house.outbox('lot'), [])
})
