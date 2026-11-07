/**
 * sessions - the "where is this user signed in" listing the admin console
 * renders. One row per live family, most recently used first.
 */
import { effectiveDeadline } from './expiry.js'

export function buildSessions(families, policy, now) {
  return families
    .filter((f) => f.revokedAt === null && now < effectiveDeadline(f, policy))
    .map((f) => ({
      familyId: f.id,
      device: f.device,
      createdAt: f.createdAt,
      lastUsedAt: f.lastUsedAt,
      expiresAt: effectiveDeadline(f, policy),
    }))
    .sort((a, b) =>
      b.lastUsedAt - a.lastUsedAt ||
      (a.familyId < b.familyId ? -1 : a.familyId > b.familyId ? 1 : 0))
}
