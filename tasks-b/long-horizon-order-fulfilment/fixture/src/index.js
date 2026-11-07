/**
 * fulfilment - public surface.
 *
 * Everything the importer, the warehouse UI and the reconciliation job are
 * allowed to import. Modules under src/ that are not re-exported here are
 * internal and may be reorganised freely; the names below may not.
 */
import { FulfilmentService } from './service.js'

export { FulfilmentService } from './service.js'
export { canonicalOrder, compareEvents, normalizeEvent } from './event-log.js'
export { EVENT_TYPES, OUTCOMES, RESTOCKABLE_CONDITIONS } from './constants.js'
export { buildReport } from './report.js'

/** A service with `stock` units on hand: `{ stock: { SKU: units } }`. */
export function createService({ stock = {} } = {}) {
  return new FulfilmentService({ stock })
}
