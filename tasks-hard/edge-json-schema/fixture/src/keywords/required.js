import { failure } from '../errors.js'
import { isPlainObject } from '../types.js'

/**
 * `required` — the names the payload has to carry.
 *
 * A missing name is reported at the object's own path: the client cannot look up
 * a pointer to a property that is not there.
 */
export function required(schema, value, path, errors) {
  const names = schema.required
  if (!Array.isArray(names) || !isPlainObject(value)) return
  for (const name of names) {
    if (value[name] === undefined) {
      errors.push(failure(path, 'required', `"${name}" is required`))
    }
  }
}
