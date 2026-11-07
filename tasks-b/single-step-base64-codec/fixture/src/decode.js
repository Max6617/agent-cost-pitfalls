/**
 * The decoder driver.
 *
 * Decoding is three passes over the input, each with its own job:
 *   scan()         every character is legal, whitespace handled per mode
 *   checkPadding() '=' placement and overall length
 *   decodeQuanta() the actual bit work
 */
import { tableFor } from './alphabets.js'
import { utf8Decode } from './bytes.js'
import { scan } from './validate.js'
import { checkPadding } from './padding.js'
import { decodeQuanta } from './quanta.js'

/**
 * Base64 text -> bytes.
 * options.alphabet: 'standard' (default) or 'url'
 * options.mode:     'strict' (default) or 'lenient'
 */
export function decodeToBytes(input, { alphabet = 'standard', mode = 'strict' } = {}) {
  if (typeof input !== 'string') throw new TypeError('input must be a string')
  if (alphabet !== 'standard' && alphabet !== 'url') {
    throw new TypeError(`unknown alphabet ${JSON.stringify(alphabet)}`)
  }
  if (mode !== 'strict' && mode !== 'lenient') {
    throw new TypeError(`unknown mode ${JSON.stringify(mode)}`)
  }
  const table = tableFor(alphabet)
  const clean = scan(input, { table, mode })
  checkPadding(clean, mode)
  return decodeQuanta(clean, table)
}

/** Base64 text -> a string, decoding the bytes as UTF-8. */
export function decodeToString(input, options) {
  return utf8Decode(decodeToBytes(input, options))
}
