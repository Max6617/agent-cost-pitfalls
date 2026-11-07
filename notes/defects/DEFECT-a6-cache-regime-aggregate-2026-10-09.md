# DEFECT — A6's cache-regime aggregate pooled two regimes and produced a false anomaly

**Resolved 2026-10-09.** A6's Sonnet `overall` of 0.513 is a **cache hit rate**, not a solve rate. It
never disagreed with that matrix's 757/800 = 94.6%. `notes/handovers/HANDOVER-2026-10-09.md` section 4.3 asked for
this to be resolved before A6 is quoted; this is the resolution, and the aggregate that caused the
misreading is now decomposed so it cannot cause it again.

## 1. What A6 measures

`tools/panel-analysis.mjs` section A6 prints "Cache regime per model (primary cells, mean hit rate)".
Its `overall` is `mean(prim.filter(model).map(r => r.hitRate ?? 0))`, and `hitRate` is
`u.hit / (u.hit + u.fresh + u.created)` from the gateway's token split. So the comparison the handover
made — A6's number against a solve rate — was between two different quantities.

The reason it looked plausible is a coincidence, and a striking one: for five of the six models the
cache hit rate happens to sit within ~2 points of the solve rate.

| model | solve rate | A6 cache hit rate | difference |
|---|---|---|---|
| DeepSeek V4.1 Flash | 95.6% | 94.9% | −0.7 |
| GLM-5.3-Flash | 90.8% | 89.4% | −1.4 |
| Qwen3.8-Flash | 84.5% | 83.0% | −1.5 |
| Claude Haiku 4.5 | 57.9% | 56.9% | −1.0 |
| **Claude Sonnet 5.5** | **94.6%** | **51.3%** | **−43.3** |
| gpt-6-luna | 87.6% | 89.5% | +1.9 |

Sonnet is the one model where the two part company, which is exactly why it read as a defect in
Sonnet's row rather than as a category error. (The resemblance is not itself suspicious: both are
fractions of a per-run process, and a run that gets further makes both more turns and more cache
reuse. Nothing here depends on that reading.)

## 2. What 0.513 actually is

Neither a solve rate nor a measurement failure — **a mixture**. Every cell was checked
(`results/_scratch/a6-probe.mjs`, `a6-split-probe.mjs`): there are **zero null hit rates** in the
Anthropic matrices, so `?? 0` is not the cause and the zeros are real data. The arms are:

| Sonnet arms | cells | mean hit rate |
|---|---|---|
| 6 × `dsh:*` | 480 | ~85.5% |
| 4 × cline/goose/opencode/openhands | 320 | **exactly 0%** |

480 × 0.855 + 320 × 0 = **51.3%**, which is the filed number to the digit. haiku is the same shape:
213 DSH cells at 94.2% plus 140 non-DSH cells at 0% = **56.9%**. The pooled value was never a
statement about either group.

## 3. Why the four external arms read exactly 0%

Not because those harnesses refused to cache — because **their protocol path cannot carry a cache
breakpoint**. Evidence, from the gateway's own records:

- On `batchb-sonnet`, the `dsh` records carry `path: /v1/messages` and
  `deviations: [{field:'cache_control', action:'injected', where:['top-level']}]`.
- The cline/goose/opencode/openhands records carry `path: /v1/chat/completions` and
  `deviations: []`.
- The gate is `tools/measure-gateway.mjs` line ~691:
  `if (parsedReq && url.includes('/messages') && cacheBreakpoints)`.
- Census over every gateway record of all six tasks-b matrices: `dsh` used `/v1/messages` on the
  deepseek/glm/qwen/haiku/sonnet matrices and `/v1/responses` on luna; **no external harness used
  `/v1/messages` in any matrix, and no external harness ever received a cache_control injection.**
  Only haiku and sonnet ever show `cacheControl=tools+top-level`, and only on `dsh` arms.

Anthropic caches only where the client declares a breakpoint. So a 0% on those arms measures *this
study's request path*, and says nothing about whether the harness would cache if it could.

## 4. Why this is worth more than a footnote

`tools/measure-gateway.mjs` already doubted the injection, in its own comment: "A gateway that
improves the request is measuring itself. The same objection applies to the explicit breakpoints
below: they were added to match DeepSeek and Z.AI, which cache automatically whether the harness asks
or not, and that justification is worth re-examining rather than extending."

This is that re-examination, with numbers, and it finds the justification does **not** hold on
Anthropic. The injection was meant to make the comparison like-for-like, because DeepSeek and Z.AI
cache automatically. But it is applied only on `/v1/messages`, so on Anthropic the six DSH arms get a
breakpoint and the four external arms do not — the opposite of like-for-like. On DeepSeek, GLM, Qwen
and luna the four external harnesses do get automatic caching, so the asymmetry exists **only on
Anthropic**.

**What this does not touch.** The A2 primary contrast (`dsh:ptc` vs `dsh:native`) compares two DSH
arms inside one matrix, and both receive identical treatment, so the replication verdict in
`notes/records/REPLICATION-VERDICT-2026-10-09.md` is unaffected. Cross-suite comparability is unaffected too: the
batch-1 and tasks-b census shows the same per-provider flags in both suites.

**What it does touch, and is now a recorded limitation.** Any cross-**harness** cost comparison on
Anthropic — A1's harness ranking, and the per-arm `$/cell` figures — prices the four external
harnesses with every input token at the miss rate while the DSH arms read from cache at a tenth of it
(miss $2.00/M vs hit $0.20/M for Sonnet; $1.00 vs $0.10 for haiku). The gap is not only caching, since
the harnesses also differ in turns and token volume, and **this document does not attempt to size the
cache component**; separating it is a follow-up, not a number invented here. What can be said is the
direction: on Anthropic, DSH's harness-cost advantage over the external harnesses is flattered by the
study's own gateway configuration.

## 5. The fix

Additive, and the filed values are untouched:

- `tools/cache-regime.mjs` — `cacheRegimeSplit(rows)` returns `dshHitRate`, `dshCells`,
  `nonDshHitRate`, `nonDshCells`, splitting on the `dsh:` arm prefix, with the same `?? 0` the pooled
  `overall` uses so that the two sides decompose it exactly. A side with no cells is `null`, never 0,
  so "nothing measured" and "measured zero" cannot print the same. Tested in
  `tools/cache-regime.test.mjs`.
- `tools/panel-analysis.mjs` A6 keeps `overall` byte-identical and prints the split plus the cell
  counts beside it, and records an interpretive `note` per row.

## 6. Reproducing

```
node tools/panel-analysis.mjs --datasets batchb --json results/_scratch/a6-check.json   # the new A6 table
node --test tools/cache-regime.test.mjs
node results/_scratch/a6-probe.mjs          # zero null hit rates; pooled = split, weighted
node results/_scratch/a6-split-probe.mjs    # per model x arm: cells, unknown splits, both means
node results/_scratch/a6-census.mjs         # protocol path and cache_control injection per harness
```

## 7. Follow-up this creates

**A1's harness ranking on Anthropic is confounded by the study's own cache configuration.** It should
be reported with that caveat, or re-derived with the counterfactual input pricing, before any claim
that one harness is cheaper than another *on Anthropic* is quoted. The PTC-vs-native contrast is not
affected.
