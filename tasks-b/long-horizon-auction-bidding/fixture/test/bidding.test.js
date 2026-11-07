import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionHouse } from '../src/index.js'

test('a bid may rise by exactly the minimum increment', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 1000, endsAt: 100 })
  assert.equal(house.placeBid('lot', { bidder: 'amy', amount: 1000, at: 1 }).status, 'accepted')
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 1099, at: 2 }).status, 'too-low')
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 1100, at: 3 }).status, 'accepted')
})

test('the increment at a standing bid of 10,000 is 500', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 10000, endsAt: 100 })
  assert.equal(house.placeBid('lot', { bidder: 'amy', amount: 10000, at: 1 }).status, 'accepted')
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 10500, at: 2 }).status, 'accepted')
  assert.deepEqual(house.state('lot').highBid, { bidder: 'bo', amount: 10500 })
})

test('a lot whose bids stay below the reserve does not sell', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 1000, reserve: 9000, endsAt: 100 })
  house.placeBid('lot', { bidder: 'amy', amount: 5000, at: 10 })
  assert.deepEqual(house.close('lot', 100), { status: 'reserve-not-met', winner: null, price: null })
})

test('a lot with no bids closes unsold', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 1000, endsAt: 100 })
  assert.deepEqual(house.close('lot', 100), { status: 'no-bids', winner: null, price: null })
})
