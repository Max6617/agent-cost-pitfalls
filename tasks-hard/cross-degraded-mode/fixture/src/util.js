/**
 * Injected clock, call recorder, and the test transports.
 *
 * The service never reads the system clock and never sleeps: the caller passes
 * `at` on every entry point. That is what makes an incident reproducible in a
 * test, and it is why `createClock` hands back both the clock and a way to move
 * it.
 */

/** A deterministic clock. `clock.at()` is the current time; `clock.advance(ms)` moves it. */
export function createClock(start = 0) {
  let now = start
  return {
    at: () => now,
    advance: (ms) => { now += ms; return now },
    set: (ms) => { now = ms; return now },
  }
}

/**
 * How a dependency answers a call.
 *
 * `ok: true` with `data` is a healthy answer. `ok: false` with `error` is a
 * transport that is down; `ok: false` with `status` and no `error` is a provider
 * that answered with a refusal rather than a payload. Both are failures for the
 * breaker — see `docs/degraded-mode.md`.
 */
export const RESPONSES = {
  ok: (data = null) => ({ ok: true, status: 200, data }),
  error: (error = 'transport-error') => ({ ok: false, status: 503, error }),
  refused: (status = 402, code = 'provider-refusal') => ({ ok: false, status, code }),
}

/**
 * A transport that answers from `responses` — an array, walked one entry per
 * call with the last entry repeating — and records every call it receives.
 * `script` may be a plain value instead of an array, in which case it is the
 * answer to every call.
 */
export function makeTransport(script = RESPONSES.ok(), name = 'transport') {
  const responses = Array.isArray(script) ? script : [script]
  const calls = []
  const transport = (payload) => {
    const response = responses[Math.min(calls.length, responses.length - 1)]
    calls.push(payload)
    if (response instanceof Error) throw response
    return response
  }
  transport.calls = calls
  transport.label = name
  return transport
}

/**
 * A transport that throws on every call. A dependency whose client throws rather
 * than answering is a failure for the breaker, exactly like one that answers
 * `ok: false`.
 */
export function throwingTransport(reason = 'connection refused') {
  const calls = []
  const transport = (payload) => {
    calls.push(payload)
    throw new Error(reason)
  }
  transport.calls = calls
  return transport
}

/**
 * The outbound-call log. Each entry is `{ dependency, payload, failed, reason }`.
 * The service records an attempt as failed when `attempt()` said so, so this is
 * a plain list with counting helpers.
 */
export class Recorder {
  constructor() {
    this.entries = []
  }

  record(dependency, payload, failure = null) {
    const entry = {
      dependency,
      payload,
      failed: failure !== null && failure !== undefined && failure !== false,
      reason: failure || null,
      index: this.entries.length,
    }
    this.entries.push(entry)
    return entry
  }

  calls(name = null) { return name === null ? this.entries : this.entries.filter((e) => e.dependency === name) }
  count(name = null) { return this.calls(name).length }
  names() { return this.entries.map((e) => e.dependency) }
  payloads(name = null) { return this.calls(name).map((e) => e.payload) }
  failures(name = null) { return this.calls(name).filter((e) => e.failed) }
  failuresFor(name) { return this.failures(name).length }
  attempted(name = null) { return name === null ? this.entries.length > 0 : this.count(name) > 0 }
  clear() { this.entries = [] }
}
