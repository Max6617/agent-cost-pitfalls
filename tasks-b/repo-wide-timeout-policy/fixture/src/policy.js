/**
 * The timeout policy.
 *
 * Single source of truth for the timeout every blocking call runs with; the
 * rules are written down in docs/timeout-policy.md. Clients receive an
 * instance at wiring time and resolve their operation through it — a client
 * that keeps its own number is a bug by definition.
 */

/** The hard ceiling: no call runs longer than this, whatever it asked for. */
export const HARD_CEILING_MS = 30_000

/** Default timeout per class, used when nothing is requested and no override names the operation. */
export const CLASS_DEFAULTS = Object.freeze({
  http: 2_000,
  db: 1_000,
  queue: 5_000,
  cache: 250,
  webhook: 10_000,
})

const classOf = (operation) => {
  const dot = String(operation).indexOf('.')
  return dot === -1 ? String(operation) : String(operation).slice(0, dot)
}

/**
 * A policy instance. `overrides` maps full operation names ('db.query') to
 * the floor for that operation; it is validated once, here, so a bad config
 * fails at startup rather than mid-call.
 */
export function createPolicy(overrides = {}) {
  const table = new Map()
  for (const [operation, value] of Object.entries(overrides ?? {})) {
    if (!(classOf(operation) in CLASS_DEFAULTS)) {
      throw new RangeError(`override names an unknown operation: ${operation}`)
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new RangeError(`override for ${operation} must be a positive number of milliseconds`)
    }
    // the floor never exceeds the ceiling
    table.set(operation, Math.min(value, HARD_CEILING_MS))
  }

  return {
    ceiling: HARD_CEILING_MS,

    /**
     * The timeout `operation` runs with when the caller asks for `requested`
     * milliseconds. `undefined` means "the default for this operation".
     */
    resolve(operation, requested) {
      const cls = classOf(operation)
      if (!(cls in CLASS_DEFAULTS)) {
        throw new RangeError(`unknown operation: ${operation}`)
      }
      const floor = table.get(operation) ?? CLASS_DEFAULTS[cls]
      if (requested === undefined) return floor
      if (typeof requested !== 'number' || !Number.isFinite(requested) || requested <= 0) {
        throw new RangeError(`requested timeout for ${operation} must be a positive number of milliseconds`)
      }
      return Math.min(Math.max(requested, floor), HARD_CEILING_MS)
    },
  }
}
