/**
 * Strict-mode validation.
 *
 * Lenient mode does not come through here: legacy inscriptions are walked as
 * written (see parse.js and docs/legacy-sources.md).
 */
import { VALUES } from './symbols.js'

/** Symbols that may stand to the left of a larger symbol and subtract. */
const SUBTRACTORS = new Set(['I', 'X', 'C'])

export function validateNumeral(input) {
  for (let i = 0; i + 1 < input.length; i++) {
    const a = input[i]
    const b = input[i + 1]
    if (VALUES[a] < VALUES[b] && !SUBTRACTORS.has(a)) {
      throw new SyntaxError('invalid subtractive pair: ' + a + b)
    }
  }
  let run = 1
  for (let i = 1; i < input.length; i++) {
    run = input[i] === input[i - 1] ? run + 1 : 1
    if (run > 4) {
      throw new SyntaxError('symbol repeated too many times: ' + input[i])
    }
  }
}
