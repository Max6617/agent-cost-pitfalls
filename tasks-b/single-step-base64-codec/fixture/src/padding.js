/**
 * Structural checks: padding placement and input length.
 *
 * These run after the character scan, on the cleaned input. A failure here is
 * about the shape of the input as a whole, not about any one character, so
 * the errors carry no offset.
 */
import { CodecError } from './errors.js'

/**
 * Validates '=' placement and overall length for the given mode.
 *
 * '=' is legal only as the final one or two characters, and any input that
 * contains it must be a whole number of four-character quanta. After that:
 *
 * strict:  the length must be a whole number of quanta — a partial final
 *          quantum means the padding is missing
 * lenient: two or three trailing characters decode as a partial quantum,
 *          but a single trailing character is never decodable
 */
export function checkPadding(clean, mode) {
  const firstPad = clean.indexOf('=')
  if (firstPad !== -1) {
    if (firstPad < clean.length - 2 || !/^=*$/.test(clean.slice(firstPad))) {
      throw new CodecError("'=' is only legal as the final one or two characters", null)
    }
    if (clean.length % 4 !== 0) {
      throw new CodecError('padded input must be a whole number of quanta', null)
    }
  }
  checkWhole(clean, mode)
}

function checkWhole(clean, mode) {
  const rem = clean.length % 4
  if (rem === 0) return
  if (mode === 'lenient') {
    if (rem === 1) {
      throw new CodecError('a single trailing character is not a quantum', null)
    }
    return
  }
  if (rem > 1) {
    throw new CodecError('length is not a whole number of quanta', null)
  }
}
