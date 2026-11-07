/**
 * Numeral validation for both parsing modes.
 *
 * Strict mode accepts only the canonical form. Lenient mode additionally
 * tolerates additive over-runs of the repeatable symbols (see
 * docs/legacy-sources.md) and nothing else: the pair rule, the V/L/D rule,
 * the character set and the range all still apply.
 */
import { VALUES, REPEATABLE, LEGAL_PAIRS, NUMERAL_RE } from './symbols.js'

function checkShape(input) {
  if (typeof input !== 'string' || input.length === 0 || !NUMERAL_RE.test(input)) {
    throw new SyntaxError('invalid numeral')
  }
}

function checkPairs(input) {
  for (let i = 0; i + 1 < input.length; i++) {
    if (VALUES[input[i]] < VALUES[input[i + 1]] && !LEGAL_PAIRS.has(input[i] + input[i + 1])) {
      throw new SyntaxError('illegal subtractive pair: ' + input[i] + input[i + 1])
    }
  }
}

function checkRepeats(input, maxRepeat) {
  let run = 1
  for (let i = 1; i < input.length; i++) {
    run = input[i] === input[i - 1] ? run + 1 : 1
    const limit = REPEATABLE.has(input[i]) ? maxRepeat : 1
    if (run > limit) {
      throw new SyntaxError('symbol repeated too many times: ' + input[i])
    }
  }
}

/** Strict mode: the canonical form only. */
export function validateStrict(input) {
  checkShape(input)
  checkPairs(input)
  checkRepeats(input, 3)
}

/** Lenient mode: legacy additive over-runs are fine; everything else stands. */
export function validateLenient(input) {
  checkShape(input)
  checkPairs(input)
  checkRepeats(input, Number.MAX_SAFE_INTEGER)
}
