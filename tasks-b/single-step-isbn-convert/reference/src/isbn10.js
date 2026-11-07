import { normalizeIsbn } from './normalize.js'

// ISBN-10 check digit, per docs/isbn-rules.md §2: a weighted sum mod 11, with
// the value ten written as the letter X.

export function isbn10CheckDigit(nineDigits) {
  if (typeof nineDigits !== 'string' || !/^[0-9]{9}$/.test(nineDigits)) return null
  let sum = 0
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(nineDigits[i])
  const check = (11 - (sum % 11)) % 11
  return check === 10 ? 'X' : String(check)
}

export function isValidIsbn10(input) {
  const bare = normalizeIsbn(input)
  if (bare === null || bare.length !== 10) return false
  return isbn10CheckDigit(bare.slice(0, 9)) === bare[9].toUpperCase()
}
