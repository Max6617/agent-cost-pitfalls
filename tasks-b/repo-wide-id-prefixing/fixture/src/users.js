/**
 * users - user records.
 *
 * The oldest module in the service: it predates the typed-id migration, and
 * its records still key on the legacy body the way the pre-migration rows
 * did. Reading an id checks it properly; what the module hands back out is
 * the form it has always handed back out.
 */
import { IdError } from './idkit.js'

const BASE62 = /^[0-9A-Za-z]+$/

/** The canonical form of an externally supplied user id. */
export function parseUserId(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new IdError('bad-id', 'an id is a non-empty string')
  }
  const cut = value.indexOf('_')
  if (cut === -1) {
    if (!BASE62.test(value)) throw new IdError('bad-id', 'a legacy bare id is base62: ' + value)
    return 'usr_' + value
  }
  const head = value.slice(0, cut)
  const body = value.slice(cut + 1)
  if (head !== 'usr' && head !== 'ord' && head !== 'pay' && head !== 'ref') {
    throw new IdError('bad-id', 'unknown id prefix: ' + head)
  }
  if (!BASE62.test(body)) throw new IdError('bad-id', 'an id body is base62: ' + value)
  if (head !== 'usr') throw new IdError('wrong-prefix', value + ' is not a user id')
  return value
}

/**
 * A user record. `input.id` may arrive in any form the convention reads;
 * the record keys on the legacy body.
 */
export function createUser(input) {
  const canonical = parseUserId(input.id)
  return {
    id: canonical.slice('usr_'.length),
    name: input.name,
    email: input.email ?? null,
  }
}

/** The public shape of a user, as the API has always returned it. */
export function serializeUser(user) {
  return { id: user.id, name: user.name, email: user.email }
}
