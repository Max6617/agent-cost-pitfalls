# Anthropic pilot - the console baseline, taken before the run

**Purpose.** Two questions, one cheap run:

1. **Settle the disputed 1.611x console-over-log cost gap** (`notes/records/FINDINGS.md:448-451` records it;
   `notes/reviews/CRITICAL-REVIEW.md:450-454` disputes it as a hardcoded constant with no capture behind it).
   It cannot be settled from the archive - the Anthropic gateway logs were destroyed on 2026-10-02.
   It CAN be settled prospectively: read the console before and after a run whose cost we compute
   ourselves from our own gateway log.
2. **A first, underpowered read on the mechanism prediction** (`notes/records/STEP2-RECONCILIATION.md` §4b): if the
   PTC penalty is a declared-cache phenomenon, Haiku should show a Qwen-like retention deficit under
   PTC and a positive billed differential.

## Console readings (Anthropic, from the account owner)

| when | credits | lifetime spend | read at |
|---|---|---|---|
| **before the pilot** | **$38.65** | **$667.11** | 2026-10-03, before launch |
| after the pilot | *to be read* | *to be read* | |

`console_delta = after_spend - 667.11` is what Anthropic billed.
`our_computed` is re-derived from the pilot's own gateway log with `costOf` under the corrected card.
**The ratio is the answer**, and it scales the cost of every future Anthropic run:

- ratio ~1.0 -> the full Haiku + Sonnet batch-1 costs **$448.93**
- ratio ~1.611 -> it costs **$723.19**

## Design of the pilot

| | |
|---|---|
| plan | `pilot` - 31 tasks x 2 presentation arms (dsh:native, dsh:ptc) x 1 seed = **62 cells** |
| provider | Anthropic, `claude-haiku-4.5` |
| ceiling | **$36** (the meter stops the matrix at 90% = $32.40) |
| balance at launch | $38.65 |
| output root | `results/_scratch/pilot-haiku-full` - **not** `results/haiku-full` |

**Why the pilot does not write to `results/haiku-full`.** That path is the canonical dataset name in
`tools/cost-panel.mjs`, so a partial 62-run matrix landing there would be read as a Haiku matrix by
every cross-model analysis and would move numbers it has no business moving. `--out-root
results/_scratch --name-prefix pilot-` keeps it out. The pilot data is therefore scratch, is not
backed up, and is not part of the artifact package - it exists to answer the two questions above.

## Why 62 cells and not 620

$38.65 buys about 85 Haiku runs at the card price, and the full batch-1 matrix is 620 cells
(~$281.57 for Haiku alone). A bounded pilot is the only Anthropic run this balance can express, so
`tools/collect.mjs` gained an `--arms` passthrough and a `pilot` plan: the arm subset now IS the
cell count, and the verify stage checks the run it actually launched rather than 620.

## Known discrepancy, recorded rather than corrected

`tools/collect-gateway.mjs` sets `costPerRun: PROVIDERS.anthropic.costPerRunBatch1 / 2`. That field
is the **sum of Haiku and Sonnet** ($0.454261 + $0.269822 = $0.724083), so the halved figure is the
two-model AVERAGE ($0.362). This pilot runs **Haiku only** ($0.454261/run), so the pipeline's estimate
($22.45) understates the true expectation ($28.16) by 24%. The ceiling was set from the true figure,
not the estimate, and the estimate is only used for the abort check. For a full two-model run the
halved figure is right by construction.

---

# RESULTS (pilot completed 2026-10-03, 40.3 min)

| | |
|---|---|
| cells | **62/62** - 31 `dsh:native` + 31 `dsh:ptc`, 31 tasks |
| solved | 54 (87.1%) |
| errors | 0 |
| wall clock | 40.3 min, 4 jobs |
| **our computed cost** | **$34.9576** matrix + $0.6143 preflight/pilot = **$35.5718** |
| what the pipeline reported | **$5.1523** - a **6.79x undercount** |
| balance impact | ~$35 of the $38.65 - the account is now effectively empty |

## Finding 1 - the spend meter was pricing Anthropic on the DeepSeek card (FIXED)

The gateway writes the API model name `claude-haiku-4-5` (hyphens). `tools/prices.mjs` held
`claude-haiku-4.5` (dots). `costOf` did `PRICES[model] ?? FALLBACK` and the fallback is the
DeepSeek card, so every Anthropic token was priced at $0.15/M instead of $1.00/M.

**This is a ceiling defect, not a reporting defect.** A spend ceiling is only as tight as the number
it measures: with a 6.79x undercount, the $36 ceiling used here would have permitted about **$220**
of real billing, and the planned `--max-cost 600` would have permitted about **$4,076** on a $900
balance - the F38 failure mode (credit dies mid-matrix, rejected runs read as model failures)
arriving through our own arithmetic rather than the provider's.

**Fixed, test-first:** `tools/prices.test.mjs` (6 tests, 3 watched failing). `costOf` now resolves
declared aliases and dated snapshots, and the fallback is something a caller **asks for**
(`{ allowFallback: true }`) - otherwise it throws. Same rule as the credit-alert fix: *"'empty' is
now something a caller SAYS, never something it fails to say."* Full suite 85/85.

**Five tools still carry the same silent fallback id** (`analyze-results.mjs:25`,
`check-task.mjs:74`, `power.mjs:11`, `_chekanalysis.mjs:33`, `cache-ab.mjs:88`). None is on the
money path. Not yet fixed.

## Finding 2 - PTC gets ZERO cache on Anthropic, and that is our gateway's geometry

| arm | main requests | miss tokens | hit tokens | cost | $/run |
|---|---|---|---|---|---|
| `dsh:ptc` | 618 | 20.0M | **0** | $23.00 | **$0.74186** |
| `dsh:native` | 619 | 10.4M | 4.0M | $11.96 | $0.38580 |

**PTC is +92.3% - and the whole difference is an artifact.** The gateway injects its cache breakpoint
on the **last tool** (`measure-gateway.mjs:721-722`, its documented default). PTC presents **1 tool**
(`run_code`); native presents **24**. PTC's cacheable prefix (system + 1 tool) therefore falls
**below Haiku's 4,096-token minimum** and Anthropic refuses to cache it - `cacheCreationTokens = 0` on
all 618 PTC requests, forever - while native's (system + 24 tools ≈ 5,378 tokens, exactly the hit
size) is cacheable.

So `dsh:ptc` overpaid **$11.04 of its $23.00** purely because of where our marker lands. The measured
"PTC costs 92% more on Haiku" is not a property of PTC or of Anthropic.

This probably re-explains F31's Anthropic row (*"Claude Haiku 4.5: mean cache hit 10.1%, arm spread
36.0 pp - client must declare"*), which concluded that caching on Anthropic is a property of the
*harness*. The destroyed `haiku-full` was collected under this same default ("STATIC breakpoints -
the condition every existing Anthropic number was collected under"), so the artifact was live then.

**Therefore the $900 matrix must not run until the cache treatment is settled.** The next step is a
~$3 A/B of the same two arms under a symmetric treatment (`--auto-cache`, or a breakpoint that does
not depend on tool count). The four cheap providers are unaffected - they cache automatically with no
4,096-token floor, and DeepSeek's PTC retention measured 1.000.

## What this does to the cost estimates

The $0.56383/run measured here is **inflated by Finding 2**: half the matrix paid full price for
artifact reasons. So it cannot be used to re-estimate the full matrix. What survives is the fact that
the pipeline's own estimate-and-meter chain was 6.79x low; the re-estimate waits on the cache A/B.

---

# THE CONSOLE RECONCILIATION (2026-10-03, after the pilot)

| | before | after | delta |
|---|---|---|---|
| credits | $38.65 | **$3.07** | **$35.58** |
| lifetime spend | $667.11 | $667.11 | **$0.00** |

Our computed cost for the pilot, from its own gateway log under the corrected Anthropic card:
**$35.5718**.

**RATIO = 35.58 / 35.5718 = 1.0002 - i.e. 1.000.**

## What this settles

1. **The disputed 1.611x is REFUTED.** `notes/records/FINDINGS.md:448-451` records a console-over-log gap of
   1.611x and concludes "every per-run figure needs scaling by 1.61". `notes/reviews/CRITICAL-REVIEW.md:450-454`
   disputes it as a hardcoded constant with no capture behind it. On a fresh, fully-instrumented
   run the ratio is **1.000**, and the dispute was right. Any figure still scaled by 1.611
   overstates Anthropic cost by 61% and needs an editorial pass.
2. **The pricing fix is validated end-to-end.** Our card-based computation matched Anthropic's
   billing to 0.02%. The old meter said $5.1523 for the same tokens - it would have implied a
   ratio of 6.9x and sent us chasing a gap that was entirely our own arithmetic.
3. **Use the CREDIT ledger, not the spend counter.** The spend counter did not move at all across
   a $35.58 run, so it is not a live signal. The credit delta is.
4. **The 'either $286 or $461' ambiguity for Haiku's 620 cells resolves low: $281.64** - the
   card-priced figure, unscaled.

## Consequence for the plan

- Haiku batch-1 (620 cells): **$281.64** · Sonnet batch-1: **$167.29** · both: **$448.93**
- Those are now trustworthy as planning figures, with one open caveat: the pilot measured only
  the two DSH arms, and the full matrix also runs four external harnesses that this dataset has
  never priced on Anthropic.
- Still to do before the full run: the ~$3 A/B that settles the cache-treatment artifact
  (Finding 2 above), because PTC currently pays full price on every input token for reasons of
  our own breakpoint placement.

---

# THE CACHE-TREATMENT A/B (2026-10-03)

Same 31 tasks, same two arms (`dsh:native`, `dsh:ptc`), same seed, same model, one variable
changed: `--extra-gateway-flag --auto-cache`, which adds Anthropic's top-level `cache_control`
field so the breakpoint MOVES FORWARD with the conversation, instead of the shipped static
prefix on `system + tools[last]`.

| | STATIC (pilot) | AUTO-CACHE (A/B) |
|---|---|---|
| PTC hit rate | **0.0%** | **99.9%** |
| native hit rate | 27.6% | 99.9% |
| PTC $/run | $0.74186 | **$0.21593** |
| native $/run | $0.38580 | **$0.12026** |
| PTC penalty | +92.3% | **+79.5%** |
| 62-run total | **$34.96** | **$10.42** |
| solved | 54 | 51 |

## Finding 3 - the artifact is real, and the treatment fixes it

Under the shipped static breakpoints PTC is cached **not at all**: 20.0M miss tokens and zero hit
tokens across 869 requests. The breakpoint sits on the LAST TOOL; PTC presents 1 tool against
native's 24, so its cacheable prefix falls under Haiku's 4,096-token minimum. With the top-level
field, PTC caches at 99.9% and the whole matrix gets **3.4x cheaper**.

This is a treatment defect, not a harness property, and it means F31's Anthropic row - *"mean cache
hit 10.1%, arm spread 36.0 pp ... client must declare"*, read as "on Anthropic caching is a property
of the harness" - is explained by our own breakpoint geometry. Declared properly, caching works for
every arm at ~100%.

## Finding 4 - what is LEFT of the PTC penalty is OUTPUT, not cache

The penalty does not disappear: +79.5% under a fair cache. The decomposition says why, and it is the
same in both treatments:

| | STATIC | AUTO-CACHE |
|---|---|---|
| PTC output tokens vs native | **2.62x** | **2.31x** |
| PTC steps vs native | 1.13x | 1.10x |
| output tokens per request | 687 vs 296 | 709 vs 338 |

PTC emits `run_code` blocks - the program as text - where native emits structured tool calls. On
Haiku, output bills at $5.00/M against $0.10/M for a cache read: a 50x spread. **The PTC penalty on
Anthropic is an output-volume effect, not a cache effect**, and it is the same shape as GLM's on the
cheap providers (+92.3% -> the differential is volume, not retention).

That matters for the mechanism claim: the prefix-retention story explains Qwen; ANTHROPIC is a
volume story, and the pre-declared prediction in STEP2-RECONCILIATION section 4b
("Haiku and Sonnet should show a Qwen-like retention deficit and a positive billed differential")
is now answered for Haiku - the differential is positive, but NOT for the reason predicted.

## What this does to the Anthropic budget

`--auto-cache` makes a 620-cell Haiku matrix about **$104** on the measured $0.168/run, against the
$281.64 card-priced estimate - because caching is now ~100% effective rather than 0-28%. The full
matrix also runs four external harnesses that this dataset has never priced on Anthropic, so treat
$104 as a floor, not an estimate. Either way $900 is now ample for Haiku AND Sonnet batch-1, with
room to spare.
