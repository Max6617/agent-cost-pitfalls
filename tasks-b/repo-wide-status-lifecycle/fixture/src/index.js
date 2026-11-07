/**
 * flowdesk - public surface.
 *
 * Everything a consumer (the boards' UI, the rollup, the importers) may
 * import. Modules under src/ that are not re-exported here are internal and
 * may be reorganised; the names below may not.
 */
export {
  STATUSES,
  TRANSITIONS,
  ALIASES,
  IllegalTransitionError,
  UnknownStatusError,
  normaliseStatus,
  canTransition,
  transitionStatus,
  isCanonical,
  isActive,
} from './lifecycle.js'
export { createOrders } from './orders.js'
export { createTickets } from './tickets.js'
export { createSubscriptions } from './subscriptions.js'
export { createShipments } from './shipments.js'
export { summarise } from './summary.js'
