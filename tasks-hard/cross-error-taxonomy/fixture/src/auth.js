/**
 * Check the token on a request and the scope the use case needs.
 *
 * `now` is a millisecond instant passed in by the caller: this service does not
 * read a clock, so a token's expiry is compared against the instant the
 * operation started.
 */
export function checkAuth(token, { ctx, now, requiredScope } = {}) {
  if (!token || typeof token.value !== 'string' || token.value === '') {
    throw new Error('the request carries no token')
  }
  if (typeof token.expiresAt === 'number' && token.expiresAt < now) {
    throw new Error('the token expired at ' + token.expiresAt)
  }
  const scopes = Array.isArray(token.scopes) ? token.scopes : []
  if (requiredScope && !scopes.includes(requiredScope)) {
    throw new Error('the token has no scope ' + requiredScope)
  }
  return { subject: token.subject, scopes }
}
