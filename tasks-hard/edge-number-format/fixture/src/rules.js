/**
 * The house rules, as constants.
 *
 * They are constants rather than options because every report in the estate has
 * to agree: a CSV export that groups differently from the on-screen table is a
 * support ticket, and the reporting container has no locale data to fall back
 * on anyway. See docs/number-format.md.
 */

/** Separator used between groups of three digits in the integer part. */
export const GROUP_SEPARATOR = ','

/** Digits per group, counted from the right. */
export const GROUP_SIZE = 3

/** An integer part shorter than this is never grouped. */
export const GROUP_MIN_DIGITS = 4

/** The fraction separator. Never anything else. */
export const DECIMAL_SEPARATOR = '.'

/** `digits` default: fraction digits on a rendered value. */
export const DEFAULT_DIGITS = 2

/** `sig` default for precise(). */
export const DEFAULT_SIGNIFICANT = 6

/**
 * Notation bounds, in decimal exponent terms: a value written m * 10^k with
 * 1 <= m < 10 is plain while MIN_EXPONENT <= k <= MAX_EXPONENT and scientific
 * outside that.
 */
export const MIN_EXPONENT = -3
export const MAX_EXPONENT = 20

/** Renderings for the non-finite values. They are labels, not numbers. */
export const SPECIAL_VALUES = {
  NaN: 'NaN',
  Infinity: 'Infinity',
  '-Infinity': '-Infinity',
}
