/**
 * The route table.
 *
 * One ordered list per method, filled in registration order: that order is what
 * the router falls back on when two routes are equally specific, so the lists
 * are never re-sorted.
 */
import { parsePattern } from './pattern.js'

export class RouteTable {
  #byMethod = new Map()
  #registered = 0

  /** Register one route and hand back its record. */
  add(method, pattern, handler) {
    const parsed = parsePattern(pattern)
    const route = { method, pattern: String(pattern ?? ''), handler, order: this.#registered }
    this.#registered += 1
    const list = this.#byMethod.get(method)
    if (list) list.push({ route, parsed })
    else this.#byMethod.set(method, [{ route, parsed }])
    return route
  }

  /** Every entry filed under the given methods, in registration order. */
  forMethods(methods) {
    const entries = []
    for (const method of methods) {
      const list = this.#byMethod.get(method)
      if (list) entries.push(...list)
    }
    return entries
  }

  /** The methods that have at least one route. */
  methods() {
    return [...this.#byMethod.keys()]
  }

  /** Every route record, in registration order. */
  routes() {
    return [...this.#byMethod.values()].flat().map((entry) => entry.route)
  }

  get size() {
    let total = 0
    for (const list of this.#byMethod.values()) total += list.length
    return total
  }
}
