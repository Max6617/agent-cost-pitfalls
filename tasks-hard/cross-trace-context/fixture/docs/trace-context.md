# Trace context

Every unit of work this service performs reports a structured event, and every
event carries the request context it happened in. This is the contract the
dashboards, the alert rules and the audit export were built against. It was
agreed before the code was written; where the code disagrees with this document,
the code is wrong.

## 1. The context

A context is a frozen object with exactly three keys:

| key | meaning |
|---|---|
| `traceId` | the whole request. Every span in one trace shares it |
| `spanId` | the unit of work that is running right now |
| `parentSpanId` | the span this one was opened from. Absent on a root span |

Ids are minted by the injected id factory, never by the clock and never by a
random source, so a replayed run produces the same ids.

### The anonymous context

"There is no request context" is a state the service has to be able to describe,
not a state it is allowed to represent as `undefined`. Code that has no context
uses the **anonymous context**: the same three keys, all `undefined`. It is what
`contextOrAnonymous()` returns, what `runDetached()` installs, and what the
ingress of a job with no request behind it sees.

Consequences that callers rely on:

- `fields(context)` always returns an object with all three keys. A context that
  does not exist serialises as three empty keys, **never as `null`**, never as
  `undefined`, and never as a partial object with the keys missing.
- `runInContext(undefined, fn)` is legal and runs `fn` under the anonymous
  context. It is not an error and it does not leak the caller's context.
- A span derived from the anonymous context is a **root** span: it mints a trace
  id and has no `parentSpanId`. There is no such thing as a span whose parent is
  the anonymous context.
- `currentContext()` returns `undefined` only when literally nothing is running.
  Everything that emits an event goes through the bus, which uses the anonymous
  context in that case rather than writing `undefined` into the envelope.

## 2. The event envelope

`createEventBus({ clock })` stamps every event. A producer supplies `name` and
`meta`; the bus adds:

```js
{ at, name, traceId, spanId, parentSpanId, meta }
```

- `at` is `clock.now()`. Nothing in the service reads the system clock.
- the three context fields come from the context in flight at the moment the
  event is emitted.
- `meta` is the producer's own payload. It must not repeat the context: a
  `meta.traceId` or a `meta.spanId` is a bug, because two sources for one fact
  means one of them will be wrong.
- `emitWith(context, event)` emits under an explicit context instead of the one
  in flight, for a producer that is reporting something that happened under a
  span which has already closed. Passing a context that does not exist is the
  same as passing the anonymous one.

## 3. Span nesting

A span is opened **from the span that is running at that moment**, which becomes
its parent, and it inherits that span's trace id. The only operation that mints
a trace id is a root span.

| situation | span |
|---|---|
| the ingress frame of a request | whatever span is in flight; a root when the ingress is the outermost frame |
| a service-to-service call re-entered from inside the same process | a child of the calling span, so the caller and the callee share one trace |
| each outbound call to a downstream service | its own child span, nested in the span that made the call |
| each attempt of a retry loop | its own child span, opened from the span that owns the loop |
| a background worker job | a **new root**: a job begins its own work and does not continue somebody else's trace |
| a scheduler tick | a new root; each job the tick starts is a further root of its own |
| an auth check, a cache lookup, a repository read | no span of their own - they are steps of the request and report into the request's span |

Two rules that the nesting table is really about:

1. **No reuse.** Two different units of work never share a `spanId`. An outbound
   call that reports the caller's span id has made the downstream call invisible
   in the trace, which is exactly what the dashboard is looking for.
2. **No inheritance across an isolation boundary.** A worker job or a scheduler
   tick that inherits a `traceId` from whatever happened to be running when it
   was enqueued makes one trace out of two unrelated pieces of work. A job's
   events and the request's events must never share a trace id.

## 4. Errors

An error is raised while a span is running, and it carries that span as
`err.context` (this is what `AppError` captures in its constructor).

`mapError(err)` returns `{ status, body }` with:

```js
body = {
  error: { code, message, details },
  trace: { traceId, spanId, parentSpanId },   // the span the failure happened in
  cause: [ { name, message, code }, ... ],     // the error first, innermost last
}
```

- `trace` is the span from `err.context`, **not** the span that is running when
  the mapper is called. The mapper is usually reached from the ingress frame,
  after the span the failure happened in has been left; the client, the log line
  and the trace must still agree on one id.
- `cause` is the flattened cause chain, the error itself first and the innermost
  cause last. Each entry keeps its own `code`, so "the repository said not-found
  and the handler wrapped it" is readable from the body alone.
- An error with no context of its own maps to the anonymous context, not to
  `null`.

## 5. Audit

`const writer = createAuditWriter({ events, clock })`

- `record(action, meta)` is called while the request is running. The entry
  remembers the span that recorded it.
- `flush()` writes every pending entry as one `audit.written` event, **oldest
  first**, and is normally called once the request is over - the service flushes
  in `request()` after the ingress span has been left.
- An entry written after its span closed still carries that span: the trace shown
  for an audit line is the trace of the action that caused it, not the trace of
  whoever happened to flush the buffer.
- `audit.written` carries `meta: { action, seq, ...meta }` in the order the
  entries were recorded.
