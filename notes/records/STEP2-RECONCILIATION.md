# STEP 2 RECONCILIATION — the four surviving matrices, and the seven that are gone

**2026-10-03, at commit `e2c1aac` (Step 1: the analysis defects, fixed test-first). No API spend.**

> **SUPERSEDED IN PART — 2026-10-04.** Sections 1-6 are the four-model state and are kept as the
> record. Section 7 reconciles the same questions on the **six** models now in hand (the Anthropic pair
> was collected on 2026-10-03/04). Where the two disagree, section 7 is current and the move is stated.

`notes/handovers/HANDOVER-2026-10-03.md` §5 Step 2 asks for the panel and the hypotheses to be run on the four
complete matrices, "then reconcile the stale numbers beside corrected tables" — F31, F34, F35, F38,
F42, and the placebo verdict in `notes/reviews/REVIEW-RESPONSE.md`.

**Most of those numbers cannot be reconciled, because the data behind them does not exist.** This
file records what each one becomes on the matrices that survive, and which ones are now permanently
unreproducible. It is a reconciliation, not a correction: the published figures came from a
population of seven providers, and the survivors are four.

---

## 1. The population problem

`notes/handovers/NEW-SESSION-BRIEF.md` §0: on **2026-10-02 the entire `results/` directory was destroyed** — 24
matrices, ~5,900 run records, ~102,000 gateway records, ~€900 of spend. `results/` was gitignored,
so git held nothing; `rmSync` does not use the Recycle Bin; every recovery method failed.
**Zero run records were recovered.** (`recovered/runs.from-sessions.jsonl` is one byte and holds
no records. 223 gateway records out of 102,000 survived.)

| population | matrices | state |
|---|---|---|
| **published** (7 models) | ds-full, glm-flash, glm53, glm-terse, glm-harness, qwen-full, haiku-full, sonnet-full | **destroyed 2026-10-02** |
| **surviving** (4 models) | ds-full, glm-flash, luna-full, qwen-full | re-collected 2026-10-02/03, each 620/620 cells, verified |

`results/haiku-full`, `results/sonnet-full`, `results/glm53`, `results/glm-terse`,
`results/glm-harness`, `results/f18-*` and `results/hardbatch-*` are absent from the working tree,
from the append-only backup at `C:\Users\user\betterharness-backups`, and from `git log --all`.
The archive is a mirror of `results/`, so it lost the same files.

**Consequence for the journal tier: the four §2 matrices are a re-collection on the same 31-task
suite, but four providers, not seven.** A figure recomputed on them is not the same measurement with
better arithmetic; it is a different population. Every number below is labelled accordingly.

---

## 2. Do NOT overwrite the two committed analysis files

`analysis/panel-analysis.json` and `analysis/hypotheses.json` were generated **2026-10-02T07:52Z**,
before the loss, from the destroyed data. **They are the only surviving record of the seven-model
results**, and both tools default to writing exactly there:

```
node tools/hypotheses.mjs                     # defaults to analysis/hypotheses.json
node tools/panel-analysis.mjs --json <path>   # defaults to analysis/panel-analysis.json
```

Running Step 2 as written would have replaced the only witness to F31/F34/F35 with four-model output.
New outputs therefore go to new paths:

```
node tools/panel-analysis.mjs --json analysis/panel-analysis-4model-2026-10-03.json
node tools/hypotheses.mjs     --json analysis/hypotheses-4model-2026-10-03.json
node tools/cost-panel.mjs     --json analysis/cost-panel-4model-2026-10-03.json
node --test "tools/*.test.mjs"                 # 72 tests
```

---

## 3. Figure by figure

| figure | published (7 models) | recomputable? | on the four survivors |
|---|---|---|---|
| **F31** luna's PTC differential | **+4.2%**, inside a ratio-5.00 group of Haiku +83.7%, Sonnet +34.5% | **partly** — luna survives, the group does not | **+1.2%** [−8.4%, +11.3%], 31 tasks. Under `cost_cold`: **−21.2%** |
| **F31** H1 coefficient | b1 = **−0.367** [−0.494, −0.247] | re-run, different population | b1 = **−0.0049** [−0.0083, −0.0013], n=124. Still negative with the CI excluding 0 |
| **F31** "all seven leave-one-provider-out fits stay negative" | −0.79, −0.39, −0.38, −0.35, −0.08, −0.42, −0.35 | re-run | **three of four negative; dropping Qwen3.8-Flash gives +0.0027 — a POSITIVE fit** |
| **F34** H3 (the one clean confirmatory win) | **+1.23** requests [0.52, 1.94], five providers | re-run, different population | **+3.05** [2.18, 3.97], n=496. Still SUPPORTED; the magnitude is not comparable |
| **F34** H4 cache coefficient | b_cache = **−0.287** [−0.404, −0.180] | re-run | bC = **−0.0215** [−0.0323, −0.0097], contains0 = false |
| **F34** H1 secondary | **41.1 pp** (prose) / **40.6 pp** | re-run, and degenerate | **21.95 pp**; the "three models at ratio 5.00" spread is **0.00 pp — only luna is at 5.00**, so the statistic that F31 called uninterpretable has nothing left to measure |
| **F35** adjacent-pair ties | **"47 of 63"** in the prose, **48 ties** in its own table (63 − 15 = 48) | re-run | **31 of 36** (5 distinct): DeepSeek 8/9, GLM-Flash 8/9, Qwen 8/9, luna 7/9 |
| **F35** internal arithmetic | 63 pairs, 15 distinguishable, "48 ties" | **YES, independent of any data** | the prose "47" is wrong by one: 63 − 15 = 48 |
| **F38** | 30/93, 1/56, 1/30, 0/6 and the Fisher contrasts | **NO** | `results/f18-*` and `results/haiku-hard-probe` do not exist |
| **F42** | DeepSeek **5/24**, GLM-Flash **20/24** discriminating | **NO** | `results/hardbatch-deepseek`, `results/hardbatch-glm`, `results/hardbatch-qwen-fixed` do not exist |
| **A2b** "1 of 4 survive Holm" | 1 of 4, family of 4 | **superseded by a defect fix** | **0 of 12** under the filed family; 1 of 4 if each block is its own family |
| **Placebo / noise floor** | **46.2%**, "identical treatments" | **superseded — the arms were not identical** | no placebo exists in the current data; see §5 |

### The handover's own figures

§5 Step 2 states two corrected values that **cannot be reproduced from anything on this machine**:

- *"F31 — luna's PTC differential has a SIGN FLIP: +4.2% printed, −0.2% actual."* Luna's differential
  on the survivors is **+1.2%** under `cost_billed`, **+1.2%** on the primary-only view, and
  **−21.2%** under `cost_cold`. **No surviving view gives −0.2%**, and the seven-model −0.2% cannot be
  recomputed because its data is gone. The claim needs a source or it should be dropped.
- *"F42 — with the exclusion fix, GLM-Flash is 13/24 discriminating, not 20/24 … DeepSeek is 5/23."*
  Not computable: `hardbatch.mjs` reads three `results/hardbatch-*` directories that do not exist.
  Wherever 13/24 and 5/23 came from, it was not this working tree.

---

## 4. What the four survivors support

Computed at `e2c1aac`, all four matrices 620/620 cells, 10 arms at 62:

- **PTC differential** (`cost_billed`, paired by task, cluster bootstrap over 31 tasks):
  Qwen **+30.7%** [10.0, 53.3] · GLM-Flash **−20.8%** [−43.7, −2.7] · luna **+1.2%** [−8.4, 11.3] ·
  DeepSeek **+0.1%** [−9.0, 9.8].
- **The sign is not shared across providers**, which is the paper's shape, and it is visible on four
  providers rather than seven.
- **Rank tables remain unsupported**: 31 of 36 adjacent steps are statistically indistinguishable,
  and only 5 are distinct. That is a *higher* tie fraction than the published 48/63 (76% → 86%).
- **The family correction**: 0 of 12 contrasts survive Holm at α = 0.05 (§5).

---

## 4b. The mechanism test — and it is provider-specific

`node tools/prefix-retention.mjs` (notes/plans/JOURNAL-PLAN.md §4). The gateway logs record each request's token
counts, byte size, and message and tool **counts** — not their contents — so the filed predictions
are only partly testable, and the tool says which parts it cannot reach:

- **P1 is REFUTED as filed.** "PTC's per-step prefix grows more monotonically than native's": the
  request body grows monotonically in 77% of transitions (mean over runs) in *both* modes. Both
  append. The hypothesis is about the content of what is appended, which is not logged.

  > **Corrected 2026-10-10: the filed fraction is 84.0%, not 77%.** `analysis/prefix-retention.json`
  > carries `meanGrowthFraction = 0.8402`, and `node tools/prefix-retention.mjs` prints "84.0% of
  > transitions (mean over runs)" when re-run today. The refutation is the same either way - both modes
  > append - but the number of record is the filed one, and this document's 77% was stale.
- **P2 and P3 are not testable from these logs**: tool-call shapes and per-task tool diversity are
  not recorded. That is a gap to close in any future collection, not something to infer around.

What *is* measurable is the consequence — **retention**: of the prefix that was cached before a turn,
how much the provider still served from cache. It is mode-sensitive on exactly one provider:

| model | retention PTC | retention native | difference | PTC higher in | PTC billed | PTC cold |
|---|---|---|---|---|---|---|
| Qwen3.8-Flash | **0.674** | **0.743** | **−0.069** | **2 of 31 tasks** | **+30.7%** | +21.0% |
| GLM-5.3-Flash | 0.994 | 0.993 | +0.001 | 16 of 31 | −20.8% | −20.5% |
| gpt-6-luna | 0.997 | 1.000 | −0.003 | 28 of 31 | +1.2% | −21.2% |
| DeepSeek V4.1 Flash | 1.000 | 1.000 | −0.000 | 11 of 31 | +0.1% | −9.8% |

**The mechanism explains Qwen, and only Qwen.** PTC retaining less must raise billed cost, and it
does, by the largest margin in the study. On GLM the differential is **token volume**, not the cache
— retention is flat while `cost_cold` moves by the same −20.5% as `cost_billed`. On luna and
DeepSeek the billed differential is ~0 while the cold differential is −21% and −10%: PTC sends
materially fewer tokens, and cache pricing roughly cancels the gain. **One "code mode is cheaper"
story is wrong on this data; there are at least two mechanisms.**

Why Qwen is the one: it is the only surviving provider where the harness must **declare** cache
breakpoints (DeepSeek, GLM and OpenAI cache automatically). That makes the finding *falsifiable on a
provider not yet measured*, and it is the job the Anthropic spend would do:

> **Pre-declared prediction.** Anthropic also requires declared caching. If the PTC penalty is a
> declared-cache phenomenon, Haiku and Sonnet should show a Qwen-like retention deficit under PTC
> and a **positive** billed differential. If they instead show GLM's flat retention with a volume
> effect, the mechanism is not about declaration and this story is wrong — which would be a more
> interesting result than the one it replaces.

**Circularity, stated rather than hidden:** billed cost is computed *from* hit and miss tokens, so a
retention difference mechanically moves it. What is not mechanical is that retention is
mode-sensitive on one provider and flat on three, while those three still move on volume.

This also converges with the pre-existing `tools/mechanism.mjs` (commit `41c9640`), whose
decomposition concluded "cache is not the driver" of the arm spread. It is not — it is the driver of
*one provider's* PTC differential. Its inputs (`results/check-*`) were destroyed, so it cannot be
re-run.

## 5. Decisions taken, and the one still open

### 5.1 The Holm family — DECIDED 2026-10-03: the filed reading is primary

The family is **every secondary and pairwise contrast this report tests with a p-value**: 4 cost
contrasts (A2b) + 8 solve-rate contrasts (A4), m = 12. Under it **0 of 12 survive** Holm at
α = 0.05; the narrow reading — each block its own family — gives A2b 1 of 4 and A4 0 of 8. The tool
prints both, and the sensitivity line is part of its output.

**Why the conservative reading, when it deletes the study's only surviving significant contrast:**
because it deletes it. At journal tier "a rule chosen after seeing the effect is fatal", and this
rule could not be chosen blind — both readings were computable the moment the family question was
asked. Choosing the reading that removes our own result is the only choice that cannot be read as
selective analysis, and it costs almost nothing: the narrow reading leaves exactly one significant
contrast, on one provider of four, which was never going to carry a paper.

**Consequence for the paper: it must not rest on significance stars.** What it rests on instead is
in §4 — sign disagreement across providers with intervals, the rank-step tie fraction, and the
mechanism — none of which needs a multiplicity correction to be true.

### 5.2 The population — OPEN, and it is a spending decision

The four survivors satisfy the pre-registration's minimum (30 tasks, both presentation arms) and
meet the standing checklist's bar (≥3 models, ≥2 providers: four of each). They are not the seven
the published figures were computed on, and the one provider with *declared* rather than automatic
caching — the counter-case the mechanism claim needs — is not among them.

- **Publish on the four survivors**: every number runs from the shipped artifact. Weaker generality.
- **Keep the seven-model numbers with provenance**: a reviewer cannot check the headline numbers
  against the package. Fatal.
- **Re-collect Anthropic** (`haiku-full` + `sonnet-full`): restores the declared-cache contrast and
  two more models. **$448.93** for batch-1, both models, at card prices — and the cost basis is
  disputed by 1.611x, so Haiku's 620 cells are *either $286 or $461* until a console reconciliation
  settles it (`tools/credit-plan.mjs`). Anthropic is ~95% of the money for the same 620 cells.

**Agent recommendation: the four survivors are the paper's numbers, and Anthropic is an optional
upgrade whose trigger is §4's mechanism result** — which came back provider-specific, so the
declared-cache counter-case now has a concrete job to do rather than a general "more providers"
argument. The user has said a further ~$500 is acceptable for a strong paper; this is the decision
that spend would go to.

## 6. What Step 2 could not do, and what it cost

| item | status |
|---|---|
| run the panel and hypotheses on the four matrices | **DONE** — `analysis/*-4model-2026-10-03.json` |
| reconcile F31, F34, F35 | **DONE as far as the survivors allow** — §3 |
| reconcile F38, F42 | **IMPOSSIBLE** — inputs destroyed |
| `notes/reviews/REVIEW-RESPONSE.md` placebo verdict | **superseded** — the 46.2% "noise floor" was a real treatment effect (Step 1, §5 of the commit); the file still prints it and needs an editorial pass |
| Step 3 — the test-editing rule | **NOT STARTED**, deliberately: it must be decided before its effect is examined, and the DeepSeek comparator it needs is now a measured 0/62 (`_ev/ds-test-edit-scan.md`) |

---

## 7. THE SIX-MODEL RECONCILIATION — 2026-10-04, at commit `662033e`

Everything above this line is the 2026-10-03 state, when four matrices survived. **It is kept as the
record and is not corrected in place.** On 2026-10-03/04 the Anthropic pair was collected
(`haiku-full` and `sonnet-full`, 620/620 cells each, verified), so the population is now **six models
across five providers** (DeepSeek, z.ai, Alibaba, Anthropic — two models — and OpenAI; `PAPER.md` §1). This section supersedes the figures above where they differ; where a number
moved, the old value stays visible above and the move is stated here.

Source of record, all regenerated by `node tools/artifact.mjs` and checksummed in
`artifact/MANIFEST.json`: `analysis/panel-analysis-6model-2026-10-03.json` (sections A1-A8),
`analysis/hypotheses-6model-2026-10-03.json` (H1-H4), `analysis/prefix-retention.json` and
`analysis/cost-panel-6model-2026-10-03.json`. Every figure below is read from those files, not
remembered, and this section is generated from them rather than transcribed.

### 7.1 The PTC differential and the spread F31 was about

`cost_billed`, paired by task, cluster bootstrap over 31 tasks (section A2). The interval is the
bootstrap interval on the absolute difference, expressed as a percentage of each model's native mean:

| model | ratio | PTC vs native | CI (rel, %) |
|---|---|---|---|
| DeepSeek V4.1 Flash | 4.00 | +0.13% | [-8.97, +9.76] |
| GLM-5.3-Flash | 3.33 | -20.75% | [-43.71, -2.75] |
| Qwen3.8-Flash | 3.13 | +30.67% | [+9.99, +53.26] |
| Claude Haiku 4.5 | 5.00 | +53.84% | [+31.76, +77.83] |
| Claude Sonnet 5.5 | 5.00 | +9.51% | [+0.28, +17.90] |
| gpt-6-luna | 5.00 | +1.20% | [-8.40, +11.33] |

**Across the whole ratio axis the six models span 74.59 percentage points. Three of them
share an output:input ratio of 5.00 and still disagree by 52.64 points** — 70.57% of the
between-model spread sits inside a single ratio value. That is F31's argument, now on data that
ships. **F31's seven-model version claimed 93%; do not quote 93%, it is unreproducible** (section 3).

The pre-registered H1 secondary (section 4: the ratio-5.0 penalty must exceed ratio 3.33 by more than
5 pp) gives a gap of **42.27 pp** on six models. The 21.95 pp in section 3 above is
superseded rather than wrong: it was computed when only luna was at ratio 5.00.

### 7.2 The family correction now has survivors

PRE-REGISTRATION section 6 requires Holm-Bonferroni across the family reported together. The family is
**m = 18** (6 cost contrasts + 12 solve-rate contrasts) at alpha = 0.05. **2 of 18 survive,
and both are Claude Haiku:**

| contrast | block | p | Holm threshold | verdict |
|---|---|---|---|---|
| Claude Haiku 4.5 dsh:native -> dsh:ptc | A2b | 0.000049999750001249995 | 0.002778 | **survives** |
| Claude Haiku 4.5 dsh:ptc -> dsh:ptc-terse | A4 | 0.00014495849609375 | 0.002941 | **survives** |

The three closest failures:

| contrast | block | p | Holm threshold | verdict |
|---|---|---|---|---|
| Qwen3.8-Flash dsh:native -> dsh:ptc | A2b | 0.005605 | 0.003125 | fails |
| GLM-5.3-Flash dsh:native -> dsh:ptc | A2b | 0.035305 | 0.003333 | fails |
| Claude Sonnet 5.5 dsh:native -> dsh:ptc | A2b | 0.051235 | 0.003571 | fails |

**Qwen (p = 0.0056) and Sonnet (p = 0.0512) fail despite bootstrap intervals that exclude zero.**
The four-model reconciliation recorded 0 of 12 surviving. The family decision taken on 2026-10-03 —
the filed broad reading, chosen because it removes our own significance — is unchanged, and the paper
still must not rest on stars.

### 7.3 The confirmatory hypotheses on six models, and one verdict that MOVED

| hypothesis | six-model result | verdict | four-model (section 3) |
|---|---|---|---|
| H1 (primary) b1 | +0.00467 [-0.00551, +0.01568], n = 186 | **INCONCLUSIVE** | -0.0049 [-0.0083, -0.0013], REFUTED |
| H2 mean(d) | +0.00151 [-0.00010, +0.00354], Wilcoxon p = 0.8004 | **INCONCLUSIVE** | inconclusive |
| H3 b1 (requests) | +2.228 [+1.234, +3.328], n = 744 | SUPPORTED | +3.05 [2.18, 3.97] |
| H4 cache coefficient | +0.11157 [+0.06205, +0.17271], contains0 = false | REFUTED | -0.0215 [-0.0323, -0.0097] |

**The move that matters: H1 is no longer refuted.** On the four survivors b1 was negative with an
interval excluding zero, which is the pre-registered definition of refuted. On six models it is
**inconclusive** — the point estimate is positive (0.00467) and the interval contains zero.
A paper that says the price-ratio account is refuted would now be saying something the six-model data
does not support; it must say inconclusive. The pre-registered secondary condition is still met
(42.27 pp > 5 pp), so the account is not supported either: the honest statement is that the
primary test is inconclusive while its secondary condition is satisfied.

**And it is not robust to one provider.** Leave-one-out on H1:

| dropped | b1 |
|---|---|
| DeepSeek V4.1 Flash | 0.13284 |
| GLM-5.3-Flash | -0.00520 |
| Qwen3.8-Flash | -0.00767 |
| Claude Haiku 4.5 | -0.01043 |
| Claude Sonnet 5.5 | 0.00566 |
| gpt-6-luna | 0.00334 |

Dropping DeepSeek gives b1 = +0.133, an order of magnitude larger and opposite
in sign to the pooled estimate that includes it. The primary hypothesis is therefore
**population-dependent in sign**, and that belongs in the limitations beside the population problem,
not buried in a table.

H4's sign also flipped (from -0.0215 to 0.1116). It is refuted either way: the pre-registered rule
for H4 is that a cache coefficient whose interval excludes 0 is a new finding, not a failure.

### 7.4 The mechanism: refuted as filed, and it was never about six providers

`analysis/prefix-retention.json`, paired by task:

| model | retention PTC | retention native | difference | billed | cost_cold | verdict |
|---|---|---|---|---|---|---|
| deepseek-flash | 1.000 | 1.000 | -0.0001 | +0.13% | -9.76% | no billed effect; volume -9.8% is cancelled by cache pricing |
| glm-5.3-flash | 0.994 | 0.993 | 0.0010 | -20.75% | -20.55% | NOT retention (ret diff ~0); volume moves it: cold -20.5% |
| gpt-6-luna | 0.997 | 1.000 | -0.0026 | +1.20% | -21.17% | no billed effect; volume -21.2% is cancelled by cache pricing |
| qwen3.8-flash | 0.674 | 0.743 | -0.0691 | +30.67% | +20.98% | retention explains it |
| claude-haiku-4.5 | 0.996 | 1.000 | -0.0032 | +53.84% | +18.67% | NOT retention (ret diff ~0); volume moves it: cold +18.7% |
| claude-sonnet-5.5 | 1.000 | 1.000 | 0.0000 | +9.51% | -15.11% | NOT retention (ret diff ~0); volume moves it: cold -15.1% |

**The prediction pre-declared in section 4b on 2026-10-03 is REFUTED.** It said Anthropic, which also
requires declared caching, should show a Qwen-like retention deficit and a positive billed
differential. Measured: Anthropic's retention is flat (Haiku -0.0032, Sonnet +0.0000) and its
differentials are volume effects (cost_cold +18.7% and -15.1%). **The prefix mechanism explains one
provider of six** — Qwen, the only model whose absolute retention is lossy (0.674 PTC against 0.743
native). What replaces it is a precondition, not a patch: the prefix effect can only bite where the
cache loses, so where retention is already ~1.000 there is no headroom for a mode effect and any
differential must come from token volume.

`notTestable` is unchanged and still named: P1 as filed is refuted as stated, and P2 and P3 remain
untestable from these logs because message and tool contents are stored as counts.

### 7.5 A new finding, larger than the one it replaced

The same file, split by arm family rather than by mode — mean prefix retention on Anthropic:

| model | DSH arms (6) | external harnesses (4) |
|---|---|---|
| claude-haiku-4.5 | 0.994 / 1.000 | **0.560** |
| claude-sonnet-5.5 | 1.000 / 1.000 | **0.451** |

**On Anthropic the harness, not the presentation mode, is the dominant determinant of cache
retention.** The external harnesses keep roughly half the cacheable prefix the DSH arms keep — a ~2x
harness effect on precisely the quantity that drives cache cost. The per-model cache regimes in
section A6 (mean hit rate over primary cells, and who decides the breakpoints) show the same split
from the other direction: Haiku's within-model spread is 0.947 against 0.064 for
DeepSeek, the flattest model in the study.

### 7.6 Rank stability, and the placebo that no longer exists

- **Rank steps (A8): 54 adjacent pairs, 40 ties** — 74.07% of adjacent arm
  comparisons are statistically indistinguishable. The four-model figure was 31 of 36 (86%) and the
  published seven-model figure 48 of 63 (76%). The tie fraction is not shrinking as models are added,
  which is the rank-instability claim stated as a number.
- **Across-model rank agreement (A1b):** median Spearman rho = 0.238, permutation p = 0.0467,
  rank variance explained = 0.0567.
- **Arm-versus-arm concordance (A1c):** 62.1% overall.
- **A7 finds NO placebo in the current data** — `placebo: []`, `noiseFloorPct: null`. The published
  46.2% noise floor came from arms that were not in fact identical (Step 1, commit `e2c1aac`); it is
  not merely stale, it was a real treatment effect. `notes/reviews/REVIEW-RESPONSE.md` still prints it — see Step 1b.

### 7.7 Still unreproducible, unchanged by any of the above

Nothing in this section can be computed for the seven-model population. **F31, F34 and F35** remain
witnessed only by the two committed files this project must not overwrite; **F38** (f18) and **F42**
(hard batch) remain impossible because their input directories are gone. `artifact/MANIFEST.json`
names all five figures and why, so a reviewer sees the hole rather than a silent omission.

### 7.8 One correction owed

The commit message of `1c66817` states the across-axis spread as **21.9 points**. That is wrong. The
correct six-model figures are **74.59 points across the axis**, **52.64 points within ratio 5.00**, i.e.
**70.57%** of the spread inside one ratio value. A commit message cannot be rewritten here;
the correction is recorded in this file and must appear in the paper.

