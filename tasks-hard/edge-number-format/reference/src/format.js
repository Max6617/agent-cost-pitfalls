/**
 * The general entry point: one value in, one string out.
 *
 * Everything a report prints comes through here, so this is where the option
 * defaults live and where the notation decision is made. The renderers below it
 * each own one shape and know nothing about the other.
 *
 * Two things here are easy to get wrong and are worth stating. The notation
 * follows the digits the rounded value has as well as the value that arrived: a
 * value whose rounding carries its leading digit over a bound is printed in the
 * notation it now belongs to. And a sign is only worth printing when something is
 * left of the value: `-0.004` at two digits is `0.00`, not `-0.00`.
 */
import { DEFAULT_DIGITS } from './rules.js'
import { groupRendered } from './grouping.js'
import { sci, usesScientific } from './notation.js'
import { fixedRun, layOut } from './text.js'
import { placesForRun, plainRun, roundToSignificant } from './precision.js'
import { isSpecial, magnitudeOf, specialLabel, valueOfRun } from './util/guards.js'

/** `options.digits` and `options.significant`, with their defaults settled. */
function resolveShape(options = {}) {
  const significant = options.significant === undefined || options.significant === null
    ? undefined
    : Math.max(1, Math.trunc(options.significant))
  const digits = options.digits === undefined ? DEFAULT_DIGITS : Math.max(0, Math.trunc(options.digits))
  return { significant, digits, grouping: options.grouping !== false }
}

/** The zero a rendering that rounded away to nothing is written as. */
function isZero(text) {
  return text === '0' || /^0(\.0*)?$/.test(text)
}

/** Add the sign a rendering needs and the separators it asks for. */
function finish(value, text, grouping) {
  if (isZero(text)) return text
  const signed = (value < 0 ? '-' : '') + text
  return grouping ? groupRendered(signed) : signed
}

/**
 * The rendering of a value the grid could not keep whole.
 *
 * A value the grid cannot show at all keeps its leading digit and an exponent,
 * and one whose rounding carried it over a bound keeps the exponent it now needs.
 * `rounded` is the value the plain rendering names, or null when there is none.
 */
function beyond(value, text, magnitude, rounded, mantissa, grouping) {
  if (usesScientific(magnitude)) return (value < 0 ? '-' : '') + sci(magnitude, mantissa)
  if (rounded !== null && usesScientific(rounded)) return (value < 0 ? '-' : '') + sci(rounded, mantissa)
  return finish(value, text, grouping)
}

/** A fixed digit count, rounded once and rendered from the digits it kept. */
function formatFixed(value, digits, grouping) {
  const magnitude = magnitudeOf(value)
  const { digits: run, places } = fixedRun(magnitude, digits)
  const { whole, fraction } = layOut(run, places)
  const text = fraction === '' ? whole : whole + '.' + fraction
  return beyond(value, text, magnitude, valueOfRun({ digits: run, power: -places }), digits, grouping)
}

/** `significant` significant digits, rounded once and rendered from the digits. */
function formatSignificant(value, significant, digits, grouping) {
  const magnitude = magnitudeOf(value)
  const mantissa = Math.min(significant - 1, digits)
  if (usesScientific(magnitude)) return (value < 0 ? '-' : '') + sci(magnitude, mantissa)

  const rounded = roundToSignificant(magnitude, significant)
  const text = rounded.sign === 0 ? '0' : plainRun(rounded, placesForRun(rounded, significant, digits))
  const shown = rounded.sign === 0 ? null : valueOfRun(rounded)
  return beyond(value, text, magnitude, shown, mantissa, grouping)
}

/**
 * Render `value`.
 *
 * A non-finite value is a label and gets neither sign nor digits. A finite one
 * picks a notation, renders it, and groups the integer part on the way out —
 * the mantissa of a scientific rendering is never grouped.
 */
export function format(value, options = {}) {
  const { significant, digits, grouping } = resolveShape(options)
  if (isSpecial(value)) return specialLabel(value)
  if (significant !== undefined) return formatSignificant(value, significant, digits, grouping)
  return formatFixed(value, digits, grouping)
}

/**
 * The same rendering as `format`, at the default digit count, with the
 * separators placed in the integer part.
 */
export function group(value, options = {}) {
  return format(value, { digits: DEFAULT_DIGITS, ...options })
}
