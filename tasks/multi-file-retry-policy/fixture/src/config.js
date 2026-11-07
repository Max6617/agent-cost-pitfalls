/**
 * Retry configuration.
 *
 * The worker reads this once at start-up and never re-reads it, so a config
 * change needs a restart. That is deliberate: a retry policy that changes
 * underneath an in-flight job is impossible to reason about afterwards.
 */

/** The shape the worker requires. */
export function defaultConfig() {
  return {
    attempts: 4,
    baseDelayMs: 250,
    maxDelayMs: 8000,
    perHostMinGapMs: 1000,
  }
}
/**
 * Validate an operator-supplied policy.
 *
 * @param {object} raw
 * @returns {{ ok: true, config: object } | { ok: false, errors: string[] }}
 */
export function parseConfig(raw = {}) {
  const base = defaultConfig()
  const config = { ...base, ...raw }
  const errors = []

  for (const key of Object.keys(base)) {
    const value = config[key]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      errors.push(key + ' must be a non-negative number')
    }
  }
  if (config.attempts < 1) errors.push('attempts must be at least 1')
  if (config.baseDelayMs > config.maxDelayMs) errors.push('baseDelayMs must not exceed maxDelayMs')

  return errors.length ? { ok: false, errors } : { ok: true, config }
}
