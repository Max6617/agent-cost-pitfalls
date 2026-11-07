/**
 * The router.
 *
 * Routes go in with `add`, a request goes in with `match`, and what comes back
 * is the route that will serve it plus the values captured on the way.
 */
import { RouteTable } from './table.js'
import { candidateMethods, normaliseMethod } from './methods.js'
import { readTarget } from './normalize.js'
import { parseQuery } from './decode.js'
import { matchPattern } from './match.js'
import { pickBest } from './precedence.js'

const DEFAULTS = Object.freeze({
  caseSensitive: true,
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
   * Always returns a result object of the same shape; a request nothing serves
   * comes back with `matched: false`, and only a target the router cannot read
   * at all is raised.
   */
  match(method, target) {
    const upper = normaliseMethod(method)
    const { path, queryString, segments } = readTarget(target)
    const query = parseQuery(queryString)

    const candidates = []
    for (const entry of this.#table.forMethods(candidateMethods(method))) {
      const match = matchPattern(entry.parsed, segments, { caseSensitive: this.#options.caseSensitive })
      if (match !== null) {
        candidates.push({ route: entry.route, parsed: entry.parsed, match })
      }
    }

    const best = pickBest(candidates)
    if (best === null) {
      return { matched: false, method: upper, path, pattern: null, handler: null, params: {}, query }
    }

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
}

/** A router ready to take routes. */
export function createRouter(options = {}) {
  return new Router(options)
}
