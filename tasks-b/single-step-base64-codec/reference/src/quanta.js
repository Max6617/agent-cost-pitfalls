/**
 * Turning cleaned, validated text back into bytes.
 *
 * The input arrives here guaranteed to be well-formed: legal characters only,
 * '=' only where padding may sit, and a length the mode allows. Whole
 * four-character quanta are decoded in the main loop; a trailing two or three
 * characters (only reachable when the input carried no padding) are finished
 * off by decodeTail().
 */

/** Cleaned base64 text -> its bytes. */
export function decodeQuanta(clean, table) {
  const out = []
  let i = 0

  for (; i + 4 <= clean.length; i += 4) {
    const a = table[clean.charCodeAt(i)]
    const b = table[clean.charCodeAt(i + 1)]
    out.push((a << 2) | (b >> 4))
    if (clean[i + 2] !== '=') {
      const c = table[clean.charCodeAt(i + 2)]
      out.push(((b & 0x0f) << 4) | (c >> 2))
      if (clean[i + 3] !== '=') {
        const d = table[clean.charCodeAt(i + 3)]
        out.push(((c & 0x03) << 6) | d)
      }
    }
  }

  const tail = clean.slice(i)
  if (tail.length > 0) decodeTail(tail, table, out)
  return Uint8Array.from(out)
}

/**
 * Two leftover characters carry one whole byte, three carry two. The bits
 * straddle the character boundary, so each sextet folds its high end into the
 * byte that is still open. A single leftover character is rejected before
 * this runs, in every mode.
 */
function decodeTail(tail, table, out) {
  const v0 = table[tail.charCodeAt(0)]
  if (tail.length === 2) {
    const v1 = table[tail.charCodeAt(1)]
    out.push((v0 << 2) | (v1 >> 4))
  } else if (tail.length === 3) {
    const v1 = table[tail.charCodeAt(1)]
    const v2 = table[tail.charCodeAt(2)]
    out.push((v0 << 2) | (v1 >> 4))
    out.push(((v1 & 0x0f) << 4) | (v2 >> 2))
  }
}
