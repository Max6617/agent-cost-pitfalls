# REPLICATION VERDICT — tasks-b, 2026-10-09

**The batch-1 headline did not replicate. R1 holds for 0 of 4 providers, R2 fails, and
`tasks-b/PLAN.md` section 5 has exactly one verdict for that: "not replicated". There is no
"replicated with caveats" tier; the plan forbids inventing one after the fact.**

This document is the record of that verdict, computed by the filed rule rather than by eye.
Everything below is reproducible with `node tools/replication-verdict.mjs`.

---

## 0. Correction, 2026-10-10 — re-filed at B = 200,000, and the both-scales sweep

This document is the 2026-10-09 record. Two things have moved since, and they are noted here rather
than written over the record:

- **Every interval below was re-filed at B = 200,000** (from 5,000). The classifications, R1 = 0 of 4
  and the NOT REPLICATED verdict are unchanged; the endpoints moved in the last decimal. GLM's tasks-b
  upper bound, the knife edge this document is built around, is **+0.1409%** at B = 200,000 (`+0.0405%`
  at B = 5,000). Current values: Qwen [-3.93, +15.01], GLM [-21.12, +0.14], luna [-24.35, -8.55],
  DeepSeek [-37.46, -9.38].
- **§2b's decomposition and its divergence count are superseded.** On the additive scale **zero of
  four** pairs separate; on the like-for-like variant arm pair **none** of the four separates
  (DeepSeek overlaps by 13.4pp, luna by 15.1pp), and the only provider whose variant intervals
  separate is Qwen, by 0.3pp. On the primary pair the two separations are knife-edge: 0.6pp and 0.7pp
  on the log adjustment, 0.1pp and 0.5pp raw. The honest count is **zero robust divergences**, and the
  sentence "DeepSeek genuinely differs on both arm pairs" is withdrawn. §2b's table quotes B = 5,000
  endpoints and the variant interval it gives for luna ([-20.7, +2.0]) is stale: the filed ablation
  gives **[-21.3, +1.9]**.
- **The direction sentence in §2b mis-names one provider**: luna's and **Qwen's** gaps widen and
  **DeepSeek's narrows**. On the additive scale the mean absolute gap *rises*, 18.8pp to 19.5pp, and
  the separated count falls to 0 of 4.
- **"Four readings give R1 = 0, 1, 1, 1" is wrong**: there are **three** consistent readings (raw;
  adjusted log; adjusted additive), and they give **0, 1, 1 of 4**. The fourth count in the phrase was
  a phantom; `PAPER.md` §3.8 and FINDINGS F51 carry the corrected sentence.
- **§5's "the only positive-leaning cost differential" is wrong.** Haiku's raw +6.2% is the **largest
  raw** differential in tasks-b, not the only positive-leaning one: Qwen's is **+5.7% raw** (+7.0%
  adjusted log). The sentence is corrected in place below; the extension verdict does not move.

---

## 1. The rule, as filed

`tasks-b/PLAN.md` section 5, fixed on 2026-10-03 before any tasks-b run record existed:

> **R1 (per-provider classification)**: all four providers' tasks-b classifications equal their
> batch-1 classifications — Qwen positive, GLM-Flash negative, luna null, DeepSeek null.
>
> **R2 (the headline pattern)**: at least one provider classifies positive and at least one
> classifies negative on tasks-b — the sign disagreement itself reproduces on the new suite.
>
> **Verdict**: *replicated* requires **R1 (4 of 4) and R2**. If R1 holds for exactly 3 of 4
> providers the verdict is *partially replicated* and the deviating provider is named. Otherwise
> *not replicated*.

A classification is `positive` when the 95% interval lies entirely above 0, `negative` when
entirely below, `null` when the interval contains 0 — the plan's own rule, applied to the primary
contrast of section 5: `D = mean over seeds of cost_billed(dsh:ptc) − cost_billed(dsh:native)`,
paired by task, cluster bootstrap over tasks.

## 2. The verdict

Panel: `analysis/panel-analysis-batchb-2026-10-09.json`, checksummed in `artifact/MANIFEST.json`.
Re-deriving it moves the file's `generated` field and nothing else — the A2 rows are byte-stable
across regenerations, across the A6 split, and across the four- versus six-dataset selections — so
this document cites the file rather than a timestamp.

| provider | batch-1 | batch-1 95% CI | tasks-b | tasks-b 95% CI | tasks | R1 |
|---|---|---|---|---|---|---|
| Qwen3.8-Flash | positive | [+10.00%, +53.30%] | **null** | [−3.78%, +15.20%] | 40 | DIFFERS |
| GLM-5.3-Flash | negative | [−43.70%, −2.70%] | **null** | [−21.38%, **+0.04%**] | 40 | DIFFERS |
| gpt-6-luna | null | [−8.40%, +11.30%] | **negative** | [−24.32%, −8.51%] | 40 | DIFFERS |
| DeepSeek V4.1 Flash | null | [−9.00%, +9.80%] | **negative** | [−38.31%, −9.41%] | 40 | DIFFERS |

- **R1: FAILS — 0 of 4.** Not one provider keeps its batch-1 classification.
- **R2: FAILS.** On tasks-b *no* provider of the four classifies positive; two classify negative.
  The sign disagreement that was the batch-1 headline is absent: the differential is negative or
  indistinguishable everywhere.
- **VERDICT: NOT REPLICATED.**

### The classification turns on 0.04 of a percentage point, and prose could not see it

GLM's tasks-b interval ends at **+0.0405%**. Every one-decimal rendering of that interval — including
the one in `notes/handovers/HANDOVER-2026-10-09.md` section 1, "[-21.4, 0.0]" — reads as "negative, excludes zero",
and the handover's own one-line summary does call GLM negative ("the PTC-vs-native differential is
negative on DeepSeek, GLM and luna"). The filed rule says otherwise: an interval that ends above 0
contains 0, so GLM is **null**. `tools/replication-verdict.mjs` prints intervals to two decimals and
flags any null whose nearest bound is within 0.5pp of 0, so this cannot be rounded away again.

This matters beyond bookkeeping. It is the difference between R1 scoring 0 of 4 and 1 of 4 — and it
is the reason the plan states its rule in advance and in arithmetic rather than in adjectives.


## 2b. How much of the failure is a real divergence, and how much is the rule

R1 compares **classifications**, not estimates. A provider scores as failing whenever its class changes,
even when the two suites' intervals overlap almost entirely. That distinction decides how the verdict
should be read, so it was measured: for each of the four providers, both suites re-estimated on the same
basis (raw, and execution-order adjusted as in section 3b), and the two intervals compared directly.

| provider | batch-1, adjusted | tasks-b, adjusted | gap | intervals |
|---|---|---|---|---|
| gpt-6-luna | +6.7% [-6.4, +22.9] | -16.2% [-24.9, -7.0] | 22.8pp | **disjoint** |
| DeepSeek V4.1 Flash | -0.8% [-10.1, +9.8] | -17.0% [-23.3, -10.8] | 16.3pp | **disjoint** |
| Qwen3.8-Flash | +35.3% [+16.2, +58.7] | +7.0% [-2.6, +16.9] | 28.4pp | overlap [+16.2, +16.9] |
| GLM-5.3-Flash | -8.9% [-19.7, +2.1] | -6.2% [-15.0, +3.2] | **2.7pp** | overlap |

**Two of the four failures are divergences the data can separate, and two are not — with a qualification
added on 2026-10-09 by the ablation in §3.9 of the paper.** DeepSeek genuinely differs on both arm pairs.
luna differs on the primary pair, but on the variant pair (`dsh:ptc-opt` vs `dsh:native-opt`) its tasks-b
interval is -8.8% [-20.7, +2.0], which overlaps its adjusted batch-1 interval (+6.7% [-6.4, +22.9]), so
**luna's divergence is arm-dependent rather than robust**. The count is therefore one robust divergence,
one arm-dependent one, and two fragile classifications. Qwen and GLM do not: their
intervals overlap, and for GLM the two suites agree to **2.7 percentage points** (-8.9% against -6.2%,
both null). GLM is scored as a replication failure because its *batch-1* interval sat entirely below zero
while its tasks-b interval crosses it — a change in where an endpoint falls relative to zero, not a change
in what the two suites measured.

**This does not rescue the verdict, and it is not offered as a rescue.** R1 requires 4 of 4 and holds for
0 of 4 on every basis, and R2 fails because no basis produces a positive classification on tasks-b. Two
genuine divergences and two fragile classifications are still not a replication. What it does change is
the sentence the paper can write: *the pre-registered classification pattern did not reproduce*, rather
than *four providers disagreed between the suites* — the second over-reads the first by a factor of two.

**The rule's sensitivity is itself a result.** A criterion that compares classifications inherits the
fragility of any classification whose interval passes near zero, and it will report a failure for an
estimate that has not moved. GLM is the proof: 2.7pp apart, same sign, same null verdict, scored as a
failure. The plan's rule is applied as filed — post-hoc softening is exactly what a pre-registration
forbids — but the write-up should carry the decomposition so a reader can see what the rule counted.

**A check on the direction of the correction.** If the position confound were the cause of the failure,
adjusting both suites should close the gaps. It does not: the mean absolute gap across the four moves
from 18.8pp to 17.5pp, and the number of discrepancies the intervals separate is 2 of 4 on both bases.
GLM's gap collapses (10.6pp to 2.7pp), which is real, but luna's and **Qwen's** widen and **DeepSeek's
narrows** (corrected 2026-10-10: the sentence said luna's and DeepSeek's widen; on the additive scale the
mean absolute gap rises to 19.5pp and the separated count is 0 of 4). So the failure is not an artefact of
execution order, and correcting for order does not repair it.

## 3. R3 — magnitude (reported alongside, not part of the verdict)

| provider | batch-1 point inside tasks-b CI | tasks-b point inside batch-1 CI | intervals overlap |
|---|---|---|---|
| Qwen3.8-Flash | no | no | yes ([+10.0, +15.2]) |
| GLM-5.3-Flash | yes | yes | yes |
| gpt-6-luna | no | no | **no** |
| DeepSeek V4.1 Flash | no | no | **no** |

Two readings follow, and they are different in kind:

- **GLM is not evidence of a reversal.** Its intervals overlap and each suite's point estimate lies
  inside the other's interval — batch 1's −20.8% sits inside tasks-b's [−21.38%, +0.04%], and
  tasks-b's −10.1% sits inside batch 1's [−43.7%, −2.7%]. The two suites agree that the effect is
  negative-to-null somewhere in the −10% to −21% range with the sign unresolved; the batch-1
  interval is simply wider and shifted lower. Only the classification moved, and only because
  tasks-b's upper bound landed 0.04pp above zero.
- **Qwen lost its positive result rather than reversing it.** The two intervals overlap on
  [+10.0%, +15.2%]: batch 1's +30.7% is outside the tasks-b interval, and tasks-b's +5.7% is below
  batch 1's, so the point estimates disagree while the intervals do not separate cleanly.
- **luna and DeepSeek reversed**, from "null, centred on zero" to "significantly negative", with
  intervals disjoint from the batch-1 intervals. These are not precision differences around a shared
  null; the two suites are measuring different effects for these two providers.

## 3b. Position: the verdict survives every basis; the batch-1 target does not

The arms are executed in a randomised order within each (task, seed) block and that order carries cost
(`notes/defects/DEFECT-position-confound-2026-10-04.md` section 2: a 1.75x-3.82x spread across positions within one
arm). tasks-b inherits the same degenerate randomisation — the assigned position is **identical in all
five tasks-b matrices for all 320 blocks** — so the raw differential is measured on the same design as
batch-1, and the question is not academic.

**The instrument.** `tools/position-adjust.mjs` models the within-block paired difference,
`d = c_ptc − c_native = alpha + [f(p_ptc) − f(p_native)]`, with `f` a step function over the ten
positions and a task-clustered bootstrap. It keeps the pairing that the pre-registered contrast uses.
It is validated against data with a **known** arm effect and a **known** position effect, and it refuses
designs it cannot identify rather than returning a number — including the case that matters here, where
if every block puts ptc exactly k positions after native then "ptc is cheaper" and "cost rises per step"
are the same parameter. The real permutation varies (46 distinct pairs in batch-1, 58 in tasks-b), which
is what makes the adjustment possible at all.

**The claim that GLM flips to negative does not survive this estimator, and is withdrawn.** That came
from reweighting to a pooled position distribution, which abandons the pairing and widens intervals by
that alone. Properly paired, GLM's tasks-b interval ends at +3.2% (log) — comfortably null — so GLM's
quarter-of-a-percentage-point knife edge is a property of the *raw* contrast, not of a correction.

| provider | raw (filed, pre-registered) | adjusted, log | adjusted, usd |
|---|---|---|---|
| DeepSeek V4.1 Flash | −21.8% [−38.3, −9.4] negative | −17.0% [−23.3, −10.8] negative | −23.5% [−38.0, −11.2] negative |
| GLM-5.3-Flash | −10.1% [−21.4, **+0.04**] null | −6.2% [−15.0, +3.2] null | −8.8% [−21.4, +2.4] null |
| Qwen3.8-Flash | +5.7% [−3.8, +15.2] null | +7.0% [−2.6, +16.9] null | +5.8% [−4.6, +16.1] null |
| gpt-6-luna | −16.6% [−24.3, −8.5] negative | −16.2% [−24.9, −7.0] negative | −16.7% [−26.1, −8.5] negative |
| Claude Haiku 4.5 (extension) | +6.2% [−7.0, +19.6] null | +11.8% [−14.2, +35.1] null | +4.1% [−19.8, +21.0] null |
| Claude Sonnet 5.5 (extension) | −0.5% [−8.0, +5.9] null | +5.2% [−1.4, +11.8] null | +1.0% [−6.2, +7.5] null |

**The verdict is robust; the target is not.** Three readings — raw, adjusted log, adjusted usd,
applied consistently to both suites — give R1 = **0, 1, 1 of 4** and R2 fails in all three, because no basis
produces a positive classification on tasks-b. **NOT REPLICATED on every basis.** But the batch-1
classifications that R1 compares against are themselves basis-dependent: on the raw filing GLM is
*negative*, and under either adjusted scale it is *null* (−8.9% [−19.7, +2.1] log, −17.3% [−41.4, +0.7]
usd). The filed R1 names GLM negative, so the pre-registered verdict stands as recorded at 0 of 4; a
reader should know that on an adjusted reading it would be 1 of 4, with GLM the one that matches, and
that either way the verdict does not move.

**What is not identified.** The functional form of the position effect is a modelling choice the data do
not settle: a multiplicative effect (log) and an additive one (usd) disagree materially — batch-1
Sonnet is +17.0% [5.1, 28.5] on the log scale, positive, and +6.9% [−5.0, 17.0] on the usd scale, null.
The 2026-10-04 claim that Sonnet's interval contains zero after adjustment is therefore **scale-dependent
and not established**. Both scales are reported everywhere for that reason, and neither is called *the*
adjusted number.

The scale check itself is the reason to be careful here. Scored by held-out prediction of the same
quantity in the same units, the log scale wins **9 of 12** model x suite comparisons by up to 1.8x, and
**every comparison the additive scale wins is marginal** (≤4% in relative error): batch-1 is 3-3 with all
the additive wins marginal, tasks-b is 6-0 for log. An earlier version of this check scored the additive
model after converting its prediction into a ratio, which explodes when a predicted difference
approaches the block's own cost — it reported RMSEs of 10 in log units for GLM and "log wins 10 of 12,
decisively, x20". That metric was wrong and the claim is withdrawn with it; the symmetric metric is what
the tool reports now.

There is one independent corroboration worth recording, because it is not from this session's tooling:
`notes/records/MIXED-EFFECTS-2026-10-04.md` section 2 fits `cost_billed ~ mode + slot + (1|task)` per model — an
additive slot fixed effect — and gets **haiku +52.97%** against the +51.8% this document's additive
paired estimator reports, with raw at +53.84% and the withdrawn reweighting at +25.41%. Two
independently written additive estimators agreeing to a point is a check on the implementation, not
evidence about the functional form — but it does confirm that the additive correction is small for
haiku and that the reweighting's halving was the outlier.

**Still true, and unaffected:** the confound's existence (section 2 of the 2026-10-04 document); the
withdrawal of that document's section 3 estimator
(`notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md`); and the fact that a real correction is not a
uniform shrinkage — Qwen moves +30.7% to +35.3% and GLM −20.8% to −8.9% on batch-1, which a single
halving factor could never produce.

## 4. Reported alongside the verdict

### The pre-registered family is m = 12, not the m = 18 that is currently filed

`tasks-b/PLAN.md` section 4 fixes the family as **the 4 per-provider cost contrasts (A2b) + the 8
solve-rate contrasts (A4), m = 12**, Holm step-down at α = 0.05. The filed
`analysis/panel-analysis-batchb-2026-10-09.json` reports **m = 18**, because the tool computes the
family over every model in the panel and the panel now holds six providers. The six-provider family
is an extension; the pre-registered number is the four-provider one. Re-run with the four
pre-registered datasets only:

```
node tools/panel-analysis.mjs --datasets batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna \
  --json results/_scratch/panel-four.json
```

**m = 12; 2 of 12 survive Holm at α = 0.05** — DeepSeek (p = 0.0001) and luna (p = 0.0003), the same
two that survive in the six-provider m = 18 family. Narrow-reading sensitivity: A2b 2 of 4
(α/4 = 0.0125), A4 0 of 8 (α/8 = 0.00625). The family result is therefore unchanged by the
Anthropic extension, and the pre-registered reading is the same as the filed one.

### H1 slope re-fit on the four pre-registered providers

The plan reads H1's replication as "slope negative with 95% CI excluding 0", matching the batch-1
survivor result (b1 = −0.0049 [−0.0083, −0.0013]). Re-fit on tasks-b with the filed model spec and
**no Anthropic** (`node tools/hypotheses.mjs --datasets <the same four> --json results/_scratch/hyp-four.json`):

- n = 160 task × provider observations (4 providers × 40 tasks)
- **b1 pooled = −0.0125, 95% CI [−0.0203, −0.0050]** — negative, CI excludes 0 → **matches** the
  replication read
- b1 within-task = −0.0126, 95% CI [−0.0205, −0.0049]

Note the two different questions this single number answers. As filed, H1's *hypothesis* was b1 > 0
and the pre-registered label is **REFUTED** — in batch 1 as well (b1 = −0.0049, negative). What
replicates is the *sign and its interval*, which is what the plan asks to be read. The confirmatory
hypothesis is refuted in both suites for the same reason: the PTC penalty does not grow with the
output share of cost.

## 5. The Anthropic extension is not part of the verdict

`tasks-b/PLAN.md` section 2 declares the design as the four cheap providers and says
**"No Anthropic."** haiku and sonnet were collected afterwards. A provider added after the filing
cannot move a pre-registered claim about the four, so `tools/replication-verdict.mjs` excludes them
by construction — and reports them:

| extension | tasks-b | tasks-b 95% CI | paired tasks |
|---|---|---|---|
| Claude Haiku 4.5 | null | [−7.02%, +19.58%] | **18** |
| Claude Sonnet 5.5 | null | [−8.00%, +5.93%] | 40 |

Adding them would not change the verdict: they are both null, so the suite would still contain no
positive classification and R2 would still fail. This is worth stating explicitly, because haiku's
+6.2% is the **largest raw** cost differential in tasks-b - Qwen's is +5.7% raw (+7.0% adjusted log),
so it is not the only positive-leaning one - and it is also the row with 18 paired tasks instead of 40 —
see section 7.

## 6. What was verified before the verdict was recorded

1. **The replication target reproduces exactly.** Re-deriving the batch-1 A2 rows with the current
   estimator (`node tools/panel-analysis.mjs --json results/_scratch/panel-batch1.json`) returns
   30.7 [10.0, 53.3] · −20.8 [−43.7, −2.7] · 1.2 [−8.4, 11.3] · 0.1 [−9.0, 9.8] — identical to
   `tasks-b/PLAN.md` section 1 on all four providers and all eight interval bounds. R3 compares two
   intervals produced by one estimator, not by two.
2. **The gateway treatment is identical between the suites**, which the plan requires per provider
   ("per-provider cache-breakpoint setting"). Census of the gateway records: ds-full and
   batchb-deepseek both `/v1/messages`, no cache_control injected; glm-flash and batchb-glm-flash
   the same; qwen-full and batchb-qwen both `/v1/messages` with a `tools` cache_control injection;
   luna-full and batchb-luna both `/v1/responses`. So the luna and DeepSeek reversals are not a
   change of transport or cache flag.
3. **The four-provider panel does not perturb the per-model numbers.** Building the panel over only
   the four pre-registered datasets returns A2 rows identical to the six-provider panel for all four
   models (same point estimate, same interval bounds, same task count) — the Anthropic matrices
   cannot leak into a batch-1 comparison through the panel.

## 7. What this verdict does and does not say

- It says the **sign disagreement** — the batch-1 headline — did not reproduce. On tasks-b the PTC
  differential is negative or null for every pre-registered provider, never reliably positive.
- It does **not** say PTC is uniformly cheaper. Only DeepSeek (−21.8%) and luna (−16.6%) have
  intervals excluding 0; Qwen (+5.7%) and GLM (−10.1%) are null.
- It does **not** identify the cause of the luna/DeepSeek reversals. Candidate explanations that this
  document does not decide between: the suite differs (tasks-b has 40 tasks with partial-credit
  grading and a different stratum design, against batch 1's 31 tasks and binary grading); the
  matrices differ in size (620 vs 800 cells); and the PTC arm's request shape interacts with cache
  behaviour differently per provider. A reversal with disjoint intervals is a fact about the two
  suites, not yet an explanation of either.
- It does **not** touch haiku's parked re-run. If the write-up needs a positive cost contrast
  anywhere in tasks-b, haiku's +6.2% on 18 paired tasks is the only candidate, and 18 paired tasks is
  not enough to carry a headline — which is an argument for the re-run, on the author's terms, not a
  change to this verdict.

## 8. Reproducing

```
node tools/replication-verdict.mjs                      # the verdict, from the filed panel
node --test tools/replication-verdict.test.mjs          # 11 tests, including the GLM knife edge
node tools/position-adjust.mjs                          # batch-1: raw vs position-adjusted
node tools/position-adjust.mjs --datasets batchb        # tasks-b: the same
node --test tools/position-adjust.test.mjs              # 10 tests, known-truth recovery and refusals
node tools/panel-analysis.mjs --datasets batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna --json results/_scratch/panel-four.json
node tools/hypotheses.mjs     --datasets batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna --json results/_scratch/hyp-four.json
```

## 9. Follow-ups this verdict creates

1. **`PAPER.md` reports the batch-1 result and does not yet report this replication.** Its
   sign-disagreement framing (`PAPER.md` lines 135 and 196) is a statement about the batch-1
   population, which remains a real result about that population; what is missing is the
   pre-registered attempt to reproduce it. The two are not in contradiction — one is a result, the
   other is a failed replication of it — and `tasks-b/PLAN.md` section 5 pre-declares both outcomes
   as publishable, so the verdict belongs in the paper as a result rather than as a caveat. The same
   applies to `notes/records/FINDINGS.md`, which indexes the study's findings and does not yet carry this one.
   This document is the source for that edit; it is not itself the edit.
2. **The filed `analysis/panel-analysis-batchb-2026-10-09.json` reports the family as m = 18.** The
   pre-registered family is m = 12. Both should be reported, clearly labelled, so the extension is
   visible as an extension.
3. **`notes/handovers/HANDOVER-2026-10-09.md` section 1's table classifies GLM as negative** on the strength of a
   one-decimal interval. The pre-registered rule makes it null. Superseded by section 2 above.
4. **The batch-1 classifications that R1 compares against are basis-dependent** (section 3b): GLM is
   negative as filed and null under either adjusted scale. R1's wording is a claim about the filed
   classifications, so the pre-registered verdict is unaffected — but if the paper ever reports an
   adjusted differential as *the* differential, R1 must be restated against adjusted targets, and the
   pre-registration does not authorise that after the fact. It is a decision for the write-up, not a
   correction to make silently.
5. **The functional form of the position effect is a modelling choice the data do not settle**
   (section 3b). Until it is settled, every adjusted figure travels in pairs, and the 2026-10-04
   document's Sonnet claim is not quoted.
