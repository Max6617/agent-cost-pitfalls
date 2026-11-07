# repo-wide-timeout-policy

**stratum:** repo-wide
**prompt:** "Every outbound call in this app is supposed to take its timeout from the one policy agreed in docs/timeout-policy.md, but the callers have drifted from it: we're seeing requests run well past the hard ceiling, a database call that treats a zero timeout as 'wait as long as it takes' instead of an error, and per-operation overrides from the config that some callers never pick up while others ignore the requested value entirely. The reproductions we managed to write are under test/, but they are not the whole acceptance criteria - the policy has to hold for every operation and every caller, including the combinations of an override, a requested value and the ceiling."

One convention (`docs/timeout-policy.md`: `resolve(operation, requested)` = the
request clamped into [per-operation override or class default, 30,000ms hard
ceiling]; zero/negative is a `RangeError`; every caller goes through the policy
module) that five clients each implement slightly wrong. The policy module
itself is correct — the work is finding every deviant caller and normalising
it onto the policy.

## Sub-problems (each its own hidden test file)

| file | module | the deviance in the fixture |
|---|---|---|
| `01-http-client` | `src/http-client.js` | local literals: default 2000 (coincidentally right), local ceiling 60,000 instead of the hard 30,000, no floor, no error on zero |
| `02-db` | `src/db.js` | stale default 1500 (docs say 1000), passes the request through raw, and 0 means "wait forever" — the driver convention the docs forbid |
| `03-queue` | `src/queue.js` | the one client that adopted the policy resolves the bare class `'queue'`, so per-operation overrides (`queue.poll`, `queue.publish`) can never match |
| `04-cache` | `src/cache.js` | never adopted the policy: the caller's number goes on the plan raw (no floor, no ceiling, no error), default 250 when nothing is asked |
| `05-webhook-dispatcher` | `src/webhook-dispatcher.js` | the rewrite kept `timeout` on the signature but never threaded it through — every delivery runs at the literal 10,000 |

The reference fix is the sweep: five files, each routed onto
`policy.resolve(<full operation name>, timeout)`.

## Guards (the four cases that pass on the untouched fixture)

- *an http request with no requested timeout gets the documented default* — the local literal happens to equal the policy default
- *a queue poll above the hard ceiling is capped at the ceiling* — the broken queue still clamps via the policy, just under the wrong name
- *a cache read with no requested timeout gets the documented default*
- *a webhook delivery with no requested timeout gets the documented default* — the hardcoded 10,000 is the right default when nothing is asked

## Interaction cases (7)

Override × ceiling: `01` "an http override applies, and the ceiling still caps
a request above it". Override × sibling isolation: `02` "a query override does
not leak into exec" (also override-as-floor at 1500), `04` "a get override
raises the floor for get and leaves set alone", `03` "poll and publish take
their overrides independently". Override as floor × request: `03` "a poll
override is the floor a small request is raised to", `05` "a delivery override
replaces the default and the floor". Override above ceiling capped at build:
`03` "an override above the ceiling is capped when the policy is built".

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 3/10 pass, exit 1 (7 failing) | **4/25 = 16%** (the 4 guards) |
| reference | 10/10 pass, exit 0 | **25/25 = 100%** |

Reference changes 5 files: `src/{http-client,db,queue,cache,webhook-dispatcher}.js`.

Gate: `node tasks-b/_tools/verify-task.mjs repo-wide-timeout-policy` → `ok`
(also PASSes `node tools/validate-tasks.mjs --dir tasks-b`).

## Where partial credit comes from

The sub-problems are per module and independent: a solution that sweeps only
the callers the visible suite reproduces most loudly (http, db, cache) lands
near 15/25. Queue is the subtle one — it already calls the policy and passes
its non-override cases, so an agent that doesn't read the override rules
carefully leaves `03` on the table. A literal-patch fix (change db's 1500 to
1000, clamp http to 30000) greens the visible suite but misses floors,
negatives, overrides and the webhook threading, landing around half.
