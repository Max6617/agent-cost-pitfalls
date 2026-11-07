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
      if (reason === null) {
        reason = next
        for (const fn of listeners.splice(0)) fn()
      }
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
  const reading = typeof clock === 'function' ? clock : () => at
  const token = {
    get aborted() {
      return reading() >= at
    },
    get reason() {
      return reading() >= at ? 'deadline' : null
    },
    abort() {
      // A deadline is not something a caller can trip earlier or talk out of,
      // and once it has lapsed it stays a deadline.
      return token
    },
    rethrow() {
      if (token.aborted) throw new Cancellation('deadline', 'deadline')
    },
    whenAborted() {
      // A deadline has no event to subscribe to; it is answered when asked.
      return token.aborted ? Promise.resolve() : new Promise(() => {})
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
      for (const source of live) source.abort(reason)
      return token
    },
    rethrow() {
      const first = live.find((s) => s.aborted)
      if (first) first.rethrow()
    },
    whenAborted() {
      // A deadline that has already lapsed is settled the moment it is asked
      // about; a caller's abort is the thing that needs a subscriber.
      const lapsed = live.find((s) => s.aborted)
      if (lapsed) return Promise.resolve()
      return Promise.race(live.map((s) => s.whenAborted()))
    },
  }
  return token
}
