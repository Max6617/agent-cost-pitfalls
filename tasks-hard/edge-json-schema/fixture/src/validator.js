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

  if (schema.type !== undefined && !isType(value, schema.type)) {
    errors.push(failure(path, 'type', `expected ${schema.type}, got ${describe(value)}`))
    return
  }

  for (const keyword of Object.keys(schema)) {
    if (keyword === 'type') continue
    const handler = KEYWORD_HANDLERS[keyword]
    if (handler === undefined) continue

    const before = errors.length
    handler(schema, value, path, errors, engine)
    // The gateway logs one complaint per value: the first failing keyword is the
    // one the client has to deal with.
    if (errors.length > before) return
  }
}

function makeReport(errors) {
  // A stable order keeps the gateway's log lines comparable between requests.
  const ordered = errors
    .slice()
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
  return { valid: ordered.length === 0, errors: ordered }
}

export function validate(schema, instance) {
  const errors = []
  checkValue(schema, instance, '', errors)
  return makeReport(errors)
}
