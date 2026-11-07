/**
 * HTML escaping for interpolated values.
 *
 * The notification service renders into email bodies, so every value that comes
 * from a customer record has to be escaped before it reaches the markup. The
 * entity table below is the agreed table; see docs/template-rules.md §3.
 */
const ENTITIES = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
  ['`', '&#96;'],
  ['/', '&#x2F;'],
])

const SPECIALS = /[&<>"'`/]/g

/**
 * Escapes one value. Non-strings are stringified first, so a number or a
 * boolean can be interpolated directly. `null` and `undefined` have no string
 * form and escape to the empty string.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(SPECIALS, (char) => ENTITIES.get(char))
}

/** True when the value would change under escaping - used by the preview tool. */
export function needsEscaping(value) {
  if (typeof value !== 'string') return false
  SPECIALS.lastIndex = 0
  return SPECIALS.test(value)
}
