// Sub-problem 3: the reserve - a lot sells only when the settled high bid
// meets it, and the sale price is the settled bid, not the winner's ceiling.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionHouse } from '../src/index.js'

test('a lot sells when the closing bid meets the reserve', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 1000, reserve: 2000, endsAt: 100 })
  house.placeBid('lot', { bidder: 'amy', amount: 2000, at: 10 })
  house.placeBid('lot', { bidder: 'bo', amount: 6000, at: 20 })
  const result = house.close('lot', 100)
  assert.equal(result.status, 'sold')
  assert.equal(result.winner, 'bo')
})

test('a proxy war that stops below the reserve does not sell the lot', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 1000, reserve: 9000, endsAt: 100 })
  house.placeBid('lot', { bidder: 'amy', amount: 2000, max: 4000, at: 10 })
  house.placeBid('lot', { bidder: 'bo', amount: 3000, max: 9500, at: 20 })
  // the war settles at 4,000 plus the increment - far below bo's ceiling,
  // and far below the reserve
  assert.deepEqual(house.close('lot', 100), { status: 'reserve-not-met', winner: null, price: null })
})

test('closing exactly at the reserve is a sale, at the settled price', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, reserve: 61000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 60000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, max: 75000, at: 200 })
  assert.deepEqual(house.close('lot', 1000), { status: 'sold', winner: 'bo', price: 61000 })
})

test('a challenge beaten below the reserve leaves the lot unsold even with a high ceiling behind it', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 1000, reserve: 8500, endsAt: 100 })
  house.placeBid('lot', { bidder: 'amy', amount: 2000, max: 4000, at: 10 })
  house.placeBid('lot', { bidder: 'bo', amount: 3000, max: 8500, at: 20 })
  assert.deepEqual(house.close('lot', 100), { status: 'reserve-not-met', winner: null, price: null })
})
