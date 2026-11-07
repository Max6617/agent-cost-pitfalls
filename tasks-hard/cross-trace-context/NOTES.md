# cross-trace-context

**stratum:** cross-cutting — ONE policy (a request/trace context on every event and
every error) whose effects span ten modules, checked at each call site separately
plus a few properties that only hold when every site is consistent.

**prompt:** "The traces on our dashboards stopped lining up. Jobs that the worker
picks up show no request id at all, a failure that reaches the client comes back
stripped of the id its own log line has, a cache hit is attributed to the span
that filled the cache instead of the request that replayed it, and when two
requests are in flight their events turn up under one id. Make the service emit
and return a request context the way docs/trace-context.md says it must; the tests
under test/ are the reproductions we managed to write down, not the whole
acceptance criteria."

## Sub-problems (one hidden file each)

| file | sub-problem | where the fixture drops the context |
|---|---|---|
| `01-context` | the context object: a root, a child, and what "no context" serialises as | `context.js` `fields()` writes `null` for a missing context (the contract says three empty keys, never `null`); `adopt()` maps only `undefined` to anonymous, not `null` |
| `02-http-path` | one trace id from the ingress frame to the outbound call, correctly nested | `service.js` `request()` opens its own span *and* `handle()` opens another, so the span a caller is handed is a child of a span nobody can name |
| `03-repo-cache` | the repository and the cache report into the request span | `cache.js` emits with `events.emitWith(null, …)`, and `events.js` `emitWith()` ignores the explicit context it is handed and reads the ambient store instead |
| `04-errors` | the mapper reports the span the failure happened in, and keeps the cause chain | `errors.js` `mapError()` writes `fields(null)` instead of the span the error carries |
| `05-worker-scheduler` | a worker job and a scheduler tick begin their own trace | `worker.js` `runJob()` takes `job.span ?? contextOrAnonymous()`, so a job inherits whatever span happened to be in flight |
| `06-audit-retry` | an entry written after its span closed still carries that span; each retry attempt is its own child span | `audit.js` records `context: null` and flushes with `emitWith(undefined, …)`, so an entry loses the span it was recorded under |

Six modules change: `context.js`, `cache.js`, `audit.js`, `errors.js`,
`worker.js`, `service.js`.

`events.js` has to be understood before `cache.js` and `audit.js` can be fixed:
`emitWith(context, event)` is documented to stamp the event from the context it is
handed, and the fixture's version drops the argument on the floor. An agent that
only reads `cache.js` will "fix" the cache by switching it to `emit()`, which is a
different bug in the making — the ambient context is right for a miss and wrong
for a replayed entry.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 8/19 pass, exit 1 | **6/25 = 24%** |
| reference | 19/19 pass, exit 0 | **25/25 = 100%** |

Partial credit, measured by overlaying single reference files on the fixture:

| overlay | hidden pass |
|---|---|
| none (fixture) | 6/25 (24%) |
| `context.js` only | 8/25 (32%) |
| `cache.js` only | 6/25 (24%) |
| `worker.js` only | 11/25 (44%) |
| `audit.js` only | 12/25 (48%) |
| `errors.js` only | 11/25 (44%) |
| `service.js` only | 6/25 (24%) |
| everything except `context.js` | 22/25 (88%) |
| everything except `worker.js` | 20/25 (80%) |
| all six | 25/25 (100%) |

Each call site is worth 2-6 cases and the last 12% is the interaction between the
context object and every producer, so a solution that greens the visible suite
lands in the 40-60% band rather than near 100%.

## Interaction cases (7 of 25)

1. `02` — a request re-entered from inside a trace joins that trace: the nested
   request shares the trace id and is a child of the calling span, and two
   sub-requests never share a span id (sub-problems 1 + 2).
2. `02` — two requests in flight at once, interleaved on a repository hook, must
   not bleed into each other (sub-problems 2 + 3).
3. `03` — a cached response replayed by a later request is reported under the
   *current* trace, not the one that filled the cache (sub-problems 3 + 1: the
   `emitWith` path has to work before the cache can be right).
4. `05` — a worker job that fails is attempted three times, each attempt a root of
   its own, and the error it raised keeps the trace of the attempt while the
   client is served the 503 in the request trace (sub-problems 5 + 4).
5. `06` — an audit entry recorded inside a span and written after that span closed
   carries the span that recorded it, including an entry from a nested span
   (sub-problems 6 + 1).
6. `06` — each retry attempt is its own child span of the span that owns the loop,
   and a failure the loop gives up on is mapped under the attempt that raised it
   (sub-problems 2 + 4).
7. `01` — every event of a request has all three context fields, no `null` and no
   repetition in `meta`, which only holds when all ten producers agree.

## Guards (pass on the untouched fixture on purpose)

- `01` — a root span mints a trace id and has no parent (the derived-span and
  anonymous-parent cases are folded into the same case).
- `02` — an outbound call reports itself in a span of its own.
- `03` — the cache does not rewrite the record it stored, and a read with nothing
  running serialises as three empty keys.

Three guards keep the floor at 12%. Cases the fixture passed by accident were
rewritten or folded into a larger case rather than kept, because every extra guard
compresses the gradient.

## Notes for the study owner

- Every case drives async with explicit promises. The only interleaving is a
  deferred that a repository hook awaits; there are no timers anywhere, in the
  fixture or in either suite.
- Ids and time are injected (`createIdFactory`, `createFixedClock`), so no case
  depends on wall-clock time or on a module-global counter.
- Both suites import only `../src/index.js`.
