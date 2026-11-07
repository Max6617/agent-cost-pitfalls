# HOSTILE REVIEW — the 2026-10-01 material

You are an **external, read-only reviewer**. Your job is to attack, not to summarise. Assume the
author is overconfident and that every number is wrong until you have traced it to primary evidence.

**Repo:** `C:\Users\user\betterharness` (an empirical study of what coding-agent harnesses cost).
**Do not modify any file. Do not start any matrix. Do not spend money.** Read-only tools and
`node tools/*.mjs` (analysis only) are fine — none of them cost anything.

---

## 1. Why this review exists

Two earlier reviews of this repo (`notes/reviews/CRITICAL-REVIEW.md`, `notes/reviews/REVIEW-FINDINGS.md`) found five fatal
defects and were correct about almost everything. Both have since been answered in
`notes/reviews/REVIEW-RESPONSE.md`. **Since then, a large amount of new material has been written by a single
author in a single day, and none of it has been reviewed by anyone.**

That same author, on the same day, introduced a defect that invalidated two published claims: a
centralised exclusion rule silently dropped the phrase `credit balance is too low`, so **155 runs
whose every request returned HTTP 400 were analysed as model failures**. It is documented as
`notes/records/FINDINGS.md` F39. It was caught by the user, not by the author.

**Your primary mission is to find the next F39.** Assume there is one.

---

## 2. What is new and therefore unreviewed

**New findings — `notes/records/FINDINGS.md` F29 through F39.** Read them all, then try to falsify each.

| # | claim |
|---|---|
| F29 | `ds-full`'s 124 "terse" records never received the manipulation; they are used as a 124-run placebo, and identical treatments differ by up to 7.7% |
| F30 | the harness cost ranking is not provider-stable: median Spearman rho 0.286, permutation p = 0.012, 63.6% sign concordance, 54.0% within the DSH arms alone, 4 distinct cheapest arms across 7 models |
| F31 | output:input price ratio does not predict the PTC differential; the cache regime does |
| F32 | a 15-word terseness instruction cuts cost 12-54% on six models |
| F33 | Haiku is the only model with a genuine solve-rate deficit |
| F34 | H1 REFUTED (b1 = -0.358, CI [-0.488, -0.239]), H2 INCONCLUSIVE, H3 SUPPORTED, H4 unfalsifiable |
| F35 | 48 of 63 adjacent pairs in the study's own rank tables are ties at 95% |
| F36 | re-run cells are averaged, never selected |
| F37 | Anthropic caching A/B: hit rate 0.0% -> 11.8% -> 94.9%, automatic caching 3.1x cheaper |
| F38 | F18 replicated: DeepSeek 30/93 vs Sonnet 1/30 and luna 1/56; **not** Haiku (0/6, underpowered) |
| F39 | the exclusion rule was implemented at half strength; 155 runs misanalysed |

**New tools, all written today, none reviewed.** These produce every number above:

`tools/exclusions.mjs` (the exclusion rule), `tools/cost-panel.mjs` (re-prices every run from
archived tokens), `tools/panel-analysis.mjs` (cross-provider statistics), `tools/hypotheses.mjs`
(H1-H5 by the pre-registered rules), `tools/failure-classify.mjs`, `tools/timestamp-audit.mjs`,
`tools/cache-ab.mjs`, `tools/run-cache-ab.mjs`, `tools/f18-replication.mjs`,
`tools/check-providers.mjs`, `tools/exclusions.test.mjs`, `tools/prices.mjs`.

**New/rewritten documents:** `notes/reviews/REVIEW-RESPONSE.md`, `notes/records/PRICE-CARD-PROPAGATION.md`, and large
appendices to `notes/records/FINDINGS.md` and `PRE-REGISTRATION.md` (sections 12.3-12.6).

---

## 3. The specific attacks I want, in priority order

### 3.1 Find more infrastructure-as-result (the F39 class) — HIGHEST PRIORITY

The exclusion rule now excludes an unsolved run if **either** its output names a fault **or** every
gateway request it made returned 4xx/5xx. Attack that:

- Are there unsolved runs in **any** matrix whose gateway requests were, say, 80% failures but not
  100%, and which are therefore still counted as model failures? Check `results/*gateway*.jsonl`
  status distributions joined to run records.
- Are there runs with **zero** gateway records, or with gateway records whose `usage` is all zeros,
  that survive into the analysis?
- The phrase list in `tools/exclusions.mjs` — find provider error strings **in the archive** that it
  does not match and should.
- Conversely: does the rule produce **false positives**, dropping solved or genuinely-failed runs?
  (F24 documents 10 solved runs dropped by a bare-word "quota" match. `lh-ledger-replay` is a task
  *about* ledgers, so it is full of the word "billing".)

### 3.2 Attack the statistics

- `panel-analysis.mjs` uses a hand-rolled LCG for its bootstrap:
  `(seed * 1103515245 + 12345) & 0x7fffffff`. **`seed * 1103515245` exceeds 2^53 for large seeds,
  so the multiplication loses precision and the "random" stream may not be uniform.** Test it. If it
  is biased, every cluster-bootstrap CI in F30/F31/F32/F37/F38 is suspect.
- The cluster bootstrap resamples **tasks**. With 12 tasks (F37) or 30-31 (F31), is the interval
  meaningful? What happens with a task-level permutation test instead?
- `summarise()` in `cost-panel.mjs` was changed from "first record per cell" to "average over all
  records". Verify that this does not **double-count** a cell whose earlier record was excluded as
  infrastructure but whose later one was not (the luna retry added 113 records over 112 cells).
- The A8 "ties" test calls adjacent rank pairs independent. Are they? 63 tests are reported with no
  multiplicity correction. Does that matter to the conclusion?

### 3.3 Reproduce the headline numbers from scratch

Do not trust `analysis/*.json`. Re-derive independently, at minimum:

- the placebo floor (F29) — 7.7%
- median Spearman rho 0.286 and its permutation p (F30)
- sign concordance 63.6% / 54.0% (F30)
- the caching A/B hit rates and the 3.1x (F37)
- the F18 per-run solve rates and Fisher p-values (F38)
- H1's b1 and CI (F34)

State clearly which ones you could **not** reproduce and why.

### 3.4 Check the documents for what the day's edits broke

Today's edits were large and mechanical in places. Look for:
- numbers in `METHODS.md`, `PAPER.md`, `notes/records/FIRST-RESULTS.md`, `notes/records/CROSS-HARNESS.md`, `notes/literature/RESEARCH.md`,
  `notes/literature/RELATED-WORK.md` that are stale, contradicted, or that survived a correction they should not have;
- any remaining copy of the **retracted DeepSeek price card** (0.14 / 0.028 / 0.28) or the stale
  **ratio 2.0** / **5x cache discount** presented as fact rather than inside a correction note;
- the **conflict-of-interest statement**. `PRE-REGISTRATION.md` and `METHODS.md` say the authors did
  not develop DSH and are unaffiliated, but authored its conditions. `PAPER.md` and
  `notes/records/CROSS-HARNESS.md` used to say "DSH is ours" / "we built DSH". Verify the contradiction is gone
  and that what remains is accurate and consistent.
- `PRE-REGISTRATION.md` section 12 — is the amendment log now honest and complete? Does each
  amendment's stated reason match what actually happened?

### 3.5 Check the pre-registration was not bent again

`tools/hypotheses.mjs` executes H1-H5 as filed. Verify that it **does** — read
`PRE-REGISTRATION.md` sections 3, 4 and 6 and check the decision rules line by line against the
code. In particular: H1's model is specified as having a task random intercept; the code uses a
within-task (demeaned) estimator. **Is that the same thing?** If not, say so.

---

## 4. Standard of evidence

- **Every claim you make carries the path and line that proves it.** If you cannot point at primary
  evidence, mark it UNVERIFIABLE rather than asserting it.
- **Recompute; do not re-read.** A number that appears in two documents agreeing with each other is
  not verified.
- **A non-zero exit is not evidence until its cause is known.** This project has retracted five
  claims by ignoring that rule, most recently F39. Apply it to your own probes.
- **Distinguish "wrong" from "unsupported".** Say which.
- Severity scale: FATAL (would sink the paper) / MAJOR (changes a number or a claim) / MINOR /
  STALE / NOTE.

## 5. Output

Write your findings to a **new file** `notes/reviews/REVIEW-2.md` (creating this one file is the only write you
may do). Structure it as:

1. **Verdict**, up front, in five sentences.
2. **The five worst things**, ranked, each with its evidence path.
3. **Full findings**, by severity.
4. **What you could not verify**, and why.
5. **What survived hostile checking** — be as specific about this as about the failures; the
   previous reviews were useful partly because they said what was solid.
6. **Answers to section 3.1-3.5 above**, explicitly, even where the answer is "I found nothing".

Begin by reading `notes/records/FINDINGS.md` F29-F39 and `notes/reviews/REVIEW-RESPONSE.md`, then go to the archive. Do not
read this prompt's summary of the findings as evidence for them.
