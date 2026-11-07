import { VALUES } from './symbols.js'
import { assertInRange } from './range.js'
import { validateStrict, validateLenient } from './validate.js'

/**
 * Parse a numeral string to its value.
 *
 * The default mode is strict: only canonical numerals are accepted.
 * `mode: 'lenient'` additionally accepts the legacy additive forms described
 * in docs/legacy-sources.md. Any other mode is rejected.
 */
export function parse(input, { mode = 'strict' } = {}) {
  if (mode !== 'strict' && mode !== 'lenient') {
    throw new TypeError('unknown parse mode: ' + String(mode))
  }
  if (mode === 'strict') {
    validateStrict(input)
  } else {
    validateLenient(input)
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
