/**
 * Significant-digit rendering.
 *
 * A count of significant digits is a promise about the leading digits of a value
 * and nothing more: `sig` digits are kept, the rest are dropped with the same
 * half-away-from-zero rule the rest of the toolkit uses, and zeros stand in for
 * the places between the last significant digit and the decimal point.
 * `precise(2, 3)` is `2.00`; `precise(1234.5, 20)` is `1,234.5`, because the
 * places the count asked for are not digits of anything.
 *
 * Everything below works on a digit run and the power of ten its last digit
 * stands for, because that is the only way to round `2.675` to `2.68` at three
 * digits: the double nearest that literal sits below the halfway point. The
 * notation follows the value that was *rounded*, not the one that arrived: a
 * count that carries `9.99e20` up to `1.0e21` prints it with an exponent.
 */
import { DEFAULT_SIGNIFICANT } from './rules.js'
import { exponentOf } from './util/magnitude.js'
import { renderFixed } from './text.js'
import { groupRendered } from './grouping.js'
import { sci, usesScientific } from './notation.js'
import { exactDigits, isSpecial, magnitudeOf, valueOfRun } from './util/guards.js'

/** A digit string plus one, without going through a double. */
function incrementDigits(text) {
  return (BigInt(text) + 1n).toString()
}

/** The decimal exponent of a finite non-negative value. */
function exponentOfValue(magnitude) {
  return magnitude === 0 ? 0 : exponentOf(magnitude)
}

/**
 * How many fraction digits a significant-digit count is worth for a rounded run.
 *
 * The count reaches from the leading digit down to the last digit it keeps, and
 * the places it needs are what is left of the count once the leading digit has
 * taken its own place: `1234.567` at two digits keeps nothing after the point,
 * and `0.5` at three digits keeps three places.
 */
export function placesForRun(rounded, significant, capped = Infinity) {
  return Math.max(0, Math.min(significant - rounded.digits.length - rounded.power, capped))
}

/**
 * How many fraction digits a significant-digit count is worth for a value whose
 * leading digit stands for 10^exponent. A count narrower than the integer part is
 * worth none.
 */
export function fractionPlacesFor(exponent, significant) {
  if (exponent < 0) return significant - 1 - exponent
  return Math.max(0, significant - 1 - exponent)
}

/**
 * Round `value` to `significant` significant digits.
 *
 * `digits` is the kept digits and `power` the power of ten the last of them
 * stands for; `sign` is 0 when the value had no digit that survived the rounding.
 * The decision is made on the first dropped digit, never on a float, so `2.675`
 * at three digits is `2.68`.
 */
export function roundToSignificant(value, significant) {
  const magnitude = magnitudeOf(value)
  const written = exactDigits(magnitude).digits
  const lead = written.search(/[1-9]/)
  if (lead === -1) return { digits: '0', power: 0, sign: 0 }

  const exponent = exponentOfValue(magnitude)
  const digits = written.slice(lead)
  const count = Math.min(significant, digits.length)
  const kept = digits.slice(0, count)
  const dropped = digits.slice(count)
  const grew = dropped !== '' && dropped[0] >= '5' ? 1 : 0
  const rounded = grew === 1 ? incrementDigits(kept) : kept

  // The last digit of the rounded run stands `rounded.length - 1` powers below
  // the run's own leading digit, one power higher than the value's when a carry
  // grew the run past the digits it replaced.
  const carried = rounded.length > kept.length ? 1 : 0
  const power = exponent + carried - (rounded.length - 1)
  return { digits: rounded, power, sign: 1 }
}

/**
 * Render a kept digit run whose last digit stands for 10^power as a plain value
 * with `places` fraction digits.
 *
 * Zeros are added where the count reaches past the digits the value has, and the
 * zeros the value carries beyond the grid are left off again, so `1.5` at three
 * digits is `1.50` and `1234.5` at twenty digits is `1,234.5`.
 */
export function plainRun(rounded, places) {
  const scale = Math.max(0, places)
  const natural = Math.max(0, -rounded.power)
  const standing = rounded.power > 0 ? rounded.digits + '0'.repeat(rounded.power) : rounded.digits
  const split = standing.length - natural
  const whole = (standing.slice(0, Math.max(0, split)) || '0').replace(/^0+(?=\d)/, '')
  if (scale === 0) return whole
  const reach = standing.slice(Math.max(0, split)).padStart(natural, '0')
  const trimmed = scale < natural ? reach.slice(0, scale) : reach
  const fraction = trimmed.padEnd(scale, '0')
  return whole + '.' + fraction
}

/**
 * The plain rendering of `value` at `significant` significant digits, with no
 * separators and no sign. `capped` bounds how far into the fraction the count
 * may reach.
 */
export function renderPlainSignificant(value, significant, capped = Infinity) {
  const sig = Math.max(1, Math.trunc(significant))
  const rounded = roundToSignificant(magnitudeOf(value), sig)
  if (rounded.sign === 0) return renderFixed(0, Math.max(0, Math.min(sig - 1, capped)))
  return plainRun(rounded, placesForRun(rounded, sig, capped))
}

/** Render a finite non-zero magnitude with `significant` significant digits. */
export function renderPrecise(value, significant = DEFAULT_SIGNIFICANT) {
  const sig = Math.max(1, Math.trunc(significant))
  if (isSpecial(value)) return String(value)
  if (value === 0) return '0.' + '0'.repeat(sig)

  const magnitude = magnitudeOf(value)
  const negative = value < 0
  if (usesScientific(magnitude)) return (negative ? '-' : '') + sci(magnitude, sig - 1)

  // Rounding happens first, and a count that carries the leading digit over a
  // bound is printed in the notation the rounded value belongs to.
  const rounded = roundToSignificant(magnitude, sig)
  const carried = valueOfRun(rounded)
  if (usesScientific(carried)) return (negative ? '-' : '') + sci(carried, Math.max(0, sig - 1))

  const places = placesForRun(rounded, sig)
  const text = rounded.sign === 0 ? renderFixed(0, places) : plainRun(rounded, places)
  return (negative ? '-' : '') + groupRendered(text)
}

/** The public name for a significant-digit rendering. */
export function precise(value, significant = DEFAULT_SIGNIFICANT) {
  return renderPrecise(value, significant)
}
