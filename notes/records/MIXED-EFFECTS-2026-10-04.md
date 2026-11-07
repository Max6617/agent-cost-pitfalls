# MIXED-EFFECTS-2026-10-04 — the filed model, actually fitted, and a disagreement about the slot confound

Everything below was computed in this repository on 2026-10-04 from the six shipped matrices.
New code: `tools/mixed-effects.mjs` (REML random intercept), `tools/mixed-effects.test.mjs`,
`tools/mixed-effects-hypotheses.mjs`. Output: `analysis/mixed-effects-6model-2026-10-04.json`.
No API spend. The two seven-model witness files were not read or written.

## 0. Why this exists

`PRE-REGISTRATION.md` files H1 and H3 as `y_ij = b0 + b1*x_ij + u_i + e_ij` with `u_i` a random
intercept over tasks, and `notes/plans/JOURNAL-PLAN.md` §3 names the analysis: *"linear mixed-effects with task
as a random intercept … A paired t-test ignores task heterogeneity; a mixed model does not."* Until
today the executed analysis approximated that equation two ways and neither estimates `s_u^2`:
a pooled OLS with no task term at all (the specification whose label the paper quotes) and a
within-task demeaned OLS, which `tools/hypotheses.mjs` labels "random-intercept-equivalent".

## 1. What the filed model actually says

| model | filed as | mixed fit (REML) | `s_u` | `s_e` | ICC | cluster-bootstrap 95% CI | verdict |
|---|---|---|---|---|---|---|---|
| H1 | `D_ij = b0 + b1*S_ij + u_i + e_ij` | **b1 = +0.00467** | **0.0000** | 0.0406 | **0.000** | [-0.00699, +0.01533] | INCONCLUSIVE (unchanged) |
| H3 | `requests = b0 + b1*native + u_i + e_ij` | **b1 = +2.2285** | 3.085 | 7.840 | 0.134 | [+1.2312, +3.3065] | SUPPORTED (unchanged) |
| H4 | `D_ij = b0 + bS*S + bC*C + u_i + e_ij` | **bC = +0.10285** (filed +0.11157) | **0.0000** | 0.0399 | **0.000** | [+0.05489, +0.16952] | REFUTED (unchanged) |
| H2 | 31 tasks, one paired difference each | not fitted | — | — | — | — | no repeated measurement, so no random intercept is identified |

**The headline is what `s_u` is, not what `b1` is.** For H1 and H4 the REML estimate of the
between-task variance is **exactly zero** at the boundary: the paired differences carry no
task-level clustering that the model can detect. That cuts both ways, and both ways are worth
writing down:

* the paper's limitation list says the paired tests "ignore task heterogeneity". For H1 that is
  measurably moot — there is no task-level variance to ignore, and the mixed fit reproduces the
  pooled slope to five decimals (+0.00467). The honest sentence is that the filed model was
  fitted and the verdict does not move.
* H3 does have real task heterogeneity (ICC = 0.134, `s_u` = 3.09 requests against `s_e` = 7.84),
  and the filed estimate is unchanged to four decimals (+2.2285) with a bootstrap interval that
  reproduces the reported one ([+1.23, +3.31] against [+1.234, +3.328]). The study's one
  confirmatory win survives its own pre-registered model.

Note on intervals: the *model-based* CI for H1 is much wider than the cluster bootstrap
([-0.032, +0.041] against [-0.007, +0.015]). They answer different questions — the model-based one
treats the six models as fixed and the observations as independent given the task effect; the
cluster bootstrap resamples the 31 tasks. This study's convention is the cluster bootstrap, and the
mixed-model numbers are therefore reported with it. Both are in the JSON.

## 2. The slot confound: two corrections, and they disagree

`notes/defects/DEFECT-position-confound-2026-10-04.md` records that the ten arms are placed by one shuffle shared
by every matrix, so arm and execution slot are correlated, and it asks for slot as a fixed effect.
Fitted as `cost_billed ~ mode + slot + (1|task)` per model (`mode` = `dsh:ptc` vs `dsh:native`),
as a percentage of that model's native mean:

| model | slot fixed effect | 95% CI | shipped raw | PAPER §3.1 reweighted |
|---|---|---|---|---|
| Claude Haiku 4.5 | **+52.97%** | [+35.11, +70.83] | +53.84% | +25.41% |
| Qwen3.8-Flash | **+31.97%** | [+13.93, +50.02] | +30.67% | +15.77% |
| Claude Sonnet 5.5 | **+7.04%** | [-0.57, +14.66] | +9.51% | +3.69% |
| gpt-6-luna | **+1.85%** | [-10.47, +14.16] | +1.20% | +0.75% |
| DeepSeek V4.1 Flash | **+1.09%** | [-9.93, +12.11] | +0.13% | -0.33% |
| GLM-5.3-Flash | **-20.10%** | [-40.45, +0.25] | -20.75% | -10.08% |

**The fixed-effect correction moves the contrasts by about one percentage point. The reweighting
correction halves them.** Both correct "the slot confound"; they cannot both be the right
description of it, and the paper currently publishes the second as if it settled the matter
("the magnitudes roughly halve", limitation 8, and §3.1's second table).

Why they differ is not yet settled, but one mechanism is visible in the data and is not a matter of
opinion: the reweighting estimator gives pooled slot weights to arm-by-slot *cells*, and some of
those cells contain one or two observations. Measured on Haiku, `dsh:ptc` occupies slot 5 **once**
and slot 0 **twice** in 62 blocks; the pooled slot weights are 7/124 and 5/124. One run therefore
carries ~3.5x its natural weight, and that run happens to be expensive ($0.2205 against a $0.14
model mean). The regression estimator uses the same data without that leverage, at the cost of
assuming the slot effect is additive on the dollar scale. **Neither is obviously right.** What is
not defensible is publishing the factor of two as the measured size of the confound when the
standard regression adjustment on the same data says it is nearly nothing.

**What the paper should say until this is resolved**: report the raw contrast, the fixed-effect
contrast and the reweighted one side by side, state that they disagree by a factor of two, name the
sparse-cell leverage as the leading explanation of the difference, and drop the claim that the
magnitudes are inflated by roughly two. The qualitative claim — signs and ordering — is unaffected,
since both corrections preserve them.

## 3. Two defects in the estimator, both found by tests before any number was quoted

1. **The Cholesky log-determinant was halved** (`sum(log L_ii)` instead of `2*sum(log L_ii)`), which
   understates the determinant penalty and drove the variance-ratio search upward: the first version
   estimated `s_u` = 0.92 on data with no group structure at all.
2. **The group correction in `r'V^-1 r` was applied per observation instead of per group**
   (`sum_i [r_i^2 - c*(sum r)^2]` rather than `sum_g [sum_i r_i^2 - c*(sum r)^2]`), multiplying it by
   the group size and making `rVr` 3.5x too small.

Both were caught by comparing the module's criterion against a dense n-by-n reference implementation
on the same data, and by a test that asserts the estimator must return OLS when the data has no
group structure. Neither would have been visible in a plausible-looking output.

## 4. Independent verification of the artifact claim (2026-10-04)

The handover claims every number in the paper is re-derivable from the shipped artifact. Re-run into
a temporary directory, none of the five analysis commands writes to the two witness files:

    node tools/cost-panel.mjs            --json <tmp>/cost-panel.json
    node tools/panel-analysis.mjs        --json <tmp>/panel-analysis.json
    node tools/hypotheses.mjs            --json <tmp>/hypotheses.json
    node tools/prefix-retention.mjs      --json <tmp>/prefix-retention.json
    node tools/test-edit-sensitivity.mjs --json <tmp>/test-edit-sensitivity.json

All five regenerate **identically to the recorded outputs apart from their `generated` timestamp**
(deep JSON comparison, that field excluded). The paper's figures reproduce: H1 b1 = +0.00467
[-0.00551, +0.01568]; H2 mean(d) = +0.00151 [-0.00010, +0.00354], Wilcoxon p = 0.80; H3
+2.2285 [+1.2339, +3.3280]; H4 bC = +0.1116 [+0.0621, +0.1727]; the ratio-5.00 secondary gap
42.27 pp and the within-ratio-5.00 spread 52.64 pp.

## 5. What is still open

* Which slot correction is right (§2). This is a decision for the paper's authors, not for a tool.
* `s_u = 0` at the boundary is an estimate, not proof of no task effect; a boundary estimate in a
  31-task sample is weak evidence. REPORTED, not asserted.
* H2 has no mixed-model version and cannot have one as filed (one observation per task).
* The slot fixed effect is additive in dollars; cost is positive and right-skewed, so a log-scale or
  multiplicative slot effect is a legitimate alternative and has not been fitted.
