/**
 * The seven numeral symbols and their values.
 *
 * Everything else in the library is derived from this table: the parser walks
 * a string against it, the formatter consumes values descending, and the
 * validators read the legality rules off it.
 */
export const VALUES = Object.freeze({
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
})

/** Symbols that may appear in a run: I, X, C and M. V, L and D never repeat. */
export const REPEATABLE = new Set(['I', 'X', 'C', 'M'])

/** The only legal subtractive pairs, per docs/numeral-rules.md section 2. */
export const LEGAL_PAIRS = new Set(['IV', 'IX', 'XL', 'XC', 'CD', 'CM'])

/** A numeral is uppercase symbols only - no spaces, no lowercase, no digits. */
export const NUMERAL_RE = /^[IVXLCDM]+$/
