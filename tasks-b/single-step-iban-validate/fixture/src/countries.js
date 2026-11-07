/**
 * The countries this library covers, with the total IBAN length for each:
 * two letters of country code, two check digits, then the BBAN. The table is
 * the single source of truth; the lengths chapter of docs/iban-rules.md is
 * written against it.
 */
export const IBAN_SPECS = Object.freeze({
  BE: { length: 16 },
  CH: { length: 21 },
  DE: { length: 22 },
  ES: { length: 24 },
  FR: { length: 27 },
  GB: { length: 21 },
  IT: { length: 27 },
  NL: { length: 18 },
})

/** The spec for a two-letter country code, or null when we do not cover it. */
export function specFor(country) {
  return IBAN_SPECS[country] ?? null
}

/**
 * True when an electronic-form IBAN (no whitespace, uppercase) has exactly the
 * length its country requires. Unknown countries have no expected length.
 */
export function hasExpectedLength(electronic) {
  const spec = specFor(electronic.slice(0, 2))
  return spec !== null && electronic.length === spec.length
}
