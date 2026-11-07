/**
 * Choosing between the routes that could serve one request.
 *
 * A pattern that spells more of the path out in literal text pins the request
 * down harder than one that leaves the segments to parameters, so the route
 * with the most literal segments wins.
 */

/** How specific a parsed pattern is. */
export function specificityOf(pattern) {
  let score = 0
  for (const element of pattern.segments) {
    if (element.kind === 'literal') score += 1
  }
  return score
}

/** Compare two parsed patterns: positive when `a` is the more specific. */
export function compareSpecificity(a, b) {
  return specificityOf(a) - specificityOf(b)
}

/**
 * The winning candidate from every route that matched.
 *
 * `candidates` are `{ route, parsed, match }` entries in the order the routes
 * were declared; `null` when nothing matched.
 */
export function pickBest(candidates) {
  let best = null
  for (const candidate of candidates) {
    if (best === null || compareSpecificity(candidate.parsed, best.parsed) >= 0) best = candidate
  }
  return best
}
