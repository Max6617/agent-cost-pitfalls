/**
 * The kinds of failure the pipeline is allowed to report.
 *
 * There are only two of them, and neither is cancellation: a cancelled request
 * is a documented *outcome*, not an error, so it resolves. See
 * docs/pipeline-policy.md section 2 and 8.
 */

export class RunError extends Error {
  constructor(kind, message) {
    super(message)
    this.name = 'RunError'
    this.kind = kind
  }
}

/** The caller may not use this route. `denied`. */
export class DeniedError extends RunError {
  constructor(reason) {
    super('denied', 'request denied: ' + reason)
    this.name = 'DeniedError'
    this.reason = reason
  }
}

/** The request took longer than the timeout allows. `timeout`. */
export class TimeoutError extends RunError {
  constructor(ms) {
    super('timeout', 'upstream did not answer within ' + ms + 'ms')
    this.name = 'TimeoutError'
    this.ms = ms
  }
}

/** The upstream call was made and did not succeed. `upstream`. */
export class UpstreamError extends RunError {
  constructor(cause) {
    super('upstream', 'upstream call failed: ' + (cause?.message ?? String(cause)))
    this.name = 'UpstreamError'
    this.cause = cause
  }
}

/** The rate limiter refused the request. `rate-limited`. */
export class RateLimitedError extends RunError {
  constructor(key) {
    super('rate-limited', 'rate limit reached for ' + key)
    this.name = 'RateLimitedError'
    this.key = key
  }
}
