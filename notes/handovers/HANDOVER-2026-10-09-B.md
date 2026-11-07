# HANDOVER — 2026-10-09-B

**The tasks-b replication verdict is NOT REPLICATED.** Run against the rule `tasks-b/PLAN.md` filed on
2026-10-03, before any tasks-b record existed: R1 holds for **0 of 4** providers and R2 **fails**. The
batch-1 headline — that the sign of the PTC cost differential is not shared across providers — did not
reproduce on the replication suite. This session also resolved the A6 anomaly (it was a category
error, and the aggregate behind it was a real defect), answered haiku's parked re-run decision with
numbers, recorded the Anthropic smoke bias, and taught the collector's verify stage the whole of rule 9.

---

## 1. The verdict

`tasks-b/PLAN.md` section 5 fixes the rule mechanically. Nothing implemented it, so the result
circulated as prose — and the prose and the rule disagree about GLM, whose tasks-b interval ends at
**+0.0405%**: every one-decimal rendering reads as 'negative, excludes zero' while the rule makes it
**null**. `node tools/replication-verdict.mjs` now applies the rule. Record:
`notes/records/REPLICATION-VERDICT-2026-10-09.md`.

| provider | batch-1 | tasks-b | tasks-b 95% CI | R1 |
|---|---|---|---|---|
| Qwen3.8-Flash | positive | **null** | [-3.78%, +15.20%] | DIFFERS |
| GLM-5.3-Flash | negative | **null** | [-21.38%, **+0.04%**] | DIFFERS |
| gpt-6-luna | null | **negative** | [-24.32%, -8.51%] | DIFFERS |
| DeepSeek V4.1 Flash | null | **negative** | [-38.31%, -9.41%] | DIFFERS |

* **R1: FAILS, 0 of 4.** No provider keeps its batch-1 classification.
* **R2: FAILS.** Not one of the four classifies positive on tasks-b. The sign disagreement is absent:
  the differential is negative or indistinguishable everywhere.
* **Two of the four failures are real divergences and two are fragile classifications.** Comparing the
  suites directly with the order correction applied to both: luna (+6.7% vs -16.2%) and DeepSeek
  (-0.8% vs -17.0%) have **disjoint** intervals — genuine differences; Qwen (+35.3% vs +7.0%) and GLM
  (-8.9% vs -6.2%, a **2.7pp** gap, same sign, both null) **overlap**. R1 compares classifications, not
  estimates, so GLM scores as a failure because an endpoint moved across zero, not because the suites
  disagree. The paper now says *the pre-registered classification pattern did not reproduce* rather than
  *four providers disagreed*, which over-read the rule by a factor of two.
* **The position confound is not the cause.** Adjusting both suites moves the mean absolute gap from
  18.8pp to 17.5pp and leaves 2 of 4 discrepancies separated on both bases.
* **luna and DeepSeek reversed** — null to significantly negative, with intervals **disjoint** from
  their batch-1 intervals. Qwen lost its positive result (intervals overlap on [+10.0%, +15.2%]);
  GLM's intervals overlap in both directions and only its classification moved.
* **Reported alongside:** the pre-registered family is **m = 12** (4 cost + 8 solve-rate), not the
  m = 18 the filed six-provider artefact prints; **2 of 12 survive Holm** (DeepSeek p = 0.0001, luna
  p = 0.0003). H1 re-fit on the four: b1 = **-0.0125 [-0.0203, -0.0050]**, negative with the CI
  excluding 0 — which matches the plan's replication read.
* **Anthropic is not in the verdict** (PLAN section 2 filed the design with 'No Anthropic'). haiku and
  sonnet are both null, so adding them would not change it.

**Verifications the verdict rests on:** the batch-1 targets reproduce **exactly** from the current
estimator (all four point estimates, all eight interval bounds); the gateway treatment is identical
between the two suites per provider (same protocol path, same cache-breakpoint setting); and building
the panel over only the four pre-registered datasets returns A2 rows identical to the six-provider
panel. The luna/DeepSeek reversals are not a transport or flag change.

---

## 2. A6's 'anomaly' was a category error — and the aggregate was the real defect

A6 measures **cache hit rate**, not solve rate. Sonnet's 0.513 never disagreed with 757/800 = 94.6%.
The near-matches that made it look like a defect (DeepSeek 94.9% vs 95.6%, haiku 56.9% vs 57.9%) are
coincidences. What *is* a defect is the pooled number: on Anthropic it averages six DSH arms that
receive an injected top-level `cache_control` breakpoint (~85-96% hits) with four external-harness arms
that cannot receive one (exactly 0%). 480 cells at 85.5% + 320 at 0% = 51.3%. The gate is
`tools/measure-gateway.mjs` (`url.includes('/messages') && cacheBreakpoints`) and only DSH speaks
`/v1/messages`. So the 0% measures the study's own request path, not a harness refusing to cache.

Fixed additively: the filed `overall` is byte-identical, and `tools/cache-regime.mjs` adds the dsh /
non-dsh split with cell counts, which decomposes it exactly. Record:
`notes/defects/DEFECT-a6-cache-regime-aggregate-2026-10-09.md`.

**This creates the session's biggest open item — see section 6.2.** On Anthropic, cross-*harness* cost
comparisons price the external harnesses with every input token at the miss rate ($2.00/M on sonnet)
while the DSH arms read from cache at a tenth of it. A1's harness ranking on Anthropic is confounded by
the study's own gateway configuration. The **PTC-vs-native** contrast is NOT affected: both arms are
DSH arms inside one matrix and get identical treatment.

---

## 3. haiku — the re-run stays parked, and the sign-off is now correct

**The revisit condition is answered: no.** `notes/records/HAIKU-REVISIT-2026-10-09.md`.

* haiku is **excluded from the pre-registered verdict by design**, so its 18 paired tasks cannot limit
  a headline claim.
* Its per-task spread is the **largest of the six providers** (sd $0.0858, 7x DeepSeek's).
* It would need **91 paired tasks** for its interval to exclude 0; the design gives 40. Expected CI at
  40: **[-$0.0089, +$0.0443]** — still null. Simulated power at 40: **29%**.

**A correction made this session, worth not re-learning:** haiku's matrix is **structurally complete**.
`runs.jsonl` holds 800 records over 800 cells, 0 absent, 0 retried, every arm exactly 80. The 447 are
rule-9 **exclusions** (312 text / 135 status), not missing cells. The record-level solve rate is
206/800 = **25.8%**; the analysis population is 206/353 = **58.4%**. Both numbers are real and they are
not the same number.

**The collector fix.** The verify stage's zero-cost check knew only the run record's own `error` text,
so it called 444 correctly-excluded runs 'ZERO-COST ... with no error record' while the analysis
excluded them. `tools/collect-verify.mjs` gives the stage the whole of rule 9 (imported from
`tools/exclusions.mjs`, never copied), one gateway scan answering spend + tokens + request status, a
rule-9 line naming both clauses, and a **CARRIED** line reporting the analysis population beside the
record-level sign-off. Verified on real data: haiku now reports `800/800 cells, 206 solved (25.8%)`,
`rule 9 exclusions: 447 (text 312 / status 135, of which no-requests 1)`, `CARRIED: 353/800 cells, 206
solved (58.4%)`, and `800 records = 447 excluded + 0 without usable usage + 353 carried`, with 0
unresolved failures, 0 unexplained zero-cost and 0 absent cells — so it signs off. sonnet (800/800,
757 solved) and deepseek (808 records / 800 cells, 8 retried and all resolved) still pass unchanged.

The sign-off itself still needs the provider back: the pipeline runs preflight before verify, and
preflight fails while the Anthropic monthly account limit is in force. Nothing about that limit has
changed — the remaining balance is omitted, against a $183 re-run.

---

## 4. The Anthropic smoke bias, recorded

`notes/defects/DEFECT-anthropic-smoke-bias-2026-10-09.md`. A two-arm DSH smoke under-prices a ten-arm matrix by
**70%** on haiku ($0.2403 -> $0.4082 per cell) and **136%** on sonnet ($0.1398 -> $0.3303). Openhands is
the dearest arm on both ($1.17 and $1.21 per cell) against $0.10-0.30 for the DSH arms.

**The bias changes sign by provider** and must not be generalised: on DeepSeek, GLM and luna a two-arm
DSH smoke *over*-prices the matrix (ratios 1.25, 1.16, 1.12), because the DSH arms are the dearest ones
there. 'A smoke under-prices the matrix' is not a rule — using a smoke as a price assumes the answer.
There is also an unexplained residual (§3 of that record): haiku's two DSH arms cost 22% more per cell
inside the full matrix than in the standalone smoke, and sonnet shows no such effect.

---

## 4b. Position: the study's "standardisation" was a rescaling, and the real correction is now built

Found while auditing whether the verdict survives the confounds this study has already been burned by.
`notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md` is the record.

* **`notes/defects/DEFECT-position-confound-2026-10-04.md` section 3 is withdrawn in place.** Its "position-
  standardised" column passes both arms' records to the function meant to summarise one arm, so each
  block's value is algebraically `[w_n/(w_n+w_q)] * (c_q - c_n)` — the raw difference times a
  position-frequency ratio, verified on **62 of 62** blocks to 3.5e-18. It contains no term for what a
  position costs, so "every differential roughly halves" is the mean ratio (0.474), not a measurement.
  Section 2 (position carries cost) stands.
* **tasks-b carries the same confound**: the assigned position is identical in all five tasks-b
  matrices for all **320** blocks, because the shuffle seed is still a function of (task, seed) alone.
* **`tools/position-adjust.mjs`** is the instrument that keeps the pairing —
  `d = c_ptc - c_native = alpha + [f(p_ptc) - f(p_native)]`, position a step function, task-clustered
  bootstrap. Validated against **known** truths (10 tests) and it **refuses** designs it cannot identify:
  a pure position shift makes the arm effect and the step effect one parameter, and the fit says so.
* **The verdict is robust; the batch-1 target is not.** Four consistent readings — raw vs adjusted,
  log vs usd — give R1 = 0, 1, 1, 1 of 4 with R2 failing in all four, so **NOT REPLICATED on every
  basis**. But the filed batch-1 classification of GLM is *negative* and adjusted it is *null* on either
  scale, so on an adjusted reading R1 would be 1 of 4 with GLM the one that matches.
* **A claim made earlier this session is withdrawn**: that GLM "flips to negative" in tasks-b came from
  reweighting, which abandons the pairing. Properly paired, GLM is **null** at +3.2% on the log scale.
* **Scale question, now run down as far as it goes.** By held-out prediction of the same quantity in
  the same units, the log scale wins **9 of 12** model x suite comparisons by up to 1.8x and every
  additive win is marginal (≤4%); batch-1 is 3-3, tasks-b 6-0. An earlier metric of this session's own
  converted the additive prediction into a ratio, exploded, and claimed "10 of 12, x20" — withdrawn, and
  replaced everywhere by the symmetric one. Neither scale is crowned; they disagree about exactly two
  classifications (GLM null on both; Sonnet positive on log, null on additive).
* **Still not settled**: whether `f` differs by arm rather than being common to both.
* **The paper's tables changed.** §3.1's withdrawn "slot-standardised" table is replaced with the paired
  estimator in both scales; limitation 8 is rewritten; the header carries a dated note listing what moved
  under 2026-10-09.

---

## 5. Baseline at handover (verified this session)

* **249/249 tests pass** (208 at the previous handover; +11 replication-verdict, +4 cache-regime, +16
  collector-verify, +10 position-adjust).
* `node tools/artifact.mjs --verify` -> **exit 0**, 28 files match the manifest of 2026-10-04T08:11:15.632Z.
* `node tools/backup-results.mjs --verify` -> **exit 0** (160 mirrored, 1 extra kept on purpose).
* Witnesses **UNCHANGED**: `analysis/panel-analysis.json` 02B2C4E2, `analysis/hypotheses.json` BD34E8F7.
* Working tree clean except untracked `findings/` (not ours).
* `analysis/panel-analysis-batchb-2026-10-09.json` was **regenerated** to carry the A6 split; every
  pre-existing value in it is unchanged.

---

## 6. Open items, in priority order

1. ~~`PAPER.md` and `notes/records/FINDINGS.md` do not carry the replication verdict.~~ **DONE, including the framing
   decision.** The verdict is in §3.8, and §3.1's claim is **restated in §3.1a** — from "does not share a
   sign" (which rested on GLM, the one row the order correction makes null) to the magnitude and
   provider-specificity both suites support, with the withdrawn reading named as withdrawn. The artifact
   now covers the replication scope additively as well. The rest of this item is kept for the record: `PAPER.md` §3.8 is new (R1 0 of 4, R2 fails, NOT REPLICATED,
   with the two disjoint reversals and the robustness across all four bases); `notes/records/FINDINGS.md` gains F51,
   F52 and F53, and F45 carries a dated note. **The open decision:** §3.1's title claims the penalty
   "does not share a sign", and that now rests on GLM — its only significantly negative row — which the
   execution-order correction makes null on both scales. The title, or the claim, has to give. §3.7's
   "the paper rests on sign disagreement" is already qualified in place; the title is not, because
   changing a paper's central claim is not a correction to make silently.
2. ~~A1's harness ranking on Anthropic is confounded by the study's own cache configuration.~~ **SIZED
   on 2026-10-09, at zero API cost** — it is a re-pricing of logs already on disk, which is the point:
   the confound exists because those tokens are *unpriced*, so no purchase can resolve it.
   Re-pricing the same runs three ways (unpriced tokens at the miss rate, at the hit rate, and at the
   DSH arms' own observed hit rate): on **sonnet the cheapest arm is a DSH arm under all three, mean
   rank shift 0.00**; on **haiku it flips** from `dsh:ptc-terse` ($0.099) to `opencode` ($0.064 at the
   hit-rate reading), a mean shift of **4.2 places**. So the confound is material to haiku's ranking
   and immaterial to sonnet's — and it affects **no claim the paper makes**, because no external-harness
   Anthropic cost is quoted anywhere. Recorded in `PAPER.md` §3.4 and limitation 7.

   **The related purchase is also off.** `notes/defects/DEFECT-position-confound-2026-10-04.md` §5 option 3 proposed
   re-collecting one cheap matrix (~$5-20) "with the repaired shuffle" to validate the position
   adjustment. There is no repaired shuffle: `tools/run-experiment.mjs` still seeds on
   `taskName + '|' + seed`, so a new collection would draw the **identical** permutation and provide no
   independent randomisation. The free prerequisite is a two-line change to seed on the matrix; until
   that is done, that $10 buys nothing.
3. **Settle the position question before any adjusted figure is published** (§4b). Two things are
   open: the functional form of the position effect (log vs usd disagree materially, and the data do not
   choose between them), and whether `f` is common to both arms or arm-specific. Both are modelling
   decisions, and until they are made every adjusted number travels in pairs.
4. **Decide whether R1's targets stay as filed.** They are the *raw* batch-1 classifications; adjusted,
   GLM moves from negative to null, which would make R1 1 of 4 instead of 0 of 4. The pre-registered
   verdict is unaffected either way, but re-basing a pre-registered rule after seeing results is exactly
   what the filing forbids, so this is a write-up decision to make deliberately rather than a correction.
5. **The filed batchb artefact reports the family as m = 18; the pre-registered family is m = 12.**
   Both should be reported, labelled, so the extension is visible as an extension.
6. **haiku's in-matrix arm premium is unexplained** (§4 above). Candidates: the position confound
   (`notes/defects/DEFECT-position-confound-2026-10-04.md`), machine load, or the truncation of haiku's matrix to 353
   carried cells. Not separated — and §4b now gives a tool that could separate the first.
7. **haiku's re-run stays parked.** Only revisit if a *positive* cost differential from tasks-b becomes
   necessary — haiku's +6.2% is the only candidate in the whole suite, and the re-run is a 29% bet.
8. **Operational:** `betterharness-keepalive` and `betterharness-serial-finish` are **disabled** (last
   fired 11:48). Correct while nothing is collecting, but a crash is no longer self-healing — re-arm
   them before any future collection. Never kill a terminal window; sweep `measure-gateway` orphans
   older than 20 minutes before starting a collector; one collector at a time (memory, not CPU).
9. **The runner hang is still unexplained** (`notes/defects/DEFECT-runner-hang-2026-10-07.md`): three occurrences,
   always a finished runner with no child processes. `tools/exit-guard.mjs` mitigates it, nothing
   explains it.
10. **`findings/` is untracked and not ours. MANIFEST does not cover the hard suite or batchb — do not
   re-baseline it.** `results/batchb-*/runs.no-usage.jsonl` are deliberate archives; never delete them.

---

## 7. Commands worth having

```
node --test "tools/*.test.mjs"                                  # 249 tests
node tools/replication-verdict.mjs                             # the tasks-b verdict, from the filed panel
node tools/position-adjust.mjs                                 # batch-1: raw vs position-adjusted
node tools/position-adjust.mjs --datasets batchb                # tasks-b: the same
node tools/panel-analysis.mjs --datasets batchb --json analysis/panel-analysis-batchb-<date>.json
node tools/hypotheses.mjs     --datasets batchb --json analysis/hypotheses-batchb-<date>.json
# the pre-registered four-provider family (m = 12) and H1, no Anthropic:
node tools/panel-analysis.mjs --datasets batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna --json results/_scratch/panel-four.json
node tools/hypotheses.mjs     --datasets batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna --json results/_scratch/hyp-four.json
```

---

## 8. The one-line summary

The batch-1 sign disagreement did not replicate on tasks-b (R1 0 of 4, R2 fails, NOT REPLICATED); A6's
0.513 was a cache hit rate whose Anthropic value pools two protocol paths, not a solve-rate anomaly;
haiku's re-run stays parked because 40 paired tasks cannot carry its effect; and the collector now
reads rule 9 the same way the analysis does.
