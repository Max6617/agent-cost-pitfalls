/**
 * hash - the deterministic digest everything else is built on.
 *
 * Tokens in this service are derived, not generated: the same inputs always
 * produce the same token, so replaying the same sequence of calls reproduces
 * the exact token stream a client saw. There is no random source anywhere in
 * the service, which is what makes the security drills repeatable.
 */
export function fnv1a(input) {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A 16-hex-digit digest of the given parts, stable across runs and platforms. */
export function digest(...parts) {
  const text = parts.join('')
  const forward = fnv1a(text).toString(16).padStart(8, '0')
  const backward = fnv1a([...text].reverse().join('')).toString(16).padStart(8, '0')
  return forward + backward
}
