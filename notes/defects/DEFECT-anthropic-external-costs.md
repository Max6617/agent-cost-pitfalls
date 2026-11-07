# DEFECT — Anthropic costs for the four external harnesses are ~10-20x too high

**Found 2026-10-04, at commit `12a4da5`, while building the paper's cost table. Not yet fixed.**

## What was checked

The paper needs a cost-per-solved-task table. The pre-registered rule is *never price from a summary —
re-derive from gateway usage with `costOf`*, so both the shipped panel and the raw gateway logs were
re-derived independently and reconciled against the Anthropic credit ledger.

## The evidence

Summing every billable record in `results/cmushs68z-anthropic-gateway.jsonl` (Haiku, 620 cells, the
only log carrying Haiku traffic) **by the log's own `harness` field**:

| harness | requests | cost |
|---|---|---|
| dsh (all six DSH arms) | 9,227 | 49.8919 |
| openhands | 1,524 | 2.1692 |
| cline | 1,142 | 1.7522 |
| opencode | 965 | 1.5627 |
| goose | 1,010 | 1.0527 |
| **total** | 13,868 | **56.4288** |

The shipped panel (`analysis/cost-panel-6model-2026-10-03.json`), summed per arm over the same 620
cells:

| arm | panel | gateway | ratio |
|---|---|---|---|
| dsh:ptc | 11.4177 | 11.4177 | 1.000 |
| dsh:native | 7.4218 | 7.4218 | 1.000 |
| dsh:native-opt / ptc-opt / *-terse | 28.6686 | 28.6686 | 1.000 |
| **cline** | **23.1471** | 1.7522 | **13.2x** |
| **goose** | **13.1341** | 1.0527 | **12.5x** |
| **opencode** | **15.1622** | 1.5627 | **9.7x** |
| **openhands** | **42.3607** | 2.1692 | **19.5x** |
| **total** | **143.3512** | **56.4288** | **2.54x** |

**The six DSH arms agree with the gateway to the cent. The four external harnesses differ by
9.7-19.5x — and both sides of that comparison are DEFAULTS rather than measurements, so see the
CORRECTION at the end of this file before quoting either number.** *Original sentence follows.*
10-20x, and their panel total (93.80) is larger than the entire gateway log (56.43) — which is
impossible.**

## The cause, located to one run

`cline / example-fix / seed 1`, 8 requests:

- gateway records: 8 requests, **$0.00764**, first usage block
  `{"inputTokens":6081,"outputTokens":126,"cacheHitTokens":null,"cacheMissTokens":null}`
- panel row: `requests=8`, `fresh=70097`, `hit=0`, `created=0`, `hitRate=0.0000`,
  **`costBilled=0.077737`**

So two things are true at once, and they are different bugs:

1. **The gateway log records the cache fields as `null` for external-harness requests on the
   Anthropic path** (the DSH arms record `cacheHitTokens` / `cacheMissTokens` normally). The cache
   reads those harnesses did perform are therefore absent from the log.
2. **`cost-panel` then prices an input token whose cache state is unknown at the full MISS rate**
   (`hit: 0`), which is the most expensive possible reading. `costOf` makes the opposite choice and
   prices it at zero. **Neither is right**: the truth is a cache read (0.1x miss), and the two tools
   bracket it at 10x apart.

Neither error is visible in a summary, and the panel's number is the plausible-looking one — the
failure mode this project has recorded five times now.

## Corroboration: the credit ledger

The Anthropic ledger delta for this session was **144.33 USD**. Re-derived from the logs:

    Haiku matrix    56.43
    Sonnet matrix   42.36
    cache A/B pilot 45.38   (from the A/B record: static 34.96 + auto-cache 10.42)
    ----------------------
    total          144.17   against 144.33 actual  ->  0.1%

The panel's Anthropic figures cannot be reconciled with the ledger at all: it reports 143.35 for
Haiku alone, which is the whole session's Anthropic spend.

## What this does and does not touch

**Contaminated (do not publish):**

- any per-arm or per-harness **cost** figure for the four external harnesses on `haiku-full` and
  `sonnet-full`;
- `panel-analysis` **A6** for the two Anthropic models: the hit-rate of every external arm is
  reported as 0.000, which is what produces Haiku's 0.947 within-model spread;
- `panel-analysis` **A8** rank steps that involve an external arm of an Anthropic model;
- the paper's cost-per-solved-task table for Anthropic, if taken from the panel.

**Not contaminated (verified against the logs):**

- **A2 and the family's six cost contrasts** — they are `dsh:ptc` against `dsh:native` only, and the
  DSH arms agree exactly. Haiku's +53.84% differential reproduces to the cent from the log.
- **H1, H2 and H3** — all three use DSH arms only.
- ~~**`prefix-retention.json`** — computed from request-body growth, not from the cost panel. The
  external-harness retention figures (0.560 Haiku, 0.451 Sonnet) do not depend on this defect.~~
  **FALSE — corrected 2026-10-09: those figures ARE this defect.** Retention is computed from
  request-body growth, which is why this record assumed immunity, but the tool also classifies arms by
  `armClass()` — and that sends everything which is not `dsh:ptc` or `dsh:native` to "external",
  including the four DSH `-opt`/`-terse` arms. So 0.560 and 0.451 are the missing cache split
  (coded 0.0000) diluted by DSH arms at ~0.998, in a bucket of **eight arms / 496 runs**. What genuinely
  does not depend on this defect is the **DSH-arm** retention, 0.994-1.000.
- **The four cheap providers** — DeepSeek 4.95 vs panel 4.87, GLM 4.88 vs 4.82, luna 3.89 vs 3.83,
  Qwen 12.44 vs 12.15. Those logs record cache fields normally, and the small gaps are
  preflight/pilot records outside the matrices.

## The consequence for the paper, today

1. The cost table uses **gateway-derived totals**: Anthropic ~0.0910 and ~0.0683 USD per run; the
   four cheap providers 0.0062-0.0196 USD per run.
2. ~~The 'harness dominates retention on Anthropic' finding **must be re-based on
   `prefix-retention.json`** (0.994/1.000 against 0.560/0.451), **not** on A6's hit-rate spread.~~
   **WITHDRAWN 2026-10-09 — there is nothing to re-base it on.** `prefix-retention.json` has no
   external-harness measurement on Anthropic either (see the correction above): it has a pooled bucket.
   The finding is **not available from this archive**, on either path. Recovering it requires the four
   external Anthropic arms re-collected through a path that reports the cache split; at those arms'
   observed $0.37-$1.21 per cell a 40-cell pilot is roughly $30, and no such run has been made.
3. No external-harness Anthropic cost may be quoted until the normaliser and the panel are fixed.

## What a fix requires (not done in this pass)

Test first, as always. Two tests, both watched failing:

- a normaliser test asserting that an Anthropic response carrying cache usage produces non-null
  `cacheHitTokens` / `cacheMissTokens` on the logged record, whichever harness sent it;
- a reconciliation test asserting that the sum of per-arm `costBilled` for a matrix equals the sum
  of `costOf` over that matrix's gateway log within a stated tolerance, and that no single arm can
  exceed the whole log.

Until then the panel keeps its current behaviour, and this file is the reason no number from it is
used for external-harness Anthropic cost.

**No API spend. No data was modified. No output directory was touched.**

---

## CORRECTION — 2026-10-04, same day, after reading `costOf`

**The first version of this file said the panel is 10-20x too high and that the gateway re-derivation
(56.43) was corroborated by the ledger. Half of that was wrong, and the half that was wrong was mine.**

`prices.costOf` reads `cacheMissTokens`, `cacheCreationTokens`, `cacheHitTokens` and `outputTokens` -
**not `inputTokens`**. So when the cache split is `null`, it prices that input at **zero**, not at the
miss rate. `cost-panel.usageIndex` (`tools/cost-panel.mjs:122-123`) makes the opposite default and
prices it at the **miss** rate. The two tools bracket the truth from opposite sides, and neither is a
measurement:

| model | gateway, input priced at 0 | all unknown input at cache-read (0.1x) | all unknown input at miss | panel |
|---|---|---|---|---|
| Claude Haiku 4.5 | 56.43 | **65.23** | **144.44** | 143.35 |
| Claude Sonnet 5.5 | 42.36 | **50.62** | **124.97** | 123.52 |
| both | 98.79 | 115.85 | 269.41 | 266.87 |

Unknown-cache requests: 4,641 on Haiku carrying 88.01M input tokens, 2,131 on Sonnet carrying 41.31M.
Those tokens were billed by the provider at *something*; the log does not record what.

So, corrected:

1. **The panel's Anthropic figures are the all-miss UPPER bound, presented as a point estimate.**
   They are not 10-20x too high as a computation of that bound - they are exactly it - but 266.87
   for the two matrices **exceeds the entire session's ledger delta of 144.33**, so as a statement
   about money actually spent it is refuted.
2. **The gateway re-derivation of 56.43 is a LOWER bound, not a measurement**, because it prices
   88M + 41M unknown tokens at zero. It is not corroborated by the ledger; it merely does not
   contradict it as badly.
3. **The handover's 'measured' 0.09038 and 0.06753 USD per run are the same lower bound**
   (0.09038 x 620 = 56.04, against the log's 56.43), not an independent measurement. They should not
   be quoted as measured.
4. The ledger gives one hard fact: **the two matrices together cost at most 144.33**, i.e. at most
   0.1164 per run, and at least 115.85 by the cache-read floor.

The one thing the first version got right, and it is the load-bearing part: **the cache split for
those 6,772 requests is not in the archive, so no tool can price them exactly.** The defect is not a
wrong constant; it is that two tools each invented a different constant and both printed it as a
number.

**Consequence for the paper, restated.** Anthropic cost per run is a **bracket**, not a figure:
Haiku 0.105-0.233 and Sonnet 0.082-0.202, with the ledger capping the pair at 0.1164. The PTC
differentials, H1-H3 and the retention findings are unaffected, because they use DSH arms or request
bodies. No external-harness Anthropic cost may be quoted at all, and no Anthropic cost may be quoted
without its bracket.

**What a fix must do, restated.** Not `price it at the miss rate` and not `price it at zero`:

- `cost-panel` must carry `costBilledLow` beside `costBilled`, flag the cell `cacheSplit: unknown`,
  and report the count per matrix so the bracket cannot collapse into a point estimate again;
- `costOf` should refuse a usage object whose cache split is unknown rather than silently pricing
  the input at zero (an `allowUnknownInput` opt-in for callers that want the lower bound);
- both changes test-first, with the test asserting the *property* - `low <= truth <= high`, and the
  panel's published total for a matrix never exceeding that matrix's ledger-reconciled ceiling.

**No number in this file was computed after seeing a result it was meant to predict.** The correction
is recorded rather than applied silently, per the standing rule that retractions stay visible.
