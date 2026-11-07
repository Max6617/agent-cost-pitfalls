/**
 * Response shaping.
 *
 * The response is the only place an operator can see what the policy did, so it
 * carries the whole story: what each call site decided, which dependencies it
 * found degraded, and what the service counted along the way.
 */
import { ACTION } from './policy.js'
import { snapshotMetrics } from './metrics.js'

/** Fold the per-step degradation records into one entry per dependency. */
export function collectDegraded(entries) {
  const seen = new Map()
  for (const entry of entries) {
    if (!entry?.name) continue
    const existing = seen.get(entry.name)
    if (existing) {
      // A dependency can be needed twice in one request: the first action wins,
      // because that is the one the request was decided on.
      continue
    }
    seen.set(entry.name, { name: entry.name, action: entry.action })
  }
  return seen
}

/**
 * Turn the collected per-dependency records into the response's `degraded` list,
 * tagged with the class of each dependency.
 */
export function degradedList(seen, service) {
  const list = []
  for (const record of seen.values()) {
    const dependency = service.dependency(record.name)
    list.push({
      dependency: record.name,
      class: dependency?.class ?? 'unknown',
      action: record.action ?? ACTION.fallback,
    })
  }
  return list
}

/** The metrics the sink call site is asked to ship. */
export function sinkPayload(request, metrics) {
  return {
    step: 'telemetry',
    accountId: request.accountId,
    at: request.at,
    requestId: request.id,
    route: request.route,
    metrics: snapshotMetrics(metrics),
  }
}

/** The response body, given the steps that actually ran. */
export function buildResponse({ request, steps, ok, code, failingStep, failingDependency, degraded, metrics }) {
  const response = {
    ok,
    code,
    requestId: request.id,
    route: request.route,
    steps,
  }
  if (failingStep) response.failingStep = failingStep
  if (failingDependency) response.failingDependency = failingDependency
  response.degraded = degraded
  response.metrics = snapshotMetrics(metrics)
  return response
}
