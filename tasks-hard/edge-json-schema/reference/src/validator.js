import { SchemaError, failure } from './errors.js'
import { describe, isPlainObject, isType } from './types.js'
import { KEYWORD_HANDLERS } from './registry.js'

/**
 * The walker.
 *
 * Handlers get the whole schema, the value, the path of that value and the list
 * they append their entries to; they never import this module, so a keyword can
 * validate a subschema through `engine.check` without a cycle.
 */
const engine = {
  check(schema, value, path, errors) {
    checkValue(schema, value, path, errors)
  },
}

function checkValue(schema, value, path, errors) {
  if (!isPlainObject(schema)) {
    throw new SchemaError('a schema has to be an object')
  }

  // A non-finite number is not a JSON value: one entry, and none of the
  // keywords of this schema are applied to it. Reporting `maximum` for
  // `Infinity` would suggest the client sent a large number.
  if (typeof value === 'number' && !Number.isFinite(value)) {
    errors.push(failure(path, 'type', `${String(value)} is not a JSON number`))
    return
  }

  if (schema.type !== undefined && !isType(value, schema.type)) {
    errors.push(failure(path, 'type', `expected ${schema.type}, got ${describe(value)}`))
    return
  }

  for (const keyword of Object.keys(schema)) {
    if (keyword === 'type') continue
    const handler = KEYWORD_HANDLERS[keyword]
    if (handler === undefined) continue
    handler(schema, value, path, errors, engine)
  }
}

function makeReport(errors) {
  return { valid: errors.length === 0, errors }
}

export function validate(schema, instance) {
  const errors = []
  checkValue(schema, instance, '', errors)
  return makeReport(errors)
}
