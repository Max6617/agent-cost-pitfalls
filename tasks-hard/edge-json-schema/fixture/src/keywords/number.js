import { failure } from '../errors.js'

const isNumber = (value) => typeof value === 'number'

/** `minimum` — the inclusive floor. */
export function minimum(schema, value, path, errors) {
  if (!isNumber(value)) return
  if (value < schema.minimum) {
    errors.push(failure(path, 'minimum', `must be at least ${schema.minimum}`))
  }
}

/** `maximum` — the inclusive ceiling. */
export function maximum(schema, value, path, errors) {
  if (!isNumber(value)) return
  if (value > schema.maximum) {
    errors.push(failure(path, 'maximum', `must be at most ${schema.maximum}`))
  }
}

/** `exclusiveMinimum` — the floor is not itself allowed. */
export function exclusiveMinimum(schema, value, path, errors) {
  if (!isNumber(value)) return
  if (value < schema.exclusiveMinimum) {
    errors.push(failure(path, 'exclusiveMinimum', `must be greater than ${schema.exclusiveMinimum}`))
  }
}

/** `exclusiveMaximum` — the ceiling is not itself allowed. */
export function exclusiveMaximum(schema, value, path, errors) {
  if (!isNumber(value)) return
  if (value > schema.exclusiveMaximum) {
    errors.push(failure(path, 'exclusiveMaximum', `must be less than ${schema.exclusiveMaximum}`))
  }
}

/** `multipleOf` — the divisor has to divide the value. */
export function multipleOf(schema, value, path, errors) {
  if (!isNumber(value)) return
  const divisor = schema.multipleOf
  if (value % divisor !== 0) {
    errors.push(failure(path, 'multipleOf', `must be a multiple of ${divisor}`))
  }
}
