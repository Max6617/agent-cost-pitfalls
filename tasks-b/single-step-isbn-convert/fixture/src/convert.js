import { normalizeIsbn } from './normalize.js'
import { isbn10CheckDigit } from './isbn10.js'
import { isbn13CheckDigit } from './isbn13.js'

// Conversion between the two ISBN forms, per docs/isbn-rules.md §4 and §5.
// Both directions trust the input's own check digit rather than re-verifying it.

export function toIsbn13(input) {
  const bare = normalizeIsbn(input)
  if (bare === null || bare.length !== 10) return null
  return '978' + bare.slice(0, 9) + bare[9]
}

export function toIsbn10(input) {
  const bare = normalizeIsbn(input)
  if (bare === null || bare.length !== 13) return null
  if (!bare.startsWith('97')) return null
  return bare.slice(3, 12) + isbn10CheckDigit(bare.slice(3, 12))
}
