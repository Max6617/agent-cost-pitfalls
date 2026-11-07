# The code-mode cost penalty is model-specific: a two-suite cross-provider measurement, with a failed pre-registered replication

> **This is the long-form research record, not the paper (2026-10-10).** The paper is
> `paper/PAPER.tex` / `paper/PAPER.pdf`, *Six Pitfalls in Measuring the Cost of Coding Agents*, which
> uses this study as its evidence and restates the claims below where the evidence requires it: the title's "model-specific" and "not predicted
> by the output:input price ratio" are not what the data support (the pre-registered price-ratio
> secondary is nominally *met*, and model is confounded with provider and cache regime); §3.4's
> "rankings do not transfer" is replaced by "rankings agree weakly" (median rho 0.238 is
> significantly *positive*, p = 0.047); H3 is read as "PTC reduces request count", not as a
> tool-count effect; and the central contrast now carries a solve-rate check it never had
> (`analysis/quality-guard-2026-10-10.json`: batch-1 Haiku PTC solves 46 of 62 cells against
> native's 60, exact McNemar p = 0.0013). This file keeps every intermediate and withdrawn result
> as the record; where it and the paper disagree, the paper governs.

**Abstract.** We measure what code-execution mode costs across six models on five providers and five
agent harnesses (ten arms), on two task suites, from gateway-metered token and request records. The code-mode
penalty is large, model-specific, and not predicted by the output:input price ratio: three models
sharing a ratio of 5.00 differ by 59.5 adjusted points — 79.2% of the whole between-model spread — and
the same ratio result holds on the raw figures that assume nothing about execution order (70.6%). The
study pre-registered a replication of its own headline pattern on a second 40-task suite, filed the
criterion before the data existed, and reports the outcome as a result: **the replication failed** (R1 0
of 4 providers, R2 fails) and the failure is stable across 20 bootstrap seeds. Harness cost rankings do
not transfer across providers: the median Spearman correlation between two providers' harness rankings
is 0.238, and half of the adjacent harness steps cannot be ordered at all on either suite. One
pre-registered confirmatory prediction replicates in direction but not in magnitude, and is one model
deep on the suite we report it on. A corrected A/A pair finally measures the noise floor the earlier
draft lacked: two identical treatments differ by -5.75% of per-cell cost with a 95% interval of
[-15.6%, +3.4%] — a **±9.5% floor** at 31 paired tasks, wider than the 7.7% this study previously and
wrongly quoted, and wider than the two smallest effects it reports.
The contribution is a measurement discipline as much as a measurement: every number is re-derivable
from the shipped artifact, every retraction stays visible, and the failed replication is the strongest
result in the paper.

---

## Data, artifact, and reproducibility

Six matrices on the batch-1 suite (31 tasks x 10 arms x 2 seeds = 620 cells each) and six on the
replication suite (40 x 10 x 2 = 800 each): 8,520 planned cells (3,720 batch-1, 3,721 batch-1 run
records; 4,800 tasks-b). Every number in this
paper is re-derivable from the shipped artifact. `artifact/MANIFEST.json` checksums **126 files across
two scopes** — the batch-1 matrices, and the material this paper reports after 2026-10-04 (the
replication suite, the position-adjusted re-derivation, the ablations, the mixed-effects fit, the
ranking and retention sensitivities, the test-edit incidence, the 20-seed verdict stability, the
corrected A/A noise floor, the single-harness retention pilot, the Anthropic cost bracket, the
common-`f` position fit, and the batch-1 contrasts re-derived
at **B = 200,000**) — together with the exact command that produced each
output. The first scope is untouched since 2026-10-04; later material was added with
`node tools/artifact.mjs --extend`, the additive path, and `node tools/artifact.mjs --verify` exits
non-zero on any drift. `tools/artifact-coverage.test.mjs` fails if an output this paper cites is
missing from the manifest. The `B = 5,000` outputs of 2026-10-03/04 are kept unmodified beside the
re-derivations as the record of what was computed then; §3.1 states the one classification that moves.
No API spend was made for the analysis in this draft.

---

## 1. The question

When coding-agent harnesses solve the same tasks with the same model, what determines what it costs
- and why does the answer change with the provider?

The instrument is a gateway at the provider boundary. It forces the model, effort and temperature,
logs every deviation it applies, and captures the provider's own usage block including the cache
hit/miss split - a quantity no harness exposes; the nearest prior work measures it on one pricing
regime (§4). Detail in `METHODS.md`; the harness registry is `tools/harnesses.mjs`.

## 2. The design

| | |
|---|---|
| models | DeepSeek V4.1 Flash, GLM-5.3-Flash, gpt-6-luna, Qwen3.8-Flash, Claude Haiku 4.5, Claude Sonnet 5.5 |
| providers | five (Anthropic contributes two models) |
| arms | 6 DSH conditions (`native`, `native-opt`, `native-terse`, `ptc`, `ptc-opt`, `ptc-terse`) + `opencode`, `cline`, `openhands`, `goose` |
| tasks | 31, stratified, all with objective visible suites |
| seeds | 2 |
| cells | 620 per model (Qwen 621 records for 620 cells: one infrastructure failure plus its justified retry; luna 620 records for 619 analysed cells: one `opencode` run excluded by rule 9 on the provider's own "Rate limit reached") |
| cost | re-derived per run from gateway usage with `costOf`; never from a summary or a stored `cost.billedUsd` |
| pre-registration | filed, tag `prereg-v5`; amendments 12-23 in `PRE-REGISTRATION.md` §12 (21-23 post-date the tag) |

Every matrix collected 620/620 cells with 10 arms at exactly 62 and no missing cells; one luna record is
excluded from the analysis under rule 9 (above), so the panel reports 619 cells there. The six-model analysis
is regenerated by `node tools/artifact.mjs` and checksummed in `artifact/MANIFEST.json`, which also
covers the replication suite of §3.8 and the adjusted figures of §3.1 — see the note at the top of this
file.

## 3. Results

### 3.1 The code-mode penalty is large, model-specific, and not a price-ratio effect

`cost_billed`, paired by task, cluster bootstrap over 31 tasks (panel section A2). Interval is on the
absolute difference, expressed as a percentage of each model's native mean:

| model | output:input ratio | PTC vs native | 95% CI |
|---|---|---|---|
| GLM-5.3-Flash | 3.33 | **-20.75%** | [-44.30, -2.79] |
| gpt-6-luna | 5.00 | +1.20% | [-8.42, +11.29] |
| DeepSeek V4.1 Flash | 4.00 | +0.13% | [-8.90, +9.76] |
| Claude Sonnet 5.5 | 5.00 | +9.51% | [-0.08, +18.01] |
| Qwen3.8-Flash | 3.13 | +30.67% | [+10.02, +53.79] |
| Claude Haiku 4.5 | 5.00 | **+53.84%** | [+31.25, +76.73] |

**Intervals are at B = 200,000** (percentile cluster bootstrap over tasks, seed 12345; METHODS §7). The
study's earlier tables were computed at **B = 5,000**, where the endpoints carried visible Monte Carlo
error and one row's classification was decided by it: **Sonnet's lower bound sat at +0.28% at the
shipped seed and lands below zero in 25 of 40 reseeds** (sd of the bound 0.21pp), while at B = 200,000
it is **-0.08%** and at B = 2,000,000 **-0.07%**. So **Sonnet's interval contains zero** — the
sign-flip test, p = 0.0512, reported *with* its Monte Carlo error, agreed with the large-B interval all
along, and the paper previously reported the two as disagreeing. Of the twelve model x suite contrasts
in this paper, this is the only classification the change moves (§3.9 reports the rest).

| model | ratio | PTC vs native, **execution-order adjusted** | 95% CI | same, additive scale |
|---|---|---|---|---|
| GLM-5.3-Flash | 3.33 | **-8.92%** | [-19.97, +1.80] | -17.27% [-42.55, +0.41] |
| gpt-6-luna | 5.00 | +6.65% | [-6.47, +23.03] | +2.35% [-9.90, +15.98] |
| DeepSeek V4.1 Flash | 4.00 | -0.78% | [-10.02, +9.63] | +0.34% [-11.37, +11.59] |
| Claude Sonnet 5.5 | 5.00 | +17.02% | [+5.05, +28.41] | +6.85% [-5.07, +16.82] |
| Qwen3.8-Flash | 3.13 | +35.35% | [+15.61, +58.32] | +32.39% [+12.94, +54.79] |
| Claude Haiku 4.5 | 5.00 | **+66.13%** | [+39.06, +99.13] | +51.79% [+28.44, +75.63] |

**The second table is the same contrast *modelled* under a stated position-effect assumption — not with
the confound removed** (limitation 8).
The arms of a block run in a shuffled order and that order carries cost - 1.75x to 3.82x across
positions *within one arm* - the shuffle is identical in all six matrices, and `dsh:ptc` almost never
lands in the cheapest position. Because each arm occupies exactly one position per block there is
nothing to reweight within a block, so the estimate comes from a model of the within-block paired
difference, `d = c_ptc - c_native = alpha + [f(p_ptc) - f(p_native)]`, with `f` a step function over
the ten positions and a task-clustered bootstrap (`tools/position-adjust.mjs`). It is validated against
data with a **known** arm effect and a **known** position effect, and it refuses designs it cannot
identify - a pure position shift makes the arm effect and the step effect one parameter, and the fit
says so rather than returning a number.

**The identifying assumption, stated here because this design cannot test it.** The model requires
**`f` to be common across models**: that the cost of occupying slot *k*, in the chosen scale, is the
same for every model. Nothing in this study can check that, and the reason is limitation 8 - all six
matrices draw the **same** permutation, so within a (task, seed) block every model sits in the same
slot, which makes a model-specific position effect **inseparable from a model effect by construction**.
(A *within-model* step function, one per arm, is a different question and is probed below: it is
estimable on this data but too uncertain to use - limitation 8.)
The adjusted column is therefore a *model* of the confound under an assumption the data cannot falsify,
and where the assumption fails, the adjusted numbers inherit the error; the raw column assumes nothing
of the kind. This matters most for the section's surviving claim: **the ratio result holds on both
scales and on all three bases - 79.2% of the spread inside ratio 5.00 on the adjusted log scale, 71.6%
on the adjusted additive one, 70.6% raw (`§3.1a`) - so it does not depend on this assumption.** The
per-model adjusted values do.

*An earlier shipped version of this table came from an estimator that was not a standardisation — it
passed both arms' records to the function meant to summarise one arm — and it is withdrawn; none of its
figures are used here (`notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md`).*

**What the correction does is not a uniform shrinkage, and two classifications move.** GLM goes from
-20.75% to -8.92% (log) or -17.27% (additive), and **its interval comes to contain zero on both scales:
GLM is not significantly negative once execution order is controlled.** Qwen moves the other way, from
+30.67% to +35.35%. Sonnet is +17.02% [+5.05, +28.41] on the log scale and +6.85% [-5.07, +16.82] on the
additive one — positive on one scale and null on the other, which on its own makes its classification
scale-dependent — so **Sonnet's "+9.51%, excludes zero" does not survive as stated.** The scale is a real choice and it is
**not settled**: judged by held-out prediction of the same quantity in the same units — the RMSE of the
relative dollar error of the held-out block difference, one seeded fold draw (`tools/position-adjust.mjs`,
whose docstring used to mislabel this as a log-ratio RMSE) — the log scale wins 9 of 12 model x suite
comparisons, by up to 1.8x. **Four of those nine log wins are themselves marginal** (ratio < 1.10: luna
and Sonnet on batch 1, Qwen and haiku on suite 2) and all three additive wins are marginal (at most 4% in
relative error); only five of the twelve comparisons separate the scales by more than 10%. On batch 1 the
split is 3-3; on suite 2 (§3.8) it is 6-0 for the log scale. Both columns are therefore reported and
neither is crowned, and no claim rests on a per-matrix preference from this one seeded draw. What matters for the claims above is only where the two disagree about a
*classification*, and that is two rows: GLM (null on both scales) and Sonnet (null on the additive
scale, positive on the log one). The metric is symmetric — both scales predict the same held-out log
ratio in the same units — because the asymmetric alternative (converting the additive model's predicted
difference into a ratio) explodes when that difference approaches the block's own cost.

*Figure 1 (`paper/figures/fig1-penalty-per-model.tex`, generated by `tools/figures.mjs` from
`analysis/position-adjust-6model-2026-10-09.json`): the code-mode penalty per model on batch 1,
execution-order adjusted, percent of each model's native mean on the log scale, with 95% task-clustered
bootstrap intervals. The three models sharing an output:input price ratio of 5.00 (red) span 59.5 of the
75.1-point spread.*

**Consequences for this section's claim.** The *ratio* result strengthens on the log scale and barely
moves on the additive one: at ratio 5.00 the three models span **59.5 of 75.1** adjusted-log points
(luna +6.65, Sonnet +17.02, haiku +66.13) — **79.2%** of the between-model spread, against 70.6% on the
raw figures — or **49.4 of 69.1** on the additive scale, **71.6%**. The pre-registered secondary is met
on **all three bases**: the filed raw paired difference gives a gap of **42.3pp**, the adjusted-log one
**38.9pp**, and the additive one **37.6pp**, against a 5pp threshold. The *sign* result
does **not** strengthen: it rests on GLM being significantly negative, and GLM is null on both scales
once order is controlled, so on batch 1 no model is significantly negative and three are significantly
positive. The title's second clause was carried by a single row, and that row does not survive the
correction.

### 3.1a What this section claims, restated

The section's original claim was that the penalty **does not share a sign** — that code mode makes a
run dearer under some providers and cheaper under others. That is what the raw batch-1 table shows, and
it is not what the evidence supports: GLM, the only significantly negative row, is null on both scales
once execution order is controlled (above), and the attempt to reproduce the pattern on a second suite
failed on the pre-registered criterion (§3.8). What **both** suites support, and what this section now
rests on:

1. **The penalty is large, and it is model-specific rather than provider-specific.** Batch 1 spans
   **75.1 points** adjusted (-8.92% to +66.13%) — but **49.1 of those points, 65% of the entire spread,
   sit inside a single provider**: Anthropic's own two models are the two extremes of the range, haiku at
   +66.13% and sonnet at +17.02%. **Provider is not an identified factor in this design** — four of the
   five providers contribute one model each, so "provider-specific" and "model-specific" are the same
   statement there, and on the one provider where they can be separated, the within-provider variation
   is two thirds of the total. Suite 2 spans **28.8 points** on the same six-model basis (-17.0% to
   +11.8%; the four pre-registered providers span 24.0). No single description fits all six models — but
   the honest axis is the model, not the provider.
2. **It is not predicted by the output:input price ratio.** Three models share a ratio of 5.00 and
   disagree by **59.5 of the 75.1 adjusted-log points** — **79.2%** of the whole between-model spread
   sits inside one ratio value; on the additive scale the same three span **49.4 of 69.1**, or
   **71.6%**, against **70.6%** on the raw figures. One ratio, large disagreement. The correction
   strengthens this on the log scale (+8.7pp over raw) and leaves it essentially unchanged on the
   additive one (+1.0pp); both are reported because the scale is not settled (§3.1).
3. **Its sign is neither stable across suites nor robust to execution order.** On batch 1, adjusted,
   no model is significantly negative and three are significantly positive. On suite 2, two are
   significantly negative and none is positive.

**Withdrawn, explicitly:** the reading that the sign disagreement is a stable property of providers.
It was a property of one suite's raw estimates, and on the pre-registered replication criterion the
pattern did not reproduce. A ratio-only account of code mode is not supported either way; what replaces
it is a model-specific effect whose magnitude is large and whose sign is not a property to rely on.
**What this does not disturb:** §3.2-§3.3 (the mechanism), §3.4 (rankings do not transfer), §3.5 (the
one confirmatory win) and §3.6 (per-run cost), none of which rest on the sign.

### 3.2 The mechanism is provider-specific, and it needs a precondition

Retention is the share of a previously cached prefix the provider still serves from cache
(`analysis/prefix-retention.json`, paired by task):

| model | retention PTC | retention native | difference | billed | `cost_cold` |
|---|---|---|---|---|---|
| Qwen3.8-Flash | 0.674 | 0.743 | **-0.0691** | +30.67% | +20.98% |
| GLM-5.3-Flash | 0.994 | 0.993 | +0.0010 | -20.75% | -20.55% |
| gpt-6-luna | 0.997 | 1.000 | -0.0026 | +1.20% | -21.17% |
| DeepSeek V4.1 Flash | 1.000 | 1.000 | -0.0001 | +0.13% | -9.76% |
| Claude Haiku 4.5 | 0.996 | 1.000 | -0.0032 | +53.84% | +18.67% |
| Claude Sonnet 5.5 | 1.000 | 1.000 | +0.0000 | +9.51% | -15.11% |

**The prefix-retention mechanism explains one provider of six.** Qwen is the only model whose cache
is lossy under PTC, and it has the largest positive billed differential. On GLM, luna and DeepSeek the
billed differential moves with `cost_cold` while retention is flat: that is **token volume**, not
caching. On Anthropic the differentials are volume effects with the opposite sign (+18.7% and -15.1%).

**The pairing and the interval, stated because the filed table carries neither.**
`pairByTask` in `tools/prefix-retention.mjs` assigns the last row read to a (task, class) key, so with
two seeds per cell **one seed is silently discarded**, and the filed JSON contains no interval of any
kind. Re-paired with the seeds averaged and bootstrapped over tasks with the same estimator the paper
uses for every cost contrast (`--ci-json`, `analysis/prefix-retention-ci-2026-10-10.json`): Qwen
**-0.0646 [-0.0781, -0.0516]**, haiku **-0.0051 [-0.0087, -0.0021]**, and no other model's interval
excludes zero (GLM +0.0019 [-0.0018, +0.0064], luna +0.0002 [-0.0039, +0.0045], DeepSeek and Sonnet
within ±0.0002). The Qwen effect is unchanged in substance and now carries an interval. Haiku's
retention difference is real but two orders of magnitude too small to account for its **+53.84%** billed
differential, so the Anthropic reading stands: the *sign* of haiku's differential is consistent with a
tiny retention loss, and its *size* is volume. The tool's verdict rule uses an absolute 0.005 dead zone;
the filed last-seed value (-0.0032) sits inside it and the both-seeds value (-0.0051) just outside, which
is one more reason the rule is a reading aid rather than a test.

**One caveat on that one case.** Qwen's cache breakpoint is injected by the gateway on the **last
element of the tool list**, and the tool list is exactly what the presentation treatment changes (24
schemas in native mode, 1 under PTC). On Qwen, therefore, "the cache is lossy" and "the breakpoint
sits on a block the treatment redefines" are **not separated anywhere on disk**, and this section
reports the Qwen row as the mechanism's one supporting case with that identification gap stated. On
the other five models the retention difference is at most 0.003 and the concern does not arise.

**The mechanism test as filed had three predictions, and the logs cannot run two of them.** The plan
(`notes/plans/JOURNAL-PLAN.md` §4) predicted that PTC's per-step prefix grows more monotonically (P1), that
cache-miss tokens concentrate immediately after a tool-shape change (P2), and that the gap scales with
per-task tool diversity (P3). The gateway records each request's token counts and its message and tool
**counts**, not their contents, so P1 is **refuted as stated** - request bodies grow monotonically in
**84.0%** of transitions (mean over runs; both modes append), which is a fact about what is appended,
and what is appended is not logged - and P2 and P3 are **not testable** from this archive (`analysis/prefix-retention.json`,
`notTestable`; `METHODS.md` §7, `notes/records/STEP2-RECONCILIATION.md` §4b). What is measured above is the
consequence of the mechanism, not the mechanism's own three predictions, and the distinction is stated
rather than left to a reader who assumes the filed test ran.

The productive form of this is a **precondition, not a patch**: the prefix effect can only bite where
the cache loses. At retention ~1.000 there is no headroom for a mode effect, so any differential must
come from volume - and it does. This is falsifiable and it was filed in advance: the 2026-10-03
prediction that Anthropic, which also requires declared caching, would look like Qwen is **refuted**
by exactly this table.

### 3.3 Retention on Anthropic: measured for the DSH arms, unmeasurable for the external harnesses

**What is not claimed: any cross-harness retention comparison on Anthropic.** Mean prefix retention of
**0.560** (haiku) and **0.451** (sonnet) has circulated for "the external harnesses"; **that comparison
does not exist in this archive.** `tools/prefix-retention.mjs` classifies
every arm that is not `dsh:ptc` or `dsh:native` as "external" (`armClass`, line 48), so the bucket is
**eight arms - 496 runs, as the shipped JSON itself records - not four**: the four real external
harnesses, whose cache split is `null` in the archive (limitation 7) and which the tool codes as
0.0000, pooled with the four DSH `-opt` and `-terse` arms, which measure a real ~0.994-1.000. Those
figures are exactly that mixture, continuation-weighted: haiku is 4,211 continuations at
0.0000 plus 5,380 at ~0.9977, and sonnet 1,828 at 0.0000 plus 1,505 at ~0.9998. **No external
harness's retention is measured anywhere in this study on this provider.**

**What is measured, and it is worth keeping.** On the DSH arms, retention on Anthropic is
**0.994-1.000** - haiku `ptc` 0.9941 / `native` 0.9996, sonnet 0.9998 / 0.9998, paired by task
(`analysis/prefix-retention.json`). That is DSH's own cache discipline on a provider where the client
must declare boundaries, and it is high.

**What this costs the paper, and what a single-harness pilot recovered.** The cross-harness retention
comparison **on the study's own treatment** is not available: on the OpenAI-compatible path no cache
accounting is archived, so a computed 0 there measures the measurement path (limitation 7; §4), and
that remains an open defect. A ten-cell pilot has since measured **one** of the four external harnesses
on Anthropic's native Messages path, under a different condition - the gateway modifies nothing and the
harness declares its own caching: **opencode's prefix retention over nine tasks is 0.8735 [0.8176,
0.9299]**, wholly below the DSH arms' **0.994-1.000**, so on this provider its retention does not track
the DSH arms' (`analysis/retention-pilot-2026-10-10.json`, `notes/records/RETENTION-PILOT-2026-10-10.md`). Three
things travel with that number: it is **one harness** - cline's CLI rejects an Anthropic base URL
outright ("error: base URL is only supported for OpenAI and OpenAI-compatible providers", both the
pinned and the current version); goose and openhands were out of scope, and a no-spend configuration
review found both *configurable in principle* but unverified — goose carries a first-class Anthropic
Messages provider with an overridable host, openhands routes through the Anthropic handler in its
bundled LiteLLM, and both would meet the same four-block limit if their client declares its own
breakpoints; it is a **different wire
protocol** from the matrices this paper analyses; and it is **descriptive**, nine carried cells of ten,
with no test.

**The pilot also exposed a defect in the study's own Anthropic treatment.** The injected-caching
condition (static system and tool breakpoints plus the top-level field) **cannot coexist** with an SDK
client that already declares its own `cache_control` breakpoints: the total exceeds Anthropic's limit
of four, and the first attempt failed on every real turn with "A maximum of 4 blocks with cache_control
may be provided. Found 5." (30 of 30 non-200 records carried the gateway's own injection deviation).
DSH never surfaced it because DSH declares none, so the gateway's injection was always the only source.
The failed matrix is kept as the record (`results/retentionpilot-haiku-full/`), and the implication is
general: any future Anthropic measurement of a harness that implements prompt caching itself must drop
or cap the injection, or it will measure nothing but 400s.

### 3.4 Harness rankings do not transfer between providers

This section is the pre-registration's exploratory **H5** - "harness cost rankings are not stable across
providers" - which the filing says has **no formal test** and is reported as per-provider rankings with
per-task paired differences. It is exploratory whatever it shows, and what it shows is below.

- **Adjacent rank steps (A8): 40 of 54 pairs are statistically indistinguishable - 74.1%** (33 of 54,
  61.1%, on the tasks-b suite). **Two things qualify that headline.** First, **8 of the 54 pairs are
  priced by a convention this study's own defect record marks
  "do not publish"** - the Anthropic pairs touching an external arm, whose input tokens are unpriced
  (limitation 7) - and excluding them the fraction is **37 of 46, 80.4%** (65.2% on tasks-b). Second, the
  fraction is **not one number but three cells that mean different things**:
  - **within the DSH arms: 18 of 24 = 75.0% on both suites.** Near-trivial - those arms differ by prompt
    treatment, not by harness, so their costs are nearly identical by construction and a tie carries no
    information about harness ranking.
  - **cross-harness (two external arms): 50.0% on both suites.** This is the informative cell, and it
    says **half of the adjacent harness steps cannot be ordered** - a ranking that is not a total order,
    though a weaker statement than the pooled figure implies.
  - **DSH against external: 85.0% here, 50.0% on tasks-b.** The two suites disagree outright on this
    cell, so it should not be pooled.

  The fraction is robust to dropping any model (71.1-80.0%, §3.9). The claim that rankings **transfer**
  is carried by the rank-agreement statistic below, not by this one; the tie fraction establishes only
  that the ordering is partial.
- **Across-model rank agreement (A1b):** median Spearman rho = 0.238, permutation p = 0.0467, and
  the model axis explains 5.7% of rank variance. **This statistic is NOT robust to the population**:
  leave-one-model-out it moves within 0.119-0.262 here, but on tasks-b it ranges from -0.190 (dropping
  GLM) to +0.071 (dropping Qwen, DeepSeek or luna) - it changes sign (§3.9). The tie fraction above
  carries this section's claim; the rho is reported with that caveat rather than as independent support.
- **Arm-versus-arm concordance (A1c):** 62.1%. Split by arm class (A1d): **DSH-only 0.4667** (90
  comparisons — below a coin flip) against **external-only 0.7444** (90). The paper's own presentation
  variants are the arms whose cost order transfers *worst*.
- **The ranking statistics under the position adjustment (sensitivity).** Every statistic in this
  section is computed on raw costs under an execution order that is identical in all six matrices and
  therefore not a randomisation (limitation 8); the same fixed permutation contributes a different
  arm-specific offset in each model, which is a ready-made manufacturer of cross-model rank
  disagreement. That sensitivity is now measured: fit each model's position step function exactly as
  §3.1 does, replace every arm's cost with its position-offset cost, and run the same A8/A1b statistics
  through the same estimators (`tools/ranking-adjusted.mjs`; its raw column reproduces the filed
  numbers exactly, and a test pins them). On batch 1 the tie fraction moves from 74.1% to **75.9%** and
  the median rho is unchanged at **0.238**; on tasks-b the tie fraction moves from 61.1% to **63.0%**
  and the median rho from 0.024 to **-0.071**. The adjustment makes the ordering *more* partial, not
  less, and this section's claim — that adjacent harness steps are largely unorderable — is unchanged
  in size and direction.

  *Figure 3 (`paper/figures/fig3-tie-fraction.tex`): adjacent harness rank steps that are statistically
  indistinguishable (the A8 tie fraction), raw against position-adjusted, on both suites; counts are
  ties out of 54 adjacent pairs.*
- **On Anthropic the ranking is not stable even under our own pricing convention.** The four external
  harnesses' requests there carry no cache split, so their input tokens are unpriced (limitation 7).
  Charged at the miss rate — the bounded upper reading — the cheapest arm on haiku is a DSH arm;
  charged at the hit rate, haiku's cheapest arm is `opencode`, and the mean rank shift across the ten
  arms is **4.2 places**. Sonnet's tasks-b ranking moves less — mean shift **0.00** upper-to-matched,
  **1.00** upper-to-lower, with a DSH arm cheapest under all three readings — but **on batch 1 it
  moves by 2.60 places upper-to-lower**, where the hit-rate reading makes `goose` the cheapest sonnet
  arm at $0.0549 against the cheapest DSH arm's $0.0741 (limitation 7). No external-harness Anthropic
  cost is quoted anywhere in this paper, so nothing above depends on the choice — and the instability
  is further evidence for this section's claim rather than against it.

The practical statement: a harness ranking measured on one provider predicts the next provider's
ranking about three times in five, and on Anthropic it is not even stable under the study's own
pricing of unpriced tokens. This is a negative result about the field's standard practice, and it is
why the paper reports the magnitude of the code-mode penalty and its mechanism rather than a
leaderboard.

### 3.5 The one confirmatory win: tool surface costs requests

H3 (pre-registered, secondary): presenting 24 tool schemas instead of 1 increases the number of model
requests. **Supported: +2.228 requests [+1.228, +3.360], n = 744 cells.** The direction was predicted
from Phase 1 and this is the study's only confirmatory hypothesis that survives on six models.

**It does not survive leave-one-model-out on this suite, and that has to be said plainly.** Dropping
any of the other five models leaves H3 between **2.206 and 2.703**, every interval excluding zero — but
**dropping luna gives +1.010 [-0.081, +2.223]**, an interval that **contains zero** (§3.9). So on the
suite where this paper reports its one confirmatory win, that win is **one model deep** — and the model
is the same one whose cost classification already flips with the arm string (§3.9 A), so the two
fragilities are not independent. On the four pre-registered tasks-b datasets it survives dropping any
single provider (b1 6.379-9.642, n = 480 each), but there its magnitude is **+8.378 [+7.244, +9.606]**
(n = 640) against **+2.228 [+1.228, +3.360]** here.

**Across suites and drops the estimate ranges from 1.010 to 9.642 — nearly an order of magnitude — and
one configuration is null.** The sign replicates; the size does not, and on batch-1 neither does the
significance. H3 should be read as **a direction that replicates**, which is what a pre-registered
directional hypothesis can carry, and not as a magnitude. One further oddity the ablation exposed: batch
1 carries a seventh model label, `glm-5.3`, whose matrix contributes **no H3 rows at all** — dropping it
leaves n at 744 unchanged.

### 3.6 What it costs, per run (gateway-derived; Anthropic is a bracket, not a figure)

| model | log total (USD) | per run (USD) | solved (of collected records) |
|---|---|---|---|
| gpt-6-luna | 3.89 | 0.0063 | 589/620 (95.0%) |
| GLM-5.3-Flash | 4.88 | 0.0079 | 617/620 (99.5%) |
| DeepSeek V4.1 Flash | 4.95 | 0.0080 | 619/620 (99.8%) |
| Qwen3.8-Flash | 12.44 | 0.0201 | 605/621 (97.4%) |
| Claude Sonnet 5.5 | 50.03-79.56 (reconciled) | **0.0807-0.1283** | 618/620 (99.7%) |
| Claude Haiku 4.5 | 64.77-94.30 (reconciled) | **0.1045-0.1521** | 519/620 (83.7%) |

Log totals include preflight and pilot requests, so the cheap four's per-run figures are slight
upper bounds, and their cache splits are recorded normally so the totals are exact.

**Anthropic is different, and the bracket is now computed rather than asserted.** The four external
harnesses reach Anthropic through its OpenAI-compatible endpoint, whose response reports no cache
split, so the gateway logged **6,772 requests carrying 129.3M input tokens whose cache state is not in
the archive** - 6,669 of them inside the two matrices' own runs, the population the panel prices.
`tools/anthropic-cost-bracket.mjs` (filed: `analysis/anthropic-cost-bracket-2026-10-10.json`) prices
each of those at the cache-read rate, at the miss rate, and at the DSH arms' own token-weighted
cache-hit share, and the session ledger then caps the result from outside. The pair's all-miss bound is
**266.87** and the DSH-share point is **252.90** - both larger than the **144.33** the two matrices'
runs actually cost, so both are reported as **refuted as statements about money spent**, not quoted.
What survives is the reconciled bracket **[114.80, 144.33]**, a per-run range of **0.0926-0.1164**
against the 0.1045-0.2312 the defect record first published. The ledger-implied cache-read share of the
unreported input is **0.1942**, against the DSH arms' pooled **0.9292**: on this evidence most of the
external harnesses' unreported input was **not** read from cache, which is the direction the retention
pilot measured directly (\u00a73.3). Tasks-b carries the same defect with no ledger cap in its window
(7,035 requests, 173.6M unreported tokens, pair **[175.68, 408.46]** over 1,600 cells), so no tasks-b
Anthropic cost is quoted. See `notes/defects/DEFECT-anthropic-external-costs.md`, including the correction that this
file's first version of this section was wrong about.

**The check that found all of this:** the shipped panel reports 143.35 for Haiku alone and 266.87
for the two matrices together, which **exceeds the entire session's Anthropic ledger delta of
144.33**. A per-matrix cost that is larger than the money spent is impossible, and no summary would
have shown it. Anthropic is **85% of the study's measured spend** (the 144.33 session ledger against the
cheap four's 26.16) for the same 620 cells per model, which is why the
four cheap matrices carry the design and Anthropic carries the mechanism.

### 3.7 What we do not claim

| hypothesis | result | verdict |
|---|---|---|
| H1 (primary) billed penalty rises with output share | b1 = +0.00467 [-0.00551, +0.01568], n = 186 | **INCONCLUSIVE** |
| H2 terse presentation reduces the PTC penalty | mean(d) = +0.00151 [-0.00010, +0.00354], Wilcoxon p = 0.80 | INCONCLUSIVE |
| H3 more tool schemas, more requests | +2.228 [+1.228, +3.360] | SUPPORTED |
| H4 cache hit rate does not predict arm cost | bC = +0.11157 [+0.06205, +0.17271] | REFUTED (a new finding) |

**H1 moved from REFUTED to INCONCLUSIVE when Anthropic was added.** On the four cheap providers b1 was
negative with an interval excluding zero - the pre-registered definition of refuted. On six it is
positive with an interval containing zero. **Any statement that the price-ratio account is refuted
would now be overstating the data.** It is also population-dependent in sign: leave-one-out, dropping
DeepSeek gives b1 = +0.133, an order of magnitude larger than the pooled estimate and opposite in
sign to the four-provider pooled estimate.
**The filed model itself, `D_ij = b0 + b1*S_ij + u_i + e_ij` with a task random intercept, was fitted
on 2026-10-04 and gives the same b1 = +0.00467 with the task variance estimated at the boundary
(`s_u` = 0, ICC = 0.000), so the verdict does not depend on whether task heterogeneity is modelled.**
See `notes/records/MIXED-EFFECTS-2026-10-04.md` §1.

**The study has two surviving significant contrasts out of a family of 18** (the filed, broad reading:
6 cost contrasts + 12 solve-rate contrasts, Holm at alpha = 0.05). Both are Claude Haiku: the PTC cost
contrast (p = 0.00005) and the PTC-terse solve-rate contrast (p = 0.00014) - so on the **four providers
that carry the replication the batch-1 family has no survivor**. The next two fail for
**different reasons, and on one of them the paper's two inferential machines disagree.** Intervals are
the percentile cluster bootstrap, which is the machine that classifies a contrast throughout this
paper; p-values are sign-flip permutation, which is the machine the Holm family tests. Qwen's cost
contrast (p = 0.0056) is significant unadjusted and is killed only by the multiplicity correction - its
failure is a Holm effect. Sonnet's (p = 0.0512) fails the *uncorrected* test, so Holm never reaches it:
on that one contrast the permutation test and the bootstrap point in opposite directions, and this
paper reports the disagreement rather than resolving it in either direction. It is the same contrast
whose classification the bootstrap moves with B and with scale (§3.1): its adjusted log interval
excludes zero, while the permutation test, the additive scale and the B = 200,000 raw bootstrap all
decline to call it positive. **The narrow, per-block reading of the family is a declared sensitivity,
not a second result**, and it changes one of these verdicts: correcting each block as its own family
gives A2b 2 of 6 (haiku, Qwen) and A4 1 of 12, so **Qwen's cost contrast survives under the narrow
reading** while the filed broad reading leaves it just outside. Both readings are printed by
`tools/panel-analysis.mjs`; the broad one is the filed primary. **The paper does not rest on these
stars.** It rests on the magnitude and model-specificity of the effect (§3.1a) — not on its sign, which
does not survive the execution-order adjustment and did not reproduce on the second suite (§3.8) — on
the mechanism (§3.2-§3.3), the rank-step tie fraction (§3.4), and the one pre-registered confirmatory
direction (§3.5).

### 3.8 The pre-registered replication of the filed (raw) classifications failed

A second suite was collected to test §3.1 rather than extend it, and the test was filed before any of
its data existed. `tasks-b/PLAN.md` section 5 fixes the criterion arithmetically: **R1** - all four
providers' tasks-b classifications equal their batch-1 classifications (Qwen positive, GLM-Flash
negative, luna null, DeepSeek null); **R2** - at least one provider classifies positive *and* at least
one negative on tasks-b, so the sign disagreement itself reproduces. *Replicated* requires R1 4 of 4 and
R2; exactly 3 of 4 is *partially replicated*; anything else is *not replicated*, and the plan forbids
inventing a "with caveats" tier afterwards.

Two properties of the test belong in this paragraph, not in a footnote. **The targets are the raw
classifications.** R1's four targets were filed on 2026-10-03 against the unadjusted batch-1 rows; under
the execution-order adjustment of §3.1, GLM's batch-1 classification is null on both adjusted scales
(-8.9% [-20.0, +1.8] log, -17.3% [-42.5, +0.4] additive), so **no adjusted basis yields a batch-1
negative**, and R2's pattern — a positive *and* a negative — has no instance on batch 1 once the
adjustment is applied. R2 therefore fails on batch 1 itself under either adjusted basis. The test is a
replication of the filed raw classifications, and this section reports it as that: it is not a test of
the adjusted table, and it is not a test of §3.1a's magnitude claim.

The suite is 40 new tasks x 10 arms x 2 seeds = 800 cells per provider on the four cheap providers of
§3.1. Anthropic is excluded by the filing ("No Anthropic"), so haiku and sonnet were collected
afterwards as an extension; they are reported at the end of this section, carry the plan's own per-model
extension verdict, and cannot move R1 or R2.

| provider | batch-1 (filed) | tasks-b | tasks-b 95% CI | R1 |
|---|---|---|---|---|
| Qwen3.8-Flash | positive | **null** | [-3.93, +15.01] | differs |
| GLM-5.3-Flash | negative | **null** | [-21.12, **+0.14**] | differs |
| gpt-6-luna | null | **negative** | [-24.35, -8.55] | differs |
| DeepSeek V4.1 Flash | null | **negative** | [-37.46, -9.38] | differs |

**R1 fails, 0 of 4. R2 fails: not one provider classifies positive on tasks-b. The verdict is NOT
REPLICATED.**

Three things about that verdict matter more than the label.

**It turns on a tenth of a point, so it has to be computed rather than read.** GLM's interval ends at
**+0.14%** at the current B = 200,000 re-filing (+0.0405% at the filed B = 5,000; the classification is
null at either resolution). Every one-decimal rendering of it reads as "negative, excludes zero", and
the rule makes it null. The classification is produced by `tools/replication-verdict.mjs`, which prints
intervals to two decimals and flags any null whose nearest bound is within half a point of zero,
precisely so this cannot be rounded away. **The bound is not one seed's draw, and that was measured**:
re-running the same estimators at 20 explicit seeds at the filed resolution leaves GLM's bound between
**+0.06 and +0.17**, its classification null and **R1 = 0 of 4 on all 20 seeds**
(`tools/verdict-seed-stability.mjs`, `analysis/verdict-seed-stability-2026-10-10.json`). At a tenth of
that resolution the same sweep is not stable, which is why the re-filing matters as much as the rule
does.

**Two providers reversed rather than drifted.** luna and DeepSeek move from "null, centred on zero" to
"significantly negative" with intervals **disjoint** from their batch-1 intervals. Qwen lost its
positive result without reversing (the intervals overlap on [+10.0, +15.0]), and GLM's intervals overlap
in both directions. A reversal with disjoint intervals is a fact about the two suites; this paper does
not offer a cause.

**R1 compares classifications, not estimates, and that is not the same test.** A provider scores as
failing whenever its class changes, however close the two estimates are. Comparing the two suites
directly, on the same basis and with the execution-order adjustment applied to both, and printing the
additive scale beside the log one because the study's rule is that neither is *the* adjusted number:

| provider | scale | batch-1, adjusted | tasks-b, adjusted | gap | intervals |
|---|---|---|---|---|---|
| gpt-6-luna | log | +6.7% [-6.5, +23.0] | -16.2% [-24.9, -7.1] | 22.8pp | disjoint by **0.6pp** |
| DeepSeek V4.1 Flash | log | -0.8% [-10.0, +9.6] | -17.0% [-23.2, -10.8] | 16.3pp | disjoint by **0.7pp** |
| Qwen3.8-Flash | log | +35.3% [+15.6, +58.3] | +7.0% [-2.5, +16.9] | 28.4pp | overlap |
| GLM-5.3-Flash | log | -8.9% [-20.0, +1.8] | -6.2% [-14.9, +3.1] | **2.7pp** | overlap |
| gpt-6-luna | additive | +2.4% [-9.9, +16.0] | -16.7% [-26.0, -8.5] | 19.1pp | overlap 1.4pp |
| DeepSeek V4.1 Flash | additive | +0.3% [-11.4, +11.6] | -23.5% [-37.8, -11.0] | 23.8pp | overlap 0.4pp |
| Qwen3.8-Flash | additive | +32.4% [+12.9, +54.8] | +5.8% [-4.5, +16.1] | 26.6pp | overlap |
| GLM-5.3-Flash | additive | -17.3% [-42.5, +0.4] | -8.8% [-21.2, +2.3] | 8.5pp | overlap |

**The count of divergences is convention-dependent, and no count is robust.** On the primary pair
(`dsh:ptc` against `dsh:native`) exactly two of the four intervals separate, both on the log scale, by
0.6 and 0.7 of a point; on the additive scale all four overlap. The variant arm pair (`dsh:ptc-opt`
against `dsh:native-opt`, §3.9 A) is the like-for-like arm-string check, and on it **none of the four
separates**: DeepSeek's two variant intervals overlap by 13.4pp, luna's by 15.1pp, and the only provider
whose variant intervals separate is Qwen, by 0.3pp — the provider this section counts as an overlap. **A
variant-pair interval on tasks-b compared against a primary-pair interval on batch-1 is not like for
like**; compared like for like, DeepSeek's divergence is arm-dependent too. The honest counts are
therefore: two knife-edge separations on the primary pair under
the log adjustment, two under the raw basis (luna by 0.1pp, DeepSeek by 0.5pp), zero on the additive
scale, and at most one on the variant pair. **No provider's divergence survives all three conventions.**
Qwen and GLM do not separate under any of them, and GLM's two suites agree to **2.7 percentage points**
on the log scale (-8.9% against -6.2%, same sign, both null). GLM is scored as a failure because its
batch-1 interval sat entirely below zero while its tasks-b interval crosses it: a change in where an
endpoint falls, not in what was measured. This paper therefore states the result as **the pre-registered
classification pattern did not reproduce**, not as four providers disagreeing — the second over-reads
the first by a factor of two. It does not soften the verdict: R1 needs 4 of 4 and holds for 0 of 4 on
every basis, and R2 fails because no basis produces a positive on tasks-b. The rule is applied as filed,
because post-hoc softening is what a pre-registration forbids; the decomposition is reported so a
reader can see what the rule counted.

*Figure 2 (`paper/figures/fig2-replication.tex`): tasks-b against batch 1 for the four pre-registered
providers, both execution-order adjusted on the log scale. luna's and DeepSeek's intervals are disjoint
from their batch-1 intervals; GLM's two suites agree to 2.7 points and both are null.*

**And the confound is not the cause.** If execution order explained the failure, adjusting both suites
would close the gaps. It does not: the mean absolute gap moves from 18.8pp raw to 17.5pp on the log
adjustment and 19.5pp on the additive one, and the number of separated discrepancies is 2 of 4 raw,
2 of 4 adjusted-log, and 0 of 4 adjusted-additive. GLM's gap collapses on the log scale, luna's and
Qwen's widen, and DeepSeek's narrows. The failure is not an artefact of order, and correcting for order
does not repair it.

**The verdict does not depend on the position question of §3.1.** Applying the execution-order
adjustment (above) to both suites gives R1 = 0, 1, 1 of 4 under the three consistent readings (raw;
adjusted, log and additive), and R2 fails on all three, because no basis produces a positive
classification on tasks-b. The one provider that would match on an adjusted reading is GLM.

Two secondary readings are reported with it. The **pre-registered family is m = 12** (4 cost + 8
solve-rate contrasts over the four providers) - the four-provider restriction of the **m = 18** family
the filed batchb artifact computes over all six; the two readings agree on the survivors, so the
extension does not move the family result - and **2 of 12 survive Holm** at alpha = 0.05: DeepSeek
(p = 0.0001) and luna (p = 0.0003), both cost contrasts, the eight solve-rate contrasts contributing
none. The **H1 slope re-fit** on the four, with the filed model spec, is
b1 = **-0.0125 [-0.0203, -0.0050]**, negative with the interval excluding zero, which matches the
plan's replication read even though H1's own filed hypothesis (b1 > 0) is refuted on tasks-b and
inconclusive on batch 1 (§3.7).

**The Anthropic extension, with the plan's own quality guard.** The plan (Amendment 1 §9.1, ratified
2026-10-05 before any tasks-b run record existed) files a mechanical extension verdict: a row's tasks-b
classification matches its filed batch-1 classification, or it is *extension row not replicated*,
naming the model. Applied per model by the same tool, **haiku positive to null and sonnet positive to
null: both extension rows are not replicated.** Both tasks-b rows are null: haiku **+6.2% [-7.35,
+19.67]** over 18 paired tasks, sonnet **-0.5% [-7.92, +5.98]** over 40. One caveat belongs with the
second row rather than hidden behind the rule: the batch-1 targets were filed at B = 5,000, and at the
re-filed B = 200,000 the
Sonnet batch-1 interval itself contains zero (+9.5% [-0.08, +18.01]), so under the corrected record the
rule would read *null to null* and call that row replicated. Both readings are printed by
`tools/replication-verdict.mjs`, and both are reported; the filed target governs, because it is what
was filed before the data existed, and a null matching a null is not evidence that a positive result
reproduced.

The haiku row cannot be read on its per-cell contrast alone, and the plan said so in advance:
`tasks-b/PLAN.md` §7 (MEASURED 2026-10-05, before the full matrix ran) — *"the cost contrast must be
reported beside cost per solved task, and the per-cell figure (PTC 17% dearer) is not the headline -
$0.3109 against $0.5921 per solved task is."* The full matrix reproduces the confound. On the 36
surviving (task, seed) cells per arm, `dsh:native` solves **26/36 (72.2%)** against `dsh:ptc`'s
**17/36 (47.2%)**; per cell the arms differ by **+6.2%** ($0.2851 against $0.3028 — the number the
extension row reports), and per **solved task** by **+62.4%** ($0.3948 against $0.6412). Paired over
the full 40-task design, with the outage-culled cells counted as unsolved, 10 pairs are solved by
native alone and 1 by ptc alone (exact McNemar p = **0.0117**). The study applies this guard elsewhere
(FINDINGS F48 reports "zero discordant pairs, exact McNemar p = 1, so no quality confound is
possible"); here it changes the size of the reading by an order of magnitude.

The haiku row also stands on **18 of 40 tasks**. The Anthropic account hit its monthly limit mid-matrix
and refused every request thereafter: 447 of the 800 records are exclusion-class (312 text-classified,
135 all-4xx; 357 carry exit code 1), and the 18 surviving tasks are whichever ran before the outage —
not a random subset. The re-run is parked by the author's decision (HANDOVER-2026-10-09 §4), so the row
is descriptive: it cannot move R1/R2, and at 18 of 40 tasks it cannot carry a headline either. The
sonnet row ran at the full 40 tasks and 800 cells with no exclusions.

| extension arm | cells | solved | per cell | per solved task |
|---|---|---|---|---|
| haiku `dsh:native` | 36 | 26 (72.2%) | $0.2851 | $0.3948 |
| haiku `dsh:ptc` | 36 | 17 (47.2%) | $0.3028 | **$0.6412** |
| sonnet `dsh:native` | 80 | 78 (97.5%) | $0.1363 | $0.1398 |
| sonnet `dsh:ptc` | 80 | 77 (96.3%) | $0.1356 | $0.1409 |

The honest summary, stated plainly: the batch-1 result is a result about batch 1, and the one attempt
to reproduce it on new tasks did not reproduce it. The failure is measured against the **raw**
classifications that were filed: under the adjusted bases R2's pattern is absent from batch 1 itself, no
provider's divergence survives a change of scale or of arm string, and on the additive scale every
discrepancy overlaps. What survives both suites is the **magnitude and model-specificity** of the effect
and the **ratio** result — that models sharing a ratio disagree by more than the ratio gap. What does
not survive is the *sign* reading: §3.1a restates the section accordingly. The restated magnitude claim
is not what R1/R2 test, and it does not reproduce at batch-1's scale either — the six-model
adjusted-log spread is **28.8 points** on tasks-b against **75.1** on batch 1 — so this section does not
claim that the restated claim is what the replication passed.

---

### 3.9 Ablations: what each claim rests on

Four restrictions, each reproducible with `node tools/ablations.mjs`, and each answering a question a
reviewer is entitled to ask. **Nothing here recomputes a filed rule**: the ranking ablations are
*readings* of the filed panel (`A1b.correlations`, `A8.details`), the differentials use the same
estimators A2 uses, and the H3 leave-one-out runs the filed tool (`tools/hypotheses.mjs`) on restricted
dataset selections rather than reimplementing its model.

**A. Is the penalty a property of code mode, or of one arm string?** The headline contrast is one pair,
`dsh:ptc` vs `dsh:native`. A second pair carries the same manipulation with different prompt suffixes,
`dsh:ptc-opt` vs `dsh:native-opt`. On tasks-b the *sign* agrees for all six models — DeepSeek -19.4%,
GLM -7.0%, Qwen +3.9%, haiku +10.2%, Sonnet +1.4%, luna -8.8% — and the *significance* does not for one:
**luna is -16.6% [-24.3, -8.5] on the primary pair and -8.8% [-21.3, +1.9] on the variant, i.e. negative
by one arm choice and null by the other.** On batch-1 the two pairs differ in magnitude and occasionally
in sign (haiku +53.8% against +79.0%, GLM -20.8% against -12.7%, DeepSeek +0.1% against -10.1%).

**B. Does any claim rest on one of the two seeds?** On tasks-b the two negatives hold on both seeds,
and **GLM is negative on seed 1 (-19.7% [-39.9, -2.6]) and null on seed 2 (-21.7% [-58.6, +5.1])**. On
batch-1 the picture is sharper than it was, because the estimator fix of §3.1 removed Sonnet from the
positive set: the raw table has **two** positives, and one of them **rests on a single seed** — **Qwen
+37.4% [+18.7, +57.3] on seed 1 against +24.0% [-3.5, +58.3] (null) on seed 2** — while **haiku is
positive on both** (+42.9% [+22.6, +63.5], +65.3% [+35.7, +95.4]). Sonnet is the third case and the
worst one: null across both seeds, positive on seed 2 alone (+10.9% [+0.1, +20.2]) and null on seed 1
(+8.2% [-3.9, +19.2]), so its sign moves with the seed, with the position scale (§3.1) and with the
bootstrap's resolution. §3.1a declines to lean on per-model significance; this is the measurement
behind that refusal, and it is the strongest argument for the section's surviving claims being about
*spread* rather than about any row.

**C. Is the ranking result carried by one model, or by the external arms?** The adjacent-step tie
fraction — the statistic §3.4 actually rests on — is robust to dropping any model: **71.1-80.0%** on
batch-1 and **57.8-64.4%** on tasks-b. The **median Spearman rho is not robust the same way**: on tasks-b
it ranges from **-0.190** (dropping GLM) to **+0.071** (dropping Qwen, DeepSeek or luna), i.e. it changes
sign with the population. §3.4 quotes the median rho as supporting evidence, so it is now reported with
that caveat, and **the tie fraction carries the claim**. Two further facts the section did not report:
the two suites disagree (74.1% batch-1, 61.1% tasks-b), and the tie fraction is far higher *within* the
DSH arms — **85.7% batch-1, 100% tasks-b** — than across the external harnesses (50% on both). Where the
arms differ only in presentation, adjacent cost steps are essentially unorderable.

**D. Is the one confirmatory win carried by one model?** On tasks-b, no — H3 survives
leave-one-provider-out on all four pre-registered datasets (b1 **6.379-9.642**, n = 480, every interval
excluding zero). **On batch-1, the suite §3.5 actually reports it on, yes**: dropping any of the other
five models leaves b1 between **2.206 and 2.703**, but **dropping luna gives +1.010 [-0.081, +2.223]
and the interval contains zero**. That is the same luna whose cost classification flips with the arm
string (A), so the two fragilities reinforce each other rather than being independent. Across suites and
drops the estimate runs **1.010 to 9.642** — the sign replicates, the magnitude does not, and one
configuration is null. Two incidental findings the drops expose: batch 1 contains a seventh model label, **`glm-5.3`, that contributes no H3
rows** (dropping it leaves n = 744 unchanged), and a model drop is a group of datasets here — GLM is
four matrices across two labels, so a single-id drop would have left three quarters of GLM in sample
(`modelDrops`, and the tool refuses a drop naming a dataset outside the selection).

**What the ablations establish.** §3.1a's preference for the spread over per-model significance has a
measurement behind it (A, B); §3.4 rests on the tie fraction, not on the median rho alone (C); and
§3.8's decomposition contains **no divergence robust to scale or arm string**. On the like-for-like
variant pair **no**
provider's intervals separate — DeepSeek's tasks-b variant, -19.4% [-29.7, -10.4], overlaps its batch-1
variant, -10.1% [-23.7, +1.4], by 13.4pp, and luna's tasks-b variant, -8.8% [-21.3, +1.9], overlaps its
batch-1 variant by 15.1pp — while on the primary pair the two separations §3.8 reports are knife-edge
(0.6pp and 0.7pp on the log adjustment, 0.1pp and 0.5pp on the raw basis) and vanish entirely on the
additive scale. The only provider whose *variant* intervals separate is Qwen, at 0.3pp, and Qwen is
scored as an overlap. The honest count is therefore **zero robust divergences, two fragile
classifications, and the verdict unchanged** — which makes the replication failure even more a story
about classifications near zero than about providers moving apart.

---

## 4. Related work

**Cost is already a first-class axis of agent evaluation — under one price schedule at a time.** A line
of work argues that agent benchmarks must report dollars and not only accuracy: Kapoor et al.
(arXiv:2407.01502) show accuracy-only evaluation produces needlessly costly agents and mistaken
attributions; Erol et al. (arXiv:2504.13359) formalise cost-of-pass as per-attempt cost divided by
success probability; Agentless and AutoCodeRover report cost per resolved issue beside resolution rate;
TheAgentCompany defines an explicit cost-per-instance metric that, tellingly, *assumes no prompt
caching*; the Holistic Agent Leaderboard logs per-task cost across 21,730 rollouts; and Efficient
Agents decomposes framework design into a cost-of-pass on GAIA. Production telemetry underwrites the
stakes: agentic coding consumes roughly 1000x more tokens than code chat; token usage is "highly
variable and inherently stochastic", with runs on the same task differing by up to 30x in total tokens,
and per-model efficiency differing by over 1.5 million tokens on the same tasks (Bai et al.,
arXiv:2604.22750); and gateway-scale studies document the shift of paid traffic toward agentic
workloads. **Every one of these results is produced under a single
provider's price card.** None asks whether the ranking survives a change of pricing.

**Rankings of LLM systems are fragile almost everywhere they have been audited.** The same model swings
widely on SWE-bench Lite by changing scaffold alone; undisclosed private variant testing distorts the
most-cited public leaderboard; 61 models x 24 benchmarks produce mutually contradictory rankings under
direct evaluation; and code benchmarks reshuffle under semantic-preserving mutation. The most proximal
cluster studies the *harness* explicitly: the Scaffold Effect paper finds harness choice induces up to
40x differences in tokens per solved task at pass-rate gaps of only 0–8 points (arXiv:2607.22585); Han
and Sun fit interaction models to the Terminal-Bench 2.0 leaderboard and find harness x model
interaction effects comparable to the main effects; Zhang et al. measure harness-induced variance at
7.8x model variance with 6-of-9 model-pair ranking reversals, and conclude that harness-blind
comparisons are "incomplete and potentially misleading". One result cuts the other way: across 33
scaffolds, rank-order prediction remains stable under scaffold shift even when absolute scores do not
(arXiv:2603.23749). All of this varies the model or the scaffold and reads out accuracy. **The transfer
question is open precisely on the cost axis**, where the outcome is dollars and the manipulated
variable is the provider's price structure.

**The nearest prior art already measures per-harness cost and per-harness cache — on one pricing
regime, which is the gap we occupy.** Claw-SWE-Bench **v1** (Zheng et al., arXiv:2606.12344v1) reports
per-harness billed dollar costs taken from provider billing logs *and* per-harness cache hit rates, and
concludes that "accuracy ranking, however, is not cost ranking"; its v2 rebuilds cost from harness
token counts and fixed price tables instead, so only v1 measures billed cost. LiteLLM's Terminal-Bench
auto-router benchmark publishes per-arm cache hit rates computed from gateway spend logs, where the
cheapest arm (Haiku-4.5 only, $0.61 per solved task) carries a 93% hit rate — the joint-highest in the
table, tied with the Sonnet-5-only arm — while the router arms sit lower at 78–83%. Lumer et al. (arXiv:2601.06007) state the provider split behind caching in nearly our words and
measure 41–80% cost reductions across 500+ agent sessions; production traces quantify per-turn hit
rates with model switches and compaction as invalidators. Concurrent work bills three production
harnesses from their own token counts under one vendor's list and cross-reprices them under a
second: the order is preserved under pure repricing, while the cost ratio between two harnesses
flips across models - the reorder is driven by the model's step profile, not the price list (Liu &
Han, arXiv:2610.04433). **We therefore do not claim to have
discovered that harnesses differ in cost, that cache accounting matters, or that gateway measurement is
possible: all three are published.** What this paper adds on that axis is the *cross-provider transfer
statistic under a changed price schedule*, a pre-registered attempt to reproduce it (§3.8), and per-run
attribution of provider-reported per-request accounting through a gateway credential.

**Tool-interface design is known to matter — on selection accuracy, not on request economics.**
Retrieval over tool catalogs has been standard since ToolLLM, and that presented-tool count degrades
behaviour is asserted by vendors, quantified on internal MCP evaluations, confirmed in distractor-tool
stress tests that collapse selection accuracy from 43% to 14% without retrieval, and named as the top
bottleneck in trajectory analyses of 300+ interdependent tools. One controlled study pushes back:
across 1–128 equipped tools, Toolshed (ICAART 2025) finds accuracy flat at 97–100%, attributing the
null to its tools being non-overlapping. The nearest controlled neighbor on our own factor sweeps
presented tool pools of 4–24 and finds model-dependent selection-accuracy degradation with linear
prompt growth (Zappia et al., Electronics 15(14):3175) - accuracy and latency outcomes, never
request count or cost. SWE-agent's ACI study established interface design as an
experimental factor for success rate, and mini-SWE-agent shows a one-tool harness competitive on
SWE-bench Verified. **What none of these measures is the variable that costs money: the number of model
requests a run makes.** Our H3 is a within-harness manipulation of presented-tool count with request
count as the outcome, on two providers, and it is the study's one confirmatory win
(+2.228 requests [+1.228, +3.360], n = 744).

**Code-mode tool calling carries vendor-scale token claims and one academic crossover — none of it
priced across providers.** CodeAct established executable code as an action space. Anthropic reports a
98.7% token reduction in a worked example and −38% billed input on a 75-tool agent — alongside a ~8%
cost *increase* on sequential single-call traffic, a vendor-documented sign reversal attributed to
workload. Cloudflare puts schema-presentation load at 1.17M tokens for a full API, cut ~99.9% by Code
Mode. The strongest academic comparison finds a token crossover at fan-out N ≈ 26, below which
code-mode is *more* expensive, and reports output tokens equal across paradigms in its echo-stub
setting (arXiv:2608.06370); a five-interface study places programmatic calling between typed calls and
bash on quality and tokens (arXiv:2609.11999). The closest prior account of our mechanism is Yang
et al. (arXiv:2607.10569): restricting two coding agents to a single code-execution tool holds
pass rates within three points across four regime x agent cells while costs swing 20–40%, and on
the cell matching our setting - Claude on SWE-bench modification tasks - output tokens rise +40%
(p < 1e-9), attributed there to edit friction and priced from rate cards rather than a billing
gateway. **This study does not measure a paradigm-level output-token effect**, and it does not claim
one: the six-model panel carries no per-arm output-token measurement at all, and the archived
two-provider phase that does points the *other* way on the paradigm contrast — `dsh:ptc` 12,763
against `dsh:native` 15,084 mean output tokens (FINDINGS F13, filed PENDING and absent from the
shipped artifact), while its 1.8x is DSH-versus-OpenCode, a between-harness difference. What this
paper claims about output length is the narrower, tested statement of §3.7: it is a harness property
whose price the provider sets, and the filed test of that account (H1) is **INCONCLUSIVE**. E-Bench
(arXiv:2607.23722) reports the uniform-sign result on synthetic product-state tasks: code
execution cuts measured API cost for all eleven models tested (tool calls −73.8%, turns −33.6%),
priced per model including a cached-input rate - a single sign on a task family where calls
consolidate mechanically, against provider-specific signs on real coding tasks, which is the
task-family dependence §3.1a states. The closest prior art to a cost decomposition *by direction* is
Strands' CodeAct agent, which reports 78% fewer input tokens against 67% fewer output tokens on the
Data Agent Benchmark: output shrinks less than input, so the output share rises as the code-mode design
gets cheaper - one benchmark, one provider, no price structure applied, but the one published
decomposition whose direction bears on the output-share account. **None of this work varies the
output:input price ratio, and none decomposes billed cost into request count and output volume.** The equal-output finding is synthetic and
single-turn, and whether real multi-step coding reverses it is a question this study **cannot settle**
from its own data: the panel records no per-arm output tokens, and the one filed contrast that would
speak to it, H1, is **INCONCLUSIVE** (§3.7). The tension is stated here rather than resolved.

**Output length is a recognised confound everywhere except where it bills.** LLM judges favour longer
answers; debiasing for length materially changes leaderboard agreement; reasoning models overthink
trivial problems; and prompt-level token budgets compress reasoning at small accuracy cost. This
literature treats output length as a model or decoding property to be controlled. **We treat it as a
*harness* property** — a function of presentation and tool ergonomics — and **test** whether it is the
term whose price the provider sets (H1; the test is inconclusive, §3.7).

**Prompt caching is documented as mechanics and as practice, and almost unmeasured as a per-harness
variable.** The invalidation hierarchy makes tool-schema edits cache-destroying by design; cached state
is machine-local; practitioners elevate hit rate to the top production metric and prescribe
cache-fraction dashboards; and serving research built the reuse machinery. What is missing is the link
from per-harness cache *discipline* to the billed-cost *ranking* — and §3.3 adds a sharper version of
the question: on a provider that requires the client to declare cache boundaries, the regime measured
is a property of the **client's protocol path**, so a 0% hit rate there can measure the measurement
path rather than the harness. The boundary itself is vendor-documented - Anthropic's
OpenAI-compatibility layer states that prompt caching is not supported, that unsupported fields
are silently ignored, and that `usage.prompt_tokens_details` is always empty - and it was observed
in the wild before this study, including in one of our four external harnesses (cline issue
#13667: zero cache tokens on every request through OpenAI-compatible paths; a hermes-agent issue:
0% cache hits on the OpenAI-compatible wire against a 95.9% cache-read share once markers flow on
the native one). On the automatic-caching side, harness-dependent cache regimes deciding cost are
now published: identical runs on open-weight models show the endpoint serving 92–98% of two
harnesses' input from cache against 2–11% of a third's, the cache accounting for about ninefold of
the gap (Ariño de la Rubia & Pafka, arXiv:2609.33812). The nearest preregistered precedent is
Weinberger and Hozez (arXiv:2608.01347): their post-registration extension holds model, prompts,
evaluators and statistics fixed while swapping the harness and reports that automatic provider-side
prefix caching removes about 61% of the would-be bill with behavioural metrics unchanged, that hits
are probabilistic under identical conditions, and that one model-route pair received zero cached
tokens in every phase - a provider-side anomaly that persisted for three days and would silently
distort any cost comparison that ignored it. Industry gateway telemetry links per-harness hit rates to
per-call cost at scale - twelve months of Requesty data across nine coding agents, with platform-wide
hits rising from 52% to 86% - but it is observational, with no controlled toggle. And an independent
CLI benchmark names one of this study's own external arms: AIMultiple reports that "Junie, Goose, Kiro,
Forge, and Aider don't cache" while six other agents cache 86-98% of their input. Our identification
is, to our knowledge, the first controlled, gateway-measured one across harnesses - and the boundary is
Anthropic's first-party compatibility layer specifically: OpenRouter's OpenAI-shaped route forwards
`cache_control` and returns a split.

**Methodology.** Our statistical posture follows the experiment-analysis literature and the measured
nondeterminism of nominally deterministic serving, including run-to-run pass@1 spreads of 2.2–6.0
points over 60,000 agent trajectories at temperature 0 (Bjarnason et al., arXiv:2602.07150);
standardised-conditions evaluation is the HELM legacy; and a 254-submission audit shows SWE-bench's
top entries are statistically inseparable while within-model scaffold ranges reach 29.8 points
(arXiv:2609.17394) — the accuracy-side antecedent of our rank-tie result. Two things here are
uncommon in this literature, and one deficiency that earlier drafts reported as unrepairable — now
measured below. The uncommon thing is a
**pre-registered replication reported when it failed** (§3.8): failed replications of LLM evaluation
claims have been published and celebrated (Schaeffer et al., arXiv:2304.15004; Mirzadeh et al.,
arXiv:2410.05229), and exploratory cross-scaffold replications with nulls exist (Xu & Wu,
arXiv:2607.28871) — but we know of no published pre-registered replication of an agent-evaluation
claim on a second task suite, reported as a result when it failed.

**The noise floor that was missing is now measured — and it is wider than the two figures this study
published before.** The intended A/A pair was not a placebo: its two starter requests differ by **30 and
20 bytes** of arm-id text, which may be enough to move a cache hit, so the arms are distinguishable and
the pair cannot serve as a control (and for 12 of the 62 PTC pairs the literal first-request claim does
not hold either). The figures built on it — 46.2%, then 7.7% — are **withdrawn**
(`notes/records/STEP2-RECONCILIATION.md` §7.6; FINDINGS F29). A corrected A/A was then run, pre-declared before
collection (`notes/plans/AA-PLACEBO-PLAN.md`): a **repeated baseline of one arm**, `dsh:native`, 31 tasks x 2 seeds
x 2 passes = 124 cells on DeepSeek, 0 exclusions, both passes 62/62 solved. Two differently-named arms
cannot be byte-identical under this runner, so the pair is one arm collected twice, and the identity is
verified rather than assumed: the **main request body is byte-identical in 62 of 62 pairs and the
auxiliary request in 62 of 62** — the only difference is which of DSH's two independent calls reaches
the log first. The result (`analysis/aa-placebo-2026-10-10.json`): the two identical treatments differ
by **-5.75%** of per-cell cost on average, 95% CI **[-15.6%, +3.4%]** — indistinguishable from zero, as
an A/A must be — with an interval half-width of **9.5% of per-cell cost** at 31 paired tasks (sd of
per-task differences 26.8%). That half-width is the floor a two-arm contrast can resolve at this
sample size, and it is **wider than the withdrawn 7.7%**, which is part of why that figure looked
plausible for as long as it did. It is also the same order as the two small effects this paper reports
— Sonnet's raw +9.51% and GLM's adjusted -8.92% — so neither can be resolved above the floor, and
they are reported as such. The nearest external anchor is still Hu et al. (arXiv:2609.30725), per-cell
cost CVs of 2.4-8.4% over three runs of unchanged configurations; the A/A design has an
agent-evaluation precedent in accuracy units (Kaliyev & Maryanskyy, arXiv:2606.20695), and this study
now supplies one on the cost axis.

*Figure 4 (`paper/figures/fig4-floor-resolution.tex`): the six execution-order-adjusted differentials
against the measured A/A floor (shaded band, ±9.5% of per-cell cost), with each model's raw estimate as
a second marker because the two effects the paper calls small sit on different bases — GLM's adjusted
-8.9% is inside the floor, Sonnet's raw +9.5% sits on its edge. Three of the six adjusted estimates lie
inside the band.*

Run-count guidance exists for accuracy outcomes (rarely more
than three repeats on QA benchmarks, Blackwell et al., arXiv:2410.03492; a 30-trial score-powered
benchmark, arXiv:2512.07795) but not for cost — a 2026 systematic survey finds 0 of 17 prominent agent
benchmarks report a complete standardized run-cost record (Nageshwaran et al., DOI
10.1007/s10462-026-11678-4) — so the absence of an external check on how many seeds a cost comparison
needs is a gap in the literature and, here, an unquantified risk.

**Routing prices the model choice, not the harness ranking.** Cascades and routers exploit provider
price heterogeneity per query, with dedicated benchmark infrastructure (RouteLLM, FrugalGPT, Hybrid
LLM); routing itself is now evaluated on agentic traffic rather than one-shot prompts - TwinRouterBench
scores routers on 970 router-visible prefixes drawn from 520 instances and, in its dynamic track,
measures official task resolution against realized API spend on a 100-case held-out SWE-bench Verified
slice (arXiv:2605.18859). On agentic coding traffic the savings collapse relative to short-answer
benchmarks, and session
affinity is documented as necessary to preserve prompt caches across routing decisions. Provider choice
is thus already understood as a cost variable. **What has not been shown is that it reorders the
harnesses.**

**Novelty statement, and what is not novel.** We claim the intersection, not the territory. Explicitly
*not* novel, and cited above: per-harness cost measurement at a gateway; per-harness cache hit rates;
the fragility of agent rankings under scaffold change; tool-count effects on selection accuracy;
terseness effects on cost and length; model-level price-reversal phenomena (Chen et al.,
arXiv:2603.23971); and accuracy-side rank-tie statistics. What we have not found prior art for:

1. whether a **billed-cost ranking** of coding-agent harnesses **transfers across providers whose
   output:input price ratios differ**. The ratio is a property of the six provider cells the study
   chose — **read off, not manipulated** — and it is confounded with the model and with each
   provider's cache-discount depth, which is why the paper reports the ratio result as a description
   of these cells rather than as an experimental effect. Concurrent work reprices three harnesses'
   token bills under two vendors' price lists and finds the order preserved under the swap (Liu & Han,
   arXiv:2610.04433); that swaps two whole schedules rather than varying the ratio across cells, and
   tests no ranking-transfer statistic;
2. a **pre-registered replication** of such a claim on a second task suite, reported as a result when it
   **failed**;
3. the decomposition of billed cost into **request count and output volume within one harness**, with
   provider-reported per-request cache accounting **attributed to the run** across two wire protocols;
4. the identification of a **cache regime that is a property of the client's protocol path** rather than
   of the harness — and the resulting measurement artefact (§3.3, limitation 7); the boundary is
   vendor-documented and was observed anecdotally in issue trackers before this study, but we know
   of no controlled, gateway-measured identification across harnesses.

Where prior work contradicts us at the mechanism level, the contradiction is stated here rather than
left implicit: Toolshed's flat accuracy across 1–128 equipped tools; the crossover study's equal output
tokens; the input-dominance finding in agentic coding; and the scaffold-stability result that cuts
against any broad reading of §3.4. Of these, only the output-token tension bears on a claim this paper
makes, and that claim is the narrow one stated above.

*Full annotated entries, including identifiers, venues and the sources that could not be verified, are
in `notes/literature/RELATED-WORK.md` and `notes/literature/LITERATURE-2.md`, and the verification pass that closed them is
`notes/literature/LITERATURE-3.md` (2026-10-09): both previously unreadable items are now read — a 4–24 tool-pool
ablation with accuracy and latency outcomes (Zappia et al., cited above) and a harness-engineering
survey that argues harness-over-model, the opposite of what our notes said — the venues previously
confirmed only through citing papers are now confirmed on primary sources (RouteLLM ICLR 2025;
FrugalGPT TMLR 2024; Hybrid LLM ICLR 2024; Terminal-Bench ICLR 2026; Prompt Cache MLSys 2024;
LongLLMLingua is ACL 2024 main track, not Findings; CacheBlend is EuroSys 2025, not ACM TOCS), and
the forward-citation pass surfaced the concurrent work and the noise-floor counterpart cited above.
Venues not confirmed on a primary source are left unasserted.*

---

## 5. Limitations, written before a reviewer writes them

1. **The population is six models, and part of the published record is unreproducible.** On
   2026-10-02 the entire `results/` tree was destroyed - 24 matrices, ~5,900 run records, ~102,000
   gateway records. F31, F34 and F35 in their seven-model form cannot be recomputed by anyone; their
   only witness is two committed JSON files. F38 and F42 cannot be recomputed at all.
   `artifact/MANIFEST.json` names each one and why. Every number in this paper is from the six
   matrices that ship.
2. **Configuration asymmetry.** We did not develop DSH and are unaffiliated with it, but we authored
   its study conditions and work in it daily. `METHODS.md` says plainly that this is a real asymmetry
   and is not eliminated. The mitigations are the hold-out suite, the filed pre-registration, driving
   every harness unmodified, and this artifact.
3. **Test editing is possible on the batch-1 suite.** `tasks/<task>/task.json` grades with the suite
   as the agent left it, so weakening an assertion reads as a solve. Measured incidence: luna 81/620
   (13.1%), Haiku 5, GLM 2, Qwen 1, Sonnet 0. **DeepSeek is not measured on the record** — the
   `fixture` field is absent on all 620 of its records — and one retroactive scan of a non-random
   62-workdir survivor sample (10% of the cells) found **0/62**; it is reported as *not measured*,
   never as 0% (`PRE-REGISTRATION.md` §12.8; `_ev/ds-test-edit-scan.md`). The rule was pre-declared
   before its effect was computed (`PRE-REGISTRATION.md` §12.8): report as measured, exclude nothing,
   restore nothing, and publish two sensitivities beside every solve rate. The realistic one moves
   luna by **0.4 pp** (95.0% to 94.6%); the worst case, in which every edited run was solved only by
   the edit, is 82.3%. Suite 2 grades against hidden cases, so the confound cannot move a hidden score
   by construction — and the canary the plan ordered for exactly that claim, the per-arm
   `fixture.gradedOnEditedTests` flag, is now reported: recorded incidence on tasks-b is **luna 455/800
   (56.9%)**, Qwen 33.2%, DeepSeek 30.9%, Sonnet 22.6%, GLM 20.6%, Haiku 2.9%, with the full per-arm
   table in `analysis/test-edit-incidence-2026-10-10.json` (`tools/test-edit-incidence.mjs`). Two
   consequences: luna's 13.1% batch-1 rate is **not a propensity ceiling** — the same model touches
   the visible tests in 56.9% of tasks-b runs, where it buys nothing — and the one surviving solve-rate
   contrast that editing could touch, Haiku's PTC-terse contrast, is immune, because its single
   in-arms edited run is already scored unsolved.
4. **Two task suites, one graded behind a hidden suite.** 31 tasks is at the floor the standing
   checklist sets, and suite 1 is the recorded first referee objection. A second, independent suite
   (`tasks-b/`, 40 tasks) is **complete and validates 40/40**; it grades against hidden cases
   throughout, so the test-editing confound of limitation 3 cannot exist there by construction. Its
   analysis was pre-registered before collection (`tasks-b/PLAN.md` §5, filed before any tasks-b run
   record existed); 800 cells per provider were collected on the four cheap providers, plus the two
   Anthropic extension rows, and the pre-registered verdict is §3.8's result: **NOT REPLICATED**
   (R1 0 of 4, R2 fails). The suite's collection dates, and the degenerate shuffle it inherited, are
   limitation 8.
5. **Six runs contradict their own output** (`testPassed = true`, `solved = false`; five timed out and one
   exited 1) and
   are scored unsolved. The `solved` rule was not changed, because changing it mid-study alters the
   treatment; they are disclosed instead.
6. **The Anthropic condition is static breakpoints plus the top-level cache field**, chosen by a
   measured A/B after the alternative was shown to manufacture the effect it reported, and pinned by
   a test. It applies only on the Anthropic path, so no other matrix changed. **The "same treatment"
   is in fact four cache regimes**, and the paper states them rather than implying one: DeepSeek and
   GLM run with **no cache breakpoints at all** (the provider caches automatically); Qwen runs with a
   **gateway-injected breakpoint on the last tool**; luna runs on `/v1/responses`, a path the
   injection code never touches, so its configured static breakpoints are **inert**; and Anthropic runs
   **static breakpoints plus the top-level field**. Each regime is a fixed property of the client path
   (`tools/collect-gateway.mjs`), not of the arm, and limitation 7's Anthropic defect is the one that
   removes the cache split from the record.
7. **A cost defect is open, and it is bounded rather than solved.** For 6,772 external-harness
   requests on Anthropic the archive does not record the cache split, and two tools default it in
   opposite directions: the shipped panel charges those 129.3M input tokens at the miss rate (an
   upper bound, and one the session ledger refutes), while `costOf` prices them at zero (a lower
   bound). Anthropic cost per run is therefore reported here as a bracket, no external-harness
   Anthropic cost is quoted at all, and every differential, H1-H3 and retention result is unaffected
   because those use DSH arms or request bodies. A fix that carries both bounds beside a point estimate
   **was implemented test-first on 2026-10-10** (`tools/anthropic-cost-bracket.mjs`, 10 tests;
   `analysis/anthropic-cost-bracket-2026-10-10.json`): the batch-1 pair's reconciled bracket is
   **[114.80, 144.33]**, with the DSH-share point (252.90) and the all-miss bound (266.87) reported as
   **refuted by the ledger**, and the residual risk stated rather than hidden — `costOf` still prices an
   unreported input at zero silently for any caller that reaches for it directly, which is not closed
   because closing it would regenerate the frozen 2026-10-03 scope. A portability defect the
   retention pilot exposed belongs here too: **the injected-caching condition cannot coexist with a
   harness that declares its own `cache_control` breakpoints** — the total exceeds Anthropic's limit of
   four and the request is refused outright (§3.3). Injection is safe only where the client declares
   none.

   **The consequence for the ranking was measured on 2026-10-09, on the tasks-b extension alone,
   and the suite matters.** Re-pricing the same runs and the same tokens three ways — every unpriced
   token at the miss rate (what the shipped panel charges), at the hit rate, and at the DSH arms' own
   observed hit rate for that model — the cheapest arm on tasks-b **sonnet is a DSH arm under all three
   readings**, with a mean rank shift of **0.00 upper-to-matched but 1.00 upper-to-lower**; on tasks-b
   **haiku it changes** the cheapest arm from `dsh:ptc-terse` ($0.099) to `opencode` ($0.064 at the
   hit-rate reading), a mean rank shift of **4.2 places upper-to-lower**. **On batch 1 the sonnet
   immunity does not hold**: re-priced at the hit rate, batch-1 sonnet's cheapest arm is `goose` at
   **$0.0549** against the cheapest DSH arm's **$0.0741** — 26% cheaper — and the mean rank shift is
   **2.60 upper-to-lower** (0.40 upper-to-matched). Both suites are stated because they disagree. The
   confound affects no claim this paper makes, because no external-harness Anthropic cost is quoted
   anywhere.
8. **The arm order is not a randomisation, and it carries cost.** Within each (task, seed) block the
   ten arms are assigned slots by a seeded shuffle whose seed was a function of `(task, seed)` only —
   not of the model or the matrix — so **all six matrices drew the same permutation** and none had an
   independent randomisation. **Fixed forward only, 2026-10-09:** the seed is now
   `matrix | task | seed` and the rule lives in `tools/arm-order.mjs`, where a test holds it to that.
   Every matrix analysed in this paper predates the fix and keeps its recorded assignment — re-shuffling
   data that exists would be rewriting evidence — so the limitation stands for everything reported here. Measured on the shipped data: `dsh:ptc` reaches the first slot in
   **2 of 62** blocks, and within a single arm cost varies by **1.75x to 3.82x** across slots, with
   the first slot cheapest in five of six models.

   **The replication suite inherits this defect, and it was collected with the defect already on the
   record.** The degeneracy was documented on **2026-10-04** (`notes/defects/DEFECT-position-confound-2026-10-04.md`,
   commit `4be6f8a`); the tasks-b matrices ran from **2026-10-05T19:58Z to 2026-10-09T04:23Z**, and the
   matrix term was not added to the shuffle seed until `1d814ea` (**2026-10-09 13:52 +0200**), about
   seven hours after the last record. So the replication suite's arm order is the *same shared
   permutation* as batch 1's — not an independent randomisation — and §3.8's verdict, and the
   position-adjusted decomposition on both scales, are computed under it.

   *A standardisation that circulated for this record — "roughly halves every differential", haiku
   +53.84% to +25.41% — is withdrawn and none of its figures are used: its estimator passed both arms'
   records to the function meant to summarise one arm, so it was a position-frequency ratio rather than
   a correction (`notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md`).*

   **What stands.** Two legitimate corrections now exist and they agree on the additive scale: the
   slot fixed-effect regression (`notes/records/MIXED-EFFECTS-2026-10-04.md` §2, haiku **+52.97%**) and a paired
   estimator of the within-block difference that keeps the task pairing (`tools/position-adjust.mjs`,
   haiku **+51.79%** on the additive scale), against raw +53.84% and the withdrawn +25.41%. For haiku
   the correction is small. It is not small everywhere: the paired estimator moves GLM from -20.75%
   to -8.92% (log) or -17.27% (additive), and it moves Qwen *up*, from +30.67% to +35.35%.

   **The correction assumes one position effect for both arms, and that assumption was probed as far as
   this design allows.** The paired estimator fits a single step function shared by `ptc` and
   `native`; the arm-specific form `d = alpha + g(p_ptc) - h(p_native)` is *estimable* here — 19
   parameters on 62 blocks, full rank in all twelve model x suite fits — but not *usable*: the standard
   error on alpha runs **0.145 to 0.710 log units** and the point estimates swing by up to **70
   points**, including sign flips (Qwen's +35.35% becomes -34.66% on batch 1; GLM's -8.92% becomes
   +38.53%). On tasks-b, **two of six are marginally identified** (Sonnet's SE 0.145, DeepSeek's 0.174),
   and there the swing is 8.3pp and 15.9pp — about **half to one SE**, in opposite directions by model,
   which is what noise looks like rather than an arm-specific step. So the honest statement is not that
   the assumption cannot be checked at all, but that **the design cannot decide it and can only show how
   little it can say**: even in the best-identified rows the arm-specific estimates are uncertain by
   about as much as the differentials they would report (`tools/common-f-check.mjs`,
   `analysis/common-f-infeasibility-2026-10-10.json`). The paper reports the common-`f` form and says
   the alternative is a different, less certain model rather than a robustness check.

   **The scale is a real choice and it is not settled.** Judged by held-out prediction of the same
   quantity in the same units, the multiplicative (log) scale wins **9 of 12** model x suite
   comparisons by up to 1.8x, and every comparison the additive scale wins is marginal (<=4%
   relative error): batch 1 is 3-3, suite 2 is 6-0 for log. Both are reported in §3.1 and neither is
   crowned. Where they disagree about a *classification* is two rows, and both are load-bearing for
   §3.1's title: **GLM is significantly negative as filed and null on both scales**, and **Sonnet is
   positive on the log scale and null on the additive one**. The ratio result strengthens on the log
   scale (+8.7pp over the raw figures) and is flat on the additive one (+1.0pp); the sign result does
   not survive.

   H3 is unaffected (it counts requests, not cost), as are retention and the Anthropic bracket. Full
   records: `notes/defects/DEFECT-position-confound-2026-10-04.md`,
   `notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md`, `notes/records/MIXED-EFFECTS-2026-10-04.md` §2.
9. **The study now has a measured noise floor, and it is wider than the figures it once published.**
   The intended A/A pair was not a placebo — its two starter requests differed by **30 and 20 bytes** of
   arm-id text — so the two figures built on it, **46.2%** and then **7.7%**, are **withdrawn**
   (`notes/records/STEP2-RECONCILIATION.md` §7.6; FINDINGS F29; §4 above). A corrected A/A was then pre-declared
   (`notes/plans/AA-PLACEBO-PLAN.md`, filed before collection) and run: a **repeated baseline of one arm**,
   `dsh:native`, 31 tasks x 2 seeds x 2 passes = **124 cells** on DeepSeek, **0 exclusions**, 62/62
   solved in each pass. Two differently-named arms cannot be byte-identical under this runner, so the
   pair is one arm collected twice; the AA mode makes the workdir a deterministic function of (harness,
   task, seed) with no arm id, matrix id or random suffix, and the identity is verified rather than
   assumed — the **main request body is byte-identical in 62 of 62 pairs and the auxiliary request in
   62 of 62**. The two identical treatments differ by **-5.75%** of per-cell cost on average, 95% CI
   **[-15.6%, +3.4%]** — containing zero, as an A/A must — and the interval's half-width is **9.5% of
   per-cell cost** at 31 paired tasks (sd of per-task differences 26.8%). **That 9.5% is the floor this
   design can resolve**, and it is the benchmark against which the paper's small effects should be
   read: Sonnet's raw +9.51% and GLM's adjusted -8.92% sit at the floor and are not resolved above it.
   The run cost **$1.19** by the gateway's own price card ($1.72 by the provider ledger; the residual
   is reported rather than reconciled). The nearest external anchor remains Hu et al.
   (arXiv:2609.30725) — per-cell cost CVs of **2.4–8.4%** over three runs of unchanged configurations —
   and the withdrawn 7.7% sat inside that range and inside this study's own floor.

## 6. Statistical and pre-registration status

- The pre-registration was amended 23 times and its freeze is nominal. `PRE-REGISTRATION.md` says so
  itself, and the paper must too: v1-v3 each named a freeze commit that did not contain them; v4
  tagged a text it then edited after the tag.
- **The Holm family has two memberships, and the paper uses both.** The *rule* - every secondary and
  pairwise contrast reported together, corrected across the family - was filed on **2026-10-03**, when
  the family was **m = 12** (4 cost contrasts + 8 solve-rate contrasts; `notes/records/STEP2-RECONCILIATION.md`
  §5.1, `tasks-b/PLAN.md` §4). The six-model family of **m = 18** was first computed and committed on
  **2026-10-04**, after the Anthropic pair was collected, and it is the reading §3.7 and §3.1a report
  for batch 1; §3.8's tasks-b verdict is reported on the **filed m = 12**. The growth from 12 to 18 is
  disclosed here rather than left in the artefact: "the family was fixed in advance" is true of the
  rule, and of the tasks-b family's membership, but not of the six-model family's size.
- **H3's correction status is read into the filing, not granted by it.** `PRE-REGISTRATION.md` §6
  exempts by name only H1 and H2 from the Holm correction; H3 is filed "CONFIRMATORY, SECONDARY"
  (`PRE-REGISTRATION.md` §H3) and is computed by a different tool, so it sits in no family and §3.5
  reports it uncorrected. This is not load-bearing - H3's p is about 3e-5 and it survives any family
  this study could construct - but the hook exists, and no amendment repairs it.
- The test-editing rule was committed (`b9cbe19`) **before** its sensitivity was computed
  (`662033e`, 126 seconds later). The commit *order* is the demonstrable part and is all that is
  claimed here; the stronger framing that the sensitivity's test was written first and watched fail
  has no git witness.
- Retractions stay visible: the retracted placebo verdict and the corrected F31/F34/F35/F37 figures
  are named in `notes/records/FINDINGS.md` and `notes/reviews/REVIEW-RESPONSE.md` rather than quietly replaced.

