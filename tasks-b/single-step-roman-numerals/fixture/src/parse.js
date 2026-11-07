import { VALUES } from './symbols.js'
import { assertInRange } from './range.js'
import { validateNumeral } from './validate.js'

/**
 * Parse a numeral string to its value.
 *
 * `mode: 'strict'` accepts only canonical numerals; `mode: 'lenient'` also
 * accepts the legacy additive forms described in docs/legacy-sources.md.
 */
export function parse(input, { mode = 'lenient' } = {}) {
  if (mode === 'strict') {
    validateNumeral(input)
  }
  let total = 0
  for (let i = 0; i < input.length; i++) {
    const value = VALUES[input[i]]
    const next = VALUES[input[i + 1]]
    total += next > value ? -value : value
  }
  assertInRange(total)
  return total
}
