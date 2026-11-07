# FINDINGS — the claim register

Every claim this study makes, its current status, and the evidence behind it. Maintained as claims
are confirmed or **retracted**, because a paper's credibility rests on the retractions being visible
too. Update this file whenever a claim changes status.

Status values: **HEADLINE** (the paper's main claim) · **ROBUST** · **MEASUREMENT** (a
decomposition or method, not a causal finding) · **PRELIMINARY** · **RETRACTED** · **PENDING** ·
**RULED OUT** (probed and found not to carry signal).

> **DATA PROVENANCE — added 2026-10-03.** On 2026-10-02 the entire `results/` tree was
> destroyed (`notes/handovers/NEW-SESSION-BRIEF.md` §0): 24 matrices, ~5,900 run records, ~102,000 gateway records.
> `results/` was gitignored, so git held nothing, and **zero run records were recovered**.
>
> **F31, F34, F35 and every cross-provider figure in this register were computed on seven matrices
> that no longer exist.** They are not stale — they are unreproducible. The only surviving record of
> them is `analysis/panel-analysis.json` and `analysis/hypotheses.json`, generated 2026-10-02T07:52Z
> before the loss; **do not overwrite those two files**, because the analysis tools default to writing
> exactly there.
>
> **F38 and F42 are in the same position**: their inputs (`results/f18-*`, `results/hardbatch-*`) were
> destroyed with everything else, so they cannot be re-run at all.
>
> The four matrices re-collected since (ds-full, glm-flash, luna-full, qwen-full — four providers, not
> seven) are analysed in `analysis/*-4model-2026-10-03.json`. What each published figure becomes on
> that smaller population is recorded figure by figure in `notes/records/STEP2-RECONCILIATION.md`. Where a figure
> changed, it is recorded there rather than edited here, because the seven-model numbers are what the
> destroyed data produced and replacing them silently would destroy the only witness to them.

## Novelty — narrowed after the literature pass

Three papers sit close enough that the claim had to be made precise (all in
\`notes/literature/RELATED-WORK.md\`, Part C):

- **Zhang et al. 2026**, *Stop Comparing LLM Agents Without Disclosing the Harness* — harness-induced
  variance is **7.8x model variance**, with **6 of 9 model-pair ranking reversals**. The closest prior
  art. Theirs are reversals of **model** rankings across **harnesses**, measured on **accuracy**.
- **Ndzomga et al. 2026** — across 8 benchmarks, **33 scaffolds**, 70+ model configs, **rank-order
  prediction remains stable**. Directly contradicts a STRONG reading of F3 and is cited pre-emptively.
- **Han and Sun 2026** — harness effects are as large as LLM effects, interaction comparable to both.
  Supports F3, on accuracy.

**The defensible claim is therefore:**

> Rankings of coding agents by **cost** do not transfer across **providers whose output:input price
> ratios differ**, and the mechanism is the ratio itself rather than any property of the harness.

That is narrower than "harness rankings are unstable" — which is now partly claimed — and it is
distinct from all three above, because none varies **provider pricing** and none measures **cost**.

**Two tensions the paper must address rather than avoid:**

1. **C2 appears below Anthropic's stated threshold.** Their tool-search documentation says selection
   accuracy degrades past **30-50 tools**; our effect is measured at **24**, below it. Either the
   threshold is about *selection accuracy* and not *request count*, or our effect has another cause.
2. **Anthropic reports code-mode CUTS total tokens by 37%**; we find code-mode emits MORE output per
   step. Different metric (total vs output), but an apparent contradiction that needs an answer.

## Headline

> **REWRITTEN 2026-10-01.** The paragraph below was the headline until F20 refuted the mechanism it
> rested on. It used "reverses", which F3's own text forbids ("overreading a null"), and "227 runs",
> which has no provenance anywhere in the repo. Both defects were flagged by `notes/reviews/CRITICAL-REVIEW.md`
> §3.2 and are corrected in the replacement rather than in the original text, which is kept below as
> the record.

**The harness ranking is provider-dependent, and the provider effect is not the price ratio.** The
cheapest of eight harness configurations changes four times across seven models (`goose`, `opencode`,
`dsh:native`, `dsh:native-opt`), the median rank correlation between two providers' cost orderings is
**0.286**, and only **63.6%** of arm-versus-arm cost comparisons keep their winner when the comparison
is repeated on a second provider — **54.0% within the DSH configurations alone, which is a coin flip**.
The consequence is a claim about the field's method, not about our systems: a cost ranking measured on
one provider is a statement about that provider, and the standard single-provider, single-price-card
design cannot detect the difference because it holds the deciding variable constant. See F30, F31.

**Superseded text, retained as the record:**

**The harness ranking is provider-dependent** (F3). One harness's cost advantage **reverses** between
two providers whose output:input price ratios differ, and the mechanism made a falsifiable prediction
that then held over 227 runs. Its consequence — that every single-provider harness benchmark is
unsound — is a claim about the field's methodology, not just about our systems.

**Demoted.** F1 and F2 were previously presented as the paper's core. They are not causal findings:
\`cost = steps x tokens/step x price\` is an accounting **identity**, and showing which term varies is
bookkeeping. They are retained as MEASUREMENT, because they establish something useful — that the
prompt cache, the thing practitioners optimise, is **not** the lever.

---

## F1 — Harnesses differ substantially in billed cost at identical solve rates  ·  MEASUREMENT

**Effect:** median **46%** spread between arms (range 28–77%) across 15 tasks with every arm solving
every task.

**Evidence:** DeepSeek V4.1 Flash, 150 observations, 15 tasks, 5 arms. Power: the largest contrast
(`dsh:native` vs `opencode`, −46%) needs only **9 task blocks** for 80% power; `dsh:ptc` vs
`opencode` (−30%) needs **7**. 30 tasks is roughly 3x what this claim requires.

**Caveat:** measured on one model family, one provider. F3 below is the generality test.

---

## F2 — Cost decomposes into STEPS and CONTEXT PER STEP, not cache  ·  MEASUREMENT

**Not a causal claim.** \`cost = steps x tokens/step x price\` is the definition of cost. The value here
is negative and useful: the term that practitioners optimise (cache) explains nothing, while the term
that drives the spread is request COUNT — which no harness documents and no benchmark reports. What
this does **not** do is explain WHY step counts differ between harnesses; that is F10.

**Effect**, from equalising one factor at a time and re-measuring the spread:

| factor equalised | spread | share explained |
|---|---|---|
| steps | 27.7% | **40%** |
| input tokens/step | 31.8% | **31%** |
| output tokens/step | 38.0% | 18% |
| cache hit rate | 48.5% | **−5%** |

**The clincher:** `opencode` has the WORST cache hit rate of any arm (88.6%) and is the CHEAPEST
($0.00822 against `dsh:native` $0.01526).

**Evidence:** `tools/mechanism.mjs`, 150 observations. **This is the paper's central mechanism.**

---

## F3 — The PTC cost advantage does NOT TRANSFER across providers  ·  SUPERSEDED BY F20

> **STATUS CHANGE 2026-09-30.** This was the paper's headline. **It is superseded.** The review found
> that the price card was wrong (F20) and that `analyze-results.mjs` omitted the output term, so the
> figures below were computed with a cost function the pre-registration does not define. On the
> pre-registered function the "ranking inverts" claim does not hold. The transfer failure is real but
> weaker than stated, and H1's direction is contradicted — **and refuted with a confidence interval**
> once the regression the rule names was finally run (F31, F34). **Read F20 before citing anything
> below.** The text is kept as a record of what was believed and why it was wrong.
>
> **Further correction 2026-10-01:** the sentence "OpenCode is cheapest on all four datasets under
> both metrics" that F20 added here is itself wrong — see the correction under F20. `opencode` is
> cheapest on one of seven models, and it is not distinguishable from `goose` at all.

**Final numbers, 30 tasks, both providers measured on the same suite:**

| arm | DeepSeek V4.1 Flash (n≈30/arm) | GLM-5.3-Flash (n≈62/arm) |
|---|---|---|
| \`opencode\` | **\$0.00304** | **\$0.00643** |
| \`dsh:ptc\` | \$0.01178 | \$0.00839 |
| \`dsh:ptc-opt\` | \$0.01310 | \$0.00815 |
| \`dsh:native-opt\` | \$0.01299 | \$0.00878 |
| \`dsh:native\` | \$0.01526 | \$0.00830 |

**PTC versus native: −22.8% on DeepSeek, +1.1% on GLM.**

**State it as "does not transfer", not "reverses".** A 1.1% difference at n=62 is inside noise — the
honest reading is that PTC's advantage is **large on one provider and absent on the other**, not that
it inverts. Claiming a reversal would be overreading a null.

**\`opencode\` is cheapest on BOTH providers** (22% below the best DSH arm on GLM, 74% below \`dsh:native\`
on DeepSeek). Its advantage is **provider-invariant**, which is the sharper contrast: one harness
property transfers and the other does not.

**Cache is refuted a third time.** On GLM every arm sits at 87–91% cache hit, including \`opencode\`
at 87.3% — the **lowest** rate and the **lowest** cost.

**What is still missing:** only two providers. The mechanism claim (output:input price ratio) predicts
the advantage should shrink monotonically as output gets relatively pricier, and two points cannot
establish monotonicity. **Qwen at ~4.0 is the decisive test.** If the advantage continues to shrink,
the mechanism is supported; if it returns on DeepSeek-like levels, the mechanism is wrong and the
difference is something else.

> **CORRECTED 2026-10-01.** Qwen3.8-Flash is **3.13**, not ~4.0 (`tools/measure-gateway.mjs`), so
> Qwen does not extend the ratio axis at all — it sits beside GLM-5.3. The test was run anyway, and
> the answer is F31: **the ratio is not the mechanism.** Qwen's PTC penalty is +27.5% at ratio 3.13,
> between GLM-5.3's +39.5% at 3.14 and GLM-5.3-Flash's +0.2% at 3.33 — non-monotone, and dwarfed by
> the spread among the three models that share a single ratio.

**Effect:** the PTC cost advantage present on DeepSeek **reverses** on GLM.

| provider | `dsh:native` | `dsh:ptc` | winner |
|---|---|---|---|
| DeepSeek V4.1 Flash | $0.01526 | $0.01178 | **ptc** |
| GLM-5.3-Flash | $0.00457 | $0.00477 | **native** |

**Evidence:** GLM figure is n=1 task, 1 seed — the full 310-run matrix was running when this was
written. Do not cite until it lands.

**Proposed mechanism (to test, not yet tested):** PTC arms emit MORE output per step on DeepSeek
(1,155 and 1,258) than native arms (980 and 942). As output becomes relatively more expensive — GLM
prices output at 3.33x input against DeepSeek's 2.0x — the PTC advantage should shrink and reverse.

> **CORRECTED 2026-10-01.** DeepSeek's output:input ratio is **4.00**, not 2.0
> (`_ev/deepseek-pricing.html`: hit $0.003, miss $0.15, out $0.60 off-peak). The ordering the sentence
> rests on therefore inverts: **DeepSeek has the highest output ratio in the study, not the lowest.**
> The prediction made from it was wrong in direction, and F34 records the filed regression that
> refutes it.

**If confirmed, this is the paper's headline**, and it makes every single-provider cost comparison in
the literature unsound.

---

## F4 — Prompt-cache discipline explains the cost differences  ·  RETRACTED

**Previously asserted:** PTC holds a ~10-point cache-hit advantage over native, replicated across
three datasets.

**Why it was wrong:** all three datasets were the SAME 30-line task, `example-fix`. That is not
replication, it is one measurement repeated. Across 15 real tasks the advantage is **median 1.8pp,
positive in only 10 of 15** (sign test p ≈ 0.30 — not significant), and both modes sit near the cache
ceiling (PTC 89–96%, native 85–96%). Cache explains **−5%** of the cost spread (F2).

**Retained as a lesson:** the milestone-1/2/3 agreement looked like strong evidence and was an
artefact of task choice. Single-task replication is not replication.

---

## F5 — Every arm solves every task  ·  ROBUST (and a limitation)

0 of 15 tasks showed any solve-rate separation; all arms were at 100%.

**Consequence:** the study measures **cost at equal quality**, not quality. A reviewer will ask
whether the cheaper arm is simply sloppier. The answer must be that quality is held at ceiling by
construction and the comparison is on cost alone — and ideally some tasks should be hard enough to
break that ceiling.

---

## F6 — The `-opt` policy arms are unresolvable  ·  ROBUST

`dsh:native-opt` vs `dsh:ptc-opt` shows a **0.8%** effect, needing **6,257 task blocks** for 80%
power. These two arms are 40% of the run budget and answer nothing. Keep as exploratory on a task
subset only, never as a primary contrast.

---

## F20 — THE RE-DERIVATION: the corrected card and cost function change the thesis  ·  MEASURED

An external review found two independent defects that both inflated the same claim. Both are verified.

**Defect 1 — the price card (B0).** `tools/measure-gateway.mjs` priced deepseek-flash as
miss 0.14 / hit 0.028 / out 0.28, taken from a third-party blog. The repo held the provider's own page
at `_ev/deepseek-pricing.html`, captured 2026-09-28, saying **hit 0.003 / miss 0.15 / out 0.60**
off-peak. The card was wrong in every cell: cache-hit 9.3x too high, output 2.1x too low.
**DeepSeek's output:input ratio is 4.00, not 2.00**, and its cache discount is **50x, not 5x**.

**Defect 2 — the cost function (A6).** `tools/analyze-results.mjs` omitted the output term entirely:

    billedUsd += (miss/1e6)*pr.miss + (hit/1e6)*pr.hit        // no output, no write rate

while `PRE-REGISTRATION.md` defines `cost_billed = fresh*miss + created*write + hit*hit + output*out`.
**The tool did not implement the pre-registered function**, and the wrong one produced the headline.

### What survives

**OpenCode is the cheapest arm on all four datasets, under BOTH cost functions.** The most reproducible
result in the study, and the opposite of `notes/records/FIRST-RESULTS.md` claiming "OpenCode drops to third".

> **CORRECTION 2026-10-01 — the claim is an artefact of the arm set, not a result.** It was computed on
> matrices that did not contain `goose`, `cline` or `openhands`, so "cheapest of the arms we ran"
> was reported as "cheapest". On the full 10-arm matrices `opencode` is the cheapest arm on **one**
> of seven models (GLM-5.3-Flash).
>
> The sharper version of the same correction: **`goose` and `opencode` are not ordered.** Paired by
> task, 95% cluster bootstrap:
>
> | provider | opencode − goose | CI | verdict |
> |---|---|---|---|
> | DeepSeek V4.1 Flash | +0.7% | [−7.2%, +8.1%] | **tie** |
> | Claude Haiku 4.5 | +47.1% | [+25.4%, +70.0%] | goose cheaper |
> | Claude Sonnet 5.5 | +37.7% | [+22.6%, +56.5%] | goose cheaper |
> | gpt-6-luna | +127.9% | [+42.2%, +269.8%] | goose cheaper |
> | GLM-5.3-Flash | −45.5% | [−67.6%, −27.4%] | opencode cheaper |
> | Qwen3.8-Flash | −49.5% | [−83.2%, −26.5%] | opencode cheaper |
> | GLM-5.3 | −27.7% | [−51.9%, −7.7%] | opencode cheaper |
>
> **Three to three, with one tie.** The comparison that F20 called "the most reproducible result in
> the study" is itself provider-dependent, which is the paper's thesis stated in one table.
>
> What survives is narrower and still worth having: **an external harness is cheaper than every DSH
> configuration on every provider**, and on DeepSeek the two cheapest arms sit **51.3%**
> [38.3%, 64.8%] below `dsh:ptc`. The identity of that harness is not stable. Within DeepSeek's own
> rank table 8 of 9 adjacent pairs are ties (F35). "The most reproducible result in the study" was
> reproducible because the same arms were compared each time. See F30 and F35.

| dataset | ratio | cheapest by cost_billed | cheapest by cost_cold |
|---|---|---|---|
| DeepSeek full | 4.00 | opencode | opencode |
| DeepSeek sweep | 4.00 | opencode | opencode |
| GLM-5.3-Flash | 3.33 | opencode | opencode |
| GLM-5.3 | 3.14 | opencode | opencode |

### What does not

**"The ranking inverts" is false as stated.** The DSH arms reorder between metrics, so the weaker
claim holds, but the top of the table does not move and **OpenCode is cheapest either way.**

### H1 is contradicted — in direction

| provider | output:input | cost_billed PTC vs native | cost_cold |
|---|---|---|---|
| DeepSeek | **4.00** | **-3.3%** | **-18.4%** |
| GLM-5.3-Flash | 3.33 | +0.3% | -5.7% |
| GLM-5.3 | **3.14** | **+31.0%** | **+25.9%** |

Cleanly **monotonic in the ratio, with the INVERSE sign to the prediction.**

### The likely real driver, and it is not price

| | PTC requests | native requests | |
|---|---|---|---|
| DeepSeek | 282 | 364 | **PTC does 22% less work** |
| GLM-5.3 | 185 | 179 | **PTC does 3% MORE work** |

**Whether code-mode reduces agent work tracks the result better than the price ratio does.** Recorded
as a **hypothesis, not a finding** — a three-point correlation with an obvious confound.

**It is testable.** If the ratio drives it, ratio 5.0 shows PTC improving further. If work reduction
drives it, the ratio is irrelevant and the request count predicts everything.

### Process note

Both defects produced the answers the authors expected and neither was caught by internal review across
two days. **The instrument was right throughout** — token counts, attribution and cache accounting are
verified correct — so every figure is re-derived from the archive by `tools/rederive.mjs`.

## F21 — H2 IS NOT SUPPORTED: the output-volume mechanism fails its causal test  ·  MEASURED

The terseness ablation ran on GLM-5.3-Flash, 31 tasks x 2 arms x 2 seeds, 124 runs.

### The intervention worked, dramatically

| arm | default out/run | terse out/run | |
|---|---|---|---|
| native | 4,272 | **2,442** | **-42.8%** |
| ptc | 4,984 | **2,645** | **-46.9%** |

**All 62 runs solved in every arm.** The manipulation is large and does not break the task.

### The hypothesis failed anyway

    30 paired tasks with all four arms
    mean(d) = -$0.000389            (direction as predicted)
    d < 0 in 16 of 30 tasks         (chance would be 15)
    exact one-sided sign test p     = 0.4278
    bootstrap 95% CI                = [-0.002226, +0.000950]   includes 0

> **CORRECTION 2026-10-01 — the label was not the pre-registered one.** The filed rule has three
> outcomes: supported, refuted if the CI lies entirely above 0, **otherwise inconclusive**. The CI
> spans zero, so the correct label is **INCONCLUSIVE**, not "NOT SUPPORTED". The exact one-sided
> Wilcoxon signed-rank that the rule names was also never run; F21 reports a sign test
> (`tools/h2-test.mjs` substitutes it and says so in a comment). Re-run to rule
> (`node tools/hypotheses.mjs`): **exact Wilcoxon n = 31, W+ = 261, p = 0.6029; bootstrap 95% CI
> [−$0.002222, +$0.001107] — INCONCLUSIVE.** The substantive reading is unchanged and is if anything
> blunter: the mechanism does not survive its causal test.

**PRE-REGISTERED DECISION: INCONCLUSIVE.** The aggregate mean pointed the right way; the per-task
distribution says it is noise. **The pre-registered requirement for a confidence interval is the only
reason this was caught** — reporting means alone would have shown -4.2 percentage points and read as
support.

### Combined with F20, the proposed mechanism is dead

| hypothesis | outcome |
|---|---|
| H1 - penalty scales with output share | **contradicted in direction** |
| H2 - cutting output cuts the penalty | **not supported** (p = 0.43, CI spans 0) |

**The paper cannot claim that code-mode's cost penalty is driven by output volume.**

## F22 - A ONE-LINE INSTRUCTION CUTS COST 29-32%  ·  MEASURED, and the best practical result here

| arm | default | terse | |
|---|---|---|---|
| dsh:native | $0.00836 | **$0.00595** | **-29%** |
| dsh:ptc | $0.00839 | **$0.00572** | **-32%** |

cost_billed per run, GLM-5.3-Flash, 31 tasks x 2 seeds, every run solved.

The instruction is eleven words appended to the task prompt:

> Be concise: give minimal explanation, prefer the smallest correct change, and keep all output short.

**This is larger than any harness-level effect measured in this study**, costs nothing to apply,
requires no code change, and does not trade away correctness on these tasks. We set out to test a
mechanism and found a better lever.

**Caveat:** measured on one provider at one ratio. Whether it holds at ratio 5.0 and on the hard-task
batch is untested, and on harder tasks terseness may cost correctness where it currently costs
nothing.

## F23 - What the paper actually has  ·  SUMMARY, after F20-F22

The mechanism hypotheses failed. The remaining findings are these, in descending order of strength:

> **SUPERSEDED 2026-10-01 — read F29–F38 instead.** This table was the summary after F20–F22. Four of
> its six rows have since changed, and the paper's centre of gravity moved from the mechanism
> hypotheses to the measurement results. Kept as the record.

| # | finding as of F22 | status then | **now** |
|---|---|---|---|
| F22 | a terseness instruction cuts cost 29-32% at equal solve rate | strong, causal, practical | **F32: generalises to −12%…−54% on six models across five providers** |
| F20 | OpenCode is cheapest on all four datasets under both cost functions | robust | **retracted — an arm set missing `goose`; `opencode` is cheapest on 1 of 7 models and is not distinguishable from `goose` at all** |
| F12 | tool-schema count drives request count | causal | **F34: H3 SUPPORTED by its filed rule, +1.23 requests [0.52, 1.94]** |
| F2/F4 | the cache is not the lever | negative, replicated 3x | **partly wrong — the cache is not the lever *within* a provider, and the cache *regime* is the lever *across* providers (F31, F37)** |
| F15 | the hard-task batch discriminates, 50pp solve-rate spread | new, 1 of 24 checked | unchanged, still 1 of 24 checked |
| F18 | a cheap model can beat a frontier one on the same task | preliminary | **F38: replicated at 32.3% vs 1.3%/0.0%, and reinterpreted — the cheapest model fails, so it is not about price** |

**This is a measurement paper with a practical result and honest negatives, not the mechanism paper
originally proposed.** It is a weaker claim than intended and a more defensible one.

## F24 — DeepSeek's full matrix is complete and clean  ·  MEASURED

    434 records   433 solved   7 arms x 62
    one genuine failure: opencode on long-horizon-job-ordering (exit=0, the test failed)

The earlier run of this matrix lost **258 of 434 runs to credit exhaustion**. The re-run, after the
balance was restored and the rule was written down, lost **none**.

**A false positive worth recording:** six runs mention "quota" in their output and were briefly
flagged as infrastructure failures. All six are `multi-file-retry-policy` runs that **solved**, because
that task's own source code discusses retry and quota policy. The word "quota" appears in fixture text.
**The check now requires an unsolved run AND the provider's error string**, not the word alone.

## F28 — Data collection is complete: seven datasets  ·  MEASURED

| model | unique cells | target | solved | tasks | arms |
|---|---|---|---|---|---|
| DeepSeek V4.1 Flash | 620 | 620 | 619 | 31 | 10 |
| Claude Sonnet 5.5 | 620 | 620 | 617 | 31 | 10 |
| Claude Haiku 4.5 | 620 | 620 | 547 | 31 | 10 |
| Qwen3.8-Flash | 620 | 620 | 608 | 31 | 10 |
| GLM-5.3-Flash | 620 | 620 | 618 | 31 | 10 |
| GLM-5.3 | **305** | 310 | 308 | 31 | 10 |
| gpt-6-luna | **612** | 620 | 487 | 31 | 10 |

**Both shortfalls are credit-failed attempts, which are infrastructure losses under the pre-registration
exclusion rules. They are recoverable with `--resume` for roughly a dollar.**

### Two things to carry forward

**1. luna solved 79 percent where every other model solves 95 percent or more.** That is a real
capability difference, and it means **luna's cost per run is NOT comparable to the others at unequal
quality**.

> **RETRACTED 2026-10-01. This is false, and it is the third instance of the error the project's own
> rule forbids.** Of luna's 129 unsolved runs, **111 name a fault at or below the harness boundary**:
> 82 `HTTP_404: DeepSeek Messages request failed (404)` — the DSH 0.1.7 protocol drift this repo
> documents elsewhere — 15 rate limits, 14 requests rejected for an invalid `reasoning_effort` field,
> one auth failure and one harness crash. Only 18 are unexplained.
> **Under pre-registration rule 9 luna solves 490/508 = 96.5%, which is an ordinary number.**
> The 79% figure counted the instrument's own failures as the model's.
>
> The correction also inverts the comparison the sentence was making. Excluding named infrastructure
> faults: DeepSeek 99.8%, Sonnet 99.5%, GLM-5.3 99.4%, Qwen 98.2%, **luna 96.5%**, **Haiku 84.8%**.
> **Haiku 4.5 is the only model with a genuine, large solve-rate deficit**, and it has no FINDINGS
> entry at all. Reproduce with `node tools/failure-classify.mjs`. Reporting $0.00173/run beside models that solve twice as much would be exactly the trap this
study exists to expose - comparing cost across different outcomes. **Any cost figure for luna must be
reported alongside its solve rate, or restricted to the tasks both solve.**

**2. luna's matrix was the one that ran broken.** Its first execution produced 134 records with six of
eight arms never reaching the provider, and **nothing in the output said so** - exit codes, costs and
records all looked normal. Only the per-arm solve rate exposed it. That is now two independent instances
of a harness appearing to work while measuring nothing (Cline at zero gateway requests was the first).
**Per-arm solve rates are the check that catches it, and should be run on every matrix before its data
is used.**

## F27 — Where the Anthropic money actually went  ·  MEASURED, and it is not where I assumed

Anthropic's console reports **$308.16 spent** on a key used for nothing else. Our gateway log,
priced at the published cards, says **$191.31** — an under-report of **1.611x**, consistent with the
uncached-input gap found in the CSV reconciliation. **Every per-run figure in this project needs
scaling by 1.61.**

> **CORRECTION 2026-10-03 — the 1.611x SCALING INSTRUCTION IS REFUTED. Do not scale Anthropic
> figures by 1.61; doing so overstates them by 61%.** A 62-cell Anthropic pilot was run and
> reconciled against the console: credits fell **$35.58** ($38.65 -> $3.07) against **$35.5718**
> computed from the pilot's own gateway log under the published card - a ratio of **1.000**, known
> to +/-0.014% because the console reads to the cent. The gap F27 reports was therefore not a
> property of the provider or of the card. F27's own number ($191.31 against $308.16) is left
> standing as what was measured in September from the data that then existed; what is retracted is
> the instruction to generalise it. `notes/reviews/CRITICAL-REVIEW.md:450-454` disputed the factor as a
> hardcoded constant with no capture behind it, and on this evidence the dispute was right.
> See `_ev/anthropic-pilot-2026-10-03.md`.
>
> One caveat carried with it: the console's **spend counter did not move at all** across that
> $35.58 run, so reconcile against the **credit ledger**, not the spend figure.

### The decomposition

| | runs/model | haiku | sonnet | total |
|---|---|---|---|---|
| 10 arms x 2 seeds (what we ran) | 620 | $366 | $151 | **$517** |
| 8 arms x 2 seeds (drop -opt) | 496 | $293 | $121 | $414 |
| 10 arms x 1 seed | 310 | $183 | $76 | $258 |
| **8 arms x 1 seed** | 248 | **$146** | **$60** | **$207** |

**Of the $308 already spent, roughly $216 went to two things already documented as not worth doing:**

- **~$62 on the `-opt` arms.** F6 states these answer nothing at a 0.8% effect needing 6,257 task
  blocks. The pre-registration demoted them to exploratory. **They were run on every matrix anyway.**
  This was not an error of measurement; it was a decision made against a written finding.
- **~$154 on the second seed.** Defensible - it measures run-to-run variance (F11) - but it is half
  the budget for a number that is not the headline, and the pre-registration allows one seed.

### The credit failure is the smaller loss

**~$117** was lost to Haiku attempts that failed on credit (F24 context). **That was a mistake.**
The ~$216 above was a *plan*, repeated after being questioned, and it is the larger sum.

### What this does NOT mean

The runs in flight are NOT being changed. Cutting arms mid-matrix would create exactly the
inconsistency this entry is complaining about. **The lean design applies to work not yet started.**

## F25 — Haiku costs 0.01144 per run, not 0.048  ·  MEASURED

| | |
|---|---|
| runs billed | 19 |
| spend | \$0.2174 |
| **per run** | **\$0.01144** |
| **projected, 620 runs** | **\$7.10** |
| cache hit rate | **25.4%** |

**The cache-breakpoint injection works.** The earlier \$50 projection came from the **cold-cache pilot**,
which measured the first six runs before any cache existed. Once the shared prefix warms across runs,
Haiku costs a fifth of that.

**Consequence: Claude Sonnet becomes affordable.** At roughly double Haiku, the full Sonnet suite is
about **\$15**. The capability tier that was recommended for skipping is now the price of lunch, and it
is being run. **Revised Anthropic budget for both models: ~\$22, not \$178.**

**This is the fifth cost estimate in this project to be wrong**, and the first to be wrong in the
optimistic direction on a large scale. Every one of them came from extrapolating a cold or single-task
measurement instead of measuring the thing itself.

## F26 — Five harnesses, not six  ·  CORRECTION

The parallel session brought **cline, goose, openhands and sweagent** to the gateway. Verified against
the logs: cline 11 records, goose 18, openhands 9, sweagent 10 (all 200).

**But sweagent is `gateway-reached`, not `end-to-end`**, and the registry is explicit:

> gateway-reached is enough to prove the wiring, and NOT enough to put a harness in a
> task-performance comparison.

sweagent never solved a real task — in the smoke run it returned `exit=undefined` in 0 seconds with no
output at all. **The matrix uses FIVE harnesses: dsh, opencode, cline, goose, openhands.** Earlier in
this session I wrote "six", which was an overstatement of exactly the kind the registry exists to
prevent.

Design with the five: **10 arms x 31 tasks x 2 seeds = 620 runs per model.**

## F15 — The harder task batch discriminates  ·  PRELIMINARY (1 of 24 tasks checked)

Batch 1 failed on this: every arm solved 30 of 31 tasks, so the study measured cost and almost
nothing else. Batch 2 was built to fix it — 24 tasks, 23-25 independent assertions each, with the
untouched broken fixtures passing only **8-35%** of their own assertions.

**First check, lh-ledger-replay, 7 arms x 2 seeds on DeepSeek:**

| arm | solved | cost/run |
|---|---|---|
| dsh:ptc | **1/2** | $0.05155 |
| dsh:ptc-terse | **1/2** | $0.09886 |
| dsh:native-terse | **1/2** | $0.07635 |
| dsh:native | 0/2 | $0.07554 |
| dsh:native-opt | 0/2 | $0.07982 |
| dsh:ptc-opt | 0/2 | $0.05892 |
| opencode | 0/2 | $0.06829 |

**Solve-rate spread 50 points, cost spread 47.9%.** Three of seven arms solved; four did not.

**The arms also order differently here.** dsh:ptc is both the cheapest *and* one of the three that
solve, while opencode is neither — **the opposite of batch 1, where opencode was cheapest on every
provider.** If that holds across the batch it is a second, independent instance of the
provider-dependence this paper is about.

**Fractional scoring confirmed end to end.** The same arm varies across seeds (100% against 88% for
dsh:ptc), which is gradient rather than noise.

**Limitation, stated plainly:** the spread sits at the top of the range, 84-100%. The task separates
arms; it does not break them. Whether that is typical is unknown until the other 23 are checked.

## F17 — Only half the hard tasks discriminate so far  ·  MEASURED (2 of 24)

Two of the 24 have been checked. They disagree.

| task | stratum | solve-rate spread | verdict |
|---|---|---|---|
| lh-ledger-replay | long-horizon | **50 points** | **DISCRIMINATING** |
| edge-glob-match | edge-case-dense | **0 points** | **TOO EASY** — every arm solves it |

**So the batch is not uniformly good, and 2 of 24 is not enough to characterise it.** The
edge-glob-match cost spread is still 57.5%, so it carries cost signal, but it separates nothing on
quality — which is the whole reason batch 2 exists.

**Consequence for the plan:** check all 24 on DeepSeek (~$24 at the measured $0.07/run) before
running the batch for real. Checking costs about a sixth of running it and prevents paying full price
to collect quality data on tasks that produce none. This is the same reasoning as the caching pilot,
and it has now paid off twice.

## F18 — A cheap model SOLVES a hard task the pricier models almost never do  ·  REPLICATED and REINTERPRETED

> **STATUS CHANGE 2026-10-01. Read F38 before this entry.** The title above is now wrong in its
> framing, not its numbers. F18 was replicated on the same task with four models and 265 runs, and
> **gpt-6-luna — cheaper per run than DeepSeek — failed at 2.6%.** So this is not a
> cost/capability inversion and the word "cheap" is doing work the data do not support. The measured
> result is: **DeepSeek 32.3% (30/93), luna 2.6%, Sonnet 1.3%, Haiku 0.0%** — one model crosses the
> threshold twelve times as often as any other, and price predicts nothing about which. The
> "5.9x inversion" framing is retracted; the numbers below stand as the original reading.

**lh-ledger-replay, hard-task batch. Same task, same 10 arms, same grading.**

| model | cost/run | solved | rate | mean passRate |
|---|---|---|---|---|
| **DeepSeek V4.1 Flash** | **$0.073** | **3 / 7** | **43%** | ~92% |
| Claude Sonnet 5.5 | ~$0.20 | **1 / 30** | **3.3%** | 88.7% |
| Claude Haiku 4.5 | $0.43 | **0 / 6** | **0%** | ~90% |

**Fisher's exact on 3/7 against 1/30 gives p ~ 0.01.** The earlier reading at 0/9 was p ~ 0.06 and was
correctly withheld; at 1/30 it is significant.

**Sonnet's failure is uniform across arms** - 9 of 10 arms at 0/3, one at 1/3 - so it is not one broken
harness or one unlucky cell.

### The claim, stated precisely, including what limits it

**This is a THRESHOLD effect, not a capability gulf.** All three models score 80-100% of the assertions.
The mean partial credit differs by 3 points (92% against 88.7%). What separates them is the
all-or-nothing solve verdict at 25/25, and DeepSeek crosses that line while the others do not.

**So the honest claim is:** on a boundary task, the binary solve verdict separates models that partial
credit does not - and the cheapest model crosses it most often. **Not "DeepSeek is more capable."**

**The partial-credit design is what makes this visible at all.** Under binary grading alone the data
would read "everyone fails" and the 92%-against-88.7% distinction would not exist.

### Why it still needs replicating

**One task.** This project has retracted two claims from single observations (F4, F14). The
reproducibility run - same task, more seeds, ~$21 - is what turns this from suggestive into established,
and **luna should be included** because it separates "Anthropic's models fail this" from "only DeepSeek
solves it", which are different claims.

## F18 (earlier version, retained as the record of the first reading)

> **FRAMING CORRECTION 2026-10-01.** This entry first called Haiku 4.5 "a ratio-5.0 model" and implied
> it was the frontier comparator. **It is Anthropic's BUDGET model.** A cost/capability inversion claimed
> with the cheap model cast as the capable one would not survive review, and the wording mattered more
> than the numbers. **Sonnet 5.5 is the correct frontier anchor and is now being run on the same task.**

### What is actually measured

**lh-ledger-replay, task-hard batch, one seed:**

| model | hard-task cost/run | solved |
|---|---|---|
| **DeepSeek V4.1 Flash** | **$0.073** | **3 of 7 arms** |
| Claude Haiku 4.5 | $0.43 | **0 of 6 arms** |
| Claude Sonnet 5.5 | ~$0.20 | **running now** |

**The claim as it stands is: a model costing $0.073 per run solves a task on which a model costing
$0.43 per run fails outright — a 5.9x cost inversion, with capability pointing the opposite way to
price.**

### Two outcomes, both publishable, and they are different papers

- **Sonnet also fails** -> DeepSeek beats BOTH Anthropic models on cost and on capability for this task.
  A cross-vendor inversion, much the stronger claim.
- **Sonnet solves it** -> the inversion is *within* Anthropic: Haiku fails where Sonnet succeeds, and
  DeepSeek beats Haiku on both axes. Still real, and a different finding.

### Why it needs replicating before it means anything

**One task, one seed.** This project has already retracted two claims taken from single observations:
F4 (one task repeated three times) and F14 (an infrastructure error read as a result). **A single task
showing a 5.9x inversion is exactly that shape.**

**Replication has two separate parts, and they are not the same test:**

1. **Reproducibility** — the same task, more seeds. Does Haiku keep failing? ~$21.
2. **Generality** — more tasks at that difficulty. Is it one bad task? ~$75.

**Run (1) first. If it does not replicate, (2) is not worth buying.**

## F18 (original entry, retained below as the record of what was first claimed)

Haiku 4.5 on lh-ledger-replay: **0 solved of 6**. DeepSeek V4.1 Flash on the same task: **3 solved
of 7** (F15).

| arm | Haiku | DeepSeek |
|---|---|---|
| dsh:ptc | ✗ (cost $0.2810) | **✓** (cost $0.05155) |
| dsh:ptc-terse | ✗ ($0.0712) | **✓** ($0.09886) |
| dsh:native-terse | ✗ ($0.3735) | **✓** ($0.07635) |
| dsh:native | ✗ ($0.4833) | ✗ |
| dsh:native-opt | ✗ ($0.2400) | ✗ |
| dsh:ptc-opt | ✗ ($0.1448) | ✗ |

**The cheaper model solves the task and the frontier model does not, at five to nine times the
cost.** If that holds this is the single most quotable result in the study: an agent's cost and its
capability are not merely weakly correlated, they can point in opposite directions on the same task.

**Preliminary: one task, one seed, and no re-run.** It may be variance. It must be replicated before
it appears as a finding, and it is exactly the kind of result this project has already retracted twice
for believing too early.

## F16 — Hard tasks cost ~14x the simple ones, not 1.8x  ·  MEASURED (1 task)

lh-ledger-replay averages **$0.073 per run** on DeepSeek against **$0.005** for batch 1.

**Every hard-task budget in this project was built on a 1.8x multiplier. The real figure is ~14x.**
Extrapolated to 288 runs (24 tasks x 6 arms x 2 seeds):

| model | estimated at 1.8x | extrapolated from measurement |
|---|---|---|
| deepseek-flash | $2.65 | **~$21** |
| glm-5.3-flash | $4.16 | **~$33** |
| gpt-6-luna | $2.51 | **~$20** |
| claude-haiku-4.5 | $25 | **~$200** |

**This is the third cost estimate in this project understated by extrapolating instead of measuring**
— after GLM-5.3 missed by 42% and the pre-registration claimed DeepSeek coverage it did not have.

**CORRECTED by direct measurement (F19 below): the $200 figure for Haiku was wrong by 2.6x in the
PESSIMISTIC direction.** Four cost estimates in this project have now been wrong, in both directions,
and every single one was produced by extrapolating from a different model or workload.

## F19 — Haiku on hard tasks: $0.2656 per run  ·  MEASURED (1 task) — **the cost column is wrong by 7.4x**

> **CORRECTION 2026-10-01 — every cost in the table below is 7.4x too low.** These figures were
> produced by `tools/analyze-results.mjs`, whose price table contained only DeepSeek entries, so a
> Haiku run was priced at DeepSeek Flash rates. `notes/reviews/REVIEW-FINDINGS.md` §B13 found exactly this defect
> in the Anthropic pilot and it was corrected there; **F19 was never re-derived**, and neither was
> the budget table underneath it. Re-priced from the archived token counts under Haiku's own card
> (`node tools/f18-replication.mjs`), and verified against the per-request usage:

| arm | solved | fresh input tok | hit tok | out tok | F19 says | **true cost** | ratio |
|---|---|---|---|---|---|---|---|
| dsh:native | no | 3,282,977 | 430,240 | 41,439 | $0.4833 | **$3.5332** | 7.31x |
| dsh:native-terse | no | 2,535,607 | 381,838 | 25,084 | $0.3735 | **$2.7059** | 7.24x |
| dsh:ptc | no | 1,923,947 | 0 | 41,659 | $0.2810 | **$2.1322** | 7.59x |
| dsh:native-opt | no | 1,609,651 | 301,168 | 22,033 | $0.2400 | **$1.7499** | 7.29x |
| dsh:ptc-opt | no | 975,469 | 0 | 29,387 | $0.1448 | **$1.1224** | 7.75x |
| dsh:ptc-terse | no | 490,747 | 0 | 8,802 | $0.0712 | **$0.5348** | 7.51x |

> **The mean is $1.96 per run, not $0.2656 — and the budget conclusion inverts.** The table below
> said full parity on the hard batch costs **$76**; at the measured rate it costs **$565**. The
> paragraph that follows says the earlier $200 estimate "was wrong by 2.6x in the PESSIMISTIC
> direction". It was not: $200 was the *better* estimate, and the $76 that replaced it is the
> outlier. Four cost estimates in this project have been wrong; this is the fifth, and it is wrong
> in the optimistic direction it congratulated itself on avoiding.

| design | runs | F19 said | **at the measured rate** |
|---|---|---|---|
| 24 x 2 arms x 1 seed | 48 | $13 | **$94** |
| 24 x 4 arms x 1 seed | 96 | $25 | **$188** |
| 24 x 6 arms x 2 seeds | 288 | $76 | **$565** |

**Why the driver is input, not output.** The run that costs $3.53 emits only 41k output tokens
($0.21); it *reads* 3.28M uncached input tokens at $1.00/M. F19's table shows output and cache but
never input, which is why the error survived — the column that decides the bill was not in it.

**Cache hit rates on hard tasks are 0-16%**, well below the 26.7% measured on the simple task and far
below GLM's ~90%. **Explicit caching with two breakpoints does not capture a long agent trajectory**,
which is itself worth reporting: the mechanism is not "Anthropic caches less", it is "a fixed
breakpoint set cannot track a growing context".

## F7 — Model tier changes the cost structure, and NOT through the price ratio  ·  MEASURED

GLM-5.3 versus GLM-5.3-Flash: same provider, same family, same cache semantics, ratio 3.14 against
3.33 — effectively the same. Only capability differs. Measured on 15 shared tasks, one seed:

| arm | Flash cost/run | **5.3 cost/run** | PTC penalty |
|---|---|---|---|
| `dsh:native` | $0.00838 | $0.09359 | |
| `dsh:ptc` | $0.00839 | $0.12273 | |
| **PTC vs native** | **+1.1% (a wash)** | **native cheaper by 31.1%** | **+30 points** |

**This is a problem for a ratio-only mechanism.** The two models have nearly identical price ratios, yet
the PTC penalty differs by 30 points. Ratio cannot be the whole story.

**The refinement:** PTC's penalty tracks **output's share of the bill**, which depends on the price ratio
AND on how verbose the model is. GLM-5.3 emits **1.4-2.3x more output per step** than Flash:

| arm | out/step, Flash | out/step, 5.3 | growth |
|---|---|---|---|
| `dsh:native` | 354 | 546 | 1.54x |
| `dsh:ptc` | 478 | 782 | 1.63x |
| `opencode` | 339 | 785 | **2.32x** |

And PTC arms are consistently the most verbose (782 and 775 against 546 and 564). So a stronger model
that writes more **amplifies** exactly the term PTC is worst at. The claim becomes: **PTC's advantage
shrinks as output becomes a larger share of cost** — a two-variable mechanism, not a one-variable law.

**Cost projection missed by 42%** ($7.59 against $5.35). The projection reused Flash's token profile;
5.3 emits far more. Worth recording because it means every per-run estimate in this study must be
recomputed on the model's OWN token profile, never a sibling's.

## F14 — A stronger model is WORSE on some tasks  ·  RETRACTED (billing artefact)

**This claim was false.** It was written from the 6 unsolved GLM-5.3 runs, on the reading that a
stronger model failed tasks a weaker one solved. Every one of those six runs failed with:

    dsh: QUOTA: [1113][Insufficient balance or no resource package. Please recharge.]

**The z.ai account ran out of credit.** The gateway timeline shows the last successful request at
19:37:23 UTC and the QUOTA failures immediately after, in the final ~80 seconds of a 41-minute run. All
six failures name the same cause, in five different arms, and `opencode`'s two failures carry the same
error code in its JSON output.

GLM-5.3 never attempted those tasks. There is **no evidence** that a stronger model underperforms a
weaker one anywhere in this study, and the "first quality differentiation" it appeared to provide does
not exist.

**Retained as a lesson, and the second of its kind.** The first retraction (F4) came from treating one
task repeated three times as replication. This one came from reading an infrastructure error as a
result — the failure text was in the log the whole time and I did not read it before writing the claim.
**A non-zero exit is not evidence until its cause is known.**

**What is actually true:** 69 of 75 GLM-5.3 runs completed and solved, and the remaining 6 are
infrastructure failures excluded under the pre-registration's exclusion rules. The GLM-5.3-Flash run
(310/310) contains no QUOTA errors and is unaffected.

**69 of 75 solved on GLM-5.3 — the first quality differentiation in the study.** All 310 Flash runs
solved; GLM-5.3 failed six:

- `single-step-retry-after` failed in **all five arms** — the model cannot solve it, though Flash could.
- `opencode` additionally failed `single-step-parse-negative`.

> **RETRACTED IN PLACE 2026-10-01.** The two bullets above restate the claim retracted 25 lines earlier
> in this same entry ("There is **no evidence** that a stronger model underperforms a weaker one
> anywhere in this study"). The six runs did not happen; they are the `1113 Insufficient balance`
> credit failures. `notes/reviews/CRITICAL-REVIEW.md` §3.2 flagged this verbatim contradiction and it is now
> removed rather than explained. The genuinely true statement is the one above it: 69 of 75 GLM-5.3
> runs completed and solved.

GLM-5.3 vs GLM-5.3-Flash, same tasks and arms. Note the two are nearly identical on price ratio
(3.14 vs 3.33), so this tests **capability**, not pricing. Queued in `notes/plans/PENDING-RUNS.md`.

---

## F8 — Cache discipline matters in proportion to the provider's cache discount  ·  PENDING

**Untested hypothesis.** Our providers give a **5x** cache discount, and cache explains nothing (F2).

> **CORRECTED 2026-10-01.** DeepSeek's cache discount is **50x** off-peak ($0.15 miss against $0.003
> hit), not 5x — so the premise that our providers are a low-discount baseline is false. MiMo's
> 50–120x is a contrast against our 50x, not against our 5x, and this hypothesis was already testable
> on the data here. F31 reports the cache-regime finding that replaced it.
MiMo prices the cache hit at ¥0.02–0.025 against ¥1.00–3.00 miss — a **50–120x** discount. If cache
discipline scales with the discount, it should dominate on MiMo. If it does not, F2 is stronger for
being tested where the cache is most valuable.

---

## F9 — Code-mode presentation is the cause, not DSH's implementation  ·  PENDING

Currently *"code-mode is cheaper"* and *"DSH's PTC is cheaper"* are the same claim, because DSH is the
only harness with a code-mode arm. `opencode:codemode` separates them. See `notes/plans/PENDING-RUNS.md` §3.

---

## F10 — Harness cost scales differently with task size  ·  PENDING

**Probed and promising.** Cost rises with fixture size for every arm (r = 0.59–0.75), but the **slope
differs by ~2.5x**:

| arm | slope, \$ per fixture line |
|---|---|
| \`opencode\` | **\$0.000022** |
| \`dsh:ptc\` | \$0.000035 |
| \`dsh:native-opt\` | \$0.000039 |
| \`dsh:ptc-opt\` | \$0.000041 |
| \`dsh:native\` | **\$0.000055** |

**Why it matters:** if the gap widens with task size, then harness choice matters MORE on large
repositories — and every benchmark that measures on small fixtures understates it. Note the ranking
does NOT cross over in this range; what varies is the divergence rate. Range tested is only 226–615
lines, so the slope is extrapolated well beyond the data if used to predict large repos.

**Missing causal work.** This still does not say WHY step counts differ. That is the paper's real gap:
we measured *what* varies, not *why*. Per-request logs contain tool counts, message counts and request
bytes, so a step-count model is computable without new runs.

## F11 — Harness cost is only ±15–22% repeatable on an identical task  ·  PENDING

Within-task coefficient of variation across seeds: **15.2%** (\`dsh:native\`) to **22.5\%**
(\`dsh:ptc-opt\`). Total CV across tasks is 52–70%, so most of the apparent variance is task
heterogeneity — but the residual is real.

**Why it matters:** it quantifies why single-run benchmarks are unreliable, and it is the empirical
basis for this study's seed count. A field that reports one run per (harness, task) cell is reporting
a number with a ±20% error bar.

## F12 — Native tool presentation costs ~20-30% more REQUESTS than code-mode  ·  ROBUST

Steps taken per run, by number of tool schemas presented, on both providers:

| tools presented | arm | DeepSeek steps | GLM steps |
|---|---|---|---|
| **1** | \`dsh:ptc\` | 10.8 | 10.8 |
| **1** | \`dsh:ptc-opt\` | 11.2 | 11.0 |
| 10 | \`opencode\` | 10.1 | 9.6 |
| **24** | \`dsh:native-opt\` | 13.5 | 12.5 |
| **24** | \`dsh:native\` | 14.5 | 12.5 |

Presenting 24 tool schemas instead of 1 costs **+20% to +34% more model requests**, on both providers,
across 408 runs. This is the closest thing the study has to a *causal* claim, because tool count is set
by the experiment rather than observed.

**But tool count is not the whole story:** \`opencode\` presents 10 tools and takes the FEWEST steps. So
schema count raises request count within a harness, and does not explain differences between harnesses.

## F13 — Harnesses differ ~1.8x in OUTPUT VERBOSITY at equal solve rate  ·  PENDING

Mean total output tokens per run, DeepSeek, all arms solving every task:

| arm | total output tokens |
|---|---|
| \`opencode\` | **7,006** |
| \`dsh:ptc\` | 12,763 |
| \`dsh:native-opt\` | 13,170 |
| \`dsh:native\` | 15,084 |
| \`dsh:ptc-opt\` | 15,318 |

**DSH emits ~1.8x more output than OpenCode for the same solved task.** Output tokens rank the arms by
cost more reliably than step count does, on both providers.

Verbosity is a harness property — a function of its prompting and tool ergonomics — not an arithmetic
consequence, and it is directly tunable. This is a better candidate for the paper's headline
*mechanism* than step count, and it is consistent with the provider interaction: GLM charges 3.33x for
output against DeepSeek's 2x, so the same verbosity difference costs relatively more there.

## RULED OUT — work fragmentation

**Hypothesis, refuted.** If a harness made more requests by splitting work into smaller turns, steps
would correlate NEGATIVELY with output-per-step. Measured across all 10 arm-provider cells, the
correlation is **positive in every one** (r = +0.23 to +0.74). More requests come with MORE output per
request: harnesses that take more steps are doing more work, not fragmenting it. Do not pursue.

## RULED OUT — latency as an independent axis

Probed and rejected. Cost per second of wall-clock is nearly constant across arms
(1.85e-4 to 2.27e-4 \$/s, a 23% range) while cost itself varies 46%. **Latency is therefore close to
collinear with cost**, because both are driven by request count. \`opencode\` is both the cheapest and
the fastest, so there is no cost–latency trade-off to report. Do not spend runs on this.

## RULED OUT — wasted spend from failed requests

0.0% of DeepSeek requests returned non-200 across 1,828 requests. The 7.4% failure rate seen earlier
is **GLM-specific** (a harness's internal small call that GLM rejects) and does not generalise.

## Method notes worth carrying into the paper

- **Attribution.** Run identity was derived with a regex that split at any segment beginning with
  "r", silently zeroing whole tasks. 632 records recovered offline from their raw synthetic keys.
  Any join must go through `tools/attribute.mjs`.
- **Protocol drift.** DSH 0.1.7 moved to Anthropic Messages; the gateway answered 404 to all 40
  requests. A harness can change protocol across a version bump.
- **Silent provider fallback.** The runner's OpenCode config template hardcoded the gateway URL and
  DeepSeek model names, so pointing it at GLM would have measured DeepSeek while reporting GLM.
- **Failed requests count as steps.** 7.4% of GLM requests return non-200 (DSH's internal
  `max_tokens: 64` call). Account for it in step-based analysis.
- **Version pinning.** DSH 0.1.7-rc.2. Milestones 1–2 are 0.1.5-alpha.1 and must not be pooled.
- **A placeholder that expands to `"undefined"` still runs.** `String.replace` coerces its second
  argument, so a missing value becomes the literal string `undefined` on a command line.
  `tools/run-experiment.mjs` `commandFor()` read `p.syntheticKey`, a property no plan entry ever had,
  so any harness using the `{key}` placeholder sent `undefined` as its API key. The gateway swapped
  it for the real key, every request returned 200, and the run reported success — while attribution
  collapsed to `harness: unlabelled`, `runId: unset` and the cost became unrecoverable. Only cline and
  aider use `{key}`; cline was blocked on the base-URL bug and aider is excluded, which is why it
  survived. 33 such records were sitting in `results/gateway.jsonl`. `commandFor()` now throws.
  Lesson: verify by synthetic key, never by the harness's exit code or request count.
- **An instrument can reproduce the failure it exists to detect.** `tools/harness-smoke.mjs` checked
  "did the gateway see it?" with `r.harness === id`, which matches *every earlier run of the same
  harness already in the log file*. It reported "gateway logged this harness: 9 request(s)" for a run
  whose command line never executed — a PASS with zero real evidence, which is exactly the Cline
  failure mode. It now scopes to the run's unique synthetic key and reports how many older records it
  refused to count.
- **A base URL read only from a config store is a silent routing hazard.** Cline takes its endpoint
  from `<config-dir>/data/settings/providers.json` — no flag, no env var. With no `baseUrl` there it
  does not fail; it calls `https://api.openai.com/v1/chat/completions`. A shared global store also
  means a run aimed at gateway port A is silently billed through port B. `--config` into a fresh
  directory per run fixes both.



---

# Findings added 2026-10-01, from the canonical cost panel

Everything below is computed by `node tools/panel-analysis.mjs` and `node tools/hypotheses.mjs` from
`tools/cost-panel.mjs`, which re-prices every run from archived token counts under the pre-registered
cost function and one corrected card per model. Output is archived in `analysis/`. None of these
findings existed before, because the seven matrices had never been put in one table.

## F29 — The study contains a 124-run placebo, and it moves 7.7%  ·  SUPERSEDED AS A NOISE FLOOR — see the note below

> **STATUS 2026-10-04 — the arithmetic stands; the STATUS and the noise-floor claim do not.**
> `notes/records/STEP2-RECONCILIATION.md` §7.6 records that the current panel finds **no placebo at all**
> (`placebo: []`, `noiseFloorPct: null`), and that the published noise floor moved twice —
> **46.2%** and then **7.7%** — both of which are now withdrawn. F44 (below) records that these
> two arms were **not** byte-identical: their first requests differ by 30 bytes, six copies of the
> arm-id string, which makes them distinguishable to the model. So they are not a control, and
> **the sentence "below ~8% at this sample size is not distinguishable from nothing" must not be
> published.**
>
> What survives untouched is the *finding* that produced this entry: `ds-full`'s four terse arms
> never received the terseness instruction, all 124 records carry `terse:false`, and **no
> terseness conclusion may be drawn from them.** The interval correction below is also sound
> (the redrawn interval contains zero). It is the *label* — placebo, noise floor, control — that
> was wrong, which is the fifth time in this register that a plausible number was the dangerous
> one.

`ds-full`'s four "terse" arms never received the terseness instruction (see `notes/reviews/REVIEW-RESPONSE.md` §2.5:
all 124 records carry `terse:false`, and the runner could not have applied the suffix before commit
`9b03ad8`). Nothing was manipulated. The two arms of each supposed contrast received the same prompt and the
same configuration — though **"byte-identical" is too strong and is withdrawn (F44)**: the two arms'
first requests differ by exactly 30 bytes, six copies of the arm-id string, one of them inside the
working-directory path that the system prompt names. The leak primes in the *opposite* direction to
the observed effect and the effect is zero anyway, so it changes no conclusion; it does mean the
arms were distinguishable to the model, which should never have been asserted as impossible.

| contrast | tasks | arm A | arm B | difference | 95% CI, cluster bootstrap over tasks |
|---|---|---|---|---|---|
| `dsh:native` vs `dsh:native-terse` | 31 | $0.00898 | $0.00967 | **+7.7%** | **[−0.4%, 16.7%]** |
| `dsh:ptc` vs `dsh:ptc-terse` | 31 | $0.00879 | $0.00910 | +3.6% | [−6.4%, 14.6%] |

> **CORRECTED 2026-10-01 (F44).** The first version of this table read **[0.1%, 16.6%]** and the entry
> claimed "one interval excludes zero". **That was an artefact of a broken random number generator**,
> not of the data. The bootstrap was drawn with `(s * 1103515245 + 12345) & 0x7fffffff` evaluated in
> JavaScript doubles, where the product exceeds 2^53 and the low bits — the only ones an LCG
> randomises — are rounded away before the mask runs. Measured: **100,000 of 100,000 draws diverge
> from the exact BigInt stream**, the corrupted stream has a **cycle of length 10,466**, and it yields
> **16,936 distinct values per million draws** against mulberry32's 999,739. Redrawn with a sound
> generator and 5,000 iterations the interval is **[−0.4%, +16.7%]: it contains zero.** All three
> point estimates are unchanged, and paired t (p = 0.077), Wilcoxon (p = 0.142) and a sign-flip
> permutation (p = 0.089) all agree that the placebo difference is not distinguishable from nothing.
> `tools/rng.mjs` holds the proof and the replacement.

**Two arms that were given the same prompt differ by up to 7.7%, and neither interval excludes
zero.**
> **RETRACTED 2026-10-04, at the point where it stood.** The two sentences that followed this one —
> that this is "the measured noise floor for an arm-level cost contrast at n = 62 per arm", and that
> "a claimed harness effect below ~8% at this sample size is not distinguishable from nothing" — are
> **withdrawn.** They were withdrawn because the arms were in fact distinguishable (F44: 30 bytes of
> arm-id in the first request), so this contrast is not a null control, and because the current panel
> reports `noiseFloorPct: null`. The measured fact that remains is the one in bold: two arms that
> differ by 30 bytes of prompt moved 7.7% at this sample size, which is a statement about sensitivity
> to prompt bytes, not a floor on measurable effects. See `notes/reviews/REVIEW-RESPONSE.md` §2.5 and

It is a finding rather than a defect because it is exactly the control the literature lacks. No other
agent-cost study can report a treated arm it knows was not treated.

## F30 — The harness ranking is not provider-stable  ·  ROBUST (the paper's headline)

Eight arms are valid and present on all seven models. On those:

> **The five figures in this entry are the seven-model population and are kept as the record.** On the
> six matrices that ship (`analysis/panel-analysis-6model-2026-10-03.json`), `PAPER.md` §3.4: median
> Spearman rho = **0.238**, permutation p = **0.0467**, arm-versus-arm concordance **62.1%**, and
> **40 of 54** adjacent rank pairs are ties (74.1%). The direction and the conclusion are unchanged —
> the ranking still does not transfer — but the rank agreement is **smaller** on six models than the
> 0.286 below, and the p moves from 0.012 to 0.0467. F36 repeats this five-number summary inside its
> re-run invariance argument; see the note there.
>
> **Added 2026-10-10 — the position sensitivity.** Every figure above is on raw costs under the study's
> single shared execution order. Re-computed on position-offset costs
> (`analysis/ranking-adjusted-2026-10-10.json`, `tools/ranking-adjusted.mjs`): the tie fraction moves
> 40/54 (74.1%) to **41/54 (75.9%)** and the median rho is unchanged at **0.238**; on tasks-b, 33/54
> (61.1%) to **34/54 (63.0%)** and the rho 0.024 to **-0.071**. The adjustment makes the ordering more
> partial, not less, so this entry's conclusion is unaffected.

- the **cheapest arm differs by provider, four ways in seven models**: `goose` (DeepSeek, Haiku,
  luna), `opencode` (GLM-5.3-Flash), `dsh:native` (GLM-5.3), `dsh:native-opt` (Qwen, Sonnet);
- the **median Spearman rank correlation** between two providers' cost orderings is **0.286**
  (range −0.048 to **0.952** over 21 model pairs); permutation p = **0.012** against independent random
  arm orders;
- of all 28 arm-versus-arm cost comparisons, **63.6% keep the same winner on a second provider**
  (chance 50%). Worst provider pair DeepSeek vs Sonnet: **46.4%**. Best: **DeepSeek vs luna, 92.9%**.
  **The 46.4% "worse than a coin flip" is fragile and its punchline is withdrawn (F44):** it was
  produced with `f18-sonnet` — one hard task, 10 arms — folded into Sonnet's panel while the other
  three `f18-*` matrices were not, giving Sonnet a 32nd task no other model had. Without it the pair
  is **50.0%**, exactly chance. The aggregate survives; the coincidence does not;
- **within the DSH configurations alone — the four arms that differ only in tool presentation and
  policy — concordance is 54.0%**, against 68.3% among the four external harnesses. The effect the
  study was built to measure is the one that transfers worst.

**Robustness, because a referee will ask.** Excluding both Anthropic models: **66.4%**. Restricted to
the five models whose worst arm still solves ≥90% of runs: **65.7%**. The disagreement is not an
Anthropic artefact and not a quality artefact. (The two coincidentally matched at 66.4% before the
`f18-sonnet` removal; they no longer do, which is the more honest presentation.)

**Terse arms are excluded from this test for all seven models**, not just DeepSeek, even though they
are valid on six. Including them would compare a treatment on six models against a non-treatment on
the seventh. The exclusion is conservative: the terse arms rank first or second on **six** of the
seven models, so including them would raise measured agreement.

## F31 — The price ratio does not explain it; the cache regime does  ·  ROBUST

> **READ THIS FIRST (added 2026-10-09).** Every figure in this entry is the **seven-model** execution,
> and that data was destroyed on 2026-10-02 — nobody can regenerate it. The **six-model** correction is
> below under its own heading, and it moves three of the claims above: H1 is **no longer refuted** (on
> six models b1 = +0.00467, INCONCLUSIVE, and the sign DOES depend on one provider), the spread figures
> are **42.27 / 52.64 / 74.59 pp**, and the Anthropic rows of the cache table are **forbidden** — A6
> records why. Do not quote a number from this entry without the correction beside it.

**H1 is REFUTED by its own pre-registered rule, for the first time by the regression the rule
specifies.** `b1 = −0.367`, cluster-bootstrap 95% CI **[−0.494, −0.247]**; the filed hypothesis was
`b1 > 0`. The within-task estimate is `−0.393` [−0.541, −0.254]. **All seven leave-one-provider-out
fits stay negative** (−0.79, −0.39, −0.38, −0.35, −0.08, −0.42, −0.35), so the sign does not depend on
any one provider. The output-share account is not merely unsupported; its coefficient has the wrong
sign, precisely estimated.

**The pre-specified secondary is met nominally and should not be believed.** The rule says the penalty
at ratio 5.0 must exceed the penalty at ratio 3.33 by more than 5 percentage points. It does, by
40.6 pp (mean +40.8% against +0.2%). But **the three models at ratio 5.00 alone span 79.5 percentage
points** (+83.7% Haiku, +34.5% Sonnet, +4.2% luna), against 85.8 pp across the entire ratio axis from
3.13 to 5.00. A grouping whose within-group variance is 93% of its total variance carries no
information. The secondary is reported as met, and as uninterpretable.

**What does separate providers is whether caching is automatic or declared.**

| model | provider | mean cache hit | arm spread | caching |
|---|---|---|---|---|
| DeepSeek V4.1 Flash | DeepSeek | 90.6% | 5.4 pp | automatic |
| Qwen3.8-Flash | Alibaba | 89.1% | 3.7 pp | automatic |
| GLM-5.3 | z.ai | 87.6% | 8.8 pp | automatic |
| GLM-5.3-Flash | z.ai | 87.3% | 9.2 pp | automatic |
| gpt-6-luna | OpenAI | 87.2% | 13.9 pp | automatic |
| Claude Sonnet 5.5 | Anthropic | **16.9%** | **51.5 pp** | **client must declare** |
| Claude Haiku 4.5 | Anthropic | **10.1%** | **36.0 pp** | **client must declare** |

On five providers caching is a property of the *provider* and the arm spread is 3.7–13.9 pp. On
Anthropic caching is a property of the *harness*, and the arm spread is 36–51 pp — larger than the
entire between-provider range on the automatic providers. That is a harness × provider interaction,
and a single-provider design cannot see it by construction.

**This also explains the PTC result without a price story.** On Sonnet the PTC penalty under
`cost_billed` is +34.5% but under `cost_cold` it is −7.5%: the penalty is entirely a cache effect.
On Haiku it is +45% cold as well, so it is not. The two Anthropic models at the same price ratio
disagree about whether code-mode is expensive, and cache explains one of them.


---

### F31 — CORRECTION, 2026-10-04 (six models)

**This section is the seven-model finding, and its data no longer exists** (2026-10-02; see the
provenance banner). It is kept as the record. On the six matrices that ship, three of its claims move:

1. **H1 is no longer refuted.** On six models `b1 = +0.00467`, cluster-bootstrap 95% CI
   **[−0.00551, +0.01568]** — positive, containing zero, which the pre-registered rule calls
   **INCONCLUSIVE**, not refuted. And the sign DOES depend on one provider: leave-one-out, dropping
   DeepSeek gives **+0.133**. The sentence above — "the sign does not depend on any one provider" —
   is false on the data that ships and must not be repeated.
2. **The spread figures are 42.27 pp, 52.64 pp and 74.59 pp.** The secondary gap is **42.27 pp**; the
   three models at ratio 5.00 span **52.64 pp** (+53.84% Haiku, +9.51% Sonnet, +1.20% luna), against
   **74.59 pp** across the whole axis. That is **70.6%** of the total variance inside one ratio value.
   **The 93% above is unreproducible and must not be quoted**; the corrected argument is slightly
   weaker and still decisive.
3. **The cache table must not be quoted for Anthropic.** Its Haiku 10.1% / Sonnet 16.9% rows and the
   36–51 pp arm spreads come from section A6, and A6 reports a **0.000** hit rate for every external
   arm on Anthropic because the gateway did not record the cache split on that path
   (`notes/defects/DEFECT-anthropic-external-costs.md`). **There is no clean statement of the same interaction in this
   study, and the one offered here is withdrawn (2026-10-09).** The prefix-retention figures — 0.560
   (Haiku), 0.451 (Sonnet) attributed to "the four external harnesses" — are a pooling artefact:
   `armClass()` sends every arm that is not `dsh:ptc`/`dsh:native` to "external", so the bucket is
   **eight arms / 496 runs**, four of them DSH `-opt`/`-terse` arms at ~0.998 and four coded 0.0000 for
   the missing cache split. See `PAPER.md` §3.3, which now states this. **No external harness's
   retention is measured on Anthropic here.** The DSH arms' own retention, 0.994–1.000, does stand.

The six-model version of this finding is `notes/records/STEP2-RECONCILIATION.md` §7, regenerated by
`node tools/artifact.mjs`.

**CORRECTION, 2026-10-04 (six models) — supplement to the block above.** Six further items in the
seven-model text are not named there; two extend a numbered claim rather than add one. Sources of
record: `analysis/hypotheses-6model-2026-10-03.json`, `analysis/panel-analysis-6model-2026-10-03.json`,
`analysis/prefix-retention.json`. Every figure below was re-derived from those files on 2026-10-05.

4. **The within-task estimate is `+0.00059` [−0.01017, +0.01093]**, not `−0.393` [−0.541, −0.254]
   (H1 `b1Within`). It is positive and contains zero, like the pooled fit.
5. **The leave-one-out list is `+0.133, −0.0052, −0.0077, −0.0104, +0.0057, +0.0033`** (dropping
   DeepSeek, GLM-5.3-Flash, Qwen, Haiku, Sonnet, luna): **three of six fits are positive.** The
   sentence above asserts the opposite, and item 1 rules it out.
6. **The secondary gap is `+21.52%` against `−20.75%` = 42.27 pp** — the three models at ratio 5.00
   averaged, against GLM-5.3-Flash at 3.33 — not `40.6 pp (mean +40.8% against +0.2%)`. The two means
   are arithmetic on the A2 differentials; only the 42.27 pp gap is a shipped field.
7. **The cache table's five automatic rows are seven-model, and its luna spread (13.9 pp) matches
   neither population** (the seven-model witness reads 13.3 pp). On six models the four automatic
   providers read **DeepSeek 90.2% / 6.4 pp, GLM-5.3-Flash 86.2% / 17.9 pp, Qwen3.8-Flash 75.7% /
   31.3 pp, gpt-6-luna 86.6% / 13.0 pp** (A6), so `3.7–13.9 pp` becomes **6.4–31.3 pp**, and GLM-5.3
   has no six-model row. The Anthropic rows remain forbidden (item 3, and A6's own `automatic` field
   reads `NO - client must declare` for both, with a `worst` of 0); the clean statement of that
   interaction is still prefix retention.
8. **The Sonnet pair is `+9.51%` billed / `−15.11%` cold and the Haiku pair `+53.84%` / `+18.67%`**
   (`prefix-retention.json`, `billedDiffPct` / `coldDiffPct`), not +34.5% / −7.5% and +45% cold. The
   structure survives — cache pricing explains one Anthropic model and not the other — but no number
   in that sentence does.
9. **The heading is the claim that moves furthest.** On six models the cache regime does not explain
   the differential in general: retention explains **one provider of six** (Qwen), and the Anthropic
   differentials are volume effects (`PAPER.md` §3.2, `notes/records/STEP2-RECONCILIATION.md` §7.4). What survives
   is the **sign** disagreement, which is how `PAPER.md` §3.1 titles it.

## F32 — The terseness instruction generalises: −12% to −54% on six models  ·  ROBUST (upgrades F22)

F22 rested on GLM-5.3-Flash alone. The terse arms are valid on six of the seven models, and the effect
travels:

| model | contrast | change | 95% CI | output tokens |
|---|---|---|---|---|
| GLM-5.3-Flash | native → native-terse | **−28.9%** | [−42.8%, −16.0%] | −42.8% |
| GLM-5.3-Flash | ptc → ptc-terse | **−31.8%** | [−61.6%, −13.8%] | −46.9% |
| GLM-5.3 | native → native-terse | **−30.2%** | [−49.5%, −13.7%] | −55.1% |
| GLM-5.3 | ptc → ptc-terse | −45.7% | [−85.1%, −17.1%] | −61.7% |
| Qwen3.8-Flash | native → native-terse | −36.1% | [−45.8%, −27.7%] | −46.9% |
| Qwen3.8-Flash | ptc → ptc-terse | −45.6% | [−68.0%, −29.1%] | −53.0% |
| Claude Haiku 4.5 | native → native-terse | −25.4% | [−58.0%, −1.6%] | −31.7% |
| Claude Haiku 4.5 | ptc → ptc-terse | **−53.2%** | [−76.2%, −36.5%] | −61.7% |
| Claude Sonnet 5.5 | native → native-terse | −11.8% | [−26.5%, +1.4%] | −27.5% |
| Claude Sonnet 5.5 | ptc → ptc-terse | −1.9% | [−8.9%, +4.8%] | −26.2% |
| gpt-6-luna | native → native-terse | −15.4% | [−29.7%, +1.1%] | −23.2% |
| gpt-6-luna | ptc → ptc-terse | −22.6% | [−33.5%, −13.5%] | −24.8% |

> **CORRECTED 2026-10-01 (F44). "Not one moves solve rate" is FALSE, on this table's largest
> contrast.** The claim was never tested — the analysis stored each contrast's before/after solve
> counts and then never printed or tested them. McNemar, paired by (task, seed), run for the first
> time: **Haiku `dsh:ptc` → `dsh:ptc-terse` solves 48 of 62 cells before and 35 after, b/c = 17/4,
> exact p = 0.0072.** A −21 percentage-point solve-rate drop sits under a −53% cost headline, and per
> *solved* task the same contrast is −38%, not −53%: a third of the celebrated effect is dead runs.
> F22's own caveat ("on harder tasks terseness may cost correctness") had already fired and the
> register asserted the opposite. **Every other contrast is p = 1.0000** — the other eleven do not
> move solve rate at all, so the claim was true of eleven of twelve and stated of all twelve.
> `tools/panel-analysis.mjs` now runs and prints the test (section A4, "SOLVE RATE").

**9 of 12 contrasts have a CI excluding zero, on six models across five providers, and eleven of the
twelve move solve rate not at all — the twelfth, Haiku's PTC contrast, costs 21 points of solve rate
and is not a free lever.** Output volume falls 23–62% everywhere, including where cost does not — which is itself a
result: cutting output is not the same as cutting cost, and the two decouple exactly where caching is
worst (Sonnet, where output falls 26% and cost falls 2%).

**The instruction is the cheapest and largest lever in the study.** The largest harness effect
measured anywhere here is `opencode` against `dsh:native` on DeepSeek, at −35%, and the study's
placebo moves 7.7%; the terseness instruction reaches −53% while changing nothing but 15 words of
prompt.

**DeepSeek is excluded, and must be.** Its terse arms are the sham of F29. Where F22's caveat said the
effect was untested off GLM-5.3-Flash, the honest statement now is that it is confirmed on five
providers and **untested on DeepSeek**, and that the DeepSeek "contrast" is this study's placebo.

## F33 — Haiku 4.5 is the only model with a genuine solve-rate deficit  ·  MEASURED (corrects F28)

Under pre-registration rule 9, excluding only unsolved runs whose own output names an infrastructure
fault (`node tools/failure-classify.mjs`):

> **Corrected 2026-10-01 (F39).** The first version of this table used rule 9's text half only, so
> the 24 Haiku runs that died on `credit balance is too low` were counted as model failures and the
> figures below are the corrected ones. The conclusion is unchanged and slightly weaker; the luna row
> now also reflects its 113-run retry.

| model | as published | **analysed after rule 9, both halves** | excluded | solved after |
|---|---|---|---|---|
| DeepSeek V4.1 Flash | 619/620 = 99.8% | 619/620 | 0 | **99.8%** |
| GLM-5.3-Flash | 310/310 = 100% | 310/310 | 0 | **100.0%** |
| GLM-5.3 | 308/316 = 97.5% | 308/308 | 8 | **100.0%** |
| Qwen3.8-Flash | 608/620 = 98.1% | 608/615 | 5 | **98.9%** |
| gpt-6-luna | 601/732 = 82.1% | 601/620 | **112** | **96.9%** |
| Claude Haiku 4.5 | 547/654 = 83.6% | **547/629** | 25 | **87.0%** |
| Claude Sonnet 5.5 | 617/620 = 99.5% | 617/619 | 1 | **99.7%** |

*(Regenerated 2026-10-01 after F44: the earlier version of this table used the text half only, and its
Haiku row read 87.7%. Sonnet's row was absent and is included.)*

Three of the study's numbers were measuring the instrument:
**luna's 79% was 96.9%** (112 of its "failures" are named faults, 82 of them the documented protocol
drift, and 111 of the 113 retried runs then solved), **GLM-5.3's 97.5% was 100.0%**, and
**Haiku's 83.6% was 87.0%** (25 infrastructure failures, 23 of them credit).
**Haiku remains the only model with a genuine solve-rate deficit, and it is the largest quality
separation in the study.** Its worst arm now solves **58%** and its best **100%** — a spread of 42
points on the same tasks and the same model. F5's "every arm solves every task" framing describes
batch 1 on the non-Anthropic models and nothing else.

## F34 — H1–H5 as the pre-registration actually decides them  ·  MEASURED

`node tools/hypotheses.mjs --json <tmp>/hypotheses.json`. The rules are executed as filed; where a rule is defective, it is
executed anyway and the defect reported, because a pre-registered rule quietly improved after the fact
is not a pre-registered rule.

> **READ THIS FIRST (added 2026-10-09).** The figures in this entry are the **seven-model** execution;
> that data was destroyed on 2026-10-02 and nobody can regenerate it. Two corrections follow: the one
> below (2026-10-01, the pre-F39-fix archive) and the six-model one further down. Do not quote a number
> from here without the correction beside it.
>
> **NUMBERS CORRECTED 2026-10-01 (F44).** The figures first printed here were the pre-F39-fix
> archive, generated at 13:10Z and never regenerated, and they contradicted the tool this entry tells
> the reader to run. Three further defects were found by the same review and fixed in the same pass:
> the Wilcoxon was computed in the **wrong tail** (p = P(W+ ≥ observed), the p-value for the *opposite*
> hypothesis — so "p < 0.05 AND CI below 0" could never fire and SUPPORTED was unreachable as coded);
> H1–H4 ran on a first-record-only population while the panel tool averaged all records, and because
> that flag is assigned *before* the exclusion checks the view silently deleted 142 cells; and the
> pooled/within estimators were being mixed across hypotheses.

| | rule as filed | outcome |
|---|---|---|
| **H1** | supported if b1 > 0 and CI excludes 0; refuted if b1 ≤ 0 with CI excluding 0 | **REFUTED.** b1 = **−0.367** [−0.494, −0.247]; within-task **−0.403** [−0.546, −0.273]; sign robust to dropping any provider |
| **H1 secondary** | penalty at ratio 5.0 exceeds that at 3.33 by > 5 pp | **MET nominally** (**41.1 pp**) and **not interpretable**: the three models *at* ratio 5.00 span 79–87 pp, against the whole axis's 86 pp |
| **H2** | supported if exact one-sided Wilcoxon p < 0.05 **and** CI entirely below 0; refuted if CI entirely above 0; otherwise inconclusive | **INCONCLUSIVE.** Exact Wilcoxon n = 31, W+ = 261, **p = 0.6029** (correct tail); CI [−$0.002054, +$0.001215] |
| **H3** | CI for b1 excludes 0 (level and sidedness unspecified) | **SUPPORTED** on the stricter two-sided 95% reading. b1 = **+1.23 requests** [0.52, 1.94]; within-task +1.23 [0.52, 1.94] |
| **H4** | supported if the cache coefficient's CI contains 0; refuted if it excludes 0 | **"REFUTED"** (b_cache = **−0.287**, CI [−0.404, −0.180]) — and the rule is unfalsifiable: a null supports the study's own negative hypothesis and a non-null is pre-declared publishable. **H4 is demoted to exploratory.** It is not evidence about cache. |
| **H5** | no formal test; "two providers cannot establish this"; exploratory whatever it shows | **Confirmed as a hypothesis** (F30) and **kept exploratory in status**: it was filed without a test, and a study cannot promote its own hypothesis after seeing the data. The paper reports it as exploratory and says why the test was withheld. |

**NUMBERS CORRECTED 2026-10-04 (six models).** The table above is the seven-model execution and is kept
as the record; on the six matrices that ship (`analysis/hypotheses-6model-2026-10-03.json`) the same
rules decide:

* **H1 → INCONCLUSIVE.** `b1Pooled` = **+0.00467** [−0.00551, +0.01568], n = 186; within-task
  **+0.00059** [−0.01017, +0.01093]. The sign is **not** robust — dropping DeepSeek gives **+0.133**,
  and three of the six leave-one-out fits are positive. The filed random-intercept model was fitted on
  2026-10-04 and reproduces b1 with `s_u` = 0 (`notes/records/MIXED-EFFECTS-2026-10-04.md` §1).
* **H1 secondary → MET nominally at 42.27 pp**, and the three models *at* ratio 5.00 span **52.64 pp**
  against the whole axis's **74.59 pp** — 70.6% of the spread inside one ratio value.
* **H2 → INCONCLUSIVE.** Exact Wilcoxon n = 31, W+ = **291**, **p = 0.8004** (correct tail); CI
  [−$0.000101, +$0.003542].
* **H3 → SUPPORTED**, and larger: `b1Pooled` = **+2.228 requests** [1.234, 3.328], n = 744; within-task
  +2.2285 [1.2339, 3.3280]. The filed mixed model returns **+2.2285** with `s_u` = 3.085 and ICC = 0.134,
  so the verdict does not rest on ignoring task heterogeneity (`notes/records/MIXED-EFFECTS-2026-10-04.md` §1).
* **H4 → "REFUTED"**, and the sign has flipped: `bC` = **+0.11157** [+0.06205, +0.17271]. The rule is
  still unfalsifiable and H4 stays demoted to exploratory.
* **H5** is unchanged: no test was filed, so nothing moves.

**The "+1.05 requests per arm contrast" below is stale twice over.** F44 §5 records the move +1.05 →
+1.23 inside the seven-model archive; on six models the same quantity is **+2.228** (H3 `b1Pooled`).
"On five providers" is still true of the six-model panel and is not a correction.

**F21 said "NOT SUPPORTED" for H2. The rule has no such outcome.** The substantive conclusion is
unchanged and slightly bolder, but the label was not the pre-registered one, and the pre-registered
test had been substituted without disclosure. Both are now fixed.

**H3 is the study's one clean confirmatory win**: tool-schema count raises request count, +1.05
requests per arm contrast, on five providers, and it is the only factor in the design the experiment
sets rather than observes. It is also the only hypothesis whose pre-registered rule was followed
without amendment.


## F35 — The rank tables the study reported do not survive their own error bars  ·  ROBUST

> **READ THIS FIRST (added 2026-10-09).** The numbers in this entry come from the **seven-model**
> archive, which was destroyed on 2026-10-02 and cannot be regenerated. The **six-model** correction is
> below, and it records that the remaining discrepancy is inside the seven-model witness rather than in
> the table. Do not quote a figure from here without the correction beside it.

F29 measures the design's noise floor at 7.7%. A rank table ignores it, so every adjacent pair in
every provider's cost ordering is tested the same way as any other contrast — paired by task, cluster
bootstrap over tasks, 95%.

```
node tools/panel-analysis.mjs --json <tmp>/panel-analysis.json      # section A8 - bare, it overwrites the witness
```

**48 of 63 adjacent pairs are ties.** Per provider: *(corrected 2026-10-04: this prose said 47
while its own table says 15 distinguishable of 63, i.e. 48 ties — 63 − 15 = 48. The arithmetic error
is independent of any data. On the six matrices that ship the equivalent is **40 of 54, 74.1%** — see
`notes/records/STEP2-RECONCILIATION.md` §7.6.)*

| provider | adjacent pairs | distinguishable | notes |
|---|---|---|---|
| DeepSeek V4.1 Flash | 9 | **1** | only `dsh:ptc` 51.3% **above** `opencode` (equivalently `opencode` 33.9% below `dsh:ptc`); the other 8 steps are ties |
| GLM-5.3-Flash | 9 | 3 | |
| GLM-5.3 | 9 | 2 | |
| Qwen3.8-Flash | 9 | 4 | |
| Claude Haiku 4.5 | 9 | **1** | |
| Claude Sonnet 5.5 | 9 | 3 | |
| gpt-6-luna | 9 | **1** | only `goose` vs `dsh:ptc-terse`; the other 8 steps are ties |
| **all** | **63** | **15** | **48 ties** |

**CORRECTED 2026-10-04 (six models), and the discrepancy is inside the witness, not in the table.** On
the six matrices that ship (`analysis/panel-analysis-6model-2026-10-03.json` A8): **54 adjacent pairs,
40 ties — 74.1%, 14 distinguishable.** That file's top-level `pairs`/`ties` (54/40) and its own
`details` array agree.

| provider | adjacent pairs | distinguishable | notes |
|---|---|---|---|
| DeepSeek V4.1 Flash | 9 | **1** | only `dsh:ptc-opt` 55.7% **above** `opencode` (equivalently `opencode` 35.8% below `dsh:ptc-opt`); the other 8 steps are ties |
| GLM-5.3-Flash | 9 | **1** | only `openhands` 34.7% **above** `cline` |
| Qwen3.8-Flash | 9 | **1** | only `dsh:ptc-terse` 21.1% **above** `dsh:native-terse` |
| Claude Haiku 4.5 | 9 | **5** | |
| Claude Sonnet 5.5 | 9 | **4** | |
| gpt-6-luna | 9 | **2** | `dsh:ptc-terse` 75.9% above `goose`; `dsh:native-terse` 18.4% above `dsh:ptc-opt` |
| **all** | **54** | **14** | **40 ties (74.1%)** |

**The seven-model witness and its own details disagree by one, and that is recorded rather than
resolved.** `analysis/panel-analysis.json` A8 carries a top-level `ties: 47`, while its `details` array
contains **15 distinguishable and 48 non-distinct pairs** of 63 — which is what the table above says.
The FINDINGS table and the witness's details therefore agree; the witness's counter is the outlier. The
inline note's arithmetic (`63 − 15 = 48`) is correct. The witness is never regenerated, so this stays as
a recorded discrepancy in a frozen file rather than being silently repaired.

**A naming trap in A8's JSON, for anyone checking this by hand.** Each detail is
`{ higher, lower, relPct }`, and **`higher` holds the CHEAPER arm** — `relPct` is how much more the
`lower` arm costs than the `higher` one. Every direction in the table above was taken from `relPct`, not
from the field names, and the arm order was re-derived from the six matrices on 2026-10-05.

Two prose details move with the correction. On six-model DeepSeek the `dsh:ptc` vs `dsh:native` step is
**+0.13%** [−8.97, +9.76] — still a tie, so the point about F3 survives. On luna **seven** of nine steps
are ties, not eight. And `F29 measures the design's noise floor at 7.7%` is withdrawn twice over: F29's
own status note retracts the noise-floor label, and the six-model panel finds no placebo at all
(`placebo: []`, `noiseFloorPct: null`, A7). The rank-step argument does not need it — it stands on the
14 of 54 intervals that exclude zero.

**On DeepSeek — the matrix every early headline was computed from — eight of nine adjacent steps are
statistically indistinguishable**, including `dsh:ptc` vs `dsh:native` (+2.1%, CI [−4.2%, +9.2%]),
which is the contrast F3's entire "does not transfer" claim was built on. On luna the same holds for
eight of nine.

This is the paper's sharpest methodological statement and it does not depend on cross-provider
comparison at all: **the field's standard output is an ordered list of agents by cost, and in this
study three-quarters of the steps in those lists are within the design's own noise.** The rankings
are not wrong; they are unsupported. A harness-comparison paper that reports "A is cheaper than B"
without a paired interval on the same tasks is reporting a coin flip that landed.

**It also deprecates part of this study's own history.** F2's factor shares, F3's "−22.8% on
DeepSeek, +1.1% on GLM", F7's "+1.1% (a wash)", and the whole first-results table were read off rank
tables in which most adjacent steps do not clear this bar. The three-point monotonic table that
carried the original thesis is three points drawn from a table with one distinguishable step.


## F36 — The re-run cells: averaged, never selected  ·  METHOD (answers REVIEW-FINDINGS §J6)

Two matrices contain cells with more than one run record:

| matrix | contested cells | what the earlier record is |
|---|---|---|
| `glm53` | 6 | credit failures (`1113 Insufficient balance`) whose re-run succeeded; the failures are excluded by rule 9, so the re-run is the cell's only valid observation |
| `haiku-full` | 34 | a resume after the matrix stalled at 00:42Z; **24 of the 34 disagree with their earlier record on `solved`** |

They are **averaged**, not selected. The two obvious rules are both selective in a way that
cannot be defended: keeping the first record discards a legitimate second observation, and keeping
the last silently replaces a failure with a success whenever the re-run was prompted *by* the
failure — which, for the haiku resume, is exactly what happened. Averaging is the only rule that
does not depend on why the re-run occurred, and it is what the pre-registration already prescribes
for repeated measurements of a cell ("per-run values are averaged over seeds within each (task,
arm, cell)").

Two safeguards: `tools/cost-panel.mjs` prints `CONTESTED=n` per matrix, and
`tools/coverage.mjs` flags every re-run record. A re-run cannot be invisible.

**It changes nothing material**, which is the point of doing it rather than arguing about it. All
headline numbers are identical to three decimal places under either rule: median Spearman ρ =
0.286, permutation p = 0.012, sign concordance 63.6% (DSH-only 54.0%), 48 of 63 adjacent rank
pairs are ties (the prose said 47; 63 − 15 = 48), placebo floor 7.7%.

*(2026-10-05) Those five figures are the **seven-model** population, and the invariance claim was
verified on it. On the six matrices that ship the same headline quantities read ρ = **0.238**, p =
**0.0467**, concordance **62.1%**, **40 of 54** ties (74.1%), and **no placebo** (`PAPER.md` §3.4, §3.7).
The seven-model placebo floor of 7.7% is withdrawn (F29's status note). The invariance argument has not
been re-derived on six models — doing so means re-running the panel tool, whose default output is the
witness file — so this is recorded as unverified rather than assumed to carry over.*

**What this is not.** Averaging is not a licence to re-run cells. The pre-registration forbids
selective topping-up, and a re-run prompted by a failure is selective however it is analysed —
averaging merely stops the *analysis* from laundering it. The 34 haiku cells are disclosed in
`PRE-REGISTRATION.md` §12 as an amendment, and the honest reading of `single-step-query-builder`
on Haiku is that its two observations disagree.


## F37 — A single request field moves the bill 3.1x, and its default is a provider choice  ·  MEASURED

F31 inferred the mechanism from observation: five providers cache automatically and sit at 87-91%,
Anthropic makes the client ask and sits at 10-17%. This is the manipulation. Same model
(`claude-haiku-4.5`), same 12 assigned tasks spanning the corpus (29-615 fixture lines), same six DSH arms,
same seed; **only the request field differs**. Run three ways concurrently, so no condition is
confounded with time.

```
node tools/cache-ab.mjs
```

| condition | flag | analysed runs | solved | requests | input tokens | **hit rate** | **$/run** |
|---|---|---|---|---|---|---|---|
| **none** — the harness as-is | `--no-cache-breakpoints` | 40 | 31 | 1,152 | 28,448,525 | **0.0%** | $0.7818 |
| **static** — the study's own injection | *(default)* | 49 | 35 | 1,195 | 25,145,151 | **11.8%** | $0.5128 |
| **static + automatic** | `--auto-cache` | 41 | 30 | 1,142 | 25,605,053 | **94.9%** | **$0.1667** |

> **Corrected 2026-10-01 (F39).** The first version counted 86 runs that never reached the provider:
> the Anthropic balance ran out at 14:36:19Z, mid-experiment, and the exclusion rule had no phrase for
> the resulting error. Those runs consumed almost nothing, so they dragged every condition's mean cost
> down and narrowed the `none`-versus-`static` gap. Remove them and **the effect is larger, not
> smaller** — the direction is unchanged and the numbers are the honest ones.

Paired by (task, arm), cluster bootstrap over tasks, against the study's own condition:

| vs static | cost | 95% CI | hit rate |
|---|---|---|---|
| **none** | **+47.4%** | [+24.4%, +76.9%] | 17.5% → 0.0% (−17.5 pp, [−23.8, −10.5]) |
| **static + automatic** | **−68.8%** | [−90.2%, −47.3%] | 17.1% → 93.4% (+76.3 pp, [+70.4, +82.7]) |

### Replicated on a second model, and cleaner

The same three conditions on **`claude-sonnet-5.5`**, launched together by
`node tools/run-cache-ab.mjs --model claude-sonnet-5.5 --tag sonnet`:

| condition | runs | solved | hit rate | $/run | vs static |
|---|---|---|---|---|---|
| **none** | 72 | **72/72** | **0.0%** | $0.1137 | **+17.2%** [+5.8%, +27.5%] |
| **static** | 72 | **72/72** | 27.0% | $0.0970 | *(baseline)* |
| **static + automatic** | 72 | **72/72** | **85.9%** | **$0.0400** | **−58.7%** [−71.3%, −48.2%] |

**Every one of the 216 runs solved, in all three conditions.** The Haiku run had solve-rate variation
(30-35 of 72) which left a quality caveat; this one has none, so the cost difference is attributable
to the request field and nothing else. Automatic caching is **2.43x** cheaper here against 3.08x on
Haiku — a smaller effect, and still decisive.

**And the asymmetry replicates exactly.** Under the static condition both models agree that the
injected breakpoints work on one arm family and not the other:

| arm | Sonnet static | Sonnet auto | Haiku static | Haiku auto |
|---|---|---|---|---|
| `dsh:native` | **51%** | 90% | **22%** | 55% |
| `dsh:native-opt` | **53%** | 87% | **23%** | 55% |
| `dsh:native-terse` | **53%** | 89% | **24%** | 55% |
| `dsh:ptc` | **6%** | 81% | **0%** | 54% |
| `dsh:ptc-opt` | **6%** | 82% | **0%** | 55% |
| `dsh:ptc-terse` | **6%** | 83% | **0%** | 52% |

Two models, one provider, same result: **the study's own cache injection helped the native arms and
barely touched the PTC arms** — the very contrast the study exists to measure. Automatic caching
erases the difference, lifting all six arms to **81-90% on Sonnet and 90-95% on Haiku**. This is no
longer a single-model observation, and it is the sharpest form of F31's claim: the cache regime is a
harness x provider interaction, and the study's own instrument was inside it.

**A benign instrument note, recorded so it is not rediscovered as a mystery.** Each Sonnet run makes
two internal DSH calls before the agent loop that carry no `output_config`; Sonnet 5.5 rejects them
with *"To turn thinking off on this model, send `thinking: {type: between_tools}`"*. That is 144 of
645 requests in each condition. They return **no usage**, cost nothing, and **every run still
solved** — a 400 has no tokens to count, so they enter no cost or hit-rate figure.

**Three results, in increasing order of importance.**

**1. Without a request field, Anthropic caches nothing at all.** 28.8M input tokens, zero cache
reads. This is not a harness failure — it is the documented default. Any study that runs a coding
agent against Anthropic without sending `cache_control` is billing every token at the full rate, and
the three DeepSeek/GLM/Qwen/OpenAI providers in this study cache whether the client asks or not.

**2. The study's own injected breakpoints were worth 47% paired, and they only worked on half the
arms.**
Under the static condition the **three** PTC arms sit at **0%** and the **three** native arms at
**32-35%** — the first version of this sentence said "four PTC… two native… 22-24%" and every figure in
it was wrong. The
static breakpoint marks the system block and the last tool; in a PTC request that prefix evidently
does not persist the way it does with 24 declared tools. So the study's intervention did not merely
under-cache — **it cached unevenly across the very contrast the study is about**, and that went
unnoticed for the whole matrix because the deviation was logged but never grouped on.

**3. Automatic caching is arm-neutral and worth 3.1x.** It lifts every one of the six arms to
**90-95%**, and total cost falls from $0.5128 to $0.1667 per run. Solve rate is unchanged
(35/49 against 30/41, inside the noise of F29). The prediction in `notes/plans/PLANNED-cache-ab.md` was "hit rate
13% → 80-90%, cost down roughly 5x"; the measured answer is **11.8% → 94.9%, cost down 3.08x**.

### Why this is the paper

**A field with a provider-specific default decides a cost ranking, and the standard methodology
deletes it.** Anthropic's own comment in the gateway source is the whole argument: *"A gateway that
improves the request is measuring itself."* True — and the inverse is the actual finding. Every
cross-provider leaderboard holds the request fixed, which is exactly right for measuring the
harness and exactly wrong for measuring cost, because the request field is where 3.1x lives and
its default is a pricing-policy decision, not a property of the agent.

**Applied to this study's own bill:** F27 records $308.16 spent on the Anthropic key at a 10-17% hit
rate. The same work under automatic caching costs roughly **$100** ($308.16 / 3.08).

**Scope, stated before it is overclaimed.** Exploratory, not confirmatory — proposed after F31 and
after the matrices ran, so it cannot upgrade H1 or H2 (`PRE-REGISTRATION.md` §12.5). One model, one
task set, one seed, 12 tasks. Six DSH arms only: the four external harnesses speak
`/v1/chat/completions`, where this gateway can neither send `cache_control` nor read back a cache
count — which is itself a result, since it means **the external harnesses' Anthropic costs are billed
as fully uncached and this instrument cannot tell whether that is true.** The absolute $/run figures
are for a 12-task stratified subset, not the corpus mean.


## F38 — F18's statistic mixed two denominators; the effect survives the honest one  ·  MEASURED

F18 reported "Fisher's exact on 3/7 against 1/30 gives p ~ 0.01". **3/7 counts ARMS and 1/30 counts
RUNS.** The numerator and denominator come from different populations, which is not a test of anything.
It is the same class of defect as the price card and the output term: the number was produced by a
tool and read off without checking what it counted.

Replicated on the same task with more seeds and four models (`node tools/f18-replication.mjs`), both
denominators are reported:

**Corrected 2026-10-01.** The first version of this table counted **110** Sonnet and Haiku runs that
never reached the provider: **every request in the `f18-sonnet` and `f18-haiku` gateway logs returned
HTTP 400** (244 of 244 and 296 of 296) from 14:36:19Z onward, when the Anthropic balance ran out. The
exclusion rule had no phrase for `"credit balance is too low"` — see F39 — so they were analysed as
model failures. The table below is the corrected one; the dropped runs are infrastructure under rule 9.

| model | tier | runs solved | **per RUN** | arms solved | $/run |
|---|---|---|---|---|---|
| **DeepSeek V4.1 Flash** | cheap | **30/93** | **32.3%** | 10/10 | $0.0460 |
| gpt-6-luna | **cheapest** | **1/56** | **1.8%** | 1/10 | **$0.0322** |
| Claude Sonnet 5.5 | frontier | **1/30** | **3.3%** | 1/10 | $1.3046 |
| Claude Haiku 4.5 | budget | **0/6** | **0.0%** | 0/6 | $1.9631 |

| contrast | per RUN | per ARM |
|---|---|---|
| DeepSeek vs Sonnet | **p = 0.0006** | **p = 0.0001** |
| DeepSeek vs luna | **p < 0.0001** | **p = 0.0001** |
| DeepSeek vs Haiku | p = 0.1070 **(n.s.)** | p = 0.0001 |

**The Haiku arm is no longer testable and is not claimed.** Only its 6 pre-existing runs survived, so
its contrast is underpowered (p = 0.107) and the paper must say so rather than report 0/59. Every
Haiku hard-task figure now rests on `results/haiku-hard-probe`, which is what F19 originally measured.

### The replication changed what F18 means

**F18 called this a cost/capability inversion: "a cheap model solves a hard task the pricier models
almost never do".** Adding luna — which is *cheaper per run than DeepSeek* and fails at 1.8% —
removes the price story entirely. **The ordering does not follow price in either direction:**
the cheapest model in the study fails and the second-cheapest succeeds **eighteen times as often**
(luna, at 1.8%) — but the *next best testable* model is Sonnet at 3.3%, which DeepSeek beats **9.7x**,
not 18x. The larger figure is DeepSeek against the worst model, and is stated as such.
Sonnet, at **28x** DeepSeek's cost per run, succeeds less often.

| | $/run | solve rate |
|---|---|---|
| DeepSeek V4.1 Flash | $0.0460 | **32.3%** |
| gpt-6-luna | **$0.0322** (cheapest) | **1.8%** |
| Claude Sonnet 5.5 | $1.3046 | 3.3% |
| Claude Haiku 4.5 | $1.9631 | 0.0% (n=6, untestable) |

**So the correct claim is narrower and it is not about cost at all:** on this boundary task, one
model crosses the all-or-nothing verdict **9.7x more often than the next best testable model and 18x
more often than the worst**, across
four models and three vendors, and price predicts nothing about which. F18's "5.9x inversion"
framing is **retracted**; the data do not support a price/capability relationship in either
direction. Nor is it a vendor story: the two Anthropic models and OpenAI's luna all sit at the
bottom together, and the cheapest of them (`luna`, $0.0322) is not closer to DeepSeek than the
dearest (`Sonnet`, $1.3046) is.

**The denominator defect is real but no longer decides anything.** Ten arm configurations of one
model are not ten independent draws, so the per-run test is the defensible one. Here DeepSeek solved
on **10 of 10 arms** and both denominators agree — which means the replication made the effect
robust enough to survive either test. It does not make the original construction sound.

**Status: REPLICATED on three models, NOT on Haiku.** One task remains one task: the evidence is
that these models differ on *this* boundary task, not that they differ in general. F18's own
qualifier — a **threshold effect at the all-or-nothing verdict, not a capability gulf** — is now
doing more work than the original claim, because the partial-credit spread is a few points while
the binary verdict spreads 32. That gap is the finding.


## F39 — The exclusion rule was implemented at half strength, and a fifth claim was written from infrastructure · MEASURED (self-inflicted)

**This is the most serious defect found today and it was introduced today, by me.**

PRE-REGISTRATION rule 9 has always read: *"a run that failed on provider quota, rate limit, or any
infrastructure error, identified from the harness's own error text **and the gateway status code**."*
Only the first half was ever implemented. When the rule was centralised into `tools/exclusions.mjs`
to stop it drifting across seven tools, **the phrase `credit balance is too low` was dropped from the
pattern** — the code it replaced had it:

    OLD (tools/coverage.mjs)   /QUOTA|Insufficient Balance|no resource package|credit balance is too low/i
    NEW (tools/exclusions.mjs) /QUOTA|Insufficient [Bb]alance|no resource package|\[1113\]/i     <-- lost

Anthropic's credit error is *"Your credit balance is too low to access the Anthropic API."* It matched
the old pattern and not the new one.

### What it cost

The Anthropic balance ran out at **14:36:19Z on 2026-10-01**, in the middle of the caching A/B.

| log | requests | all returned | consequence |
|---|---|---|---|
| `f18-sonnet-gateway.jsonl` | 244 | **HTTP 400** | the entire 50-run Sonnet F18 arm measured nothing |
| `f18-haiku-gateway.jsonl` | 296 | **HTTP 400** | the entire 60-run Haiku F18 arm measured nothing |
| six `cacheab-*-gateway.jsonl` | **766 of 5,767 requests** | HTTP 400 | 23-32 runs per condition |

Every one of those runs was analysed as a **model failure**. F38 was published with "Sonnet 1/75" and
"Haiku 0/59", and F37's cost table was dragged down by runs that consumed nothing. **This is the fifth
time this project has read an infrastructure error as a result**, and the first time the fault was in
the rule itself rather than in the reading of it.

### The fix is the rule as written, not another phrase

Adding `credit balance is too low` is necessary and not sufficient — it only catches phrasings someone
thought to write down, and there will be another provider. The rule already names the general form, so
the second half is now implemented:

    A run is excluded if it is UNSOLVED and EITHER
      (a) its own output names an infrastructure fault, OR
      (b) EVERY request it made returned 4xx/5xx.

`(b)` is provider-independent and needs no vocabulary. It is what caught the 5 Sonnet runs whose
error text was truncated past the phrase, which `(a)` alone missed. `tools/exclusions.mjs`
`classifyByStatus()` holds it; `cost-panel.mjs`, `cache-ab.mjs` and `f18-replication.mjs` all apply it,
and the panel now prints an `all-4xx` flow column per matrix.

### A false positive avoided on the way

The obvious quick fix — matching the word `billing` — is wrong, and it produced a wrong answer here
before it was caught. `lh-ledger-replay` is a task **about ledgers, charges and reversals**, so its
fixtures and its agents' own prose are full of "billing". A naive scan reported 45 Sonnet credit
failures out of 79 unsolved runs; the true count in that arm is 45, but the same scan reports 31
credit failures in `haiku-full`, of which 24 are the real thing and 7 are the ledger task talking
about itself. This is F24's "quota" bug exactly, one year of lessons later, in a new word. **Match
provider phrasings, never domain vocabulary.**

### What it changed

| | as published this morning | corrected |
|---|---|---|
| Sonnet on `lh-ledger-replay` | 1/75 = 1.3% | **1/30 = 3.3%** |
| Haiku on `lh-ledger-replay` | 0/59 = 0.0% | **0/6 = 0.0%, untestable (p = 0.107)** |
| Haiku hard-task cost/run | $0.1996 | **$1.9631** |
| Haiku batch-1 solve rate | 84.9% | **87.0%** |
| Cache A/B, static vs auto | 3.8x | **3.1x** |
| Cache A/B, none vs static | +26.1% | **+47.4%** |

**Nothing that survives is weaker**: the caching result is larger, and the cross-provider ranking
result is unchanged to three decimals. Two claims are **narrowed**: the F18 Haiku arm has no power
and is no longer asserted, and F19's budget table inverts (the hard batch costs $565, not $76).

### The lesson, stated so it is not repeated

A shared rule is only shared if it is a superset. Centralising seven copies into one **silently
dropped a case**, and the loss was invisible precisely because centralising felt like a fix — the same
shape as REVIEW-FINDINGS §J2's "deleting an absent field is a no-op that looks like a fix". The
regression test that would have caught it is one line, and it now exists: `exclusions.mjs` is
asserted against a table of real provider error strings, including every one this study has actually
produced.


## F40 — The three artefact risks that could have explained F29 and F37 away, tested  ·  MEASURED

`notes/literature/LITERATURE-2.md` §6 lists ways the measured effects could be billing artefacts rather than
mechanisms. Three are testable from the archive at no cost. `node tools/artefact-checks.mjs`.

### (a) Is the 7.7% placebo a usage effect or a billing effect? — **usage. F29 is stronger for it.**

The concern: `cost_billed` is usage fields times a price card, so a placebo gap could encode
per-request rounding or a slightly different cache split rather than different work.

| measure, per run | `dsh:native` | `dsh:native-terse` | difference |
|---|---|---|---|
| `cost_billed` | $0.00898 | $0.00967 | **+7.7%** |
| **total input tokens** | 214,493 | 238,129 | **+11.0%** |
| output tokens | 10,102 | 11,053 | **+9.4%** |
| cache-hit tokens | 199,048 | 222,357 | +11.7% |
| fresh (uncached) tokens | 15,445 | 15,773 | +2.1% |

**The two identically-treated arms genuinely did 11% more token work.** The dollars track the tokens,
so the 7.7% is the model's own run-to-run variance, not the meter's. That is what a noise floor
should be, and it is now measured rather than assumed.

> **CORRECTED 2026-10-10 — the premise of this subsection is false, and the "noise floor" reading it
> supports is withdrawn.** The two arms compared here were **not identically treated**: their starter
> requests differ by **30 and 20 bytes** of arm-id text (50 bytes in total), the archive cannot show
> where the copies sit, and for **12 of the 62** PTC pairs the literal first-request claim does not
> hold either (`notes/reviews/REVIEW-3.md` §4.18, §5.7). The +7.7% and the +11.0% token difference are therefore a
> measurement of *two arms that differ by a prompt*, not of a placebo, and F29's noise-floor label is
> withdrawn (`notes/records/STEP2-RECONCILIATION.md` §7.6; `PAPER.md` limitation 9). What survives is narrow and
> still useful: the dollars track the tokens, so the meter is not inventing the gap — but the gap is
> not a null, and "usage" here means "a difference the treatment can no longer be excluded from
> causing".

### (b) Are F37's cache hits cross-run warming rather than the field working? — **no. 95.6–99.5% intra-run.**

Our synthetic-key design shares one real upstream key, and a shared-credential gateway can merge
prompt caches across callers. If a run's *first agent turn* already showed hits, part of the effect
would be other runs warming the prefix.

| | runs whose first agent turn had hits | first-turn hit tokens | later hit tokens | **intra-run share** |
|---|---|---|---|---|
| Haiku `none` | 0 of 42 | 0 | 0 | — |
| Haiku `static` | 24 of 51 (47%) | 129,072 | 2,834,206 | **95.6%** |
| Haiku `auto` | 21 of 42 (50%) | 112,938 | 24,362,205 | **99.5%** |
| Sonnet `none` | 0 of 72 | 0 | 0 | — |
| Sonnet `static` | 70 of 72 (97%) | 289,436 | 1,851,596 | **86.5%** |
| Sonnet `auto` | 69 of 72 (96%) | 282,248 | 6,114,099 | **95.6%** |

**The effect is the breakpoint moving forward through each run's own conversation**, which is exactly
the documented mechanism, and cross-run warming accounts for 0.5–13.5% of it. `none` gets zero hits
on any request in any run, which is the control that makes this readable.

### (c) Is any arm below Anthropic's minimum cacheable prefix? — **no. And I nearly reported that it was.**

Anthropic silently declines to cache a prefix shorter than **4,096 tokens on Haiku 4.5** (512 on
Sonnet 5.5). A sub-floor arm would be structurally unable to cache, which would depress its hit rate
for reasons that have nothing to do with the harness.

First run of this check reported several PTC arms at **154–230 tokens, below the floor**. That was
**my error**: each DSH run opens with internal calls carrying no tools, and I was reading one of
those as "the first request". Measured on the first **agent turn** — the request that actually
carries system plus tool schemas — every arm in both models is **well above** the floor:

| model | floor | first-agent-turn input |
|---|---|---|
| Haiku 4.5 | 4,096 | **6,552 – 8,526** |
| Sonnet 5.5 | 512 | **8,395 – 10,880** |

**No arm is affected.** The tool now filters on `tools` in `bodyKeys` and says so in a comment, and
the caution is worth keeping: a check that reports a confound which is not there is as expensive as
missing one, and this one was one line from being written into the paper.

### What is still open from LITERATURE-2 §6

- **Anthropic's unreconciled 7.43x and 1.611x correction factors.** Every Anthropic dollar inherits
  this. It is not resolvable without the console and it must be stated wherever Anthropic dollars
  appear.
  **UPDATE 2026-10-03:** the 1.611x is resolved and REFUTED - a fresh 62-cell Haiku pilot
  reconciled to the console at a ratio of **1.000** (credits $38.65 -> $3.07 against a computed
  $35.5718). See F27. Anthropic figures are **not** to be scaled. The **7.43x remains open.**
- **TTL pacing.** The 5-minute cache TTL makes hit rates cadence-sensitive. The A/B conditions ran
  concurrently by construction, which controls for it; the main matrices did not, and must say so.
- **DeepSeek peak/off-peak.** Billed cost depends on time of day and the main DeepSeek matrices ran
  across both. Unstratified and unrecorded.
- **Per-provider invoice reconciliation** beyond F27's single Anthropic number.


## F41 — What the literature takes away, and what it leaves  ·  REPOSITIONING

`notes/literature/LITERATURE-2.md` ran eight verification agents over F29–F39. Every source was re-fetched live. It
takes away more novelty than any previous pass and it **leaves the paper with a better centre of
gravity than the one it had this morning.**

### What is gone

**F37 is not novel as a mechanism, as a split, or as a magnitude.** Lumer et al.
(*"Don't Break the Cache"*, arXiv:2601.06007, Jan 2026) state the provider split in almost our
words — *"OpenAI and Google enable prompt caching automatically for eligible requests, while
Anthropic requires explicit cache breakpoints in the API request"* — and measure cache-on against
cache-off across three providers on 500+ agent sessions: **41–80% cost reduction**. Ours is a 67.7%
reduction. **Our headline number sits inside their published range, and the dichotomy we called a
finding is documented background.**

Also gone: any claim that first-party documentation is silent. Anthropic ships a feature literally
named **"Automatic caching"**; DeepSeek, Gemini and Alibaba all document caching as on by default;
OpenAI and Anthropic both state caching does not change output generation. And per-harness cache hit
rates tied to cost are already published twice in industry (Requesty: nine agents, Claude Code 91.9%
down to Kilo Code 45.5%, *"every agent with a cache hit rate above 80% has a per-call cost below
$0.10"*; AIMultiple: 11 CLI agents, six caching 86–98% and five not — **with Goose in the
non-caching group**) and once in a benchmark paper (Claw-SWE-Bench: *"Cache hit rate explains some
cost differences, but not all of them"*).

**F32's lever is two years old.** Renze 2024 (arXiv:2401.05618) appends the literal instruction
*"Be concise."* and measures **−22.67% cost** with *"negligible impact on problem-solving
performance."* And the only independent agent-side measurement — JetBrains' paired A/B of a
conciseness skill on Claude Code, 86 tasks, ~$106 — found **~10% cost reduction**, at or below our
low end, with the mechanism *"an agent's bill is mostly reading, not writing."*

**F35's shape is published on the accuracy axis.** Liu et al. (arXiv:2609.17394): *"Exact paired
McNemar tests separate none of the 29 adjacent Verified top-thirty pairs at α=0.05."*

**F30 cannot be stated broadly.** Ndzomga et al. (arXiv:2603.23749) find *"rank-order prediction
remains stable"* across 8 benchmarks, 33 scaffolds and 70+ model configurations, ρ = 0.90–0.96.

### What is left — and it is a coherent paper

| claim | status after the pass |
|---|---|
| **F29** — a placebo arm-level billed-cost noise floor | ~~the study's cleanest novelty~~ **WITHDRAWN 2026-10-10.** The two arms differ by 50 bytes of arm-id prompt (30 + 20), so the pair is not a placebo and the data contains none (`placebo: []`, `noiseFloorPct: null`). The nearest published anchor is Hu et al.'s repeated-baseline per-cell CVs of 2.4–8.4%. The *literature* gap (no A/A cost floor published) still stands; this study does not fill it |
| **F31** — the output-share/price-ratio account, tested and refuted with a CI | **no longer refuted (2026-10-10).** On six models H1 is **INCONCLUSIVE** (+0.00467 [−0.00566, +0.01579]) while its pre-registered secondary condition is met; the account is neither supported nor refuted, and `PAPER.md` §3.7 says so. The *novelty* claim (nobody has regressed a harness cost penalty on output share) is unaffected |
| **F30** — cost rank-transfer statistics across providers | **novel as cost.** All prior transfer work is accuracy; all prior harness cost work is single-regime |
| **F35** — cost-side adjacent-rank inseparability with repeated runs | **novel on the cost axis.** The accuracy version is published |
| **F37** — controlled cache-field toggle on coding harnesses, hit rate + billed cost + solve rate jointly | **reduced but alive.** Lumer has cost + TTFT on research QA; Requesty and AIMultiple are observational; nobody holds harness and model fixed and flips a *default* |
| **F33/F38** — the concrete reclassification episodes | **alive as case studies.** The norm (cost-of-pass, joint cost–accuracy evaluation) is known — and the repo credits the wrong paper for it, see below |

**The paper that survives is not "a request field decides the bill".** It is:

> **Cost rankings of coding agents are not transferable, the standard field practice removes the
> variable that decides them, and the effect sizes the field reports are mostly inside its own
> unmeasured noise.** A placebo arm shows the noise floor is 7.7%; 47 of 63 adjacent rank steps are
> ties; the cheapest configuration changes four times across seven models; and the account the field
> uses to explain cost — the output:input price ratio — is refuted with a confidence interval.

> **SUPERSEDED 2026-10-10 — three of the four numbers in the block quote above are withdrawn or
> stale.** There is **no 7.7% noise floor** (the arm pair is not a placebo; `PAPER.md` limitation 9);
> the tie fraction on the six models that ship is **40 of 54 = 74.1%**, not 47 of 63; and the
> price-ratio account is **neither supported nor refuted** (H1 inconclusive, secondary condition met).
> What survives from this synthesis is the rank-transfer negative and the finding that the field's
> cost comparisons have no measured floor — including this study's.

F37 stops being the headline and becomes **the mechanism that explains why the transfer fails** —
which is a better role for it, because it is now a *documented background fact* deployed as an
explanation rather than a novel claim carrying the paper.

### Two claims in `notes/reviews/CRITICAL-REVIEW.md` are themselves wrong

Both are corrected in that file. They matter because the reviews have been treated as authoritative:

**1. "All 2026-dated prior art resolves to nothing outside the repo's own timeline."** All eight
agents re-fetched every 2026 arXiv ID in scope — fifteen of them — and **every one resolves to the
correct paper**, with submission history and independent presence (OpenReview copies, ICML/ICLR 2026
pages, public code, citing papers). The blanket claim is false.

**2. "A fabricated-looking quote attached to a real standard" (the OpenTelemetry metric).** The
metric is genuine. The OTel GenAI conventions moved to a new repository and the old page now shows
only a "moved" notice, which is almost certainly why the reviewer found nothing. The new repo defines
`gen_ai.client.inference.usage.cache_read.input_tokens` verbatim as quoted. **The fabrication claim
is withdrawn**; the honest caveats are that the family merged 2026-09-22 and carries *Status:
Development*.

The lesson is the one this project keeps relearning in the other direction: **a negative search result
is not evidence of absence until the search is known to be able to succeed.** The reviewer could not
find the IDs because they searched a repo whose timeline does not contain them; they could not find
the metric because the page had moved. Neither was checked before the claim was written.

### Corrections to make in the paper's own citations

- **cost-of-pass is Erol et al. 2025 (arXiv:2504.13359)**, not Wang et al. — Erol formalised it in
  April 2025; Efficient Agents' own abstract says *"Using the cost-of-pass metric"*.
- **"eleven words"** in F22 vs **15 words** in `conditions/arms.mjs:37`. One is wrong.
- **Anthropic's "37%"** is *"average usage dropped from 43,588 to 27,297 tokens, a 37% reduction on
  complex research tasks"* — a context/input figure. FINDINGS presents it as a tension with our
  output-per-step result; **the tension dissolves**, and it should be presented as complementary.
- **Atil et al.** is mischaracterised: their §8.1 says serving optimisations *"might"* cause
  non-determinism and *"we can only speculate"*. "Cause traced to" overstates.
- **Gema et al.** is about ground-truth errors, not error bars.
- **LiteLLM's cheapest arm** is *joint*-highest, not highest.
- **Vats et al.** now has an ICML 2026 page; "preprint with no peer venue" is stale. And their
  cost ordering is **stable** across models — cite them for the counter-practice on exclusions, not
  as instability evidence.
- **A paper using DSH itself exists**: Weinberger et al., arXiv:2608.01347, a preregistered benchmark
  that *"uses DeepSeek Harness (dsh) 0.1.0rc7"* and documents automatic caching cutting ~61% of a
  would-be bill. Must-cite, and a provenance item for Methods.
- **Claw-SWE-Bench v2 silently replaced billing-log capture with price-table reconstruction.** Cite
  **v1**, and note the field's retreat from the harder method.


## F42 — The hard-task batch does not discriminate uniformly, and discrimination is MODEL-dependent  ·  MEASURED (answers F17)

F17 checked 2 of 24 hard tasks and said plainly that "2 of 24 is not enough to characterise it". This
is the full batch: 24 tasks × 7 arms × 1 seed, on two models. `node tools/hardbatch.mjs`.

| | DeepSeek V4.1 Flash | GLM-5.3-Flash |
|---|---|---|
| **discriminating** (≥30pp spread) | **5 / 24** | **20 / 24** |
| too easy — every arm solves it | 12 | 0 |
| too hard — no arm solves it | 3 | 0 |
| threshold — most assertions pass, no arm crosses | 4 | 5 |
| **separates no two arms** | **19 / 24** | **4 / 24** |

### The finding is the disagreement between those two columns

**The same task suite, the same seven arms, the same protocol: 20 of 24 tasks separate harnesses on
GLM-5.3-Flash and 5 of 24 do on DeepSeek.**

The mechanism is visible in the pass-rate column and it is not subtle. On DeepSeek twelve tasks sit at
**100% pass rate, 7/7 arms solved** — the model simply solves them, and a task every arm solves
carries no information. **Every one of those twelve is in GLM-Flash's discriminating list**, at 85–91%
with 2–6 arms solving: the same tasks, in the discriminating middle, because that model is nearer the
difficulty. Nothing about the tasks changed; the instrument's resolution did.

    DeepSeek   spec-csv-dialect        7/7  100.0%   TOO EASY
    GLM-Flash  spec-csv-dialect        4/7   86.9%   DISCRIMINATING
    DeepSeek   lh-migration-planner    7/7  100.0%   TOO EASY
    GLM-Flash  lh-migration-planner    6/7   87.4%   DISCRIMINATING
    DeepSeek   edge-cron-parser        7/7  100.0%   TOO EASY
    GLM-Flash  edge-cron-parser        6/7   88.0%   DISCRIMINATING

**This makes F17's proposed calibration procedure unsound.** F17 concluded: *"check all 24 on DeepSeek
(~$24 at the measured $0.07/run) before running the batch for real."* A calibration on DeepSeek would
have reported that 79% of the batch is useless and the batch should be abandoned. It is 83% useful on
a different model. **A benchmark's resolving power is a property of the model it is pointed at, not of
the benchmark** — which is the same shape as this paper's thesis, one level down.

### F17's own verdict on `edge-glob-match` is reversed

F17 recorded it as **"0 points spread — TOO EASY, every arm solves it."** On the full batch it is
**2/6 on DeepSeek and 5/7 on GLM-Flash, 100pp spread, 54% mean pass rate.** The earlier reading came
from 2 seeds on 7 arms and does not survive. F15's `lh-ledger-replay` result does survive and
strengthens: 4/7 solved, 100pp spread.

### The "threshold" class is F18's effect, and it is the batch's real value

Four tasks on DeepSeek and four on GLM have a **high mean pass rate and zero solves** —
`lh-search-ranking` (96.6% of assertions, 1/7 arms), `lh-job-scheduler-catchup` (83.3%, 0/7),
`cross-trace-context` (84.0%, 0/6), `cross-nullability` (75.6%, 0/7), `cross-error-taxonomy`
(82.0%, 0/7). These are not broken fixtures: every arm gets most of the way and none crosses the
all-or-nothing line. They are exactly the tasks F18 identified as separating models that partial
credit does not, and there are **more of them than there are discriminating tasks** on DeepSeek.

**The honest summary for the paper:** the hard batch is not a uniformly better suite. It contains
12 tasks that saturate, 3 that are out of reach (12–16% of assertions), and a set of threshold tasks
whose value is specifically the binary verdict. Reporting one aggregate "the hard batch discriminates"
number would have been wrong on both models in opposite directions.

## F43 — The exclusion rule failed a second time, from the other end, and this time I caught it  ·  MEASURED

F39 recorded the first failure: centralising the rule **dropped** a phrase, so 155 credit-failed runs
were read as model failures. The fix widened the text signatures to every provider phrasing. That
widening introduced the opposite defect, and it is the one this repo already had a name for.

**F24 documents it**: 10 *solved* runs were once dropped because their fixture's source code discusses
retry and quota policy. F39 wrote the rule down — *"match provider phrasings, never domain
vocabulary"* — in the same file that then broke it, because the widened list matched
**bare numeric codes and bare transport words**:

    ['rate-limit',   /rate.?limit|\b429\b|.../]        <- \b429\b is domain vocabulary
    ['protocol-404', /HTTP_404|request failed \(404\)|\b404\b/i]
    ['provider-5xx', /\b50[023]\b|.../]
    ['connection',   /ECONNREFUSED|.../]

`cross-error-taxonomy` is a hard task **whose entire subject is HTTP error handling**. Its agents
write `404`, `429`, `500`, `ECONNREFUSED` and `RATE_LIMIT` as the domain. The rule dropped
**5 of 7 DeepSeek arms and 6 of 7 GLM arms** on it — every one of them `exit=0`, running 268–545
seconds, scoring 76–88% of their assertions. The task appeared as "0/2 solved" when all seven arms
had run and none had solved.

**22 runs across the repo were being wrongly dropped**: 5 on the DeepSeek hard batch, 7 on GLM,
1 each on Qwen, luna and DeepSeek-F18, and 6 on `haiku-full`.

### The fix, and the lesson

Signatures must now carry a **structural marker** — a `dsh: `-prefixed provider error, a bracketed
provider code, or a multi-word vendor phrase. Real provider errors have one; domain prose does not.
`tools/exclusions.test.mjs` now has a case built from `cross-error-taxonomy`'s actual agent output
that fails if the list is ever widened back, alongside the case that fails if it is narrowed again.

**The lesson is not "be careful with regexes".** It is that **a regex over free text is the wrong
instrument for this problem**, and the rule that works already existed in the pre-registration:
*"identified from the harness's own error text **and the gateway status code**"*. The status half —
a run whose every request returned 4xx/5xx — is provider-independent, needs no vocabulary, and has
now been right on every case where the text half was wrong in one direction or the other. The text
half survives only for the cases status cannot see: a harness that never launched, and a run that
partly failed.



## F44 — The correction pass on the correction pass  ·  MEASURED (a hostile review of F29–F43)

An external review of everything written on 2026-10-01 (`notes/reviews/REVIEW-2.md`, 16 independent recomputation
passes) found that **five of the day's eleven new findings contained at least one wrong number or
false claim — in material produced by the same session that had spent the day fixing exactly this
class of defect.** That is the finding. The rest of this entry is the correction.

### 1. The bootstrap random number generator was broken, and it changed a published verdict

Every confidence interval this study published was drawn with

    seed = (seed * 1103515245 + 12345) & 0x7fffffff

evaluated in JavaScript doubles. The product exceeds 2^53, so the low bits — the only bits an LCG
randomises — are rounded away before the mask runs. Measured in this repo (`node tools/rng.mjs`):

| | double-precision LCG | mulberry32 |
|---|---|---|
| draws diverging from the exact BigInt stream | **100,000 / 100,000** | — |
| cycle length | **10,466** | 2^32 |
| distinct values per 1,000,000 draws | **16,936** | 999,739 |

**It changed F29's verdict.** The placebo's interval was published as [0.1%, 16.6%] — "one interval
excludes zero". Redrawn with a sound generator it is **[−0.4%, +16.7%]: it contains zero**, and paired
t (p = 0.077), Wilcoxon (p = 0.142) and a sign-flip permutation (p = 0.089) agree. **Retracted.**
The point estimates (+7.7%, +3.6%) and the practical gauge ("below ~8% is not measurable at n=62/arm")
are unaffected and were never in doubt.

It also explained a *non*-finding: every other published interval survived at printed precision
(F30's permutation p moved 0.0120 → 0.0121; F35 flipped one pair of 63).

**And it was in the experiment, not only the analysis.** `tools/run-experiment.mjs` shuffled arm
order with the same generator and consumed its low bits via `s % (i + 1)`. Measured on the `ds-full`
that existed at the time: `dsh:native` landed in position 0 in **0 of 62** runs, `dsh:ptc` in
**31 of 62**. That is not randomisation, and position fixed effects absorb a measurable share of the
placebo difference F29 reports.

> **AMENDED 2026-10-04 — those two measurements are PRE-LOSS and do not describe the matrices that
> ship.** The `ds-full` measured above was destroyed on 2026-10-02 and re-collected; the figure is a
> record of the destroyed data, and quoting it as a property of the shipped archive is wrong.
> Measured on the six matrices that ship: `dsh:ptc` reaches position 0 in **2 of 62** blocks,
> `dsh:native` in 3 of 62.
>
> **The direction of F44's argument is nevertheless confirmed, and it is larger than this entry
> claims.** The fixed-forward shuffle is still a function of `(task, seed)` alone, so *all six
> matrices draw the same permutation* and none has an independent randomisation; and within a single
> arm, cost varies by **1.75x–3.82x across slots**, with the first slot cheapest in five of six
> models. Reweighting each arm to the pooled slot distribution **roughly halves every PTC-vs-native
> differential in the study** — Haiku +53.84% → **+25.41%**, Sonnet +9.51% → **+3.69%** with an
> interval now containing zero. F44 said position fixed effects absorb "a measurable share"; the
> measured share is about half. Full record and method:
> `notes/defects/DEFECT-position-confound-2026-10-04.md`. The seed was also keyed on the task's *name length*, so equal-length tasks shared an order —
flagged by REVIEW-FINDINGS §J5 as a weakness and never fixed. **Both fixed forward only**; every
matrix collected before today carries the old bias, which is now a stated limitation rather than an
undiscovered defect. `tools/rng.mjs` holds the generator, the proof, and the replacement shuffle.

### 2. The exclusion backstop was written and then not wired in

F39 added `classifyByStatus()` and then **three tools each re-implemented it inline, with three
different behaviours for the zero-request case** — one dropped the run, one analysed it as a model
failure, one skipped it silently — and **none applied the rule's own solved-guard**.
`failure-classify.mjs`, the tool F33 cites as the definition, applied only the text half, so the 112
hardbatch-qwen runs whose every request returned HTTP 400 were printed as "genuinely unexplained
failures", i.e. as model failures, by the tool that defines what a model failure is.

Fixed: **one exported decision**, `exclusionVerdict(run, requests)`, in `tools/exclusions.mjs`, called
by `cost-panel`, `cache-ab`, `f18-replication`, `failure-classify` and `coverage`. It implements the
rule as written — unsolved **and** (text **or** status) — with the solved-guard, and one behaviour for
zero requests. Missing provider phrasings added (`MALFORMED_RESPONSE`, `[1210] always engages in
thinking`, `Internal network failure`, `anthropic-version header is required`). **F39's claim that
the test pins "every phrasing this study has produced" was false** — it held 7 strings against ~15
seen in the archive; the review's count stands and the list is longer now, not complete.

**The over-exclusion direction was also real and is fixed**: 10 confirmed false positives in published
matrices, each verified against an all-HTTP-200 gateway history. The register's numbers move
accordingly (F38 DeepSeek 30/93 → **30/94**, luna 1/56 → **1/57**; F33 Haiku 87.7% → **87.0%**).

### 3. The falsified claim: terseness does move solve rate

F32 asserted the instruction cuts cost "while moving solve rate not at all". **The pipeline stored
each contrast's before/after solve counts and never printed or tested them.** Tested for the first
time, paired by (task, seed), McNemar exact:

| model | contrast | cells | before | after | b/c | p |
|---|---|---|---|---|---|---|
| **Claude Haiku 4.5** | `dsh:ptc` → `dsh:ptc-terse` | 62 | **48** | **35** | **17/4** | **0.0072** |
| all eleven others | | | | | | 1.0000 |

**A 21-point solve-rate drop sits under a −53% cost headline**, and per *solved* task the same contrast
is −38%, not −53%: a third of the celebrated effect is dead runs. F22's own caveat ("on harder tasks
terseness may cost correctness") had already fired. The claim is now stated for eleven of twelve, and
the twelfth is named. `panel-analysis.mjs` runs and prints the test.

### 4. `f18-sonnet` was in the panel and the other three `f18-*` matrices were not

Sonnet was given a **32nd task** no other model had — one hard task at $1.30/run against a $0.27
corpus mean. Every Sonnet arm mean inflated 11–23%, the PTC penalty moved +34.5% → **+40.6%**, and
**DeepSeek-vs-Sonnet sign concordance moved 46.4% → 50.0%** — which is F30's "worse than a coin flip"
punchline. That punchline is **withdrawn**; the pair is exactly chance without the contamination. The
aggregate is unchanged. `f18-sonnet` is out of the panel; `f18-replication.mjs` reads it directly.

### 5. Two tools, two record-selection rules

`hypotheses.mjs` used first-record-per-cell; `panel-analysis.mjs` averaged all records. Worse, the
flag was assigned *before* the exclusion checks, so that view silently deleted **142 cells** whose
first record was infrastructure-excluded. **H3 moved +1.05 → +1.23, a 23% shift on what the register
calls "the study's one clean confirmatory win."** Both tools now use the same population. **F36's
claim that the two rules agree "to three decimal places" is false** and is corrected.

### 6. H2's Wilcoxon was computed in the wrong tail

H2's alternative is mean(d) < 0, so a large positive rank sum is evidence *against* it. The code
returned P(W+ ≥ observed) — the p-value for the opposite hypothesis — so **"p < 0.05 AND CI below 0"
could never fire and SUPPORTED was unreachable as coded.** Verified: the strongest possible support
gave p = 1.000000. Correct tail: p = **0.6029** on this data (the printed 0.4046 was the wrong
hypothesis's). **The INCONCLUSIVE label survives only because the CI branch masks the dead test.**
Fixed, and the wrong-tail value is now returned beside the right one so the defect is visible.

### What this pass did NOT fix, and is therefore still open

- **§6 Holm–Bonferroni is filed and implemented nowhere** ("all secondary and pairwise contrasts
  receive Holm-Bonferroni correction"). No tool contains any correction. Recomputed, **GLM-5.3's star
  in F31's table does not survive it** (p = 0.0231 against a 0.0125 threshold).
- **The v4 freeze is broken the same way v1–v3 were.** Tag `prereg-v4` holds a 320-line
  PRE-REGISTRATION.md; the working copy has 389 lines, and the frozen design table was **edited in
  place** ("2.0" → "4.00") eleven lines below a note saying the frozen design is not edited. The
  amendment log omits the day's largest analysis change — F39 itself.
- **F37's prose still carries six pre-correction numbers** inside a banner that says the numbers are
  the honest ones: "3.75x", "worth 26%", "four PTC arms … two native arms", "52-55%", "$80". The
  tables are right; the sentences around them were not updated with them.
- **F30's remaining detail figures**, the per-arm "p = 0.0001" display artefact, and F35's direction
  wording. *(Fixed in the same pass: F33's table regenerated for all seven models, its Haiku row
  87.7% → 87.0% and Sonnet's row added; F39's "86 of 3,857" → **766 of 5,767 requests**; F37's six
  prose figures.)*
- **Price-card provenance**: `_ev/` holds a captured provider page for **DeepSeek only**. z.ai's
  absence is declared; Qwen's, Anthropic's and OpenAI's are absent and *undeclared*, and the GLM cards
  decide H2 while the Anthropic write rate feeds the Haiku headline.

**The honest summary:** the day's corrections were applied with the same haste that produced the
defects they corrected. Every headline aggregate survived independent recomputation, and the day's
structural work — the timestamp refutation, the terse-sham discovery, the price-card propagation, the
real exclusion fix — is sound. But five of eleven new findings needed a second pass, and the pattern
is the one this project keeps documenting: **the defect moved from the reading of results into the
tools that produce them, and a tool that is not itself tested is just a faster way to be wrong.**



## F45 — The broken shuffle was not cosmetic: it confounds the PTC differential, and it halves the Anthropic penalties  ·  MEASURED

F44 recorded the broken arm-order shuffle as a stated limitation on the grounds that position effects
were not established. **They are, and they are large — and the shuffle was arm-asymmetric, so the
historic matrices carry a real confound.**

### The shuffle put one arm first in most blocks

> **CORRECTION, 2026-10-05 — the histograms in this section do not describe the matrices that ship.**
> Every archived matrix records `dsh:ptc` at position 0 in **2 of 62 runs (3%)** — ds-full, glm-flash,
> qwen-full, luna-full, haiku-full and sonnet-full alike, with a maximum per-arm deviation of **6.77pp**.
> The table below (31/62 DeepSeek, 44/66 Haiku, 41/62 Sonnet, 66%/64% Qwen/luna, 45%/47% GLM) is
> reproducible from no file in the tree; it is the state of the pre-loss matrices as measured on
> 2026-10-02, before the re-collection that `tools/run-experiment.mjs`'s header describes ("on the six
> that ship, `dsh:ptc` reaches position 0 in 2 of 62 blocks"). Replaying the current
> FNV(task|seed) + mulberry32 shuffle reproduces the shipped 620/620 positions exactly. **The
> arm-asymmetry premise of this entry therefore does not hold for the six matrices the paper uses.** What
> is *not* refuted here is the cost-by-position effect in the next section; if a position effect exists
> it is roughly uniform across arms rather than biased by arm, and the size of the resulting correction
> to the PTC differentials is an open question rather than the −48.1pp / −29.2pp this entry reports. The
> entry is kept as the record and its conclusion is marked provisional until that is re-derived.

`position` is recorded in every run record. On the Anthropic matrices, `dsh:ptc` — the arm the
study's central claim is about — reached position 0 in **two thirds of runs**, while every other arm
sat at 0–10%:

| matrix | `dsh:ptc` at position 0 | every other arm |
|---|---|---|
| Claude Haiku 4.5 | **44 / 66 (67%)** | 0–9% |
| Claude Sonnet 5.5 | **41 / 62 (66%)** | 0–10% |
| Qwen3.8-Flash | 66% | 0–9% |
| gpt-6-luna | 64% | — |
| DeepSeek V4.1 Flash | 31 / 62 (50%) | 0–21% |
| GLM-5.3-Flash / GLM-5.3 | 45% / 47% | — |

### Position carries cost, and on Anthropic it carries a lot

Cost relative to each run's own (task, seed) block mean, pooled within a matrix:

| position | Haiku | Sonnet | DeepSeek |
|---|---|---|---|
| 0 | **1.354** | 0.954 | 0.931 |
| 1 | 1.032 | 0.947 | 1.078 |
| 4 | 1.232 | **1.638** | 0.923 |
| 9 | 0.779 | **0.636** | — |

These are not noise: with ~62–65 runs per position and a per-run CV near 0.5, a 35% swing is roughly
six standard errors of the mean. The mechanism is consistent with shared-prefix caching — on
Anthropic the first run of a block pays the 1.25x cache-**write** charge that every later run reads at
0.1x — but the size is larger than that alone explains and is not fully understood. **It is recorded
as an unexplained effect that biases by arm.**

### What it does to the published numbers

Adjusting each run for its position (remove the block mean, remove the position mean, restore):

| model | raw PTC vs native | **position-adjusted** | change |
|---|---|---|---|
| Claude Haiku 4.5 | +86.5% | **+38.4%** | **−48.1 pp** |
| Claude Sonnet 5.5 | +40.6% | **+11.3%** | **−29.2 pp** |
| Qwen3.8-Flash | +27.5% | +13.1% | −14.4 pp |
| GLM-5.3 | +38.2% | +29.5% | −8.7 pp |
| DeepSeek V4.1 Flash | −2.1% | +3.2% | +5.3 pp |
| GLM-5.3-Flash | +0.2% | −3.1% | −3.3 pp |
| gpt-6-luna | −1.5% | +4.5% | +6.0 pp |

**The adjustment roughly halves both Anthropic penalties and leaves the other five models within
±14 pp.** The study's largest and most-cited effect — "Haiku's PTC penalty is +86.7%" — is closer to
**+38%**, and the Anthropic models converge toward GLM-5.3 and Qwen rather than standing apart.

> **DATED NOTE, 2026-10-09 — read the table above as pre-loss and the halving as withdrawn.** Two
> separate things carry the word "adjustment" in this repository and they are not the same estimator:
> the one tabulated here is a two-way de-meaning on the **pre-loss seven-model population**, whose raw
> column (+86.5% Haiku, +40.6% Sonnet) is not the shipped six-model column (+53.84%, +9.51%). The
> "roughly halves" claim that later propagated into `notes/defects/DEFECT-position-confound-2026-10-04.md` §3 and then
> into `PAPER.md` §3.1 came from a *different* script whose estimator passed both arms' records to the
> function meant to summarise one arm — verified on 62 of 62 blocks — and that claim is **withdrawn**
> (`notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md`).
>
> On the shipped data, corrected: a paired estimator that keeps the task pairing moves Haiku from
> +53.84% to **+51.80%** (additive scale), which agrees with the independently written slot regression
> `cost_billed ~ mode + slot + (1|task)` at **+52.97%**. The correction is small for Haiku and for most
> models; it is not small for GLM (−20.75% to −8.90% log / −17.30% additive). The two Anthropic models
> therefore do **not** converge on GLM under the corrected estimator, which is the opposite of what this
> entry concluded. F45's substantive read — that position confounds the differential — stands.

**This cuts against the study's own earlier framing and does not rescue it.** F31 argued the price
ratio fails to explain the differential; that conclusion is untouched, because the adjusted numbers
are *less* dispersed, not more. What changes is the claim that the two Anthropic models are the
extremes: adjusted, the differential is a general 0–38% penalty across five providers with two
models at zero, and nothing about it is Anthropic-specific.

### The placebo is not affected, and that was checked

F29's headline contrast survives the same adjustment unchanged: `dsh:native` vs `dsh:native-terse`
goes **+7.7% → +7.8%**. The second contrast (`dsh:ptc` vs `dsh:ptc-terse`) moves +3.6% → **−1.1%**,
a sign change, but both intervals contain zero and neither was ever the headline.

### What this costs to fix properly

The adjustment above is a legitimate estimator and is reported rather than hidden, but it is a
correction applied after the fact to a design that was supposed to be randomised. The clean fix is to
re-run with the repaired shuffle (`tools/run-experiment.mjs`, fixed in F44):

| | cost to re-run |
|---|---|
| the four automatic-cache providers (DeepSeek, GLM-Flash, Qwen, luna), 620 cells each | **$22** |
| Claude Sonnet 5.5, 620 cells | $167 |
| Claude Haiku 4.5, 620 cells | $286 |

**The cheap four are $22 and they carry F30** — the paper's headline claim. Anthropic carries F31 and
F37 and costs $453 to redo. That asymmetry is the single most useful number in this entry.

## F46 — The hard suite separates arms task by task and not at all in aggregate  ·  MEASURED

The 240-cell hard pilot (24 tasks x 10 arms x 1 seed, DeepSeek V4.1 Flash) was analysed under
`notes/plans/PRE-REGISTRATION-HARD.md`, committed before its cells were read. Full record:
`notes/records/HARD-SUITE-2026-10-05.md`.

**HH1, the pre-registered primary: no separation.** The arm solve rates run 66.7% (opencode) to 79.2%
(goose, dsh:ptc-terse, dsh:native-opt). The spread is **12.5pp**, and permuting arm labels within each
task block — the design's own randomisation, 20 000 draws — puts p at **0.647**. The smallest spread
this matrix would have called significant is **16.7pp**. **The design cannot see a 12.5pp difference in
marginal solve rate, and it does not claim there is none.**

**But the batch discriminates per task**: 6 of 24 tasks separate arms cleanly at a 100pp spread —
`spec-diff-patch` 9/10, `lh-migration-planner` 9/10, `edge-json-schema` 8/10, `lh-ledger-replay` 3/10,
`edge-number-format` 8/10, `cross-nullability` 1/10 — and a different arm subset separates each one.
14 tasks are solved by all ten arms, **4 are threshold tasks** (no arm crosses the line, every arm
scores 77–96% of the authored assertions), and **0 are out of reach for every arm**.

**No arm is the common loser.** `spec-diff-patch` fails only openhands; `lh-migration-planner` only
opencode; `edge-json-schema` fails cline and `dsh:native-terse`; `edge-number-format` fails goose and
opencode; `lh-ledger-replay` is solved only by `dsh:native-opt`, `dsh:ptc-terse` and goose;
`cross-nullability` only by goose. Six task-level separations with six different failing sets cancel in
the marginals — which is exactly the quantity HH1 tests.

Read beside F42 (5/24 discriminating, 12 too easy, 3 too hard, 4 threshold, on 7 arms from the
calibration matrices): the two datasets agree closely and are not the same experiment. The one real
move is *too hard: 3 to 0* — each of F42's three unreachable tasks is solved by at least one of the ten
arms here, which is what three more arms and a threshold task do.

**The consequence for the paper is narrower than "the hard batch discriminates".** It does, task by
task. It does not rank harnesses by quality: the aggregate rates are indistinguishable, and any claim
that a hard suite reorders the harnesses on quality would need a matrix this design cannot produce.

## F47 — Terseness cuts hard-task cost by a third, and H3's request effect is seven times larger at long horizon  ·  REPLICATED

Two filed effects, re-tested on a stratum with 25–60 tool calls instead of 8–12.

**HH3 — terseness.** Pooled over the two policy-matched pairs, the one-line instruction cuts billed cost
by **−32.79%** [−36.90, −28.75], exact one-sided Wilcoxon **p = 6.0e−8**, against a pre-declared
practical floor of −10%. That lands inside F22's −29 to −32% and inside F32's −12 to −54% across six
models. The guard is small and offsetting: one task solves under `native-terse` but not `native`, one
solves under `ptc` but not `ptc-terse`. **The saving is not bought with solves.** The two pairs
separately: −36.96% [−43.23, −29.85] and −28.72% [−33.15, −23.76].

**HH4 — the request-count effect (filed H3).** Native presentation costs **+16.29 requests per task**
[11.67, 21.13], exact one-sided Wilcoxon **p = 1.3e−6**; the optimized-policy pair replicates it at
+15.04 (p = 8.3e−7). Median steps tell the same story: 38 native against 22.5 PTC.

| | batch 1 (31 tasks) | hard (24 tasks) |
|---|---|---|
| native − PTC requests, task-paired | **+2.34** [1.37, 3.37] | **+16.29** [11.67, 21.13] |

The batch-1 figure is recomputed here with the hard suite's own estimator and lands on the filed mixed
model's **+2.2285** [+1.2312, +3.3065] — a cross-check that the estimator is the same measurement, not
a new one. So H3 does not merely generalise: **it scales with horizon**, which is what a request-count
mechanism should do and what a fixed per-run overhead would not.

## F48 — On hard tasks PTC is cheaper, not dearer, and the pre-registered taxonomy could not say so  ·  MEASURED

**HH2.** Task-paired, `dsh:ptc` against `dsh:native`, both arms solving **exactly the same 18 tasks**
(zero discordant pairs, exact McNemar p = 1, so no quality confound is possible): the differential is
**−9.31%** [−17.05, −0.65], 90% [−15.86, −1.96]. **The interval excludes zero and the sign is negative —
PTC is cheaper on hard tasks.**

The same estimator on batch 1 (`results/ds-full`, 31 tasks): **+0.13%** [−8.60, +9.80]. F45's published
figures for that matrix are −2.1% raw and +3.2% position-adjusted; all three agree on *near zero*, and
the difference between them is estimator, not evidence.

**What the plan's rules returned, and why it matters.** The pre-declared verdicts were EQUIVALENT
(90% CI inside ±10pp), PENALTY (95% CI above +10), ADVANTAGE (95% CI below −10), else INCONCLUSIVE.
The observed 95% CI is [−17.05, −0.65]: it excludes zero, and it is not confidently beyond the margin.
So **INCONCLUSIVE is what the plan says and what is reported** — but it labels "straddles the margin",
not "learned nothing". The honest sentence is the interval. A four-verdict taxonomy has no cell for
*confidently one direction, not confidently large*, and that is recorded as a defect of the plan rather
than patched after the result was seen.

**The finding, stated so a reviewer can attack it:** the PTC differential is not only provider-dependent
(F30, F45) but **stratum-dependent within one provider** — zero on batch-1 tasks, negative on hard ones,
on arms whose solve sets are identical. One provider and 24 tasks cannot say whether that is a horizon
effect or a task-set effect; it can only say the differential is not a constant of the arm.

## F49 — A hard cell costs 6.5x a batch-1 cell, not 14x, and the arm ranking transfers  ·  MEASURED (corrects F16)

**F16 said ~14x from a single task.** Measured across 24 hard tasks and 31 batch-1 tasks, same model,
same 10 arms, priced from tokens: median hard cell **$0.0400** against median batch-1 cell **$0.0062**,
ratio **6.46x** [4.75, 8.72], task-level bootstrap on both sets. The direction stands and the magnitude
is halved. F16's single-task figure should be read as an upper bound that one task happened to produce.

**The ranking is largely stratum-stable (exploratory, HH5).** Spearman rho = **0.818**, permutation
p = **0.0053**:

    batch 1: dsh:ptc-terse < dsh:native-terse < opencode < goose < dsh:ptc < dsh:native < cline < dsh:ptc-opt < dsh:native-opt < openhands
    hard   : goose < dsh:ptc-terse < opencode < dsh:native-terse < cline < dsh:ptc-opt < dsh:ptc < dsh:native < dsh:native-opt < openhands

The ends are stable and the middle moves: **goose is the cheapest hard-task harness and opencode was the
cheapest batch-1 one**. F30's instability is across providers; this says that within a provider the
ordering largely survives a much harder task set — a sharper statement than "rankings are unstable".

**And F18's threshold shape holds at batch scale (exploratory, HH7).** Solve-rate spread **12.5pp**
against mean-score spread **5.2pp** (ratio 2.40, pre-declared descriptor: solve spread ≥ 2x score
spread; rank correlation 0.682). Every arm scores 92.3–97.5% of the authored assertions, so the arms
differ almost entirely at the all-or-nothing line rather than in how far they get.

## F50 — The hard pilot's shuffle stays inside the pre-declared tolerance, and F45's historic baselines do not describe the matrices that ship  ·  MEASURED (CORRECTED 2026-10-05)

**CORRECTED 2026-10-05, one day after it was written, by an independent audit of the hard-suite numbers —
and the error is the one this register exists to catch: a baseline was copied from F45 instead of
derived.**

**What stands.** In the hard pilot, `dsh:ptc` reaches position 0 in **1 of 24 runs (4%)**, and the largest
per-arm deviation from the uniform 10% share is **15.0pp** (`dsh:native-terse`, 6/24). Both are under the
25pp trigger pre-declared in `notes/plans/PRE-REGISTRATION-HARD.md` §5.2, so the pre-registered analysis needs no
position adjustment. That is the whole of F50's original claim that survives.

**What does not.** The two historic baselines were wrong. `dsh:ptc` sits at position 0 in **2 of 62 runs
(3%)** on *every* matrix that ships — ds-full, glm-flash, qwen-full, luna-full, haiku-full and
sonnet-full — with a maximum per-arm deviation of **6.77pp**. F45's `31/62` and `44/66` describe a
pre-loss `ds-full` that the repository itself says was destroyed and re-collected:
`tools/run-experiment.mjs`'s header, amended 2026-10-04, states that "on the six that ship, `dsh:ptc`
reaches position 0 in 2 of 62 blocks". **F45 was filed 2026-10-02 and carries the pre-loss figure; see
the dated note on F45 itself.**

**The inference reverses with the baseline.** F50 originally read as evidence that the F44 shuffle fix
repaired a 50–67% skew. Replaying the current FNV(task|seed) + mulberry32 shuffle reproduces ds-full's
**620/620** recorded positions *and* the hard pilot's **240/240** — the same permutation produced both
matrices, exactly as F44's own note says it does. So the pilot is not a post-fix contrast against a
skewed baseline, and on archived data the shipped batch-1 matrices are **better** balanced than the hard
pilot (6.77pp against 15.0pp). What the pilot shows is that the fixed shuffle stays inside the
pre-declared tolerance in a real matrix — which is what the pre-registration needed — not that it fixed
anything.

**What is still not known.** F45's cost-by-position effect (Haiku's position 0 at 1.354x its block mean)
was not re-derived here. If positions are arm-balanced on the shipped matrices, an arm-asymmetric
confound cannot bias arm contrasts; a position effect that is *uniform across arms* is a different and
much smaller problem. F45's substantive adjustment — the halving of the Anthropic PTC penalties — rests
on that effect and is neither repaired nor confirmed by this entry. It is left as an open question, and
it is now the most useful thing to check next.

---

---

## F51 — The pre-registered replication of the code-mode differential failed  ·  MEASURED

> **CORRECTED 2026-10-10 — the B = 200,000 re-filing and the both-scales sweep.** The R1 table's
> intervals below are the filed B = 5,000 values; at B = 200,000 they read Qwen [-3.93, +15.01], GLM
> [-21.12, **+0.14**], luna [-24.35, -8.55], DeepSeek [-37.46, -9.38]. The classifications, and
> **R1 = 0 of 4**, are unchanged, and the verdict's knife edge is **+0.1409%**, not +0.0405%.
>
> Three further statements below are superseded. (i) The adjusted decomposition is now printed on
> **both scales**: on the additive scale **zero of four** pairs separate. (ii) The divergence count is
> **zero robust**, not "one robust, one arm-dependent": on the like-for-like variant arm pair none of
> the four separates (DeepSeek overlaps by 13.4pp, luna by 15.1pp) and the only provider whose variant
> intervals separate is Qwen, by 0.3pp — the provider this entry counts as an overlap. On the primary
> pair the two separations are knife-edge: 0.6pp and 0.7pp on the log adjustment, 0.1pp and 0.5pp raw.
> (iii) The confound paragraph's "2 of 4" is the raw and adjusted-log count; the adjusted-additive
> count is **0 of 4**, and the mean absolute gap *rises* to 19.5pp there. The position reading is
> **0, 1, 1 of 4 under three readings** (raw; adjusted log; adjusted additive) — the fourth reading in
> the phrase below does not exist. `PAPER.md` §3.8 and §3.9 carry the corrected text.
A second suite was collected to test §3.1 of the paper rather than extend it, and the test was filed
before any of its data existed. `tasks-b/PLAN.md` section 5 states the criterion arithmetically: **R1**
all four providers' tasks-b classifications equal their batch-1 classifications (Qwen positive,
GLM-Flash negative, luna null, DeepSeek null); **R2** at least one provider classifies positive and one
negative on tasks-b. *Replicated* requires R1 4 of 4 and R2; exactly 3 of 4 is *partially replicated*;
anything else is *not replicated*, with no after-the-fact tier.

| provider | batch-1 (filed) | tasks-b | tasks-b 95% CI | R1 |
|---|---|---|---|---|
| Qwen3.8-Flash | positive | **null** | [-3.78, +15.20] | differs |
| GLM-5.3-Flash | negative | **null** | [-21.38, **+0.04**] | differs |
| gpt-6-luna | null | **negative** | [-24.32, -8.51] | differs |
| DeepSeek V4.1 Flash | null | **negative** | [-38.31, -9.41] | differs |

**R1 fails, 0 of 4. R2 fails: not one provider classifies positive on tasks-b. NOT REPLICATED.**

**The verdict turns on 0.04 of a point.** GLM's interval ends at +0.0405%. Every one-decimal rendering
of it reads as "negative, excludes zero" — including the handover's own table and its one-line summary
— and the rule makes it null. `tools/replication-verdict.mjs` computes the rule, prints intervals to two
decimals and flags any null whose nearest bound is within half a point of zero, so it cannot be rounded
away again. The prose verdict and the filed rule disagree, and the rule wins because it was filed first.

**Two reversals, not two drifts.** luna and DeepSeek move from "null, centred on zero" to significantly
negative with intervals **disjoint** from their batch-1 intervals. Qwen lost its positive result without
reversing (intervals overlap on [+10.0, +15.2]); GLM's overlap in both directions. No cause is offered
here: the suites differ in size (31 vs 40 tasks), grading (binary vs partial credit) and cells (620 vs
800).

**Robust to the position question (F52).** Under the three consistent readings — raw; execution-order
adjusted on the log scale; execution-order adjusted on the additive scale — R1 is 0, 1, 1 of 4 and R2
fails on all three, because no basis produces a positive classification on tasks-b. The one provider
that would match on an adjusted reading is GLM. **Corrected 2026-10-10:** this paragraph read "all four
consistent readings ... 0, 1, 1, 1 of 4" and "R2 fails in all four"; the fourth reading was a phantom
and the enumeration is three (`notes/records/REPLICATION-VERDICT-2026-10-09.md` §0, §1).

**How much of the failure is a divergence and how much is the rule.** R1 compares *classifications*, so a
provider fails whenever its class changes, however close the estimates are. Comparing the suites directly
(execution-order adjusted on both):

| provider | batch-1 | tasks-b | gap | intervals |
|---|---|---|---|---|
| gpt-6-luna | +6.7% [-6.4, +22.9] | -16.2% [-24.9, -7.0] | 22.8pp | **disjoint** |
| DeepSeek V4.1 Flash | -0.8% [-10.1, +9.8] | -17.0% [-23.3, -10.8] | 16.3pp | **disjoint** |
| Qwen3.8-Flash | +35.3% [+16.2, +58.7] | +7.0% [-2.6, +16.9] | 28.4pp | overlap |
| GLM-5.3-Flash | -8.9% [-19.7, +2.1] | -6.2% [-15.0, +3.2] | **2.7pp** | overlap |

**Two of the four failures are divergences the data separate; two are fragile classifications — and the
ablation (F52's tool, `tools/ablations.mjs`) takes one of the two divergences back.** DeepSeek differs on
both arm pairs; luna differs on `dsh:ptc` vs `dsh:native` but not on `dsh:ptc-opt` vs `dsh:native-opt`,
where its interval (-8.8% [-20.7, +2.0]) overlaps its adjusted batch-1 interval. So: one robust
divergence, one arm-dependent, two fragile classifications. GLM's
two suites agree to 2.7pp — same sign, both null — and it scores as a failure only because its batch-1
interval sat entirely below zero while its tasks-b interval crosses it. The honest sentence is *the
pre-registered classification pattern did not reproduce*, not *four providers disagreed*; the second
over-reads the first by a factor of two. The verdict is unchanged: R1 needs 4 of 4 and R2 fails on every
basis. **A criterion that compares classifications inherits the fragility of any interval passing near
zero, and will report a failure for an estimate that has not moved** — GLM is the proof. The rule is
still applied as filed, because softening it after the fact is what a pre-registration forbids.

**The confound is not the cause.** If execution order explained the failure, adjusting both suites would
close the gaps. It does not: the mean absolute gap moves from 18.8pp to 17.5pp and the separated
discrepancies stay at 2 of 4. GLM's gap collapses; luna's and DeepSeek's widen slightly.

**Reported alongside.** The pre-registered family is **m = 12** (4 cost + 8 solve-rate contrasts over
the four providers), not the m = 18 the six-provider artefact prints; **2 of 12 survive Holm** at
alpha = 0.05 — DeepSeek (p = 0.0001) and luna (p = 0.0003), the same two as in the m = 18 family. H1
re-fit on the four with the filed spec: b1 = **-0.0125 [-0.0203, -0.0050]**, negative with the interval
excluding zero, which matches the plan's replication read even though H1's own hypothesis (b1 > 0) is
refuted in both suites. Anthropic is excluded by the filing ("No Anthropic"); haiku and sonnet are
both null, so adding them changes nothing.

**Verifications it rests on.** The batch-1 targets reproduce *exactly* from the current estimator (four
point estimates, eight interval bounds); the gateway treatment is identical between the suites per
provider (same protocol path, same cache-breakpoint setting); and building the panel over only the four
pre-registered datasets returns A2 rows identical to the six-provider panel. Record:
`notes/records/REPLICATION-VERDICT-2026-10-09.md`.

## F52 — The position "standardisation" was a rescaling, and the corrected correction is small  ·  MEASURED (supersedes F45's adjustment)

**The estimator was wrong, and it was caught only by proving it, not by reading it.**
`results/_scratch/position-standardise.mjs` called `armStdMean(rows, ...)` — passing BOTH arms where the
arm's own records were meant — so each block's "standardised" value is algebraically
`[w_n / (w_n + w_q)] * (c_q - c_n)`: the raw difference multiplied by a position-frequency ratio.
**Verified on 62 of 62 GLM blocks, maximum error 3.5e-18.** It contains no term for what a position
costs, so it cannot remove a position effect, and the headline it produced — "every differential roughly
halves" — is that ratio (mean 0.474), not a measurement. That claim reached
`notes/defects/DEFECT-position-confound-2026-10-04.md` section 3 and then `PAPER.md` section 3.1, and is withdrawn
from both.

**tasks-b needed checking too**, since the shuffle repair was forward-only: it inherited the same
degenerate assignment. (Corrected 2026-10-10: there are **six** tasks-b matrices, 80 (task, seed)
blocks each, and the position is identical across all six — verified directly on 4,000 (matrix, key)
comparisons, 0 differences. The earlier "five matrices / 320 blocks" undercounted.) Its raw
differentials carry the same design, and so does every position-adjusted number reported for it.

**The instrument that works keeps the pairing.** With one observation per arm per block there is nothing
to reweight within a block, so the estimate comes from a model of the within-block paired difference,
`d = c_ptc - c_native = alpha + [f(p_ptc) - f(p_native)]`, with `f` a step function over the ten
positions and a task-clustered bootstrap (`tools/position-adjust.mjs`, 12 tests). It recovers a **known**
arm effect under a **known** position effect on both scales, and it refuses designs it cannot identify:
with a pure shift — every block putting ptc exactly k positions after native — the arm effect and a
constant-per-step position effect are the same parameter. The real permutation varies (46 distinct
pairs in batch-1, 58 in tasks-b), which is why an adjustment is possible at all.

**What it finds.** The correction is small for most models and is not a uniform shrinkage. Haiku
+53.84% to **+51.80%**; GLM -20.75% to **-8.90%** (log) or **-17.30%** (additive); Qwen +30.67% to
**+35.30%**, i.e. up. The additive result corroborates the independently written slot regression
`cost_billed ~ mode + slot + (1|task)` (+52.97% for Haiku); the withdrawn reweighting had said +25.41%.

**Two classifications move, and both matter.** GLM is significantly negative as filed and **null on both
scales** once order is controlled; Sonnet is positive on the log scale (+17.02% [+5.05, +28.41] at the
current B = 200,000 re-filing) and **null on the additive one** (+6.85% [-5.07, +16.82]). Since GLM is
the only significantly negative row, the paper's "the penalty does not share a sign" claim rested on a
row that does not survive — and that claim has since been **withdrawn and restated** in PAPER.md section
3.1a, from sign disagreement to the **magnitude and model-specificity** both suites support. (Corrected
2026-10-10: this paragraph said "provider-specificity". Four of the five providers contribute one model
each, so provider and model are aliased; on the one provider where they separate, Anthropic, the
within-provider spread is 49.1 of the batch-1 75.1 points.) The ratio result, by contrast, strengthens: at
ratio 5.00 the three models span 59.4 adjusted points against 75.0 across the axis, so **79.2%** of the
spread sits inside one ratio value, up from 70.6% raw. A real correction is not a uniform shrinkage, and
this is the clearest evidence of it — Qwen moves *up*, from +30.67% to +35.30%.

**The scale is not settled.** Judged by held-out prediction of the same quantity in the same units,
the multiplicative (log) scale wins **9 of 12** model x suite comparisons by up to 1.8x, and every
comparison the additive scale wins is marginal (<=4% relative error): batch-1 is 3-3, tasks-b is 6-0.
An earlier version of this check converted the additive prediction into a ratio, which explodes when a
predicted difference approaches the block's own cost, and claimed "10 of 12, x20"; that metric was
wrong and the claim is withdrawn with it. Records:
`notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md`, `PAPER.md` section 3.1 and limitation 8.

## F53 — A6's cache-regime aggregate pooled two regimes, and a 0% there is the measurement path  ·  MEASURED

A6 reports "cache regime per model (primary cells, mean hit rate)", and its `overall` is a mean cache
hit rate, **not a solve rate**. Sonnet's 0.513 was filed against its 757/800 = 94.6% solve rate as an
unexplained anomaly; it never disagreed with anything. The near-matches for the other models (DeepSeek
94.9% vs 95.6%, haiku 56.9% vs 57.9%) are coincidences.

**The real defect is the aggregate.** On Anthropic it averages six DSH arms that receive an injected
top-level `cache_control` breakpoint (~85-96% hits) with four external-harness arms that cannot receive
one (exactly 0%). 480 cells at 85.5% + 320 at 0% = **51.3%**, the filed number to the digit; haiku is
213 at 94.2% + 140 at 0% = 56.9%. The gate is `tools/measure-gateway.mjs`:
`url.includes('/messages') && cacheBreakpoints`, and only DSH speaks `/v1/messages`. A census over every
gateway record of all six tasks-b matrices finds **no external harness on `/v1/messages` in any matrix**
and no external harness ever receiving a breakpoint injection.

So the 0% measures **the study's own request path, not a harness refusing to cache** — and there are
zero null hit rates in the Anthropic matrices, so it is real data rather than a coercion artefact.
Fixed additively: `tools/cache-regime.mjs` splits each model's hit rate by the `dsh:` arm prefix with
cell counts, using the same `?? 0` the pooled value uses so the two sides decompose it exactly, and
returning null rather than 0 for an empty side. Every pre-existing A6 value is byte-identical.

**The limitation this creates.** On Anthropic, any cross-*harness* cost comparison prices the external
harnesses with every input token at the miss rate ($2.00/M on Sonnet) while DSH arms read from cache at
a tenth of it. A1's harness ranking on Anthropic is therefore confounded by the study's own
configuration, and the cache component has not been sized. The **PTC-vs-native** contrast is unaffected:
both arms are DSH arms inside one matrix with identical treatment. Record:
`notes/defects/DEFECT-a6-cache-regime-aggregate-2026-10-09.md`.

## Where the hard-suite work is recorded

| | |
|---|---|
| plan | `notes/plans/PRE-REGISTRATION-HARD.md` — committed at `8ec47c4` **before** the analysis ran |
| binding amendment | `PRE-REGISTRATION.md` §12.10 (amendment 23) — the hard suite is bound by the plan, and H1–H5 are not re-opened by it |
| tool | `tools/hard-analysis.mjs`, 17 tests, statistics checked against brute-force enumeration |
| figures | `analysis/hard-suite-2026-10-05.json` |
| full record, sensitivities and the defects found | `notes/records/HARD-SUITE-2026-10-05.md` |
