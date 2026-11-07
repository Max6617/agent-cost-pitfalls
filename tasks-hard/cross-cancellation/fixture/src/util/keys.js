/**
 * Cache keys and limiter buckets are derived from the request, not from the
 * caller's id: two callers asking the same question share the answer.
 */
export function cacheKey(request) {
  return [
    request.tenant ?? 'anon',
    request.route ?? '/',
    stableStringify(request.query ?? {}),
  ].join('|')
}

export function limiterKey(request, principal) {
  return (principal?.id ?? request.tenant ?? 'anon') + ':' + (request.route ?? '/')
}

/** JSON with object keys in sorted order, so the same body always hashes alike. */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const keys = Object.keys(value).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}'
}
