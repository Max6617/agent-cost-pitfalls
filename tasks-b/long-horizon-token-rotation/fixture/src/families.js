/**
 * families - refresh-token families and their rotation lineage.
 *
 * A family is created by a login and lives until it is revoked or expires.
 * Every successful refresh rotates the family's refresh token: the presented
 * token becomes part of the lineage and the next generation becomes the only
 * token the family will accept.
 */
import { familyIdFor, refreshTokenFor } from './tokens.js'

export function createFamilyStore() {
  const families = new Map() // id -> family
  const tokens = new Map() // refresh token -> { familyId, generation, status }
  let sequence = 0

  function register(family, generation) {
    const value = refreshTokenFor(family.id, generation)
    tokens.set(value, { familyId: family.id, generation, status: 'current' })
    return value
  }

  return {
    create({ user, device }, now) {
      const id = familyIdFor(user, device, now, sequence++)
      const family = {
        id,
        user,
        device,
        createdAt: now,
        lastUsedAt: now,
        generation: 0,
        revokedAt: null,
      }
      families.set(id, family)
      const token = register(family, 0)
      return { family, token }
    },

    get(id) {
      return families.get(id) ?? null
    },

    lookupToken(value) {
      return tokens.get(value) ?? null
    },

    /**
     * Rotate: bump the family to its next generation and hand back the token
     * for it. The lineage keeps every earlier token record, so a replayed one
     * can still be recognised for what it is.
     */
    rotate(family, record, now) {
      family.generation += 1
      family.lastUsedAt = now
      return register(family, family.generation)
    },

    revoke(family, now) {
      if (family.revokedAt === null) family.revokedAt = now
    },

    revokeToken(record) {
      record.status = 'revoked'
    },

    forUser(user) {
      return [...families.values()].filter((f) => f.user === user)
    },
  }
}
