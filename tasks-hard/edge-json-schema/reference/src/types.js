/**
 * The seven type names of the gateway subset.
 *
 * `isType` is the only place that decides what a value is: the keyword handlers
 * ask it instead of writing their own typeof checks, so that a value the
 * gateway calls a number in one place is a number in every place.
 */

export const TYPE_NAMES = Object.freeze([
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
  'null',
])

export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isType(value, name) {
  switch (name) {
    case 'object':
      return isPlainObject(value)
    case 'array':
      return Array.isArray(value)
    case 'string':
      return typeof value === 'string'
    case 'number':
      // JSON has no NaN and no Infinity, so they are not numbers here either.
      return typeof value === 'number' && Number.isFinite(value)
    case 'integer':
      // `integer` is a value, not a spelling: 1.0 has no fractional part.
      return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'null':
      return value === null
    default:
      return false
  }
}

/** A short word for the value, for the message of a failed type. */
export function describe(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'undefined') return 'undefined'
  return typeof value
}
