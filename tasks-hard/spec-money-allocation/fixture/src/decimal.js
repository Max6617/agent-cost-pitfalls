/**
 * Decimal helpers.
 *
 * Amounts cross the public surface as strings so that a value cannot pick up
 * binary floating point error on its way through a round trip. Everything that
 * does arithmetic on money goes through here.
 *
 * The outputs of add/sub/mul/div/sum/negate/abs/normalize are normalised: no
 * trailing zeros in the fraction, no trailing point, and never `-0`. `roundTo`
 * in rounding.js is the formatter, and it always returns exactly `scale`
 * decimals, because that is what gets printed on an invoice.
 */

const DECIMAL_RE = /^-?\d+(\.\d+)?$/

export function isDecimal(value) {
  return typeof value === 'string' && DECIMAL_RE.test(value)
}

/** The value behind the string, for the arithmetic below. */
export function toNumber(value) {
  const text = typeof value === 'string' ? value.trim() : String(value)
  if (!DECIMAL_RE.test(text)) throw new Error('not a decimal: ' + text)
  return Number(text)
}

/** Normalised string for a value that is already correct. */
export function normalize(value) {
  const number = toNumber(value)
  let text = String(number)
  if (text.includes('e') || text.includes('E')) text = number.toFixed(20)
  const trimmed = text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
  return trimmed === '' || trimmed === '-' || trimmed === '-0' ? '0' : trimmed
}

export function add(a, b) {
  return normalize(toNumber(a) + toNumber(b))
}

export function sub(a, b) {
  return normalize(toNumber(a) - toNumber(b))
}

export function negate(a) {
  return normalize(-toNumber(a))
}

export function abs(a) {
  return normalize(Math.abs(toNumber(a)))
}

export function sum(values) {
  let total = '0'
  for (const value of values) total = add(total, value)
  return total
}

export function mul(a, b) {
  return normalize(toNumber(a) * toNumber(b))
}

export function div(a, b) {
  const divisor = toNumber(b)
  if (divisor === 0) throw new Error('division by zero')
  return normalize(toNumber(a) / divisor)
}

export function compare(a, b) {
  const x = toNumber(a)
  const y = toNumber(b)
  return x === y ? 0 : x < y ? -1 : 1
}

export function isZero(value) {
  return toNumber(value) === 0
}
