# HARD-SUITE-2026-10-05 — the 240 hard cells, analysed under the plan committed before they were read

| | |
|---|---|
| plan | `notes/plans/PRE-REGISTRATION-HARD.md` (HARD-PREREG v1.0), **commit `8ec47c4`**, committed before the tool ran |
| tool | `tools/hard-analysis.mjs`, **commit `3792f88`**, with one further commit touching it (`3c78490`, which ships this record); the tool at HEAD is identical to the one that produced these figures |
| output | `analysis/hard-suite-2026-10-05.json` |
| data | `results/hardpilot-ds-full/runs.jsonl` — 241 records, 240 cells, matrix `cmuu7wgca-deepseek` |
| spend on this analysis | **$0** — nothing re-run, topped up or added |

## 0. The headline

* **Terseness replicates on hard tasks: −32.8%** [−36.9, −28.8] on billed cost, exact one-sided
  Wilcoxon p = 6.0e−8. F22/F32's most practical result survives a stratum twice as long.
* **The request-count effect does not merely generalise, it scales: native costs +16.3 requests per
  task** [11.7, 21.1] against **+2.3 on batch 1** — the same sign, seven times the size, on tasks with
  25–60 tool calls instead of 8–12.
* **The 10-arm matrix separates no arm on the binary verdict**: S = 12.5pp, permutation p = 0.65.
  It would have needed 16.7pp. The hard suite discriminates *per task* (6/24 tasks) and not *per arm*.
* **The PTC differential reverses sign and is no longer zero.** Hard tasks: **−9.31%** [−17.05, −0.65],
  a PTC *advantage*, CI excluding zero, on arms that solve exactly the same 18 tasks. Batch 1 (same
  estimator, same model): **+0.13%** [−8.60, +9.80]. The pre-declared equivalence test still returns
  INCONCLUSIVE, and §7.1 explains why that word understates it.
* **F16's 14x is wrong by half**: a hard cell costs **6.46x** a batch-1 cell [4.75, 8.72], measured on
  24 tasks instead of one.
* **The shuffle stays inside the pre-declared tolerance**: `dsh:ptc` reaches position 0 in 1 of 24 runs
  (4%) and the largest per-arm deviation is 15.0pp, under the 25pp trigger. The 50%/67% baselines this
  bullet first quoted came from F45 and do **not** describe the matrices that ship (every one of them
  reads 2/62); see §6, defect 5, and the corrected F50.

## 1. Flow — what was excluded, and what it cost

| stage | count |
|---|---|
| records in `runs.jsonl` | **241** |
| excluded: `interrupted` (0x40010004, `PRE-REGISTRATION.md` §12.9) | **1** |
| cells = distinct (task, arm, seed) | **240** |
| absent cells | **0** |
| retried cells | **1** (`lh-inventory-allocation|dsh:ptc-terse|1`) |
| records priced from gateway usage | **241 / 241** across 21 gateway logs |
| cells priced | **240 / 240** |
| cells carrying a grader `TASKSCORE` line | **240** (the exception is the terminated record) |
| cells solved | **178 / 240 (74.2%)** |
| billed cost of the 240 analysed cells, re-derived from tokens | **$10.7677** |
| the excluded record, **additional to** that figure | $0.0114 |
| all 241 records | **$10.7791** |

The pilot's usage is split across **three** gateway logs (`cmutjmthf` 127 runIds, `cmuu6l0kq` 2,
`cmuu7wgca` 112). A single-file read would have priced 127 of 241 records; the join is asserted in
`tools/hard-analysis.test.mjs` and the tool refuses nothing silently — the coverage is printed on every
run.

**Reconciliation with the handover's meter figures.** `notes/handovers/HANDOVER-2026-10-04-B.md` reports $6.81 + $5.50
for the two collection phases. This document's $10.77 prices **only the 241 run records' own gateway
requests**; the meter's figure is invocation-level and includes preflight and pilot requests that belong
to no run record. The two answer different questions, and neither is a correction of the other — the
per-cell figure here is the one the analysis needs.

## 2. The arms

| arm | solved | rate | 95% CI | mean score | mean cost | cost/solved | median steps |
|---|---|---|---|---|---|---|---|
| cline | 17/24 | 70.8% | 51–85% | 95.6% | $0.0457 | $0.0645 | 26 |
| dsh:native | 18/24 | 75.0% | 55–88% | 95.6% | $0.0534 | $0.0712 | 38 |
| dsh:native-opt | 19/24 | 79.2% | 60–91% | 96.3% | $0.0583 | $0.0736 | 36 |
| dsh:native-terse | 17/24 | 70.8% | 51–85% | 95.9% | $0.0337 | $0.0475 | 29.5 |
| dsh:ptc | 18/24 | 75.0% | 55–88% | 95.8% | $0.0484 | $0.0646 | 22.5 |
| dsh:ptc-opt | 18/24 | 75.0% | 55–88% | 96.1% | $0.0455 | $0.0606 | 24.5 |
| dsh:ptc-terse | 19/24 | 79.2% | 60–91% | 96.4% | $0.0345 | $0.0436 | 22 |
| goose | 19/24 | 79.2% | 60–91% | 97.5% | $0.0319 | $0.0402 | 28.5 |
| opencode | 16/24 | 66.7% | 47–82% | 92.3% | $0.0326 | $0.0489 | 30 |
| openhands | 17/24 | 70.8% | 51–85% | 96.3% | $0.0648 | $0.0914 | 48 |

Nothing here is a claim: §3 tests them, and most of these intervals overlap.

## 3. The confirmatory family (Holm-Bonferroni, alpha 0.05, four tests)

| id | test | estimate | interval | p | verdict |
|---|---|---|---|---|---|
| HH1 | arm separation, within-task permutation of arm labels, 20 000 draws | S = **12.5pp** | smallest detectable 16.7pp | **0.647** (se 0.0034) | **no separation detectable** |
| HH2 | PTC − native, task-paired, 5 000 bootstrap draws | D = **−9.31%** | 95% [−17.05, −0.65]; 90% [−15.86, −1.96] | TOST 0.430 | **INCONCLUSIVE** (see §7.1) |
| HH3 | terseness, pooled over the two policy-matched pairs | R = **−32.79%** | 95% [−36.90, −28.75] | exact Wilcoxon **6.0e−8** | **REPLICATED** |
| HH4 | native − PTC requests, task-paired | **+16.29** requests | 95% [11.67, 21.13] | exact Wilcoxon **1.3e−6** | **GENERALISES** |

Holm step-down: HH3 (p < 0.0125) and HH4 (p < 0.01667) survive; HH2 (p = 0.430 vs 0.025) and HH1
(p = 0.647 vs 0.05) do not. No p sits within two Monte Carlo standard errors of its threshold, so no
verdict here is simulation noise.

**HH1's null is a statement about resolution, not about equality.** The observed spread is 12.5pp; the
null's 95th percentile is 16.7pp. With 24 tasks and 10 arms, marginal solve rates are too imprecise for
a 12.5pp spread to mean anything — while the per-task table (§4) shows six tasks that separate arms
cleanly. Both are true and they are different questions: the batch discriminates task by task, and the
arms' overall rates are indistinguishable.

**HH2's quality guard is clean.** `dsh:ptc` and `dsh:native` solve *exactly the same 18 tasks* — zero
discordant pairs, exact McNemar p = 1 — so the −9.31% is not bought with quality.

**HH3's guard is small and offsetting.** One task solves under `native-terse` but not `native`; one
solves under `ptc` but not `ptc-terse`. The cost saving is not a solve-rate artefact.

## 4. The per-task table (same classes as `tools/hardbatch.mjs`)

| class | count | tasks |
|---|---|---|
| **DISCRIMINATING** (≥30pp spread) | **6 / 24** | spec-diff-patch (9/10), lh-migration-planner (9/10), edge-json-schema (8/10), lh-ledger-replay (3/10), edge-number-format (8/10), cross-nullability (1/10) |
| TOO EASY (every arm solves) | 14 | — |
| TOO HARD (no arm solves, score < 50%) | **0** | — |
| THRESHOLD (no arm solves, score ≥ 50%) | 4 | lh-search-ranking (96.0%), cross-trace-context (84.0%), lh-job-scheduler-catchup (83.3%), cross-error-taxonomy (76.8%) |
| weak separation | 0 | — |

**Why the aggregate is flat: each discriminating task has a different failing set.** `spec-diff-patch`
fails only openhands; `lh-migration-planner` only opencode; `edge-json-schema` fails cline and
`dsh:native-terse`; `edge-number-format` fails goose and opencode; `lh-ledger-replay` is solved only by
`dsh:native-opt`, `dsh:ptc-terse` and goose; `cross-nullability` only by goose. **No arm is the common
loser**, so six task-level separations cancel in the marginals — which is precisely the quantity HH1
tests, and why a per-task result and a per-arm null are both correct.

**Read beside F42, not against it.** F42 measured 5/24 discriminating, 12 too easy, **3 too hard**, 4
threshold on 7 arms from the per-task calibration matrices. This is a different dataset (one collection,
10 arms), and its numbers land close: 6/24, 14, 0, 4. The one substantive difference is that **no task
in this matrix is out of reach for every arm** — F42's three too-hard tasks were each solved by at least
one of the ten arms here, which is what three extra arms and threshold tasks do.

## 5. Exploratory (HH5–HH8), labelled exploratory wherever they appear

**HH5 — the ranking transfers.** Spearman rho = **0.818**, permutation p = **0.0053** between
batch-1 and hard-stratum median cost per arm (same model, same 10 arms).

    batch 1: dsh:ptc-terse < dsh:native-terse < opencode < goose < dsh:ptc < dsh:native < cline < dsh:ptc-opt < dsh:native-opt < openhands
    hard   : goose < dsh:ptc-terse < opencode < dsh:native-terse < cline < dsh:ptc-opt < dsh:ptc < dsh:native < dsh:native-opt < openhands

The two extremes are stable (goose/ptc-terse cheap, openhands/native-opt dear); the middle moves. **F30's
instability is across providers; this says that within one provider the ordering is largely
stratum-stable**, which is the sharper statement.

**HH6 — hard cells cost 6.46x batch-1 cells** [4.75, 8.72] (hard median $0.0400, batch-1 median
$0.0062, task-level bootstrap over both sets). F16 reported **~14x** from a single task; that estimate is
replaced. The direction is unchanged — hard tasks cost several times more — the magnitude is halved.

**HH7 — the binary verdict separates arms that partial credit does not (F18's shape), and it holds at
batch scale.** Solve-rate spread **12.5pp** against mean-score spread **5.2pp**, ratio **2.40**
(descriptor: solve spread ≥ 2x score spread), rank correlation 0.682. Every arm scores 92.3–97.5% of
the authored assertions; the arms that differ do so almost entirely at the all-or-nothing line.

**HH8 — the four external harnesses on hard tasks** (descriptive, no test): goose 19/24 solved at
$0.0319/cell and $0.0402 per solved task; opencode 16/24 at $0.0326 and $0.0489; cline 17/24 at $0.0457
and $0.0645; openhands 17/24 at $0.0648 and $0.0914. On hard tasks the cheap-and-accurate harness is
goose, where batch 1's cheapest was opencode — consistent with HH5's middle-of-the-table movement and
with F30's provider-dependence, at a resolution this matrix cannot settle.

## 6. Defects found while doing this, and what was re-run

Four, in the project's usual shape: all four were invisible to a passing test suite, and two were found
after the first run of real data. Both of those are disclosed here with the number that moved.

| # | defect | found | what changed |
|---|---|---|---|
| 1 | `clusterBootstrap` **ignored a `probs` option**, so HH2's equivalence test would have been handed the 95% interval it did not ask for | by inspection, **before** the first run | none — fixed in `3792f88` with a property test |
| 2 | the **Wilson closed form returns ≈ −9e−7 at k = 0**, so a boundary arm could exclude zero by a rounding error | by test, **before** the first run | none — clamped, test added |
| 3 | **S1 used a one-sided penalty test** where HH2's rule (equivalence, margin ±10pp) is the replicate's rule | after run 1 | S1's p 0.99975 → **0.99460** (TOST), a 95% CI and the verdict **ADVANTAGE** added. **No estimate moved**: −22.01% both times |
| 4 | **the module ran its CLI at import**, so importing it in a test executed the pipeline; the failure surfaced as a module-level TypeError rather than a test failure when S2/S3 lacked CIs | after run 1 | the analysis is unchanged; the module is now import-safe and S2/S3 carry CIs |
| 5 | **a published baseline was copied from another finding instead of derived** — F50, §0 and §8 compared the pilot's positions against F45's 31/62 and 44/66 | after this record was committed, by an **independent audit** | those baselines are pre-loss figures for a matrix the repository says was destroyed and re-collected; the correct comparison is **2/62 (3%)** on every shipped matrix, and the inference reverses. Corrected in F50, §0 and §8. **No number this analysis computed moved: the audit reproduced all seven requested items exactly, and a fresh run matches the committed JSON field-for-field** |

**Independent verification, 2026-10-05.** A separate read-only audit re-derived the flow, the arm table,
the PTC differential (its own 100 000-draw bootstrap: [−17.15, −1.16] against this record's
[−17.05, −0.65] — both exclude zero), the terseness estimate (its own CI [−36.94, −28.53]), the request
difference, the task classes, the failing-arm sets, the position counts and the freeze. **All seven
requested items reproduced exactly, and a fresh in-process run matched every numeric field of
`analysis/hard-suite-2026-10-05.json` with zero differences.** It also confirmed the freeze independently:
the plan's commit `8ec47c4` is an ancestor of the JSON's commit `3c78490`, and the plan file has exactly
one commit. It found three documentation discrepancies — defect 5 above, a provenance claim about how
many commits touch the tool (one, not four), and the spend relationship in §1 (the excluded record's
$0.0114 is additional to the $10.7677, not part of it). All three are corrected here, and none of them
touches a computed figure. Its one undisprovable check is the claim that this analysis ran three times:
intermediate states were never committed, so nothing in git attests them.

Runs: the pre-registered analysis has been executed **three** times, all after the plan was committed:
run 1 (HH1–HH4, secondary, worst case, position), run 2 (S1 rule fixed, HH5–HH8 added), run 3 (HH1's
detectable spread, and sensitivities B and C). Exploratory sections were added between runs 1 and 2;
**no confirmatory estimate or verdict changed between runs except S1's test, and S1 is secondary.**

## 7. Where the plan was wrong, or silent

**7.1 HH2's verdict table has no cell for this result.** The plan's rules are: EQUIVALENT if the 90% CI
is inside ±10pp; PENALTY if the 95% CI is entirely above +10; ADVANTAGE if it is entirely below −10;
otherwise INCONCLUSIVE. The observed 95% CI is [−17.05, −0.65] — **it excludes zero, so there is a
detectable PTC advantage, and it is not confidently larger than the margin, so ADVANTAGE does not fire**.
INCONCLUSIVE is the letter of the plan and it is what is reported, but it is a label for "the interval
straddles the margin", not for "we learned nothing". The honest sentence is the interval: *on hard tasks
PTC costs 0.65% to 17% less than native, on arms that solve the same tasks.* A four-verdict taxonomy
cannot express that, and the plan should have had a fifth label — recorded as a defect of the plan, not
patched after the fact.

**7.2 HH1's 10pp floor sits below the design's own resolution.** The smallest spread this matrix would
have called significant is 16.7pp, so the pre-declared floor could never bind: any S that passed the
floor test would already be below the detection limit. A floor is only meaningful above the resolution,
and this one is decoration. It is recorded, not changed — raising it after seeing S = 12.5pp would be
exactly the selective analysis the plan exists to prevent.

**7.3 The plan's HH2 comparator was quoted, not computed.** The plan cites F45's −2.1% / +3.2% for
batch-1 DeepSeek. Computed with *this* estimator (task-paired, seeds averaged per §3), batch 1 is
**+0.13% [−8.60, +9.80]**. All three agree on "near zero" and the difference is estimator choice, not
disagreement — but a comparator that is quoted instead of derived is a comparator that cannot be
checked.

## 8. Sensitivities (all pre-declared, all reported)

**A — the retried cell, worst case.** Substituting the OS-terminated record for the retry: **177** cells
solved instead of 178, arm spread unchanged at 12.5pp. The shutdown moves exactly one cell, as §12.9
said it would.

**B — the scoring denominator.** Authored (`TASKSCORE`, primary) 95.8% vs node (`passRate`) 95.8%;
**0 of 24** task classes change; HH7's descriptor holds under both. The denominators agree, which is not
guaranteed and is worth knowing.

**C — intention-to-treat vs solved-only cost.** Per arm, the mean billed cost of all cells against the
mean of solved cells only: the largest shift is openhands $0.0648 → $0.0559 (unsolved runs cost it more),
and `dsh:ptc` is unchanged at $0.0484. The ITT figures are primary and no ordering changes.

**Position (F45's rule).** Max |share of position 0 − uniform| = **15.0pp**, under the pre-declared 25pp
trigger, so no position adjustment is required. Detail: `dsh:native-terse` 6/24, `dsh:native-opt` 5/24,
`dsh:ptc-terse` 3/24, and **`dsh:ptc` 1/24 (4%)**.

**A correction, found after this record was first committed.** The first version of this paragraph
compared the pilot against "31/62 (50%) on the historic batch-1 matrix" — a figure copied from F45. It
does not reproduce: **every** shipped matrix (ds-full, glm-flash, qwen-full, luna-full, haiku-full,
sonnet-full) records `dsh:ptc` at position 0 in **2 of 62 runs (3%)**, with a maximum per-arm deviation
of 6.77pp, and `tools/run-experiment.mjs`'s own amended header says so. Replaying the current
FNV(task|seed) shuffle reproduces the shipped positions and the pilot's alike, so the pilot is not a
post-fix contrast against a skewed baseline — and on archived data the shipped matrices are *better*
balanced than the pilot. F45's cost-by-position effect was **not** re-derived and remains open. See
defect 5 and the corrected FINDINGS F50.

## 9. What this does not say

1. **Nothing cross-provider.** One model, one provider, 24 tasks. No contrast here may be reported as
   provider-general, and `PRE-REGISTRATION.md` §12.10 forbids substituting any of it for a filed result.
2. **H1–H5 are untouched.** The hard suite is a harder stratum of the same model, not a new test of the
   filed hypotheses; its two successes (HH3, HH4) are *replications* of filed effects on a new stratum,
   and its nulls (HH1, HH2) are about this matrix's resolution.
3. **Six of 24 tasks carry the quality signal**, and each is separated by a different arm subset. Any
   paper claim that "the hard suite ranks harnesses by quality" is false at the arm level and true only
   task by task.
4. **Cost per solved task is a ratio with quality in the denominator.** Both it and cost per cell are
   reported; where they disagree (§2) the disagreement is the finding, not a rounding detail.
5. **No paper text was edited.** `notes/plans/PRE-REGISTRATION-HARD.md` §9.2 reserves that decision: whether these
   results enter the paper's claims is an author decision, and this document is the evidence for it.

## 10. Reproducing this

```powershell
node tools/hard-analysis.mjs --json analysis/hard-suite-2026-10-05.json
node --test tools/hard-analysis.test.mjs      # 17 tests, statistics checked against brute force
node --test "tools/*.test.mjs"                # 177 tests at the time of writing
```

The tool is deterministic: every stochastic function builds its own stream from a fixed seed, so the
numbers above are reproducible exactly, not approximately.

## 11. Files

| file | what |
|---|---|
| `notes/plans/PRE-REGISTRATION-HARD.md` | the plan, committed at `8ec47c4` before the first run |
| `PRE-REGISTRATION.md` §12.10 | amendment 23, binding the hard suite to the plan and separating it from H1–H5 |
| `tools/hard-analysis.mjs` | the implementation |
| `tools/hard-analysis.test.mjs` | 17 tests: exact statistics vs brute force, the retry rule, real-data shape, wiring to the plan |
| `analysis/hard-suite-2026-10-05.json` | every figure in this document, machine-readable |

**`artifact/MANIFEST.json` still does not cover any of this**, and `--verify` still exits 0. Re-signing
would recompute the recorded hashes for a new file set, which is a deliberate act and is not done here:
the handover's rule is that the manifest is not re-baselined casually, and the hard suite is one
document and one JSON away from a sign-off the author can take at the same time as the paper edits.
