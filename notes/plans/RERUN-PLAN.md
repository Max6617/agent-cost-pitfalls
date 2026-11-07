# RERUN-PLAN — the randomised-order re-run, and the road to submission

**Status: FILED 2026-10-11, approved by the study's owner, before any re-run record exists.** This
document is the re-run's pre-registration. From here on, changes are amendments, dated and listed at
the bottom, the same discipline as `PRE-REGISTRATION.md` and `tasks-b/PLAN.md`. The filing commit is
the timestamp that matters: at it, none of this re-run's output directories exists
(`results/rerun-b1-*`, `rerun-b-*`, `rerun-aa-*`, `rerun-smoke-*`, `rerun-aa-smoke-*`). The older
`results/rerun-ds/` and `results/rerun-*-gateway.jsonl` are an unrelated run from 2026-10-02 (commit
`1a744e2`) and are not part of this re-run.

## 1. Why this re-run

The paper's largest weakness is Pitfall 4. Every matrix, on both suites, ran its arms in **one
shared execution order**, and cost varies 1.75–3.82× with slot. The paper adjusts for this with a
model whose key assumption the design cannot test. A reviewer's obvious request is: *you found the
flaw, so re-run without it.* This plan does that at the smallest scale that answers the question:

> **Does the PTC-against-native cost contrast change when execution order is randomised
> independently per matrix and counterbalanced between the two arms?**

A second, smaller run fixes the A/A caveat: the two A/A passes ran back to back, so pass 2 could
reuse pass 1's cache (hit share 93.3% → 95.7%).

## 2. Budget

Estimated from the filed per-run costs (`analysis/quality-guard-2026-10-10.json`). The margin covers
preflight, smoke tests and retries.

| block | cells | filed cost | with 1.5× margin |
|---|---|---|---|
| **A. core** — 4 cheap providers × 2 arms × batch 1 (31 tasks × 2 seeds) | 496 | $5.24 | $8 |
| **A. core** — 4 cheap providers × 2 arms × tasks-b (40 tasks × 2 seeds) | 640 | $16.82 | $25 |
| **B. interleaved A/A** — DeepSeek, `dsh:native`, 31 tasks × 2 seeds × 2 passes | 124 | ~$1.20 | $2 |
| **subtotal (A + B)** | 1,260 | ~$23 | **~$35** |
| *C. optional* — Claude Haiku 4.5 × 2 arms × batch 1 | 124 | $18.84 | $28 |
| **total with C** | 1,384 | ~$42 | **~$63** |

**Why C, if anything from Anthropic.** Haiku is the paper's one robust code-mode case (PTC dearer
and less reliable). Re-running it under randomised order tests the paper's strongest code-mode claim.
Sonnet adds little, and completing Haiku's tasks-b row (160 cells, ~$47 + margin) breaks the budget.
**Decision at filing:** run C only if A and B come in under budget.

**Hard ceilings:** the collector's `--max-cost` is set per matrix at 1.5× its filed cost, and the
whole re-run stops at $70. Check credits on each provider console before starting.

**Credits checked 2026-10-11, against each provider's share (filed cost / with 1.5× margin):**

| provider | share | credit | action |
|---|---|---|---|
| DeepSeek | $6.04 / $9.10 (both suites + A/A) | $10.51 | top up ~$5: the A/A run's ledger charge ($1.72) was 45% above the gateway's ($1.19), unexplained, so DeepSeek may bill above the estimate |
| Z.ai (GLM) | $4.81 / $7.20 | $8.15 | top up ~$5 for the same reason |
| Alibaba Cloud (Qwen) | $9.62 / $14.40 | card, no prepaid credit | the per-matrix `--max-cost` is the only cap; set it |
| OpenAI (luna) | $2.79 / $4.20 | $46.95 | enough |
| Anthropic (Haiku, block C) | $18.84 / $28 | $57.90 | enough: **block C is in** |

A matrix that runs out of credit mid-collection leaves a non-random subset (as Haiku's tasks-b
outage did), so the credit, not the estimate, has to carry the margin.

## 3. Design

**Arms:** `dsh:native` and `dsh:ptc` only. These are the paper's central contrast, and with two arms
the order question is clean.

**Models:** DeepSeek V4.1 Flash, GLM-5.3-Flash, Qwen3.8-Flash, gpt-6-luna (+ Claude Haiku 4.5 if C
runs). Same gateway flags per provider as the original matrices (`results/*/collection.json`):
effort, `max_tokens` ceiling, cache condition. **Same harness version (DSH 0.1.7-rc.2), same price
cards.** Record the served model id the gateway logs. If a provider now serves a different snapshot,
that is reported, not hidden (see §6).

**Suites:** batch 1 (31 tasks) and tasks-b (40 tasks), 2 seeds each, the same grading as before.

**Execution order, the point of the run:**
- the order seed includes the matrix (`tools/arm-order.mjs`, already fixed and tested);
- **counterbalanced**, not just shuffled. Within each matrix, PTC runs first in exactly half of the
  (task, seed) blocks, and which half is drawn by the seeded RNG. With two arms a plain shuffle can
  leave the split unbalanced (e.g. 36/26). Counterbalancing makes the order effect cancel in the
  contrast and lets it be estimated directly;
- `position` is recorded on every run, as now, and every record carries `counterbalanced: true`;
- `--jobs` stays at 4, as in the original matrices, so concurrency is not a second change.

**What "order" means with two arms and four workers.** The runner queues blocks in task order and
four workers take items from the queue. With two arms per block, a block's two runs usually start
within moments of each other, so PTC and native are paired in time (time drift cancels in the
contrast) and `position` is the *queue* order inside the pair. Q3 therefore measures whether leading
the pair matters for this contrast. It does not reproduce the ten-arm slot effect (see §6).

**Interleaved A/A (B):** one arm, `dsh:native` on DeepSeek, duplicated inside one matrix as an
identical twin, `dsh:native-twin` (same harness, patch, mode and prompt; the arm id reaches only the
run id and the credential header, never the request body). Which copy of a block runs first is
counterbalanced. Both copies use the same AA workdir path (the byte-identity rule), so a **workdir
lock** keeps them from running at the same time: the second copy of a block starts when the first
finishes. Byte identity is checked by `tools/aa-identity.mjs`, which reproduces the first A/A's filed
result (main and auxiliary requests identical in 62 of 62 pairs) on that run's data.

## 4. Pre-registered questions and decision rules

All estimators are the filed ones; no new estimator is written for the analysis. Paired by task,
seeds averaged, task-clustered percentile bootstrap, B = 200,000, seed 12345.

**Q1 — Does randomised order change the classification?** For each (model, suite), classify the
re-run's raw PTC-vs-native contrast (positive / negative / null) and compare it with (a) the original
raw classification and (b) the original order-adjusted classification, log and additive scales.
*Reported:* a table of all three, the number of agreements with each, and nothing more is claimed
from it.

**Q2 — Was the shared order biasing the estimates?** For each (model, suite), the distance between
the re-run's point estimate and (a) the original raw estimate and (b) the original adjusted-log
estimate. **Prediction, filed now:** if the shared order biased the raw contrasts, the re-run sits
closer to the adjusted estimates than to the raw ones in a majority of the 8 (model, suite) rows.
*Decision:* the prediction holds if it is true in at least 5 of 8 rows, fails if true in at most 3,
and is inconclusive at 4.

**Q3 — How large is the order effect, measured directly?** Because order is counterbalanced, the
cost difference between "PTC first" and "native first" blocks estimates the order effect on the
contrast itself, with a bootstrap interval. *Reported with its interval; no threshold.*

**Q4 — Quality.** `tools/quality-guard.mjs` on the re-run: solve counts, exact McNemar, cost per
solved cell, and the contrast on cells both arms solved. Reported beside every cost figure.

**Q5 — The A/A floor, with carry-over separated.** Two quantities. (a) The difference between the
identical copies (twin − native), mean and 95% interval as a percent of per-cell cost: its half-width
is the new noise floor. Because which copy leads is counterbalanced, carry-over cancels in this
difference. (b) The difference between whichever copy ran second and whichever ran first: this is
the carry-over itself, now measured rather than suspected. Each copy's cache-hit share is reported.
**Prediction:** (a) is within ±2% of per-cell cost, and the two copies' hit shares differ by less
than one point.

**What the paper says under each outcome**, fixed now so the result cannot be spun:
- *Q2 holds:* Pitfall 4 gains direct evidence that a shared order biases contrasts, and the
  adjustment is supported.
- *Q2 fails* (the re-run matches the original raw estimates): the slot effect exists, but it did not
  bias the PTC-vs-native contrast. The paper says so plainly, Pitfall 4 is reworded as a risk rather
  than a demonstrated bias, and GLM's original significant saving is reinstated if it re-appears.
- *Either way:* the classifications from Q1 and the Haiku quality result from Q4 are reported as
  they come out.

## 5. Steps

**Before anything is spent**
1. Check credit balances on DeepSeek, Z.ai, Alibaba Cloud, OpenAI (and Anthropic if C runs).
2. Re-check each provider's current price card against `tools/prices.mjs` and the served model ids.
   A changed price is recorded, not silently applied.
3. Tooling — **done 2026-10-11, all tested:**
   - `tools/arm-order.mjs` `counterbalancedFirst`: exactly half the blocks per matrix, deterministic
     under `--resume`, independent between matrices;
   - `tools/run-plan.mjs`: the plan builder, the A/A twin and the workdir lock, wired into
     `tools/run-experiment.mjs` as `--counterbalance` and `--aa-twin` (the default plan is unchanged);
   - `tools/rerun-plans.mjs`: plans `rerun-b1`, `rerun-b`, `rerun-aa`, `rerun-smoke`, `rerun-aa-smoke`,
     DSH only, wired into `tools/collect.mjs`;
   - `tools/rerun-datasets.mjs`: the re-run matrices registered at run time, outside the default panel;
   - `tools/aa-identity.mjs`: the byte-identity gate;
   - `tools/rerun-compare.mjs`: Q1–Q5 and the drift check. Its estimator reproduces the filed raw
     estimates exactly (DeepSeek and Haiku, batch 1).
4. **File this plan** (status FILED, date, commit) before the first re-run record exists.

**Collection** — exact commands in §5a.
5. Smokes for the two new runner modes, and the byte-identity gate. Every `collect.mjs` invocation
   also runs its own preflight and one-task pilot on the provider before the matrix, so a provider
   problem is caught there, for pennies.
6. Run A (8 matrices), then B, then C. One matrix per command, so a provider problem stops one
   matrix, not the batch, and each matrix has its own ceiling.

**Analysis**
7. `node tools/rerun-compare.mjs --json analysis/rerun-compare-<date>.json` (the filed panels are not
   touched; the re-run datasets are registered at run time).
8. `node tools/artifact.mjs --extend`, then `--verify`; regenerated filed outputs must differ only in
   timestamps, as last time.

## 5a. Runbook — exact commands

**Where:** the main checkout (`C:\Users\user\betterharness`), after this branch is merged into it.
The provider keys live only there (`.keys.json` / `FILL-IN-KEYS.json`), and so do the pinned harness
installs the preflight expects. Never copy keys into a worktree.

**Ceilings:** `--max-cost` per matrix is the filed cost × 1.6, rounded up (the meter stops a matrix
at 90% of its ceiling). The collector's own default would be wrong here: it estimates from batch-1
ten-arm averages, which would set tasks-b at $9 for all four providers and stop it part-way. Keep a
running total of the `spend this run` lines; stop at $70.

```
# 0. sanity, then credits
node --test tools/
node tools/check-providers.mjs

# 1. the plan is FILED (2026-10-11); nothing to do here

# 2. smokes (DeepSeek, pennies)
node tools/collect.mjs --plan rerun-smoke    --providers deepseek --name-prefix rerun-smoke-    --max-cost 1
node tools/collect.mjs --plan rerun-aa-smoke --providers deepseek --name-prefix rerun-aa-smoke- --max-cost 1
node tools/aa-identity.mjs --runs results/rerun-aa-smoke-ds-full/runs.jsonl
#    must print PASS. Also check results/rerun-smoke-ds-full/runs.jsonl: counterbalanced true, each arm at position 0 once.

# 3. block A, batch 1
node tools/collect.mjs --plan rerun-b1 --providers deepseek --name-prefix rerun-b1- --max-cost 2
node tools/collect.mjs --plan rerun-b1 --providers zai      --name-prefix rerun-b1- --max-cost 2
node tools/collect.mjs --plan rerun-b1 --providers qwen     --name-prefix rerun-b1- --max-cost 4
node tools/collect.mjs --plan rerun-b1 --providers openai   --name-prefix rerun-b1- --max-cost 2

# 4. block A, tasks-b
node tools/collect.mjs --plan rerun-b --providers deepseek --name-prefix rerun-b- --max-cost 6
node tools/collect.mjs --plan rerun-b --providers zai      --name-prefix rerun-b- --max-cost 7
node tools/collect.mjs --plan rerun-b --providers qwen     --name-prefix rerun-b- --max-cost 12
node tools/collect.mjs --plan rerun-b --providers openai   --name-prefix rerun-b- --max-cost 4

# 5. block B, the interleaved A/A, then its gate on the full run
node tools/collect.mjs --plan rerun-aa --providers deepseek --name-prefix rerun-aa- --max-cost 3
node tools/aa-identity.mjs --runs results/rerun-aa-ds-full/runs.jsonl

# 6. block C, Claude Haiku 4.5 (provider "anthropic" IS claude-haiku-4.5), only if the running total allows
node tools/collect.mjs --plan rerun-b1 --providers anthropic --name-prefix rerun-b1- --max-cost 31 --i-know-anthropic-is-expensive

# 7. analysis
node tools/rerun-compare.mjs --json analysis/rerun-compare-<date>.json
```

Each matrix commits itself when it completes. A matrix that stops part-way is resumed by running the
**same command again**: the runner skips completed cells and keeps the same counterbalanced
assignment, because the assignment is a function of the matrix id. **Caveat:** `collect.mjs` draws a
new matrix id per invocation unless `--matrix-id` is given, so pass the stopped run's id with
`--matrix-id` when resuming: the `matrix id` printed at the top of its output (e.g. `cmv2y54jb`), which
is `collection.json`'s `matrixId` without its `-<provider>` suffix.

| matrix | filed cost | `--max-cost` |
|---|---|---|
| rerun-b1 DeepSeek / GLM / Qwen / luna | $1.16 / $1.00 / $2.29 / $0.79 | $2 / $2 / $4 / $2 |
| rerun-b DeepSeek / GLM / Qwen / luna | $3.68 / $3.81 / $7.33 / $2.00 | $6 / $7 / $12 / $4 |
| rerun-aa DeepSeek | $1.20 (ledger $1.72) | $3 |
| rerun-b1 Haiku (C) | $18.84 | $31 |

**Paper**
9. Pitfall 4: add the re-run as direct evidence (or reword it, per §4). Pitfall 6: replace the A/A
   floor with the interleaved one. "What survives": update with the re-run classifications.
   Limitations: drop "the shared order affects both suites" if the re-run answers it.
10. Small tooling debt: give `tools/pdf-margin-check.mjs` a `--block` option for the TMLR geometry
    (it currently reports TMLR's header as findings).

## 6. Threats this re-run brings with it

- **Time drift.** Weeks have passed. Providers may serve different snapshots, change caching
  behaviour or change prices. A difference between the re-run and the original can be order *or*
  drift. Mitigation: record served model ids and cache-hit shares, and compare the re-run's
  native-arm cost with the original native-arm cost per model. If native alone has moved by more than
  the A/A floor, drift is reported as a confound.
- **Two arms is not ten.** The original slot effect was measured over ten-arm blocks. A two-arm
  block has a different load profile, and with four workers its two runs start almost together, so
  Q3 measures the effect of leading the pair *for this contrast*, not the original 1.75–3.82× figure.
  The re-run answers whether the PTC-vs-native contrast survives a balanced, time-paired order; it
  does not explain the original slot effect.
- **The A/A's carry-over is now inside the design.** The second copy of each block starts right
  after the first, on the same automatic cache. Counterbalancing cancels this in the floor (Q5a), and
  Q5b reports its size.
- **Same suites.** The re-run reuses batch 1 and tasks-b, so it tests order, not generalisation.

## 7. Road to submission (in parallel)

- [ ] Read the paper end to end; rewrite every sentence that doesn't sound like you.
- [ ] Study every number and the timeline until it can be explained without notes (the
      editor-question list from the review session).
- [ ] Decide on a co-author or mentor (optional, recommended).
- [ ] AI-assistance disclosure, per the current TMLR/OpenReview policy.
- [ ] Anonymised artifact link (e.g. an anonymous repository mirror) for the submission.
- [ ] arXiv preprint with `\usepackage[preprint]{tmlr}` and the real author block (optional,
      allowed by TMLR).
- [ ] Submit to TMLR via OpenReview. Fallback venue: Empirical Software Engineering.

## Amendments

*(none to the design or the analysis)*

**Implementation notes** (fixes to the tooling that change nothing the plan specifies):
- **2026-10-11.** The first interleaved A/A smoke stopped at its pilot: the twin's pre-run clean of
  the shared AA workdir failed with EPERM, because a process the harness spawned still held the
  directory for a moment after the first copy finished. The pipeline refused to start the matrix, as
  designed, and nothing was spent beyond preflight and pilot. The runner now retries that clean (and
  the post-run clean, before the workdir lock is released) until the handle is released, and fails
  loudly if it never is (`tools/run-plan.mjs` `retryUntil`, tested).
- **2026-10-11.** The second A/A smoke attempt's pilot then ran clean - both copies solved, no EPERM -
  and was still stopped, because `collect.mjs`'s pilot stage judged every record in the provider's
  shared scratch file (154 on DeepSeek), including the EPERM record of the first attempt. Each pilot
  now runs under its own matrix id and is judged on its own records only.
- **2026-10-11.** Block C (Haiku) first stopped at stage 0, before anything started: the collector
  estimated it at $44.89 against the $31 ceiling. Its generic Anthropic figure is the Haiku+Sonnet
  mean over all five harnesses ($0.362/run); the plan's $18.84 is Haiku's filed DSH-only cost
  ($0.1197 native, $0.1842 PTC per cell). `rerun-b1` now carries that filed figure for Anthropic
  (`tools/rerun-plans.mjs` `costPerCell`, tested). The ceiling ($31) and the $70 stop are unchanged.
