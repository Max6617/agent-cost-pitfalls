# cross-error-taxonomy

**stratum:** cross-cutting
**prompt:** "The API's failures have stopped being useful. Clients cannot tell a record that is missing from one the service refused, because nearly everything comes back as a 500 with no code on it; the queue keeps retrying work that will never succeed; a store or a cache that is down looks the same as a record that does not exist; and when an error does surface, what actually went wrong underneath has been replaced by a generic message with nothing in it that support can tie back to the request. Bring the service in line with docs/error-policy.md - the tests under test/ are the reproductions we managed to write, not the whole acceptance criteria."

One policy — *every failure that crosses a module boundary is a domain error
with a stable code* — swept across ten modules. The contract is
`fixture/docs/error-policy.md`: the closed catalogue of codes, the four fields a
failure carries (code, `retryable`, the cause chain, and what the mapper needs),
which code wins when a caller wraps a cause, and the two ways retryability may be
adjusted. The fixture is a service that implements the policy in a few places,
half-implements it in others, and ignores it in the rest.

## Sub-problems (one hidden file each)

| file | cases | the modules that break the policy, and how |
|---|---|---|
| `01-taxonomy` | 4 | `errors.js`: `status` and `retryable` come from the call site (`?? 500`, `?? true`) instead of the catalogue; no client-safe message; a code that is not in the catalogue is carried through; `wrap` drops the cause and its correlation id; `chainOf` never walks |
| `02-requests` | 4 | `validate.js`, `auth.js`, `service.js`: bare `Error`s; a title measured in UTF-16 code units; tags not folded; a token expires a millisecond after its expiry instant; the use case validates the body before it authenticates |
| `03-repository-cache` | 5 | `repository.js`, `cache.js`: `findById` hands back `undefined` for a missing record; a store failure is reported as `INTERNAL`; `insert` overwrites instead of `CONFLICT`; `update` ignores `expectedVersion`; the cache swallows a read failure, re-labels the loader's failure as its own, and reports a failed write |
| `04-upstream` | 4 | `outbound.js`, `queue.js`: a bare `Error` for every answer; no correlation id on the outgoing call or the envelope; the broker is called before the envelope is validated; no clamp for an operation that is not idempotent |
| `05-files-jobs` | 4 | `importer.js`, `worker.js`: rows numbered over the lines of the file (so the first data row is 2); a bad row raises a bare `Error` with no row and no field; the worker records a string message, no code, and `willRetry: false` always; `jobId` is never checked |
| `06-response` | 4 | `mapper.js`, `http.js`: `code: null` and a fixed 500 for anything that is not ours; the technical message forwarded to the client; a response builder with a hard-coded 500 body and no correlation header |

`service.js` carries two rules of its own: authentication is decided before the
body is looked at, and a write that is not idempotent and failed for a retryable
reason is reported as `WRITE_NOT_APPLIED` with the store failure in the cause.

## Interaction cases (7 of 25)

| case | sub-problems it needs at once |
|---|---|
| `01` "a wrap keeps what it caught, however deep the chain runs" | the chain rule, three deep, and a wrapper with no context inheriting the id of the failure it wrapped |
| `02` "who is asking is settled before what they sent" | auth + validation ordering and the expiry instant boundary in one use case |
| `03` "a broken cache is not a missing record, and a miss is not a failure" | miss vs failed read vs failed write vs a loader failure passing through |
| `03` "a write that may have landed is not passed off as retryable" | repository + catalogue flags + the write rule in the use case (`WRITE_NOT_APPLIED` over a retryable `DEPENDENCY_UNAVAILABLE`) |
| `04` "a condition worth retrying is not a decision to retry this operation" | the clamp, on the outbound client and on the publisher, plus the unclamped case beside it |
| `05` "a job records the failure it hit, in the shape the API would answer with" | worker + mapper: `willRetry` is the mapped failure's retryability |
| `06` "a failure raised deep inside an import still names its row at the edge" | importer + service + mapper + response builder: `details.row` reaches the body as a 422 |

Beyond those, every file's non-interaction cases assert only what its own modules
decide (codes, details, control flow). The catalogue-derived `status`/`retryable`
of a raised code and the cause plumbing are asserted in `01` and end to end in
`06`, which is what keeps a one-module fix from moving another file's cases: a
single-group overlay gains `+3` (errors), `+2` (validate+auth), `+3`
(repository+cache), `+4` (outbound+queue), `+2` (importer+worker), `+2`
(mapper+http) over the floor.

## Guards (4 cases that already pass untouched)

- `01` the catalogue is one closed table — codes, statuses, client messages, sorted
- `02` a valid request creates a record the service can read back
- `03` a miss loads and stores, a hit does not load again
- `06` a success is a 200 with `data` and no `error`

The floor is exactly those four: on the untouched fixture nothing else passes.

## Measured

| arm | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 1/10 pass, exit 1 | **4/25 = 16%** |
| green the visible suite and stop | 10/10 pass, exit 0 | **8/25 = 32%** |
| visible suite plus the docs for the modules the reproductions point at | 10/10 pass, exit 0 | **14/25 = 56%** |
| reference | 10/10 pass, exit 0 | **25/25 = 100%** |

Arm 2 is a hand-written minimal patch: catalogue-driven `status`/`retryable` and
a kept cause in the error type, codes for validation/auth/not-found/upstream/row,
`INTERNAL` for a foreign error in the mapper, and the response body and
correlation header in the builder — with the cache, the publisher, the worker and
the use case untouched, and the row numbering, the tag folding, the clamp and the
cause-chain rules left as they were. It greens all ten visible cases and scores
32%, below the 40-60% aim rather than above it: the visible cases are deliberately
the easiest case of each sub-problem, and the ticket says so in as many words.
Arm 3 is the same starting point plus the doc rules for those modules (full
validator, repository, mapper) and scores 56%, which is where the middle of the
curve sits.

The visible suite is 10 cases across 3 files, at most two per sub-problem, and
it fails on the untouched fixture (9 of its 10 cases fail).

`reference/` changes 12 files — the eleven modules above plus `service.js` — each
a small edit rather than a rewrite; `catalogue.js`, `context.js`, `store.js`,
`limits.js`, `util/text.js` and `bin/serve.js` are already correct and are part of
the noise and the guards.

## Notes for whoever runs this

- Nothing reads a clock or a random source: `now`, the correlation id and record
  ids all come from the caller, and the transports, stores and broker are injected.
- Every hidden expectation is anchored in `docs/error-policy.md`, in the fixture
  README's public surface, or in the code's own naming; the suite imports only
  `../src/index.js`.
- The two most-missed rules in runs of this shape are the two that fight each
  other: retryability is never inherited from a cause, and the cache reports a
  failed read but not a failed write.
