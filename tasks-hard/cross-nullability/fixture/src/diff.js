/**
 * Diff and patch generation.
 *
 * `diffRecords(left, right)` describes how to get from `left` to `right`. It
 * returns two lists:
 *
 *   set    keys to write, with the value to write
 *   unset  keys to remove from the record entirely
 *
 * The two lists exist because "the field is gone" and "the field is null" are
 * different changes, and applying the patch has to reproduce `right` from
 * `left` either way. `applyDiff` is the inverse operation.
 */
import { cloneRecord, cloneValue, deepEqual, isPlainObject, sortedKeys } from './core.js'

/** Where a key stands in a record: 'missing', 'null' or the value it holds. */
function entryOf(record, key) {
  if (record === null || record === undefined) return { present: false }
  if (!Object.prototype.hasOwnProperty.call(record, key)) return { present: false }
  return { present: true, value: record[key] }
}

/**
 * Compute the patch that turns `left` into `right`.
 *
 *   key only in left      goes into `unset`
 *   key only in right     goes into `set`, even when its value is null
 *   key in both           goes into `set` when the values differ
 */
export function diffRecords(left, right) {
  const set = {}
  const unset = []
  const keys = new Set([...sortedKeys(left), ...sortedKeys(right)])
  for (const key of [...keys].sort()) {
    const before = entryOf(left, key)
    const after = entryOf(right, key)
    if (!after.present) {
      if (before.present) unset.push(key)
      continue
    }
    if (isPlainObject(after.value) && isPlainObject(before.value)) {
      const nested = diffRecords(before.value, after.value)
      if (Object.keys(nested.set).length || nested.unset.length) set[key] = nested.set
      continue
    }
    set[key] = cloneValue(after.value)
  }
  return { set, unset }
}

/** True when the diff would change nothing. */
export function isEmptyDiff(diff) {
  return Object.keys(diff?.set ?? {}).length === 0 && (diff?.unset ?? []).length === 0
}

/** Apply a diff. `unset` wins over `set` when a key appears in both. */
export function applyDiff(record, diff) {
  const out = cloneRecord(record)
  if (!isPlainObject(diff)) return out
  for (const key of Object.keys(diff.set ?? {})) {
    const value = diff.set[key]
    if (value === null || value === undefined) continue
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? mergeObjects(out[key], value) : cloneValue(value)
  }
  for (const key of diff.unset ?? []) delete out[key]
  return out
}

function mergeObjects(base, extra) {
  const out = cloneRecord(base)
  for (const key of Object.keys(extra)) {
    const value = extra[key]
    if (value === null || value === undefined) {
      delete out[key]
      continue
    }
    out[key] = cloneValue(value)
  }
  return out
}

/**
 * A one-line description of a diff, used in logs and in the audit trail:
 * `{ name: { from: 'old', to: 'new' } }`, `{ phone: { from: 'old', to: null } }`
 * when the field was cleared, and `{ notes: { to: 'new' } }` when it was not
 * there before.
 */
export function describeDiff(left, right) {
  const described = {}
  const diff = diffRecords(left, right)
  for (const key of sortedKeys(diff.set)) {
    const before = entryOf(left, key)
    described[key] = { to: cloneValue(diff.set[key]) }
    if (before.present) described[key].from = cloneValue(before.value)
  }
  for (const key of diff.unset) {
    const before = entryOf(left, key)
    described[key] = { to: null }
    if (before.present) described[key].from = cloneValue(before.value)
  }
  return described
}

/** Keys the diff touches, sorted. */
export function touchedKeys(diff) {
  return [...new Set([...Object.keys(diff?.set ?? {}), ...(diff?.unset ?? [])])].sort()
}
