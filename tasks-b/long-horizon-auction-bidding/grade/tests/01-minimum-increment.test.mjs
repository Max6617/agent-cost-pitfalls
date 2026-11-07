// Sub-problem 1: the minimum increment, read from the docs table by the
// standing high bid, with bracket bounds inclusive below and exclusive above.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionHouse } from '../src/index.js'

test('a bid may rise by exactly the increment, and one cent short is refused', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 1000, endsAt: 100 })
  assert.equal(house.placeBid('lot', { bidder: 'amy', amount: 1000, at: 1 }).status, 'accepted')
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 1099, at: 2 }).status, 'too-low')
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 1100, at: 3 }).status, 'accepted')
})

test('the increment steps up at exactly 2,500 - the bracket of the standing bid', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 2400, endsAt: 100 })
  assert.equal(house.placeBid('lot', { bidder: 'amy', amount: 2400, at: 1 }).status, 'accepted')
  // the standing bid is 2,400, which is still in the 100 row
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 2500, at: 2 }).status, 'accepted')
  // now the standing bid is exactly 2,500: the 250 row applies
  assert.equal(house.placeBid('lot', { bidder: 'cy', amount: 2749, at: 3 }).status, 'too-low')
  assert.equal(house.placeBid('lot', { bidder: 'cy', amount: 2750, at: 4 }).status, 'accepted')
})

test('the table reads the standing price, not the new bid', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 9000, endsAt: 100 })
  assert.equal(house.placeBid('lot', { bidder: 'amy', amount: 9000, at: 1 }).status, 'accepted')
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 9500, at: 2 }).status, 'accepted')
  assert.equal(house.placeBid('lot', { bidder: 'cy', amount: 10000, at: 3 }).status, 'accepted')
  // the settled standing bid is below 10,000, so the 250 row still applies
  assert.equal(house.placeBid('lot', { bidder: 'di', amount: 10500, at: 4 }).status, 'accepted')
})

test('a standing bid of exactly 10,000 sits in the 500 row', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 10000, endsAt: 100 })
  assert.equal(house.placeBid('lot', { bidder: 'amy', amount: 10000, at: 1 }).status, 'accepted')
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 10499, at: 2 }).status, 'too-low')
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 10500, at: 3 }).status, 'accepted')
})
