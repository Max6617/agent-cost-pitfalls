import { failure } from '../errors.js'
import { joinPointer } from '../pointer.js'
import { isPlainObject } from '../types.js'
import { equal } from '../util/equal.js'

/**
 * `items` — the shape of the elements.
 *
 * A tuple describes a prefix: `items` as an array names the element at each
 * position it describes, and `additionalItems` decides what the positions past
 * the end of the tuple are allowed to hold. Positions the instance does not
 * reach are not checked — a short array is `minItems`' business.
 */
export function items(schema, value, path, errors, engine) {
  const spec = schema.items
  if (spec === undefined || !Array.isArray(value)) return

  if (Array.isArray(spec)) {
    const described = Math.min(spec.length, value.length)
    for (let index = 0; index < described; index++) {
      engine.check(spec[index], value[index], joinPointer(path, index), errors)
    }
    if (value.length <= spec.length) return

    // An absent `additionalItems` allows the extras: a tuple that describes a
    // prefix is the common case.
    const extra = schema.additionalItems === undefined ? true : schema.additionalItems
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
 * `uniqueItems` — one entry for the first element that has already been seen,
 * under the equality of the subset and not under a serialisation of the value.
 */
export function uniqueItems(schema, value, path, errors) {
  if (schema.uniqueItems !== true || !Array.isArray(value)) return
  for (let index = 0; index < value.length; index++) {
    for (let earlier = 0; earlier < index; earlier++) {
      if (equal(value[earlier], value[index])) {
        errors.push(failure(path, 'uniqueItems', 'repeats an earlier value'))
        return
      }
    }
  }
}
