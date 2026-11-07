/**
 * service - the refresh-token service the gateway talks to.
 *
 * Every call takes `now` (milliseconds since the epoch) from the caller: the
 * service itself never reads a clock, so a drill can be replayed millisecond
 * for millisecond.
 */
import { createFamilyStore } from './families.js'
import { createAccessRegistry } from './access.js'
import { effectiveDeadline, expiryReason } from './expiry.js'
import { buildSessions } from './sessions.js'

export function createService(options = {}) {
  const policy = { ...options.policy }
  const store = createFamilyStore()
  const access = createAccessRegistry(policy)

  function login({ user, device }, now) {
    const { family, token } = store.create({ user, device }, now)
    const minted = access.issue(family, now)
    return {
      familyId: family.id,
      refreshToken: token,
      accessToken: minted.token,
      refreshExpiresAt: effectiveDeadline(family, policy),
      accessExpiresAt: minted.expiresAt,
    }
  }

  function refresh(token, now) {
    const record = store.lookupToken(token)
    if (!record) return { status: 'unknown' }
    const family = store.get(record.familyId)
    if (family.revokedAt !== null) return { status: 'revoked', familyId: family.id }
    if (record.status === 'rotated') {
      // a token that was already rotated out has shown up again: the family
      // is compromised, kill all of it.
      store.revoke(family, now)
      access.revokeFamily(family.id)
      return { status: 'reuse', familyId: family.id }
    }
    const reason = expiryReason(family, policy, now)
    if (reason) return { status: 'expired', familyId: family.id, reason }
    const next = store.rotate(family, record, now)
    const minted = access.issue(family, now)
    return {
      status: 'rotated',
      familyId: family.id,
      refreshToken: next,
      accessToken: minted.token,
      refreshExpiresAt: effectiveDeadline(family, policy),
      accessExpiresAt: minted.expiresAt,
    }
  }

  function logout(familyId, now) {
    const family = store.get(familyId)
    if (!family) return { status: 'unknown' }
    store.revoke(family, now)
    access.revokeFamily(family.id)
    return { status: 'revoked', familyId: family.id }
  }

  function validateAccess(token, now) {
    const record = access.lookup(token)
    if (!record) return { status: 'unknown' }
    const status = access.status(record, now)
    if (status === 'valid') {
      return { status, user: record.user, familyId: record.familyId, expiresAt: record.expiresAt }
    }
    return { status, familyId: record.familyId }
  }

  function sessions(user, now) {
    return buildSessions(store.forUser(user), policy, now)
  }

  return { login, refresh, logout, validateAccess, sessions, policy }
}
