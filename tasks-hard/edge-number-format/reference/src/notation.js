/**
 * Notation: which of the two shapes a value is printed in.
 *
 * Plain notation is a sign, an optionally grouped integer part and a decimal
 * point. Scientific notation is a mantissa with the separator `e` and a signed
 * exponent. The exponent decided by `rules.js` is the only thing that chooses
 * between them, and zero never goes scientific.
 */
import { MAX_EXPONENT, MIN_EXPONENT } from './rules.js'
import { exponentOf } from './util/magnitude.js'
import { isSpecial } from './util/guards.js'

/** Would this value be printed with an exponent? */
export function usesScientific(value) {
  if (isSpecial(value) || value === 0) return false
  const exponent = exponentOf(value)
  return exponent < MIN_EXPONENT || exponent > MAX_EXPONENT
}

/**
 * `1.00e+21` / `5.00e-7`: the mantissa keeps `digits` fraction digits and the
 * exponent is written with an explicit sign and no leading zeros.
 */
export function sci(value, digits) {
  const text = value.toExponential(digits)
  const marker = text.indexOf('e')
  return text.slice(0, marker) + signedExponent(Number(text.slice(marker + 1)))
}

/** The exponent part of a mantissa/exponent pair, with its sign. */
export function signedExponent(exponent) {
  return exponent < 0 ? 'e-' + String(-exponent) : 'e+' + String(exponent)
}
