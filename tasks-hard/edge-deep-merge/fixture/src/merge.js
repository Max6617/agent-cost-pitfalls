/**
 * The deep merge.
 *
 * Layered configuration arrives as a target (the defaults, or everything merged
 * so far) plus one or more sources (override files, service patches) applied left
 * to right. Plain objects merge recursively; every other value is a value, and
 * the source's wins (docs/merge-rules.md section 1).
 *
 * The merge runs in two passes over the accumulated result:
 *   1. every key of the target is copied in, so that keys the source never
 *      mentions survive;
 *   2. every key of each source is applied on top, left to right.
 */
import { isPlainObject } from './types.js'
import { clone } from './clone.js'
import { defines } from './util/keys.js'

/** Pass 1: the target's own keys, copied by value. */
function copyKeys(out, record) {
  for (const key in record) {
    const value = record[key]
    if (value === undefined) continue
    out[key] = clone(value)
  }
  return out
}

function mergedValue(target, source) {
  if (isPlainObject(target) && isPlainObject(source)) {
    const nested = {}
    copyKeys(nested, target)
    return applyPatchKeys(nested, source)
  }
  return clone(source)
}

/** Pass 2: one source on top of the accumulated result. */
function applyPatchKeys(out, source) {
  for (const key in source) {
    const value = source[key]
    if (value === undefined) continue
    if (defines(out, key)) {
      out[key] = mergedValue(out[key], value)
    } else {
      out[key] = clone(value)
    }
  }
  return out
}

/**
 * Merge `target` with every source, left to right, without touching any input.
 *
 * With no source at all this is a copy of the target: `merge(a)` is `clone(a)`.
 */
export function merge(target, ...sources) {
  const out = {}
  if (isPlainObject(target)) copyKeys(out, target)
  for (const source of sources) {
    if (isPlainObject(source)) applyPatchKeys(out, source)
  }
  return out
}

export { applyPatchKeys }
