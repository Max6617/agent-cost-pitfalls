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
 * The residue mod 97 of a string of decimal digits. The numeric form of a
 * real IBAN is 18-30 digits — beyond what a double holds exactly — so the
 * residue is accumulated incrementally: reduce at every step and the running
 * value never exceeds three digits.
 */
export function mod97(digits) {
  let n = 0
  for (let i = 0; i < digits.length; i++) n = (n * 10 + (digits.charCodeAt(i) - 48)) % 97
  return n
}

/** True when an electronic IBAN's check digits satisfy the mod-97 rule. */
export function verifyChecksum(electronic) {
  return mod97(numericForm(electronic)) === 1
}
