import { normalizeIsbn } from './normalize.js'
import { registrantLength } from './ranges.js'

// Hyphenation, per docs/hyphenation.md. Positional only: the check digit is
// copied through untouched, never re-verified here.

const GROUPS = new Set(['0', '1'])

export function hyphenateIsbn13(input) {
  const bare = normalizeIsbn(input)
  if (bare === null || bare.length !== 13) return null
  if (!bare.startsWith('978')) return null
  const group = bare[3]
  if (!GROUPS.has(group)) return null

  const middle = bare.slice(4, 12)
  const check = bare[12]
  const len = registrantLength(middle)
  if (len === null) return null

  return ['978', group, middle.slice(0, len), middle.slice(len), check].join('-')
}
