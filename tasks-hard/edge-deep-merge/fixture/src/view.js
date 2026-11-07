/**
 * Reading a nested configuration by path, for the CLI and for log lines.
 *
 * Path segments come from config keys, and config keys are arbitrary strings, so
 * lookups step through own keys only: a segment named `__proto__` reads a key,
 * never the prototype chain.
 */
import { isPlainObject, hasOwn } from './types.js'
import { readKey } from './util/keys.js'

/** `['listen', 'port']` -> `'listen.port'`, with dots in keys escaped. */
export function formatPath(segments) {
  return segments.map((s) => String(s).replace(/\./g, '\\.')).join('.')
}

/** Read `path` (an array of segments) out of `value`, or undefined. */
export function getPath(value, path) {
  let cur = value
  for (const segment of path) {
    if (cur === null || typeof cur !== 'object') return undefined
    if (!hasOwn(cur, segment)) return undefined
    cur = readKey(cur, segment)
  }
  return cur
}

/**
 * Every leaf of `value` as `path -> value`, depth first, in key order.
 *
 * Leaves are the values the merge treats as values: anything that is not a plain
 * object or an array. `seen` keeps a structure that points at itself from
 * flattening forever.
 */
export function flatten(value, prefix = [], out = [], seen = new WeakSet()) {
  const isContainer = isPlainObject(value) || Array.isArray(value)
  if (!isContainer) {
    out.push([prefix, value])
    return out
  }
  if (seen.has(value)) {
    out.push([prefix, '<cycle>'])
    return out
  }
  seen.add(value)
  const keys = Array.isArray(value)
    ? value.map((_, i) => String(i))
    : Object.keys(value)
  for (const key of keys) {
    flatten(value[key], [...prefix, key], out, seen)
  }
  return out
}

/** 0 at the root, 1 under a top-level key, and so on. */
export function depthOf(segments) {
  return segments.length
}
