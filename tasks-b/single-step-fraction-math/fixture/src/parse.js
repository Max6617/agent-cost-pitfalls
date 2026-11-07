/**
 * fromString: the notation side of the library.
 *
 * Accepts the three written forms from docs/fraction-rules.md — a plain
 * fraction '3/4', a bare integer '7', and a mixed number '1 1/2' — and rejects
 * everything else with a TypeError. Surrounding whitespace is ignored.
 */
import { makeFraction } from './fraction.js'
import { add } from './arithmetic.js'

const INTEGER_RE = /^[+-]?\d+$/
const FRACTION_RE = /^([+-]?\d+)\/(\d+)$/
const MIXED_RE = /^([+-]?\d+) +(\d+)\/(\d+)$/

export function fromString(text) {
  if (typeof text !== 'string') {
    throw new TypeError('invalid fraction: not a string')
  }
  const s = text.trim()

  const mixed = MIXED_RE.exec(s)
  if (mixed) {
    // a mixed number is the whole part plus the fractional part
    const whole = makeFraction(Number(mixed[1]), 1)
    const part = makeFraction(Number(mixed[2]), Number(mixed[3]))
    return add(whole, part)
  }

  const fraction = FRACTION_RE.exec(s)
  if (fraction) {
    return makeFraction(Number(fraction[1]), Number(fraction[2]))
  }

  if (INTEGER_RE.test(s)) {
    return makeFraction(Number(s), 1)
  }

  throw new TypeError('invalid fraction: ' + s)
}
