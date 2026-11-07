/**
 * Request validation.
 *
 * Thin: the shape checks live in the schema, the values are checked here.
 */
import { fail } from './errors.js'

export function requireFields(body, fields) {
  const missing = fields.filter((f) => body?.[f] === undefined || body[f] === '')
  if (missing.length) {
    throw new Error('missing fields: ' + missing.join(', '))
  }
  return body
}

export function requirePositiveInteger(value, field) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    fail('INVALID_INPUT', field + ' must be a positive integer', { details: { field } })
  }
  return n
}

export function requireRateWithin(value, field, max) {
  const n = Number(value)
  if (!(n > 0) || n > max) {
    throw new Error(field + ' is out of range')
  }
  return n
}

/** Strip anything a client is not allowed to set. */
export function pick(body, keys) {
  const out = {}
  for (const key of keys) if (body?.[key] !== undefined) out[key] = body[key]
  return out
}
