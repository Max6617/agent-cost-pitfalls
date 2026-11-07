# cross-cancellation

**stratum:** cross-cutting — ONE policy (a cancellation/deadline carried through
the pipeline) that is honoured in some places and ignored in others, so the score
tracks how much of the sweep got done.

**prompt:** "Cancelled requests are still costing us. A client hangs up and the
charge still goes through, the cache entry it was writing is gone or
half-written, and the rate-limit slot it took never comes back, so the next
caller is refused; support also has jobs running for callers who left minutes
ago. When we try to work out where a request died, the audit line says it was
cancelled but not where, and the deadline we pass in seems to make no difference
at all. Make the gateway behave the way docs/pipeline-policy.md says it does; the
tests under test/ are the reproductions we managed to write, not the whole
acceptance criteria."

## Six sub-problems (one hidden file each)

| file | cases | sub-problem | the bug in the fixture |
|---|---|---|---|
| `01-tokens` | 5 | the token, its two abort paths, and the deadline boundary | `tokens.js` `createDeadlineToken` accepts the clock and ignores it: a lapsed deadline is never an abort, and `linkTokens` never reports `'deadline'` |
| `02-cleanup` | 4 | releasing what the stages held | `limiter.js` `restore()` is a no-op (slots leak); `cache.js` `release()` deletes the stored **value** instead of only the reservation |
| `03-queue-upstream` | 3 | the queued job and the upstream call | `queue.js` `remove()`/`dequeue()` never take a job out of `pending`; `upstream.js` calls the upstream with an already-aborted signal and wraps a `Cancellation` into `UpstreamError` |
| `04-retry-timeout` | 4 | the retry and timeout wrappers | `resilience.js` `withRetry` never consults the token (it retries through a cancellation); `withTimeout` lets the timeout outrank the caller's abort |
| `05-audit` | 5 | the recorded outcome and stage attribution | `record.js` `cancel(reason)` drops the stage; `pipeline.js` writes the record only on some paths |
| `06-idempotent-cancel` | 4 | double cancel, committed work, and the run beside it | `pipeline.js` checks `input.token` at the ingress only; `tokens.js` `abort()` lets a later reason overwrite the first |

The policy is carried by one module (`src/tokens.js`) and consumed by seven
others. `pipeline.js` is the only place the checkpoints live, so a solution that
only fixes the token gets a lot of the suite, while one that only fixes the
stores gets very little.

## Measured

| arm | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 19/27 pass, exit 1 (8 fail) | **7/25 = 28%** |
| reference | 27/27 pass, exit 0 | **25/25 = 100%** |

Reference changes 8 files: `src/{tokens,pipeline,resilience,cache,limiter,queue,record,stages}.js`
— all small (about 90 changed lines on a 1,600-line fixture, so a sweep rather
than a rewrite). `src/upstream.js`, `src/policy.js`, `src/config.js`,
`src/errors.js` and the `src/util/` helpers are untouched and free to reorganise.

Two measured partial arms (reference files overlaid on the fixture, nothing else):

| arm | visible | hidden |
|---|---|---|
| "greens `test/`": `tokens.js` + `pipeline.js` + `queue.js` + the `resilience.js` import shim | 27/27 | **16/25 = 64%** |
| "pipeline fixed, stores not cleaned up": the same plus `stages.js` + `record.js`, without `cache.js`/`limiter.js` | 27/27 | **21/25 = 84%** |

The second arm is the gradient this batch wants: the cancellation policy can look
right in the pipeline and still lose the four cases that check what the cache
entry and the rate-limit slot look like afterwards.

## Interaction cases (7 of the 25)

1. **abort arriving during a retry attempt** — `04` "cancelling during an attempt
   stops the retries": no second attempt starts, `attempts` stays 1.
2. **a cancellation while the backoff is running** — `04` "cancelling while the
   backoff is running does not produce another attempt" (the token is tripped
   *inside* the injected `sleep`).
3. **a deadline that lapses between two stages** — `01` "a deadline that lapses
   while the upstream is answering stops the run there".
4. **a cancellation whose cleanup must itself not be cancelled** — `05`
   "cancelling during the wait between attempts releases the slot and the job":
   the release runs while the token is already aborted, the audit line is still
   written, and both stores are empty afterwards.
5. **a cancel after the work committed** — `06` "a cancellation after a run
   committed does not disturb what it committed", plus `02` "a cancelled request
   does not destroy the value another request stored".
6. **two concurrent pipelines, one cancelled** — `06` "two runs at once:
   cancelling one leaves the other untouched" (shared cache, limiter and queue).
7. **a cancellation between the queue submission and the job start** — `03` "a
   run cancelled after the job was queued never calls the upstream" (the abort
   comes from the `onStage` hook at `queue`).

Two more cases are interactions the visible suite never touches: `01` "an abort
while the run waits on the upstream ends it and discards the answer" (answer
discarded, `response: null`, audit stage `upstream`) and `02` "a cancelled
request keeps the reservation it found someone else holding" (the
reservation-versus-value distinction, which only matters when two requests share
a key).

## Guards (pass on the untouched fixture on purpose — the floor)

- `01` a token keeps the first reason it was given, and `abort()` with no
  argument cannot erase it
- `01` a deadline that has already lapsed cancels at the ingress, before any
  stage runs
- `02` a run that completes stores its answer under the key it reserved
- `03` a cancellation out of the upstream ends the run without a retry
- `05` a completed run records the attempts it made and no cancellation
- `05` a cache hit is recorded as reused with no upstream calls
- `06` an already-aborted token does not leak into the run beside it

7 cases the untouched fixture already passes, out of 25 (28%). They are the floor
the sweep has to keep while it fixes the rest, and they stop a rewrite from
breaking the mainline.

## Notes for whoever tunes this later

- The mainline (nothing cancelled anywhere) is `02`'s completed run, `05`'s
  completed record and `05`'s cache hit: roughly a third of the suite is "nothing
  was cancelled and nothing changed", which is what the brief asks for.
- Every expectation is anchored in `docs/pipeline-policy.md`: the result shape,
  which stage is blamed, the `clock() >= at` boundary, "cancellation outranks
  the timeout", "the record is written for every run", and the three release
  properties. Nothing is guessable only from the hidden suite.
- Everything is driven by injected functions; the hidden suite contains no timer,
  no real clock and no `setTimeout`. Async is driven by explicit resolved
  promises and injected `sleep`s, and every case is independent (fresh stores per
  case, no module-level mutable state).
- `onStage` exists so a case can cancel at an exact boundary. It is documented in
  `docs/` as diagnostics, and a token tripped inside it is observed at the next
  checkpoint like any other abort.
