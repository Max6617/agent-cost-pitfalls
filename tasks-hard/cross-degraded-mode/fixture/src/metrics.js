/**
 * The service's own counters.
 *
 * These are not a dependency and they are never sent anywhere by being counted:
 * they are returned on every response and the optional sink call site is what
 * carries them out of the process. The four responses to degradation —
 * fallback, refusal, skip, fail-fast — are separate counters on purpose; a write
 * that refuses must not show up as a fallback.
 */
import { ACTION } from './policy.js'

export function createMetrics() {
  return {
    requests: 0,
    callsAttempted: 0,
    callsFailed: 0,
    fallbacks: 0,
    refusals: 0,
    skipped: 0,
    failFast: 0,
    byDependency: {},
    bySource: {},
  }
}

function bucket(container, name) {
  if (!container[name]) {
    container[name] = {
      callsAttempted: 0,
      callsFailed: 0,
      fallbacks: 0,
      refusals: 0,
      skipped: 0,
      failFast: 0,
    }
  }
  return container[name]
}

export function countRequest(metrics) {
  metrics.requests += 1
  return metrics
}

export function countCall(metrics, name) {
  metrics.callsAttempted += 1
  metrics.bySource[name] = (metrics.bySource[name] ?? 0) + 1
  bucket(metrics.byDependency, name).callsAttempted += 1
  return metrics
}

export function countFailure(metrics, name) {
  metrics.callsFailed += 1
  bucket(metrics.byDependency, name).callsFailed += 1
  return metrics
}

export function countFallback(metrics, name) {
  metrics.fallbacks += 1
  bucket(metrics.byDependency, name).fallbacks += 1
  return metrics
}

export function countRefusal(metrics, name) {
  metrics.refusals += 1
  bucket(metrics.byDependency, name).refusals += 1
  return metrics
}

export function countSkip(metrics, name) {
  metrics.skipped += 1
  bucket(metrics.byDependency, name).skipped += 1
  return metrics
}

export function countFailFast(metrics, name) {
  metrics.failFast += 1
  bucket(metrics.byDependency, name).failFast += 1
  return metrics
}

/** Count one degradation response against the right counter. */
export function countAction(metrics, name, action) {
  if (action === ACTION.fallback) return countFallback(metrics, name)
  if (action === ACTION.refused) return countRefusal(metrics, name)
  if (action === ACTION.skipped) return countSkip(metrics, name)
  if (action === ACTION.failed) return countFailFast(metrics, name)
  return metrics
}

/** A deep-enough copy, so a response never hands out the live counters. */
export function snapshotMetrics(metrics) {
  return {
    ...metrics,
    byDependency: Object.fromEntries(Object.entries(metrics.byDependency).map(([k, v]) => [k, { ...v }])),
    bySource: { ...metrics.bySource },
  }
}
