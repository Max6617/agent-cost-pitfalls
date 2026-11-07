/**
 * The router.
 *
 * Matches a method and a path against the configured routes, checks access, and
 * calls the handler. The matched route is reported; nothing else here is
 * observable, so nothing else here emits.
 */
import { NotFoundError } from './errors.js'

const PARAM = /^:(.+)$/

export function createRouter({ routes = [], auth, events } = {}) {
  const compiled = routes.map((route) => ({
    ...route,
    segments: route.path.split('/').filter(Boolean),
  }))

  const match = (method, path) => {
    const segments = path.split('/').filter(Boolean)
    for (const route of compiled) {
      if (route.method !== method) continue
      if (route.segments.length !== segments.length) continue
      const params = {}
      let ok = true
      for (let i = 0; i < route.segments.length; i += 1) {
        const expected = route.segments[i]
        const actual = segments[i]
        const m = PARAM.exec(expected)
        if (m) {
          params[m[1]] = decodeURIComponent(actual)
        } else if (expected !== actual) {
          ok = false
          break
        }
      }
      if (ok) return { route, params }
    }
    return null
  }

  return {
    match,
    resolve(method, path) {
      const found = match(method, path)
      if (!found) {
        throw new NotFoundError('no route for ' + method + ' ' + path, { details: { method, path } })
      }
      return found
    },

    /** Match, authorise and dispatch. Returns the handler's result. */
    dispatch({ method, path, headers, body }) {
      const { route, params } = this.resolve(method, path)
      const { principal } = auth.authorize({ route, headers })
      events?.emit({
        name: 'route.matched',
        meta: { route: route.id, method, path, params, principal: principal?.id },
      })
      return route.handler({ params, headers, body, principal, route })
    },

    get routes() {
      return compiled.map(({ segments, handler, ...rest }) => ({ ...rest }))
    },
  }
}
