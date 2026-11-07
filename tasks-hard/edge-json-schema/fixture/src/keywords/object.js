import { failure } from '../errors.js'
import { joinPointer } from '../pointer.js'
import { isPlainObject } from '../types.js'

const ownKeys = (value) => Object.keys(value)

/**
 * `properties` — the named properties of an object.
 */
export function properties(schema, value, path, errors, engine) {
  const named = schema.properties
  if (!isPlainObject(named) || !isPlainObject(value)) return
  for (const key of Object.keys(named)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue
    engine.check(named[key], value[key], joinPointer(path, key), errors)
  }
}

/**
 * `patternProperties` — the properties whose name matches an expression.
 *
 * Only the properties `properties` did not already name are checked here: a
 * named property is the job of the keyword above.
 */
export function patternProperties(schema, value, path, errors, engine) {
  const patterns = schema.patternProperties
  if (!isPlainObject(patterns) || !isPlainObject(value)) return
  const named = isPlainObject(schema.properties) ? schema.properties : {}
  for (const source of Object.keys(patterns)) {
    const expression = new RegExp('^(?:' + source + ')$')
    for (const key of ownKeys(value)) {
      if (!expression.test(key)) continue
      if (Object.prototype.hasOwnProperty.call(named, key)) continue
      engine.check(patterns[source], value[key], joinPointer(path, key), errors)
    }
  }
}

/**
 * `additionalProperties` — what to do with the properties nobody described.
 *
 * `false` rejects them one by one, so the client sees every unexpected name;
 * a subschema validates each of their values.
 */
export function additionalProperties(schema, value, path, errors, engine) {
  const rule = schema.additionalProperties
  if (rule === undefined || !isPlainObject(value)) return
  if (isPlainObject(schema.patternProperties)) return

  const named = isPlainObject(schema.properties) ? schema.properties : {}
  const extras = ownKeys(value).filter(
    (key) => !Object.prototype.hasOwnProperty.call(named, key),
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
