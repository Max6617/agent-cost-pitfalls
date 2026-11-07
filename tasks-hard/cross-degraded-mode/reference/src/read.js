/**
 * Read-only call sites.
 *
 * A read never fails a request. It walks the dependency's documented fallback
 * chain until a tier serves, and it reports which tier that was; if the whole
 * chain is unavailable it answers with the documented empty result so the caller
 * can see that it is looking at nothing.
 */
import { attempt, resolvePayload } from './callout.js'
import { countCall, countFailure, countFallback } from './metrics.js'
import { ACTION, STATUS } from './policy.js'

/** The payload a read call site sends. */
export function readPayload(step, request) {
  return { step: step.name, accountId: request.accountId, at: request.at }
}

const served = (step, dependency, fields) => ({ name: step.name, dependency, ...fields })

/**
 * Serve one read step: the step record, the degraded dependencies it ran into,
 * and the number of calls it put on the wire.
 */
export function readStep({ step, request, service, payload = null }) {
  const primary = service.dependency(step.dependency)
  const chain = [step.dependency, ...(primary?.fallback ?? [])]
  const degraded = []
  let failures = 0
  let calls = 0

  for (const tierName of chain) {
    const tier = service.dependency(tierName)
    if (!tier) continue

    if (service.unavailable(tier)) {
      degraded.push({ name: tierName, action: ACTION.fallback })
      continue
    }

    const gate = service.gateFor(tierName)
    if (!gate.allows()) {
      degraded.push({ name: tierName, action: ACTION.fallback })
      continue
    }

    const outgoing = payload === null ? readPayload(step, request) : resolvePayload(payload, step, request)
    const result = attempt(tier, outgoing)
    calls += 1
    countCall(service.metrics, tierName)
    service.log.record(tierName, outgoing, result.ok ? null : result.reason)

    if (result.ok) {
      gate.recordSuccess()
      setData(service, step, tierName, result.response, request)
      const viaFallback = tierName !== step.dependency
      if (viaFallback) countFallback(service.metrics, step.dependency)
      return {
        step: served(step, step.dependency, {
          status: viaFallback ? STATUS.FALLBACK : STATUS.OK,
          ok: true,
          source: tierName,
          viaFallback,
          empty: false,
          degraded,
          failures,
        }),
        degraded,
        calls,
      }
    }

    gate.recordFailure()
    countFailure(service.metrics, tierName)
    failures += 1
  }

  return {
    step: served(step, step.dependency, {
      status: STATUS.FALLBACK,
      ok: true,
      source: null,
      viaFallback: chain.length > 1,
      empty: true,
      degraded,
      failures,
    }),
    degraded,
    calls,
  }
}

/** What a successful read puts in the service's working set. */
function setData(service, step, tierName, response, request) {
  service.data[step.name] = { source: tierName, value: response?.data ?? null, accountId: request.accountId }
}
