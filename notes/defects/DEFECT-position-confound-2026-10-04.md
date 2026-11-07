# DEFECT — the arm randomisation is degenerate, and it carries 1.75x–3.82x of cost

**Found 2026-10-04, during the document sweep, at commit `5fddd5d`. Free — no API spend.**

This answers the question `notes/handovers/HANDOVER-2026-10-03.md` §4.4 left open (*"before planning the F45 re-run,
find out what `position` actually records"*) and it answers it with a number that matters more than
the planned re-run would have.

---

## 1. What `position` records

`tools/run-experiment.mjs:203` builds the run plan as:

```js
shuffle(arms, seed, task).forEach((arm, position) => {
  plan.push({ task, arm: arm.id, harness: arm.harness, patch: arm.patch, mode: arm.mode, seed, position })
})
```

So `position` is **the arm's index in the randomised execution order within a (task, seed) block** —
0 is the first arm of the block, 9 the last. It is written onto every record (`:622`, `:701`).
It is *intended* to be random. **It is not.**

The shuffle is `tools/run-experiment.mjs:193` and it derives its RNG seed from
`taskName + '|' + seed` through an FNV-1a hash. The hash is sound. **The defect is that the seed is a
function of `(task, seed)` alone — it does not involve the model or the matrix.** So every one of the
six shipped matrices draws the *same* permutation for a given task and seed, and `position` is
**identical across all six matrices and therefore not an independent randomisation in any of them.**
Measured, the `dsh:native` and `dsh:ptc` position histograms are byte-for-byte equal in all six
(`results/_scratch/position-probe.mjs`).

### The bias is visible in the histogram

`dsh:native`, counts over positions 0–9 across all 31 tasks x 2 seeds:

```
pos:       0   1   2   3   4   5   6   7   8   9
native:    3   6   7   8   5   6   4   5   8  10
ptc:       2  10  11   5   6   1   6  11   3   7
```

A uniform shuffle gives ~6.2 per cell. **`dsh:ptc` reaches position 0 in 2 of 62 blocks**; the header
of `run-experiment.mjs` records that the *pre-fix* body put it there in 31 of 62. The direction of the
bias changed; the existence of it did not. The earlier `notes/handovers/HANDOVER-2026-10-03.md` §4.4 observation that
*"`position` takes each value 0–9 exactly 62 times"* is true **by construction** — ten arms, ten
positions, 62 blocks — and says nothing about whether the assignment is random. It is not.

---

## 2. Position carries cost, by more than the effect being measured

Within a single arm (`dsh:native`, so presentation mode is held fixed), grouped by `position`,
cost re-derived from gateway usage with `costOf`:

| model | native mean | cheapest position | dearest position | spread |
|---|---|---|---|---|
| DeepSeek V4.1 Flash | $0.00934 | $0.00526 | $0.01075 | **2.05x** |
| GLM-5.3-Flash | $0.00902 | $0.00461 | $0.01760 | **3.82x** |
| gpt-6-luna | $0.00632 | $0.00381 | $0.00814 | **2.14x** |
| Qwen3.8-Flash | $0.01589 | $0.01226 | $0.02145 | **1.75x** |
| Claude Haiku 4.5 | $0.11971 | $0.06540 | $0.18818 | **2.88x** |
| Claude Sonnet 5.5 | $0.07772 | $0.05522 | $0.10502 | **1.90x** |

**Position 0 is the cheapest position in five of six models, and `dsh:ptc` is almost never in it.**
Since PTC is the *early* arm by name but lands *late* by position, a raw PTC-versus-native contrast
mixes the presentation-mode effect with an execution-order effect of comparable size.

This is measured, not inferred, and it has a plausible mechanism: the two arms' first requests are the
same prompt except for the arm-id string, which appears six times including once inside the
working-directory path (`notes/records/FINDINGS.md` F44 measured exactly 30 bytes of difference). A token-boundary
shift of that size is enough to change a cache hit, and the effect is systematic rather than random
because the order is systematic.

---

## 3. What position adjustment does to the paper's headline differentials

> **SUPERSEDED IN THIS SECTION, 2026-10-09 — read section 2 above and the correction beside this file.**
> The table below is not a standardisation. `position-standardise.mjs` passes `rows` (both arms) to
> `armStdMean` where the arm's own records were meant, so each block's value is algebraically
> `[w_n/(w_n+w_q)] * (c_q - c_n)` — the raw difference scaled by a position-frequency ratio, verified on
> 62 of 62 blocks to 3.5e-18. It contains no term for what a position costs, so it cannot remove a
> position effect, and "every differential roughly halves" is the mean scale factor (0.474), not a
> measurement. Done correctly the four cheap providers' magnitudes move by 1-4 points, not 50%; Sonnet
> still becomes null, but on an estimator that abandons the task pairing, so it must be re-established
> before it is quoted. See `notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md`. Section 2 (position
> carries cost) is unaffected.

**Method.** Each arm's cost is reweighted to the **pooled position distribution** over both arms — the
standard direct-standardisation estimator — which marginalises over execution order and equalises the
task-seed composition between arms. Paired by task, cluster bootstrap over 31 tasks, 5,000 iterations,
cost re-derived per run from gateway usage. Independent script: `results/_scratch/position-standardise.mjs`.

The raw column reproduces the shipped panel to within a percentage point on every model, which is the
check that the re-derivation is sound:

| model | panel A2 / PAPER §3.1 | this re-derivation, raw | **position-standardised** | 95% CI |
|---|---|---|---|---|
| DeepSeek V4.1 Flash | +0.13% | +0.13% | **−0.33%** | [−5.42, +4.63] |
| GLM-5.3-Flash | −20.75% | −20.75% | **−10.08%** | [−19.16, −2.46] |
| gpt-6-luna | +1.20% | +1.20% | **+0.75%** | [−4.24, +6.30] |
| Qwen3.8-Flash | +30.67% | +31.09% | **+15.77%** | [+8.02, +24.65] |
| Claude Sonnet 5.5 | +9.51% | +9.51% | **+3.69%** | [−0.27, +7.26] |
| Claude Haiku 4.5 | +53.84% | +53.84% | **+25.41%** | [+16.73, +34.77] |

**Two things move, and one of them is a published claim.**

1. **Every differential roughly halves.** Haiku's headline +53.84% becomes **+25.41%**; Qwen's +30.67%
   becomes +15.77%; GLM's −20.75% becomes −10.08%. The signs are unchanged and the ordering is
   unchanged, so *the paper's shape survives* — but the magnitudes that carry §3.1 are inflated by
   roughly a factor of two by an execution-order artefact.
2. **Claude Sonnet's interval now contains zero** ([−0.27, +7.26]). Its differential is no longer
   distinguishable from nothing once position is controlled. `PAPER.md` §3.1 currently lists Sonnet as
   one of the models whose interval excludes zero.

Robustness: the point estimates are **identical to four significant figures under three different
bootstrap seeds** and the intervals move by <0.3 pp. This is not a bootstrap artefact.

---

## 4. What this does and does not touch

**Directly affected — do not quote the unadjusted figure as if it were the mode effect:**

- `PAPER.md` §3.1's differential table (all six rows move);
- the H1 secondary's 42.27 pp gap, which is built from the same arm pairs;
- `notes/records/FINDINGS.md` F31's six-model restatement;
- the claim that three models share ratio 5.00 and disagree by 52.64 pp — **the spread is computed
  from these differentials and will shrink**, though the qualitative point (one ratio value, large
  disagreement) is likely to survive it.

**Not affected:**

- **H3 (tool surface costs requests)** — +2.228 [+1.228, +3.360], n = 744. It counts *requests*, not
  cost, and the position bias is a token-boundary effect on cached input, not a request-count effect.
  This remains the study's one confirmatory win (and on batch-1 it is null once luna is dropped; see
  `PAPER.md` §3.9 D).
- **Prefix retention** (`analysis/prefix-retention.json`) — computed from request-body growth, not cost.
- The Anthropic cost bracket — untouched, and still a bracket.
- The rank-step tie fraction — now MEASURED under the adjustment rather than asserted
  (`analysis/ranking-adjusted-2026-10-10.json`, `tools/ranking-adjusted.mjs`): batch 1 **41/54 (75.9%)**
  adjusted against 40/54 (74.1%) raw, suite 2 **34/54 (63.0%)** against 33/54 (61.1%), and the batch-1
  median rho unchanged at 0.238. The earlier sentence here said the fraction was "if anything
  *understated*"; that was an assertion, and the measurement says it was directionally right.

**Not yet measured, and it should be before anything is rewritten:** whether H1, H2 and H4 move under
the same adjustment. They are regressions rather than paired contrasts, so the fix is a `position`
fixed effect in the model rather than reweighting. That is the mixed-effects job
(`notes/plans/JOURNAL-PLAN.md` §5), which was already open, and it now has a second reason to be done.

---

## 5. Why this is not a re-run

`notes/handovers/HANDOVER-2026-10-03.md` §4.4 proposed re-running the position confound with the repaired shuffle. That
is not necessary to establish the effect, and it is not sufficient to fix the published numbers: the
repair is **already in the code** (`tools/run-experiment.mjs:193`, fixed forward only) and every matrix
collected before it carries the old bias. A fresh collection would give clean numbers for a *new*
population, not corrected numbers for the six matrices the paper is written on.

The honest options, in order of cost:

1. **Report the position-standardised differentials beside the raw ones**, in the pre-registered
   sensitivity style the study already uses for test editing. Free, and it is the option that cannot
   be read as selective analysis.
2. **Add `position` as a fixed effect** to the H1–H4 models. Free, and it closes the second reason the
   mixed-effects analysis is owed.
3. **Re-collect one model** with the repaired shuffle to confirm the standardised estimate is the
   right correction rather than a different bias. Costs one batch-1 matrix (~$5–20 for a cheap
   provider) and is worth it only if a reviewer is expected to press on this.

**What must not happen** is that the raw differentials are published as the mode effect, or that the
confound is silently absorbed into a rewritten table. The panel's shipped numbers are the record; this
file is the correction that sits beside them, and it is dated.

---

## 6. Provenance

- Detected: 2026-10-04, at commit `5fddd5d`, during the document sweep. No API spend; no file under
  `results/` modified; no matrix started.
- Scripts: `results/_scratch/position-probe.mjs` (histograms), `results/_scratch/position-cost.mjs`
  (cost by position), `results/_scratch/position-standardise.mjs` (the standardised estimate).
  **Scratch is not tracked and is skipped by the backup** — if any of this becomes load-bearing,
  the script must be promoted into `tools/` with a test before it is cited.
- The two seven-model witness files were not read, written or touched by this pass;
  `analysis/panel-analysis.json` and `analysis/hypotheses.json` still hash `02b2c4e2...` and
  `bd34e8f7...`.

**No claim in this file was computed after seeing a result it was meant to predict.** The defect was
found by asking what `position` counted, not by looking for an effect.