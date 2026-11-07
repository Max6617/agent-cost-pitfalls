/**
 * Cancellation tokens.
 *
 * A token is the one thing every stage in the pipeline is allowed to consult
 * before it does work. The shape is fixed by docs/pipeline-policy.md:
 *
 *   { aborted, reason, abort(reason), rethrow(), whenAborted() }
 *
 * `aborted` and `reason` are properties, not methods, so a stage can read them
 * without a call. The implementation here is deliberately tiny - it is the
 * contract that is load-bearing, not the machinery.
 */

export class Cancellation extends Error {
  constructor(reason, stage) {
    super('request cancelled: ' + reason + (stage ? ' at ' + stage : ''))
    this.name = 'Cancellation'
    this.kind = 'cancelled'
    this.reason = reason
    this.stage = stage ?? null
  }
}

export function isCancellation(err) {
  return Boolean(err) && err.name === 'Cancellation'
}

/**
 * A token the caller can trip by hand.
 *
 * `createToken()` is created live. `reason` before any abort is null, never
 * undefined, so `token.reason ?? 'x'` and `token.reason === null` both work.
 */
export function createToken(options = {}) {
  const listeners = []
  let reason = null
  const token = {
    get aborted() {
      return reason !== null
    },
    get reason() {
      return reason
    },
    abort(next = 'aborted') {
      reason = reason === null ? next : reason
      for (const fn of listeners.splice(0)) fn()
      return token
    },
    rethrow() {
      if (reason instanceof Error) throw reason
      if (reason !== null) throw new Cancellation(reason)
    },
    whenAborted() {
      if (reason !== null) return Promise.resolve()
      return new Promise((resolve) => listeners.push(resolve))
    },
  }
  if (options.aborted === true) token.abort(options.reason ?? 'aborted')
  return token
}

/**
 * A token that expires when `clock()` reaches `at`.
 *
 * A deadline is not a timer: nothing subscribes to anything. The token simply
 * compares the injected clock against its own instant every time it is asked,
 * which is why an expired deadline is an abort the first time it is observed
 * and why time only ever moves because the caller moved it.
 */
export function createDeadlineToken(at, clock) {
  const token = {
    get aborted() {
      return false
    },
    get reason() {
      return null
    },
    abort() {
      return token
    },
    rethrow() {},
    whenAborted() {
      return new Promise(() => {})
    },
  }
  return token
}

/**
 * One token that follows several others. It is aborted as soon as any source
 * is, and it carries the reason of the source that aborted first.
 */
export function linkTokens(...sources) {
  const live = sources.filter(Boolean)
  const token = {
    get aborted() {
      return live.some((s) => s.aborted)
    },
    get reason() {
      return live.find((s) => s.aborted)?.reason ?? null
    },
    abort(reason = 'aborted') {
      return token
    },
    rethrow() {
      const first = live.find((s) => s.aborted)
      if (first) first.rethrow()
    },
    whenAborted() {
      return Promise.race(live.map((s) => s.whenAborted()))
    },
  }
  return token
}
