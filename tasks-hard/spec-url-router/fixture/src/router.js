/**
 * The router.
 *
 * Routes go in with `add`, a request goes in with `match`, and what comes back
 * is the route that will serve it plus the values captured on the way.
 */
import { RouteTable } from './table.js'
import { candidateMethods, normaliseMethod } from './methods.js'
import { readTarget, splitPath } from './normalize.js'
import { parseQuery } from './decode.js'
import { matchPattern } from './match.js'
import { pickBest } from './precedence.js'

const DEFAULTS = Object.freeze({
  caseSensitive: false,
})

export class Router {
  #table = new RouteTable()
  #options

  constructor(options = {}) {
    this.#options = { ...DEFAULTS, ...options }
  }

  get options() {
    return { ...this.#options }
  }

  /** Register a route; returns the record for it. */
  add(method, pattern, handler) {
    return this.#table.add(normaliseMethod(method), pattern, handler)
  }

  /** Every route, in registration order. */
  routes() {
    return this.#table.routes()
  }

  /**
   * Find the route that serves `method` + `target`.
   *
   * Always returns a result object; a request nothing serves comes back with
   * `matched: false`.
   */
  match(method, target) {
    const upper = normaliseMethod(method)
    const { path, queryString } = readTarget(target)
    const query = parseQuery(queryString)
    const segments = this.#segmentsOf(path)

    const candidates = []
    if (segments !== null) {
      for (const entry of this.#table.forMethods(candidateMethods(method))) {
        const match = matchPattern(entry.parsed, segments)
        if (match !== null) {
          candidates.push({ route: entry.route, parsed: entry.parsed, match })
        }
      }
    }

    const best = pickBest(candidates)
    if (best === null) return miss(upper)

    return {
      matched: true,
      method: upper,
      path,
      pattern: best.route.pattern,
      handler: best.route.handler,
      params: best.match.params,
      query,
    }
  }

  #segmentsOf(path) {
    const segments = splitPath(path)
    if (segments === null) return null
    if (this.#options.caseSensitive) return segments
    return segments.map((segment) => segment.toLowerCase())
  }
}

function miss(method) {
  return { matched: false, method, pattern: null, handler: null, params: {} }
}

/** A router ready to take routes. */
export function createRouter(options = {}) {
  return new Router(options)
}
