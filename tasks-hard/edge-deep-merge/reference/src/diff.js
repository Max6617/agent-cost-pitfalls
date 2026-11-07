/**
 * Equality, and the patch that turns one value into another.
 *
 * `diff` is `deepEqual` plus bookkeeping: the two must agree, or a caller gets a
 * patch that claims work it does not need, or misses work it does.
 */
import { isPlainObject, isDate } from './types.js'
import { sourceKeys, defines, assignKey, readKey } from './util/keys.js'
import { clone } from './clone.js'
import { REMOVED } from './symbols.js'

function sameArray(a, b, memo) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (!deepEqual(a[i], b[i], memo)) return false
  }
  return true
}

function sameRecord(a, b, memo) {
  const aKeys = sourceKeys(a)
  if (aKeys.length !== sourceKeys(b).length) return false
  for (const key of aKeys) {
    if (!defines(b, key)) return false
    if (!deepEqual(readKey(a, key), readKey(b, key), memo)) return false
  }
  return true
}

function equalPair(a, b, memo) {
  // NaN equals NaN, -0 does not equal 0, and identical references are equal:
  // Object.is settles the primitives and the aliases in one go (rule 17).
  if (Object.is(a, b)) return true
  if (a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false

  let against = memo.get(a)
  if (against === undefined) {
    against = new WeakSet()
    memo.set(a, against)
  } else if (against.has(b)) {
    // This pair is already being compared further up the stack: the structures
    // describe the same shape, so the walk stops here instead of going round.
    return true
  }
  against.add(b)

  if (isDate(a) || isDate(b)) return isDate(a) && isDate(b) && a.getTime() === b.getTime()
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && sameArray(a, b, memo)
  }
  if (!isPlainObject(a) || !isPlainObject(b)) return false
  return sameRecord(a, b, memo)
}

/**
 * Structural equality: same own keys, same values, recursively.
 *
 * Plain objects and arrays are compared pairwise; two dates are compared by the
 * instant they hold; anything else is equal only to itself, by reference.
 */
export function deepEqual(a, b, memo = new WeakMap()) {
  return equalPair(a, b, memo)
}

function buildPatch(target, source) {
  const out = {}
  for (const key of sourceKeys(source)) {
    const sv = readKey(source, key)
    if (!defines(target, key)) {
      assignKey(out, key, clone(sv))
      continue
    }
    const tv = readKey(target, key)
    if (deepEqual(tv, sv)) continue
    assignKey(out, key, isPlainObject(tv) && isPlainObject(sv) ? buildPatch(tv, sv) : clone(sv))
  }
  for (const key of sourceKeys(target)) {
    if (!defines(source, key)) assignKey(out, key, REMOVED)
  }
  return out
}

/**
 * The smallest patch that turns `target` into `source`, or null when there is
 * nothing to do.
 *
 * The patch is expressed in the merge's vocabulary: a key to add carries the
 * source's value, a key to drop carries the REMOVED marker, and a key to change
 * carries the source's value. Nested plain objects produce a nested patch, and a
 * pair of nested objects only recurses into a difference, so a structure that
 * points at itself is walked once and not forever.
 */
export function diff(target, source) {
  if (deepEqual(target, source)) return null
  if (!isPlainObject(target) || !isPlainObject(source)) return clone(source)
  return buildPatch(target, source)
}

/** true when a patch has no keys, i.e. `diff` would have returned null. */
export function isEmptyDiff(value) {
  return isPlainObject(value) && sourceKeys(value).length === 0
}
