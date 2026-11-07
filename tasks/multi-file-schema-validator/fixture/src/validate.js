import { coerce } from './coerce.js'
import { schemaFor } from './schema.js'
import { isPlainObject } from './util.js'

/**
 * Validation.
 *
 * One pass over the declared fields. Every problem is collected rather than
 * thrown, because the form re-renders each bad field at once and support needs
 * the whole list.
 *
 * A diagnostic is `{ field, code, message }` where `field` uses dot notation
 * for nested objects: `shipping.postcode`.
 *
 * Codes:
 *   required   the key was absent or empty
 *   type       the value could not be read as the declared type
 *   enum       a value outside the allowed set
 *   range      outside min/max
 *   length     longer than maxLength
 */

/** A value counts as present when it is neither absent, null, nor whitespace. */
export function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

/**
 * Does `value` satisfy `field`? Returns a diagnostic code, or null.
 *
 * @param {object} field
 * @param {unknown} value already coerced
 * @param {{ present: boolean }} ctx
 */
export function checkField(field, value, ctx) {
  if (field.required && !ctx.present) return 'required'
  if (!ctx.present) return null

  if (field.type === 'array') {
    if (!Array.isArray(value)) return 'type'
  } else if (field.type === 'object') {
    if (!isPlainObject(value)) return 'type'
  } else if (typeof value !== field.type) {
    return 'type'
  }

  if (field.enum) {
    const allowed = field.enum.map((v) => String(v).toLowerCase())
    if (!allowed.includes(String(value).toLowerCase())) return 'enum'
  }

  if (typeof value === 'number') {
    if (field.min != null && value < field.min) return 'range'
    if (field.max != null && value > field.max) return 'range'
  }

  if (typeof value === 'string' && field.maxLength != null && value.length > field.maxLength) return 'length'

  return null
}

/** Validate one object against one schema. */
function walk(schema, raw, prefix, out) {
  const value = {}

  for (const [name, field] of Object.entries(schema)) {
    const path = prefix ? prefix + '.' + name : name
    const present = isPresent(raw?.[name])

    if (field.type === 'object' && field.fields) {
      const nested = coerce('object', raw?.[name])
      if (nested === undefined) {
        if (field.required) out.push({ field: path, code: 'required', message: path + ' is required' })
        continue
      }
      const child = {}
      walk(field.fields, nested, path, out)
      value[name] = child.value
      continue
    }

    const coerced = coerce(field.type, raw?.[name])
    const code = checkField(field, coerced, { present })

    if (code) {
      out.push({ field: path, code, message: path + ': ' + code })
      continue
    }

    if (present) value[name] = coerced
  }

  return { value }
}

/**
 * Validate a submission.
 *
 * @param {object} raw the parsed request body
 * @param {string} schemaName
 * @returns {{ valid: boolean, value: object, errors: {field:string,code:string,message:string}[] }}
 */
export function validate(raw, schemaName) {
  const schema = schemaFor(schemaName)
  const errors = []

  if (!isPlainObject(raw)) {
    return { valid: false, value: {}, errors: [{ field: '', code: 'type', message: 'body must be an object' }] }
  }

  const { value } = walk(schema, raw, '', errors)

  return { valid: errors.length === 0, value, errors }
}
