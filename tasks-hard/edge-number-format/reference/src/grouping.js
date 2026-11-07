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
 * The door is the length of the integer part, not the number of groups it would
 * make: four digits is one group plus one, and that is where a separator first
 * belongs. A shorter run is left exactly as it came in. The fraction is not part
 * of the integer part and goes back the way it arrived.
 */
export function groupRendered(text) {
  const { negative, whole, fraction } = splitRendered(text)
  const grouped = whole.length >= GROUP_MIN_DIGITS ? groupDigits(whole) : whole
  const sign = negative ? '-' : ''
  return fraction ? sign + grouped + '.' + fraction : sign + grouped
}
