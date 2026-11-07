/**
 * The house: a registry of lots, wired to the deployment's configuration.
 *
 * `createAuctionHouse()` loads config/auction.config.json from this checkout;
 * pass `{ increments, softClose }` overrides for what-if runs and tests.
 */
import { Auction } from './auction.js'
import { loadConfig } from './config.js'

export function createAuctionHouse(overrides = {}) {
  const config = loadConfig()
  const increments = overrides.increments ?? config.increments
  const softClose = overrides.softClose ?? config.softClose
  const auctions = new Map()

  return {
    list({ id, startPrice, reserve = null, endsAt }) {
      if (auctions.has(id)) return { status: 'duplicate-listing' }
      if (!Number.isInteger(startPrice) || startPrice < 0) return { status: 'invalid' }
      if (!Number.isInteger(endsAt)) return { status: 'invalid' }
      if (reserve !== null && (!Number.isInteger(reserve) || reserve < startPrice)) return { status: 'invalid' }
      const auction = new Auction({
        id, startPrice, reserve: reserve ?? startPrice, endsAt, increments, softClose,
      })
      auctions.set(id, auction)
      return { status: 'listed', id }
    },

    placeBid(id, bid) {
      const auction = auctions.get(id)
      return auction ? auction.placeBid(bid) : { status: 'no-such-auction' }
    },

    close(id, now) {
      const auction = auctions.get(id)
      return auction ? auction.close(now) : { status: 'no-such-auction' }
    },

    state(id) {
      const auction = auctions.get(id)
      return auction ? auction.snapshot() : null
    },

    outbox(id) {
      const auction = auctions.get(id)
      return auction ? [...auction.outbox] : []
    },
  }
}
