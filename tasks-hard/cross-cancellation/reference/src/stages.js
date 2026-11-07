import { DeniedError } from './errors.js'
import { cacheKey } from './util/keys.js'

/**
 * The stages the pipeline is built out of.
 *
 * Every stage returns `{ stage, value, release }`. `release` is the stage's own
 * undo: the thing it must do if the request is cancelled after the stage has
 * run. A stage that holds nothing returns `release: null`, and that is a
 * statement, not an oversight - docs/pipeline-policy.md section 5 lists exactly
 * which stages hold something, and for how long.
 *
 * A stage reads the token but never decides for the pipeline: the pipeline asks
 * whether the run is cancelled between stages, and every stage that has already
 * run is released in reverse order.
 */

export function authStage(ctx, token) {
  const { request, policy } = ctx
  const principal = policy.authenticate(request)
  if (!principal) throw new DeniedError('no principal for ' + (request.route ?? '/'))
  ctx.state.principal = principal
  return {
    stage: 'auth',
    value: principal,
    release: null,
  }
}

export function cacheStage(ctx, token) {
  const { request, services } = ctx
  const principal = ctx.state.principal
  const key = cacheKey({ ...request, tenant: principal.tenant ?? request.tenant })
  if (services.cache.has(key)) {
    const value = services.cache.peek(key)
    services.cache.settle(key)
    return { stage: 'cache', value: { key, hit: true, value }, release: null }
  }
  const reservation = services.cache.begin(key, ctx.ref)
  if (!reservation) {
    // Another request holds the key: this one waits rather than reserving a
    // second time, so it holds nothing to give back.
    return { stage: 'cache', value: { key, hit: false, waiting: true }, release: null }
  }
  return {
    stage: 'cache',
    value: { key, hit: false, waiting: false },
    release: () => services.cache.release(reservation),
  }
}

export function limitStage(ctx, token) {
  const { request, services, policy } = ctx
  const principal = ctx.state.principal
  const key = policy.limiterKeyFor(request, principal)
  ctx.state.limiterKey = key
  if (!services.limiter.allowed(key)) {
    return { stage: 'limit', value: { key, reservation: null, limited: true }, release: null }
  }
  const reservation = services.limiter.consume(key)
  if (!reservation) {
    return { stage: 'limit', value: { key, reservation: null, limited: true }, release: null }
  }
  return {
    stage: 'limit',
    value: { key, reservation, limited: false },
    release: () => services.limiter.restore(reservation),
  }
}

export function queueStage(ctx, token) {
  const { request, services } = ctx
  const principal = ctx.state.principal
  const id = services.queue.submit({
    ref: ctx.ref,
    payload: { route: request.route, tenant: principal.tenant ?? request.tenant },
  })
  ctx.state.jobId = id
  return {
    stage: 'queue',
    value: { id },
    release: () => services.queue.remove(id),
  }
}

export function upstreamStage(ctx, token) {
  // The worker picks the job up and starts. From here on the job is in flight,
  // not waiting, and a cancellation does not call it back.
  if (ctx.state.jobId) ctx.state.job = ctx.services.dequeue()
  return {
    stage: 'upstream',
    value: { started: true },
    release: null,
  }
}
