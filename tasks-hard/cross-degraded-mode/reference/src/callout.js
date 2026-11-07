/**
 * Outcomes: one attempt against one dependency, and the classification of what
 * came back.
 *
 * A call is a failure when the transport throws, when it rejects, or when the
 * response is not `ok`. Everything else counts as a success — a provider that
 * answers with a payload has answered. There is no retry anywhere in the
 * service: one call site, one attempt.
 */
import { Recorder } from './util.js'

/**
 * Attempt one call. The caller has already decided that the attempt is allowed;
 * this function never asks the gate anything.
 */
export function attempt(dependency, payload) {
  try {
    const response = dependency.hit(payload)
    if (!response || typeof response !== 'object') {
      return { ok: false, response: null, reason: 'malformed-response' }
    }
    if (response.ok !== true) {
      return { ok: false, response, reason: response.error ?? 'provider-refusal' }
    }
    return { ok: true, response, reason: null }
  } catch (err) {
    return { ok: false, response: null, reason: 'threw: ' + (err?.message ?? String(err)) }
  }
}

/** The call log a service writes into: every attempted call, in order. */
export function createLog() {
  return new Recorder()
}

/**
 * A call-site payload: a plain value, or a function of the step and the request
 * for the few call sites whose payload can only be built at call time.
 */
export function resolvePayload(payload, step, request) {
  return typeof payload === 'function' ? payload(step, request) : (payload ?? null)
}
