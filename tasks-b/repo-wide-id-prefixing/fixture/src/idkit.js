/**
 * idkit - the shared id toolkit.
 *
 * The one implementation of the convention in docs/ids.md. Every module reads
 * and emits ids through this module; nothing else in src/ may grow its own
 * copy of the rules.
 */

export const PREFIX = Object.freeze({
  user: 'usr',
  order: 'ord',
  payment: 'pay',
  refund: 'ref',
})

export const TYPE_OF_PREFIX = Object.freeze({
  usr: 'user',
  ord: 'order',
  pay: 'payment',
  ref: 'refund',
})

export class IdError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'IdError'
    this.code = code
  }
}

const BASE62 = /^[0-9A-Za-z]+$/

/**
 * The canonical form of an id read anywhere in the service.
 *
 * Accepts the legacy bare form (`9Xv` -> `usr_9Xv`) and the canonical typed
 * form (returned unchanged). Rejects a well-formed typed id of another type
 * with `wrong-prefix`, and anything else - empty, non-string, bad alphabet,
 * unknown prefix, doubled prefix - with `bad-id`. See docs/ids.md section 3;
 * the checks run in the order written there.
 */
export function parse(type, value) {
  const prefix = PREFIX[type]
  if (prefix === undefined) {
    throw new IdError('bad-type', 'unknown id type: ' + String(type))
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new IdError('bad-id', 'an id is a non-empty string')
  }
  const cut = value.indexOf('_')
  if (cut === -1) {
    if (!BASE62.test(value)) {
      throw new IdError('bad-id', 'a legacy bare id is base62: ' + value)
    }
    return prefix + '_' + value
  }
  const head = value.slice(0, cut)
  const body = value.slice(cut + 1)
  if (TYPE_OF_PREFIX[head] === undefined) {
    throw new IdError('bad-id', 'unknown id prefix: ' + head)
  }
  if (!BASE62.test(body)) {
    throw new IdError('bad-id', 'an id body is base62: ' + value)
  }
  if (head !== prefix) {
    throw new IdError('wrong-prefix', value + ' is a ' + TYPE_OF_PREFIX[head] + ' id, not a ' + type + ' id')
  }
  return value
}

/** True when `value` parses as an id of `type` without throwing. */
export function accepts(type, value) {
  try {
    parse(type, value)
    return true
  } catch (e) {
    if (e instanceof IdError) return false
    throw e
  }
}
