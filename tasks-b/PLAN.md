# tasks-b — PRE-DECLARED ANALYSIS PLAN

**Fixed on 2026-10-03, before any tasks-b run record exists.** This file is the
analysis the collection will feed. At journal tier a rule chosen after seeing
the effect is fatal; everything below is therefore stated mechanically, in
advance, and deviations from it are themselves reportable events.

This plan mirrors the batch-1 analysis *as reconciled* in
`STEP2-RECONCILIATION.md` (commit `e2c1aac` and later), which superseded the
destroyed seven-model figures. The batch-1 numbers below are the study's
current batch-1 result — the replication target.

## 1. What is being replicated

The batch-1 headline (STEP2-RECONCILIATION §4): **the sign of the PTC cost
differential is not shared across providers.** On the four surviving matrices
(620 cells each, `cost_billed`, presentation arms `dsh:ptc` vs `dsh:native`,
paired by task, cluster bootstrap over 31 tasks):

| provider (model) | batch-1 differential | batch-1 95% CI | batch-1 classification |
|---|---|---|---|
| Qwen3.8-Flash | **+30.7%** | [+10.0, +53.3] | positive (CI excludes 0) |
| GLM-5.3-Flash | **−20.8%** | [−43.7, −2.7] | negative (CI excludes 0) |
| gpt-6-luna | **+1.2%** | [−8.4, +11.3] | null (CI contains 0) |
| DeepSeek V4.1 Flash | **+0.1%** | [−9.0, +9.8] | null (CI contains 0) |

Secondary batch-1 results against which tasks-b is also read:

- **H1 slope** (the filed confirmatory regression: PTC penalty against output
  share of cost): on the survivors, b1 = **−0.0049** [−0.0083, −0.0013] —
  negative, CI excludes 0.
- **The family correction**: **0 of 12** secondary/pairwise contrasts survive
  Holm at α = 0.05 (§4 below). The paper rests on signs and intervals, not on
  significance stars; tasks-b is read the same way.

## 2. Design

- **Cells**: 40 tasks × 10 arms × 2 seeds = **800 per provider**, collected by
  `tools/collect.mjs --plan batchb`, one matrix per provider.
- **Providers**: the four cheap providers of the batch-1 re-collection
  (deepseek, zai, openai, qwen), in that order, each gated by the pipeline's
  own credit check, preflight, pilot and verify stages. **No Anthropic.**
- **Treatment**: identical to batch-1 per provider — the gateway flag table in
  `tools/collect-gateway.mjs` (forced model, forced effort where batch-1 had
  it, per-provider cache-breakpoint setting, max-tokens ceilings where the
  evidence requires them). The pipeline resolves and records these; they are
  not re-decided here.
- **Outcome**: the hidden grader's fraction of authored cases passed
  (`TASKSCORE`), and the binary `solved` flag (grader exit 0 = 100% of
  cases). Unlike batch-1's binary grading, tasks-b has partial credit; the
  replication target in §5 is therefore the **cost contrast**, which is
  computed identically in both suites. Solve rates are reported per arm but
  are not part of the replication verdict.

## 3. Exclusions and the test-editing rule — decided now

- **Run exclusions**: the pre-registered rule, implemented by
  `tools/exclusions.mjs` and unchanged for this suite (infrastructure-classified
  failures excluded; every exclusion counted and reported).
- **Test editing**: by construction, editing `fixture/test/` cannot move the
  hidden score — the grader is staged from outside the fixture.
  `fixture.gradedOnEditedTests` is still recorded on every run and reported
  per arm, but **no run is excluded for editing fixture tests**, because the
  measurement it could corrupt does not exist in this suite. (This is the
  tasks-b answer to HANDOVER-2026-10-03 §4.1, fixed before any data exists.)
- **Frozen tasks**: once the first matrix of this suite starts, task
  definitions are frozen. A task-level defect discovered mid-collection voids
  that task's cells (excluded and reported with the reason) — it is never
  repaired post-hoc and re-run inside the same matrix.
- **Zero-cost guard**: `!error && no billable usage` runs are investigated and
  excluded as infrastructure, per the batch-1 verification recipe
  (HANDOVER-2026-10-03 §8).

## 4. The Holm family — declared before any p-value exists

Following STEP2-RECONCILIATION §5.1 (DECIDED 2026-10-03, the filed reading is
primary): the family is **every secondary and pairwise contrast this report
tests with a p-value, reported together** — the 4 per-provider cost contrasts
(A2b) + the 8 solve-rate contrasts (A4), **m = 12**, Holm step-down at
α = 0.05. The narrow reading (each block its own family, 4 and 8) is printed
as a sensitivity line, exactly as the batch-1 tool does. The primary contrast
in §5 is an estimation target with a confidence interval and is not a member
of the family.

## 5. The primary contrast and the exact replication criterion

**Primary contrast (per provider)**: the PTC billed-cost differential

    D = mean over seeds of cost_billed(dsh:ptc) − cost_billed(dsh:native)

paired by task, reported as a percentage of the native arm's cost, with a 95%
cluster-bootstrap interval over the 40 tasks — the same estimator, same
clustering, same bootstrap parameters as the batch-1 re-analysis
(`tools/panel-analysis.mjs` at its post-`e2c1aac` behaviour). Costs are
re-derived from gateway usage with `costOf(model, usage)`, never from a
summary. `cost_cold` variants are reported alongside, as in batch 1.

**Classification**: each provider's tasks-b differential is classified
**positive** (95% CI entirely above 0), **negative** (entirely below 0), or
**null** (CI contains 0) — the same rule that classifies the batch-1 row in §1.

**The criterion for "the batch-1 result replicated":**

- **R1 (per-provider classification)**: all four providers' tasks-b
  classifications equal their batch-1 classifications — Qwen positive,
  GLM-Flash negative, luna null, DeepSeek null.
- **R2 (the headline pattern)**: at least one provider classifies positive
  and at least one classifies negative on tasks-b — the sign disagreement
  itself reproduces on the new suite.
- **Verdict**: *replicated* requires **R1 (4 of 4) and R2**. If R1 holds for
  exactly 3 of 4 providers the verdict is *partially replicated* and the
  deviating provider is named. Otherwise *not replicated*. There is no
  "replicated with caveats" tier invented after the fact.

**Reported alongside, not part of the verdict:**

- **R3 (magnitude)**: for each provider, whether the batch-1 point estimate
  lies inside the tasks-b 95% CI or vice versa (CI-overlap).
- **H1 slope** re-fit on tasks-b with the filed model spec; replication read
  as "slope negative with 95% CI excluding 0", matching the survivor result.
- The **Holm family** result (m = 12) and its narrow-reading sensitivity.
- Per-stratum differentials (10 tasks per stratum — underpowered by
  construction; reported descriptively, no inferential claim).

## 6. Tooling and output discipline

- The analysis runs the same tools at the same fixed versions as the batch-1
  re-analysis: `tools/panel-analysis.mjs`, `tools/hypotheses.mjs`,
  `tools/cost-panel.mjs`, pointed at `results/batchb-*`.
- **Outputs go to new paths** — `analysis/*-batchb-<date>.json`. Nothing
  overwrites the surviving pre-loss analysis files or the 4-model
  reconciliation files (the STEP2-RECONCILIATION §2 rule).
- Every matrix is verified before analysis by the HANDOVER-2026-10-03 §8
  recipe: cell counts, error records, spend re-derived and reconciled against
  the whole gateway log, zero unexplained zero-cost runs, `harnessVersion`
  and `fixture` on 100% of records, backup `--verify` exit 0, clean tree.

## 7. Cost ceiling — to be derived before launch, recorded here when it is

The batch-1 per-cell costs observed on the four cheap matrices
(HANDOVER-2026-10-03 §2: $25.71 for 4 × 620 cells) put a first estimate for
this suite at roughly **$7–15 per provider, $30–60 total** (800 cells each,
scaled per-provider from observed per-cell spend with headroom for the qwen
overrun class documented in §4.3 of the handover: 50% over estimate). The
launching session must re-derive this from `results/` per-cell costs at launch
time, set `--max-cost` accordingly per provider, and record the derivation in
this section before the first matrix starts. **No matrix starts without a
backup target configured and a spend ceiling set.**

### MEASURED 2026-10-05 — the smoke matrix, and the ceilings derived from it

`results/smoke-batchb-ds-full`, 160 cells (2 arms x 40 tasks x 2 seeds), DeepSeek, matrix
`cmuv4fz23`. Verified with the §6 recipe: **160/160 cells, 160 records, 0 infrastructure
exclusions, 154 solved (96.3%), `harnessVersion` and `fixture` on 100% of records, no zero-request
runs, no unexplained zero-cost runs, spend re-derived from gateway usage.**

| | |
|---|---|
| spend | **$3.5790** over 160 cells |
| **per cell** | **$0.02237** |
| vs batch-1 DeepSeek ($0.00785/cell) | **x2.85** |
| vs the hard suite ($0.04487/cell) | x0.49 |
| mean per run | 19.9 requests, 303 s |

**Why this section exists, demonstrated.** The pipeline's own estimate for those 160 cells was
$1.39 — it re-prices archived tokens at batch-1 task size. Its default ceiling (1.5x the estimate,
meter kills at 90%) would have been **$2.09 and killed the matrix at ~cell 85**, half collected. The
estimate was not merely optimistic; it was unusable. *This run's own transcript stops in the verify
stage, on a defect fixed the same day: 71c4a0c deleted `const solved` from that stage and left the
reference in its `writeStatus` call, so every matrix sign-off since has thrown at its last statement.
The matrix itself is complete and was verified by hand against the §6 recipe; the defect is fixed,
with a test that fails on the old source.*

| run | cells | basis | `--max-cost` |
|---|---|---|---|
| DeepSeek, full | 800 | 800 x $0.02237 = $17.90 | **$27** |
| Haiku, smoke | 160 | 160 x $0.131 x 2.85 = $59.7 | **$90** |
| Sonnet, smoke | 160 | 160 x $0.101 x 2.85 = $46.1 | **$69** |
| Haiku, full | 800 | 800 x $0.131 x 2.85 = $298.7 | **$402**, to be re-derived from the smoke |
| Sonnet, full | 800 | 800 x $0.101 x 2.85 = $230.3 | **$311**, to be re-derived from the smoke |

The Anthropic rows use the **upper** end of the §9.3 per-run bracket, because the 2.85 size factor
is measured on DeepSeek and Anthropic's caching is weaker — the smoke replaces this basis before
either full matrix starts. **Exposure note:** both full Anthropic ceilings sum to $713 against the
stated $600 credit, so the smoke re-derivation is what keeps the commitment inside it; the launching
session must re-set these from measurement, not from this table.

### MEASURED 2026-10-05 (2) — the Sonnet smoke, and the ceilings it sets

`results/smoke-batchb-sonnet-full`, 160 cells (2 DSH arms x 40 tasks x 2 seeds), `claude-sonnet-5.5`,
matrix `cmuvhd54s-anthropic-sonnet`. Verified: **160/160 cells, 0 infrastructure exclusions, 154 solved
(96.3%), `harnessVersion` and `fixture` on 100%, 160/160 priced, no unexplained zero-cost runs.**

| | |
|---|---|
| run-attributable cost | **$22.3641** over 160 cells |
| **per cell** | **$0.1398** |
| 800-cell projection, DSH pricing | **$112** |
| unknown-split requests | **0** — both arms are DSH, whose cache split IS recorded, so this smoke's cost is EXACT, not a bracket |
| per arm | `dsh:native` $0.1409 · `dsh:ptc` $0.1408 — no PTC cost penalty on Sonnet in this smoke |
| solve rate | 146/152 at the time of the earlier read, 154/160 final |

**The full matrix is not this number.** 6 of its 10 arms are DSH (exact) and 4 are external harnesses
whose cache split is unknown — the bracket in `DEFECT-anthropic-external-costs.md`. The spend meter
prices those at the MISS rate, i.e. the upper bound, so the ceiling must be set on the meter's basis:
480 DSH cells x $0.1398 + 320 external cells x ~$0.31 = ~$166, +50% headroom. **Sonnet full matrix:
`--max-cost 250`.**

**Sequencing, and why.** Run the Sonnet full matrix FIRST. Its four external arms are the first
Anthropic external-arm data collected since the ledger established that the truth sits near the
cache-read floor rather than the miss ceiling; comparing the meter's total against the run-attributable
cost shows how much the meter overstates, and that factor sets Haiku's ceiling from measurement. Haiku's
provisional ceiling, on its smoke's $0.2521/cell and the same method, is `--max-cost 450` — the two
ceilings sum to $700 against a $600 credit, which is tolerable only because the meter overstates the
external arms; if it turns out not to, Haiku is cut to one seed rather than overrunning.

**A note on the Haiku smoke while it finishes** (101/160 read): it solves only **52%** of tasks-b where
Sonnet solves 96%, and its two arms diverge — `dsh:native` 63% against `dsh:ptc` 42%. That is a quality
gap the extension's Haiku row must carry through the plan's §5 guard, and the two cost figures will
disagree in a way worth stating in advance: $0.2314 vs $0.2733 per *cell* (PTC 18% dearer), $0.37 vs
$0.65 per *solved task* (PTC 77% dearer). Smoke numbers, 1 seed, not a result.

### MEASURED 2026-10-05 (3) — the Haiku smoke, and the quality gap it exposes

`results/smoke-batchb-haiku-full`, 160 cells (2 DSH arms x 40 tasks x 2 seeds), `claude-haiku-4.5`,
matrix `cmuvc93od-anthropic`. Verified: **160/160 cells, 0 exclusions, 92 solved (57.5%), 160/160
priced, 0 unknown-split requests (exact), `harnessVersion` and `fixture` on 100%.**

| arm | solved | cost/cell | cost/solved task |
|---|---|---|---|
| `dsh:native` | **57/80 (71%)** | $0.2215 | $0.3109 |
| `dsh:ptc` | **35/80 (44%)** | $0.2590 | **$0.5921** |
| overall | 92/160 (57.5%) | **$0.2403** | — |

**The arms do not solve the same tasks.** Of 40 paired tasks, 12 are discordant and **11 of the 12
favour native** (exact McNemar p ~ 0.006). So the Haiku extension row is **quality-confounded by the
plan's own §5 guard**: the cost contrast must be reported beside cost per solved task, and the
per-cell figure (PTC 17% dearer) is not the headline — $0.3109 against $0.5921 per solved task is.

> **CORRECTED 2026-10-10 — the discordance count in the sentence above does not recompute.** From the
> shipped smoke (`results/smoke-batchb-haiku-full/runs.jsonl`): paired by **(task, seed)** the
> discordant cells are **25 vs 3** favouring native, exact two-sided McNemar **p = 2.7e-5**; paired by
> **task** (solve proportion over the two seeds) they are **21 vs 3**, **p = 2.8e-4**. Neither pairing
> gives 12/11, and no pairing of this smoke does. The guard's direction and its conclusion — the
> per-cell contrast is quality-confounded, and per-solved-task cost is the headline — are unchanged
> and stronger. The full matrix's own figures are re-derived from the panel in `PAPER.md` §3.8
> (10 vs 1, p = 0.0117).

**Ceiling.** 480 DSH cells x $0.2403 + 320 external cells at the meter's miss-rate upper bound
(~$0.53) = ~$285, +50% headroom: **Haiku full matrix `--max-cost 430`** — to be re-set from the Sonnet
matrix's measured external-arm behaviour, which runs first.

**Both smokes are now complete, and both are exact.** Measured Anthropic projection for the full
design: Sonnet **$112** and Haiku **$192** at DSH pricing, rising toward the ceilings only if the
external arms bill near the miss rate — which the ledger says they do not.

## 8. What this plan does not decide

- Whether tasks-b results are pooled with batch-1 in any paper table (an
  editorial decision; if pooled, the suites are always reported separately
  first, because this is a replication suite, not new batch-1 data).
- The F45 position-confound re-run and any Anthropic spend — separate
  decisions, separate pre-declarations.

---

## 9. AMENDMENT 1 — 2026-10-05: Anthropic joins as an extension, and the ceiling becomes a measurement

**RATIFIED by the owner on 2026-10-05**, in the session that wrote it, before any tasks-b run record
existed. The ratification covers §9.1–§9.4 as written; the re-derivation in §9.3 below is a number
update inside a ratified rule, not a rule change.

**Fixed before any tasks-b run record exists.** No `results/batchb-*` directory exists at the time of
writing, so nothing below is informed by tasks-b data. §1–§8 above are kept as written; this section
supersedes the second bullet of §8 ("any Anthropic spend — separate decisions") and nothing else.

### 9.1 Anthropic is an EXTENSION, not part of the replication verdict

**R1 and R2 in §5 are unchanged and remain defined on the four cheap providers.** An Anthropic row
cannot make the primary verdict better or worse; it is reported beside it.

- Two rows are added, each at the §2 design: `claude-haiku-4.5` and `claude-sonnet-5.5`, 800 cells
  each, collected **after** the four cheap providers unless the launching session records a different
  order before the first matrix starts.
- Their batch-1 targets are the six-model A2 rows (`analysis/panel-analysis-6model-2026-10-03.json`):
  Haiku **+53.8%** [+31.8, +77.8] *positive*, Sonnet **+9.5%** [+0.3, +17.9] *positive*. Extension
  verdict, per model: classification matches its batch-1 row -> **extension row replicated**; otherwise
  **extension row not replicated**, naming the model. No pooled Anthropic claim is made either way.
- `collect.mjs` refuses Anthropic without `--i-know-anthropic-is-expensive`. That flag is required,
  not a formality to be worked around, and the refusal text is the record of why.
- **Standing rule, unchanged: an Anthropic cost is a BRACKET and is never quoted as a figure** in any
  finding, table or verdict. The extension's contrast is a within-provider ratio, which the bracket
  does not affect.
- **Disclosed limitation.** On the Anthropic path the gateway did not record the cache split for the
  external arms, so A6 reads 0.000 for every external Anthropic arm (`DEFECT-anthropic-external-costs.md`).
  The extension therefore reports the PTC/native differential and prefix retention, and makes **no
  cache-split claim** on Anthropic.

### 9.2 The ceiling is measured, not estimated

The pipeline's own estimate for this suite is **$6.96 for 800 DeepSeek cells**, because it re-prices
archived tokens at batch-1 task size. tasks-b fixtures are 350–1,800 lines — tasks-hard-sized — and the
hard pilot measured **$0.0449/cell** on 24 comparable tasks, about **5x** that basis. A ceiling taken
from the pipeline default (1.5 x its estimate, with the meter killing the matrix at 90% of it) would
abort the run roughly a quarter of the way in. So:

1. A bounded **SMOKE matrix** runs first, on DeepSeek, in its own outdir with its own name prefix:
   `--arms dsh:ptc,dsh:native`, 40 tasks x 2 seeds = **160 cells**. Its purpose is to measure this
   suite's real cost per cell and to exercise grader staging, usage join and the verify recipe
   end-to-end.
2. The smoke is **not part of the replication analysis**: its outdir is excluded from the panel and its
   numbers appear only in the cost derivation recorded in §7.
3. Each provider's ceiling is derived from the smoke's measured per-cell cost with the **50% headroom**
   rule of `HANDOVER-2026-10-03.md` §4.3, and recorded in §7 **before that provider's matrix starts**.
   No matrix starts without a backup target and a ceiling.

### 9.3 Spend planning brackets (planning brackets, NOT reportable figures)

Measured batch-1 per-cell cost (token-derived, `results/*/runs.jsonl` + the discovered gateway logs),
scaled by the size factor measured on DeepSeek between batch-1 and tasks-hard-sized tasks (6.46x):

| provider | batch-1 per-cell | size-relative | 800-cell planning bracket |
|---|---|---|---|
| deepseek | $0.00785 | x1.00 | ~$36 |
| glm-flash | $0.00777 | x0.99 | ~$36 |
| qwen-full | $0.01958 | x2.49 | ~$89 |
| luna-full | $0.00621 | x0.79 | ~$28 |
| **four cheap, together** | | | **~$189** |
| haiku-full | *bracket* | — | ~$965 |
| sonnet-full | *bracket* | — | ~$808 |

**Re-derived 2026-10-05 from the shipped usage, and the bracket turns out to have a structure.**
Pricing every Anthropic request with `prices.costBounds` (unknown cache split -> low = cache-read,
high = miss rate): Haiku **$64.77–143.35**, Sonnet **$50.03–123.52**, both **$114.80–266.87**. The
DSH arms are **exact** (Haiku $49.55, Sonnet $30.04 — the split is recorded for them); **the entire
bracket lives in the four external arms**, where 4,575 + 2,094 requests carrying 87.3M + 40.8M input
tokens have no recorded split. The console ledger caps the two matrices together at **$144.33**, which
is inside that bracket and near its floor — so the external arms were billed close to the cache-read
rate, and the **best estimate of real Anthropic cost is ~$0.09–0.12 per run** on batch-1-sized tasks
(per model, on low-bound shares: Haiku ~$0.104–0.131, Sonnet ~$0.081–0.101).

Scaling to this suite is therefore a *size* question, not a price question: 800 cells/model at the
measured per-run rates gives ~$94 (Haiku) and ~$73 (Sonnet) if tasks-b tasks cost what batch-1 tasks
cost, and ~$235/$182 at 2.5x, ~$376/$291 at 4x, or ~$607/$470 at the 6.46x measured between batch-1
and tasks-hard-sized tasks on DeepSeek. **One Anthropic model is very likely affordable inside $600 at
any of these; both are affordable only if the size factor is below ~4x.** Hence the smoke, and hence
the standing advice to commit the Anthropic design on a measurement rather than on this table.

**The two Anthropic rows together exceed the stated $600 credit on their own; one of them is at or
above it.** Anthropic is therefore the design that must be reduced or measured before it is committed:
one model rather than two, or one seed, or a task subset — each of which is a §9.1 amendment decided
**before** the first Anthropic matrix starts, never after. The Anthropic figures here are brackets for
a spend decision and are not reportable results.

### 9.35 The Sonnet condition is inherited unchanged, with its 400 rate disclosed

`DEFECT-sonnet-400s-2026-10-05.md` records a condition inherited from batch 1: **every affected run**
on Sonnet 5.5 carries **exactly two HTTP 400s** (15.8% of the shipped matrix's requests; 17% of the
tasks-b smoke's), from the harness sending `thinking: {"type": "disabled"}` where the model requires
`{"type": "between_tools"}`. **The condition is not changed for this suite**, because a constant that
is identical on every arm cannot bias an arm contrast, and changing it here would make tasks-b's
Sonnet row incomparable with the batch-1 row it is meant to replicate. The extension reports the
defect beside the Sonnet result, and the levels it inflates (+2 requests per run) are stated with it.
Haiku's condition is clean (0.9% on the shipped matrix, all goose) and needs no disclosure.

### 9.4 The analysis path exists now

§6 said the analysis runs the batch-1 tools "pointed at `results/batchb-*`". They could not be: the
tools take no dataset argument and select by MODEL through `cost-panel.mjs`'s registry. As of
2026-10-05 they accept `--datasets`, the tasks-b matrices are registered as suite `batchb`, and:

- the **default population is unchanged** and pinned by test (`tools/dataset-selection.test.mjs`), so no
  filed number can move;
- a **non-default selection cannot write to a filed analysis path** — `--json` with no value defaults to
  the witness file, and that write is refused;
- a selected dataset whose matrix does not exist is reported as **not yet collected**, never as an empty
  analysis;
- the default `panel-analysis` and `hypotheses` outputs are **byte-identical** to the shipped six-model
  JSONs apart from their `generated` timestamp, verified by deep comparison.

```powershell
node tools/panel-analysis.mjs --datasets batchb --json analysis/panel-analysis-batchb-<date>.json
node tools/hypotheses.mjs     --datasets batchb --json analysis/hypotheses-batchb-<date>.json
node tools/cost-panel.mjs     --datasets batchb --json analysis/cost-panel-batchb-<date>.json
```

| # | date | change | why |
|---|---|---|---|
| A1 | 10-05 | §9 added — Anthropic extension, measured ceiling, analysis path | owner authorised the change; no tasks-b run record existed when it was written |
