# PRE-REGISTRATION — the hard suite (HARD-PREREG v1.0)

**Written 2026-10-05, before any hard-suite cell was read.** The freeze is the commit that contains this
file; verify it with `git log --oneline -1 -- notes/plans/PRE-REGISTRATION-HARD.md` and `git show <hash>:notes/plans/PRE-REGISTRATION-HARD.md`.
There is no self-referential hash. Unlike `PRE-REGISTRATION.md` v1-v3, this document does not name a
freeze commit that might not contain it: the commit is recorded in `RESULTS`-side prose when the analysis
ships, and the git history is the authority.

## 0. Why this document exists, and what it governs

`PRE-REGISTRATION.md` §1 says "Phase 2, bound by this document: **all further runs**", and its §5 lists
"up to 24 harder (batch 2)" tasks as a design level. The hard suite is therefore Phase 2 data and cannot
be analysed outside a pre-declaration.

This document is that pre-declaration, in full. `PRE-REGISTRATION.md` §12.10 (amendment 23) records its
existence and the boundary between the two documents: batch 1's hypotheses H1-H5 are unchanged and are
not re-tested here; this document declares the analysis of the hard suite, which is a **single-model,
single-provider** matrix and can therefore carry no cross-provider claim.

The order is the project's: **pre-declare, commit, then compute.** This file was committed before
`tools/hard-analysis.mjs` was run against `results/hardpilot-ds-full/runs.jsonl`. Nothing below was
chosen after seeing an effect.

## 1. What was known when this was written (the blindness ledger)

A pre-registration is only worth what its blindness is worth, so the blindness is stated exactly.

### 1.1 Aggregate figures already published in `notes/handovers/HANDOVER-2026-10-04-B.md`

These were written by the previous session and are in the repository before this file:

| known | source |
|---|---|
| 240/240 cells, 241 records, one retried cell | handover §2.7 / `tools/cell-counts.mjs` |
| **178 cells solved (74.2%)** | handover §0 and §2.7 |
| the retried cell is `lh-inventory-allocation` / `dsh:ptc-terse` / seed 1, and **the retry solved** | handover §2.7, `PRE-REGISTRATION.md` §12.9 |
| arms: 24 records each except `dsh:ptc-terse` = 25 (the retry) | handover §2.7 |
| spend $5.4970 in the resume phase, of a $12 ceiling; balance $10.35 | handover §2.7, §3 |

**The two figures that could bias a hypothesis choice - the overall 74.2% solve rate and the identity of
the retried cell - are known and are disclosed here.** No per-arm, per-task or per-cell outcome was
inspected while writing this document.

### 1.2 Prior results on this task set, already in the register

| prior | what it says | status |
|---|---|---|
| F15 / F17 | one and then two hard tasks checked; `lh-ledger-replay` separated arms (50pp spread), `edge-glob-match` did not | superseded by F42 |
| **F42** | the full batch on DeepSeek with **7 arms**: **5/24 discriminating (≥30pp)**, 12 too easy, 3 too hard, 4 threshold; 19/24 separate no two arms | current |
| F18 | on `lh-ledger-replay`, the binary verdict separates models that partial credit does not | replicated (F38) |
| F45 | on batch 1, DeepSeek's raw PTC-vs-native differential is **−2.1%**, position-adjusted **+3.2%** | current |

F42 used a different dataset (the per-task calibration matrices, 7 arms). This pilot is one collection,
**10 arms**, and is the first hard-suite matrix that contains cline, openhands and goose.

### 1.3 Structural facts derived by inspection before this file was written

Inspected: record **key names**, record/cell counts, which gateway logs contain pilot runIds, whether a
`TASKSCORE` line is present, and `matrix.json` / `collection.json`. **Not inspected: any outcome value**
(`solved`, `passRate`, `testsPassed`, `testOutputTail` content, or any cost).

* 241 records, 240 distinct (task, arm, seed) cells, 241 distinct runIds;
* 10 arms; 24 tasks; 1 seed; model `deepseek-flash`; gateway port 8791; matrix `cmuu7wgca-deepseek`;
* the pilot's usage spans **three** gateway logs - `cmutjmthf` (127 pilot runIds), `cmuu6l0kq` (2),
  `cmuu7wgca` (112) = **241** - so cost must be joined across all three, never read from one file;
* **240 of 241** records carry a `TASKSCORE` line (the authored-denominator score); the exception is the
  OS-terminated record, which produced no grader output;
* every record carries `position` (the arm's slot within its task block) and a `fixture` object.

## 2. The data this plan analyses

| | |
|---|---|
| matrix | `results/hardpilot-ds-full/` (`cmuu7wgca-deepseek`) |
| design | 24 tasks x 10 arms x 1 seed = **240 cells** |
| model | DeepSeek V4.1 Flash, `reasoning_effort: high`, priced at the corrected card |
| tasks | `tasks-hard/` - hidden suite of 18-25 authored cases, **fractional** scoring |
| outcome | `solved` = every authored case passes (exit 0); `score` = passed / authored |
| cost | re-derived per run from gateway usage with `cardFor('deepseek-flash')` |

**This is one model on one provider.** No provider-level generalisation is available from it, and no
contrast in this document may be reported as cross-provider evidence.

## 3. Definitions, fixed before computation

**Unit of analysis:** one cell = one (task, arm, seed). With one seed, a cell is one run.
**Blocking factor:** task. Every paired contrast is computed **within task**, over **n = 24 task blocks**,
which is the same pairing the batch-1 analysis uses.

**cost_billed** for a run = sum over that run's gateway requests of
`miss x 0.15 + hit x 0.003 + output x 0.60` USD per million tokens (`tools/prices.mjs`,
`deepseek-flash`), joined by `runId` across the three logs in §1.3. Pricing from a summary or from the
gateway's own `cost` field is not the primary and is not done; the join is asserted to cover 241/241
records or the analysis refuses to run.

**steps** = the number of gateway requests attributable to the run, counted exactly as
`tools/analyze-results.mjs` counts them (usage records with the run's id, excluding `/models` probes).

**score** = `pass` / `authored` from the grader's `TASKSCORE` line - the stricter denominator, since a
solution that breaks an import loses the whole file. `passRate` (node's `testsPassed/testsTotal`) is the
pre-declared sensitivity, never the primary.

**Solve rate** of an arm = solved cells / 24, with a Wilson 95% interval.

## 4. Hypotheses and decision rules

### HH1 — CONFIRMATORY, PRIMARY: the hard stratum separates arms on the binary verdict

F5's limitation on batch 1 is that every arm solved 30 of 31 tasks, so quality carried no signal. F42
found only 5/24 tasks discriminate on DeepSeek with 7 arms. With 10 arms the question is whether the
matrix separates arms at all.

    S = max over arms of (solve rate)  -  min over arms of (solve rate)      in percentage points

**Null:** arm labels are exchangeable within each task block. The permutation resamples the 10 arm
labels inside each of the 24 blocks - the design's own randomisation - 20 000 times.

**Decision rule.** *Arms separate* if the one-sided permutation **p < 0.05** after Holm correction
(§6) **and S >= 10pp**. Otherwise *no detectable separation*, reported as such with S and its CI.

The per-task classification is reported with the **same thresholds as `tools/hardbatch.mjs`**, so the
table can be read beside F42: DISCRIMINATING (>= 30pp spread), TOO EASY (every arm solves), TOO HARD
(no arm solves, mean score < 0.5), THRESHOLD (no arm solves, mean score >= 0.5), weak separation.

### HH2 — CONFIRMATORY: the PTC differential on hard tasks, as an equivalence test

Batch 1's DeepSeek differential is small: raw **−2.1%**, position-adjusted **+3.2%** (F45). The hard
stratum is longer (25-60 tool calls), so the pre-declared question is **not** "is there a penalty" - it
is whether the near-nullity survives a harder stratum, which is an equivalence question.

    d_t   = cost_billed(dsh:ptc, t) - cost_billed(dsh:native, t)      within task t
    D%    = 100 x mean_t(d_t) / mean_t(cost_billed(dsh:native, t))

Cluster bootstrap by task (5 000 draws, fixed seed) gives the CI for `D%`. Positive = PTC costs more,
the sign convention F45 uses.

**Equivalence margin: +/-10 percentage points**, pre-declared. It is the smallest differential the paper
would state as a finding: its stated effects run 20-90%, its practical floors elsewhere are 10-12%
(F32's range floor, F22's 29-32%), and DeepSeek's batch-1 readings are within +/-6pp. A differential
smaller than the margin is reported as *no differential*, never as a small penalty.

**Decision rule** (the 90% CI is the TOST form at a two-sided 5% level):

| observation | verdict |
|---|---|
| 90% CI entirely inside (-10, +10) | **EQUIVALENT** - no PTC differential beyond the margin on hard tasks |
| 95% CI entirely above +10 | **PENALTY** - a hard-stratum PTC penalty, sized by the CI |
| 95% CI entirely below -10 | **ADVANTAGE** - PTC is cheaper on hard tasks |
| anything else | **INCONCLUSIVE** |

### HH3 — CONFIRMATORY: the terseness instruction still cuts cost on hard tasks

F22 (−29 to −32%) and F32 (−12% to −54%, six models) are the study's most robust practical result. The
hard stratum is the strongest available test of it: output volume per task is much larger.

    terse_t   = ( cost_billed(dsh:ptc-terse, t)   + cost_billed(dsh:native-terse, t) ) / 2
    default_t = ( cost_billed(dsh:ptc, t)         + cost_billed(dsh:native, t) ) / 2
    R_t       = 100 x ( terse_t - default_t ) / default_t          (negative = cheaper)

**Estimand:** `mean_t(R_t)`, cluster bootstrap by task. **Test:** exact one-sided Wilcoxon signed-rank
on the 24 `R_t`, alternative `mean < 0`.

**Decision rule.** *REPLICATED* if the exact one-sided p < 0.05 after Holm correction **and**
`mean_t(R_t) <= -10%` (a practical floor below F32's measured range floor). *CONTRADICTED* if the 95% CI
lies entirely above 0. Otherwise *INCONCLUSIVE*.

**Quality travels with it.** Terseness can buy cost by solving less; the paired solve difference for each
of the two policy-matched pairs is reported beside the cost figure, with an exact McNemar test.

### HH4 — CONFIRMATORY: native presentation costs more requests on long-horizon tasks

H3 is the filed confirmatory win (`steps = b0 + b1 x native`, b1 = **+2.2285** [+1.2312, +3.3065] on
batch 1, mixed model with a task intercept). A hard suite with 25-60 tool calls is a genuine
generalisation test of a confirmed effect rather than a second look at it.

    s_t = steps(dsh:native, t) - steps(dsh:ptc, t)

**Test:** exact one-sided Wilcoxon signed-rank on the 24 `s_t`, alternative `mean > 0`, plus the
cluster bootstrap CI. **Decision.** *GENERALISES* if p < 0.05 after Holm correction and the CI's lower
bound exceeds 0; *CONTRADICTED* if the CI lies entirely below 0; otherwise *INCONCLUSIVE*. The batch-1
estimate is printed beside the hard-stratum estimate.

### HH5-HH8 — EXPLORATORY, labelled whatever they show

| id | question | how it is reported |
|---|---|---|
| HH5 | does the arm cost ranking transfer from batch 1 to the hard stratum? | Spearman rho between arm-level median cost per cell in `ds-full` and in the pilot, permutation p, both orderings printed |
| HH6 | how much more does a hard cell cost than a batch-1 cell? | ratio of medians (same model, same 10 arms), task-level bootstrap CI; F16's single-task 14x is quoted as the prior it replaces |
| HH7 | does the binary verdict separate arms that partial credit does not (F18)? | per-arm mean `score` against per-arm solve rate; the descriptor is `solve-rate spread >= 2x score spread` in pp, with both spreads printed in pp |
| HH8 | how do the four external harnesses compare on hard tasks? | per-arm solve rate, mean cost per cell, cost per solved cell; descriptive only, no test |

Exploratory results are labelled exploratory in every place they appear, including the paper's status
table if they reach it.

## 5. Guards, sensitivities, and rules that travel with every primary

1. **The retried cell.** `results/hardpilot-ds-full/runs.jsonl` holds 241 records for 240 cells. Primary:
   the OS-terminated record is excluded as an infrastructure measurement failure (`PRE-REGISTRATION.md`
   §12.9, `tools/exclusions.mjs`), and the retry is the cell's value. **Sensitivity A (worst case):** the
   killed record is substituted as an unsolved cell in place of the retry; HH1's S and every arm solve
   count are recomputed. The handover already states the retry solved, so sensitivity A is expected to
   move the matrix by one cell - it is computed anyway, and this is the disclosure.
2. **Position.** F45 established that the pre-2026-10-04 shuffle was arm-asymmetric and that position
   carries cost. The pilot ran after the fix, whose seed is a function of (task, seed). **Pre-declared
   diagnostic:** the per-arm distribution of `position`. **Rule:** if any arm's share of position 0
   differs from uniform by more than 25pp, HH2 and HH3 are additionally reported position-adjusted with
   F45's estimator (remove the block mean, remove the position mean, restore) as a sensitivity.
3. **Score denominator.** `score` (authored) is primary; `passRate` (node) is the sensitivity for the
   per-task table and HH7.
4. **Unsolved cells.** Primary is intention-to-treat: every non-excluded cell's billed cost counts,
   because the spend is real. Solved-only means are reported beside it as a sensitivity.
5. **Every exclusion is counted** in a flow table (records -> excluded by cause -> cells analysed), and
   the exclusion rule is `classifyRun` unchanged. §9's list is not extended, and nothing is excluded for
   being unsolved.
6. **Absent cells.** 240/240 are expected. Any absent or unpriceable cell is reported as absent, never
   imputed and never topped up (no further hard-suite spend: the matrix is closed and the recorded
   decision is that the pilot is the last hard-suite spend for now).
7. **Quality guard on cost.** For each pre-declared pair, cost is interpretable only if the paired solve
   difference is not detectable (exact McNemar, alpha 0.05). If it is, the pair is reported as
   **quality-confounded**, its numbers are still printed, and no directional cost verdict is drawn from
   it. This is `analyze-results.mjs`'s guard, restated as a test rather than a 15pp rule because n = 24.

## 6. Multiplicity

Following `PRE-REGISTRATION.md` §6, every family is defined here, once, before computation:

* **Confirmatory family (Holm-Bonferroni, alpha 0.05):** HH1, HH2 (primary pair), HH3 (pooled), HH4
  (pooled). Four tests.`tools/stats.mjs`'s `holmFamily` is the implementation, and each p carries its
  Monte Carlo standard error so a verdict inside the simulation noise is visible rather than reported.
* **Secondary family (Holm-Bonferroni, alpha 0.05):** the three policy-matched replicates -
  `ptc-opt - native-opt`, `native-terse - native`, `ptc-terse - ptc`.
* **Exploratory (HH5-HH8):** no correction is claimed and no confirmatory language is used.

## 7. Stopping rules and spend

**Fixed sample, no optional stopping.** The matrix is complete at 240/240 and is not topped up. The
analysis is run once, from the committed plan. If a defect in the tool is found after the first run, the
defect, the diff and the re-run are recorded in the results document - the number is not quietly
replaced. **Spend on this analysis: $0.** The balance is $10.35.

## 8. What would change our conclusions

| observation | conclusion |
|---|---|
| HH1 separates arms and HH2 is EQUIVALENT | the hard stratum carries quality signal while the PTC near-nullity holds - the strongest form this single-provider matrix can support |
| HH1 finds no separation | the 10-arm hard matrix is saturated for DeepSeek too, F42's 7-arm picture extends, and every cost contrast in it is a cost-only comparison |
| HH2 PENALTY | the batch-1 DeepSeek near-nullity is stratum-dependent, which is a new question for the paper's §3.1 account |
| HH3 not replicated | the study's most robust practical result fails at long horizon, and F32's range must be narrowed to short-horizon tasks |
| HH4 not replicated | H3's request-count effect does not extend to 25-60-call tasks; the filed H3 keeps its batch-1 scope |
| HH5 rho <= 0 | the arm ranking is stratum-dependent, a second axis of instability beside F30's provider axis |

## 9. What this plan does NOT decide

1. **The slot correction** for the paper's batch-1 numbers (`PAPER.md` §3.1, §3.7, limitation 8). It is
   an author decision and this document does not make it.
2. **Whether hard-suite results enter the paper's headline.** This plan produces evidence; the paper's
   claims are edited deliberately, by the author, in `PAPER.md`.
3. **The three remaining providers.** ~$54 at the measured $0.054/cell against a $10.35 balance; needs a
   top-up and a fresh spend decision. If they are ever collected, this plan extends to them as
   pre-declared replications - each provider reported separately and never pooled into a cross-provider
   claim without a new amendment.
4. **This document's own hypotheses are not H1-H5.** They do not modify, re-open or re-test the filed
   hypotheses, and a hard-suite result may not be substituted for a batch-1 result in any filed test.

## 10. Amendments

| # | date | change | why |
|---|---|---|---|
| - | 2026-10-05 | v1.0 written and committed before the analysis ran | the project's rule order: pre-declare, commit, then compute |

Any amendment is appended here with its date and the reason, and none may be added after the
corresponding effect has been seen.

## 11. The tool, and how the plan is pinned to the code

`tools/hard-analysis.mjs` implements this document and `tools/hard-analysis.test.mjs` tests it. The
declared constants - 24 tasks, 10 arms, 240 cells, 241 records, the +/-10pp equivalence margin, the 10pp
HH1 floor, the -10% HH3 floor, 20 000 permutations, 5 000 bootstrap draws, alpha 0.05 - live in one
exported object in the tool, and a test asserts each one equals the value written in this file. That is
the same WIRING pattern the watchdog thresholds use: a rule that only the code can see is a rule nothing
can check.

The results document is `notes/records/HARD-SUITE-2026-10-05.md`. It reports every pre-declared figure, every
sensitivity, every exclusion, and anything the plan did not anticipate - named as such.
