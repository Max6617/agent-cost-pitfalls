import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionHouse } from '../src/index.js'

test('a bid inside the final window extends the close by the extension', () => {
  const house = createAuctionHouse()
  house.list({ id: 'lot', startPrice: 50000, endsAt: 1000 })
  house.placeBid('lot', { bidder: 'amy', amount: 55000, at: 100 })
  house.placeBid('lot', { bidder: 'bo', amount: 57000, at: 995 })
  assert.equal(house.state('lot').endsAt, 1025)
  assert.deepEqual(house.close('lot', 1010), { status: 'open' })
})

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
