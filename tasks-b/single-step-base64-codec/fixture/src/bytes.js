/**
 * Byte plumbing shared by the encoder and the decoder.
 *
 * Strings cross the public surface as UTF-8; everything else is a Uint8Array.
 * Nothing in here knows anything about base64.
 */
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8')

/** String -> its UTF-8 bytes. */
export function utf8Encode(text) {
  return encoder.encode(text)
}

/** Bytes -> a string, decoding them as UTF-8. */
export function utf8Decode(bytes) {
  return decoder.decode(bytes)
}

/**
 * Accepts a Uint8Array or a plain array of byte values and always returns a
 * Uint8Array, so the encoder has exactly one shape to deal with.
 */
export function asBytes(input) {
  if (input instanceof Uint8Array) return input
  if (Array.isArray(input)) return Uint8Array.from(input)
  throw new TypeError('bytes must be a Uint8Array or an array of byte values')
}

/** Join byte arrays, in order, into one. */
export function concatBytes(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** Lowercase hex, one byte per two characters; handy in log lines. */
export function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}
