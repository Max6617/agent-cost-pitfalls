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
 * returned with the patch applied field by field. Patch values that are `null`
 * are not written through as `null`.
 */
export function applyPatch(record, patch) {
  const out = cloneRecord(record)
  if (!isPlainObject(patch)) return out
  for (const key of Object.keys(patch)) {
    const value = patch[key]
    if (value === undefined) continue
    if (value === null) {
      out[key] = null
      continue
    }
    if (isPlainObject(value)) {
      const current = out[key]
      out[key] = isPlainObject(current) ? mergeFields(current, value) : cloneValue(value)
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
 * considered; the others keep whatever `base` had.
 */
export function mergeFields(base, source) {
  const out = cloneRecord(base)
  if (!isPlainObject(source)) return out
  for (const key of Object.keys(source)) {
    const value = source[key]
    if (value === undefined) continue
    const current = out[key]
    if (isPlainObject(value) && isPlainObject(current)) {
      out[key] = mergeFields(current, value)
      continue
    }
    out[key] = cloneValue(value)
  }
  return out
}

/** The old name for `mergeFields`; the importer still calls it. */
export const mergeOmit = mergeFields

/**
 * Fields the patch would actually change, in sorted order. Only the presence of
 * a field is compared, so a patch that writes a different value over one that
 * was already there is not reported.
 */
export function changedFields(record, patch) {
  const after = applyPatch(record, patch)
  const before = cloneRecord(record)
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changed = []
  for (const key of [...keys].sort()) {
    const wasAbsent = fieldState(before, key) === 'absent'
    const isAbsent = fieldState(after, key) === 'absent'
    if (wasAbsent !== isAbsent) changed.push(key)
  }
  return changed
}

/** Drop the named fields from a record, leaving the rest alone. */
export function without(record, keys) {
  const out = cloneRecord(record)
  for (const key of keys ?? []) delete out[key]
  return out
}
