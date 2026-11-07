/**
 * Value predicates.
 *
 * `isPlainObject` is the load-bearing one: it draws the line between a record
 * that the merge walks into and a value that is passed through whole. Everything
 * in this package branches on it, so keep it narrow.
 */

/** True for an object whose prototype is exactly Object.prototype. */
export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  return Object.getPrototypeOf(value) === Object.prototype
}

/** True for an object literal or the result of JSON.parse. */
export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isDate(value) {
  return value instanceof Date
}

export function isMap(value) {
  return value instanceof Map
}

export function isSet(value) {
  return value instanceof Set
}

export function isRegExp(value) {
  return value instanceof RegExp
}

/** Own-key test. Works on objects with no prototype, unlike `obj.hasOwnProperty`. */
export function hasOwn(value, key) {
  return value !== null && typeof value === 'object'
    && Object.prototype.hasOwnProperty.call(value, key)
}

export function isObjectLike(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
}

/** A one-word description of a value, for log lines and error text. */
export function describe(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isDate(value)) return 'date'
  if (isMap(value)) return 'map'
  if (isSet(value)) return 'set'
  if (isRegExp(value)) return 'regexp'
  const t = typeof value
  if (t === 'object') return isPlainObject(value) ? 'object' : 'instance'
  return t
}
