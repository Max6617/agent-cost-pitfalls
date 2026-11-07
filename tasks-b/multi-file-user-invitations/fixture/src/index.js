/**
 * invites - public surface.
 *
 * Everything the signup flow, the admin console and the tests are allowed to
 * import. Modules under src/ that are not re-exported here are internal and
 * may be reorganised freely; the names below may not.
 */
export { InviteService, createService } from './service.js'
export { InviteStore } from './store.js'
export { makeToken } from './tokens.js'
export { canonicalEmail, emailsMatch } from './email.js'
export { expiryFor, isExpired } from './expiry.js'
export * as roles from './roles.js'
export { INVITE_TTL_MS, TOKEN_PREFIX } from './config.js'
