/**
 * Deterministic ids.
 *
 * The engine never reaches for a random source: every id is the next value of a
 * per-kind counter, so two runs over the same calls produce the same ids and a
 * failing allocation can be replayed exactly from the log.
 */
export function createSequence(prefix, width = 4) {
  let n = 0
  return {
    next() {
      n += 1
      return prefix + String(n).padStart(width, '0')
    },
    issued() {
      return n
    },
  }
}
