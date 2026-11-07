/** The values this library represents: the classical range 1..3999. */
export const MIN_VALUE = 1
export const MAX_VALUE = 3999

/** Throws a RangeError when `n` cannot be represented as a numeral. */
export function assertInRange(n) {
  if (typeof n !== 'number' || n < 0 || n > 4000) {
    throw new RangeError('value cannot be represented as a numeral')
  }
}
