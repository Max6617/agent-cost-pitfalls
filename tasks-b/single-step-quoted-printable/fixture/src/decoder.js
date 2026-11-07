/**
 * The decoder: quoted-printable text -> string.
 *
 * Lenient on purpose, per the docs: senders vary, and a message that is
 * slightly off-spec is still delivered. Anything that is neither an escape
 * nor a soft break is passed through unchanged.
 */
import { fromBytes } from './bytes.js'
import { hexValue } from './charset.js'

export function decode(text) {
  const out = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '=') {
      const a = text[i + 1]
      const b = text[i + 2]
      if (a === '\n') { i += 2; continue }
      if (a === '\r' && b === '\n') { i += 3; continue }
      const value = a !== undefined && b !== undefined ? hexValue(a, b) : -1
      if (value >= 0) {
        out.push(value)
        i += 3
        continue
      }
      out.push(61) // a stray '=' stands for itself
      i += 1
      continue
    }
    if (ch === '\r' && text[i + 1] === '\n') {
      out.push(10)
      i += 2
      continue
    }
    if (ch === '\n') {
      out.push(10)
      i += 1
      continue
    }
    out.push(ch.charCodeAt(0))
    i += 1
  }
  return fromBytes(Uint8Array.from(out))
}
