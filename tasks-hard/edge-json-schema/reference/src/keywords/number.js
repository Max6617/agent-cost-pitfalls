import { SchemaError, failure } from '../errors.js'

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
  if (!(value > schema.exclusiveMinimum)) {
    errors.push(failure(path, 'exclusiveMinimum', `must be greater than ${schema.exclusiveMinimum}`))
  }
}

/** `exclusiveMaximum` — the ceiling is not itself allowed. */
export function exclusiveMaximum(schema, value, path, errors) {
  if (!isNumber(value)) return
  if (!(value < schema.exclusiveMaximum)) {
    errors.push(failure(path, 'exclusiveMaximum', `must be less than ${schema.exclusiveMaximum}`))
  }
}

/**
 * A number as the decimal the client wrote: its digits, and the power of ten
 * they are scaled by. `0.3` is `3 * 10^-1`, `1e-7` is `1 * 10^-7`.
 */
function decimal(number) {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(number))
  if (match === null) return null
  const fraction = match[3] ?? ''
  const digits = BigInt(match[2] + fraction) * (match[1] === '-' ? -1n : 1n)
  return { digits, exponent: Number(match[4] ?? 0) - fraction.length }
}

/**
 * Whether `value / divisor` is a whole number, decided on the decimal values
 * and not on the binary division: the quotient of the two numbers as written
 * has to be exact, and there is no tolerance.
 */
function isExactMultiple(value, divisor) {
  if (value === 0) return true
  const left = decimal(value)
  const right = decimal(divisor)
  if (left === null || right === null) return false

  const shift = left.exponent - right.exponent
  const numerator = shift >= 0 ? left.digits * 10n ** BigInt(shift) : left.digits
  const denominator = shift >= 0 ? right.digits : right.digits * 10n ** BigInt(-shift)
  if (denominator === 0n) return false
  return numerator % denominator === 0n
}

/** `multipleOf` — the divisor has to divide the value. */
export function multipleOf(schema, value, path, errors) {
  if (!isNumber(value)) return
  const divisor = schema.multipleOf
  if (typeof divisor !== 'number' || !Number.isFinite(divisor) || divisor <= 0) {
    throw new SchemaError(`multipleOf has to be a positive number, got ${divisor}`)
  }
  if (!isExactMultiple(value, divisor)) {
    errors.push(failure(path, 'multipleOf', `must be a multiple of ${divisor}`))
  }
}
