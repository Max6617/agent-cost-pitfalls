/**
 * The encoder.
 *
 * Three bytes make four characters. A trailing one- or two-byte group is a
 * partial quantum: it still produces characters, with '=' filling out the
 * group unless the caller asked for unpadded output.
 */
import { alphabetFor } from './alphabets.js'
import { asBytes, utf8Encode } from './bytes.js'

/**
 * Bytes -> base64 text.
 * options.alphabet: 'standard' (default) or 'url'
 * options.padding:  'required' (default) or 'none'
 */
export function encodeBytes(input, { alphabet = 'standard', padding = 'required' } = {}) {
  const alpha = alphabetFor(alphabet)
  const bytes = asBytes(input)
  const pad = padding === 'none' ? '' : '='

  let out = ''
  let i = 0
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    out += alpha[(n >> 18) & 63] + alpha[(n >> 12) & 63] + alpha[(n >> 6) & 63] + alpha[n & 63]
  }

  const rem = bytes.length - i
  if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8)
    out += alpha[(n >> 18) & 63] + alpha[(n >> 12) & 63] + alpha[(n >> 6) & 63] + pad
  }

  return out
}

/** String -> base64 text, encoding the string as UTF-8 first. */
export function encodeString(text, options) {
  return encodeBytes(utf8Encode(text), options)
}
