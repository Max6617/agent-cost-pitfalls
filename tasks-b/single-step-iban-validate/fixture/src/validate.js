import { specFor } from './countries.js'
import { numericForm, mod97 } from './checksum.js'

/**
 * Full validation. Input may be electronic or printable, upper- or lowercase;
 * whitespace is insignificant. The failure reasons and the order they are
 * applied in are specified in docs/iban-rules.md.
 *
 * Returns { ok: true, iban, country } with the canonical electronic form, or
 * { ok: false, reason }.
 */
export function validate(input) {
  const electronic = String(input).replace(/\s+/g, '')
  if (!/^[A-Za-z0-9]*$/.test(electronic)) return { ok: false, reason: 'bad-character' }
  const country = electronic.slice(0, 2).toUpperCase()
  if (!/^[A-Z]{2}$/.test(country)) return { ok: false, reason: 'unknown-country' }
  const spec = specFor(country)
  if (spec === null) return { ok: false, reason: 'unknown-country' }
  if (electronic.length !== spec.length) return { ok: false, reason: 'bad-length' }
  if (mod97(numericForm(electronic)) !== 1) return { ok: false, reason: 'bad-checksum' }
  return { ok: true, iban: electronic, country }
}

/** The boolean projection of validate(). */
export function isValid(input) {
  return validate(input).ok
}
