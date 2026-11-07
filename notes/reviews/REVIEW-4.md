# REVIEW-4 — hostile review of PAPER.md as it stands

Produced by thirteen parallel review passes over the paper, its records, and its tools. Every number
below was re-derived from the shipped JSONs or by re-running the named command; nothing was taken
from a document's word. All tool runs and scripts are under `results/_scratch/review4/`.
The command battery: `node --test "tools/*.test.mjs"` → 268 pass / 0 fail (35 files);
`node tools/artifact.mjs --verify` → exit 0, "VERIFIED: 77 files"; `replication-verdict`,
`position-adjust` (both suites), `panel-analysis --datasets batchb`, `ablations` all exit 0 and
match the paper's tables. The tools run green. The failures are in the paper's text.

## Numbers fixed in PAPER.md during this review

The standing exception applies: mechanically wrong numbers were fixed, not merely reported. Each was
confirmed against the checksummed source before editing.

1. **§3.9 B: "GLM negative on both" seeds was false.** The ablation JSON's batch-1 GLM seed-2 CI is
   [-58.7, +5.1] — contains zero, i.e. null under the paper's own rule (and the sentence that would
   have revealed the filed R1 target "GLM negative" holds on one seed of two). Now reads "negative
   on seed 1 but null on seed 2".
2. **§3.8: "H1's own filed hypothesis (b1 > 0) is refuted in both suites" was false for batch 1.**
   The filed decision rule, §3.7's own table, and the source JSON all say batch-1 is INCONCLUSIVE
   (b1 = +0.00467 [-0.00551, +0.01568]). Now reads "refuted on tasks-b and inconclusive on batch 1".
3. **§3.4: "76% on the published seven-model population" misquoted the paper's own designated
   witness.** `analysis/panel-analysis.json` (the manifest's "only witness") computes 47 ties of 63
   pairs = **74.6%** (16 `distinct: true` rows; the FINDINGS F35 hand-count of 48 is verifiably false
   of that file). Corrected to 74.6% and the trend clause it carried ("it is not shrinking as models
   are added") deleted — 86.1% → 74.6% as models went 4 → 7 is a shrink.
4. **Header: "seven outputs" / "76 files" were stale by one** since the ablations commit (`9ccf074`).
   The manifest has eight replication outputs; `--verify` prints 77 files. Corrected.
5. **§3.8: "luna's and DeepSeek's widen slightly" misdescribed the table above it.** On the log
   basis DeepSeek's gap narrows 21.9 → 16.3 and Qwen's widens 25.0 → 28.4. Now reads "luna's and
   Qwen's widen, and DeepSeek's narrows".
6. **§3.8: "R1 = 0, 1, 1, 1 of 4 under the four consistent readings" had a phantom fourth reading.**
   Three consistent bases exist on disk (raw; adjusted log; adjusted additive) and they give 0, 1, 1.
   Corrected.
7. **§3.1's adjusted table quoted two decimals it did not have.** All 36 values were the tool's 1dp
   output with a padded zero; 34 of 36 second decimals disagreed with the shipped JSON. The table
   and every inline use are re-rendered at true 2dp from
   `analysis/position-adjust-6model-2026-10-09.json`, and the derived figures recomputed from exact
   values: 59.4 → **59.5**, 75.0 → **75.1**, 38.8 → **38.9** (79.2% and +29.9% survive exact
   recomputation).
8. **§3.7: "+0.133 … opposite to the pooled estimate" contradicted itself** — the six-model pooled
   estimate is +0.00467, same sign. Now reads "opposite in sign to the four-provider pooled
   estimate".
9. **§2/§6 pre-registration citations:** "amendments 12-22" → 12-23 (the file numbers 23; 21-23
   post-date the `prereg-v5` tag — verified: the tag contains none of §12.8/§12.9/§12.10); "amended
   22 times" → 23; the freeze sentence corrected for v4 (v1-v3 named commits that did not contain
   them; v4 tagged a text it then edited — verified against `git show prereg-v4`).

Everything else below is an objection, not an edit.

---

## Objections, ranked by damage

### 1. §3.3's "cross-harness claim in its cleanest form" is a pooling artefact — the external arms' retention does not exist in the archive

- **Claim attacked:** §3.3 table: haiku DSH arms "0.994 / 1.000" vs external harnesses "**0.560**",
  sonnet "1.000 / 1.000" vs "**0.451**"; and "**The external harnesses keep roughly half the
  cacheable prefix the DSH arms keep** - a ~2x harness effect on precisely the quantity that drives
  cache cost … This is the paper's cross-harness claim in its cleanest form" (§3.3).
- **Objection:** The prefix-retention tool reports **exactly 0.0000** for all four external
  harnesses on both Anthropic models — their cache split is `null` in the archive (limitation 7's
  own open defect) and the tool codes `null` as 0 (`tools/prefix-retention.mjs:67`,
  `cacheHitTokens ?? 0`). The 0.560/0.451 exist only because `armClass()` maps *everything* that is
  not `dsh:ptc`/`dsh:native` to "external" — including the four DSH opt/terse arms, whose retention
  is a real ~0.994-1.000. The "external" bucket is 8 arms × 62 cells = **496 runs** (the JSON itself
  says `runs: 496`; four external harnesses would be 248). Decomposition, continuation-weighted:
  haiku 4,211 continuations at 0.0000 + 5,380 at ~0.9977 → **0.5595** (matches the shipped JSON to
  four decimals); sonnet 1,828 at 0.0000 + 1,505 at ~0.9998 → **0.4515**. So the claim the paper
  calls "its cleanest form" compares real DSH measurements against a pooled default that is half
  DSH arms. The defect record's blessing — "The external-harness retention figures (0.560 Haiku,
  0.451 Sonnet) do not depend on this defect" (`notes/defects/DEFECT-anthropic-external-costs.md:96-97`) — is
  false: they ARE the defect, at 56%/44% dilution. notes/records/FINDINGS.md:1160 repeats "~2x harness effect
  measured without the broken field"; the broken field is the entire external component. The paper
  itself states the truth twice: limitation 7 ("the archive does not record the cache split") and
  §4 ("a 0% hit rate there can measure the measurement path rather than the harness"). §8 names
  §3.3 load-bearing ("with §3.3 the cross-harness mechanism"). At a journal this loses the whole
  section, and it is the section the paper can least afford to lose.
- **On disk:** `node results/_scratch/review4/retention-audit.mjs` (re-runs the tool's own
  `analyse()` and splits by arm): all four external harnesses 0.0000 on both models; all four DSH
  opt/terse arms 0.9938-0.9998. Nothing anywhere answers it.
- **Verdict:** not answered — contradicted by the paper's own limitation 7 and §4 novelty item 4.
- **Cheapest fix:** none exists on disk that preserves the claim — the archive cannot yield
  external-harness retention on Anthropic. Withdraw the 0.560/0.451 column and restate §3.3 as:
  DSH-arm retention on Anthropic is 0.994-1.000 (measured); external-harness retention is
  unmeasurable on the OpenAI-compatible path (the protocol-path point §4 already makes). That costs
  the paper its "cleanest form"; keeping it costs the paper a section at review.

### 2. Sonnet's batch-1 "interval excludes zero" is a Monte Carlo artefact — at the estimand, the interval contains zero

- **Claim attacked:** §3.1 table: "| Claude Sonnet 5.5 | 5.00 | +9.51% | [+0.28, +17.90] |"; the
  shipped `analysis/panel-analysis-6model-2026-10-03.json` A2 row `"excludesZero": true`;
  METHODS.md:434's "fail despite bootstrap intervals that exclude zero".
- **Objection:** Every CI in the study comes from one function: a percentile cluster bootstrap at
  **B = 5,000 with seed 12345 hardcoded** (`tools/stats.mjs:35`). Across 40 perturbation seeds at
  the shipped B, Sonnet's lower bound lands below zero in **25 of 40 seeds** (sd 0.21pp, range
  [-0.473, +0.325]). Raising B settles it: at B = 2,000,000, lo = **−0.065%** — twelve seconds of
  compute. The bootstrap distribution's own 2.5th percentile is negative; the shipped seed happened
  to draw it +0.34pp high. The study's own sign-flip test — p = 0.0512, reported *with* its MC
  error — agrees with the large-B bootstrap, not with the filed CI. At a journal this moves a
  referee from "major revision" to "reject": a number in the primary results table is wrong in the
  direction of the paper's thesis, and the wrongness sits inside the study's own estimator,
  reachable in twelve seconds. The prose withdrawal in §3.1 ("Sonnet's '+9.51%, excludes zero' does
  not survive as stated") covers the *position-scale* reason only; the table row, the JSON flag,
  METHODS.md:434, and §3.9's "Sonnet +10.9% [+0.6, +20.1] (positive) on seed 2" (whose lower bound
  flips in 16/40 seeds) all still assert or depend on the raw exclusion. The same disease, one
  paragraph earlier and later: the R1 knife edge (objection 5) and the A8 tie count (objection 10).
- **On disk:** nothing answers it. The only seed-robustness check in the repo covers the
  *withdrawn* position estimator, not A2 (`notes/defects/DEFECT-position-confound-2026-10-04.md:117-118`). This
  review's rerun: `node results/_scratch/review4/mc-seed-sweep.mjs` (validated by reproducing every
  shipped target to the last digit at seed 12345); decisive lines:
  `A2 batch1 claude-sonnet-5.5 lo shipped=0.2790 jitter sd=0.2071 range [-0.473, 0.325]` and
  `batch1 claude-sonnet-5.5 shipped=positive holds 15/40`.
- **Verdict:** not answered.
- **Cheapest fix:** re-file the A2/A8 tables at B ≥ 200,000 (measured: ~1.6 s per contrast), state
  B, method and seed in METHODS §7 and beside each table. Sonnet's raw row then reads ≈ [-0.1,
  +17.9] — contains zero — and the prose withdrawal already written absorbs it; delete
  `excludesZero: true` and reconcile METHODS.md:434 (the "despite" disappears: the bootstrap agrees
  with p = 0.0512).

### 3. The confirmatory win's leave-one-out was run on the wrong suite — on batch-1, H3 is null without luna

- **Claim attacked:** §3.9 D: "**Is the one confirmatory win carried by one provider?** No. H3 …
  survives leave-one-provider-out on all four pre-registered tasks-b datasets … every interval
  excluding zero." §3.5: "**Supported: +2.228 requests [+1.234, +3.328], n = 744 cells** … The sign
  and the significance replicate across suites and across the removal of any provider."
- **Objection:** The headline H3 number is a **batch-1** estimate. The leave-one-provider-out test
  was run only on tasks-b — the suite where the pooled effect is 3.76× larger (8.378 vs 2.228) and
  therefore hardest to kill. Running the filed tool exactly as §3.9 D prescribes on the six
  restricted batch-1 selections: dropping DeepSeek, GLM, Qwen, haiku or Sonnet leaves the interval
  above zero, but **dropping gpt-6-luna gives b1 = +1.010 [-0.087, +2.177], n = 620 — the interval
  contains zero.** On the suite the headline comes from, the answer to §3.9 D's own question is
  yes: the one confirmatory win is carried by one provider — and by luna, the same model whose
  §3.1/§3.8 classification the paper concedes flips with the arm string (§3.9 A). "The sign and the
  significance replicate … across the removal of any provider" is, read to include batch-1's
  providers, false. At a journal this is a major-revision-minimum finding: the ablation built to
  ask "is X carried by one provider?" was executed only on the dataset where the answer is
  convenient, and the one-command extension that answers it on the headline dataset contradicts the
  printed "No."
- **On disk:** nothing answers it — the hypotheses JSON has no leave-one-out for H3. This review
  ran the missing analysis with the filed tool (zero cost, explicit `--json` under
  `results/_scratch/`): `results/_scratch/review4/h3-b1-*.json`, six files, figures quoted above;
  the pooled batch-1 check reproduces §3.5 exactly (n = 744, b1 = 2.2285 [1.234, 3.328]).
- **Verdict:** not answered — and the unanswered experiment contradicts §3.9 D's "No" on the suite
  §3.5's headline comes from.
- **Cheapest fix:** the six commands above (already run). Report batch-1 LOO beside the tasks-b
  LOO and reword §3.5's last clause to "across the removal of any tasks-b provider; on batch-1 the
  pooled estimate is null without gpt-6-luna (+1.010 [-0.087, +2.177])."

### 4. "Provider-specific" is aliased with "model-specific" — and the paper's own adjusted table refutes it: 65% of the entire spread sits inside ONE provider

- **Claim attacked:** §3.1 title ("The code-mode penalty is large, **provider-specific**, and not a
  price-ratio effect"); §3.1a claim 1; §3.4 title ("Harness rankings do not transfer **between
  providers**"); §8's tiering sentence; the framing question itself ("why does the answer change
  with the provider?").
- **Objection:** The design runs one model per provider for four of five providers. Every
  "provider effect" is confounded with a model effect, and the paper offers no separation —
  "model-specific" appears **zero** times in PAPER.md. This would be a wording objection alone, but
  the paper's own numbers make it a factual one. The only within-provider contrast the design
  contains — haiku vs sonnet, same provider, same price card, same gateway flags — spans **49.1
  adjusted points** (66.13 − 17.02, log scale), i.e. **65.4% of the entire 75.1-point
  between-"provider" spread sits inside a single provider**. The paper trumpets the parallel ratio
  computation as its strongest result ("79.2% of the entire between-model spread sits inside one
  ratio value", §3.1a) and never computes the identical statistic for the provider axis, where it
  destroys the section's adjective. By the paper's own logic the operative unit of variation is the
  model, not the provider. At a journal this kills §3.1a claim 1 and the §8 tiering sentence as
  written.
- **On disk:** `analysis/position-adjust-6model-2026-10-09.json` (66.13, 17.02);
  `grep -c 'model-specific' PAPER.md` → 0. The only within-provider separator on disk (A1b
  haiku-sonnet rho = 0.952) is itself contaminated — on the six fully-priced DSH arms it is 0.771 —
  and rank agreement says nothing about the penalty-magnitude claim.
- **Verdict:** not answered.
- **Cheapest fix:** reword "provider-specific" → "model-specific" throughout, and print the
  within-provider spread beside the within-ratio spread in §3.1a: "two models on one provider span
  49.1 of the 75.1 points, so the variation is not between providers." §3.2's cache-regime claim is
  the one genuinely provider-level statement and may keep the word, with objection 16's caveat.

### 5. The R1 0-of-4 knife edge is decided by the RNG seed — and the bootstrap's B, method and seed are filed nowhere, reported nowhere, configurable nowhere

- **Claim attacked:** §3.8: "**R1 fails, 0 of 4.**"; "**It turns on 0.04 of a point, so it has to be
  computed rather than read.** GLM's interval ends at **+0.0405%** … precisely so this cannot be
  rounded away."; "R1 … **holds for 0 of 4 on every basis**".
- **Objection:** The computation the paper trusts to settle the knife edge is the coin flip. At
  the shipped B = 5,000 the upper endpoint's seed-to-seed sd is **0.21pp — five times the 0.0405pp
  margin**; across 40 seeds it ranges [−0.347, +0.609] and goes negative in 11. Under those 11
  seeds GLM classifies "negative", matches its batch-1 filing, and R1 reads **1 of 4** (verified by
  applying the filed `classify` rule per seed; the other three providers never flip). Two
  consequences. (a) "Holds for 0 of 4 on every basis" is false — it holds in 30 of 41 draws. The
  NOT REPLICATED label does survive 41/41 seeds (R2 never passes), but a pre-registered mechanical
  rule whose output is a random variable with a 27.5% flip probability is presented as
  deterministic. (b) The paragraph's framing — rounding is the risk, computing is the fix —
  misidentifies the failure mode: two-decimal printing guards against rounding; nothing guards
  against Monte Carlo error, and the paper discloses none. The deeper defect: the bootstrap's
  construction is **pre-registered nowhere, reported nowhere, and configurable nowhere** —
  `tools/stats.mjs:35` hardcodes `{ iters = 5000, seed = 12345 }`, no tool accepts `--seed`, no env
  var is read, METHODS §7 never mentions B or the percentile method, PRE-REGISTRATION.md:91 says
  "the bootstrap 95% CI" full stop. In a repository whose own history contains two published
  numbers changed by RNG defects, every interval in the paper inherits one arbitrary, undocumented
  draw — and a referee cannot reproduce +0.0405% from any document without reading the source
  default. (At B = 2,000,000 the endpoint's estimand is **+0.123%**: the null is the *correct*
  call, corroborated by the sign-flip p = 0.0718 — the study simply cannot see that from B = 5,000
  and never looked.)
- **On disk:** `analysis/replication-verdict-batchb-2026-10-09.json` records the knife-edge flag
  and no error around it. This review: `mc-seed-sweep.json` — `crosses 0 in 11/40 seeds`; verdict
  sweep `{ "R1 0/4": 30, "R1 1/4": 11 }`; large-B checks quoted above.
- **Verdict:** not answered.
- **Cheapest fix:** recompute the four tasks-b intervals at B = 2,000,000 (12 s each), report
  GLM's bound as ≈ +0.12%, and reword: "0 of 4 at the filed draw; GLM's upper bound sits within
  Monte Carlo error of zero at B = 5,000 (endpoint sd 0.21pp), so the R1 count is 0-1 of 4 across
  reseeds; the verdict is unchanged on every basis." Extend the existing `knifeEdge` predicate from
  "< 0.5pp from zero" to "< 2 Monte Carlo sd from zero", and state B/method/seed in METHODS §7.

### 6. Every adjusted number rests on a common-position-effect assumption that PAPER.md never discloses, the defect record lists as still owed — and the design cannot test it

- **Claim attacked:** §3.1: "**The second table is the same contrast with the execution-order
  confound removed** … the estimate comes from a model of the within-block paired difference,
  `d = c_ptc - c_native = alpha + [f(p_ptc) - f(p_native)]`, with `f` a step function over the ten
  positions." One `f`, shared by both arms.
- **Objection:** The estimator assumes the position effect is *identical* for the two arms. If it
  differs by arm, `alpha` absorbs the difference and the whole adjusted table is biased by
  construction. This is not a hypothetical: the paper's own limitation 9 establishes that the two
  arms' first requests differ by 30 bytes, "enough to move a cache hit", and the measured mechanism
  for position cost *is* caching (`notes/defects/DEFECT-position-confound-2026-10-04.md` §2). The arms are
  cache-distinguishable, so their interaction with block position — a cache-state variable — is
  plausibly different; the adjustment assumes away exactly the interaction the rest of the paper
  documents. The defect record admits the check is outstanding: "Still owed: a settlement of the
  functional form, **and a check on whether `f` differs by arm**"
  (`notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md` §5(4)). PAPER.md contains no mention.
  Worse, the design *cannot* run the check: the arm-specific form (18 position parameters +
  intercept on 62 blocks) gives `alpha` standard errors of 0.27-0.53 log units (≈ ±32-70%) per
  model and absurd swings (GLM −8.9% → +38.5%; Qwen +35.3% → −34.7%). So the assumption is
  unfalsifiable on this data: the only identifiable adjustment is the one that assumes common `f`,
  and "the confound removed" should read "the confound modelled under an assumption the data cannot
  check". At a journal this is the difference between a correction and a modelling choice — and
  §3.1's table, §3.1a's restated claims, and §3.8's "confound is not the cause" argument all quote
  it as the former.
- **On disk:** the admission exists only in the defect record. The §3b "independent corroboration"
  (slot fixed-effect regression, +52.97% vs +51.79%) uses a single slot effect too — it
  corroborates the implementation, not the assumption. This review's demonstration:
  `results/_scratch/review4/arm-specific-f.mjs`.
- **Verdict:** not answered.
- **Cheapest fix:** one sentence in limitation 8 naming the common-`f` assumption, stating that the
  design cannot test it (18 parameters, 62 blocks, SE ≈ ±40%+), and changing §3.1's "removed" to
  "modelled under a common-position-effect assumption".

### 7. The replication was aimed at the withdrawn target — and its softening decomposition is log-scale-only against the study's own both-scales rule

- **Claim attacked:** §3.8's title and bold verdict; the closing frame ("§3.1a restates the section
  accordingly, and the restated claim is the one this replication is a test of"); the decomposition
  table and "**Two of the four failures are divergences the data separate; two are not**";
  "DeepSeek genuinely differs under both arm pairs."
- **Objection:** Three basis problems the paper never states plainly. (i) R1's targets were filed
  2026-10-03 on the **raw** batch-1 classifications; under the paper's own correction GLM's batch-1
  differential is null on both adjusted scales — so the sign-disagreement pattern R2 encodes is
  **absent from batch-1 itself** under either adjusted basis (adjusted batch-1: Qwen positive, GLM
  null, luna null, DeepSeek null; no adjusted basis yields a batch-1 negative). "NOT REPLICATED"
  measures the distance between tasks-b and a target the paper no longer believes existed, and the
  closing sentence contradicts the section's own definition of R2: if the replication tests the
  restated (magnitude) claim and fails, the restated claim failed; if it tests the withdrawn sign
  reading, the sentence is false. (ii) The decomposition table is adjusted-**log**, unlabeled. On
  the additive scale, recomputed from the two position-adjust JSONs: luna's suites overlap by
  1.55pp, DeepSeek's by 0.09pp — **zero of four pairs separate**, and the mean absolute gap
  **rises** 18.8 → 19.5pp. "Two divergences the data separate" and "2 of 4 on both bases" are true
  only on the scale the paper silently chose, against the verdict document's own rule ("Both scales
  are reported everywhere … neither is called *the* adjusted number"). (iii) "DeepSeek genuinely
  differs under both arm pairs" fails the like-for-like variant comparison: batch-1 DeepSeek
  variant is −10.1% [−24.0, +1.5] (`analysis/ablations-2026-10-09.json`), which **overlaps** the
  tasks-b variant [−29.8, −10.4] by 13.6pp. The robust-divergence count is convention-dependent:
  variant-vs-variant gives zero; the paper's unstated variant-vs-primary convention gives one, at
  0.32pp of daylight — below the paper's own 0.5pp knife-edge threshold.
- **On disk:** `analysis/position-adjust-*-2026-10-09.json`; `analysis/ablations-2026-10-09.json`;
  REPLICATION-VERDICT §3b concedes adjusted R1 = 1 of 4 and "the verdict is robust; the target is
  not" — but nowhere states that R2 fails on batch-1 itself under the adjusted bases.
- **Verdict:** not answered.
- **Cheapest fix:** retitle §3.8 "The pre-registered replication of the filed (raw) classifications
  failed"; state the target's basis-dependence and R2-on-batch-1 in the first paragraph; label the
  decomposition table "log scale" and print the additive pair beside it; name the divergence
  comparison convention or downgrade to "one divergence on the primary pair at 0.6pp of daylight".

### 8. The haiku extension row conceals a +62.4% cost-per-solved-task penalty behind a per-cell +6.2% null — the ratified plan's own guard is unapplied, and the filed extension verdict is delivered nowhere

- **Claim attacked:** §3.8's only sentence about the Anthropic extension: "Anthropic is excluded by
  the filing ("No Anthropic"), so haiku and sonnet were collected afterwards as an extension and
  cannot move the verdict." The row itself lives only in `notes/records/REPLICATION-VERDICT-2026-10-09.md` §5:
  "| Claude Haiku 4.5 | null | [−7.02%, +19.58%] | **18** |" — with no companion figure.
- **Objection:** The ratified plan decided this exact point before the full matrix existed:
  `tasks-b/PLAN.md` §7 — "the Haiku extension row is **quality-confounded by the plan's own §5
  guard**: the cost contrast must be reported beside cost per solved task, and the per-cell figure
  is not the headline — $0.3109 against $0.5921 per solved task is." The full matrix reproduces the
  confound almost exactly, re-derived from the panel: `dsh:native` solves 26/36 (72.2%) against
  `dsh:ptc`'s 17/36 (47.2%); per-cell +6.2% (the reported number) becomes **+62.4% per solved
  task** ($0.3948 vs $0.6412); paired over all 80 (task, seed) pairs the discordant count is
  10-of-11 favouring native (exact McNemar p = 0.0117). The row stands on **18 of 40 tasks**
  because the account hit its monthly limit mid-matrix: **447 of 800 records excluded**, the 18
  surviving tasks whichever ran before the outage — not a random subset — and the re-run parked by
  the author's decision. The study applies this guard elsewhere (FINDINGS F48: "zero discordant
  pairs, exact McNemar p = 1, so no quality confound is possible"). And PLAN Amendment 1 §9.1 files
  a mechanical extension verdict — classification matches its batch-1 row or it is "extension row
  not replicated, naming the model": haiku positive → null, sonnet positive → null, **both fail,
  and no document — not the paper, not the verdict doc, not FINDINGS — delivers or even mentions
  this verdict**. "Cannot move the verdict" is true of R1/R2 and false of §9.1's own per-model
  rule. A referee who opens the cited, checksummed plan finds a ratified rule violated in the
  verdict document and rendered moot in the paper by the row's complete omission — on the one
  tasks-b row that leans positive, measured on a rate-limit-culled 45% subset of its design.
- **On disk:** `tasks-b/PLAN.md:236-238, 277-279`; `buildPanel` meta `{rows: 800, excluded: 312,
  statusExcluded: 135, cells: 353}`; `notes/handovers/HANDOVER-2026-10-09.md` §4 (the outage, the parked re-run);
  re-derivation in `results/_scratch/review4/test-editing.md` §1.
- **Verdict:** not answered.
- **Cheapest fix:** report the extension rows in §3.8 with the paired-task count, the outage, the
  per-arm solve rates, and per-solved-task cost beside per-cell — all on disk — and deliver the
  §9.1 verdict; or declare the haiku extension matrix unanalysable at filed size and the row
  descriptive only, quoting PLAN §7's own guard.

### 9. The missing noise floor: the size partition the paper never did condemns its small claims — and the stated reason for having no placebo is unverifiable, disputed by the study's own third review, and cost ≈$1 to fix

- **Claim attacked:** §4's deficiency paragraph and limitation 9 ("30 bytes, six copies of the
  arm-id string, which is enough to move a cache hit"; "one deficiency that we could not repair").
- **Objection:** (i) **The partition.** The study's inferential spine bounds sampling variance
  only; a placebo bounds systematic error, and this study's own record shows its systematic error
  reached **46.2%** (a real treatment effect published as noise) and ≥34% position bias inside the
  withdrawn 7.7% (notes/reviews/REVIEW-2.md:25). Against the only external anchor it cites — Hu et al., per-cell
  cost CVs 2.4-8.4%, each estimated from n = 3 runs (95% CI on a CV from three observations ≈
  [0.52x, 6.3x]) and a *variance* anchor cited beside a *bias*-control gap (notes/literature/LITERATURE-3.md:105's
  "same estimand" is false as stated) — the claims partition as follows. Safe: the 75.1-point
  spread, haiku +66.13%, Qwen +35.35%. **Within ~one noise CV of zero: Sonnet +9.51% raw (CI floor
  +0.28 ≈ 0.1× the band's bottom) and GLM −8.92% adjusted. Inside its own sampling noise: the
  tie-fraction suite gap (13.0pp, z ≈ 1.45) — suite identity moves the headline statistic more than
  model identity does (leave-one-out 71.1-80.0% vs tasks-b 61.1%).** Unquantified: H3's +2.228 is
  +16.4% of a re-derived 13.56-requests base, with two of six providers flat per model (Qwen +0.08,
  haiku −0.15 — unreported). The paper partitions none of this; the large claim silently vouches
  for the small ones. (ii) **The 30-byte sentence is the entire stated reason no control exists,
  and it cannot be checked.** The sham ds-full's runs.jsonl was overwritten by the 2026-10-02
  re-collection and never committed; no deepseek gateway log survives from 2026-09-30; the recovery
  directory contains no placebo record. And the repo's own third review records the claim as wrong
  in detail: "the placebo '+30 bytes/six copies' undercount (the two starter requests differ by +30
  and +20 — 50 bytes/ten copies total — and the literal first-request claim fails for 12/62 ptc
  pairs)" (notes/reviews/REVIEW-3.md:246), "the six-copies-in-the-path claim is not [verified]" (:259). "Enough
  to move a cache hit" is an unmeasured mechanism: the copy locations are unverified and one sits
  near the *end* of the cacheable prefix, where a prefix cache still hits everything upstream.
  (iii) **"Could not repair" is asserted, never justified, and the arithmetic makes it
  indefensible.** A corrected A/A pair (124 runs) costs ≈ **$0.99** on DeepSeek, ≈ $5.25 on all
  four cheap providers — ≤ 4.2% of the $124.95 total spend. tasks-b/PLAN — filed after the 46.2%
  floor was already voided — filed 10 arms with no A/A arm while routinely running 160-cell
  smoke matrices at exactly placebo scale; notes/literature/LITERATURE-2.md:437 recommended re-running it; no
  document says why it was not run. (iv) The register still sells the withdrawn floor as live:
  F40(a)'s "identically-treated arms … now measured rather than assumed" and F41's "the study's
  cleanest novelty … the noise floor is 7.7%" stand unretracted beside F29's own retraction.
- **On disk:** `placebo: []` and `noiseFloorPct: null` in all four current panels; the withdrawn
  figures (STEP2-RECONCILIATION §7.6; FINDINGS F29); `git log --all -- results/ds-full/runs.jsonl`
  (one commit only); notes/reviews/REVIEW-2.md:25-26; notes/reviews/REVIEW-3.md:246,259; per-run costs from §3.6.
- **Verdict:** not answered (the partition, the mechanism claim, the absent reason); **cannot be
  answered from this repo** (the byte count).
- **Cheapest fix:** print the seed-split sensitivity as an explicit per-contrast noise statement
  (the numbers are already in §3.9 B); cite REVIEW-3's correction beside the byte claim and demote
  "enough to move a cache hit" to "may"; one sentence in limitation 9 stating the actual reason the
  placebo was not re-run — or the honest one: it cost under 5% of spend and was not run.

### 10. §3.4's tie fraction: the cross-harness cell is a coin flip on tasks-b, the within-DSH ties are trivial by construction, and 8 of the 54 pairs are priced by a convention the defect record marks "do not publish"

- **Claim attacked:** §3.4: "**Adjacent rank steps (A8): 40 of 54 pairs are statistically
  indistinguishable - 74.1%.**"; §3.9 C: "the tie fraction is far higher *within* the DSH arms —
  **85.7% batch-1, 100% tasks-b** — than across the external harnesses (50% on both). Where the
  arms differ only in presentation, adjacent cost steps are essentially unorderable."
- **Objection:** The 54 pairs decompose into four cells and the paper quotes the two flattering
  extremes (recomputed from `A8.details` of both filed panels): DSH×DSH 12/14 = 85.7% and 16/16 =
  100%; EXT×EXT 5/10 and 6/12 = 50%; **the DSH×EXT cross cell — the only cell that directly
  measures whether DSH and external-harness orderings separate, i.e. the section's actual claim —
  is 85.7% (12/14) on batch-1 but 50.0% (6/12) on tasks-b: a coin flip on the replication suite**;
  pairs involving -terse arms 68.8% vs 35.7%. The within-DSH ties are ties by construction (arms
  differing in one prompt suffix, adjacent in cost *because* near-identical). Excluding them:
  70.0% batch-1 vs **44.7% tasks-b** — on the second suite a majority of the non-trivial adjacent
  steps *are* orderable. "Harness rankings do not transfer" is supported on one suite and
  unsupported on the other, and §3.9 C's two-cell quote conceals precisely that. Further, A8 ranks
  arms by mean `costBilled`, and the 248 unknown-split cells per Anthropic matrix are charged at
  the miss-rate upper bound — which the DEFECT's contamination list names "Contaminated (do not
  publish)" for exactly these pairs: **8 of the 54 pairs (3 of the 40 ties)**, with miss-pricing
  manufacturing "distinct" verdicts up to +165.1%. The uncontaminated restatement is 37/46 =
  **80.4%** (four fully-priced matrices: 86.1% batch-1, 66.7% tasks-b) — the correction strengthens
  the claim, but a statistic whose own artifact record says "do not publish" for 8 of its 54
  summands cannot stand as printed, and the §3.9 leave-one-out ablation cannot see it (dropping one
  Anthropic model leaves the other). Same statistic, same root cause, cited twice: the refuted
  pricing also supplies §3.4's "further evidence" bullet. Also on the record: "40" is the top of
  the count's seed distribution (39 in 25 of 40 reseeds — the printed 74.1% is the most favourable
  draw), and the 13.0pp suite gap is 1.45 binomial SEs.
- **On disk:** `A8.details` of both panels (decomposition recomputed, quoted above);
  `notes/defects/DEFECT-anthropic-external-costs.md:88`; `analysis/ablations-2026-10-09.json` (the two quoted
  cells match: 12/14, 5/10, 16/16, 6/12); `mc-seed-sweep.json` (`a8.batch1.tiesBySeed`: min 39,
  max 40).
- **Verdict:** not answered.
- **Cheapest fix:** report the full 2×2+terse decomposition and the 46-clean-pair figure ("A8 pairs
  involving an external Anthropic arm price that arm at the miss-rate upper bound; excluding those
  8 pairs the tie fraction is 80.4% (37/46)"); scope the practical statement per suite
  (cross-harness tie fraction 85.7% batch-1 vs 50.0% tasks-b); drop "further evidence".

### 11. §3.7 disguises a contradiction between the paper's own two inferential machines as a multiplicity effect

- **Claim attacked:** §3.7: "Qwen's cost contrast (p = 0.0056) and Sonnet's (p = 0.0512) fail
  despite intervals excluding zero."
- **Objection:** The sentence lumps two failures with different causes and names neither. Qwen:
  p = 0.0056 < 0.05 — significant unadjusted, killed only by Holm (threshold 0.003125). Coherent.
  Sonnet: p = 0.0512 **> 0.05 — it fails the *uncorrected* test**, so Holm is irrelevant to it,
  while its 95% CI in the same filed JSON excludes zero. The two machines are different procedures
  (percentile cluster bootstrap vs sign-flip permutation), and on the study's most borderline
  contrast they flatly contradict each other; §3.7's wording makes a reader attribute both failures
  to Holm's strictness. With objection 2, Sonnet's "positive" is now doubted by three of the
  paper's machines (the sign-flip test, the additive scale, the large-B bootstrap) and affirmed by
  one (the log-scale bootstrap CI at one seed). A Reviewer-2 kill shot on inferential hygiene, with
  a number attached.
- **On disk:** the numbers are as quoted (`analysis/panel-analysis-6model-2026-10-03.json` A2/A2b;
  the re-run prints Sonnet "perm p 0.0512"); METHODS.md:425-434 names both procedures and repeats
  the same sentence without reconciling them. Also on the record: §3.7 omits the filed
  narrow-reading sensitivity under which **Qwen's contrast survives** (A2b 2 of 6, α/5 = 0.01) —
  the section whose job is epistemic hygiene presents a reading-dependent verdict as fact.
- **Verdict:** not answered.
- **Cheapest fix:** one clause — "intervals are the percentile bootstrap used for classification;
  p-values are sign-flip permutation; the two disagree on Sonnet's borderline contrast, which fails
  even unadjusted (p = 0.0512) — only Qwen's failure is a multiplicity effect" — plus the
  narrow-reading parenthetical. Stronger: put a bootstrap p-value in the family so one machine
  classifies and tests.

### 12. Limitation 7's "bounded" re-pricing is computed on a different suite — and on the batch-1 matrices the sonnet immunity claim is false

- **Claim attacked:** §3.4: "Sonnet does not move at all (mean shift **0.00**); its external arms
  stay dearer than the cheapest DSH arm under every pricing." Limitation 7: "Re-pricing **the same
  runs and the same tokens** three ways — … the cheapest arm on **sonnet is a DSH arm under all
  three, with a mean rank shift of 0.00**".
- **Objection:** The only producing script on disk computes the three-way re-pricing on the
  **tasks-b extension** matrices, not on `haiku-full`/`sonnet-full` — while limitation 7's "the
  same runs and the same tokens" points at the batch-1 defect's 6,772 requests. Re-running the
  identical estimator on batch-1 (free): sonnet's cheapest arm at the hit-rate reading is **goose
  at $0.0549/run — 26% cheaper than the cheapest DSH arm ($0.0741)**, mean rank shift 2.60
  (upper→lower) / 0.40 (upper→matched); "Sonnet does not move at all" and "external arms stay
  dearer … under every pricing" are both false there. Even on tasks-b, sonnet's upper→lower shift
  is **1.00**, not 0.00 — the 0.00 is the upper→*matched* figure, printed beside haiku's
  upper→*lower* 4.2: two different bases in one sentence. And the haiku 4.2 itself rests on the
  353/800-cell partial matrix (objection 8). A limitation whose function is to convince the
  reviewer the confound is sized and bounded contains numbers attached to the wrong matrix and a
  cherry-picked basis; for a paper whose entire pitch is measurement discipline this is the exact
  failure mode it criticises in others.
- **On disk:** `results/_scratch/a1-confoundsize.mjs` (dataset selection `['batchb-sonnet',
  'batchb-haiku']`); this review's batch-1 re-run `results/_scratch/review4/a1-batch1.mjs` (same
  estimator, `['sonnet-full','haiku-full']`, figures above). notes/handovers/HANDOVER-2026-10-09-B.md §6 item 2
  narrates the tasks-b numbers without naming the suite.
- **Verdict:** not answered.
- **Cheapest fix:** name the basis ("measured on the tasks-b extension"), report both shifts for
  both models on one basis, and either re-run on batch-1 (free — script above) or strike the sonnet
  immunity sentence. The qualitative direction (instability) survives everywhere and strengthens
  §3.4; the specific numbers as written do not.

### 13. The replication suite was collected with the known-degenerate shuffle, days AFTER the defect was documented — and no document discloses the timeline

- **Claim attacked:** limitation 8: "**Fixed forward only, 2026-10-09** … Every matrix analysed in
  this paper predates the fix and keeps its recorded assignment — re-shuffling data that exists
  would be rewriting evidence — so the limitation stands for everything reported here."
- **Objection:** The "rewriting evidence" rationale is valid only for data that existed when the
  defect was found. The batch-1 matrices did. The tasks-b replication suite **did not**: the defect
  was committed 2026-10-04 (`4be6f8a`), with the runner's own header comment already stating "all
  six matrices draw the same permutation, and cost varies 1.75x-3.82x across slots within a single
  arm"; all six tasks-b matrices were then collected **2026-10-05 → 10-08** (first-record
  timestamps, `results/batchb-*/runs.jsonl`); the one-line matrix-seed fix landed 2026-10-09, after
  collection ended. Verified on disk: all 800 (task, seed, arm) keys carry identical positions in
  all six batchb matrices (620/620 in batch-1). So the study's single confirmatory instrument — the
  pre-registered replication — was run on a randomisation documented as defective, carrying a
  measured within-arm nuisance of 1.75x-3.82x (the same order as the effects under test), shared
  across all matrices so it cannot average out between them. No document discloses that collection
  post-dates the defect: PAPER.md carries no tasks-b collection date; REPLICATION-VERDICT says only
  "tasks-b inherits the same degenerate randomisation"; HANDOVER-2026-10-05 plans the launch
  without mentioning the defect documented the previous day. At a journal, "the replication
  knowingly re-ran a defective randomisation and the paper frames it as unavoidable" is a process
  firing offence.
- **On disk:** git log (`4be6f8a` 10-04; `1d814ea` 10-09); `git show 86b85b5:tools/run-experiment.mjs`
  (the header comment); `results/_scratch/review4/posprobe.mjs` ("identical position in ALL
  matrices: 800 | differs: 0"). The verdict itself survives adjustment (REPLICATION-VERDICT §3b),
  so the *consequence* is contained; the *process* point is unanswered.
- **Verdict:** not answered.
- **Cheapest fix:** limitation 8 gains two dates and a reason: "tasks-b was collected 2026-10-05→09
  under the documented-degenerate shuffle to keep the raw design identical to batch-1; the fix
  existed as a one-line change and was not applied; the verdict is shown robust to adjustment in
  §3.8."

### 14. §4's empirical spine is misquoted or absent — the "1.8x output-verbosity" rebuttal is a PENDING two-provider finding whose own table runs the wrong way, and §4 twice cites §3.2/§3.5 for content those sections do not contain

- **Claim attacked:** §4: "output tokens rise +40% (p < 1e-9), **the same direction as the 1.8x
  output-verbosity difference we measure**"; "we address that tension in §3.2 rather than around
  it"; "Toolshed's flat accuracy across 1–128 tools (§3.5), the crossover study's equal output
  tokens (§3.2), the input-dominance finding in agentic coding (§3.2)"; novelty item 1's "with the
  ratio varied as an experimental factor rather than observed".
- **Objection:** (i) The only source for "1.8x" is FINDINGS F13 — titled "…· **PENDING**",
  committed 2026-09-29, from the two-provider five-arm phase (DeepSeek only), and absent from the
  shipped artifact (grep of every `analysis/*.json` for output-token fields: **zero hits**; the
  six-model panel contains no per-arm output-token measurement at all). Worse, the citation
  misquotes F13's own table: the 1.8x is DSH-vs-OpenCode (a between-harness difference), and on the
  paradigm contrast the crossover study is about, F13's primary pair goes the *opposite* way —
  `dsh:ptc` 12,763 vs `dsh:native` 15,084 mean output tokens (0.85x). "The same direction as the
  1.8x … we measure" is unsupported by the very finding it points at; if the equal-output objection
  stands unrebutted, §4's output-verbosity mechanism paragraph ("We treat it as a *harness*
  property … and show it is the term whose price the provider sets") has no surviving measurement
  behind "we show" — the filed test of the output-share account, H1, is INCONCLUSIVE. (ii) The
  cross-references are simply wrong: Toolshed, the crossover study, and arXiv:2604.22750 appear
  only inside §4 (verified by grep); "we cite it in the section it bears on rather than around it"
  is false in all three of its own examples. (iii) Novelty item 1's "experimental factor" is false
  of this study — the ratio is an observed covariate of six chosen cells, fully confounded with
  model and cache-discount depth (DeepSeek's off-peak cache discount is 50x; Anthropic's 10x) — and
  Liu & Han manipulated pricing *more* directly (fixed token counts, swapped schedules); what
  survives is "six cells plus a rank-transfer statistic", and the statistic is the one §3.9 demoted
  (rho 0.238 → 0.024 across suites, sign-flips leave-one-out). (iv) The shipped panel's unreported
  A1d inverts §3.4's emphasis: **dshOnly concordance 0.4667 (below a coin flip) vs externalOnly
  0.7444** — the paper's own DSH presentation variants are exactly the arms whose cost order does
  not transfer; one jq query by a reviewer produces that. (v) LITERATURE-2's must-cite list is
  entirely absent: Weinberger et al. (a *preregistered* benchmark that uses dsh itself and
  documents a zero-cache provider-route anomaly — bearing on novelty item 4 and limitation 2),
  Requesty (per-harness cache hit rates across nine coding agents), AIMultiple (names Goose, one of
  this study's four external arms, as non-caching), Strands (whose −78%/−67% split RELATED-WORK
  calls "the closest prior art to a cost decomposition" and "must be cited and answered"),
  TwinRouterBench; plus three unabsorbed corrections (LiteLLM joint-highest, not "the highest";
  Pei/Bai's 30x is run-to-run stochasticity; Claw-SWE-Bench must be pinned to v1 — v2 silently
  replaced billing-log capture with price-table reconstruction). (vi) The novelty statement is
  retrofitted: caught twice on 2026-10-09 (`git log`: §4 drafted 13:56; LITERATURE-3 falsified the
  "no published counterpart" placebo claim 15:07; commit `3671670` stripped "first A/A placebo-arm
  contrast on billed cost" 15:12, 75 minutes after drafting), and notes/literature/LITERATURE-3.md:580-585 still
  carries the killed claim as "applied".
- **On disk:** notes/records/FINDINGS.md:914-932; `git log` (times above); `git show 3671670`;
  `analysis/panel-analysis-6model-2026-03.json` A1d `{dshOnly 0.4667, externalOnly 0.7444}`;
  notes/literature/LITERATURE-2.md §2.2/§2.10/§5; notes/literature/RELATED-WORK.md [26], E.2.
- **Verdict:** not answered.
- **Cheapest fix:** delete the 1.8x sentence and the §3.2 pointer, and state plainly that this
  study does not measure a paradigm-level output-token effect (or compute per-arm output tokens
  from the archived gateway usage blocks — offline, zero spend); fix the three cross-references;
  reword novelty item 1 to drop "experimental factor"; report A1d beside A1c in §3.4; absorb the
  must-cites and the three corrections; one line in notes/literature/LITERATURE-3.md §5 recording the supersession.

### 15. One execution order for the whole study: the six matrices are not independent, and §3.4's rankings are never position-adjusted

- **Claim attacked:** §3.4's ranking statistics computed on raw costs; the implicit framing of the
  six matrices as six populations whose agreement means something independent.
- **Objection:** Verified from `runs.jsonl`: every one of the 620 (batch-1) and 800 (tasks-b)
  (task, seed, arm) keys has an identical position in all matrices. The position nuisance —
  measured at 1.75x-3.82x within a single arm, slot 0 cheapest in five of six models, `dsh:ptc` in
  slot 0 in 2 of 62 blocks — is therefore not a randomisation that averages out across the study;
  it is one fixed design structure shared by every matrix. Because each model's position-cost
  profile differs, the same fixed permutation contributes *different* arm-specific offsets in each
  matrix — a ready-made manufacturer of cross-model rank disagreement, which is §3.4's entire
  signal. The paper adjusts §3.1 and §3.8 for position but computes §3.4 (A8 ties, A1b rho, A1c
  concordance) on unadjusted costs; no position-adjusted ranking exists on disk, and
  `tools/position-adjust.mjs` fits each matrix separately — it neither models nor can repair the
  cross-matrix correlation. Whether median rho = 0.238 survives re-ranking on position-offset costs
  is unknown and unknowable from what ships. `tools/arm-order.mjs`'s own header concedes the
  objection: "no matrix can serve as an independent check on another, because they were all run in
  the same order." (One honest asymmetry: batch-1 and tasks-b drew different permutations, so the
  §3.8 cross-suite comparison escapes this; the within-suite cross-model claims do not.)
- **On disk:** `results/_scratch/review4/posprobe.mjs`; the arm-order header; no "position" anywhere
  in `tools/ablations.mjs`; DEFECT-position-confound §4's "if anything *understated*" is an
  assertion offered in place of the measurement.
- **Verdict:** not answered.
- **Cheapest fix:** re-rank each matrix on position-offset arm costs (the fitted step functions
  already exist inside `position-adjust.mjs` output) and report the adjusted tie fraction and rho
  as a sensitivity; failing that, a §3.4 caveat that all ranking statistics carry a known,
  arm-asymmetric, study-wide-shared order effect — and delete the unmeasured "understated" claim.

### 16. The "same treatment" is four different cache treatments — and the largest headline number is a function of a gateway flag that exists on one provider only

- **Claim attacked:** §3.1's cross-provider table (haiku +53.84% raw / +66.13% adjusted, the
  study's largest differential); §3.2's "Qwen is the only model whose cache is lossy under PTC";
  limitation 6's Anthropic condition.
- **Objection:** The per-provider flag table in `tools/collect-gateway.mjs` defines not one
  treatment but four cache regimes: DeepSeek and GLM get `--no-cache-breakpoints`; Qwen gets a
  gateway-injected `cache_control` on the **last tool** (2,643 archived deviations in
  `results/cmuxuqwrk-qwen-gateway.jsonl`) — i.e. the gateway marks precisely the block the
  presentation treatment manipulates (24 schemas native vs 1 PTC), so the lossy-cache reading and
  the breakpoint-placement reading are not separated anywhere on disk; luna runs `/v1/responses`,
  a path the injection code does not touch; and the two Anthropic matrices get static breakpoints
  **plus** `--auto-cache`, a top-level field that exists on no other provider — chosen by an A/B in
  which the rejected condition measured the same contrast at **+92%** (against +53.8%). The
  gateway's own source concedes the principle in a comment at the injection site: "**A gateway that
  improves the request is measuring itself.**" Under this reading the 75.1-point cross-provider
  spread is partly a spread of gateway configurations, and "the answer changes with the provider"
  may read "the answer changes with the cache-declaration shim". Claims that survive the reading:
  within-provider contrasts on the automatic-caching providers, H3, §3.3 as corrected, retention
  differences as descriptions of this setup. Claims that do not survive as stated: any sentence
  attributing cross-provider penalty differences to the providers themselves.
- **On disk:** `tools/collect-gateway.mjs:27-86`; `tools/measure-gateway.mjs:685-731`; METHODS.md §4
  (the A/B); REPLICATION-VERDICT §6.2 (treatments identical *between suites* per provider — which
  answers suite consistency, not cross-provider identity).
- **Verdict:** partly answered (the Anthropic half is disclosed, framed as a virtue; the
  four-regime reading and the Qwen tools-block interaction are nowhere stated).
- **Cheapest fix:** one sentence in §3.1 naming the four regimes and restating the cross-provider
  claims as "under per-provider gateway cache declarations"; one clause in §3.2 noting Qwen's
  marked prefix is the tools block the treatment varies.

### 17. Test editing: the ratified tasks-b monitoring exists nowhere (recorded incidence reaches 56.9%), "DeepSeek not measurable" conceals a non-random 10% look, and the paper's suite-2 defence is stale

- **Claim attacked:** limitation 3 ("Measured incidence: luna 81/620 (13.1%) … DeepSeek not
  measurable"; "Suite 2 grades against hidden cases, where this confound cannot exist by
  construction"); limitation 4 ("no cells have been collected on it"); §6's ordering bullet ("with
  the test for the sensitivity written first and watched fail").
- **Objection:** (i) tasks-b/PLAN §3 ratified, before any data existed, that
  `fixture.gradedOnEditedTests` "is still recorded on every run and **reported per arm**". It is
  recorded; it is reported in **no** analysis output, no verdict document, no handover, and not in
  PAPER.md. Recorded incidence on tasks-b: **luna 455/800 (56.9%)**, qwen 33.2%, DeepSeek 30.9%,
  Sonnet 22.6%, GLM 20.6%, haiku 2.9%. The grader claim itself checks out (hidden tests are staged
  from outside the fixture — verified in `tasks-b/_grade/run.mjs`), but the canary that would catch
  a staging defect is the flag the plan ordered reported, and nobody reported it. The incidence
  also reframes limitation 3: luna's 13.1% batch-1 rate is not a propensity ceiling — the same
  model touches the visible tests in 56.9% of runs where doing so buys nothing. (ii) "DeepSeek not
  measurable" omits the retroactive scan that found 0/62 — and 62 is **a non-random 10% survivor
  sample** of the 620 cells ("whichever workdirs the cleanup did not reach", `_ev/ds-test-edit-scan.md`;
  the honest sentence exists in PRE-REGISTRATION §12.8 and METHODS.md; PAPER.md carries the weakest
  version; ARTIFACT.md drops the frame). The genuinely exposed cell in the whole paper is §3.6's
  DeepSeek 619/620 (99.8%) — the column's best rate, with 90% of its cells never inspected.
  (iii) limitation 4's "no cells have been collected on it" is stale inside a draft whose §3.8
  reports the completed suite; METHODS.md:220's "No result in this study rests on it" is false of
  §3.8, §3.5's tasks-b magnitude, and all of §3.9. (iv) §6's "test written first and watched fail"
  has no git witness: the test, the tool, and the computed JSON all land in `662033e`; `b9cbe19`
  touches only the pre-registration, 126 seconds earlier — and luna's effect was already on disk in
  the rule commit's own parent (HANDOVER-2026-10-03 §4.1; conceded in §12.8 item 6). The commit
  order is true; the protective framing is not. (v) PLAN §7's smoke McNemar — "12 discordant, 11
  favour native (p ~ 0.006)" — does not recompute from the shipped smoke under any of six pairing
  conventions (task×seed gives 25/3, p ≈ 2.7×10⁻⁵): an irreproducible statistic in the ratified
  plan, in the section a reader is sent to for the haiku guard.
- **On disk:** tallies from `results/batchb-*/runs.jsonl`; empty greps over every batchb analysis
  JSON; the git commands in `results/_scratch/review4/test-editing.md`.
- **Verdict:** answered for luna (only §3.6's 95.0% depends on it; the surviving Haiku solve-rate
  contrast is provably immune — its one in-arms edited run is already unsolved — though that
  argument exists nowhere on disk); **not answered** for tasks-b monitoring, DeepSeek's 99.8%, the
  stale sentences, and the "watched fail" claim.
- **Cheapest fix:** one per-arm tasks-b incidence table (a ten-line script over existing flags);
  copy §12.8's own words into limitation 3 ("not measured on the record; one retroactive scan of a
  non-random 62-workdir survivor sample (10%) found 0/62"); date limitation 4; fix METHODS.md:220;
  strike "watched fail" or produce its witness; recompute the smoke McNemar (the true figure is
  stronger).

### 18. The withdrawn sign claim is still asserted as the surviving claim in the documents §6 vouches for

- **Claim attacked:** §3.1a: "**Withdrawn, explicitly:** the reading that the sign disagreement is a
  stable property of providers." §6: "Retractions stay visible: the retracted placebo verdict and
  the corrected F31/F34/F35/F37 figures are named in `notes/records/FINDINGS.md` and `notes/reviews/REVIEW-RESPONSE.md` rather
  than quietly replaced."
- **Objection:** The withdrawal never propagated to the documents the paper points readers to.
  `notes/reviews/REVIEW-RESPONSE.md:425` asserts, present tense, as its closing claim: "The claim that survives
  intact is the sign disagreement with intervals … **the code-mode cost penalty does not share a
  sign across providers**" — verbatim the withdrawn claim. `notes/records/CROSS-HARNESS.md:236` carries it as a
  live section heading ("### 8.1 The mode effect is provider-specific and **does not share a
  sign**") over the raw table whose GLM row §3.1's own correction makes null — no banner, no
  pointer — and :292 repeats the stale 76%/86% pair. METHODS.md:220 states of tasks-b: "**No result
  in this study rests on it.**" All three files were last committed 2026-10-04, and §7 certifies
  them "done … the three no longer describe a pre-data study" — true, but they describe a
  pre-withdrawal study, and the 2026-10-09 extension that withdrew the sign claim never touched
  them. At a journal this is a five-minute find: the paper's §6 says retractions are visible in
  notes/reviews/REVIEW-RESPONSE.md; the reviewer opens notes/reviews/REVIEW-RESPONSE.md and reads the retracted claim asserted
  as the study's surviving result. It converts the paper's strongest process asset (visible
  retractions) into evidence that the retraction sweep is incomplete — in the same week this
  review found four more unswept numbers (the fixes at the top).
- **On disk:** the three files and commits quoted; the withdrawal itself properly recorded in
  PAPER.md §3.1a, the DEFECT, REPLICATION-VERDICT, and HANDOVER-2026-10-09-B.
- **Verdict:** not answered.
- **Cheapest fix:** one dated banner at the top of each of notes/reviews/REVIEW-RESPONSE.md §2.5 and
  notes/records/CROSS-HARNESS.md §8.1 naming §3.1a's withdrawal (the pattern notes/records/FINDINGS.md F31/F34/F35 already
  uses), and rewrite METHODS.md:220's last sentence to the current state. No analysis needed.

### 19. The artifact's second scope is a same-day retro-fit with a hole exactly where the paper grew

- **Claim attacked:** the header: "**every number re-derivable from the shipped artifact** —
  verified by re-running all five analysis commands into a temporary directory on 2026-10-04"; and
  the coverage claim: "`tools/artifact-coverage.test.mjs` fails if … an output this paper cites is
  missing from the manifest."
- **Objection:** (a) The verification sentence covers only the 2026-10-04 scope: the second scope
  (8 outputs) was added 2026-10-09 — the same day as the claims that needed it (replication
  verdict, position-adjust, ablations). The coverage test's own header comment confesses the
  motive: "the paper's opening sentence promises that every number is re-derivable from it. **That
  gap is a reviewer's five-minute find, so it is pinned here**" — the promise preceded the
  artifact, and the artifact was extended to make the promise true. That is retro-fitting by
  definition; the saving grace is that it worked (this review re-ran all 8 extension commands:
  every output deep-identical apart from `generated`). (b) The retro-fit missed a family the paper
  cites: `analysis/mixed-effects-6model-2026-04.json` — which §3.7's "the verdict does not depend
  on whether task heterogeneity is modelled" rests on, §7 cites by name, and limitation 8 quotes
  (+52.97%) — appears **nowhere** in the manifest: no checksum, no recorded command. "Every number
  re-derivable from the shipped artifact" is false for those numbers. (c) The pin that is supposed
  to catch exactly this is hand-maintained and already behind: the coverage test's `cited` list
  omits the mixed-effects JSON, `analysis/ablations-2026-10-09.json` (§3.9's source), and the
  §3.6 cost panel — and it cannot detect the header counts going stale, which they did within
  hours. (d) The test suite (268 pass) pins the verdict, the tie counts, and one adjusted sign —
  but **no headline magnitude**: grep for 2.228 / 0.238 / the §3.1 table values across
  `tools/*.test.mjs` finds nothing; a silent change in any headline magnitude fails no test.
  (e) ARTIFACT.md still says "Built 2026-10-03", lists four datasets, and advises writing new
  outputs to the 4model paths — its documenting file is two migrations stale.
- **On disk:** `git show d469266:artifact/MANIFEST.json` (12 outputs) → `9ccf074` (13);
  `grep -c mixed artifact/MANIFEST.json` → 0; the 8-command rerun into
  `results/_scratch/review4/rerun/` (all identical).
- **Verdict:** partly answered (the numbers do re-derive — verified, not trusted; the certification
  prose and the coverage pin do not cover what the paper cites).
- **Cheapest fix:** `--extend` the mixed-effects command + output and the two missing paths into
  the manifest and the coverage list (no API spend); derive the test's cited list mechanically from
  PAPER.md citations; update ARTIFACT.md; add real-data magnitude pins beside the verdict test.

### 20. The Holm family's post-data growth is compressed into one pre-data date — and H3's correction status is not the one the filing grants

- **Claim attacked:** §6: "The Holm family was fixed on 2026-10-03 to the **filed, broad** reading
  - the one that removes our own significance - because a family chosen after seeing the effect is
  fatal at journal tier." §3.5/§8: "the one confirmatory win". §3.4: "median Spearman rho = 0.238,
  permutation p = 0.0467".
- **Objection:** (i) "The one that removes our own significance" is false of the current family —
  §3.7 itself reports two surviving stars (both Haiku); the clause describes the 2026-10-03
  four-model state (0 of 12). What was fixed on 2026-10-03 was the *rule* instantiated as m = 12;
  the family of 18 was first computed and committed on **2026-10-04**, after the Anthropic pair
  (the two surviving contrasts) was collected — the commit title admits "the family result
  changes". The enlargement was made with the new p-values in hand and is presented as part of what
  was "fixed" pre-data. Verdicts do not move under any variant, so this is pre-registration hygiene
  on exactly the sentence a journal reviewer checks first. (ii) H3's exemption is not in the
  filing: §6 of the pre-registration exempts by name only "H1 and H2"; H3 is filed "CONFIRMATORY,
  SECONDARY" and sits in no family — its uncorrected status has to be read *into* the
  pre-registration (not load-bearing: z ≈ 4.2, p ≈ 3e-5, survives any family; but the hook exists,
  and §12 contains no amendment repairing it). (iii) A1b's permutation p = 0.0467 is an
  uncorrected secondary p-value living outside the filed family — inside (m = 19) Holm stops it —
  printed without the ± 0.003 Monte Carlo error the tool itself emits (it crosses 0.05 in 2 of 11
  reseeds). The tool's own comment states the principle: "a contrast left out of the family is a
  contrast reported without the correction the filing requires" — and declares A8's exclusion
  explicitly while A1b's is declared nowhere.
- **On disk:** git evidence in `results/_scratch/review4/holm-family.md` and `process.md`
  (`0814310` 10-03 11:56; `1c66817` 10-04 07:12; the four-model JSON shows zero Anthropic rows at
  decision time); the family JSONs; the tool re-runs (m = 12 → 2 of 12; m = 18 → 2 of 18).
- **Verdict:** partly answered (the 10-03 blind reading is proven in git; the stale clause, the
  compressed date, the H3 hook, and the A1b membership are answered nowhere).
- **Cheapest fix:** reword §6 ("the family *rule* was fixed on 2026-10-03 before the Anthropic
  matrices existed; applied to six models it is m = 18, computed 2026-10-04. On four models this
  reading removed the study's only significant contrast; on six it retains two, both Haiku"); one
  sentence granting H3-H5 the single-test exemption with the p ≈ 3e-5 note; declare A1b's family
  status beside A8's, and print "p = 0.047 ± 0.003".

### 21. §3.1a quotes the log scale's numbers as *the* numbers while declaring the scale "not settled" — and on the additive scale the celebrated "strengthening" is 1.0 point

- **Claim attacked:** §3.1a claims 1-2 (75.1-point spread; 79.2% inside one ratio; "it is stronger
  after the correction than before it (70.6% raw)"); limitation 8: "**The ratio result strengthens
  under either** [scale]"; §3.1: "The pre-registered secondary is still met (… a gap of 38.9 pp
  against a 5 pp threshold)".
- **Objection:** Recomputed from the shipped JSONs. Log: spread 75.06; ratio-5.00 spread 59.48;
  79.25%. **Additive: spread 69.06 (−17.27 to +51.79); ratio-5.00 spread 49.44; 71.59%.** So "it is
  stronger after the correction than before it (70.6% raw)" is +8.7pp on the log scale and **+1.0pp
  on the additive one**; limitation 8's "strengthens under either" is literally true and materially
  misleading, and the restated claims quote only the scale that flatters them. Claim 1's
  juxtaposition "Batch 1 spans 75.1 … suite 2 spans 24" mixes population bases: 75.1 is the
  six-model spread, 24.0 the *four-provider* one — the adjusted tasks-b fit exists for all six
  models (haiku +11.8), and like-for-like the contrast is 44.3 vs 24.0 (four providers, log) or
  75.1 vs 28.8 (six models, log): the quoted pair is the maximum-contrast combination. Finally,
  "the pre-registered secondary is still met" silently switches the criterion's basis: the filed
  secondary is defined on the raw paired difference, where the gap is **42.27pp**
  (`notes/defects/DEFECT-position-confound-2026-10-04.md` §4); the quoted 38.9pp is the adjusted-log one (37.6
  additive). The verdict is unchanged on all bases, but a study that has twice published numbers
  from a basis it did not understand should not quote a pre-registered criterion on an undisclosed
  new one.
- **On disk:** `results/_scratch/review4/recompute.mjs` (decisive lines:
  `adjustedUsd spread(all)=69.06 r5spread=49.44 r5/all=71.59% … gap=37.60`;
  `adjustedLog spread(4prov)=44.27`; `tasks-b adjustedLog spread(all)=28.82`);
  PRE-REGISTRATION.md:84,94-96.
- **Verdict:** partly answered (§3.1's table carries both columns; the load-bearing restatements
  are single-scale).
- **Cheapest fix:** carry both scales through §3.1a's two numbers (75.1/69.1; 79.2%/71.6%),
  replace "strengthens under either" with the two values, put both suites on one population basis,
  and state the secondary on all three bases ("42.3pp filed; 38.9 log; 37.6 additive").

### 22. §3.2's retention table has no inferential basis, its pairing silently discards one seed per task, and it was never reconciled to the position correction

- **Claim attacked:** §3.2's table (Qwen retention 0.674/0.743, difference **−0.0691**, the
  `cost_cold` column) and the mechanism verdicts built on it ("**Qwen is the only model whose cache
  is lossy under PTC** … that is **token volume**, not caching").
- **Objection:** `analysis/prefix-retention.json` contains **no interval of any kind** and the tool
  computes none: the retention values, the −0.0691, and the whole `cost_cold` column are bare means
  over 31 task-values, printed beside §3.1's intervalled contrasts as if commensurate. Further,
  the pairing is not what "paired by task" suggests: `pairByTask` assigns
  `byTask.get(r.task)[r.cls] = r.value`, so with two runs per (task, class) the **last row wins** —
  one of the two seeds is silently discarded, which one being an artefact of gateway-file read
  order. The published −0.0691 is that last-seed estimate; the both-seeds pairing gives −0.0646.
  The claim itself survives (this review's cluster bootstrap over the 31 both-seed task
  differences: **[−0.0801, −0.0512]**, excluding zero) — but as printed the mechanism section's
  load-bearing number is an unintervalled point estimate from an undocumented estimator. And the
  table's `billed`/`cost_cold` verdicts use the **raw** differentials — including GLM's −20.75%,
  the exact number §3.1a nulls after the position correction: §3.2 was never reconciled to the
  paper's own correction.
- **On disk:** `results/_scratch/review4/retention-audit.mjs` (last-seed vs both-seeds, the
  bootstrap CI); `tools/prefix-retention.mjs:83-92`; the "filed in advance" precondition prediction
  itself checks out (`notes/records/STEP2-RECONCILIATION.md:146`) — that part of §3.2 stands.
- **Verdict:** partly answered (the Qwen effect is real and tight under a proper pairing; nothing
  in the shipped artifact quantifies its uncertainty or discloses the seed-dropping).
- **Cheapest fix:** average seeds per task (or state the discarded seed), and add the same
  task-cluster bootstrap the paper already uses for A2 — a 20-line computation, demonstrated.

### 23. The scale check's margins are asymmetrically disclosed, its folds are seed-fragile, the one per-matrix verdict the paper leans on is a minority draw — and the tool mislabels the quantity it scores

- **Claim attacked:** §3.1: "the log scale wins 9 of 12 model x suite comparisons, by up to 1.8x,
  while every comparison the additive scale wins is marginal - at most 4% in relative error"; and
  the load-bearing per-matrix use: "the out-of-sample check marginally prefers the additive scale
  *for that matrix* [Sonnet, batch-1]".
- **Objection:** (a) Asymmetric disclosure: four of the nine *log* wins are also marginal (ratio <
  1.1): luna batch-1 ×1.05, Qwen tasks-b ×1.03, haiku tasks-b ×1.08, Sonnet tasks-b ×1.05 (shipped
  JSONs, `scaleCheck.ratio`). Only five of twelve comparisons separate the scales by >10%. The
  sentence flags marginality only on the additive side. (b) Seed fragility: `crossValidateScale`
  draws folds from a hardcoded seed; re-drawing over 40 seeds: **batch-1 Sonnet prefers log in 32
  of 40 draws** — the shipped "usd, marginal ×1.04" verdict for exactly the matrix whose
  classification depends on the scale is a ~20% outcome. If the per-matrix check is to be believed,
  it mostly prefers log for Sonnet — which by the paper's own logic would rehabilitate Sonnet as
  positive. The paper cannot have the check both ways. (c) The tool disagrees with itself about
  what it scores: docstring and CLI print "RMSE of the held-out **log ratio**"; the code
  (`position-adjust.mjs:170`) scores the **dollar difference** ("each model's prediction is
  expressed as a RELATIVE dollar error"). In the repository that withdrew "10 of 12, decisively,
  x20" precisely because the scoring metric was wrong, the file carrying the replacement claim
  misdescribes its own metric — and the CLI header editorializes "log … **the better-specified
  scale**", a verdict PAPER.md explicitly declines to give.
- **On disk:** `tools/position-adjust.mjs:146-148, 170-178, 212, 246-257`;
  `results/_scratch/review4/scale-seed-sensitivity.mjs` (the 40-draw sweep).
- **Verdict:** partly answered (the statistic exists, recomputes, and is majority-stable; its
  margins, seed stability, and use on Sonnet are unexamined); the label defect is not answered.
- **Cheapest fix:** report the seed distribution beside the single draw (free), flag the four
  marginal log wins symmetrically, delete the per-matrix appeal for Sonnet (the additive interval
  alone suffices to call the classification scale-dependent), and correct the docstring/CLI label
  to "relative dollar error of the held-out block difference".

### 24. The qualification-marker density is itself the objection — the reviewer is asked to review the third draft wearing the first draft's structure

- **Claim attacked:** not a sentence — the pattern. ~**48 after-the-fact qualification markers** in
  774 lines (withdrawn ×10, correct* ×19, restated ×5, "does not survive" ×4, "now says/now
  reported" ×2, "needs qualifying" ×1, "takes one of the two back" ×1, plus the dated footnotes) —
  one every ~16 lines. §3.9 retro-qualifies §3.4 ("now reported with that caveat"), §3.5 ("§3.5 now
  says so"), and §3.8 ("needs qualifying … one of them corrects a claim made earlier in this same
  document"); §3.8's verdict needs four layers of same-day qualification (the filed rule → the
  verdict → §2b amended by §3.9 the day it was written → §3b's two withdrawals).
- **Objection:** The ablations are good work; the correct submission is the ablated paper — claims
  already scoped to what survives — not the pre-ablation paper with the negotiations left in.
  Every "now says" is a sentence the reader must diff against a sentence that is still also in the
  document, and as objections 7, 18 and the fixes at the top show, several of those stale
  sentences escaped the negotiation anyway. A verdict that cannot be stated without a committee of
  caveats should not be presented as a clean pre-registered result; the transparency framing does
  not survive the discovery that the caveats still do not go far enough (scale, seeds, arm strings,
  comparison conventions — objections 2, 3, 5, 7).
- **On disk:** the draft is the evidence.
- **Verdict:** cannot be answered from this repo — it is a structural objection about the draft.
- **Cheapest fix:** none on disk. A rewrite pass that absorbs each "now X" into the section being
  corrected and deletes the negotiation, leaving one statement per claim.

---

## Further findings on the record

Smaller, but each checkable in one command. Format: claim — finding — verdict.

- **§3.6 "Anthropic is ~88% of the spend"** — no derivation exists anywhere; every defensible
  basis lands elsewhere (gateway log totals 79.1%; ledger-based 84.7%; cache-read floor 81.6%;
  miss-rate panel 91.2%), and the paper's own adjacent sentence ("the truth sits near the bottom")
  implies ~82%. A 12-point range dressed as one figure. Not answered. Fix: name a basis or delete.
- **§3.6 "the truth sits near the bottom of both brackets"** — contradicts the paper's own
  arithmetic: the cache-read floor for the two matrices (115.85) plus the recorded pilot (45.38)
  is 161.2 > the 144.33 ledger delta, i.e. the ledger implies the matrices cost *less* than the
  floor. An inference presented as a bound. Not answered. Fix: drop the sentence or state the
  three-way tension honestly.
- **§3.6's "log total" and "per run" columns are irreconcilable for the two Anthropic rows as
  printed** — 42.36/620 = 0.0683 < bracket low 0.082; same request sets, two pricing conventions
  (the log total prices the 129.3M unknown-split tokens at $0; the bracket's low end at the
  cache-read rate); the only footnote points the reader the wrong way. Partly answered (in the
  DEFECT, not in the paper). Fix: one footnote naming both conventions.
- **§2 "no missing cells" / §3.8 "800 cells per provider"** — imprecise as written: luna has 619
  analysed cells (one rule-9 exclusion, undisclosed beside Qwen's publicised retry), batchb-luna
  799, batchb-haiku 353 (18 of 40 tasks, undisclosed anywhere in the paper); §3.6's solved column
  silently mixes per-record and per-cell denominators; two documents disagree on haiku's tasks-b
  size (356 vs 353). Partly answered (each exclusion is legitimate and in the metas). Fix:
  disclose beside the sentences.
- **§3.8 "reversed rather than drifted … intervals disjoint"** — luna's disjointness is **0.11pp**
  (and overlaps in 8 of 40 bootstrap reseeds), DeepSeek's 0.56pp — the same fragility the paper
  flags for GLM's 0.0405pp, unflagged; the knife-edge reporting is asymmetric (a null near zero is
  flagged; a disjoint pair near overlap is not). Partly answered. Fix: report the margins.
- **§3.3's 0.994 vs §3.2's 0.996 for the same arm** — aggregate vs paired estimator, the switch
  unnamed (and §3.3's external numbers exist only in the aggregate estimator — see objection 1).
  Answered on disk; unexplained in the paper. Fix: one parenthetical.
- **REPLICATION-VERDICT §5's "haiku's +6.2% is the only positive-leaning cost differential
  anywhere in tasks-b"** — false on its own table (Qwen +5.7% raw / +7.0% log; Sonnet +5.2% log).
  The paper avoids the sentence; the record document it cites as the verdict of record is wrong.
  Answered in the paper. Fix: "the largest raw", with the Qwen note.
- **The same direction sentence as fix 5 above also lives in REPLICATION-VERDICT §2b** ("luna's
  and DeepSeek's widen slightly"), and the "0, 1, 1, 1" enumeration (fix 6) is copied into
  notes/records/FINDINGS.md:2433-2434, notes/handovers/HANDOVER-2026-10-09-B.md:144, and REPLICATION-VERDICT:162-163. The
  paper is fixed; the record documents are not. Not answered (outside PAPER.md).
- **FINDINGS F40(a) "identically-treated arms … now measured rather than assumed" and F41 "the
  study's cleanest novelty … the noise floor is 7.7%"** — stand unretracted beside F29's own
  retraction; a reader lifting from the register gets a live 7.7% floor (REVIEW-3 flagged the
  class: "for the third consecutive review"). Not answered. Fix: two dated SUPERSEDED banners.
- **§3.8's "the pre-registered family is m = 12" vs the filed batchb artifact's m = 18** — the
  disclosure exists (REPLICATION-VERDICT §4, with a follow-up instructing "both should be
  reported") and the paper reports only m = 12; §3.7's "family of 18" never says the four-provider
  family had 0 survivors. Answered on disk; the paper-side labelling gap is an unimplemented
  follow-up. Fix: one clause in each section.
- **The 18.8pp → 17.5pp means are correct — and basis-selective**: on the additive scale the mean
  gap *rises* to 19.5pp, unreported, and the 18.8 requires raw tasks-b point estimates PAPER.md
  never prints. Answered on disk, not in the paper. Fix: print the raw estimates and both scales.
- **tasks-b/PLAN §7's smoke McNemar "11 of 12, p ~ 0.006"** — irreproducible from the shipped
  smoke under six pairing conventions (task×seed: 25/3, p ≈ 2.7×10⁻⁵). Direction unanimous; counts
  wrong. Not answered. Fix: recompute or mark as the intermediate 101/160 read.

---

## What a hostile reviewer says in one paragraph

This paper's entire pitch is measurement discipline, and it fails that standard on its own terms.
Its "cleanest" cross-harness measurement — §3.3's 0.560/0.451 retention, named load-bearing in §8 —
is a pooling artefact: the external arms' cache split is null in the archive (its own limitation 7),
the tool codes null as zero, and the published figure is those zeros diluted by four DSH variant
arms at ~0.999. Its primary results table contains a classification (Sonnet +9.51% [+0.28, +17.90],
"excludes zero") that is a Monte Carlo artefact of one undocumented bootstrap seed — at adequate B
the interval contains zero, the estimand's 2.5th percentile is −0.065%, and the study's own
sign-flip test (p = 0.0512) has been saying so all along. Its one confirmatory hypothesis survives
provider leave-one-out only on the suite where the effect is 3.8× larger; on the suite the headline
comes from, it is null without gpt-6-luna — the same model whose cost classification the paper
elsewhere concedes flips with the arm string. Its replication verdict (R1 0 of 4) flips to 1 of 4
in 27.5% of bootstrap reseeds and was aimed at a target classification (GLM negative) the paper
itself corrected away before the verdict was computed; its softening decomposition holds only on
the log scale (zero separable divergences additive) and only under an unstated arm-pair convention.
Its headline adjective — "provider-specific" — is confounded with "model-specific" 4:1 by design,
and its own adjusted table puts 65% of the spread inside the single two-model provider. Its
adjustment assumes away, by construction, the arm-by-position interaction its own cache mechanism
predicts, and the defect record lists that check as still owed. Its replication suite was collected
on a randomisation documented as defective four days before collection began. Three numbers were
already withdrawn; this review found a fourth, fifth and sixth simply wrong (a "GLM negative on
both seeds" that its own ablation JSON falsifies, a "refuted in both suites" its own §3.7 table
contradicts, a 76% tie fraction its designated witness says is 74.6%), plus a results table quoting
two decimals of precision it does not have. The retracted claim still stands as the "surviving"
result in the very document §6 cites as the retraction record. The study has no noise floor; the
placebo that would have provided one cost about a dollar, was recommended in writing, and was never
run, and the sentence explaining why (30 bytes, six copies) is contradicted by the study's own
third review and unverifiable from the archive. What remains — a large, seed-fragile,
scale-dependent, model-aliased cost spread measured on one task suite that its own pre-registered
replication did not reproduce — is a well-instrumented workshop result wearing a journal article's
pre-registration. Reject.

## What the paper must fix before submission

1. **Withdraw §3.3's 0.560/0.451 column** and restate the section (objection 1). There is no
   cheaper fix; the measurement does not exist.
2. **Re-file every bootstrap interval at adequate B (≥ 200,000), report B/method/seed in METHODS
   §7, and propagate the corrections**: Sonnet's raw classification, the R1 knife-edge language,
   the A8 counts, the §3.9 seed-split labels (objections 2, 5, 10).
3. **Run H3's leave-one-provider-out on batch-1 and report the luna dependence**; report both
   suites' magnitudes with the already-filed six-provider tasks-b fit, and scope the confirmatory
   claim to the sign (objection 3).
4. **Resolve the provider/model alias**: reword to "model-specific" or print the within-provider
   spread (49.1 of 75.1 points) beside the within-ratio spread (objection 4).
5. **Restate §3.8 honestly**: the raw-target basis and R2-on-batch-1 in the first paragraph; the
   decomposition on both scales; the divergence comparison convention; the extension rows with the
   §9.1 verdict, the outage, and the per-solved-task guard the plan ratified (objections 7, 8).
6. **Disclose the common-`f` assumption and its untestability**, and change "the confound removed"
   to "modelled under a common-position-effect assumption" (objection 6).
7. **Fix the tie fraction**: drop the 8 miss-priced pairs (37/46 = 80.4%), report the cross-harness
   cell per suite, and label the within-DSH ties as construction-trivial (objection 10).
8. **Reconcile the two inferential machines** — one procedure classifies and tests, or an explicit
   disclosure of where they disagree (Sonnet; and Qwen's reading-dependent survival) (objection 11).
9. **Sweep the stale record**: notes/reviews/REVIEW-RESPONSE.md:425, notes/records/CROSS-HARNESS.md:236/:292, METHODS.md:220,
   ARTIFACT.md, limitation 4, FINDINGS F40(a)/F41, the 0,1,1,1 copies, REPLICATION-VERDICT §2b's
   direction sentence, and the manifest/coverage-test holes (mixed-effects, ablations, cost panel)
   (objections 18, 19).
10. **Say why no placebo was run — or say what it would have cost** (≈$1; recommended in writing;
    never run) (objection 9).
11. **Process disclosures**: the tasks-b collection dates against the position defect; the
    four-regime cache treatment and Qwen's marked tools block; limitation 7's suite basis and the
    batch-1 sonnet re-pricing; the m = 12 → m = 18 family dates (objections 12, 13, 16, 20).
12. **One statement per claim**: absorb the ~48 negotiation markers into their sections and submit
    the ablated paper, not the pre-ablation paper with the negotiations left in (objection 24).
