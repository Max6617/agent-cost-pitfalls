# REVIEW-PROMPT-4 — hostile review of the paper as it now stands

**Your job is to kill this paper, or to find exactly where it is weakest. Not to summarise it, not to
praise it. Assume it will be reviewed by someone who wants it rejected, and be that reviewer first.**

You are in `C:\Users\user\betterharness`. Read this file, then `PAPER.md` in full, then the records it
cites. Everything you need is on disk and nothing in this session costs money.

## What the paper currently claims

1. **§3.1/§3.1a** — the code-mode cost penalty is *large and provider-specific* (75.0 adjusted points
   across six models) and **not predicted by the output:input price ratio** (three models at ratio 5.00
   disagree by 59.4 adjusted points = 79.2% of the whole spread).
2. **§3.4** — harness cost rankings **do not transfer** between providers.
3. **§3.5** — the one confirmatory win: more presented tool schemas ⇒ more model requests (+2.228).
4. **§3.8** — a **pre-registered replication on a second suite failed** (NOT REPLICATED, R1 0 of 4).

Note what is *not* claimed. **Three things were withdrawn on the record**: a "the penalty does not share
a sign" claim (§3.1a); a "position-standardised" table whose estimator was algebraically a rescaling
(§3.1, limitation 8); and a **7.7% A/A placebo noise floor** whose arm pair was never a placebo — the two
arms' first requests differ by 30 bytes — so the study now reports **no noise floor at all**
(limitation 9). **A reviewer should ask whether the paper that remains is worth publishing, and whether
a study that has retracted three of its own numbers is a study whose remaining numbers can be trusted.**

## Where the evidence is

| file | what it holds |
|---|---|
| `PAPER.md` | the paper. §3 results — note **§3.1a** (the restatement), **§3.8** (the replication) and **§3.9** (the ablations) — then §4 related work, §5 limitations, §6 statistical status, §7 outstanding work |
| `notes/records/FINDINGS.md` | 53 numbered findings, with dated corrections; several are seven-model and cannot be regenerated |
| `notes/records/REPLICATION-VERDICT-2026-10-09.md` | the verdict, its rule, and §2b's decomposition |
| `PAPER.md` §3.9 + `analysis/ablations-2026-10-09.json` | what each claim rests on: arm variant, seed split, ranking restriction, provider leave-out |
| `DEFECT-*.md` | nine defect records, including two that changed published numbers |
| `PRE-REGISTRATION.md`, `tasks-b/PLAN.md` | what was filed before the data, and what was amended |
| `METHODS.md`, `ARTIFACT.md`, `artifact/MANIFEST.json` | how it was measured and what is shipped |

Commands you should actually run rather than trust:

```
node --test "tools/*.test.mjs"
node tools/artifact.mjs --verify
node tools/replication-verdict.mjs
node tools/position-adjust.mjs                 # batch-1: raw vs adjusted
node tools/position-adjust.mjs --datasets batchb
node tools/panel-analysis.mjs --datasets batchb --json results/_scratch/review.json
node tools/ablations.mjs
```

## Known attack surfaces — attack these, and find more

This list is not exhaustive and is given so the obvious ones are not missed. **An objection that names a
section and a number is worth ten that name a topic.**

**Statistical**

- The execution-order ("position") adjustment's functional form is **not settled**: the multiplicative and
  additive scales disagree materially, and they disagree about a *classification* for two of six models
  (GLM null on both; Sonnet positive on one, null on the other). Is §3.1's table therefore a modelling
  choice dressed as a result?
- §3.8's rule (R1) compares **classifications**, so a provider fails when an interval endpoint crosses
  zero even though the two suites' point estimates are 2.7 points apart. Is "NOT REPLICATED" a finding
  about the effect or about a fragile decision rule?
- **The study has no noise floor** (limitation 9): the intended A/A placebo pair is not a placebo, and both
  published figures — 46.2%, then 7.7% — are withdrawn. So which claims here are large enough to survive an
  *unknown* null? Does the paper partition them — a 75-point spread needs far less protection than a
  9-point one — or does the large claim silently vouch for the small ones?
- How much of the reported spread is Monte Carlo error? Re-run the bootstrap with different seeds and say
  which claims move.
- Is the Holm family the right size? The pre-registered family is m = 12 over four providers; the paper
  reports six models. Which correction applies to which table?
- Test editing: luna edited tests on 13.1% of runs, and the worst-case sensitivity is 82.3%. Does any
  solve-rate statement in the paper survive that?

**The ablations, which were run to pre-empt you and may not have**

§3.9 restricts each claim and reports what survived. Attack it rather than accepting it:

- **Arm variant**: the PTC penalty's *sign* agrees across two arm pairs, but luna's *significance* does
  not (-16.6% significant vs -8.8% null). If one model's result changes with the arm string, does *any*
  per-model claim in this paper survive? The paper concedes the point for luna and then keeps using
  per-model classifications in §3.8.
- **Seed split**: with two seeds, Qwen's and Sonnet's batch-1 positives are each seed-dependent. Are two
  seeds enough to report a per-model classification at all?
- **Ranking**: the median Spearman rho changes *sign* on tasks-b depending on which model is dropped
  (-0.190 to +0.071). §3.4 now leans on the tie fraction instead — but is a statistic that fragile
  evidence for anything?
- **H3**: survives leave-one-provider-out, but its magnitude is +2.228 on batch-1 and +8.378 on tasks-b.
  A confirmatory win whose *size* triples between suites: is it one effect or two?
- **The ablation reversed a previous finding**: §3.8's "two real divergences" is now one robust and one
  arm-dependent. How many other claims in this paper have been qualified after the fact, and does that
  pattern itself undermine the paper?

**Design and validity**

- **One model per provider** (except Anthropic). Every "provider effect" is confounded with a model
  effect. What in the paper distinguishes them?
- **The harness treatment is not identical across providers.** On Anthropic our gateway injects cache
  breakpoints, and only the DSH arms can receive one; the external harnesses' input tokens are unpriced.
  Is the cross-provider comparison therefore measuring the gateway?
- **The matrices are not independent replications of each other**: the shuffle was seeded without the
  matrix, so all six drew the same execution order. What does that do to every cross-provider claim?
- The authors' relationship to DSH, and the fact that its study conditions were authored by them.
- 31 and 40 tasks, two seeds, ten arms. Is any of the per-stratum or per-arm reporting powered for what it
  claims?

**Novelty, as of 2026-10-09**

- Claw-SWE-Bench (arXiv:2606.12344) already reports per-harness billed dollar costs **and** per-harness
  cache hit rates on one pricing regime. Lumer et al. (arXiv:2601.06007) already measure caching cost
  reductions across three providers. LiteLLM already publishes a per-arm cache column from gateway logs.
  **So what is left that is new?**
- Toolshed (ICAART 2025) finds accuracy flat across 1–128 tools; the crossover study (arXiv:2608.06370)
  finds output tokens equal across tool paradigms. Both cut against the paper's mechanism. Are they
  answered or merely cited?
- §4 no longer claims a noise floor; it reports the deficiency, and the published per-cell cost noise floor
  it cites (Hu et al., arXiv:2609.30725, CVs 2.4–8.4%) makes the gap concrete rather than excusing it.
  **Is reporting a failed control as a limitation an adequate substitute for having one?** What would a
  correctly constructed placebo cost, and why was it not run?

**Process**

- The pre-registration was amended 22 times and its freeze is described in the paper as nominal. Which
  claims were filed before the data and which were decided after?
- The artifact's second scope (the replication suite) was added **after** the paper needed it. Is the
  reproducibility claim therefore retro-fitted?
- **Three** published numbers changed after the fact: the position table, the sign claim, and the 7.7%
  noise floor (withdrawn 2026-10-04). Is there a fourth? Look for claims that depend on a document that
  has since been corrected — this repository was caught doing exactly that twice in one day, once by a
  literature pass whose job was auditing novelty claims.

## Output: write `notes/reviews/REVIEW-4.md`

Ranked by **damage**, worst first. Each objection gets:

1. **The claim attacked** — section and the exact sentence or number.
2. **The objection**, stated as strongly as it can honestly be stated. If it would kill the paper at a
   journal, say so.
3. **What the paper has on disk that answers it** — the file, and the command if one exists. **Run it.**
4. **Verdict**: `answered` / `partly answered` / `not answered` / `cannot be answered from this repo`.
5. **The cheapest fix**, if there is one — a rewording, a caveat, a sensitivity, or a small analysis.

Then a section **"What a hostile reviewer says in one paragraph"** — the single most damaging true
paragraph that can be written about this paper today, in the voice of someone recommending rejection.
Then **"What the paper must fix before submission"** — a short ordered list, and nothing else.

## Rules

- **Do not accept a document's word for a number.** Re-derive it with the named command. This repository
  has twice published a number computed by a broken estimator, and both times the code looked reasonable.
- If two documents disagree, that is a finding — report it with both quotes.
- Do not propose new experiments that cost money. Everything here must be answerable from the disk.
- Distinguish `the claim is false` from `the claim is unsupported` from `the claim is true but the paper
  overstates it`. They need different fixes.
- **No praise. No summaries. No "the paper is generally sound, however…".** If a section is fine, say
  nothing about it.
- Do not edit `PAPER.md` in this session. Produce the review; the fixes are a separate pass. The one
  exception: if you find a number that is simply **wrong**, fix it and say so explicitly at the top.
- Do not touch `findings/`. Do not re-baseline `artifact/MANIFEST.json` (use `--extend`; the six-matrix
  timestamp `2026-10-04T08:11:15.632Z` is pinned by a test). Start no collection, gateway or pilot.