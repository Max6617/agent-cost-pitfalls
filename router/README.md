# router — the deterministic decision layer

The decision layer that [notes/plans/PLAN.md](../notes/plans/PLAN.md) §4 designed and the earlier work never built.
It is deliberately **deterministic**: no model call, no API key, no network. The hard part of a
decision layer is the policy, not the plumbing, so the policy lives in a pure module that is fully
unit-testable offline.

| file | role |
|---|---|
| `router-core.mjs` | pure decision engine — classification, tier selection, stall detection, cache-safety guard. Zero imports. |
| `router-core.test.mjs` | 13 tests, one per design rule. `node --test router/router-core.test.mjs` |
| `router-plugin.mjs` | Cordis adapter wiring the core to the agent loop |

## What it decides, and what it refuses to decide

| id | decision | mechanism |
|---|---|---|
| D1 | persona band for this input | keyword dominance → `spec` / `react` / **`weak` on ambiguity** |
| D1 | model tier for this input | from band + complexity + cost mode |
| D4 | when to escalate | **observed stalls only** — repeated failing calls, consecutive failures |
| D5 | persona text | one short paragraph per band |

Two deliberate refusals:

- **It never decides difficulty.** "How hard is this prompt" is answered "hard" almost always inside a
  coding loop, and costs money every turn. Only 29 of 294 questions in one study were improvable by
  routing at all; assigning one model per *task type* fixed 21 of those. Phase beats prediction.
- **It never touches the tool catalog.** Changing it invalidates the prompt cache. A decision may pick
  a band and a tier; it may not add or remove tools.

## Wiring, and how it was verified

The adapter follows the shipped model-selection plugin, read from
`@deepseek-ai/dsh-agent/lib/model-selection.js`. Both hooks and their payload shapes are confirmed
from that source, not guessed:

| hook | signature | what the plugin does |
|---|---|---|
| `agent/request` | `async (payload, next) -> resolved`, where `next()` yields `{ provider, model, reasoningEffort, ... }` | returns `{ ...resolved, provider, model, reasoningEffort }` to set the **tier** |
| `agent/pre-step` | `async ({ agent, messages, signal, step }, next) -> decision` | returns `{ ...decision, messages: [...] }` to inject the **band** guidance |

The shipped plugin's own guard is the discipline copied here: it injects only when the route actually
changed, and returns the decision untouched otherwise. Re-injecting identical text every step would
still alter the message list and invalidate the provider cache.

**Not verified end-to-end.** The event names and payload shapes are read from source; a live run has
not been performed, because that needs a new session and (for the measurement) an API key. Step 6 of
[notes/records/GUIDE.md](../notes/records/GUIDE.md) is the check.

## Configuration

```yaml
- id: router-det
  name: './router-plugin.mjs'      # resolved against the preset directory
  config:
    enabled: true
    costMode: cost-first           # or quality-first: decides the AMBIGUOUS band only
    minChars: 24                   # below this, no routing at all
    injectPersona: true
    ledgerPath: null               # absolute path enables the decision ledger
    routes:
      cheap:    { provider: deepseek-official, model: deepseek-flash, reasoningEffort: off }
      standard: { provider: deepseek-official, model: deepseek-flash, reasoningEffort: high }
      strong:   { provider: deepseek-official, model: deepseek-pro,   reasoningEffort: high }
```

## The ledger

Set `ledgerPath` to an absolute file and every decision is appended as JSONL:

| `kind` | when | fields |
|---|---|---|
| `input` | first user message of an input | band, tier, reason, evidence, chars |
| `route` | tier actually applied | tier, route, band, reason |
| `inject` | band guidance written into the step | band, step |
| `escalate` | a stall was detected | reason, detail |
| `error` | the router threw and degraded | error |

The ledger is what makes hypothesis **H2** testable: routing changes the model mid-session, which
loses that model's cached prefix. Pair the ledger with the gateway's per-request
`cacheHitTokens`/`cacheMissTokens` to price both the tier saving and the cache cost.

## Safety properties

- **Cannot break a run.** Every hook is wrapped: on any throw the router logs `kind: error` and
  returns the unmodified decision, i.e. it degrades to "no routing".
- **Cannot need a key.** A test asserts the core has no imports and no `fetch`. If someone later
  adds a model call, that test fails.
- **Cannot silently do nothing.** A non-empty ledger with no `route` entries means the gate or the
  default tier matched — distinguishable from a failure, which logs `error`.
