/**
 * The reader for numbers that arrive as text: a config value, a pasted report
 * cell, a field from an export somebody edited by hand.
 *
 * The hard part is not the digits, it is deciding which of the characters are
 * digits at all. A separator that appears in the wrong place is a typo that has
 * to be reported, not quietly removed: `1,2,3` is not twelve hundred and
 * thirty, and a reader that turns it into one is how a wrong number reaches a
 * customer. So the separators are checked where they stand and taken out
 * afterwards, never the other way round.
 *
 * A parsed zero is zero: `-0.00` reads back as `0`, because the toolkit only
 * ever prints a signed zero away and the sign carries no information.
 */
const PLAIN_DECIMAL = /^\d+(\.\d+)?$/
const GROUPED_INTEGER = /^\d{1,3}(,\d{3})+$/
const PLAIN_INTEGER = /^\d+$/
const SCIENTIFIC = /^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/

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
  if (SCIENTIFIC.test(cleaned)) return Number(cleaned)

  const negative = cleaned.startsWith('-')
  const body = negative ? cleaned.slice(1) : cleaned
  if (body === '') throw invalid(text)

  const dot = body.indexOf('.')
  const whole = dot === -1 ? body : body.slice(0, dot)
  const fraction = dot === -1 ? '' : body.slice(dot + 1)
  if (fraction.includes('.')) throw invalid(text)
  if (fraction.includes(',')) throw invalid(text)

  const grouped = whole.includes(',')
  if (grouped && !GROUPED_INTEGER.test(whole)) throw invalid(text)
  if (!grouped && !PLAIN_INTEGER.test(whole)) throw invalid(text)
  if (fraction !== '' && !PLAIN_DECIMAL.test('1.' + fraction)) throw invalid(text)

  const digits = whole.split(',').join('')
  const value = Number((negative ? '-' : '') + digits + (fraction === '' ? '' : '.' + fraction))
  if (Number.isNaN(value)) throw invalid(text)
  if (value === 0) return 0
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
