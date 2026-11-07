/**
 * The fraction value type.
 *
 * A fraction is a frozen plain object { n, d }: two integers, numerator and
 * denominator. Values are only ever built here (directly, or by the parser and
 * the arithmetic operators), so every value in flight is normalised — see
 * docs/fraction-rules.md for what that promises.
 */
import { norm } from './reduce.js'

export function makeFraction(n, d = 1) {
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    throw new TypeError('fraction parts must be integers')
  }
  if (d === 0) throw new RangeError('zero denominator')
  return norm({ n, d })
}

export function isFraction(x) {
  return (
    typeof x === 'object' &&
    x !== null &&
    Number.isInteger(x.n) &&
    Number.isInteger(x.d) &&
    x.d !== 0
  )
}

export function isZero(f) {
  return f.n === 0
}

export const ZERO = makeFraction(0, 1)
export const ONE = makeFraction(1, 1)
