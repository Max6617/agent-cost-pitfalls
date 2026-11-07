import { INVITE_TTL_MS } from './config.js'

/**
 * Invite expiry. Time is always passed in as a millisecond instant - the
 * service itself never reads a clock, so behaviour is reproducible in tests
 * and in replayed audit logs.
 */

/** The expiry instant of an invite created at `createdAt`. */
export function expiryFor(createdAt) {
  return createdAt + INVITE_TTL_MS
}

/** Whether `invite` is expired at instant `now`. */
export function isExpired(invite, now) {
  return now > invite.expiresAt
}
