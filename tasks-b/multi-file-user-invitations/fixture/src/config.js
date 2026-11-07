/**
 * Deployment constants for the invitation service. These are part of the
 * contract in docs/invitation-rules.md, not tuning knobs: other systems store
 * our tokens and reason about our expiries, so the values do not change
 * per environment.
 */

/** How long an invite stays usable after it is sent: one week, in ms. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Every token the service issues starts with this prefix. */
export const TOKEN_PREFIX = 'inv_'
