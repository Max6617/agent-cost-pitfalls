/**
 * checkout-api — public surface.
 *
 * Everything the HTTP layer, the operator console and the tests are allowed to
 * import. Modules under src/ that are not re-exported here are internal and may
 * be reorganised freely; the names below may not.
 */
export { Service, createService, OK, CRITICAL_DEGRADED, DEPENDENCY_UNAVAILABLE } from './service.js'
export { Gate, createGate, CLOSED, OPEN, HALF_OPEN } from './gate.js'
export { Dependency, buildRegistry } from './deps.js'
export { Step, createSteps, STATUS, ACTION } from './policy.js'
export { readStep, readPayload } from './read.js'
export { writeStep, writePayload } from './write.js'
export { createMetrics, snapshotMetrics } from './metrics.js'
export { collectDegraded, degradedList, buildResponse, sinkPayload } from './report.js'
export { attempt, resolvePayload } from './callout.js'
export { loadConfig, routeSteps, readJson, repoRoot } from './config.js'
export { createClock, Recorder, RESPONSES, makeTransport, throwingTransport } from './util.js'
