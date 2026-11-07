/**
 * Time, as the quota service sees it: whole seconds since the epoch.
 *
 * There is deliberately no clock in this codebase. The only time that exists
 * is the time events carry; a helper that asked the system for "now" would
 * make a replay depend on when it ran.
 */
export const DAY = 86400
export const HOUR = 3600

/** The epoch day a timestamp falls in. Days are aligned to midnight UTC. */
export const dayOf = (at) => Math.floor(at / DAY)

/** The clock-hour bucket a timestamp falls in. */
export const bucketOf = (at) => Math.floor(at / HOUR)
