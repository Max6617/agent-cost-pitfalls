/**
 * The equality behind `enum`, `const` and `uniqueItems`.
 *
 * It is deep, it is type-aware, and it compares numbers by value, so `1` and
 * `1.0` are the same value, and so are `0` and `-0`. Object key order is not
 * part of the value.
 */

export function equal(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (typeof a !== 'object') return a === b

  const aIsArray = Array.isArray(a)
  if (aIsArray !== Array.isArray(b)) return false
  if (aIsArray) {
    if (a.length !== b.length) return false
    return a.every((element, index) => equal(element, b[index]))
  }

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && equal(a[key], b[key]),
  )
}
