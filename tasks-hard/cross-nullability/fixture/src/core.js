/**
 * Small shared helpers for the customer/order domain layer.
 *
 * The one idea worth reading before anything else: a field of a record is in
 * exactly one of three states, and they are not interchangeable.
 *
 *   'absent'   the key is not in the object at all
 *   'null'     the key is present and its value is null
 *   'empty'    the key is present and its value is '', [], {}, 0 or false
 *   'value'    the key is present and holds something with content
 *
 * `stateOf` reports the state of a value, `fieldState` the state of a field.
 * Every other module in this layer is required to keep the three apart. See
 * docs/field-policy.md for what each operation is supposed to do with them.
 */

export const CORE_VERSION = '1.4.0'

export const ABSENT = 'absent'
export const NULL = 'null'
export const EMPTY = 'empty'
export const VALUE = 'value'

/** Which state a value is in, taken on its own. */
export function stateOf(value) {
  if (value === undefined || value === null) return ABSENT
  if (typeof value === 'string') return value === '' ? EMPTY : VALUE
  if (typeof value === 'number') return value === 0 ? EMPTY : VALUE
  if (typeof value === 'boolean') return value === false ? EMPTY : VALUE
  if (Array.isArray(value)) return value.length === 0 ? EMPTY : VALUE
  if (typeof value === 'object') return Object.keys(value).length === 0 ? EMPTY : VALUE
  return VALUE
}

/** The state of a named field on a record. */
export function fieldState(record, key) {
  if (record === null || record === undefined) return ABSENT
  if (!Object.prototype.hasOwnProperty.call(record, key)) return ABSENT
  const value = record[key]
  if (value === undefined) return ABSENT
  return value === null ? NULL : stateOf(value)
}

/**
 * Read a field. `fallback` is returned only when the key is absent; a `null`
 * field and an empty value are both returned as themselves.
 */
export function getField(record, key, fallback = undefined) {
  if (record === null || record === undefined) return fallback
  if (!Object.prototype.hasOwnProperty.call(record, key)) return fallback
  const value = record[key]
  if (value === undefined) return fallback
  return value
}

/** True when the key is present, whatever the value is - null included. */
export function hasField(record, key) {
  if (record === null || record === undefined) return false
  return Object.prototype.hasOwnProperty.call(record, key)
}

/** Copy a record's own keys. Keys whose value is explicitly `undefined` drop out. */
export function cloneRecord(record) {
  const out = {}
  if (record === null || record === undefined) return out
  for (const key of Object.keys(record)) {
    const value = record[key]
    if (value === undefined) continue
    out[key] = cloneValue(value)
  }
  return out
}

/** Copy a field value: plain objects and arrays are copied, everything else is returned. */
export function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue)
  if (isPlainObject(value)) {
    const out = {}
    for (const key of Object.keys(value)) {
      if (value[key] === undefined) continue
      out[key] = cloneValue(value[key])
    }
    return out
  }
  return value
}

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function deepEqual(a, b) {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false
    return true
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a).filter((k) => a[k] !== undefined)
    const kb = Object.keys(b).filter((k) => b[k] !== undefined)
    if (ka.length !== kb.length) return false
    for (const key of ka) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }
  return false
}

/** Keys of a record in a stable order, so output does not depend on insertion order. */
export function sortedKeys(record) {
  if (record === null || record === undefined) return []
  return Object.keys(record).sort()
}

/** JSON text for a value, with object keys in sorted order. */
export function formatJson(value) {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return '[' + value.map((v) => (v === undefined ? 'null' : formatJson(v))).join(',') + ']'
  if (isPlainObject(value)) {
    const parts = []
    for (const key of sortedKeys(value)) {
      parts.push(JSON.stringify(key) + ':' + formatJson(value[key]))
    }
    return '{' + parts.join(',') + '}'
  }
  const text = JSON.stringify(value)
  return text === undefined ? 'null' : text
}
