import { specFor } from './countries.js'
import { numericForm, mod97 } from './checksum.js'
import { toElectronic } from './format.js'

/**
 * Generate an electronic IBAN from a country code and a BBAN.
 *
 * Returns null when the country is not covered, or when the BBAN (after
 * normalisation) contains characters outside A-Z0-9 or is not exactly
 * length-4 characters long for that country.
 */
export function buildIban(country, bban) {
  const cc = String(country).toUpperCase()
  const spec = specFor(cc)
  if (spec === null) return null
  const body = toElectronic(bban)
  if (!/^[A-Z0-9]+$/.test(body) || body.length !== spec.length - 4) return null
  const draft = cc + '00' + body
  const check = 98 - mod97(numericForm(draft))
  return cc + check + body
}
