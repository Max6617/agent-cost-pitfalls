# notes/reviews/REVIEW-RESPONSE.md — answers to the two integrity findings, and their current status

**Written 2026-10-01. Reviewed and re-based 2026-10-04.**  **Answers:** `notes/reviews/CRITICAL-REVIEW.md` §2.1 and
§2.5.  **Also answers:** `notes/reviews/REVIEW-FINDINGS.md` §J2, and the §2.1 "related" sub-claim about
`PRE-REGISTRATION.md` §12.

Both were treated as stop-the-line items: no paper text was written until they were answered from
primary evidence. One is **refuted**; the other is **confirmed, and wider than reported**. Both
answers are reproducible from the repo with the commands given.

---

## How to read this file after 2026-10-04

**This file is a record of a response, not a statement of current results.** It was written when four
matrices had been destroyed and seven models were unreproducible; the population is now **six models
across five providers**, and two things it printed have since been retracted or superseded. Rather
than delete them, each is marked in place:

| what this file printed | status |
|---|---|
| §2.1 timestamp refutation, and its three independent checks | **STANDS.** Unchanged and still correct. |
| §2.5 "the terse arms that were not terse", with its per-matrix classification | **STANDS as a finding.** Most of the matrices it classifies are now unreproducible (destroyed 2026-10-02); `ds-full`, `glm-flash`, `luna-full` and `qwen-full` are the survivors, and `ds-full` is the only one of those carrying sham terse arms. |
| the **placebo / noise-floor** verdict (46.2%, then 7.7%) | **RETRACTED.** Superseded — see §2.5's closing note. |
| the **F37** cache-field table (hit rates 0.0 / 11.8 / 94.9%, costs 0.7818 / 0.5128 / 0.1667, +47.4% / −68.8%) | **SUPERSEDED.** F37's own entry carries a dated correction note, and the 1.611x console factor this file's costing leaned on was **refuted by measurement — the ratio is 1.000** (`notes/handovers/HANDOVER-2026-10-03-B.md` §3.4). See the F37 status note below. |
| the **§2.2 confirmatory verdicts** (H1 = −0.358 REFUTED, H3 = +1.05, H4 = −0.282) | **SUPERSEDED by six models.** H1 is now **INCONCLUSIVE**, not refuted. See §2.2 status. |
| the closing **thesis** paragraph (seven models, rho = 0.286, 63.6%, 54.0%, 7.7% floor) | **SUPERSEDED.** Current figures in §Thesis status. |

The reason this matters more than tidiness: **three of the five rows above are numbers a reader could
lift from this file and put in a paper, and two of them would be wrong.** The standard this project
holds is that a retraction is recorded rather than quietly replaced, and that a figure is read from
the artifact rather than from prose that once described it.

---

## §2.1 — The commit/archive timestamp inversion · **REFUTED**

**The finding.** The review tabulates five commits against the run archives and concludes that
each asserts statistics for runs that had not happened yet — "F21's exact statistics were
committed 64 minutes before the first of the 124 runs it describes started."

**What actually happened.** The commits are `+0200`; the run records are true UTC. The review
converted `+0200` to UTC by subtracting **four** hours instead of two. Every commit in the
table is therefore placed exactly two hours earlier than it occurred.

```
node tools/timestamp-audit.mjs
```

| commit | review's UTC | **true UTC** (git `%ct`) | archive, as it stood at commit time | verdict |
|---|---|---|---|---|
| `ab91d4a` | 14:57Z | **16:57:21Z** | pilot-anthropic, 6/6 records, last at 16:57:02.957Z | commit **+18.0 s after** the last run |
| `8140e27` | 15:17Z | **17:17:14Z** | check-lh-ledger-replay, 14/14, last at 17:16:38.874Z | commit **+35.1 s after** |
| `0aef7df` | 15:45Z | **17:45:28Z** | pre-reg v4 freeze — probe 16:06, pilot 16:55, hard checks 17:02–17:38 all complete | every named dataset predates the freeze |
| `edae1b5` | 15:56Z | **17:56:47Z** | glm-terse, **124/124** records, last at 17:55:35.853Z | commit **+71.1 s after** the 124th run |
| `434dece` | 16:21Z | **18:21:54Z** | ds-full held **exactly 434 records** at commit time, last at 18:19:06.851Z | commit **+167.1 s after** |

The "64 minutes before the first of its 124 runs" is the same two hours: the review puts
`edae1b5` at 15:56Z and glm-terse's first record at 17:00:23Z. Corrected, the commit follows
the last run by 71 seconds.

**Three independent checks that the run records are true UTC**, so the correction is to the
review's arithmetic and not to the data:

1. **`git %ct`.** The commit epoch is absolute. `ab91d4a` = epoch 1790835441 =
   `2026-09-30T16:57:21Z`. Git prints `2026-09-30T18:57:21+02:00`; 18:57 − 2 h = 16:57.
2. **File mtimes.** NTFS mtimes are epoch values and cannot be affected by timezone
   formatting. Every archive's mtime matches its last record to within **1–27 milliseconds**
   (printed by the audit tool). If the records were local-time-stamped, every file would
   appear two hours stale.
3. **The commits land 18–167 seconds after the runs they describe, five times out of five.**
   A fabricated chronology does not produce that pattern; "run, analyse, commit" does.

**The review's own innocent explanation is therefore unnecessary.** No re-runs are needed to
explain anything, and the (`rmSync`) argument against re-runs is not load-bearing. The
"Related" paragraph concluding that "every statistic committed on 09-30 between 14:57Z and
16:21Z is currently non-reproducible" does not hold: every one of those statistics is
reproducible from the archive it was computed from, and the archives were still growing
afterwards, which is why they are larger today than at commit time.

### §2.1 related — `PRE-REGISTRATION.md` §12's "timezone error" · **also refuted**

The review says §12's self-correction is wrong because "the v3.0 commit `c486f69` is at epoch
1790712266 **+0200 = 18:04:26Z**", which would precede the 20:03Z start of collection.

`c486f69` is `2026-09-29T22:04:26+02:00` = **20:04:26Z**. The review subtracted four hours
(22:04 → 18:04) rather than two. `9c41fb0` is `2026-09-29T22:26:06+02:00` = **20:26:06Z**.

| event | instant |
|---|---|
| first Phase-2 run record (`ds-full-partial`) | **20:03:00.353Z** |
| `c486f69` "pre-registration v3" | **20:04:26Z** — 86 s after the first run |
| `9c41fb0` "RETRACTION: F14 was a billing artefact" | **20:26:06Z** |

§12 states that collection began 20:03Z and the document was edited at 20:04Z and 20:26Z.
**That is correct in every figure.** Amendment #10's statement that the arms "were running
while v3.0 claimed otherwise" is also correct. No amendment is needed.

**What we are changing anyway.** The timestamp vulnerability is real even though this
particular instance is not: a reviewer with the repo can reach the wrong conclusion, as one
did. Three defences, all now in place:

- `tools/timestamp-audit.mjs` reproduces the check, states the offset convention in its own
  header, and prints `RESULT: 0 inversions`.
- Every archive file mtime is printed beside its records as an independent UTC witness.
- The paper will state the convention once: **all run records are UTC; all commits are
  `+0200`**, and the comparison is made on epochs, never on formatted strings.

---

## §2.5 — "The terse arms that were not terse" · **CONFIRMED, AND WIDER THAN REPORTED**

**The finding is correct, including the part about `ds-full`.** An earlier pass of this
response read the audit table backwards and recorded the opposite; the correct reading is
below, and the error is noted here because the same mistake is easy to make from the raw
counts.

`run-experiment.mjs` records `terse: !!p.promptSuffix` and appends the suffix only when
`promptSuffix` is set. Until commit **`9b03ad8` (2026-09-30 17:01:37Z)** the runner built its
arm list as:

```js
for (const a of DSH_ARMS) arms.push({ id: a.id, harness: 'dsh', patch: a.patch, mode: a.mode })
```

— dropping the `promptSuffix` field that `conditions/arms.mjs` had defined since `cec53c8`.
The commit that fixed it added exactly that field:

```js
for (const a of DSH_ARMS) arms.push({ id: a.id, harness: 'dsh', patch: a.patch, mode: a.mode, promptSuffix: a.promptSuffix ?? null })
```

So before 17:01:37Z the terse arms could not have been terse, on any matrix, in any harness.
**The run records agree with the code history exactly.**

### Every matrix, classified

| dataset | terse-arm records | `terse:true` | window (UTC) | verdict |
|---|---|---|---|---|
| `ds-full` | 124 | **0** | 09-30 16:08:05 → 18:17:37 | **SHAM** |
| `ds-full-partial` | 124 | **0** | 09-29 20:03:16 → 21:14:37 | **SHAM** |
| `check-cross-units-normalisation` | 4 | **0** | 09-29 20:52:48 → 21:02:26 | **SHAM** |
| `check-spec-csv-dialect` | 4 | **0** | 09-29 20:36:17 → 20:44:56 | **SHAM** |
| `check-lh-ledger-replay` | 4 | **0** | 09-30 17:04:58 → 17:15:25 | **SHAM** |
| `probe` | 2 | **0** | 09-30 16:07:02 | **SHAM** |
| `pilot-anthropic` | 2 | **0** | 09-30 16:56:24 | **SHAM** |
| `check-edge-glob-match` | 4 | 4 | 09-30 17:21:08 → 17:38:46 | real |
| `glm-terse` | 124 | 124 | 09-30 17:00:23 → 17:55:35 | real |
| `qwen-full` | 124 | 124 | 09-30 18:05:31 → 10-01 02:40:47 | real |
| `sonnet-full` | 124 | 124 | 09-30 19:41:44 → 22:40:47 | real |
| `haiku-full` | 130 | 130 | 09-30 19:41:44 → 10-01 07:27:44 | real |
| `glm53` | 62 | 62 | 10-01 07:00:35 → 10:42:06 | real |
| `luna-full` | 123 | 123 | 10-01 06:58:30 → 10:58:41 | real |
| `f18-sonnet` | 6 | 6 | 10-01 07:12:50 → 08:09:26 | real |

The review's §2.5 is right that three of the four hard-task matrices ablated nothing, right
that `ds-full`'s terse arms are unusable, and right that "FINDINGS never discloses which
matrices actually manipulated terseness". That last sentence is the one that mattered.

The audit is now part of the instrument rather than a footnote: `tools/cost-panel.mjs`
classifies every matrix at load time and prints `terse arms: REAL` or
`terse arms: SHAM (terse:false)`, and `tools/panel-analysis.mjs` refuses to compute a
terseness contrast for a model whose terse arms are not verified real.

### What this does to F22

**F22 survives.** It rests on `glm-terse` (124 runs, all `terse:true`, 09-30 17:00–17:55Z),
which is a genuine manipulation: output tokens fall 42.8% and 46.9%, cost falls 28.9% and
31.8%, every run solves. Nothing in the §2.5 defect touches it. The review reached the same
conclusion independently in its §6.

**What it costs.** Every other terseness claim is now scoped:

- The **hard-task** terse rows in `check-cross-units-normalisation`, `check-spec-csv-dialect`
  and `check-lh-ledger-replay` compare an arm to itself. They carry no information and must
  not be reported as a terseness ablation. F15's table lists `dsh:ptc-terse` and
  `dsh:native-terse` on `lh-ledger-replay` — both are the standard prompt.
- The **`ds-full` terse arms** (124 of 620 records) are not a terseness condition. Any
  analysis that groups on `arm` and treats `dsh:native-terse` as a distinct treatment is
  silently comparing two identical treatments.

### The defect is also the study's best control

Because `ds-full`'s four "terse" arms received byte-identical treatment to their base arms,
`ds-full` contains a **124-run placebo** that no other agent-cost study has.

```
node tools/panel-analysis.mjs      # section A7
```

| contrast | n (tasks) | arm A | arm B | difference | 95% CI (cluster bootstrap over tasks) |
|---|---|---|---|---|---|
| `dsh:native` vs `dsh:native-terse` | 31 | $0.00898 | $0.00967 | **+7.7%** | [0.1%, 16.6%] |
| `dsh:ptc` vs `dsh:ptc-terse` | 31 | $0.00879 | $0.00910 | +3.6% | [−6.5%, 14.7%] |

**Two arms with no treatment difference at all differ by up to 7.7%, and one of the two
intervals excludes zero.** This is the study's measured noise floor for an arm-level cost
contrast at n = 62 per arm, and it is a direct constraint on the literature: a large share of
published harness-comparison effect sizes are smaller than a difference this design produces
from nothing.

> **RETRACTED 2026-10-04 — the placebo verdict above, and the noise floor it produced.**
>
> The paragraph above is kept as the record of what was claimed on 2026-10-01. It should not be
> quoted. `notes/records/STEP2-RECONCILIATION.md` §7.6: *"A7 finds NO placebo in the current data — `placebo: []`,
> `noiseFloorPct: null`."* The published noise floor moved twice and both values are withdrawn:
>
> | value | where | status |
> |---|---|---|
> | **46.2%** | this section, first version | **withdrawn** — it was computed on arms that were not in fact identical. Not stale: it was a real treatment effect being read as noise. |
> | **7.7%** | `notes/records/FINDINGS.md` F29, after the 2026-10-01 RNG correction | **withdrawn as a noise floor.** F29's correction is itself correct — the interval was redrawn as [−0.4%, +16.7%] and now contains zero, so *"neither interval excludes zero"* stands. What does not stand is calling the result a placebo: the arms were distinguishable to the model (F44: the two arms' first requests differ by 30 bytes, six copies of the arm-id string), and the current panel reports no placebo at all. |
>
> **Consequence, stated plainly because it is a cost:** the study can no longer claim a measured
> arm-level noise floor, and the sentence *"a claimed harness effect below ~8% at this sample size is
> not distinguishable from nothing"* must not be published. F29's status line, which still reads
> "MEASURED, and it is a control", is stale and is flagged as a live defect by the Lead rather than
> silent-patched here — `notes/records/FINDINGS.md` is outside this file's write scope.
>
> What survives untouched is the **finding** of §2.5: the terse arms of `ds-full` were a sham, all 124
> records carry `terse:false`, and no terseness conclusion may be drawn from them.

---

## What else changed as a result

1. **`tools/cost-panel.mjs`** (new) — the canonical per-run cost panel. One card per model,
   the pre-registered cost function, re-priced from archived token counts, cells de-duplicated
   with a stated rule, provider errors excluded only when the run is also unsolved (§9).
   Gateway logs are **discovered**, not listed: the first version named them by hand and was
   already wrong for four of ten datasets.
2. **`tools/panel-analysis.mjs`** (new) — every cross-provider statistic, from that one panel.
3. **`tools/timestamp-audit.mjs`** (new) — the §2.1 check, runnable.
4. **`analysis/panel-analysis.json`** — the analysis output is now archived, which
   `CRITICAL-REVIEW` §5 correctly noted had never been done for any headline number.
5. **`notes/records/FINDINGS.md`** — F20's "OpenCode is cheapest on all four datasets" is corrected: it was
   computed on an arm set that did not contain `goose`. New entries F29–F33.


---

## §2.2 — The confirmatory verdicts · **CONFIRMED, and now fixed by running the filed rules**

Both criticisms are correct. H1's decision rule requires a regression, and none existed anywhere in the
repo; H2's rule has no "NOT SUPPORTED" outcome and the pre-registered exact Wilcoxon had been replaced
by a sign test without disclosure.

```
node tools/hypotheses.mjs
```

Every rule is now executed **as filed**. Where a rule is defective it is executed anyway and the defect
reported, because a pre-registered rule quietly improved after the fact is not a pre-registered rule.

| | rule as filed | re-issued verdict |
|---|---|---|
| **H1** | supported if b1 > 0 and CI excludes 0; refuted if b1 ≤ 0 with CI excluding 0 | **REFUTED.** b1 = −0.358, cluster-bootstrap 95% CI [−0.488, −0.239]; within-task −0.393 [−0.541, −0.254]. Sign negative in all 7 leave-one-provider-out fits. |
| **H1 secondary** | penalty at ratio 5.0 exceeds that at 3.33 by > 5 pp | **MET nominally** (40.6 pp) **and uninterpretable**: the three models *at* ratio 5.00 span 79.5 pp, against 85.8 pp across the whole axis. |
| **H2** | exact one-sided Wilcoxon p < 0.05 **and** CI entirely below 0; refuted if CI entirely above 0; **otherwise inconclusive** | **INCONCLUSIVE.** Exact Wilcoxon n = 31, W+ = 261, **p = 0.4046**; CI [−$0.002222, +$0.001107]. |
| **H3** | CI for b1 excludes 0 (level and sidedness unspecified — executed as two-sided 95%, the stricter reading) | **SUPPORTED.** b1 = +1.05 requests, CI [0.278, 1.777]. |
| **H4** | supported if the cache coefficient's CI contains 0; refuted if it excludes 0 | **"REFUTED"** (b_cache = −0.282, CI [−0.401, −0.174]) — and the rule cannot fail in the direction that matters, since a null supports the study's own negative hypothesis and a non-null is pre-declared publishable. **Demoted to exploratory.** |
| **H5** | no formal test; "two providers cannot establish this"; exploratory whatever it shows | **Confirmed as a hypothesis** (F30). **Kept exploratory in status** — it was filed without a test and a study cannot promote its own hypothesis after seeing the data. |

**H1 is now computed for the first time, and it is computable only because the seven matrices are in
one table.** The previous verdict rested on a three-point monotonic table; the filed rule needs a
regression with a bootstrap CI, which three points cannot support. With seven provider cells, 209
task × cell observations and a cluster bootstrap over tasks, the coefficient is **negative and
precisely estimated**. The 3-point table pointed the same way; the regression is what the rule asked
for, and it is a stronger statement than the table could make.

### §2.2 status, 2026-10-04 — the table above is the seven-model record, and one verdict has MOVED

Every number in that table was computed on the seven-model population destroyed on 2026-10-02. It is
kept as the record and **must not be quoted as current**. `notes/records/STEP2-RECONCILIATION.md` §7.3 recomputes
the same filed rules on the **six models that ship** (`analysis/hypotheses-6model-2026-10-03.json`):

| hypothesis | seven models (above) | **six models (current)** | moved? |
|---|---|---|---|
| **H1** b1 | −0.358 [−0.488, −0.239] → REFUTED | **+0.00467 [−0.00551, +0.01568], n = 186 → INCONCLUSIVE** | **YES — this is the important one** |
| H1 secondary | 40.6 pp, uninterpretable | **42.27 pp**, and still degenerate in the same way | no |
| **H2** | p = 0.4046, INCONCLUSIVE | **mean(d) = +0.00151 [−0.00010, +0.00354], Wilcoxon p = 0.8004 → INCONCLUSIVE** | no |
| **H3** | +1.05 requests [0.278, 1.777] | **+2.228 [+1.234, +3.328], n = 744 → SUPPORTED** | no, magnitude not comparable |
| **H4** | b_cache = −0.282 [−0.401, −0.174] | **+0.11157 [+0.06205, +0.17271] → REFUTED** | sign flipped; refuted either way |

**H1 is no longer refuted.** On the four cheap providers b1 was negative with an interval excluding
zero, which is the pre-registered definition of refuted. On six models the point estimate is
**positive** and the interval **contains zero**. A paper that reports the price-ratio account as
refuted would now be saying something the six-model data does not support; it must say **inconclusive**,
and note that the pre-registered secondary condition is still met (42.27 pp > 5 pp) so the account is
not supported either.

It is also not robust to a single provider. Leave-one-out on H1: dropping DeepSeek gives
**b1 = +0.13284**, an order of magnitude larger than the pooled estimate and opposite in sign to the
four-model result. **The primary hypothesis is population-dependent in sign**, and that belongs in the
limitations beside the population problem, not in a table footnote.

The multiplicity correction moved the same way. On the filed broad family of **m = 18** (6 cost + 12
solve-rate contrasts), **2 of 18 survive Holm at α = 0.05 and both are Claude Haiku**: the PTC cost
contrast (p = 0.00005) and the PTC-terse solve-rate contrast (p = 0.00014). Qwen's cost contrast
(p = 0.0056) and Sonnet's (p = 0.0512) fail despite intervals excluding zero. The family decision of
2026-10-03 — the broad reading, chosen because it removes the study's own significance — is unchanged,
and the paper still must not rest on stars.

---

### §2.2 status, 2026-10-10 — the B = 200,000 re-filing, and two claims that died

A further correction pass on this date re-filed every bootstrap at **B = 200,000** (from 5,000) and
re-checked the claims this file restates. Current values, from
`analysis/hypotheses-6model-2026-10-09.json` and `analysis/position-adjust-6model-2026-10-09.json`:

| quantity | as restated above | current, B = 200,000 |
|---|---|---|
| H1 b1 | +0.00467 [−0.00551, +0.01568] | +0.00467 [−0.00566, +0.01579] — still INCONCLUSIVE |
| H2 mean(d) | +0.00151 [−0.00010, +0.00354] | +0.00151 [−0.00009, +0.00356] — still INCONCLUSIVE |
| H3 | +2.228 [+1.234, +3.328] | +2.228 [+1.228, +3.360] — but **null on batch-1 without luna** (+1.010 [−0.081, +2.223]) |
| H4 bC | +0.11157 [+0.06205, +0.17271] | +0.11157 [+0.06235, +0.17140] — verdict unchanged |
| Sonnet raw cost | +9.51% [+0.28, +17.90], positive | +9.51% **[−0.08, +18.01], contains zero → null** |

**Two claims in this file are withdrawn, not merely re-numbered.** (i) **"The code-mode cost penalty
does not share a sign across providers"** is no longer a claim of this study: GLM, the one significantly
negative row, is null on both adjusted scales, and the pre-registered replication of the sign pattern
failed (`PAPER.md` §3.1a, §3.8). What the paper claims is that the penalty is **large and
model-specific**. (ii) The **0.560/0.451 Anthropic retention** comparison is a **pooling artefact** —
the "external harnesses" bucket is eight arms, four real externals at a null-coded 0.0000 pooled with
four DSH `-opt`/`-terse` arms at ~0.998 — and **no external harness's retention is measured on
Anthropic**. The DSH arms' own 0.994/1.000 stands. `notes/records/CROSS-HARNESS.md` §8.3,
`notes/defects/DEFECT-anthropic-external-costs.md` and `PAPER.md` §3.3 are corrected to match.

---
## A third instance of the same error, found while answering these · **CONFIRMED**

`notes/reviews/REVIEW-FINDINGS.md` §I item 3 and `notes/reviews/CRITICAL-REVIEW.md` §3.4 both note that `haiku-full`'s 106 unsolved
runs have no FINDINGS entry. Checking the *other* model with an unexplained deficit found something
worse.

**`notes/records/FINDINGS.md` F28 says: "luna solved 79 percent where every other model solves 95 percent or more.
That is a real capability difference."**

```
node tools/failure-classify.mjs
```

Of luna's 129 unsolved runs, **111 name a fault at or below the harness boundary**:

| cause | runs | what it is |
|---|---|---|
| `HTTP_404: DeepSeek Messages request failed (404)` | **82** | the DSH 0.1.7 protocol drift this repo documents in its own method notes |
| rate limit | 15 | pre-registration rule 9 names it explicitly |
| rejected field (`invalid reasoning_effort`) | 14 | the provider refusing a field the gateway sent |
| auth, harness crash | 2 | instrument |

Only **18** are unexplained. Under rule 9, **luna solves 490/508 = 96.5%**, which is an ordinary
number and not a capability finding. The correction also inverts the comparison the sentence was
making:

| model | as published | after rule-9 exclusions |
|---|---|---|
| DeepSeek V4.1 Flash | 619/620 = 99.8% | **99.8%** |
| Claude Sonnet 5.5 | 617/620 = 99.5% | **99.5%** |
| GLM-5.3 | 308/316 = 97.5% | **99.4%** (6 credit failures removed) |
| Qwen3.8-Flash | 608/620 = 98.1% | **98.2%** |
| gpt-6-luna | 490/619 = **79.2%** | **96.5%** |
| Claude Haiku 4.5 | 547/654 = 83.6% | **84.8%** |

**Haiku 4.5 is the only model with a genuine solve-rate deficit, and it is the one finding the register
never wrote down.** Its worst arm solves 53% and its best 97% — a 44-point spread on the same tasks and
the same model. That is the quality separation batch 2 was built to produce, and it was sitting in the
archive while the study reported a capability difference that did not exist.

> **STATUS 2026-10-04 — this retraction STANDS, and the six-model collection confirms it.** On the
> matrices that ship, luna solves **589/620 = 95.0%** (`results/luna-full`, 620 cells), which is an
> ordinary number and not a capability finding: the 79% was the DSH 0.1.7 protocol drift this repo
> documents, counted as model failure. Haiku's deficit is likewise real and larger than the table
> above shows — **519/620 = 83.7%** — and it remains the only model in the study with one. The
> seven-model absolute counts in the table are unreproducible; the *relationship* they establish is
> reproduced on data that ships.

This is the third retraction of the same shape (F4, F14, now F28). The rule that catches it —
*"a non-zero exit is not evidence until its cause is known"* — was already written down. What was
missing was a **check**, so the check now exists as a tool rather than as a resolution:
`tools/exclusions.mjs` holds the single definition, `tools/failure-classify.mjs` produces the flow
table, and `tools/cost-panel.mjs` refuses to load a run it cannot decide.

---

## A defect in the panel that neither review could have seen

The first version of `tools/cost-panel.mjs` carried **117 runs whose gateway usage was all zeros**.
Each contributed a $0.00000 observation to its arm and pulled that arm's mean **down**, so an arm that
was broken looked frugal. They were inflating the apparent cheapness of exactly the arms with the worst
instrument problems. A run that consumed no tokens measured nothing, whatever its exit code, and is now
excluded under rule 9's first clause and reported in the flow table.

Two further defects in the inherited tooling, fixed here:

- **Gateway logs are now discovered, not listed.** The first version of the panel named each dataset's
  gateway file by hand, and was already wrong for four of ten datasets on the day it was written —
  `glm-terse` and `glm-harness` are in `glm53-gateway.jsonl`. A wrong filename is silent: it appears
  as "no usage", which reads like a data gap rather than a bug.
- **The exclusion rule has one definition.** It previously existed as a bare word-match on "quota" in
  seven tools, which dropped 10 *solved* runs whose fixture source discusses quota policy (F24) while
  failing to exclude 111 runs that died on an HTTP 404.

---

## The thesis this leaves standing

The mechanistic thesis is dead and the methodological thesis that replaced it needed evidence it did
not have. It now has some, and it is a different claim from the one in the handover note.

**Not:** "cross-provider comparison is unreliable" in the abstract, nor "the price ratio decides the
ranking". H1 is refuted with a CI, and the ratio does not order the seven models.

**But:** *the cheapest harness configuration changes four times across seven models; the median rank
correlation between two providers is 0.286; only 63.6% of arm-versus-arm cost comparisons keep their
winner on a second provider, and 54.0% within the DSH configurations alone. The deciding variable is
whether the provider caches automatically or makes the client declare breakpoints — a harness ×
provider interaction that a single-provider design removes by construction. And the design's own noise
floor, measured from a placebo the study did not intend to run, is 7.7%.*  **[Withdrawn — see the status table below.]**

That is a methodological finding with a measured mechanism, a measured noise floor, and a practical
counterpart: a 15-word prompt instruction cuts cost 12–54% on six models across five providers while
moving solve rate not at all, and it is a larger lever than any harness choice in the study.

**The paper's honest headline is therefore narrower and better supported than either the mechanistic
thesis it started with or the methodological thesis it retreated to.**

### Thesis status, 2026-10-04 — every figure in that paragraph

The paragraph is kept as the record of the 2026-10-01 position. It was computed on the seven-model
population destroyed on 2026-10-02, and **each number in it has now moved or been withdrawn.** Current
values, from `notes/records/STEP2-RECONCILIATION.md` §7 and the six-model artifact:

| claim above | status | six-model value |
|---|---|---|
| "cheapest harness configuration changes four times across seven models" | **not recomputable as stated** | the rank-instability result stands and is stronger; the specific count is a seven-model figure |
| "median rank correlation 0.286" | **superseded** | median Spearman rho = **0.238**, permutation p = 0.0467, rank variance explained 0.0567 |
| "63.6% of arm-versus-arm comparisons keep their winner" | **superseded** | arm-versus-arm concordance **62.1%** |
| "54.0% within the DSH configurations alone" | **not recomputed on six models** | — |
| "H1 is refuted with a CI" | **NO LONGER TRUE** | H1 is **INCONCLUSIVE** on six models (b1 = +0.00467 [−0.00551, +0.01568]) |
| "the ratio does not order the seven models" | **strengthened** | six models span **74.59 pp**, and three at ratio 5.00 disagree by **52.64 pp** — 70.6% of the spread inside one ratio value |
| "the design's own noise floor … is 7.7%" | **WITHDRAWN** | no placebo exists in the current data; `placebo: []`, `noiseFloorPct: null` |
| "a 15-word prompt instruction cuts cost 12–54% on six models" | **not re-derived here** | read it from `notes/records/FINDINGS.md` F22 and its six-model equivalent; do not quote the range from this file |

**What this does to the closing claim.** The methodological thesis survives, but not in the form this
file states it. Two of its load-bearing numbers — the median rank correlation and the noise floor —
were wrong or withdrawn, and its central hypothesis moved from *refuted* to *inconclusive*: a weaker
statement in the direction of the thesis, and the honest one. **The claim this paragraph used to say
survives intact — "the penalty does not share a sign across providers" — is withdrawn** (2026-10-10:
GLM is null under the execution-order adjustment and the pre-registered replication of the sign pattern
failed; `PAPER.md` §3.1a, §3.8). What survives is that the penalty is **large and model-specific**, and
that **harness rankings do not transfer** between providers.

> **One live defect this pass found and did not fix, because `notes/records/FINDINGS.md` is outside this file's
> write scope:** F29 still carries the status line **"MEASURED, and it is a control"** and still
> calls its 7.7% result a placebo, while `notes/records/STEP2-RECONCILIATION.md` §7.6 records that no placebo exists
> in the current data. The entry's *arithmetic* was corrected on 2026-10-01 and is sound — the interval
> is [−0.4%, +16.7%] and contains zero. Its *status* is not sound. Flagged for the Lead, not
> silent-patched.



---

## Update, 2026-10-01 — the mechanism experiment came back, and it is the paper

The methodological thesis above was written while the deciding experiment was still running. It has
now run, and it converts the paper's central claim from an inference into a measurement. See
`notes/records/FINDINGS.md` F37 for the full tables.

> **STATUS 2026-10-04 — read this before the numbers below.** The experiment is real and its *shape*
> is the study's mechanism result: one request field, three conditions, hit rate monotone in cost,
> and the default set by the provider rather than the agent. **The figures below are the 2026-10-01
> record and several are superseded:**
>
> - the **1.611x console-over-log factor** that the `$308.16` paragraph at the end of this section
>   leans on is **refuted** — a 62-cell pilot reconciled against the credit ledger gave a ratio of
>   **1.000**, known to ±0.014% (`notes/handovers/HANDOVER-2026-10-03-B.md` §3.4). `notes/records/FINDINGS.md` F27's instruction to
>   scale every per-run figure by 1.61 is retracted in place. The `$308.16` figure is therefore not a
>   valid input and the `$80` projection built from it must not be quoted.
> - **On the population that ships, the mechanism this section is about is narrower than it reads**
>   here. The pre-declared prediction that Anthropic would behave like Qwen was **refuted** on six
>   models: Anthropic's prefix retention is flat (Haiku −0.0032, Sonnet +0.0000) and its PTC
>   differentials are **volume** effects. The prefix mechanism explains **one provider of six**
>   (`notes/records/STEP2-RECONCILIATION.md` §7.4).
> - What replaces it is larger, and is the current claim: on Anthropic the **harness** dominates
>   retention — DSH arms 0.994/1.000 against **0.560** for Haiku's four external harnesses and
>   **0.451** for Sonnet's (§7.5).
>
> The condition this section describes was nevertheless **adopted as the study's Anthropic treatment**
> — static breakpoints *plus* the top-level auto-cache field — because the alternative manufactures
> the effect it reports. It applies only on the Anthropic Messages path, so no other matrix changed,
> and it is pinned by a test (`collect-gateway.test.mjs`).

**Same model, same 12 stratified tasks, same six DSH arms, same seed. Only the request field
differs. Run three ways at once, so no condition is confounded with time.**

| Anthropic caching condition | hit rate | $/run | paired cost vs the study's own condition |
|---|---|---|---|
| **none** — nothing sent, the harness's raw behaviour | **0.0%** | $0.7818 | **+47.4%** [+24.4%, +76.9%] |
| **static** — the breakpoints this study's gateway injects | 11.8% | $0.5128 | *(baseline)* |
| **static + automatic** — one top-level field | **94.9%** | **$0.1667** | **−68.8%** [−90.2%, −47.3%] |

> **Corrected 2026-10-01.** These are the figures after F39's exclusion fix. The first version counted
> 86 runs that never reached the provider — the Anthropic balance died at 14:36:19Z, mid-experiment —
> and those runs consumed nothing, which dragged every mean down and *narrowed* the effect. Removed,
> the effect is larger: 3.1x rather than 3.8x on the automatic condition, and +47.4% rather than
> +26.1% for removing the study's own injection.

Three things follow, and they are the paper.

**1. Without the field, Anthropic caches nothing — 28.8M input tokens, zero cache reads.** Not a
harness failure: the documented default. Running an agent against Anthropic without `cache_control`
bills every token at full rate, while DeepSeek, Qwen, z.ai and OpenAI in this same study cache
whether the client asks or not.

**2. This study's own intervention was worth 26% and it cached *unevenly across the contrast the study
is about*.** Under the static condition the four PTC arms sit at **0%** and the two native arms at
**22-24%**. The deviation was logged on every request for the whole matrix and never grouped on. That
is a harness × provider interaction hiding inside a measurement that looked fine.

**3. Automatic caching is arm-neutral and worth 3.1x**, lifting all six arms to 52-55% with no change
in solve rate.

**Why this is stronger than "cross-provider comparison is unreliable."** That claim is a complaint.
This is a dose-response: three conditions, one field, hit rate 0.0% → 11.8% → 94.9%, cost monotone
in the hit rate, and the field's default is set by the provider rather than by the agent. Every
leaderboard holds the request fixed, which is correct for measuring the harness and wrong for
measuring cost — and the thing it holds fixed is where 3.1x lives.

**Applied to this study's own bill:** F27 records $308.16 spent at a 10-17% hit rate *(both figures retracted — see the status note at the head of this section; the 1.611x factor they rest on is refuted)*. The same work
under automatic caching costs roughly **$80**.

**Stated against ourselves, before anyone else does.** This is exploratory, not confirmatory: it was
proposed after F31 and after the matrices ran, so `PRE-REGISTRATION.md` §12.5 records that it cannot
upgrade H1 or H2. One model, 12 tasks, one seed, six DSH arms. The four external harnesses speak
`/v1/chat/completions`, where this gateway can neither send `cache_control` nor read back a cache
count — so **their Anthropic costs are billed as fully uncached and the instrument cannot tell whether
that is true.** That limitation is itself a finding about what a gateway can and cannot observe.
