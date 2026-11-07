/**
 * authd - public surface.
 *
 * Everything the gateway, the admin console and the tests are allowed to
 * import. Modules under src/ that are not re-exported here are internal and
 * may be reorganised freely; the names below may not.
 */
import { loadPolicy } from './config.js'
import { createService as createServiceFromPolicy } from './service.js'

export { loadPolicy } from './config.js'
export { createFamilyStore } from './families.js'
export { createAccessRegistry } from './access.js'
export { buildSessions } from './sessions.js'
export * as expiry from './expiry.js'
export * as tokens from './tokens.js'
export { digest, fnv1a } from './hash.js'

/**
 * A service wired to this checkout's policy (config/auth.config.json).
 *
 * `overrides.policy` exists for drills and tests: pass
 * `{ policy: { idleTtlMs: 60_000 } }` to work against a hypothetical policy
 * without touching the shipped one.
 */
export function createService(overrides = {}) {
  const policy = { ...loadPolicy(), ...(overrides.policy ?? {}) }
  return createServiceFromPolicy({ policy })
}
