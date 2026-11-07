/**
 * Decimal helpers.
 *
 * Amounts cross the public surface as strings so that a value cannot pick up
 * binary floating point error on its way through a round trip. Everything that
 * does arithmetic on money goes through here.
 *
 * A value is held as an integer of digits plus a scale, exactly, and both are
 * carried through the arithmetic. Nothing is ever converted to a double, because
 * a double cannot represent 0.1, let alone 1.005.
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

function parse(value) {
  const text = String(value).trim()
  if (!DECIMAL_RE.test(text)) throw new Error('not a decimal: ' + text)
  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text
  const [whole, fraction = ''] = body.split('.')
  const digits = BigInt((whole + fraction).replace(/^0+(?=\d)/, ''))
  return { sign: negative ? -1n : 1n, digits, scale: fraction.length }
}

function pow10(n) {
  return 10n ** BigInt(n)
}

/** Render an integer-plus-scale back to a string. */
function render(value, scale, fixed) {
  const negative = value < 0n
  const text = (negative ? -value : value).toString().padStart(scale + 1, '0')
  const whole = text.slice(0, text.length - scale)
  const fraction = text.slice(text.length - scale)
  const sign = negative ? '-' : ''
  if (fixed) return scale === 0 ? sign + whole : sign + whole + '.' + fraction
  const trimmed = fraction.replace(/0+$/, '')
  return trimmed === '' ? sign + whole : sign + whole + '.' + trimmed
}

/** Normalised exact string for a value that is already exact. */
export function normalize(value) {
  const { sign, digits, scale } = parse(value)
  return render(sign * digits, scale, false)
}

export function toNumber(value) {
  return Number(value)
}

export function add(a, b) {
  const x = parse(a)
  const y = parse(b)
  const scale = Math.max(x.scale, y.scale)
  const left = x.sign * x.digits * pow10(scale - x.scale)
  const right = y.sign * y.digits * pow10(scale - y.scale)
  return render(left + right, scale, false)
}

export function negate(a) {
  const { sign, digits, scale } = parse(a)
  return render(-sign * digits, scale, false)
}

export function sub(a, b) {
  return add(a, negate(b))
}

export function sum(values) {
  let total = '0'
  for (const v of values) total = add(total, v)
  return total
}

export function mul(a, b) {
  const x = parse(a)
  const y = parse(b)
  return render(x.sign * y.sign * x.digits * y.digits, x.scale + y.scale, false)
}

export function compare(a, b) {
  const x = parse(a)
  const y = parse(b)
  const scale = Math.max(x.scale, y.scale)
  const left = x.sign * x.digits * pow10(scale - x.scale)
  const right = y.sign * y.digits * pow10(scale - y.scale)
  return left === right ? 0 : left < right ? -1 : 1
}

export function isZero(value) {
  return parse(value).digits === 0n
}

/**
 * Round to `scale` decimals, half-up and away from zero, on the exact value.
 * Returns a fixed-scale string: round('109') is '109.00'.
 */
export function round(value, scale = 2) {
  const { sign, digits, scale: own } = parse(value)
  let scaled = sign * digits
  if (own > scale) {
    const drop = pow10(own - scale)
    const kept = scaled / drop
    const remainder = scaled % drop
    const magnitude = remainder < 0n ? -remainder : remainder
    const roundAway = magnitude * 2n >= drop
    scaled = kept + (roundAway ? (scaled < 0n ? -1n : 1n) : 0n)
  } else {
    scaled = scaled * pow10(scale - own)
  }
  return render(scaled, scale, true)
}
