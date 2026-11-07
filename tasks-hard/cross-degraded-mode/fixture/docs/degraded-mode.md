# Degraded-mode policy

The rules the platform team signed off after the last estate-wide incident. `src/`
is the implementation; where the two disagree, this document is right and the code
is a bug.

Every external thing the service talks to is a **dependency**, named in
`config/service.config.json`. The service never calls a transport directly: it
calls a call site, the call site asks the policy, and the policy asks the gate.
Everything in this document is deterministic — the clock is handed in, the
transports are handed in, and nothing sleeps.

## 1. Dependency classes

| class | when it is called |
|---|---|
| `read` | the service needs data: losing it degrades an answer but must not fail the request |
| `write` | the service asks for a change: it must never go out while the dependency is degraded |
| `critical` | the request cannot be answered correctly without it |

Class is a property of the dependency, not of the call site.

## 2. The gate

Each dependency has its own breaker. Configuration per dependency:
`failureThreshold`, `failureWindow`, `openMs` (see `config/service.config.json`).

A call **fails** when it throws, when its transport rejects, when the response
carries `ok: false`, or when the response carries `error`. Every other return is
a success. There is no retry anywhere: one call site, one attempt.

States:

- **Closed.** Calls are attempted. Failures are counted in a row, and the count
  is never allowed to exceed `failureWindow`; a single success clears it. When
  the count reaches `failureThreshold` the breaker opens: the count is cleared
  and the breaker stays open for `openMs`.
- **Open.** No call is attempted. Keep in mind that a call site that never
  attempts a call never advances the clock of the breaker.
- **Half-open.** Once `openMs` has elapsed since the breaker opened — measured
  with the injected clock — the **next call attempt is the probe**: exactly one
  call is allowed through, and every other call that arrives while that probe is
  in the air is refused as if the breaker were still open. The probe counts
  towards the failure window like any other call: a successful probe closes the
  breaker and clears the window; a failed probe re-opens the breaker for another
  `openMs`.

A dependency is **degraded** when it has been marked by
`service.markDegraded(name)`, or when its breaker is open and still inside its
`openMs`. A marked dependency keeps its mark until `service.markHealthy(name)`;
the gate is not consulted for a marked dependency and no call is attempted for
one. A breaker whose `openMs` has elapsed is no longer stopping everything — it
lets the probe through — so `service.isDegraded(name)` is false again at that
moment even though the breaker is not closed.

## 3. What each call site does

Everything below is keyed on the class of the dependency being called.

**`read` — fall back, never fail.** The call site walks the dependency's
`fallback` chain until a tier serves: the dependency itself first, then each
named tier in order, skipping any tier that is degraded. A tier that is *not*
degraded is called; if that call fails, the chain carries on to the next tier.
If no tier can serve, the call site returns the documented empty result with
`empty: true`. A read step never fails a request.

**`write` — refuse, do not attempt.** While the dependency is degraded the call
site returns `REFUSED` with the code from the dependency's `degradedCode`
(`payment-degraded`, `store-degraded`, …). The transport is **not** called: no
request goes out, no side effect happens. Only when the dependency is not
degraded is the call attempted.

**`optional` — skip and record.** A call site declared `optional: true` is
skipped while the dependency is degraded, and the skip is recorded. Its refusal
is not an error and does not fail anything.

**`critical` — fail fast.** While the dependency is degraded the request ends
there: the response is `ok: false` with code `critical-dependency-degraded` and
the `failingDependency` set to that dependency. No step after it runs.

## 4. The request

`service.handle(request, { at })` runs the steps of the route named by
`request.route`, in the order `config/service.config.json` lists them. Missing
optional request fields take their documented defaults (`accountId` is
`acct-1`, `amount` is `25.00`, `objects` is `[]`).

A step produces 0 or more recorded calls (a fallback chain may try several
tiers) and one step status:

| status | meaning |
|---|---|
| `OK` | the step ran and did what it says |
| `FALLBACK` | a read tier other than the primary served, or the chain was exhausted |
| `REFUSED` | a write refused while its dependency was degraded — nothing was attempted |
| `SKIPPED` | an optional call site was skipped |
| `FAILED` | an attempted call failed and the step had nowhere else to go |

A step declared `required` that ends `REFUSED` or `FAILED` ends the request:
`ok: false`, code `dependency-unavailable`, `failingStep` set to the step name,
and no later step runs. A refused write is refused *before* anything is
attempted, so a request that fails this way has still recorded no call to that
dependency.

## 5. The response

```js
{
  ok: true,
  code: 'OK',                      // OK | critical-dependency-degraded | dependency-unavailable
  requestId: 'req-1',
  route: 'checkout',
  steps: [
    { name: 'account',      dependency: 'db.primary', status: 'OK',       ok: true, source: 'db.primary' },
    { name: 'transactions', dependency: 'db.replica', status: 'FALLBACK', ok: true,
      source: 'cache.orders', viaFallback: true, empty: false, failures: 1,
      degraded: [ { name: 'db.replica', action: 'fallback' } ] },
    { name: 'payment',      dependency: 'payment.charges', status: 'REFUSED', ok: false,
      code: 'payment-degraded', degraded: [ { name: 'payment.charges', action: 'refused' } ] },
  ],
  degraded: [
    { dependency: 'db.replica', class: 'read', action: 'fallback' },
    { dependency: 'payment.charges', class: 'write', action: 'refused' },
  ],
  metrics: { /* section 6 */ },
}
```

**`ok`** is true only when every step that ran is fine, which means every
`required` step ended `OK` or `FALLBACK` and no `critical` dependency was
degraded.

**`degraded`** lists the dependencies this request found degraded, in the order
the request first needed them, one entry per dependency. `action` is what the
call site did about it: `fallback` for a read, `refused` for a write, `skipped`
for an optional call site, `failed` for a critical dependency.

## 6. Metrics

The service keeps counters for its own behaviour — they are not a dependency and
are returned on every response under `metrics`.

| counter | counts |
|---|---|
| `requests` | inbound requests |
| `callsAttempted` | outbound calls put on the wire |
| `callsFailed` | attempted calls that failed |
| `fallbacks` | steps that were served by a tier other than the one the step names |
| `refusals` | write call sites refused because their dependency was degraded |
| `skipped` | optional call sites skipped because their dependency was degraded |
| `failFast` | requests ended early by a critical dependency |

The last four are the four ways a call site can respond to degradation and they
are counted **separately**: a write that refuses is a `refusals`, never a
`fallbacks` and never a `callsAttempted`. `byDependency` counts every counter per
dependency, and `bySource` counts the outbound calls each dependency actually
received. The `metrics` on a response are the counters as this request left them.

`metrics.sink` is itself an optional call site (`optional: true`), so while it is
degraded it is skipped and the metrics of that request never go out.
