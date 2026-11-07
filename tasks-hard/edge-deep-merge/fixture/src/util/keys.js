/**
 * Key handling shared by merge, clone and diff.
 *
 * A "key" in this package means an own enumerable string key. Symbols and
 * non-enumerable properties are outside the data model (docs/merge-rules.md,
 * preamble) and must not leak into a result through `for...in` or a descriptor
 * walk.
 */
import { hasOwn } from '../types.js'

/** The keys of a source that the merge is allowed to look at. */
export function sourceKeys(value) {
  return Object.keys(value)
}

/** Present in `value` as an own key, even when the value stored is undefined. */
export function defines(value, key) {
  return hasOwn(value, key)
}

/**
 * Write `key` on `target` without going through the prototype chain.
 *
 * `target[key] = value` is not safe for every key that can appear in an override
 * file, so the dangerous ones are written with a descriptor instead.
 */
export function assignKey(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  })
}

/**
 * Read `key` off `value` as data.
 *
 * The mirror image of assignKey: for a key with an accessor somewhere on the
 * prototype chain - `__proto__` is the one that matters - `value[key]` is not the
 * value stored under the key.
 */
export function readKey(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor === undefined ? undefined : descriptor.value
}
