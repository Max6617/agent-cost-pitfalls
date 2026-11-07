/**
 * Decimal-exponent helpers.
 *
 * Everything about notation hangs off one number: the exponent k when a value is
 * written m * 10^k with 1 <= m < 10. `0` has no exponent, which is why it is
 * special-cased in the notation layer rather than here.
 */

/**
 * Exponent of a finite non-zero double, computed exactly.
 *
 * `toExponential` renders the shortest digits that identify the double, so the
 * digit before its `e` is the mantissa and the integer after it is k. That works
 * for every magnitude a double can hold, including the subnormals, where a
 * log10 would lose the last digit.
 */
export function exponentOf(value) {
  const text = Math.abs(value).toExponential()
  const marker = text.indexOf('e')
  return Number(text.slice(marker + 1))
}

/** The digits `toExponential` produced, without the decimal point. */
export function digitsOf(value) {
  const text = Math.abs(value).toExponential()
  return text.slice(0, text.indexOf('e')).replace('.', '')
}

/** Render `value * 10^shift` without going through a double. */
export function scaleByPowerOfTen(digits, exponent) {
  return digits + '0'.repeat(Math.max(exponent, 0))
}
