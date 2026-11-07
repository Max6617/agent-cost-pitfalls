/**
 * Character-level input checking, shared by both decode modes.
 *
 * The scan walks the input exactly as the caller passed it, so that the
 * offset in a CodecError always names a position in that original string —
 * never a position in some cleaned-up copy the caller never saw.
 */
import { CodecError } from './errors.js'

// The only characters that count as whitespace here: the four JSON recognises.
const WHITESPACE = new Set([' ', '\t', '\r', '\n'])

/**
 * Checks every character of `input` against the decode table and returns the
 * input with any skippable whitespace removed.
 *
 * strict:  whitespace is an invalid character like any other
 * lenient: whitespace is skipped over before anything else happens
 *
 * '=' is allowed through here; where it may legally sit is a structural
 * question, answered by checkPadding().
 */
export function scan(input, { table, mode }) {
  let clean = ''
  for (let k = 0; k < input.length; k++) {
    const ch = input[k]
    if (WHITESPACE.has(ch)) {
      if (mode === 'lenient') continue
      throw new CodecError(`invalid character ${JSON.stringify(ch)} at offset ${k}`, k)
    }
    if (ch === '=') {
      clean += ch
      continue
    }
    const code = ch.charCodeAt(0)
    if (code > 127 || table[code] === -1) {
      throw new CodecError(`invalid character ${JSON.stringify(ch)} at offset ${k}`, k)
    }
    clean += ch
  }
  return clean
}
