/**
 * UTF-8 in, UTF-8 out. The codec proper (encoder/decoder) speaks bytes only;
 * text becomes bytes here on the way in and becomes text again on the way out.
 */
const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** The UTF-8 bytes of a string. */
export function toBytes(text) {
  return encoder.encode(text)
}

/** The string whose UTF-8 bytes these are. */
export function fromBytes(bytes) {
  return decoder.decode(bytes)
}
