# Failure policy

Every module in this service can fail, and a failure that crosses a module
boundary has to look the same to whoever catches it. This is the contract the
platform team signed off; `src/` is the implementation, and when the two
disagree this document is right and the code is a bug.

## 1. A failure that crosses a boundary is a domain error

A module never lets a bare `Error` (or a string, or an upstream object) out of
its own boundary. It raises a domain error carrying:

| field | meaning |
|---|---|
| `code` | the stable code, from the catalogue in section 2 |
| `status` | the HTTP status for that code, from the catalogue |
| `retryable` | whether the *operation* may be tried again — see section 5 |
| `clientMessage` | the message a client may see, always the catalogue's |
| `message` | the technical message, for logs. Clients never see it |
| `correlationId` | the operation this failure belongs to — see section 6 |
| `cause` | what actually went wrong underneath, when there is something |
| `details` | the extra fields a client needs to act on *this* code |

`message` and `clientMessage` are different things and they are not
interchangeable: `message` is what an engineer reads in the log, `clientMessage`
is what a customer reads in the response, and it is always the catalogue's
message for the code.

## 2. The catalogue is closed

The catalogue in `src/catalogue.js` is the complete list of codes this service
may report. Nothing outside `src/` invents a code, and no code is reported that
is not in this table:

| code | status | retryable | client message |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | no | The request could not be accepted. |
| `UNAUTHENTICATED` | 401 | no | Sign in to continue. |
| `FORBIDDEN` | 403 | no | You do not have access to this resource. |
| `NOT_FOUND` | 404 | no | The requested record does not exist. |
| `CONFLICT` | 409 | no | The record changed since you read it. |
| `DUPLICATE_JOB` | 409 | no | That job has already been accepted. |
| `ROW_INVALID` | 422 | no | The file contains a row that could not be imported. |
| `RATE_LIMITED` | 429 | yes | Too many requests. Try again shortly. |
| `INTERNAL` | 500 | no | Something went wrong on our side. |
| `JOB_FAILED` | 500 | no | The job did not complete. |
| `WRITE_NOT_APPLIED` | 500 | no | The write was not applied. |
| `UPSTREAM_REJECTED` | 502 | no | An upstream service refused the request. |
| `UPSTREAM_UNAVAILABLE` | 502 | yes | An upstream service is unavailable. |
| `DEPENDENCY_UNAVAILABLE` | 503 | yes | A supporting service is unavailable. |
| `UPSTREAM_TIMEOUT` | 504 | yes | An upstream service did not answer in time. |

A failure that arrives with a code from somewhere else — a Node `code` such as
`ENOENT`, an upstream's own vocabulary, a typo — is not a domain error and has
no code here. It is reported as `INTERNAL`. That holds whichever side of a
boundary the code came from: a module that raises a code this table does not
contain has raised `INTERNAL`. The service never forwards a code it does not
own: a client that switches on a code must be able to switch on *this* table and
nothing else.

A module raising a code does not choose its `status` or its `retryable`; the
catalogue decides both. The only thing a call site may say about retryability is
"not this one" (section 5). Nothing may raise a code's retryability above the
catalogue's.

## 3. Wrapping keeps the cause

Most failures are somebody else's failure plus context. Wrapping one is
`wrap(cause, code, …)`, and a wrap **always** keeps the value it caught as
`cause`. A wrap that replaces the cause with its own message throws away the
only thing an on-call engineer has.

`chainOf(error)` returns the codes of the failure and of every cause that is
itself a domain error, outermost first. The walk stops at the first cause that
is not a domain error, because that one has no code to report.

```js
wrap(wrap(wrap(new Error('socket hang up'), 'UPSTREAM_TIMEOUT'),
           'DEPENDENCY_UNAVAILABLE'),
     'WRITE_NOT_APPLIED')
// chainOf(...) === ['WRITE_NOT_APPLIED', 'DEPENDENCY_UNAVAILABLE', 'UPSTREAM_TIMEOUT']
```

When a cause is itself a domain error, its code survives the wrap untouched.
The code that crosses the boundary is the one the **outermost** module raised:
the outermost conversion wins for `code`, `status` and `retryable`, and the
cause keeps its own. The two are never merged, and in particular retryability is
never inherited from a cause — the caller repeating the *outer* operation is not
the same thing as the inner module repeating its own.

## 4. Every module raises domain errors

| module | what it raises |
|---|---|
| request validation | `VALIDATION_FAILED`, with `details.fields` — every offending field name, deduplicated and sorted |
| auth | `UNAUTHENTICATED` when there is no usable token, `FORBIDDEN` when the token is fine but the scope is not |
| repository | `NOT_FOUND`, `CONFLICT`, and `DEPENDENCY_UNAVAILABLE` when the store itself fails |
| cache | `DEPENDENCY_UNAVAILABLE` when the cache itself fails — and nothing else, ever. See section 7 |
| outbound client | a code per upstream answer — see section 8 — or `UPSTREAM_UNAVAILABLE` when the transport itself fails |
| queue publisher | `VALIDATION_FAILED` for an envelope it cannot build, `DUPLICATE_JOB` when the broker says the job is already there, and `DEPENDENCY_UNAVAILABLE` when the broker cannot be reached |
| importer | `VALIDATION_FAILED` for a file it cannot read at all, `ROW_INVALID` for a row it cannot accept — see section 9 |
| worker | records the failure the job hit; never lets it escape as a bare value — see section 10 |

Authentication is checked **before** validation, and before anything is read or
written: a request with no usable token is `UNAUTHENTICATED` even if its body is
also nonsense. A caller that is authenticated but not allowed is `FORBIDDEN`,
not `UNAUTHENTICATED` — the two are different problems and clients fix them
differently.

### The repository

- `findById(id)` returns the record, or raises `NOT_FOUND` with `details.id`. It
  never hands a caller `null` or `undefined` in place of a record that is not
  there: the caller collides with the missing value three layers up and the
  client is then told the wrong thing about why.
- `insert(record)` writes a new record at `version: 1` and answers
  `{ created: true, record }`. If the store already holds that `id` the write is
  refused as `CONFLICT` with `details.id`. If it already holds that
  `idempotencyKey` the record is not written a second time: the stored one comes
  back as `{ created: false, record }`.
- `update(id, patch, { expectedVersion })` writes the next version. A missing
  record is `NOT_FOUND`; an `expectedVersion` that is not the stored `version`
  is `CONFLICT` with `details.expected` and `details.actual`, and nothing is
  written.
- The store is a dependency: anything it throws while a record is being read or
  written is `DEPENDENCY_UNAVAILABLE`, with the thrown value in the cause.

## 5. Retryability belongs to the operation

The catalogue's `retryable` column says whether the **condition** is worth
trying again. Whether **this attempt** may be repeated is a property of the
operation, and there are exactly two adjustments a call site may make:

- **Clamp.** An operation that is not idempotent (`idempotent: false`, or a job
  started with `repeatable: false`) reports a catalogue-retryable condition with
  `retryable: false`. The code and the status are the condition's; only the flag
  changes.
- **A write that may have landed.** A non-idempotent write whose failure is
  retryable in the catalogue may already have been applied, so the retryable
  condition is not what the client is told: the write is reported as
  `WRITE_NOT_APPLIED` (500, not retryable) with `details.id` and the underlying
  failure in the cause. A write carrying an `idempotencyKey` is repeatable, so
  its failure is reported unchanged and the client may safely try again. A
  failure that is not retryable is no reason to repeat anything, so it is
  reported as it is.

Nothing else adjusts the flag. In particular, retryability is never inherited
from a cause and never merged with it: a caller that catches a retryable failure
and converts it to one of its own reports **its own** code and **its own** flag,
and the failure it caught stays in the cause with its own.

## 6. The correlation id

Every operation runs under a context (`newContext(correlationId)`). Every domain
error carries the correlation id of the operation that raised it, and a wrapper
that was given no context of its own inherits the id from the failure it is
wrapping. The service never invents an id — no clock, no counter, no random
source — so an operation that arrived without one has `null` and says so.

## 7. The cache is not a source of truth

`lookup(key, loader)` consults the cache and falls back to the loader.

| situation | result |
|---|---|
| hit | `{ value, hit: true }`; the loader is not called |
| miss | `{ value, hit: false }` with the loader's value. **A miss is not a failure** and is never reported as one |
| the backing cache throws on **read** | `DEPENDENCY_UNAVAILABLE`; the loader is not called |
| the backing cache throws on **write** | the value is returned with `hit: false`; a failed write is not reported, because nothing was lost |
| the loader fails | the loader's failure, unchanged: same code, same status, same flag, same cause |

A cache that cannot be consulted means the request cannot be answered, so that
one is reported rather than hidden: silently falling back turns a cache incident
into a database incident at three times the traffic. A failed *write* is the
other way round — the value is already in hand.

The cache never re-labels the loader's failure and never swallows it. A missing
record stays `NOT_FOUND`; it does not become a cache problem because the cache
was consulted on the way.

## 8. Upstream answers

The client takes an injected transport, so the mapping is the client's job:

| upstream answer | code |
|---|---|
| any 2xx | not a failure; the body is returned |
| 400, 422 and other 4xx that are not below | `UPSTREAM_REJECTED` |
| 404 | `NOT_FOUND` |
| 409 | `DUPLICATE_JOB` |
| 429 | `RATE_LIMITED` |
| any 5xx | `UPSTREAM_UNAVAILABLE` |
| the transport throws | `UPSTREAM_UNAVAILABLE`, with the thrown value as the cause |

Every outbound call carries the correlation id on `headers['x-correlation-id']`,
and every published envelope carries it as `correlationId`.

The publisher validates the envelope **before** it touches the broker: a job
without a `jobId` is `VALIDATION_FAILED` with `details.fields: ['jobId']`, and
the broker is not called at all. A broker answer that is not 2xx is
`DEPENDENCY_UNAVAILABLE` with `details.status`, or `DUPLICATE_JOB` for a 409.

## 9. Files and rows

The importer reads plain, unquoted CSV: a header line `id,title,quantity,tags`
and then one record per line, with tags separated by `;`. A title may not
contain a comma.

- A header that is not exactly that line is `VALIDATION_FAILED` with
  `details.fields: ['header']`.
- A **row number** counts data lines after the header, starting at 1. Blank
  lines — empty, or nothing but spaces — are not data lines: they are skipped
  and do not advance the count.
- A row whose fields do not pass the same rules as a request body is
  `ROW_INVALID`, with `details.row` (the row number) and `details.fields` (the
  offending field names, sorted). A row with the wrong number of fields names
  `row` itself: `details.fields: ['row']`.
- More than 500 data rows is `VALIDATION_FAILED` with `details.fields: ['rows']`.
- An import is all or nothing: the first bad row stops it, and the row number is
  how the operator finds it. A row number that is off by the header line is
  worse than useless.

## 10. Jobs

`runJob(job, handler, { ctx })` runs a handler and records what happened. A job
without a `jobId` is `VALIDATION_FAILED` with `details.fields: ['jobId']`.

A job that fails is recorded, not thrown: the record carries the **mapped**
failure — the same `code`, `status`, `retryable`, `message` and `correlationId`
the API would return for it — plus `willRetry`, which is `true` only when that
failure is retryable. A handler that throws something which is not a domain
error has no code to record, so the job is recorded as `JOB_FAILED` (500, not
retryable) with the thrown value in the cause; an unknown failure is never
retried automatically.

## 11. The response

What the edge sends back — `buildSuccess` for a use case that returned,
`buildErrorResponse` for one that threw:

- `status` is the mapped status.
- `headers['content-type']` is `application/json`.
- `headers['x-correlation-id']` is the correlation id, when there is one.
- A failure body is `{ error: { code, message, retryable, correlationId } }`,
  plus `details` when the code carries any. `message` is the client-safe
  message: the internal one never appears in the body, in a header, or anywhere
  else in the response.
- A success body is `{ data: … }` and carries no `error` key.
