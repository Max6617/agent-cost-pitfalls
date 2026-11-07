/**
 * access - the registry of access tokens minted from refresh families.
 *
 * Access tokens look stateless to the resource servers, but the service keeps
 * the ledger of everything it minted, so killing a family can kill everything
 * the family ever produced - even tokens that were issued before anyone knew
 * there was a problem.
 */
import { accessTokenFor } from './tokens.js'

export function createAccessRegistry(policy) {
  const records = new Map() // token -> { familyId, user, issuedAt, expiresAt, revoked }

  return {
    issue(family, now) {
      const token = accessTokenFor(family.id, family.generation)
      records.set(token, {
        familyId: family.id,
        user: family.user,
        issuedAt: now,
        expiresAt: now + policy.accessTtlMs,
        revoked: false,
      })
      return { token, expiresAt: now + policy.accessTtlMs }
    },

    lookup(token) {
      return records.get(token) ?? null
    },

    /** Kill every access token a family has ever minted. */
    revokeFamily(familyId) {
      for (const record of records.values()) {
        if (record.familyId === familyId) record.revoked = true
      }
    },

    /**
     * The standing of a token at `now`: a revoked token stays revoked even
     * after the moment it would have expired anyway.
     */
    status(record, now) {
      if (record.revoked) return 'revoked'
      if (now >= record.expiresAt) return 'expired'
      return 'valid'
    },
  }
}
