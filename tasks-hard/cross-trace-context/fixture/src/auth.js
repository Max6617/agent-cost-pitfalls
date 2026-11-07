/**
 * The auth check.
 *
 * Runs inside the request span. It reports whether the check passed, and it does
 * not open a span of its own: authorising is a step of the request, not a unit
 * of work the operator wants to see as its own line in the trace.
 */
import { AppError } from './errors.js'

export function createAuth({ principals = [], events } = {}) {
  const byToken = new Map(principals.map((p) => [p.token, p]))

  return {
    /**
     * `route` is the matched route object; `route.access` is one of
     * 'public' | 'authenticated' | 'system'.
     */
    authorize({ route, headers = {} }) {
      const access = route?.access ?? 'public'
      const raw = headers.authorization ?? headers.Authorization ?? ''
      const token = typeof raw === 'string' && raw.startsWith('Bearer ') ? raw.slice(7) : ''
      const principal = byToken.get(token)

      const deny = (message, code, status, reason) => {
        events?.emit({
          name: 'auth.denied',
          meta: { route: route?.id, access, principal: principal?.id, reason },
        })
        throw new AppError(message, { code, status, details: { access, reason } })
      }

      if (access === 'public') {
        events?.emit({ name: 'auth.allowed', meta: { route: route?.id, access, principal: principal?.id } })
        return { principal: principal ?? null, access }
      }
      if (!token) deny('a bearer token is required', 'unauthorized', 401, 'missing-token')
      if (!principal) deny('the token is not recognised', 'unauthorized', 401, 'unknown-token')
      if (access === 'system' && !principal.system) {
        deny('this endpoint is for internal callers only', 'forbidden', 403, 'not-system')
      }

      events?.emit({ name: 'auth.allowed', meta: { route: route?.id, access, principal: principal.id } })
      return { principal, access }
    },
  }
}
