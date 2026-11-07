/**
 * Write call sites.
 *
 * A write is the one call site that is allowed to say no: while its dependency
 * is degraded it refuses, with the dependency's documented code, and the
 * transport is not called at all. The difference between "we tried and it broke"
 * and "we did not send it" is the whole point of the policy — a payment that
 * never went out is recoverable, and one that half went out is not.
 */
import { attempt, resolvePayload } from './callout.js'
import { countCall, countFailure, countRefusal, countSkip } from './metrics.js'
import { ACTION, STATUS } from './policy.js'

/** The payload a write call site sends. */
export function writePayload(step, request) {
  return { step: step.name, accountId: request.accountId, amount: request.amount, objects: request.objects, at: request.at }
}

/**
 * Serve one write step.
 *
 * Returns the step record, the degraded dependencies it ran into, and how many
 * calls it put on the wire.
 *
 * `draft` is an optional out-parameter: the payload that was actually sent, for
 * call sites whose payload the caller needs to see (the telemetry sink ships the
 * request's own metrics).
 */
export function writeStep({ step, request, service, draft = null, payload = null }) {
  const dependency = service.dependency(step.dependency)
  const gate = service.gateFor(step.dependency)

  if (service.degradedDependency(dependency)) {
    if (step.optional) {
      countSkip(service.metrics, step.dependency)
      return skipped(step)
    }
    countRefusal(service.metrics, step.dependency)
    return refused(step, dependency, 'degraded')
  }

  if (!gate.allows()) {
    // The breaker is open, or a probe somebody else is already flying: the call
    // is refused without ever reaching the provider.
    countRefusal(service.metrics, step.dependency)
    return refused(step, dependency, 'breaker-open')
  }

  const outgoing = payload === null ? writePayload(step, request) : resolvePayload(payload, step, request)
  if (draft) draft.payload = outgoing
  const result = attempt(dependency, outgoing)
  countCall(service.metrics, step.dependency)
  service.log.record(step.dependency, outgoing, result.ok ? null : result.reason)

  if (result.ok) {
    gate.recordSuccess()
    return {
      step: {
        name: step.name,
        dependency: step.dependency,
        status: STATUS.OK,
        ok: true,
        code: 'OK',
        degraded: [],
      },
      degraded: [],
      calls: 1,
    }
  }

  gate.recordFailure()
  countFailure(service.metrics, step.dependency)
  return {
    step: {
      name: step.name,
      dependency: step.dependency,
      status: STATUS.FAILED,
      ok: false,
      code: 'dependency-error',
      reason: result.reason,
      degraded: [],
    },
    degraded: [],
    calls: 1,
  }
}

/** The skip: the step was optional, so degradation costs nothing. */
function skipped(step) {
  const degraded = [{ name: step.dependency, action: ACTION.skipped }]
  return {
    step: {
      name: step.name,
      dependency: step.dependency,
      status: STATUS.SKIPPED,
      ok: true,
      code: 'SKIPPED',
      reason: 'optional',
      degraded,
    },
    degraded,
    calls: 0,
  }
}

/** The refusal: nothing attempted, nothing sent, documented code. */
function refused(step, dependency, reason) {
  const code = dependency?.degradedCode ?? `${step.dependency}-degraded`
  const degraded = [{ name: step.dependency, action: ACTION.refused }]
  return {
    step: {
      name: step.name,
      dependency: step.dependency,
      status: STATUS.REFUSED,
      ok: false,
      code,
      reason: reason ?? 'degraded',
      degraded,
    },
    degraded,
    calls: 0,
  }
}
