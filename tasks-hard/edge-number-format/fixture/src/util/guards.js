/**
 * Small helpers that do not belong to any one renderer.
 */

/** True for the three values that are printed as labels rather than numbers. */
export function isSpecial(value) {
  return typeof value !== 'number' || !Number.isFinite(value)
}

/** The label for a non-finite value, or undefined for a finite one. */
export function specialLabel(value) {
  if (typeof value !== 'number') return 'NaN'
  if (Number.isNaN(value)) return 'NaN'
  if (value === Infinity) return 'Infinity'
  if (value === -Infinity) return '-Infinity'
  return undefined
}

/** `value` as a non-negative double. Used before any sign is handled. */
export function magnitudeOf(value) {
  return value < 0 ? -value : value
}

/**
 * True when `value` is a double that names a whole number exactly.
 *
 * Past 2^53 not every integer is a double, so this is the honest test: a value
 * that passes it can be turned into a BigInt and printed digit for digit.
 */
export function isExactInteger(value) {
  return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER
}

/** Round a half-away-from-zero decision on an exact digit string. */
export function roundsUp(nextDigit) {
  return nextDigit !== undefined && nextDigit >= '5'
}

/**
 * The exact decimal digits of a finite non-negative double, and the power of ten
 * the last of them stands for.
 *
 * `toExponential` renders the shortest digit string that identifies the double,
 * which is the same digit string `toString` produces — but it also writes the
 * exponent, so a value whose own magnitude is far too small to hold as a literal
 * can be expanded here without ever going back through a double. That is the
 * only way a subnormal keeps the digits the double actually has: the number
 * below the smallest normal double is not `5 * 10^-324` to `Number`, and reading
 * its digits back out of a decimal literal gives it back wrong.
 */
export function exactDigits(value) {
  const text = magnitudeOf(value).toExponential()
  const marker = text.indexOf('e')
  const mantissa = text.slice(0, marker)
  const dot = mantissa.indexOf('.')
  const fraction = dot === -1 ? '' : mantissa.slice(dot + 1)
  const digits = (dot === -1 ? mantissa : mantissa.slice(0, dot) + fraction).replace(/^0+/, '') || '0'
  return { digits, power: Number(text.slice(marker + 1)) - fraction.length }
}

/**
 * A rounded digit run as the double it names.
 *
 * The run is a digit string and its last digit stands for 10^power, which is
 * exactly what the `e` notation of `Number` takes — so the value comes back
 * without ever being written as a decimal literal, which is what a subnormal
 * cannot survive.
 */
export function valueOfRun(rounded) {
  return Number(rounded.digits + 'e' + rounded.power)
}
