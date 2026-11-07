/**
 * The request runner.
 *
 * One request walks the route's steps in the configured order. Every step asks
 * the policy what to do about its dependency's class, and the runner is the only
 * place that knows the route can stop early — a critical dependency, or a
 * required step that could not be served.
 */
import { loadConfig } from './config.js'
import { buildRegistry } from './deps.js'
import { OPEN, createGate } from './gate.js'
import { countFailFast, countRequest, createMetrics } from './metrics.js'
import { ACTION, createSteps } from './policy.js'
import { readStep } from './read.js'
import { buildResponse, collectDegraded, degradedList, sinkPayload } from './report.js'
import { Recorder } from './util.js'
import { writeStep } from './write.js'

export const OK = 'OK'
export const CRITICAL_DEGRADED = 'critical-dependency-degraded'
export const DEPENDENCY_UNAVAILABLE = 'dependency-unavailable'

/** A clock is either a function or anything with a zero-argument `at`/`now`. */
function toClockFn(clock) {
  if (typeof clock === 'function') return clock
  if (clock && typeof clock.at === 'function') return () => clock.at()
  if (clock && typeof clock.now === 'function') return () => clock.now()
  return () => 0
}

/** The response body, assembled as the route runs. */
class Outcome {
  constructor() {
    this.ok = true
    this.code = OK
    this.failingStep = null
    this.failingDependency = null
  }

  fail(code, { step = null, dependency = null } = {}) {
    this.ok = false
    this.code = code
    this.failingStep = step
    this.failingDependency = dependency
    return this
  }
}

export class Service {
  constructor({ config, clock, transports = {}, log = null } = {}) {
    this.config = config
    this.clock = toClockFn(clock)
    this.dependencies = buildRegistry(config, transports, this.clock)
    this.metrics = createMetrics()
    this.log = log ?? new Recorder()
    this.gates = new Map()
    this.marks = new Set()
    this.data = {}
  }

  dependency(name) {
    return this.dependencies.get(name) ?? null
  }

  /** The current time on the injected clock. */
  now() {
    return this.clock()
  }

  /** The breaker for one dependency, created on first use. */
  gateFor(name) {
    if (!this.gates.has(name)) {
      const spec = this.dependencies.get(name)
      this.gates.set(name, createGate(name, spec
        ? { failureThreshold: spec.failureThreshold, failureWindow: spec.failureWindow, openMs: spec.openMs }
        : {}, this.clock))
    }
    return this.gates.get(name)
  }

  /**
   * True when nothing may be sent to this dependency: no transport is wired for
   * it, an operator has marked it degraded, or its breaker is open and still
   * inside its `openMs`.
   */
  unavailable(dependency) {
    if (!dependency) return true
    if (this.marks.has(dependency.name) || dependency.unwired) return true
    return this.openAndWaiting(dependency.name)
  }

  /** Open, and still inside its openMs: nothing is attempted, not even a probe. */
  openAndWaiting(name) {
    const gate = this.gateFor(name)
    if (gate.state !== OPEN) return false
    return this.now() - gate.openedAt < gate.openMs
  }

  /** True when the dependency is known to be down, so a call is not worth it. */
  degradedDependency(dependency) {
    if (!dependency) return true
    return this.marks.has(dependency.name) || dependency.unwired || this.openAndWaiting(dependency.name)
  }

  isDegraded(name) {
    const dependency = this.dependency(name)
    if (!dependency) return true
    return this.unavailable(dependency)
  }

  /** What a call site should do with this dependency, right now. */
  statusOf(name) {
    const dependency = this.dependency(name)
    if (!dependency) return 'unknown'
    if (this.marks.has(name)) return 'degraded'
    if (dependency.unwired) return 'unwired'
    return this.gateFor(name).state
  }

  markDegraded(name) {
    this.marks.add(name)
    return this
  }

  markHealthy(name) {
    this.marks.delete(name)
    const gate = this.gates.get(name)
    if (gate) gate.markHealthy()
    return this
  }

  /** What the gate would do with the next call: 'closed' | 'open' | 'half-open'. */
  breakerState(name) {
    return this.gateFor(name).state
  }

  /** The route specification, or null when the route is not configured. */
  routeSpec(route) {
    return this.config.routes?.[route] ?? null
  }

  /** Run one request. `at` is the injected clock: nothing here reads the wall. */
  handle(request = {}, { at = null } = {}) {
    const full = {
      id: request.id ?? 'req-1',
      route: request.route ?? 'checkout',
      accountId: request.accountId ?? this.config.defaultAccountId ?? 'acct-1',
      amount: request.amount ?? this.config.defaultAmount ?? '25.00',
      objects: request.objects ?? [],
      at: at ?? this.now(),
    }
    countRequest(this.metrics)

    const spec = this.routeSpec(full.route)
    const steps = createSteps(spec?.steps ?? [])
    const results = new Array(steps.length)
    const degradedSeen = collectDegraded([])
    const outcome = new Outcome()

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]
      const dependency = this.dependency(step.dependency)

      if (dependency?.class === 'critical' && this.unavailable(dependency)) {
        countFailFast(this.metrics, step.dependency)
        if (!degradedSeen.has(step.dependency)) {
          degradedSeen.set(step.dependency, { name: step.dependency, action: ACTION.failed })
        }
        outcome.fail(CRITICAL_DEGRADED, { dependency: step.dependency })
        break
      }

      const handler = dependency?.class === 'read' ? readStep : writeStep
      const result = handler({
        step,
        request: full,
        service: this,
        payload: step.dependency === 'metrics.sink' ? (s, r) => sinkPayload(r, this.metrics) : null,
      })
      results[index] = result.step
      for (const entry of result.degraded) {
        if (!degradedSeen.has(entry.name)) degradedSeen.set(entry.name, entry)
      }

      if (step.fatal(result.step.status)) {
        outcome.fail(DEPENDENCY_UNAVAILABLE, { step: step.name })
        break
      }
    }

    return buildResponse({
      request: full,
      steps: results.filter(Boolean),
      ok: outcome.ok,
      code: outcome.code,
      failingStep: outcome.failingStep,
      failingDependency: outcome.failingDependency,
      degraded: degradedList(degradedSeen, this),
      metrics: this.metrics,
    })
  }
}

/** A service wired to this checkout's configuration and to the given transports. */
export function createService({ transports = {}, clock, config = null, log = null } = {}) {
  return new Service({ config: config ?? loadConfig(), clock, transports, log })
}
