/**
 * The shop's public surface.
 *
 * The back-office tools, the support console and the compliance exporter all
 * import from here. Modules under src/ that are not re-exported here are
 * internal and may be reorganised; the names below may not.
 */
export { createShop } from './shop.js'
export { createAuditLog, REDACTED } from './audit.js'
export { POLICY } from './policy.js'
export { clone } from './snapshot.js'
