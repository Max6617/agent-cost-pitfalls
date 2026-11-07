/**
 * Choosing between the routes that could serve one request.
 *
 * Every candidate matched the whole path, so every candidate consumed the same
 * segments, in the same order. What separates them is *what* consumed each
 * segment: a literal pins the request down harder than a parameter, which pins
 * it down harder than a wildcard, which pins it down harder than a catch-all.
 * The comparison runs from the left, and the first position where the two
 * candidates disagree decides — a literal on the right never outvotes a
 * parameter on the left.
 */

/** The ranks of the elements that consumed each path segment, in order. */
export function specificityOf(match) {
  return match && Array.isArray(match.vector) ? match.vector : []
}

/** Compare two matches: positive when `a` is the more specific. */
export function compareSpecificity(a, b) {
  const left = specificityOf(a)
  const right = specificityOf(b)
  const length = Math.max(left.length, right.length)

  for (let i = 0; i < length; i += 1) {
    const x = i < left.length ? left[i] : -1
    const y = i < right.length ? right[i] : -1
    if (x !== y) return x - y
  }
  return 0
}

/**
 * The winning candidate from every route that matched.
 *
 * `candidates` are `{ route, parsed, match }` entries in the order the routes
 * were declared; the first candidate of the highest specificity wins, so an
 * exact tie is decided by declaration order. Returns `null` when nothing
 * matched.
 */
export function pickBest(candidates) {
  let best = null
  for (const candidate of candidates) {
    if (best === null || compareSpecificity(candidate.match, best.match) > 0) best = candidate
  }
  return best
}
