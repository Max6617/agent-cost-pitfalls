/**
 * Span lifecycles.
 *
 * Every unit of work runs inside a span. A span is opened from the span that is
 * running at that moment, which makes the running span its parent, and it keeps
 * the trace id it was opened under. The only operation that mints a trace id is
 * `beginTrace` - everything else inherits.
 */
import {
  beginTrace,
  beginChild,
  isContext,
  contextOrAnonymous,
  currentTraceId,
  fields,
  runInContext,
} from './context.js'

/** A fresh root span. Use it when a unit of work is genuinely its own trace. */
export function rootSpan({ traceId, spanId, idGen } = {}) {
  return beginTrace({ traceId, spanId, idGen })
}

/** A span nested in whatever is running now. */
export function childSpan({ spanId, idGen } = {}) {
  return beginChild(contextOrAnonymous(), { spanId, idGen })
}

/**
 * Derived spans are opened from the span in flight. `seed` is for callers that
 * already know which span they are opening from (replays, re-entries); when it
 * is not a context it is ignored and the ambient span is used.
 */
export function spanOff(seed, { spanId, idGen } = {}) {
  return beginChild(isContext(seed) ? seed : contextOrAnonymous(), { spanId, idGen })
}

export function spanFields(context) {
  return fields(context)
}

/** The trace id in flight, or `undefined` when nothing is being traced. */
export function traceId() {
  return currentTraceId()
}

/**
 * Run `operation` inside `span`, restoring the previous span afterwards.
 * `operation` may be synchronous or return a promise; either way the store is
 * restored once it settles.
 */
export function runInSpan(span, operation) {
  return runInContext(span, operation)
}

/** `runInSpan`, for the common case where the caller has not opened the span yet. */
export function withSpan(operation, options = {}) {
  const span = options.root
    ? beginTrace(options)
    : beginChild(contextOrAnonymous(), options)
  return runInContext(span, () => operation(span))
}
