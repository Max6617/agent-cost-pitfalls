/**
 * Patch and merge operations for records.
 *
 * A patch is an object of field updates. What a key of a patch means:
 *
 *   absent in the patch   leave the field alone
 *   value: null           clear the field - the key is removed from the record
 *   value: ''  []  {}  0  a real value; the field is present and holds it
 *
 * `mergePatch` is `applyPatch` with the extra rule that the whole source may be
 * absent (nothing happens) or explicitly null (the target is cleared).
 */
import { cloneRecord, cloneValue, fieldState, isPlainObject } from './core.js'

const NO_SOURCE = Symbol('no-source')

/**
 * Apply a patch to a record. The record is not modified; a new record is
 * returned with the patch applied field by field. A patch value of null clears
 * the field: the key leaves the record, and it is not written through as null.
 */
export function applyPatch(record, patch) {
  const out = cloneRecord(record)
  if (!isPlainObject(patch)) return out
  for (const key of Object.keys(patch)) {
    const value = patch[key]
    if (value === undefined) continue
    if (value === null) {
      delete out[key]
      continue
    }
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = mergeFields(out[key], value)
      continue
    }
    out[key] = cloneValue(value)
  }
  return out
}

/**
 * Merge a source record over a base record.
 *
 * The three top-level shapes of `source` are all different:
 *
 *   mergePatch(base)            nothing to merge; `base` comes back unchanged
 *   mergePatch(base, null)      the result is cleared
 *   mergePatch(base, { ... })   field by field merge, absent keys untouched
 */
export function mergePatch(base = {}, source = NO_SOURCE) {
  if (source === NO_SOURCE) return cloneRecord(base)
  if (source === null) return {}
  if (!isPlainObject(source)) return cloneRecord(base)
  return mergeFields(base, source)
}

/**
 * Field-by-field merge of two records. Only the keys present in `source` are
 * considered; the others keep whatever `base` had. A null in the source clears
 * the field there too.
 */
function mergeFields(base, source) {
  const out = cloneRecord(base)
  if (!isPlainObject(source)) return out
  for (const key of Object.keys(source)) {
    const value = source[key]
    if (value === undefined) continue
    if (value === null) {
      delete out[key]
      continue
    }
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = mergeFields(out[key], value)
      continue
    }
    out[key] = cloneValue(value)
  }
  return out
}

/** The old name for `mergeFields`; the importer still calls it. */
export const mergeOmit = mergeFields

/**
 * Fields the patch would actually change, in sorted order. A field the patch
 * clears was a change if it had a value, and clearing a field that was already
 * absent is no change at all.
 */
export function changedFields(record, patch) {
  const before = cloneRecord(record)
  const after = applyPatch(record, patch)
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changed = []
  for (const key of [...keys].sort()) {
    const hadBefore = fieldState(before, key) !== 'absent'
    const hasAfter = fieldState(after, key) !== 'absent'
    if (hadBefore !== hasAfter) {
      changed.push(key)
      continue
    }
    if (hadBefore && !equalValues(before[key], after[key])) changed.push(key)
  }
  return changed
}

function equalValues(a, b) {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => equalValues(item, b[index]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) {
      const inA = Object.prototype.hasOwnProperty.call(a, key) && a[key] !== undefined
      const inB = Object.prototype.hasOwnProperty.call(b, key) && b[key] !== undefined
      if (inA !== inB) return false
      if (inA && !equalValues(a[key], b[key])) return false
    }
    return true
  }
  return false
}

/** Drop the named fields from a record, leaving the rest alone. */
export function without(record, keys) {
  const out = cloneRecord(record)
  for (const key of keys ?? []) delete out[key]
  return out
}
