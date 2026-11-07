# orders-api

A small in-process service that serves order records, calls a downstream
service and runs background jobs. Every module reports what it did as a
structured event, and every event carries the request context it happened in.

```
config/service.json     routes, principals, limits
data/records.json       the seeded records
docs/trace-context.md   the context contract - treat as the spec
src/                    the implementation
test/                   reproductions; a subset of what the dashboards check
```

## Use

```js
import { createApp } from './src/index.js'

const app = createApp()
const res = await app.request({ method: 'GET', path: '/read/r-1' })
// res = { status, body, span }

app.events.events()   // every event so far, oldest first
```

`createApp(overrides)` wires the real modules together and takes overrides for
everything a test needs to pin down: `clock`, `idGen`, `events`, `transport`,
`hooks` (per-record awaits, so two reads can be interleaved on purpose),
`jobHandler` and `toggles`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it.
- No dependencies and no network. Everything is in-process.
- **Time and ids are injected.** Nothing in the service reads the system clock
  or a random source: `createFixedClock()` and `createIdFactory({ seed })` are
  how a run is made replayable, and the tests depend on it.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the names it re-exports cannot.
- An event is `{ at, name, traceId, spanId, parentSpanId, meta }`. The three
  context fields are always present. `meta` never repeats them.
- A request returns `{ status, body, span }`. On a failure the body is
  `{ error, trace, cause }` - see `docs/trace-context.md`.
- Async is driven by promises everywhere. There are no timers in this service,
  and a test that needs two requests to interleave parks one on a repository
  hook.
