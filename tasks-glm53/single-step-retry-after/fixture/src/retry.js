/**
 * When to try an upstream call again.
 *
 * The upstream can ask us to wait in two ways: a number of seconds, or an HTTP
 * date. Both spellings mean the same thing and both are measured from the
 * moment the response was RECEIVED, not from the moment the request went out —
 * a slow response must not eat into the wait the server asked for.
 */

/** The default wait when the upstream asks for nothing. */
export const DEFAULT_WAIT_MS = 1000

/** The longest wait we will honour before giving up and reporting a failure. */
export const MAX_WAIT_MS = 60_000

const HTTP_DATE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/

/**
 * Parse a `Retry-After` value.
 *
 * @param {string|number|undefined|null} value
 * @returns {{ kind: 'seconds'|'date'|'none', ms: number }}
 */
export function parseRetryAfter(value) {
  if (value == null) return { kind: 'none', ms: DEFAULT_WAIT_MS }

  const text = String(value).trim()
  if (text === '') return { kind: 'none', ms: DEFAULT_WAIT_MS }

  if (/^\d+$/.test(text)) {
    const seconds = Number(text)
    if (seconds > 0) return { kind: 'seconds', ms: seconds * 1000 }
  }

  if (HTTP_DATE.test(text)) {
    const at = Date.parse(text)
    return Number.isNaN(at) ? { kind: 'none', ms: DEFAULT_WAIT_MS } : { kind: 'date', ms: at }
  }

  return { kind: 'none', ms: DEFAULT_WAIT_MS }
}

/**
 * How long to wait before the next attempt.
 *
 * @param {{ headers?: Record<string,string>, receivedAt?: number }} response
 * @param {number} now
 */
export function waitFor(response, now = Date.now()) {
  const value = response?.headers?.['retry-after'] ?? response?.headers?.['Retry-After']
  const parsed = parseRetryAfter(value)

  // A date is an instant on the wall clock, so it is turned into a wait here.
  if (parsed.kind === 'date') {
    return Math.max(0, parsed.ms - now)
  }
  return parsed.ms
}

/** Should the client give up rather than wait this long? */
export function isTooLong(ms) {
  return ms > MAX_WAIT_MS
}

/**
 * The statuses worth retrying. Everything else is the caller's problem.
 */
export function isRetryableStatus(status) {
  return status === 429 || status === 503
}
