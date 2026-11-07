/**
 * Request context: the trace id, the span id and the parent span id that ride
 * along with every unit of work.
 *
 * A context is a plain frozen object with exactly three keys. It is stored in an
 * AsyncLocalStorage store, so code that is reached through an `await` still sees
 * the context that was active when the work started.
 *
 * The three keys:
 *   traceId        stable for the whole request, shared by every span in it
 *   spanId         identifies the unit of work that is running right now
 *   parentSpanId   the span this one was opened from; absent on a root span
 *
 * `docs/trace-context.md` is the contract.
 */
import { AsyncLocalStorage } from 'node:async_hooks'

/** The documented stand-in for "there is no request context". */
const ANONYMOUS = Object.freeze({ traceId: undefined, spanId: undefined, parentSpanId: undefined })

const storage = new AsyncLocalStorage()

/**
 * Ids are minted by a factory so that a run is as replayable as the caller needs
 * it to be. A process-wide default is used when nobody injects one.
 */
export function createIdFactory({ seed = 0, prefix = '' } = {}) {
  let n = seed
  const next = (kind) => {
    n += 1
    return prefix + kind + '_' + String(n).padStart(4, '0')
  }
  return {
    traceId: () => next('t'),
    spanId: () => next('s'),
  }
}

const processIds = createIdFactory()

/**
 * `{ traceId, spanId, parentSpanId }` for a context, ready to be spread into a
 * payload. A context that does not exist serialises as three empty keys; it is
 * never `undefined` and never `null`, so consumers can read the keys blindly.
 */
export function fields(context) {
  return {
    traceId: context ? context.traceId : null,
    spanId: context ? context.spanId : null,
    parentSpanId: context ? context.parentSpanId : null,
  }
}
export function isContext(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.traceId === 'string' && value.traceId.length > 0
}

/** A span that is not nested in anything. The only way a trace begins. */
export function beginTrace({ traceId, spanId, idGen = processIds } = {}) {
  return Object.freeze({
    traceId: traceId ?? idGen.traceId(),
    spanId: spanId ?? idGen.spanId(),
    parentSpanId: undefined,
  })
}

/**
 * A span opened from `parent`, which is whatever span was running.
 *
 * A span whose parent does not exist is a root: nothing above it was being
 * traced, so it starts a trace rather than hanging off a span that does not
 * exist and inheriting its absent trace id.
 */
export function beginChild(parent, { spanId, idGen = processIds } = {}) {
  const base = isContext(parent) ? parent : ANONYMOUS
  return Object.freeze({
    traceId: base.traceId ?? idGen.traceId(),
    spanId: spanId ?? idGen.spanId(),
    parentSpanId: base.spanId,
  })
}

export function currentContext() {
  return storage.getStore()
}

/** The running span, or the documented anonymous context. Never `undefined`. */
export function contextOrAnonymous() {
  return storage.getStore() ?? ANONYMOUS
}

/** The trace id in flight, or `undefined` when nothing is being traced. */
export function currentTraceId() {
  const ctx = storage.getStore()
  return ctx ? ctx.traceId : undefined
}

/**
 * Normalise anything a caller hands us into a context.
 * A missing context becomes the anonymous one, so downstream code cannot end up
 * with `undefined` in a payload.
 */
export function adopt(candidate) {
  if (candidate === undefined) return ANONYMOUS
  return candidate
}

export function runInContext(context, operation) {
  return storage.run(adopt(context), operation)
}

/** Run `operation` with no context at all, whatever was active before. */
export function runDetached(operation) {
  return storage.run(ANONYMOUS, operation)
}

/** The context a caller gets when no argument was supplied. */
export function anonymousContext() {
  return ANONYMOUS
}
