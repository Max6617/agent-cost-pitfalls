/**
 * The service.
 *
 * Wires the modules together and is the only place that decides which span a
 * request runs in. Everything below it - routing, authorising, the repository,
 * the cache, the outbound client - runs in the span the ingress opened and
 * reports what it did through the bus.
 *
 * The ingress never looks at the caller's tracing headers: a trace id that
 * arrives in a header is the caller's business, and reusing it would let two
 * unrelated requests land in one trace.
 */
import { childSpan, runInSpan } from './tracing.js'
import { createRouter } from './router.js'
import { sanitizeRequest, callerRequestId } from './sanitize.js'
import { mapError, isRetryable, ValidationError } from './errors.js'
import { retryingSend } from './retry.js'

export function createService({
  config = {},
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
  toggles = {},
} = {}) {
  if (!events) throw new TypeError('createService needs an event bus')
  if (!auth) throw new TypeError('createService needs the auth checker')

  const resolveUrl = (body) => (typeof body.url === 'string' && body.url.length > 0 ? body.url : config.defaultUrl)

  const record = (action, meta) => audit?.record(action, meta)

  const handlers = {
    read: async ({ params }) => {
      const key = config.cachePrefix + params.id
      record('record.read.requested', { id: params.id })
      const cached = cache.lookup(key)
      if (cached.hit) return { status: 200, body: { record: cached.record, cached: true } }
      const record_ = await repository.get(params.id)
      cache.store(key, record_, clock ? clock.now() : undefined)
      return { status: 200, body: { record: record_, cached: false } }
    },

    write: async ({ params, body }) => {
      if (typeof body.status !== 'string') {
        throw new ValidationError('a write needs a status', { details: { id: params.id, field: 'status' } })
      }
      const next = { id: params.id, ...body }
      const saved = await repository.put(next)
      cache.drop(config.cachePrefix + params.id)
      record('record.written', { id: params.id })
      return { status: 200, body: { record: saved } }
    },

    send: async ({ body }) => {
      const url = resolveUrl(body)
      record('call.sent', { url })
      // A call that can be retried goes through the retry loop, so that a slow
      // or failing attempt is a span of its own under the request.
      const response = await retryingSend(
        client,
        { method: body.method ?? 'POST', url, body: body.payload },
        {
          attempts: body.attempts ?? config.attempts,
          shouldRetry: (err) => isRetryable(err),
          events,
        },
      )
      return { status: 200, body: { downstream: response.status ?? 200, url } }
    },

    diagnose: async ({ body }) => {
      const outcome = await client.send({ method: 'GET', url: resolveUrl(body) })
      return { status: 200, body: { downstream: outcome.status ?? 200 } }
    },

    enqueue: async ({ body }) => {
      const job = { name: body.job ?? 'reindex', payload: body.payload ?? {} }
      record('job.enqueued', { job: job.name })
      const value = await worker.run(job)
      return { status: 202, body: { job: job.name, value } }
    },

    tick: async ({ body }) => {
      const due = Array.isArray(body.due) ? body.due : config.scheduled
      const results = await scheduler.tick({ now: body.now ?? (clock ? clock.now() : undefined), due })
      return { status: 200, body: { results } }
    },

    auditOnly: async ({ body }) => {
      record(body.action ?? 'manual.entry', body.meta ?? {})
      return { status: 200, body: { recorded: true } }
    },

    status: async () => ({ status: 200, body: { ok: true } }),
  }

  const routes = (config.routes ?? []).map((route) => ({ ...route, handler: handlers[route.handler] }))
  const router = createRouter({ routes, auth, events })

  const finish = (status, body) => ({ status, body })

  /**
   * Handle one request: one span, opened under whatever is running.
   *
   * The response body comes back with the span the request ran in, so a caller
   * can line a response up against the events it produced.
   */
  async function handle(rawRequest) {
    const request = sanitizeRequest(rawRequest)
    const claimed = callerRequestId(request.headers)
    // The request runs in a span of its own, opened from whatever is running:
    // entered with nothing running that span is a root.
    const ingress = childSpan()
    return runInSpan(ingress, () => dispatchRequest(request, claimed, ingress))
  }

  async function dispatchRequest(request, claimed, ingress) {
    events.emit({
      name: 'ingress.request',
      meta: { method: request.method, path: request.path, callerRequestId: claimed },
    })

    let response
    try {
      const result = await router.dispatch(request)
      response = finish(result?.status ?? 200, result?.body)
    } catch (err) {
      const mapped = mapError(err)
      response = finish(mapped.status, mapped.body)
    }

    events.emit({
      name: 'ingress.response',
      meta: { method: request.method, path: request.path, status: response.status },
    })
    return { ...response, span: ingress }
  }

  /**
   * `handle`, with the audit buffer released once the request is over.
   *
   * The flush happens after the ingress span has been left, which is the point
   * of the exercise: what an entry was about was decided when it was recorded,
   * not when the buffer was emptied.
   */
  function request(rawRequest) {
    // Nothing to establish here: the ingress frame is opened by `handle`, from
    // whatever span this call was entered in.
    return handle(rawRequest).then((result) => {
      audit?.flush()
      return result
    })
  }

  return {
    handle,
    request,
    events,
    router,
    handlers,
    routes: router.routes,
  }
}
