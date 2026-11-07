const SECRET_KEYS = /^(password|secret|token|authorization|cookie)$/i

/**
 * Strip credentials from a record before it is written.
 *
 * Records are built by callers out of whatever the request carried, so this
 * writer is the last place that can be sure a secret never reaches the log
 * pipeline.
 */
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) {
      out[key] = SECRET_KEYS.test(key) ? '[redacted]' : redact(item)
    }
    return out
  }
  return value
}
