import { COUNTRIES } from './data/countries.js'

/**
 * Zone for an ISO country code, matched case-insensitively. Returns null for a
 * destination we do not serve; quoting turns that into a null quote.
 */
export function zoneForCountry(code) {
  const entry = COUNTRIES[String(code).toUpperCase()]
  return entry ? entry.zone : null
}

export function countryName(code) {
  const entry = COUNTRIES[String(code).toUpperCase()]
  return entry ? entry.name : null
}

export function servedCountries() {
  return Object.keys(COUNTRIES)
}
