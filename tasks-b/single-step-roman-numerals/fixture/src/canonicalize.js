import { parse } from './parse.js'
import { format } from './format.js'

/**
 * Normalise any accepted numeral to its canonical form. This is the only
 * correct way to re-import a legacy inscription: parse it leniently, then
 * format the value. Whatever the parse rejects, canonicalize rejects.
 */
export function canonicalize(input) {
  return format(parse(input, { mode: 'lenient' }))
}
