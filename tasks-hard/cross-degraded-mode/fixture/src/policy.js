/**
 * Call-site policy.
 *
 * `Step` is the declaration of one call site: which dependency it names, whether
 * the route can survive without it, and whether an operator has declared it
 * optional. The class of the *dependency* decides what degradation means; the
 * step only decides how much the route cares.
 */

export const STATUS = {
  OK: 'OK',
  FALLBACK: 'FALLBACK',
  REFUSED: 'REFUSED',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED',
}

/** The four ways a call site can answer a degraded dependency. */
export const ACTION = {
  fallback: 'fallback',
  refused: 'refused',
  skipped: 'skipped',
  failed: 'failed',
}

export class Step {
  constructor({ name, dependency, required = false, optional = false, payload = null }) {
    this.name = name
    this.dependency = dependency
    this.required = required
    this.optional = optional
    this.payload = payload
  }

  /** A degraded dependency that a required step cannot work around ends the route. */
  fatal(status) {
    return this.required && (status === STATUS.REFUSED || status === STATUS.FAILED)
  }
}

export function createSteps(routeSpec = []) {
  return routeSpec.map((s) => new Step(s))
}
