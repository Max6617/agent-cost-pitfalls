import { normalizeIsbn } from './normalize.js'

// ISBN-13 check digit, per docs/isbn-rules.md §3: weights alternate 1, 3 across
// the twelve digits, starting with 1 on the leftmost; the result is mod 10.

export function isbn13CheckDigit(twelveDigits) {
  if (typeof twelveDigits !== 'string' || !/^[0-9]{12}$/.test(twelveDigits)) return null
  let sum = 0
  for (let i = 0; i < 11; i++) {
    sum += (i % 2 === 0 ? 1 : 3) * Number(twelveDigits[i])
  }
  return String((10 - (sum % 10)) % 10)
}

export function isValidIsbn13(input) {
  const bare = normalizeIsbn(input)
  if (bare === null || bare.length !== 13) return false
  return isbn13CheckDigit(bare.slice(0, 12)) === bare[12]
}
