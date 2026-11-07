import { failure } from '../errors.js'
import { equal } from '../util/equal.js'

/** `enum` — the value has to be one of the listed ones. */
export function enumKeyword(schema, value, path, errors) {
  const allowed = schema.enum
  if (!Array.isArray(allowed)) return
  if (!allowed.some((candidate) => equal(candidate, value))) {
    errors.push(failure(path, 'enum', 'is not one of the allowed values'))
  }
}

/** `const` — the value has to be exactly this one. */
export function constKeyword(schema, value, path, errors) {
  if (!equal(schema.const, value)) {
    errors.push(failure(path, 'const', 'is not the only allowed value'))
  }
}
