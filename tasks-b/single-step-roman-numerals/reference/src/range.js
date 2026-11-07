/** The values this library represents: the classical range 1..3999. */
export const MIN_VALUE = 1
export const MAX_VALUE = 3999

/** Throws a RangeError when `n` cannot be represented as a numeral. */
export function assertInRange(n) {
  if (!Number.isInteger(n) || n < MIN_VALUE || n > MAX_VALUE) {
    throw new RangeError('value out of range (' + MIN_VALUE + '..' + MAX_VALUE + ')')
  }
}
