import { failure } from '../errors.js'
import { joinPointer } from '../pointer.js'
import { isPlainObject } from '../types.js'

/**
 * `items` — the shape of the elements.
 *
 * A tuple describes a prefix: `items` as an array names the element at each
 * position, and `additionalItems` decides what the positions past the end of the
 * tuple are allowed to hold.
 */
export function items(schema, value, path, errors, engine) {
  const spec = schema.items
  if (spec === undefined || !Array.isArray(value)) return

  if (Array.isArray(spec)) {
    for (let index = 0; index < spec.length; index++) {
      engine.check(spec[index], value[index], joinPointer(path, index), errors)
    }
    if (value.length <= spec.length) return

    const extra = schema.additionalItems ?? false
    if (extra === false) {
      errors.push(failure(path, 'additionalItems', `takes at most ${spec.length} items`))
      return
    }
    if (isPlainObject(extra)) {
      for (let index = spec.length; index < value.length; index++) {
        engine.check(extra, value[index], joinPointer(path, index), errors)
      }
    }
    return
  }

  for (let index = 0; index < value.length; index++) {
    engine.check(spec, value[index], joinPointer(path, index), errors)
  }
}

export function minItems(schema, value, path, errors) {
  if (!Array.isArray(value)) return
  if (value.length < schema.minItems) {
    errors.push(failure(path, 'minItems', `needs at least ${schema.minItems} items`))
  }
}

export function maxItems(schema, value, path, errors) {
  if (!Array.isArray(value)) return
  if (value.length > schema.maxItems) {
    errors.push(failure(path, 'maxItems', `takes at most ${schema.maxItems} items`))
  }
}

/**
 * `uniqueItems` — one entry for the first element that has already been seen.
 */
export function uniqueItems(schema, value, path, errors) {
  if (schema.uniqueItems !== true || !Array.isArray(value)) return
  const seen = new Set()
  for (const element of value) {
    const fingerprint = JSON.stringify(element)
    if (seen.has(fingerprint)) {
      errors.push(failure(path, 'uniqueItems', `repeats the value ${fingerprint}`))
      return
    }
    seen.add(fingerprint)
  }
}
