/**
 * Resource patterns.
 *
 * A resource is a '/'-separated path and a pattern is matched against it
 * segment by segment; the rules are written down in
 * `docs/authorization-rules.md` and the console validates a pattern against the
 * same table before it lets an operator save one.
 *
 * Compiled patterns are kept: an operator's ruleset is small and the hot path
 * asks the same handful of patterns over and over.
 */
const compiled = new Map()

const LITERAL = /[.*+?^${}()|[\]\\]/g

function compile(pattern) {
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment === '*') return '[^/]+'
      if (segment === '**') return '[^/]+'
      return segment.replace(LITERAL, '\\$&')
    })
    .join('/')
  return new RegExp('^' + source)
}

/** True when `pattern` covers `resource`. */
export function matches(pattern, resource) {
  if (typeof pattern !== 'string' || pattern.length === 0) return false
  if (typeof resource !== 'string' || resource.length === 0) return false
  let regexp = compiled.get(pattern)
  if (!regexp) {
    regexp = compile(pattern)
    compiled.set(pattern, regexp)
  }
  return regexp.test(resource)
}
