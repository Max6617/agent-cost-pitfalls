/**
 * auction-house — public surface.
 *
 * Everything the desk, the settlement job and the tests are allowed to import.
 * Modules under src/ that are not re-exported here are internal and may be
 * reorganised freely; the names below may not.
 */
export { createAuctionHouse } from './house.js'
export { Auction } from './auction.js'
export { incrementFor } from './increments.js'
export { settlePrice } from './proxy.js'
export { maybeExtend } from './softclose.js'
export { classifyClose } from './reserve.js'
export { notifyOutbid, noticesFor } from './notify.js'
export { loadConfig } from './config.js'
