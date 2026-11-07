/**
 * The one error type the codec raises for malformed input.
 *
 * `offset` is the index into the input string exactly as the caller passed it
 * — before any whitespace is skipped — of the character that makes the input
 * undecodable. It is set for character-level problems (a character outside the
 * alphabet, whitespace in strict mode). Structural problems (ragged length,
 * misplaced padding) have no single guilty character, so their offset is null.
 */
export class CodecError extends Error {
  constructor(message, offset = null) {
    super(message)
    this.name = 'CodecError'
    this.offset = offset
  }
}
