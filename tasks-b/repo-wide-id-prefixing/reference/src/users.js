/**
 * users - user records.
 *
 * The oldest module in the service: it predates the typed-id migration, which
 * is why it grew its own copy of the rules. It now reads and emits ids
 * through idkit like every other module.
 */
import * as idkit from './idkit.js'

/** The canonical form of an externally supplied user id. */
export function parseUserId(value) {
  return idkit.parse('user', value)
}

/**
 * A user record. `input.id` may arrive in any form the convention reads;
 * the record holds the canonical typed id.
 */
export function createUser(input) {
  return {
    id: idkit.parse('user', input.id),
    name: input.name,
    email: input.email ?? null,
  }
}

/** The public shape of a user, ids in canonical form. */
export function serializeUser(user) {
  return { id: idkit.parse('user', user.id), name: user.name, email: user.email }
}
