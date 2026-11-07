/**
 * inventory — public surface.
 *
 * Everything the order service, the pick line and the ops console are allowed
 * to import. Modules under src/ that are not re-exported here are internal and
 * may be reorganised freely; the names below may not.
 */
export { Allocator, createAllocator, DEFAULT_TTL_MS } from './allocation.js'
export { addMs, requireInstant, toEpoch, toIso } from './clock.js'
export { canonicalDemand, compareDemand, DEFAULT_PRIORITY, DEMAND_STATUSES } from './demand.js'
export { expiryOf, isExpired } from './expiry.js'
export { MOVEMENT_KINDS } from './ledger.js'
export { RESERVATION_STATUSES } from './reservations.js'
export { bufferKey } from './buffers.js'
export { fillUnits } from './picking.js'
export { formatQty, requireQty } from './util/quantities.js'
export { backorderReport, promiseReport, stockReport } from './report.js'
export { loadConfig, readJson, repoRoot } from './config.js'
