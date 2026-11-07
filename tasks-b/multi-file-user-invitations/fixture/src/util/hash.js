/**
 * Small string hash used anywhere the app needs a stable, non-cryptographic
 * fingerprint. FNV-1a, 32-bit, over the string's code points, rendered as
 * eight lowercase hex characters.
 *
 * The same input must always produce the same output, on every machine and
 * every Node version: tokens derived from it are stored by other services.
 */
export function fnv1aHex(s) {
  let h = 0x811c9dc5
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
