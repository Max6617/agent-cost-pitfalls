# PRE-REGISTRATION — Phase 2

**Version 4.0.** Supersedes v1.0 (too vague), v2.0 (no formulas, listed an unresolvable factor as a
design factor), and v3.0 (claimed a freeze commit that did not contain its own text).

## Freeze status — read this before trusting anything below

**This document has never been honestly frozen, and the honest thing is to say so.**

| claimed | reality |
|---|---|
| v1.0 "frozen at `3beb636`" | `git show 3beb636:PRE-REGISTRATION.md` does not contain v1.0 |
| v2.0 "frozen at `060ca03`" | that commit contains v1.0, not v2.0 |
| v3.0 "frozen at `060ca03`" | same file, four commits later |

Each revision named a freeze commit that did not contain it. An external review found this; it is the
one property a pre-registration cannot lose, and it was lost.

**v4.0 is frozen at the git tag `prereg-v4`.** Verify it with:

    git show prereg-v4:PRE-REGISTRATION.md

The tag is the freeze. There is no self-referential hash and no commit reference that can drift. **The
paper must cite the tag and the date, and must report that v1-v3 were not properly frozen.**

## What Phase 2 data existed when this version was written

v4.0 was written on **2026-09-30**, after collection had begun. That is not a pre-registration in the
strict sense for the runs listed below, and **H1 and H2 are reported as PARTIALLY CONFIRMATORY**:
their predictions were stated in earlier versions, but the analysis they are tested by is specified
here for the first time and the earlier versions were defective (see §12).

| dataset | runs | tasks | arms | seeds | status |
|---|---|---|---|---|---|
| DeepSeek full matrix | 176 valid of 434 | 13 | 7 | 2 | **258 runs lost to credit exhaustion** |
| DeepSeek 15-task sweep | 150 | 15 | 5 | 2 | complete |
| GLM-5.3-Flash | 310 | 31 | 5 | 2 | complete |
| GLM-5.3 | 69 valid of 75 | 15 | 5 | 1 | 6 runs lost to credit exhaustion |
| GLM-5.3-Flash terseness | in progress | 31 | 2 | 2 | the arms H2 needs |
| **Anthropic pilot** | 6 | 1 | 6 | 1 | **third provider, 6/6 solved** |
| **Anthropic hard probe** | 6 | 1 | 6 | 1 | 0 solved |
| hard-task checks | 14 x 2 | 2 | 7 | 2 | difficulty calibration |

**Two providers ran out of credit mid-matrix** (GLM-5.3 and DeepSeek). The rule requiring credit
verification before a matrix starts was written into v3.0 §9 and then broken. All affected runs are
infrastructure failures and are excluded by §9, not counted as model failures.

**This section records what data exists so a reader can judge how blind this document is. It does not
report findings** — those live in `notes/records/FINDINGS.md`.

**Phase 2, bound by this document:** all further runs. Hypotheses marked CONFIRMATORY are stated with
a direction, a formula and a numeric decision rule, and are reported as pre-registered. Hypotheses
marked EXPLORATORY are informed by Phase 1 and are labelled as such whatever they show.

## 2. Research question

When coding-agent harnesses solve the same task with the same model, what determines the cost — and
why does the ranking change with the provider?

## 3. Definitions, fixed before collection

**Unit of analysis:** one run. **Blocking factor:** task.

**Aggregation rule.** Per-run values are averaged over seeds within each (task, arm, cell), giving one
number per cell per task. Medians are a sensitivity check; if the two disagree on significance, the
mean is primary and the disagreement is reported.

**cost_billed** for a run = sum over its requests of
`fresh x missRate + created x writeRate + hit x hitRate + output x outRate`, using the provider
published card, with cache writes priced separately where the provider charges for them.
**cost_cold** prices every input token at the miss rate and is invariant to cache state.

**Output share** S = (output tokens x outRate) / cost_billed, per run.

**Failed runs** are excluded only by §9 and are always counted. The primary analysis is repeated with
excluded runs imputed at their arm median, as a sensitivity check.

## 4. Hypotheses

### H1 — CONFIRMATORY, PRIMARY

**The billed-cost penalty of code-mode presentation increases with output share of cost.**

    D_ij = cost_billed(ptc)_ij - cost_billed(native)_ij        (mean over seeds)
    S_ij = output share, averaged over the two arms
    MODEL:  D_ij = b0 + b1 * S_ij + u_i + e_ij        u_i ~ N(0, s_u^2)
    i indexes task (random intercept), j indexes provider x model cell

**H1: b1 > 0.**

**Decision rule.** Supported if **b1 > 0 and the bootstrap 95% CI for b1 excludes 0**. Refuted if
**b1 <= 0 with a CI excluding 0**. Otherwise inconclusive, and reported as inconclusive.

**Pre-specified secondary.** The penalty at ratio 5.0 must exceed the penalty at ratio 3.33 by **more
than 5 percentage points** for the price-ratio account to count as supported. A smaller gap is
reported as no detectable ratio effect, even if b1 > 0.

**Informed by Phase 1: YES.** H1 is not a blind prediction and this document does not pretend it is.
The direction was chosen because two providers with near-identical price ratios (3.14 and 3.33) differ
sharply in PTC-versus-native cost, which a ratio-only account cannot explain. That observation is what
makes output share the predictor.

The magnitudes, the datasets they come from, and the excluded figures are in `notes/records/FINDINGS.md` (F3, F7).
They are deliberately not reproduced here.

### H2 — CONFIRMATORY, CAUSAL

**Reducing output volume reduces the PTC penalty.**

    P_i(default) = cost(ptc) - cost(native)
    P_i(terse)   = cost(ptc-terse) - cost(native-terse)
    d_i = P_i(terse) - P_i(default)               (mean over seeds)

**H2: mean(d) < 0.**

**Decision rule.** Supported if the **exact one-sided Wilcoxon signed-rank test gives p < 0.05 AND the
bootstrap 95% CI for mean(d) lies entirely below 0**. Refuted if the CI lies entirely above 0.
Otherwise inconclusive.

This is the only *manipulated* test of the mechanism. H1 is correlational by construction; H2 is why
it is worth running.

**Informed by Phase 1: NO.** These arms have never been run. This is the study's only genuinely blind
prediction.

### H3 — CONFIRMATORY, SECONDARY

**Presenting more tool schemas increases the number of model requests.**

    MODEL:  steps_ij = b0 + b1 * native_ij + u_i + e_ij
    native_ij = 1 when the run used 24 tool schemas, 0 when it used 1

**H3: b1 > 0.** Decision: the CI for b1 excludes 0.

**Informed by Phase 1: YES.** The effect has already been observed on two providers across several
hundred runs. Magnitudes are in `notes/records/FINDINGS.md` (F12).

**Tension declared in advance.** Anthropic documents a tool-selection *accuracy* degradation threshold
at **30-50 tools**, above our 24. If H3 holds at 24, the paper must argue the threshold concerns
selection accuracy while ours is request count — or report the tension unresolved.

### H4 — CONFIRMATORY, NEGATIVE

**Cache hit rate does not predict per-arm cost differences.**

    cacheHitRate is entered as a covariate in the H1 model, alongside S_ij

**H4: its coefficient is 0.** Supported if the **CI for the cache coefficient contains 0**; refuted if
it excludes 0, which would be a new finding rather than a failure.

**Informed by Phase 1: YES.** Three independent Phase 1 observations point the same way. Numbers are
in `notes/records/FINDINGS.md` (F2, F4); they are not reproduced here.

### H5 — EXPLORATORY

**Harness cost rankings are not stable across providers.**

**No formal test.** Reported as a per-provider rank table with per-task paired differences. Two
providers cannot establish this and it is not a primary hypothesis. Labelled exploratory whatever it
shows.

## 5. Design

| factor | levels | status |
|---|---|---|
| presentation | native, PTC | **core** — H1, H3 |
| terseness | default, terse | **core** — H2 |
| provider x model | DeepSeek V4.1 Flash (4.00), Qwen3.8-Flash (3.13), GLM-5.3 (3.14), GLM-5.3-Flash (3.33), Claude Haiku 4.5 (5.0), Claude Sonnet 5.5 (5.0), gpt-6-luna (5.0), gpt-6.1-sol (5.0) | variable |

**Correction, 2026-10-01.** DeepSeek was entered as ratio **2.0** from a third-party blog. The
provider's own captured pricing page, which was in `_ev/` before this document was written, gives
**4.00**. The frozen design is not edited; this note records the error and `notes/reviews/REVIEW-RESPONSE.md` §2.2
records what it cost. The ratio axis is 3.13–5.00 rather than 2.0–5.0, and DeepSeek is not the
low-ratio anchor the H1 direction was reasoned from.
| harness | DSH, OpenCode, plus any validated before Phase 2 | variable |
| policy | shipped, optimized | **EXPLORATORY, not a factor** |
| task | 31 existing (batch 1); up to 24 harder (batch 2) | variable |

**The policy arms are not a hypothesis.** Phase 1 measured `native-opt` against `ptc-opt` at a **0.8%**
effect needing **6,257 task blocks** for 80% power. They are retained for continuity, reported in a
separate subsection, and are **not** a tested contrast. v1.0 listed policy as a factor, contradicting
our own findings.

**Cell sizes.** Primary cells are the **31 batch-1 tasks**, giving **n = 31 task blocks** per contrast
once DeepSeek is completed (§7). The pre-analysis fallback set is the **15 tasks all three existing
datasets share**, which is enough for the harness contrast (9 blocks needed) but not for the PTC
contrast (22 needed) — hence completing DeepSeek rather than analysing the fallback.
Seeds: **2 where budget allows, 1 otherwise**, recorded per cell and entered as a covariate if they
vary. Minimum for a provider to enter the primary analysis: **30 tasks, 1 seed, both presentation
arms**. Below that, a provider is reported descriptively and excluded from H1.

## 6. Multiple comparisons

H1 and H2 are each a **single pre-specified test** and are not corrected. All secondary and pairwise
contrasts receive **Holm-Bonferroni** correction across the family reported together.

## 7. Stopping rules

**Fixed sample, no optional stopping.** No peeking. Runs per cell are fixed before the cell opens.

**Mandatory before H1 (§1).** DeepSeek V4.1 Flash runs on the **16 tasks it does not yet cover**, to
reach 31 tasks x 5 arms x 2 seeds — 160 runs, about **$1.10**. H1 pairs tasks across providers, so an
unbalanced provider silently drops tasks from every cross-provider contrast. This is not droppable
under the cost cap below.

**Cost cap $300** — the maximum, not the target; $200 is the working figure. If a projection exceeds
the cap, cells are dropped in this **pre-declared order**:

1. capability tier (Claude Sonnet 5.5, gpt-6.1-sol)
2. seed 2
3. providers with the fewest completed cells

**Cells bearing on H1 or H2 are never dropped.** If the cap cannot cover H1 or H2 in full, the study
stops and reports what exists rather than running a partial primary test.

If a provider budget is exhausted mid-matrix the affected cells are reported **incomplete** and that
provider is excluded from contrasts. They are **never topped up selectively**.

## 8. What would change our conclusions

Stated in advance so a null result is informative rather than disappointing.

| observation | conclusion |
|---|---|
| H1 supported and H2 supported | mechanism is output share of cost, causally supported |
| H1 supported, H2 refuted | relationship real but not output-driven; mechanism unresolved |
| H1 refuted (b1 <= 0) | no price-ratio account; code-mode is provider-dependently better or worse |
| ratio-5.0 gap below 5pp | no detectable ratio effect, reported even if b1 > 0 |
| H4 refuted | the cache matters at deeper discounts — a new finding, not a failure |
| H3 fails at 24 schemas | the request-count effect does not generalise below Anthropic threshold |

## 9. Exclusions

Declared before collection, and **never applied for a run result**:

- a run whose harness made **zero gateway requests** (the measurement failed, whatever the exit code);
- a run where the harness **failed to launch** (exit code and no request);
- **a run that failed on provider quota, rate limit, or any infrastructure error**, identified from the
  harness's own error text and the gateway status code. **A non-zero exit is not evidence until its
  cause is known.** This rule exists because it was broken: six GLM-5.3 runs failed on
  `1113 Insufficient balance` and were briefly written up as a result — that a stronger model
  underperforms a weaker one — before the error text was read. The claim was retracted.
  **Credit balance must be verified before a matrix starts**, and a matrix that exhausts credit
  mid-run is reported **partially complete**, never as a set of model failures;
- **Aider is excluded** from the harness comparison, reported as a finding: it is a pair programmer
  requiring files added to context, not an autonomous discovery agent.

Every exclusion is counted in a flow table.

## 10. Binding note on prior work by the authors

Two Phase 1 claims were **retracted** before this document was written, and any reader who finds them
unmentioned elsewhere should trust nothing else in the paper. They are recorded in full in
`notes/records/FINDINGS.md` (F4) and must appear in the paper's own limitations section.

In one line: a claimed ~10-point cache advantage turned out to rest on **one 30-line task repeated
three times**, and a claimed cost mechanism turned out to be an **accounting identity**.

Neither is carried forward as a hypothesis here.

## 11. Known threats, declared in advance

- **Pei et al. conclude that INPUT tokens drive cost**, where H1 and H2 say output share does. A direct
  contradiction, addressed in the threats section rather than avoided.
- **Singh et al. state our ratio mechanism as an untested assumption** in their limitations. Cited as
  the origin of the question.
- **Artificial Analysis, the canonical cost-per-task leaderboard, blends the provider dimension away**
  using a median price and an assumed 7:2:1 token mix. The field standard practice removes our
  question, which is context for why it has not been asked.
- **Author familiarity.** The authors did not develop DSH and are unaffiliated with it, but authored
  its conditions and use it as their working environment. Mitigated by hold-out tasks, a pre-specified
  contrast and unmodified harnesses. Not eliminated.

## 12. Amendments, and two defects found in this document's own machinery

v3.0 carried an empty amendment log while asserting no Phase 2 data had been collected. **That was
false** — collection began 2026-09-29T20:03Z and the document was edited at 20:04Z and 20:26Z. The log
is below, in full, because a pre-registration that hides its own amendments is worse than none.

| # | date | change | why |
|---|---|---|---|
| 1 | 09-29 | Header, §1, §12 rewritten | v1-v3 each named a freeze commit that did not contain them |
| 2 | 09-29 | Policy arms demoted from design factor to exploratory | our own data: 0.8% effect, 6,257 blocks for 80% power |
| 3 | 09-29 | Phase-1 inventory corrected | v2.0 claimed DeepSeek had 31 tasks; it had 15 |
| 4 | 09-29 | F14 retracted | six GLM-5.3 "failures" were `1113 Insufficient balance`, not model failures |
| 5 | 09-29 | §9 extended to provider-quota and infrastructure failures | consequence of (4) |
| 6 | 09-30 | **Price card corrected** | see §12.1 |
| 7 | 09-30 | **Cost function defect corrected** | see §12.2 |
| 8 | 09-30 | H1 recorded as contradicted in direction | consequence of (6) |
| 9 | 09-30 | Anthropic, Qwen and OpenAI added as providers | keys obtained; the document said "none" |
| 10 | 09-30 | Terseness arms recorded as RUN, not "never run" | they were running while v3.0 claimed otherwise |
| 11 | 09-30 | Hard-task batch recorded | 24 tasks, built after v3.0 |

### 12.1 The price card was wrong, and the error inverted H1

Until 2026-09-30 the gateway priced `deepseek-flash` as miss 0.14 / hit 0.028 / out 0.28, taken from a
**third-party blog**. The repository held the **provider's own page** at `_ev/deepseek-pricing.html`,
captured 2026-09-28, stating off-peak **hit 0.003 / miss 0.15 / out 0.60**. The card was wrong in every
cell: cache-hit **9.3x too high**, output **2.1x too low**.

**Consequence:** DeepSeek's output:input ratio is **4.00, not 2.00**, and its cache discount is **50x,
not 5x**. DeepSeek therefore has the **highest** output ratio in the study, not the lowest. The
ordering H1 rests on inverts.

**All archived `cost.billedUsd` values were computed with the wrong card and are not rewritten.** The raw
logs stay as recorded; `tools/rederive.mjs` recomputes any figure from the archived token counts, which
were always correct. **The instrument was right; only the card was wrong.**

**Still unverified:** there is **no capture of the z.ai price card anywhere in the repository**, and the
GLM rates decide the headline. Peak/off-peak is also a **2x uncontrolled variable** that no document
records or stratifies; published DeepSeek rates halve outside 01:00-04:00 and 06:00-10:00 UTC Mon-Fri.

### 12.2 The analysis tool did not implement the function defined above

§3 defines `cost_billed = fresh*miss + created*write + hit*hit + output*out`.
`tools/analyze-results.mjs` computed

    billedUsd += (miss/1e6)*pr.miss + (hit/1e6)*pr.hit        // NO output term, NO write rate

**The tool omitted the output term**, so every figure derived from it — including the paper's
"the ranking inverts" headline in `notes/records/FIRST-RESULTS.md` — is an *input-only* cost. Under the function
actually defined above, **OpenCode is the cheapest arm on all four datasets under both metrics**, and
that headline is false.

**Analyses in this document are to be run with `tools/rederive.mjs`, not `analyze-results.mjs`,** until
the latter is fixed and its output re-validated against the archive.



### 12.3 Amendments 12-17, added 2026-10-01

| # | date | change | why |
|---|---|---|---|
| 12 | 10-01 | **Terseness manipulation recorded as NOT APPLIED on four matrices** | 124 of `ds-full`'s records and all terse rows in three hard-task matrices carry `terse:false`. The runner dropped `promptSuffix` from its arm list until commit `9b03ad8`. See `notes/reviews/REVIEW-RESPONSE.md` §2.5 |
| 13 | 10-01 | **`ds-full`'s terse arms reclassified as a placebo** | consequence of (12). They become finding F29, the design's measured noise floor |
| 14 | 10-01 | **Rule 9 generalised to every named infrastructure fault** | the rule matched a bare "quota" while 111 luna runs died on HTTP 404. `tools/exclusions.mjs` is now the single definition |
| 15 | 10-01 | **Re-run cells: averaged, never selected** | `glm53` 6, `haiku-full` 34. See §12.4 |
| 16 | 10-01 | **luna's 111 infrastructure-failed runs retried** | consequence of (14). F28's "real capability difference" is retracted |
| 17 | 10-01 | **Anthropic caching A/B run as its own labelled condition** | `notes/plans/PLANNED-cache-ab.md`; three conditions, only the request field differs |

### 12.4 How repeated observations of one cell are handled — declared before the analysis

Two matrices contain cells with more than one run record. **They are averaged, not selected.** The full
reasoning and the demonstration that it changes no headline number are in `notes/records/FINDINGS.md` F36; the
short version is that both available selection rules are indefensible — keeping the first record
discards a real observation, keeping the last replaces a failure with a success whenever the re-run was
prompted *by* the failure, which for the `haiku-full` resume at 00:42Z is exactly what happened.

**This is not a licence to re-run cells.** Selective topping-up remains forbidden. Averaging stops the
*analysis* from laundering a re-run; it does not make the re-run sound, and the 34 contested
`haiku-full` cells are disclosed here rather than quietly averaged. `tools/coverage.mjs` flags every
re-run record and `tools/cost-panel.mjs` prints `CONTESTED=n` per matrix, so this cannot become
invisible again.

### 12.5 The Anthropic cache conditions, declared before the experiment was run

An external review found that this gateway injects `cache_control` breakpoints into every Anthropic
request, that the injection was never disclosed as a condition, and that it moves billed cost by a
factor of several. Both are correct. Every Anthropic number in this repository before 2026-10-01,
including all of F19, F25 and F27, is the **static-breakpoints** condition, and none of it was
collected under the harness's own behaviour.

The condition is now explicit, recorded per request as a deviation in the gateway log, and reported by
`GET /__stats` alongside the enforced model, so a run's treatment is recoverable from the archive
rather than from remembering which command line started it:

| condition | flag | what is sent |
|---|---|---|
| **none** | `--no-cache-breakpoints` | nothing — the harness's raw behaviour |
| **static** | *(default)* | `cache_control` on the system block and the last tool; a fixed prefix |
| **auto** | `--auto-cache` | static **plus** the top-level field that carries the breakpoint forward |

**No primary hypothesis is attached to this experiment.** It is confirmatory for nothing, because it
was proposed after F31 and after the matrices ran; the prediction in `notes/plans/PLANNED-cache-ab.md` (hit rate
13% → 80-90%, cost down ~5x) was written before it was run but by the same session that designed it.
It is reported as **exploratory**, and its result — whichever way it goes — cannot upgrade H1 or H2.

### 12.6 H5 gains a test, and keeps its status

H5 ("harness cost rankings are not stable across providers") was filed **exploratory** with **no formal
test**, on the stated grounds that "two providers cannot establish this". Seven matrices now exist and
the test is computable: median Spearman ρ = 0.286, permutation p = 0.012, and only 63.6% of
arm-versus-arm comparisons keep their winner on a second provider (54.0% among the DSH arms alone).
(Figures as of this writing; `node tools/panel-analysis.mjs` and `analysis/panel-analysis.json` are
the version of record, and the third decimal moves as the last matrix completes.)

**H5 is not promoted.** It was filed without a test; running one afterwards and then labelling it
confirmatory is the precise manoeuvre this document exists to prevent. It is reported as
**exploratory with a test**, and the reason the test was withheld is stated alongside it.


### 12.7 The v4 freeze was broken the same way v1-v3 were, and is repaired here

notes/reviews/CRITICAL-REVIEW.md §A1 found that v1, v2 and v3 each named a freeze commit that did not contain
them. **v4 repeated it.** Tag prereg-v4 holds a **320-line** PRE-REGISTRATION.md; the working copy
has **389**, and the frozen design table was **edited in place** — DeepSeek's ratio "2.0" → "4.00" —
eleven lines below a note saying the frozen design is not edited.

| # | date | change | why |
|---|---|---|---|
| 18 | 10-01 | **§5's design table corrected in the frozen text** | the DeepSeek card was wrong; the correction should have been a dated note, not an edit |
| 19 | 10-01 | **§12.3-12.6 appended after the freeze** | the day's amendments, including F39 itself |
| 20 | 10-01 | **§12.7 added; tag prereg-v5 created** | this section |

**What is actually true, stated plainly.** This document has now been amended after collection began,
four times over, and each time the freeze claim was found to be false by an external reader rather
than by its author. The amendments themselves have been honest and complete — §12.1 through §12.6 each
record what changed and why — but the *freeze* is nominal. **A pre-registration that is edited and
then re-asserted as frozen is a plan with extra steps, and a reader should treat this document as a
plan that has been amended in the open rather than as a binding instrument.** That is the honest
description, and it is weaker than what the header claims.

The specific design change (the DeepSeek ratio) **moved no hypothesis in either direction** — H1 was
refuted before the correction and after it — but that is luck, not method.

### 12.8 The test-editing rule — pre-declared 2026-10-04, before its effect was computed

`tasks/<task>/task.json` grades with `node --test` run **in the agent's workdir as the agent left
it**. Nothing restores the fixture's tests, so weakening an assertion is scored as a solve.
`tools/fixture-guard.mjs` measures this on every run (`fixture.gradedOnEditedTests`) and deliberately
does not repair it. Measured incidence on the six surviving matrices, re-derived from `runs.jsonl` on
2026-10-04:

| model | runs | graded on edited tests | rate |
|---|---|---|---|
| gpt-6-luna | 620 | **81** | **13.1%** |
| Claude Haiku 4.5 | 620 | 5 | 0.8% |
| GLM-5.3-Flash | 620 | 2 | 0.3% |
| Qwen3.8-Flash | 621 | 1 | 0.2% |
| Claude Sonnet 5.5 | 620 | 0 | 0.0% |
| DeepSeek V4.1 Flash | 620 | **not measured** | the `fixture` field is absent on all 620 records; one retroactive scan of a non-random 62-workdir sample found 0/62 |

**The rule. This is a reporting decision, not an exclusion.**

1. **No exclusion.** The §9 list is closed and is not extended. Test-editing is not an infrastructure
   failure: the provider answered, the harness acted, and the edit is part of what the harness did.
   §9's exclusions "are never applied for a run result", and this is a run result.
2. **No restoration.** Repairing the fixture would change the grading rule mid-study and therefore the
   treatment — the same reason `fixture-guard.mjs` does not repair it.
3. **Every model's rate is reported as measured**, including both zeros, and DeepSeek's is reported as
   *not measured*, never as 0%.
4. **Two sensitivities are pre-declared**, computed for all six models and all ten arms, and reported in
   full beside every solve-rate figure — no threshold and no selection:
   - **S1 — drop the edited runs.** Each rate recomputed over runs with
     `fixture.gradedOnEditedTests !== true`.
   - **S2 — worst-case bound.** Each rate recomputed with **every** edited run forced to `solved = false`.
     Weakening a graded suite can only move a run unsolved -> solved, so S2 is a valid one-sided lower
     bound and (S2, as-measured) brackets the true rate.
5. **What the sensitivities may not do.** They may not replace the primary figure, remove a run from any
   other analysis, or select which comparisons get reported. The as-measured rate is the reported rate;
   S1 and S2 travel with it.
6. **The effect is not blind, and that is disclosed.** `notes/handovers/HANDOVER-2026-10-03.md` §4.1 already records
   luna's solved-with-edits **97.5%** against solved-without **94.6%** — 2.9 pp on 13.1% of runs, at most
   ~0.4 pp on luna's overall rate. This amendment is written before S1 and S2 are computed for the other
   five models, because the *rule* is what a reviewer attacks and this is the only ordering that cannot be
   read as selective analysis.
7. **Suite 2 is the structural answer.** `tasks-b/` grades against hidden cases, so editing the visible
   suite cannot reach the graded assertions. If suite 2 replicates, this confound cannot exist there by
   construction. Recorded as the design response — not as a mitigation claimed for the six matrices.
8. **A different class, untouched.** The six runs with `testPassed = true` and `solved = false` are a
   separate defect; the `solved` rule is not changed by this amendment.
9. **Freeze.** Amendment 21, appended after the `prereg-v5` tag. Consistent with §12.7, no new freeze is
   claimed and the honest description there stands.

| # | date | change | why |
|---|---|---|---|
| 21 | 10-04 | **§12.8 added — the test-editing rule pre-declared** | decided before its effect was computed; report-as-measured, no exclusion, no restoration, two pre-declared sensitivities |

### 12.9 A run whose own process was killed from outside — pre-declared 2026-10-04, before its effect

The hard-suite pilot was interrupted **on purpose** by a laptop restart while one cell was in flight.
The runner recorded that cell as an ordinary unsolved run:

| field | value |
|---|---|
| record | `results/hardpilot-ds-full/runs.jsonl`, 2026-10-04T12:41:20.246Z |
| task / arm | `lh-inventory-allocation` / `dsh:ptc-terse`, seed 1 |
| exitCode | **1073807364** (0x40010004, `DBG_TERMINATE_PROCESS`) |
| durationMs | 96 295 — the run did not finish, and its stdout is empty |
| classified as, before this amendment | **"unexplained"**, `infrastructure: false` |

Two consequences, both silent. `--resume` treats a run as COMPLETE unless `classifyRun` calls it
infrastructure, so the killed cell would be **skipped as done**; and the analysis reads
"unexplained" as the one bucket that may be a **model failure**. A machine shutdown would have been
published as an unsolved hard task. This is rule 9's own failure mode arriving through the one
channel rule 9 does not read: rule 9 identifies infrastructure "from the harness's own error text
and the gateway status code", and a process killed from outside writes **no error text**. Its
partial output is the last thing it happened to say, not a cause.

**The rule, written before the cell is re-run.**

1. **No new exclusion category.** Rule 9 already excludes "any infrastructure error"; a process
   terminated by the operating system is one. This closes the structural half of rule 9 the same way
   the launch-failure clause does, and §9's list is **not** extended. §12.8's "the §9 list is closed"
   governs reporting conveniences such as test-editing, not the definition of a measurement failure.
2. **The signal is structural, not textual**: an *unsolved* run whose exit code is a known
   external-termination code — 0x40010004 (TerminateProcess, e.g. shutdown) or 0xC000013A (console
   closed). Compared unsigned, because Node reports these signed or unsigned depending on the build.
   No keyword can trigger it, so no task's domain vocabulary can.
3. **Guards.** A solved run is never re-bucketed, whatever its exit code. An ordinary non-zero exit
   (13 records on disk carry exit 1) and a timeout (`exitCode: null`, deliberately `AMBIGUOUS`) are
   unchanged, as is a run that names a provider fault.
4. **Disclosed effect on published numbers: none, and this is asserted.** Across every
   `runs.jsonl` in `results/` on 2026-10-04 — **3 858 records in 9 matrices** — exactly **one**
   record carries a termination code, and it is the pilot cell in the table above. The rule therefore
   moves no published figure. `tools/exclusions.test.mjs` asserts this against the six shipped
   matrices and fails if it ever stops being true.
5. **The effect is not blind, and that is disclosed.** The cell is re-run under `--resume` after
   this amendment is committed, so the hard suite reports a measured run instead of a shutdown. If
   the rule had been written after seeing that result it would be worthless; it is written before.
6. **Freeze.** Amendment 22, appended after the `prereg-v5` tag. Consistent with §12.7, no new
   freeze is claimed and the honest description there stands.

| # | date | change | why |
|---|---|---|---|
| 22 | 10-04 | **§12.9 added — an OS-terminated run is a loss, not a model failure** | pre-declared before the killed cell was re-run; 1 record in 3 858 affected, so no published number moves |

### 12.10 The hard suite is pre-declared in its own document — 2026-10-05, before its cells were read

§1 binds "all further runs" and §5 lists the 24 harder tasks as a design level, so the hard suite
cannot be analysed outside a pre-declaration. §12.9 closed the last structural hole in rule 9 to get the
matrix collected; 240/240 cells are now on disk and nothing has read them. This amendment records where
their analysis is declared, and the boundary between the two documents.

1. **The plan is `notes/plans/PRE-REGISTRATION-HARD.md` (HARD-PREREG v1.0), committed with this amendment and before
   the analysis ran.** It declares HH1-HH4 as a confirmatory family (Holm-Bonferroni), HH5-HH8 as
   exploratory, the +/-10pp equivalence margin for the PTC differential, the 10pp HH1 separation floor,
   the -10% HH3 floor, the exact tests, the task-block pairing, and the sensitivities that travel with
   every primary.
2. **H1-H5 are not re-opened, extended or replaced.** They remain batch-1 tests on batch-1 data. A
   hard-suite result may not be substituted for a filed result, and the hard suite may not be pooled
   into a filed contrast.
3. **The hard suite is single-provider and single-model** (DeepSeek V4.1 Flash, 24 tasks x 10 arms x 1
   seed). No cross-provider claim is available from it. If the three remaining providers are collected,
   HARD-PREREG extends to them as pre-declared replications, each reported separately.
4. **Blindness is stated in that document (§1) and is partial, not claimed to be total.** The 74.2%
   solve rate and the retried cell's solved status were in `notes/handovers/HANDOVER-2026-10-04-B.md` before it was
   written; per-arm and per-task outcomes were not inspected, and its hypotheses are replications of
   filed findings rather than directions chosen from this matrix.
5. **No new exclusion category, and §9 is not extended.** The plan uses `classifyRun` unchanged; the one
   OS-terminated record is excluded under §12.9 and the retry is the cell's value.
6. **Spend: $0.** No cell is re-run, topped up or added, and the matrix stays closed.
7. **Freeze.** Amendment 23, appended after the `prereg-v5` tag. Consistent with §12.7, no new freeze of
   this document is claimed; the freeze that matters here is the commit containing
   `notes/plans/PRE-REGISTRATION-HARD.md`, and the honest description in §12.7 stands.

| # | date | change | why |
|---|---|---|---|
| 23 | 10-05 | **§12.10 added — the hard suite's analysis plan is its own frozen document** | §1 binds all further runs and §5 lists the 24 harder tasks; 240 cells were on disk with no analysis plan |
