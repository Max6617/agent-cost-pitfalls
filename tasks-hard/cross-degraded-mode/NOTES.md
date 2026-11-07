# cross-degraded-mode

**stratum:** cross-cutting — one policy (the degraded-mode / circuit-breaker
policy in `fixture/docs/degraded-mode.md`) whose effects span ten dependency call
sites across four classes, and which is easy to half-do. The hidden suite checks
the policy at each call site separately plus properties that only hold when every
site is consistent; the score tracks how much of the sweep got done.

**prompt:** "Checkout is behaving badly whenever anything it depends on has a bad
afternoon. It keeps dialling the payment provider after we have taken it out of
service, an account lookup that cannot reach the database comes back looking like
an empty account with nothing to say for itself, requests that need pricing carry
on towards a charge, and once a provider has failed enough to be taken out of
rotation it never gets another chance. On top of that the dashboard looks calm
while half the estate is down, because the response and the counters do not say
which dependencies a request found degraded or what each call site did about it.
Make the service behave the way docs/degraded-mode.md says it does - the tests
under test/ are the reproductions we managed to write down, not the whole
acceptance criteria."

## Sub-problems (each its own hidden test file)

| file | cases | sub-problem | the bug in the fixture |
|---|---|---|---|
| `01-breaker` | 4 | threshold, the run of failures, the probe after `openMs`, re-arming after a failed probe | `gate.js`: a success does not clear the failure count; a failure re-opens at the *stale* `openedAt`; `allows()` never lets a probe through once the breaker is open |
| `02-read-fallback` | 5 | a `read` walks its documented chain, skips degraded tiers, never fails the request, and flags an empty result | `read.js`: the tier the step names is called even when it is degraded; a chain that runs out still reports `empty: false` |
| `03-write-refusal` | 3 | a `write` refuses, with the documented code, before anything is sent | `write.js`: the degraded check is only applied to optional call sites, and `refused()` invents a code instead of using the configured `degradedCode` |
| `04-optional` | 3 | an optional call site is skipped and recorded, and is attempted again once the dependency is healthy | `write.js`: the skip branch only looks at operator marks, so a breaker-derived degradation is mis-classified |
| `05-critical` | 3 | a `critical` dependency fails the whole request fast, whatever else the route needs | `service.js`: the run is stopped and counted, but the response is never marked as failed (`ok` stays true) |
| `06-reporting` | 5 | the response says which tier served and which dependency was degraded, and the counters separate fallback / refusal / skip / fail-fast | `report.js`: a dependency needed more than once in a request keeps the *last* action instead of the first, so the report can contradict what the request decided |

Six source modules carry the policy (`gate`, `service`, `read`, `write`,
`report`, `metrics`); the reference changes five of them, which is a sweep rather
than a rewrite.

## Measured

| arm | visible suite | hidden suite |
|---|---|---|
| untouched fixture | **3/8 pass**, exit 1 | **4/23 = 17%** |
| reference | 8/8 pass, exit 0 | **23/23 = 100%** |
| "green the visible suite and stop" (minimal overlay) | 8/8 pass, exit 0 | **13/23 = 57%** |
| the same overlay plus a half-open probe in `allows()` | 8/8 pass, exit 0 | 18/23 = 78% |

The first naive overlay is what a symptom-driven fix looks like: it makes the
visible reproductions pass (fall back to the replica, refuse a marked write,
report the `degraded` list, name the failed step, expose the counters) with six
small edits and without touching the breaker's own state machine beyond what the
visible suite forces. It still fails every case that needs the breaker to be
right — the failure run, the probe window, and the routes that only degrade
because a breaker opened.

The second row is the same overlay plus `allows()` letting a probe through after
`openMs`. It is worth recording because it shows where the remaining gradient
sits: once the breaker is correct, a solution that has done the whole sweep is at
100%, and one that has only done the call sites is at 78%. The 17% floor is the
untouched fixture.

`_tools/AUTHORING.md` warns that a visible suite covering the mainline of five
sub-problems pushes this arm over 60%. The first draft here did exactly that
(80%, then 75% after rebalancing), so the visible cases were cut back to the easy
end of three sub-problems and the hidden suite was rebalanced towards
breaker-derived degradation and two-step routes. The remaining 57% is honest: the
minimal fix genuinely gets the single-call-site, marked-dependency cases right.

## Interaction cases (two sub-problems at once, or beyond the visible suite)

- `02` "a read dependency whose breaker is open is not called either" — a read
  fallback that only happens because the breaker state is right.
- `02` "a fallback that is itself degraded walks on down the chain" — the replica
  is down too, so the chain has to carry on to the cache.
- `02` "a chain that runs out answers with the documented empty result" — three
  tiers degraded, the request still succeeds, the caller can see the gap.
- `03` "the second charge of one request is refused once the first one has opened
  the breaker" — a two-step route over one dependency: the refusal must happen
  *before* any side effect, and it must be counted as a refusal, not an attempt.
- `04` the skip branch is exercised against operator marks and against a breaker.
- `05` "any dependency of the critical class fails the route fast" — a route
  reconfigured so the critical step is not the one the documentation's examples
  use.
- `06` "a dependency that recovers mid-request is used by the steps that follow" —
  the first step falls back, the mark is cleared in flight, the second step must
  pick the recovery up, and the response must still report what the request ran
  into.
- `06` "the counters separate a fallback from a refusal" and "a skip from both" —
  counting a refusal as a fallback (or a skip as a refusal) is the most common
  half-done version of this policy.

## Guards (pass on the untouched fixture on purpose)

- `01` "a read dependency whose breaker is open is not called either" — a call
  site that ignores a degraded tier is a call site that ignores discovery.
- `04` "an optional call site is skipped rather than refused" and "an optional
  call site is attempted as soon as the dependency is healthy again".
- `04` "the metrics sink is skipped while it is degraded" — the optional sink
  must not take the order down with it.

Four guards out of 23, so the untouched floor is 17% and the gradient stays wide.

## Where partial credit comes from

Fixing the breaker alone (`gate.js`) moves `01` and the breaker-derived cases in
`02`, `04` and `05`: roughly 8/23. Fixing the call sites alone moves `02`, `03`,
`04` and part of `06`: roughly 12/23. Only a solution that treats the four
classes as one policy — and keeps the gate's state machine honest — reaches 100%.
The reference passes the visible suite *and* the hidden suite, which is the proof
that the two do not disagree.
