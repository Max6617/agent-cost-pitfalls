/**
 * Hex notation: #rgb, #rgba, #rrggbb, #rrggbbaa.
 *
 * Short forms expand by duplicating each nibble, so #4fa is the same colour as
 * #44ffaa. Digits are case-insensitive. Anything the wrong length, or with a
 * digit that is not hex, is not a colour.
 */
import { alpha } from './channels.js'

const HEX_DIGIT = /^[0-9a-fA-F]$/

function nibble(ch) {
  return parseInt(ch, 16)
}

/** A channel read from a single digit, expanded to a full byte: 'f' -> 0xff. */
function expand(ch) {
  const n = nibble(ch)
  return n * 16 + n
}

export function parseHex(text) {
  if (typeof text !== 'string' || !text.startsWith('#')) return null
  const digits = text.slice(1)
  if (digits.length !== 3 && digits.length !== 4 && digits.length !== 6 && digits.length !== 8) return null
  for (const ch of digits) {
    if (!HEX_DIGIT.test(ch)) return null
  }

  if (digits.length <= 4) {
    const [r, g, b, a] = digits
    return {
      r: expand(r),
      g: expand(g),
      b: expand(b),
      a: a === undefined ? 1 : alpha(expand(a) / 255),
    }
  }

  const bytes = digits.match(/../g).map((pair) => parseInt(pair, 16))
  return {
    r: bytes[0],
    g: bytes[1],
    b: bytes[2],
    a: bytes.length === 4 ? alpha(bytes[3] / 255) : 1,
  }
}
