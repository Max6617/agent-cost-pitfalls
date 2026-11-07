// The simplified registrant table for group identifiers 0 and 1, transcribed
// from docs/hyphenation.md. A registrant element is `len` digits long when the
// digits following the group element begin with a value in [lo, hi] inclusive.

export const REGISTRANT_BANDS = [
  { len: 2, lo: 0, hi: 19 },
  { len: 3, lo: 200, hi: 699 },
  { len: 4, lo: 7000, hi: 8499 },
  { len: 5, lo: 85000, hi: 89999 },
  { len: 6, lo: 900000, hi: 949999 },
  { len: 7, lo: 9500000, hi: 9999999 },
]

export function registrantLength(digits) {
  for (const band of REGISTRANT_BANDS) {
    const n = Number(digits.slice(0, band.len))
    if (n >= band.lo && n <= band.hi) return band.len
  }
  return null
}
