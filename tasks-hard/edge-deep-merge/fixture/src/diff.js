/**
 * Equality, and the patch that turns one value into another.
 *
 * `diff` is `deepEqual` plus bookkeeping: the two must agree, or a caller gets a
 * patch that claims work it does not need, or misses work it does.
 */
import { isPlainObject, isDate } from './types.js'
import { sourceKeys, defines } from './util/keys.js'

/**
 * Structural equality: same own keys, same values, recursively.
 *
 * Plain objects and arrays are compared pairwise; two dates are compared by the
 * instant they hold; anything else is equal only to itself, by reference.
 */
export function deepEqual(a, b, memo = new WeakMap()) {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false

  let against = memo.get(a)
  if (against === undefined) {
    against = new WeakSet()
    memo.set(a, against)
  } else if (against.has(b)) {
    return true
  }
  against.add(b)

  if (isDate(a) || isDate(b)) {
    return isDate(a) && isDate(b) && a.getTime() === b.getTime()
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i], memo)) return false
    }
    return true
  }

  if (!isPlainObject(a) || !isPlainObject(b)) return false

  const aKeys = sourceKeys(a)
  const bKeys = sourceKeys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!defines(b, key)) return false
    if (!deepEqual(a[key], b[key], memo)) return false
  }
  return true
}

/**
 * The smallest patch that turns `target` into `source`, or null when there is
 * nothing to do.
 *
 * The patch is expressed in the merge's vocabulary: a key to add carries the
 * source's value, a key to drop carries null, and a key to change carries the
 * source's value. Nested plain objects produce a nested patch.
 */
export function diff(target, source, memo = new WeakMap()) {
  if (deepEqual(target, source)) return null
  if (!isPlainObject(target) || !isPlainObject(source)) return source

  const out = {}
  for (const key of sourceKeys(source)) {
    if (!defines(target, key)) {
      out[key] = source[key]
      continue
    }
    const tv = target[key]
    const sv = source[key]
    if (deepEqual(tv, sv)) continue
    out[key] = isPlainObject(tv) && isPlainObject(sv) ? diff(tv, sv, memo) : sv
  }
  for (const key of sourceKeys(target)) {
    if (!defines(source, key)) out[key] = null
  }
  return out
}

/** true when a patch has no keys, i.e. `diff` would have returned null. */
export function isEmptyDiff(value) {
  return isPlainObject(value) && sourceKeys(value).length === 0
}
