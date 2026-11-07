/**
 * Coercion.
 *
 * Everything a browser form sends us arrives as a string. Rather than sprinkle
 * Number() and === 'on' checks over the handlers, each declared type has one
 * coercion function and the validator asks for it by name.
 *
 * A coercion function returns either the converted value or `undefined` when
 * the input cannot be read as that type. `undefined` means "unusable", which is
 * different from a legitimate false / 0 / empty string — those come back as
 * themselves.
 */

/** Values a checkbox or a JSON payload may use for true. */
const TRUE_WORDS = new Set(['true', 'yes', 'on', '1'])
const FALSE_WORDS = new Set(['false', 'no', 'off', '0'])

/** Everything the pricing spreadsheet and the payment provider like to add. */
const MONEY_NOISE = /[^0-9,.\-]/g

/** Parse the money syntax the pricing spreadsheet exports. */
export function parseMoney(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : undefined
  if (text == null) return undefined
  let s = String(text).trim()
  if (!s) return undefined

  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  s = s.replace(MONEY_NOISE, '').replace(/,/g, '')
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  }
  if (!/^\d*\.?\d+$/.test(s)) return undefined

  const n = Number(s)
  if (!Number.isFinite(n)) return undefined
  return negative ? -n : n
}

/** Split a list that arrived as a comma-separated string, a JSON array, or an array. */
export function parseList(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed : undefined
      } catch {
        return undefined
      }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return undefined
}

/** Type-name -> coercion function. */
export const COERCERS = {
  string(value) {
    if (value == null) return undefined
    return String(value)
  },

  number(value) {
    return parseMoney(value)
  },

  integer(value) {
    const n = parseMoney(value)
    return n === undefined || !Number.isInteger(n) ? undefined : n
  },

  boolean(value) {
    if (typeof value === 'boolean') return value
    if (value == null) return undefined
    const word = String(value).trim().toLowerCase()
    if (TRUE_WORDS.has(word)) return true
    if (FALSE_WORDS.has(word)) return false
    return undefined
  },

  array(value) {
    return parseList(value)
  },

  object(value) {
    if (value == null) return undefined
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined
      } catch {
        return undefined
      }
    }
    if (typeof value === 'object' && !Array.isArray(value)) return value
    return undefined
  },
}

/**
 * Coerce `value` for a field, or return undefined if it cannot be read.
 *
 * @param {string} type
 * @param {unknown} value
 */
export function coerce(type, value) {
  const fn = COERCERS[type]
  if (!fn) throw new Error('no coercer for type ' + type)
  return fn(value)
}
