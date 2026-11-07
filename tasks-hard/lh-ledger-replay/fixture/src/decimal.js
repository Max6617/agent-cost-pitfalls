/**
 * Decimal helpers.
 *
 * Amounts cross the public surface as strings so that a value cannot pick up
 * binary floating point error on its way through a round trip. Everything that
 * does arithmetic on money goes through here.
 *
 * The outputs of add/sub/sum/mul are normalised: no trailing zeros in the
 * fraction, no trailing point, and never `-0`. `round` is the formatter and
 * always returns exactly `scale` decimals, because that is what gets printed on
 * a statement.
 */

const DECIMAL_RE = /^-?\d+(\.\d+)?$/

export function isDecimal(value) {
  return typeof value === 'string' && DECIMAL_RE.test(value)
}

export function toNumber(value) {
  return Number(value)
}

/** Normalised exact string for a value that is already exact. */
export function normalize(value) {
  const text = String(value)
  if (!text.includes('.')) return text
  const trimmed = text.replace(/0+$/, '').replace(/\.$/, '')
  return trimmed === '' || trimmed === '-' ? '0' : trimmed
}

export function add(a, b) {
  return normalize(toNumber(a) + toNumber(b))
}

export function sub(a, b) {
  return normalize(toNumber(a) - toNumber(b))
}

export function sum(values) {
  let total = '0'
  for (const v of values) total = add(total, v)
  return total
}

export function mul(a, b) {
  return normalize(toNumber(a) * toNumber(b))
}

export function negate(a) {
  return normalize(-toNumber(a))
}

export function compare(a, b) {
  const x = toNumber(a)
  const y = toNumber(b)
  return x === y ? 0 : x < y ? -1 : 1
}

export function isZero(value) {
  return toNumber(value) === 0
}

/**
 * Round to `scale` decimals, half-up and away from zero.
 * Returns a fixed-scale string: round('109') is '109.00'.
 */
export function round(value, scale = 2) {
  const factor = 10 ** scale
  const scaled = Math.round(toNumber(value) * factor) / factor
  return scaled.toFixed(scale)
}
