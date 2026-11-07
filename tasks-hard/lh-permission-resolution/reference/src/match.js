/**
 * Resource patterns.
 *
 * A resource is a '/'-separated path and a pattern is matched against it
 * segment by segment; the rules are written down in
 * `docs/authorization-rules.md` § 3 and the console validates a pattern against
 * the same table before it lets an operator save one.
 *
 * Matching is a walk over the two segment lists rather than a compiled regular
 * expression: `**` stands for a run of segments including none, which is not
 * something a regex assembled by joining the segments with '/' can say without
 * qualifying the separators around it.
 */
function isRun(segment) {
  return segment === '**'
}

function walk(pattern, pi, resource, ri) {
  if (pi === pattern.length) return ri === resource.length

  if (isRun(pattern[pi])) {
    for (let skip = ri; skip <= resource.length; skip += 1) {
      if (walk(pattern, pi + 1, resource, skip)) return true
    }
    return false
  }

  if (ri >= resource.length) return false
  if (pattern[pi] !== '*' && pattern[pi] !== resource[ri]) return false
  return walk(pattern, pi + 1, resource, ri + 1)
}

/** True when `pattern` covers `resource`. */
export function matches(pattern, resource) {
  if (typeof pattern !== 'string' || pattern.length === 0) return false
  if (typeof resource !== 'string' || resource.length === 0) return false
  return walk(pattern.split('/'), 0, resource.split('/'), 0)
}
