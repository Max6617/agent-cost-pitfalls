/**
 * Record validation.
 *
 * A schema describes each field it is willing to see. The rules the three
 * states follow are in docs/field-policy.md; the short version is that a patch
 * that never mentions a field cannot be wrong about it, a field that is null
 * has been cleared and only a schema that allows clearing accepts it, and an
 * empty value is a value - if it is the wrong value the record is wrong.
 */
import { isPlainObject, stateOf } from './core.js'

const TYPES = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => isPlainObject(v),
  array: (v) => Array.isArray(v),
}

const REQUIRED_FIELDS = new Set(['id'])

function entryState(value) {
  if (value === null) return 'null'
  return stateOf(value)
}

/**
 * Validate a patch against a schema.
 *
 * Returns `{ ok, errors, value }`. `value` is the accepted patch, which is not
 * the same as the input: a field that is null in the patch is accepted only
 * where the schema allows clearing, and is passed through as null so the caller
 * can apply it.
 */
export function validatePatch(schema, patch, options = {}) {
  const errors = []
  const value = {}
  const partial = options.partial !== false
  if (!isPlainObject(patch)) {
    return { ok: false, errors: [{ field: null, code: 'not-an-object' }], value: {} }
  }
  for (const key of Object.keys(patch).sort()) {
    const rule = schema[key]
    const entry = patch[key]
    if (entry === undefined) continue
    if (rule === undefined) {
      if (options.allowUnknown) continue
      errors.push({ field: key, code: 'unknown-field' })
      continue
    }
    if (entry === null) {
      if (rule.nullable === false) {
        errors.push({ field: key, code: 'nullable' })
        continue
      }
      value[key] = null
      continue
    }
    const checker = TYPES[rule.type ?? 'string']
    if (checker && !checker(entry)) {
      errors.push({ field: key, code: 'wrong-type', expected: rule.type })
      continue
    }
    if (rule.enum && !rule.enum.includes(entry)) {
      errors.push({ field: key, code: 'not-allowed', allowed: rule.enum })
      continue
    }
    if (rule.pattern && typeof entry === 'string' && !new RegExp(rule.pattern).test(entry)) {
      errors.push({ field: key, code: 'format' })
      continue
    }
    if (rule.minLength !== undefined) {
      const size = typeof entry === 'string' ? entry.length : Array.isArray(entry) ? entry.length : null
      if (size !== null && size < rule.minLength) {
        errors.push({ field: key, code: 'too-short', minLength: rule.minLength })
        continue
      }
    }
    value[key] = entry
  }
  if (!partial) {
    for (const key of Object.keys(schema).sort()) {
      if (REQUIRED_FIELDS.has(key) && value[key] === undefined) {
        errors.push({ field: key, code: 'required' })
      }
    }
  }
  return { ok: errors.length === 0, errors, value }
}

/** Validate a whole record - every field the schema names has to be there. */
export function validateRecord(schema, record) {
  const missing = []
  for (const key of Object.keys(schema).sort()) {
    if (record === null || record === undefined) {
      missing.push(key)
      continue
    }
    if (!Object.prototype.hasOwnProperty.call(record, key)) missing.push(key)
  }
  const result = validatePatch(schema, record, { partial: false })
  if (missing.length) result.errors.unshift(...missing.map((field) => ({ field, code: 'required' })))
  result.ok = result.errors.length === 0
  return result
}

/**
 * Field-level report used by the API's error payload: one entry per field the
 * patch names, with the state we saw it in and the codes we rejected it with.
 * The state is what the field is, not what the checks managed to make of it: a
 * cleared field reports `null` and an empty one reports `empty`.
 */
export function reportFields(schema, patch) {
  const report = []
  if (!isPlainObject(patch)) return report
  for (const field of Object.keys(patch).sort()) {
    const value = patch[field]
    if (value === undefined) continue
    const one = {}
    one[field] = value
    const result = validatePatch(schema, one)
    report.push({
      field,
      state: entryState(value),
      known: schema[field] !== undefined,
      codes: result.errors.map((error) => error.code),
    })
  }
  return report
}
