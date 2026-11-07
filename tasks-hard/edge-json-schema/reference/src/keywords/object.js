import { SchemaError, failure } from '../errors.js'
import { joinPointer } from '../pointer.js'
import { isPlainObject } from '../types.js'

const ownKeys = (value) => Object.keys(value)

function compile(source) {
  try {
    return new RegExp(source)
  } catch {
    throw new SchemaError(`"${source}" is not a valid regular expression`)
  }
}

function patternsOf(schema) {
  const patterns = schema.patternProperties
  if (!isPlainObject(patterns)) return []
  return Object.keys(patterns).map((source) => ({ source, expression: compile(source) }))
}

function namedOf(schema) {
  return isPlainObject(schema.properties) ? schema.properties : {}
}

/**
 * `properties` — the named properties of an object.
 */
export function properties(schema, value, path, errors, engine) {
  const named = namedOf(schema)
  if (!isPlainObject(value)) return
  for (const key of Object.keys(named)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue
    engine.check(named[key], value[key], joinPointer(path, key), errors)
  }
}

/**
 * `patternProperties` — the properties whose name matches an expression.
 *
 * The expression is a search over the key: `name` matches `userName`. A key the
 * `properties` keyword also names is checked against both subschemas; the two
 * keywords describe the same value from different angles.
 */
export function patternProperties(schema, value, path, errors, engine) {
  const patterns = patternsOf(schema)
  if (!patterns.length || !isPlainObject(value)) return
  for (const { source, expression } of patterns) {
    for (const key of ownKeys(value)) {
      if (!expression.test(key)) continue
      engine.check(schema.patternProperties[source], value[key], joinPointer(path, key), errors)
    }
  }
}

/**
 * `additionalProperties` — what to do with the properties nobody described.
 *
 * A property is described when `properties` names it or when any
 * `patternProperties` expression matches it; declaring patterns does not excuse
 * the keyword. `false` rejects the rest one by one, so the client sees every
 * unexpected name; a subschema validates each of their values.
 */
export function additionalProperties(schema, value, path, errors, engine) {
  const rule = schema.additionalProperties
  if (rule === undefined || !isPlainObject(value)) return

  const named = namedOf(schema)
  const patterns = patternsOf(schema)
  const extras = ownKeys(value).filter(
    (key) =>
      !Object.prototype.hasOwnProperty.call(named, key) &&
      !patterns.some(({ expression }) => expression.test(key)),
  )

  if (rule === false) {
    for (const key of extras) {
      errors.push(failure(path, 'additionalProperties', `"${key}" is not allowed`))
    }
    return
  }
  for (const key of extras) {
    engine.check(rule, value[key], joinPointer(path, key), errors)
  }
}

/**
 * `propertyNames` — a rule on the names themselves.
 *
 * The report points at the object, not at the property: a client cannot address
 * a name it is not allowed to send.
 */
export function propertyNames(schema, value, path, errors, engine) {
  const rule = schema.propertyNames
  if (rule === undefined || !isPlainObject(value)) return
  for (const key of ownKeys(value)) {
    const inner = []
    engine.check(rule, key, path, inner)
    if (inner.length > 0) {
      errors.push(failure(path, 'propertyNames', `"${key}" is not an allowed property name`))
    }
  }
}

export function minProperties(schema, value, path, errors) {
  if (!isPlainObject(value)) return
  if (ownKeys(value).length < schema.minProperties) {
    errors.push(
      failure(path, 'minProperties', `needs at least ${schema.minProperties} properties`),
    )
  }
}

export function maxProperties(schema, value, path, errors) {
  if (!isPlainObject(value)) return
  if (ownKeys(value).length > schema.maxProperties) {
    errors.push(
      failure(path, 'maxProperties', `takes at most ${schema.maxProperties} properties`),
    )
  }
}
