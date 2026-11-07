/**
 * Deep copy of the plain-data part of a value.
 *
 * A plain object or array is rebuilt key by key; anything else is data the
 * toolkit does not own - a date, a map, somebody's class instance, a function -
 * and is handed back as it is (docs/merge-rules.md rule 15).
 */
import { isPlainObject } from './types.js'
import { sourceKeys, assignKey } from './util/keys.js'

/**
 * true when `value` is a container this module rebuilds, i.e. something whose
 * contents a caller could mutate behind our back.
 */
export function isContainer(value) {
  return isPlainObject(value) || Array.isArray(value)
}

function cloneArray(items, memo) {
  const out = []
  memo.set(items, out)
  for (let i = 0; i < items.length; i += 1) out[i] = clone(items[i], memo)
  return out
}

function cloneRecord(record, memo) {
  const out = {}
  memo.set(record, out)
  for (const key of sourceKeys(record)) {
    assignKey(out, key, clone(record[key], memo))
  }
  return out
}

/**
 * Copy `value`, rebuilding every plain object and array and returning everything
 * else by reference.
 *
 * `memo` carries the containers already visited so that a structure which refers
 * to itself is copied once rather than forever: the copy of a shared value is the
 * same object wherever the original was shared.
 */
export function clone(value, memo = new WeakMap()) {
  if (!isContainer(value)) return value
  const seen = memo.get(value)
  if (seen !== undefined) return seen
  if (Array.isArray(value)) return cloneArray(value, memo)
  return cloneRecord(value, memo)
}

/** The number of distinct containers in `value`, used by the CLI's summary line. */
export function countContainers(value, seen = new WeakSet()) {
  if (!isContainer(value)) return 0
  if (seen.has(value)) return 0
  seen.add(value)
  let n = 1
  const values = Array.isArray(value) ? value : sourceKeys(value).map((k) => value[k])
  for (const item of values) n += countContainers(item, seen)
  return n
}
