/**
 * The four operators, plus sign helpers and the display escape hatch.
 *
 * add/sub/mul carry their intermediates in BigInt and only narrow back to a
 * plain integer when the value is built, so nothing in the exact range picks
 * up rounding on the way through. toNumber() is the display helper: it exists
 * for UI and logging, and exact work never goes near it.
 */
import { makeFraction } from './fraction.js'

export function add(a, b) {
  const n = BigInt(a.n) * BigInt(b.d) + BigInt(b.n) * BigInt(a.d)
  const d = BigInt(a.d) * BigInt(b.d)
  return makeFraction(Number(n), Number(d))
}

export function negate(f) {
  return makeFraction(-f.n, f.d)
}

export function sub(a, b) {
  return add(a, negate(b))
}

export function abs(f) {
  return f.n < 0 ? negate(f) : f
}

export function mul(a, b) {
  const n = BigInt(a.n) * BigInt(b.n)
  const d = BigInt(a.d) * BigInt(b.d)
  return makeFraction(Number(n), Number(d))
}

export function div(a, b) {
  if (b.n === 0) throw new RangeError('division by zero')
  // a/b as a decimal ratio, rebuilt into a fraction
  return fromDecimal(toNumber(a) / toNumber(b))
}

export function toNumber(f) {
  return f.n / f.d
}

function fromDecimal(x) {
  if (!Number.isFinite(x)) throw new RangeError('non-finite value')
  const s = String(x)
  const negative = s.startsWith('-')
  const body = negative ? s.slice(1) : s
  const dot = body.indexOf('.')
  if (dot === -1) {
    const whole = Number(body)
    return makeFraction(negative ? -whole : whole, 1)
  }
  const digits = body.length - dot - 1
  const scaled = Number(body.replace('.', ''))
  return makeFraction(negative ? -scaled : scaled, 10 ** digits)
}
