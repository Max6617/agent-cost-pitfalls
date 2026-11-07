/**
 * The reader for numbers that arrive as text: a config value, a pasted report
 * cell, a field from an export somebody edited by hand.
 *
 * Separators are presentation, so the first thing this does is take them out
 * again; what is left has to look like a number. The value is then handed to
 * `Number`, which is also where the exponent form is understood.
 */
const NUMBER_ISH = /^[+-]?(\d+(\.\d*)?|\.\d+)$/
const EXPONENT_ISH = /^[+-]?(\d+(\.\d*)?|\.\d+)[eE][+-]?\d+$/

function invalid(text) {
  return new RangeError('not a house-formatted number: ' + JSON.stringify(String(text)))
}

/** Whitespace is noise; a leading `+` is not part of the value. */
function tidy(text) {
  const trimmed = String(text).trim()
  return trimmed.startsWith('+') ? trimmed.slice(1) : trimmed
}

/**
 * Parse a number the toolkit would have printed.
 *
 * Throws a RangeError carrying the offending text when the input is not one.
 */
export function parseNumber(text) {
  const cleaned = tidy(text)
  if (cleaned === '') throw invalid(text)
  const bare = cleaned.replace(/,/g, '')
  if (!NUMBER_ISH.test(bare) && !EXPONENT_ISH.test(bare)) throw invalid(text)
  const value = Number(bare)
  if (Number.isNaN(value)) throw invalid(text)
  return value
}

/** `parseNumber` with `undefined` instead of the throw. */
export function tryParseNumber(text) {
  try {
    return parseNumber(text)
  } catch {
    return undefined
  }
}
