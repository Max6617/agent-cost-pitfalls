/**
 * Exact decimal arithmetic.
 *
 * An amount is held as a sign, an integer of digits and a scale, and both are
 * carried through every operation. Nothing is ever converted to a double: a
 * double cannot represent 0.1, let alone 1.005, and a rounding decision taken
 * on the nearest double is a different decision from the one billing signed off.
 *
 * The outputs of add/sub/mul/div/sum/negate/abs/normalize are normalised - see
 * docs/billing-rules.md section 1 - while `roundTo` in rounding.js is the only
 * function that produces a fixed-scale string.
 */

const DECIMAL_RE = /^-?\d+(\.\d+)?$/

/** The low-level shape the other money modules build on. */
export function parseExact(value) {
  const text = typeof value === 'string' ? value : String(value)
  if (!DECIMAL_RE.test(text)) throw new Error('not a decimal: ' + text)
  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text
  const [whole, fraction = ''] = body.split('.')
  const digits = BigInt(whole + fraction)
  return { sign: negative && digits !== 0n ? -1n : 1n, digits, scale: fraction.length }
}

export function pow10(n) {
  return 10n ** BigInt(n)
}

/** Render an integer-plus-scale back to a string. */
export function renderExact(value, scale, fixed) {
  const negative = value < 0n
  const text = (negative ? -value : value).toString().padStart(scale + 1, '0')
  const whole = text.slice(0, text.length - scale)
  const fraction = text.slice(text.length - scale)
  const sign = negative ? '-' : ''
  if (fixed) return scale === 0 ? sign + whole : sign + whole + '.' + fraction
  const trimmed = fraction.replace(/0+$/, '')
  return trimmed === '' ? sign + whole : sign + whole + '.' + trimmed
}

export function isDecimal(value) {
  return typeof value === 'string' && DECIMAL_RE.test(value)
}

/** Normalised exact string for a value that is already exact. */
export function normalize(value) {
  const { sign, digits, scale } = parseExact(value)
  return renderExact(sign * digits, scale, false)
}

function aligned(a, b) {
  const x = parseExact(a)
  const y = parseExact(b)
  const scale = Math.max(x.scale, y.scale)
  return {
    left: x.sign * x.digits * pow10(scale - x.scale),
    right: y.sign * y.digits * pow10(scale - y.scale),
    scale,
  }
}

export function add(a, b) {
  const { left, right, scale } = aligned(a, b)
  return renderExact(left + right, scale, false)
}

export function negate(a) {
  const { sign, digits, scale } = parseExact(a)
  return renderExact(-(sign * digits), scale, false)
}

export function abs(a) {
  const { sign, digits, scale } = parseExact(a)
  return renderExact(sign * digits < 0n ? digits : sign * digits, scale, false)
}

export function sub(a, b) {
  return add(a, negate(b))
}

export function sum(values) {
  let total = '0'
  for (const value of values) total = add(total, value)
  return total
}

export function mul(a, b) {
  const x = parseExact(a)
  const y = parseExact(b)
  return renderExact(x.sign * y.sign * x.digits * y.digits, x.scale + y.scale, false)
}

/**
 * Exact quotient. A quotient that has no finite decimal form is not an amount,
 * so it throws rather than silently truncating: the caller has a rounding
 * decision to make and has to make it explicitly.
 */
export function div(a, b) {
  const x = parseExact(a)
  const y = parseExact(b)
  if (y.digits === 0n) throw new Error('division by zero')
  if (x.digits === 0n) return '0'
  let numerator = x.sign * x.digits * pow10(y.scale)
  let denominator = y.sign * y.digits * pow10(x.scale)
  const negative = (numerator < 0n) !== (denominator < 0n)
  if (numerator < 0n) numerator = -numerator
  if (denominator < 0n) denominator = -denominator
  let twos = 0
  let fives = 0
  while (denominator % 2n === 0n) {
    denominator /= 2n
    twos += 1
  }
  while (denominator % 5n === 0n) {
    denominator /= 5n
    fives += 1
  }
  if (denominator !== 1n) throw new Error('division is not exact: ' + a + ' / ' + b)
  const scale = Math.max(twos, fives)
  const scaled = numerator * 2n ** BigInt(scale - twos) * 5n ** BigInt(scale - fives)
  return renderExact(negative ? -scaled : scaled, scale, false)
}

export function compare(a, b) {
  const { left, right } = aligned(a, b)
  return left === right ? 0 : left < right ? -1 : 1
}

export function isZero(value) {
  return parseExact(value).digits === 0n
}

/** Floor division on BigInt, which truncates toward zero on its own. */
export function floorDiv(numerator, denominator) {
  const quotient = numerator / denominator
  if (numerator % denominator !== 0n && numerator < 0n !== denominator < 0n) return quotient - 1n
  return quotient
}
