// Sub-problem 4: soft close - every accepted bid inside the final window
// extends the deadline from its own `at`, whether or not it took the lead.
// This deployment runs a window of 10 ticks and an extension of 30.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionHouse } from '../src/index.js'

test('a late bid pushes the close out by the extension', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, at: 995 })
  assert.equal(house.state('lot').endsAt, 1025)
  assert.deepEqual(house.close('lot', 1010), { status: 'open' })
  assert.equal(house.close('lot', 1025).status, 'sold')
})

test('a late challenge the standing proxy beats still extends the close', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 90000, at: 100 })
  assert.equal(house.placeBid('lot', { bidder: 'bo', amount: 56000, at: 995 }).status, 'accepted')
  assert.equal(house.state('lot').endsAt, 1025)
  assert.deepEqual(house.close('lot', 1010), { status: 'open' })
})

test('an extension keeps the lot open for bids past the old deadline', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 90000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 56000, at: 995 })
  // accepted because the close moved to 1,025 - but 1,005 is not inside the
  // new window (1,015 onward), so the deadline does not move again
  assert.equal(house.placeBid('lot', { bidder: 'cy', amount: 58000, at: 1005 }).status, 'accepted')
  assert.equal(house.state('lot').endsAt, 1025)
})

test('the extension runs from the late bid, not from the old deadline', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, max: 90000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 56000, at: 999 })
  assert.equal(house.state('lot').endsAt, 1029)
})
