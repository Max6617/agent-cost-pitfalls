/**
 * ticketing - public surface.
 *
 * Everything the box office and the resale importer are allowed to import.
 * Modules under src/ that are not re-exported here are internal and may be
 * reorganised freely; the names below may not.
 */
import { TicketingService } from './service.js'

export { TicketingService } from './service.js'
export { Waitlist } from './queue.js'
export { OfferDesk } from './offers.js'
export { Inventory } from './inventory.js'
export { compareEntries, normalizeTier, TIER_RANK } from './ordering.js'

/**
 * A service for one event. `capacity` is the number of seats; `offerTtl` is
 * how long an offer stays open, in the same units as the `now` that every
 * command carries.
 */
export function createService(options = {}) {
  return new TicketingService(options)
}
