/**
 * The mod-97 machinery. Everything in this module operates on the electronic
 * form: no whitespace, uppercase letters. Callers that accept messier input
 * normalise before they call in here.
 */

/**
 * The numeric form of an electronic IBAN: move the four leading characters
 * (country code and check digits) to the end, then expand each letter to two
 * digits, A = 10 .. Z = 35. Digits pass through unchanged.
 */
export function numericForm(electronic) {
  const rearranged = electronic.slice(4) + electronic.slice(0, 4)
  let out = ''
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0)
    out += code >= 65 && code <= 90 ? String(code - 55) : ch
  }
  return out
}

/**
 * The residue mod 97 of a string of decimal digits. A 30-digit number does not
 * fit in a double, so the value is accumulated one digit at a time and the
 * residue is taken at the end.
 */
export function mod97(digits) {
  let n = 0
  for (let i = 0; i < digits.length; i++) n = n * 10 + (digits.charCodeAt(i) - 48)
  return n % 97
}

/** True when an electronic IBAN's check digits satisfy the mod-97 rule. */
export function verifyChecksum(electronic) {
  return mod97(numericForm(electronic)) === 1
}
