/**
 * orders-api - public surface.
 *
 * Everything the ingress, the operator CLI and the tests are allowed to import.
 * Modules under src/ that are not re-exported here are internal and may be
 * reorganised freely; the names below may not.
 *
 * Conventions (see README.md):
 *   - a context is `{ traceId, spanId, parentSpanId }` and is never `undefined`
 *     in a payload
 *   - every event carries those three fields plus `at`, `name` and `meta`
 *   - ids and time are injected, never read from the process
 */
import { loadConfig, createFixedClock } from './config.js'
import { createEventBus } from './events.js'
import { createIdFactory } from './context.js'
import { createAuth } from './auth.js'
import { createRepository } from './repository.js'
import { createCache } from './cache.js'
import { createClient } from './outbound.js'
import { createWorker } from './worker.js'
import { createScheduler } from './scheduler.js'
import { createAuditWriter } from './audit.js'
import { createService } from './service.js'

export { loadConfig, readJson, repoRoot, createFixedClock } from './config.js'
export { createEventBus, namesOf, ofKind, EVENT_KINDS } from './events.js'
export {
  createIdFactory,
  fields,
  isContext,
  beginTrace,
  beginChild,
  currentContext,
  contextOrAnonymous,
  currentTraceId,
  adopt,
  runInContext,
  runDetached,
  anonymousContext,
} from './context.js'
export { rootSpan, childSpan, spanOff, spanFields, traceId, runInSpan, withSpan } from './tracing.js'
export { sanitizeRequest, callerRequestId } from './sanitize.js'
export { createRouter } from './router.js'
export { createAuth } from './auth.js'
export { createRepository } from './repository.js'
export { createCache } from './cache.js'
export { createClient } from './outbound.js'
export { withRetry, retryingSend, DEFAULT_ATTEMPTS } from './retry.js'
export {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  OutboundError,
  RetryableError,
  isRetryable,
  causeChain,
  mapError,
} from './errors.js'
export { createWorker, runJob, DEFAULT_MAX_ATTEMPTS } from './worker.js'
export { createScheduler } from './scheduler.js'
export { createAuditWriter } from './audit.js'
export { createService } from './service.js'

/**
 * A service wired to this checkout's configuration and seed data.
 *
 * Everything injectable is injectable here: the clock, the id factory, the
 * transport, the event bus and the toggles. A test that needs two requests to
 * interleave passes repository hooks; a test that needs replayable ids passes an
 * id factory with a fixed seed.
 */
export function createApp(overrides = {}) {
  const config = { ...loadConfig(), ...(overrides.config ?? {}) }
  const clock = overrides.clock ?? createFixedClock()
  const idGen = overrides.idGen ?? createIdFactory({ seed: 0, prefix: 'ctx-' })
  const events = overrides.events ?? createEventBus({ clock })
  const transport = overrides.transport ?? (async () => ({ status: 200, body: { ok: true } }))

  const repository = createRepository({ records: config.records, hooks: overrides.hooks, events })
  const cache = createCache({ events })
  const auth = createAuth({ principals: config.principals, events })
  const client = createClient({ transport, events, clock })
  const audit = createAuditWriter({ events, clock })
  const worker = createWorker({
    handler: overrides.jobHandler ?? (async () => ({ done: true })),
    events,
    idGen,
  })
  const scheduler = createScheduler({ worker, events, clock, jobs: config.scheduled, idGen })

  const service = createService({
    config,
    events,
    auth,
    repository,
    cache,
    client,
    worker,
    scheduler,
    audit,
    clock,
    idGen,
    toggles: overrides.toggles,
  })

  return {
    config,
    clock,
    idGen,
    events,
    repository,
    cache,
    auth,
    client,
    audit,
    worker,
    scheduler,
    service,
    request: (req) => service.request(req),
    handle: (req) => service.handle(req),
  }
}
