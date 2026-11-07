# DEFECT — the position 'standardisation' is a rescaling, and the position confound is still live in tasks-b

**Found 2026-10-09, auditing the verdict's robustness. Free — no API spend.**

This corrects `notes/defects/DEFECT-position-confound-2026-10-04.md` section 3. That document's section 2 (position
carries cost) stands and is not in question. Its section 3 — the 'position-standardised' column, and
the two consequences drawn from it — does not: the estimator printed there is algebraically the raw
difference multiplied by a position-frequency ratio, so it cannot remove a position effect.

---

## 1. What the shipped estimator computes

`results/_scratch/position-standardise.mjs` calls `armStdMean(rows, task, seed)` — passing `rows`, the
**both-arms** array, where the native arm's own records (`n`) were meant. Inside, the position groups
`rs.filter(r => r.task===task && r.seed===seed && r.pos===pos)` therefore pick up *either* arm's record
at each position. Each (task, seed) block holds exactly one native and one ptc record, so for the two
positions they occupy the group has one member and for the other eight it is empty. Working it through:

    armStdMean(rows, t, s) = (w_n*c_n + w_q*c_q) / (w_n + w_q)
    diffs.push(c_q - armStdMean(...)) = [w_n / (w_n + w_q)] * (c_q - c_n)

**Verified mechanically, not inferred** (`results/_scratch/position-audit.mjs`): for GLM-5.3-Flash, all
**62 of 62 blocks** satisfy that identity to a maximum error of 3.5e-18. The per-block scale factor
runs 0.217 to 0.773, mean 0.474.

So the 'standardised' value is the observed difference scaled by a number that depends only on how
often each position was drawn by each arm. It contains **no term for what a position costs**, which is
the only thing a position adjustment has to contain. It is not a correction and it is not evidence
about the size of the confound.

That also explains the document's headline observation — 'every differential roughly halves' — as
arithmetic rather than measurement: the mean scale factor is 0.474, so the column is close to half the
raw column by construction. The claim that the magnitudes 'are inflated by roughly a factor of two by
an execution-order artefact' is therefore **unsupported**.

## 2. tasks-b inherited the same randomisation

`notes/defects/DEFECT-position-confound-2026-10-04.md` records that the shuffle seed is a function of
`(task, seed)` alone, so the permutation is identical across matrices and is not an independent
randomisation in any of them, and that the repair is 'forward only'. tasks-b was collected after that
repair, so this needed checking rather than assuming. Measured on the five tasks-b matrices:

| arm | position histogram, 0-9 (identical in all five) |
|---|---|
| `dsh:native` | 8 8 12 12 7 7 11 3 6 6 |
| `dsh:ptc` | 7 10 7 8 11 6 7 9 9 6 |

and for every one of 320 (task, seed) blocks the assigned position is **the same in every model**. The
tasks-b design carries the same degeneracy, so the raw tasks-b differentials carry whatever the
confound is — the fix did not change that property.

## 3. What a real standardisation does (and does not) do

Done as the document describes — each arm's cost at each position, reweighted to the pooled position
distribution — the magnitudes barely move:

| model | batch-1 raw (A2) | batch-1 reweighted | | tasks-b raw (A2) | tasks-b reweighted |
|---|---|---|---|---|---|
| DeepSeek V4.1 Flash | +0.1% [-9.0, 9.8] | +0.3% [-10.5, 8.5] | | -21.8% [-38.3, -9.4] | -24.9% [-35.6, -12.3] |
| GLM-5.3-Flash | -20.8% [-43.7, -2.7] | -19.6% [-35.0, -4.9] | | -10.1% [-21.4, **+0.0**] | -11.0% [-20.2, **-0.2**] |
| Qwen3.8-Flash | +30.7% [10.0, 53.3] | +28.8% [14.1, 49.0] | | +5.7% [-3.8, 15.2] | +5.5% [-2.9, 15.3] |
| Claude Haiku 4.5 | +53.8% [31.8, 77.8] | +52.8% [30.9, 83.3] | | +6.2% [-7.0, 19.6] | +8.2% [-7.1, 21.8] |
| Claude Sonnet 5.5 | +9.5% [0.3, 17.9] | +5.4% [-7.6, 19.6] | | -0.5% [-8.0, 5.9] | -0.2% [-7.0, 6.7] |
| gpt-6-luna | +1.2% [-8.4, 11.3] | +3.4% [-11.1, 14.4] | | -16.6% [-24.3, -8.5] | -17.5% [-24.8, -10.7] |

Three things follow, and one of them is a correction to the correction:

1. **The batch-1 magnitudes do not halve.** They move by 1-4 points. The document's 'every differential
   roughly halves' is the artefact of section 1, not a property of the data.
2. **Sonnet's interval does end up containing zero** (+5.4% [-7.6, 19.6]), so the document's conclusion
   about Sonnet survives — but it must not be reported on the strength of the arithmetic it was
   originally derived from. Note also that this estimator **abandons the task pairing**, which costs
   precision on its own; the widening from a 17.6-point to a 27.2-point interval is partly that, not
   only the position adjustment. Sonnet's move to null should be re-established with a paired
   estimator before it is quoted.
3. **GLM appears to flip classification in tasks-b under this reweighting — and that appearance is
   itself an artefact of the reweighting.** Its raw interval ends 0.04pp **above** zero (null);
   reweighted it ends 0.2pp **below** it (negative). But the reweighted estimator abandons the task
   pairing, and a properly paired adjustment (section 4a) puts GLM at **−6.2% [−15.0, +3.2], null**.
   So GLM's knife edge is a property of the raw contrast, not of a correction, and it should not be
   reported as a flip. The pre-registered verdict is computed on the raw basis: R1 stays 0 of 4 as
   filed, and it is 1 of 4 on the paired adjusted basis, where GLM is the one that matches. **The
   verdict is NOT REPLICATED on every basis**, because R1 needs 4 of 4 and R2 fails either way. **The verdict is NOT
   REPLICATED on both bases**, because R1 needs 4 of 4 and R2 fails either way — but the GLM row must
   carry both readings.

## 4. What this does not settle

The confound is not shown to be absent. `notes/defects/DEFECT-position-confound-2026-10-04.md` section 2 measures a
1.75x-3.82x cost spread across positions within one arm, and that measurement is untouched here. What
is now clear is that **direct standardisation is the wrong instrument for this design**: with one
observation per arm per block, each arm occupies a single position in each block, so reweighting to a
pooled distribution can only rescale, and the honest fix keeps the pairing.

### 4a. The instrument now exists

`tools/position-adjust.mjs` models the within-block paired difference,
`d = c_ptc - c_native = alpha + [f(p_ptc) - f(p_native)]`, with `f` a step function over the ten
positions and a task-clustered bootstrap — the paired fix this section called for. It is validated
against data with a known arm effect and a known position effect (`tools/position-adjust.test.mjs`),
and it refuses designs it cannot identify: with a PURE shift, where every block puts ptc exactly k
positions after native, the arm effect and a constant-per-step position effect are the same parameter,
and the fit is rank deficient rather than silently wrong. The real permutation varies (46 distinct
position pairs in batch-1, 58 in tasks-b), which is what makes any adjustment possible.

Its results, and the reason the "halving" story dies with the estimator: a real correction is not a
uniform shrinkage. On batch-1, Qwen moves from +30.7% to +35.3% and GLM from −20.8% to −8.9%. Two
limits are recorded with it: the functional form (multiplicative log vs additive usd) is a modelling
choice the data do not settle and the two disagree materially, and `f` is constrained to be common to
both arms, so an arm-specific order effect would not be caught. Every adjusted figure therefore travels
in pairs, and the raw pre-registered contrast remains the primary number.

## 5. Actions

1. `analysis/panel-analysis-batchb-2026-10-09.json` and the A2 rows are **unaffected**: the
   pre-registered contrast is the raw one and it is what the verdict uses.
2. `notes/records/REPLICATION-VERDICT-2026-10-09.md` gains this as a sensitivity, with the GLM row carrying both
   readings.
3. `notes/defects/DEFECT-position-confound-2026-10-04.md` section 3 should be marked superseded in place — it is
   dated and stays in the record, but nobody should absorb its table into `PAPER.md`.
4. ~~A paired position-adjusted estimator is owed~~ — **done**: `tools/position-adjust.mjs`, tested
   against known truths in `tools/position-adjust.test.mjs`. Its results are folded into
   `notes/records/REPLICATION-VERDICT-2026-10-09.md` section 3b. Still owed: a settlement of the functional form,
   and a check on whether `f` differs by arm.

## 6. Provenance

Scripts: `results/_scratch/position-audit.mjs` (the identity proof and both estimators),
`results/_scratch/position-tasksb.mjs` (the tasks-b randomisation), `results/_scratch/tasksb-standardise.mjs`
(the degenerate per-block reweighting, kept as the demonstration that it is a no-op). Scratch is
untracked and skipped by the backup, and now superseded by `tools/position-adjust.mjs` plus
`tools/position-adjust.test.mjs`. The identity proof itself is still scratch and should be promoted if
it is ever cited: it is the arithmetic that shows the old column was a rescaling, and
`tools/position-adjust.test.mjs` covers the estimator that replaces it but not that proof.