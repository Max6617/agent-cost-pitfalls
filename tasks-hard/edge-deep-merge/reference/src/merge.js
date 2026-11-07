/**
 * The deep merge.
 *
 * Layered configuration arrives as a target (the defaults, or everything merged
 * so far) plus one or more sources (override files, service patches) applied left
 * to right. Plain objects merge recursively; every other value is a value, and
 * the source's wins (docs/merge-rules.md section 1).
 *
 * Each pass reads own enumerable string keys only, and writes through the guarded
 * helper in util/keys.js: an override file is data, and `__proto__` in it is a key
 * like any other.
 */
import { isPlainObject } from './types.js'
import { clone } from './clone.js'
import { sourceKeys, defines, assignKey, readKey } from './util/keys.js'
import { isRemoved } from './symbols.js'

function copied(value, memo) {
  // Plain objects are rebuilt here rather than by clone() so that `memo` maps the
  // ORIGINAL to the RESULT: a source that points at itself then points at the
  // result, which is what makes a cycle in the input a cycle in the output
  // (docs/merge-rules.md rule 16).
  if (!isPlainObject(value)) return clone(value, memo)
  const mapped = memo.get(value)
  if (mapped !== undefined) return mapped
  const out = {}
  memo.set(value, out)
  for (const key of sourceKeys(value)) assignKey(out, key, copied(readKey(value, key), memo))
  return out
}

function mergedValue(target, source, memo) {
  // An empty source object is a whole value, not a merge that changes nothing:
  // `merge({ a: { x: 1 } }, { a: {} })` is `{ a: {} }` (docs/merge-rules.md
  // rule 5), so only a source with keys merges into what the target held.
  if (isPlainObject(target) && isPlainObject(source) && sourceKeys(source).length > 0) {
    return mergeInto(target, source, memo)
  }
  return copied(source, memo)
}

/** `source` applied on top of a copy of `target`. */
function mergeInto(target, source, memo = new WeakMap()) {
  // The copy of the target gets a memo of its own: the merge memo maps the
  // SOURCE objects to their results, and letting one map both would make a
  // source object look like an object already copied out of the target.
  const out = copied(target, new WeakMap())
  memo.set(source, out)
  // A key named with the removal marker goes away instead of being written, and
  // the marker can arrive at any depth because patches nest.
  for (const key of sourceKeys(source)) {
    const value = readKey(source, key)
    if (isRemoved(value)) {
      delete out[key]
      continue
    }
    assignKey(out, key, defines(out, key) ? mergedValue(readKey(out, key), value, memo) : copied(value, memo))
  }
  return out
}

/**
 * Merge `target` with every source, left to right, without touching any input.
 *
 * With no source at all this is a copy of the target: `merge(a)` is `clone(a)`.
 */
export function merge(target, ...sources) {
  let out = isPlainObject(target) ? copied(target, new WeakMap()) : {}
  for (const source of sources) {
    if (!isPlainObject(source)) continue
    out = mergeInto(out, source, new WeakMap())
  }
  return out
}

export { mergeInto as applyPatchKeys }
