# Pipeline policy

The cancellation and deadline policy the gateway is supposed to implement. The
platform team agreed this before the first stage was written; where `src/`
disagrees with this document, this document is right and the code is the bug.

## 1. Tokens

A cancellation token is the only thing a stage may consult to find out whether
it is still wanted:

```js
{
  aborted,            // boolean property, not a method
  reason,             // null while live; a string once aborted
  abort(reason?),     // trip it. reason defaults to 'aborted'
  rethrow(),          // throw the cancellation if aborted, otherwise return
  whenAborted(),      // a promise that settles when/if it aborts
}
```

Rules:

- **Aborting is idempotent.** The first reason wins; a later `abort(...)` does
  not change it and does not throw. `abort(undefined)` is an abort with reason
  `'aborted'`, not a no-op, and it cannot overwrite a reason that is already set.
- **Cancelling twice is cancelling once.** With `rethrow()` the second abort is
  invisible: nothing observable changes.
- `reason` is `null` on a live token, never `undefined`.
- `rethrow()` throws the `reason` itself when the reason is an `Error`, and a
  `Cancellation` (whose `reason` property is the string) otherwise.
- `reason` and `aborted` may be implemented as getters. They are recomputed on
  every read: time moves, and a deadline is a question, not an event.
- `linkTokens(...)` combines tokens and reports the reason of the **first source
  that aborted**, searching the sources in the order they were passed.

### 1.1 Deadlines

`createDeadlineToken(at, clock)` returns a token that is aborted once the
injected clock says the deadline has arrived. `clock` is a function returning
milliseconds and is the only clock in the process - there is no real time here.

A deadline at `at` is **expired when `clock() >= at`**. There is no grace: at
exactly `at` the request is already cancelled, one millisecond before it is not.
A passed deadline is observed at the same points an abort is (section 3), so a
deadline that lapses while the gateway is working stops the request at the next
checkpoint, and the deadline a run was given is the deadline the whole run is
measured against.

## 2. The result

`pipeline.run(input)` **resolves for a request that was cancelled**, and rejects
only for a denial, a rate limit, a timeout or an upstream failure (section 8).

| field | completed | cancelled |
|---|---|---|
| `status` | `'completed'` | `'cancelled'` |
| `cancelled` | `false` | `true` |
| `stage` | `null` | the stage that observed the cancellation |
| `reason` | `null` | `'deadline'`, or the caller's reason |
| `committed` | `true` | `false` |
| `response` | the upstream's answer, or the cached one | `null` |
| `reused` | `true` only for a cache hit | `false` |
| `attempts` | how many upstream calls were made | how many were made before the abort |
| `ref` | the run's ref | the run's ref |
| `stages` | every stage that executed, in order | same |

`stages` is the trace: it lists a stage **when that stage ran**, so a stage that
was never reached does not appear. It always ends with `record` and `cleanup`,
because those two run for every request (section 4). A run cancelled before it
starts is `stages: ['record', 'cleanup']`.

A partial success is never a result. There is no `status: 'completed'` with an
empty `response`, and a cancelled run never carries a `response` or `reused`.

## 3. Where cancellation is observed and which stage is blamed

Stages run in this order:

```
ingress -> auth -> cache -> limit -> queue -> upstream -> record -> cleanup
```

The pipeline checks the run's token **before the first stage** and **at every
stage boundary** (before each stage and again when it returns). The first
checkpoint that sees an aborted token ends the run, and `result.stage` is that
checkpoint's stage:

- the run's token is already aborted when `run()` is called: `stage` is
  `'ingress'`, and no stage has run;
- a token tripped while stage *S* was working is observed at the boundary after
  *S*, so `stage` is *S*;
- a token tripped between two stages is observed at the next stage's boundary,
  so `stage` is the stage that did **not** start;
- a token tripped while the upstream was answering is observed at the boundary
  after `upstream`, so `stage` is `'upstream'` and the answer is thrown away.

`reason` is the caller's abort reason if the caller aborted the run, and
`'deadline'` if the deadline lapsed without an abort - including for a run whose
deadline had already passed when it was called.

`run({ onStage })` is diagnostics: the hook is called with each stage's name as
the stage is entered, so a caller can watch a run without changing it. It is not
part of the policy, and a token tripped inside it is observed exactly like a
token tripped anywhere else - at the next checkpoint.

## 4. The record is not optional

`record` and `cleanup` are **steps of every run**, not stages that a checkpoint
can skip: a cancelled request is exactly the request whose audit line matters,
and no caller can abort its way past them. One audit line per run, written once,
at `record` - including for a run cancelled at `ingress`.

The line for a cancellation carries both the cause and the place:

```js
{ kind: 'cancelled', reason: 'deadline', stage: 'queue' }
```

`stage` is the same stage the result names. A line that says only `cancelled`,
or that says the request finished when it did not, is a bug.

Whatever `record` and `cleanup` write is **never** rolled back. Undoing
bookkeeping is how a run becomes invisible, so `record` has no undo. The line
for a run that finished is:

```js
{ kind: 'completed', ref, reused, calls, response }
```

## 5. What a stage holds

| stage | held from | given back by |
|---|---|---|
| `auth` | nothing | - |
| `cache` | the moment the key is reserved | `cache.release(reservation)` |
| `limit` | the moment the slot is taken | `limiter.restore(reservation)` |
| `queue` | the moment the job is submitted | `queue.remove(jobId)` |
| `upstream` | nothing | - |

A reservation is taken only if nobody else holds the key: `cache.begin` returns
`null` to a request that finds one, and that request holds nothing to give back.
On cancellation the stages that ran are undone **last-in, first-out**, before the
audit line is written and before the result is handed back. Three properties
matter, and they are the ones that keep coming back as incident reports:

1. **A cancelled request writes no cache value and destroys no cache value.**
   Rolling back a reservation removes the reservation and nothing else: a value
   another request stored under that key stays, and a reservation another request
   still holds stays with it.
2. **A released rate-limit slot comes back.** Capacity spent on a request that
   was never answered must be spendable again, immediately.
3. **A cancelled job is not left in the queue.** Removing a queued job takes it
   out of the queue, so no worker ever picks it up. A job a worker has already
   claimed is a different matter: work that has begun is not undone, and a
   cancellation after that point does not call it back.

Cancellation-safe releases: an undo runs even when the token that caused it is
already aborted, and an undo that is run twice has the effect of running it once.
A release that consults the token and decides to skip its work is not a release.

## 6. The upstream call

The upstream is injected as `upstream({ request, signal })`, where `signal` is
the run's token. It reports a cancellation by rejecting with a `Cancellation`
(reason `'aborted'`).

- The upstream is **not called at all** once the token is aborted - not with an
  already-aborted signal, not to be told about it afterwards. A cancelled
  request makes no upstream call, and `attempts` stays `0` when the run never
  got that far.
- An attempt that starts and is aborted mid-flight is **abandoned, not
  returned**: an answer that arrives after the caller gave up is discarded, and
  the run is cancelled rather than completed.
- A `Cancellation` out of the upstream is a cancellation, not an upstream
  failure: it must not be wrapped into `UpstreamError`, and it must not be
  retried.

## 7. Retry and timeout

### 7.1 Retries

`withRetry` makes up to `retry.maxAttempts` attempts, waiting `retry.backoffMs`
between them, and stops early on a failure the policy calls non-retryable.

Cancellation outranks retrying: a run that is cancelled during an attempt, or
during the wait between two attempts, ends there. **No further attempt is
started** after the token aborts, and the run does not wait out a backoff it no
longer wants - the wait itself is interruptible.

### 7.2 Timeout

`timeoutMs` is the ceiling on one request. It is a failure (`TimeoutError`), and
it is never an override: **cancellation outranks the timeout.** A run whose
caller aborted while the upstream was still thinking is a cancelled run even if
the clock ran past the timeout in the meantime, and the cancellation is reported
with the caller's reason rather than `'deadline'` or a timeout.

## 8. Failures

These reject. None of them is cancellation, and none of them may be reported as
one:

| situation | error | `kind` |
|---|---|---|
| no principal for the request | `DeniedError` | `denied` |
| the limiter has no slot for the caller | `RateLimitedError` | `rate-limited` |
| the upstream did not answer within `timeoutMs` | `TimeoutError` | `timeout` |
| the upstream threw something that is not a cancellation | `UpstreamError` | `upstream` |

Every one of them still writes its audit line, still gives back what the stages
that ran were holding, and still leaves `cleanup` and `record` in `stages`. A
failed run is not a cancelled run: it rejects.
