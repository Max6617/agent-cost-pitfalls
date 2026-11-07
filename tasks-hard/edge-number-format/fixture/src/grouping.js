/**
 * Grouping: the thousands separators in the integer part.
 *
 * The separator only ever appears in the integer part, in threes counted from
 * the right, and a run of digits shorter than one full group is left alone.
 */
import { GROUP_SEPARATOR, GROUP_SIZE, GROUP_MIN_DIGITS } from './rules.js'

/**
 * Insert the separator into a run of digits, counted from the right.
 *
 * The separators are placed by walking the digits backwards so that the group
 * boundaries never depend on how long the run happens to be.
 */
export function groupDigits(digits) {
  let out = ''
  let counted = 0
  for (let i = digits.length - 1; i >= 0; i--) {
    out = digits[i] + out
    counted++
    if (counted === GROUP_SIZE && i > 0) {
      out = GROUP_SEPARATOR + out
      counted = 0
    }
  }
  return out
}

/** Split a rendered value into its sign, integer part and fraction part. */
export function splitRendered(text) {
  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text
  const dot = body.indexOf('.')
  if (dot === -1) return { negative, whole: body, fraction: '' }
  return { negative, whole: body.slice(0, dot), fraction: body.slice(dot + 1) }
}

/**
 * Group the integer part of an already-rendered value.
 *
 * Short runs are left alone: grouping `12` into `12` is the point, and a
 * separator in front of a two-digit number is how the old export used to look.
 * The fraction came out of the renderer already, so it is put back as it was.
 */
export function groupRendered(text) {
  const { negative, whole, fraction } = splitRendered(text)
  const grouped = whole.length > GROUP_MIN_DIGITS ? groupDigits(whole) : whole
  const rest = groupDigits(fraction)
  const sign = negative ? '-' : ''
  return fraction ? sign + grouped + '.' + rest : sign + grouped
}
