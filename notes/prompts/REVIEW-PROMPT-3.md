# HOSTILE REVIEW 3 — the corrections, and whether they introduced new defects

You are an **external, read-only reviewer**. Attack; do not summarise. Every number is wrong until
you trace it to primary data yourself.

**Repo:** `C:\Users\user\betterharness`. **Do not modify any file except the one output file
below. Do not start any matrix. Do not spend money.** Read-only tools and `node tools/*.mjs` are
free — none of them call a provider.

---

## 0. Why you are here, and the specific thing to beat

Two earlier reviews (`notes/reviews/CRITICAL-REVIEW.md`, `notes/reviews/REVIEW-FINDINGS.md`) audited this repo and were right
about almost everything. A third (`notes/reviews/REVIEW-2.md`) then audited the material written on 2026-10-01 and
found that **five of that day's eleven new findings contained a wrong number or a false claim**,
including a confidence interval that was an artefact of a provably broken random number generator.

The author then fixed all of it. **The author's record on this is 2-for-2**: the fix for the first
review's biggest finding reintroduced a bug the repo already had a name for, and the fix for the
second review's findings needed its own correction pass. **Your job is to be the third data point.**

Assume the corrections below contain at least one new defect. Find it.

---

## 1. What is new and unreviewed since REVIEW-2

**`notes/records/FINDINGS.md` F44** is the correction pass itself. Read it first, then try to falsify it.

The specific changes to attack, in the order the author would rank their own confidence:

1. **`tools/rng.mjs`** — replaces a double-precision LCG with mulberry32. Verify independently
   that the *old* generator is broken as claimed (100,000/100,000 draws diverge from the exact
   BigInt stream; cycle length 10,466; 16,936 distinct values per million) and that the *new* one is
   sound. Then check **every** call site: are the streams independent, are the seeds fixed, do any
   results still depend on draw order or on iteration count?
2. **`tools/exclusions.mjs` → `exclusionVerdict()`** — now the single decision, called by
   `cost-panel`, `cache-ab`, `f18-replication`, `failure-classify` and `coverage`. Verify they are
   actually equivalent now: same population, same solved-guard, same zero-request behaviour. The
   previous version had three inline re-implementations with three behaviours — confirm there is not
   now a fourth.
3. **`tools/panel-analysis.mjs` section A2b** — Holm-Bonferroni, newly implemented because
   PRE-REGISTRATION §6 filed it and no tool contained it. Check the permutation p-value is the right
   tail, that 20,000 iterations is enough at these n, and that Holm is applied to the **right family**
   (is the family the seven PTC-vs-native contrasts? should it include A4's twelve? the A8 ties?).
   The claimed result is that GLM-5.3's star fails (p = 0.0713) and 3 of 7 survive.
4. **`tools/panel-analysis.mjs` section A4 solve-rate test** — new. Haiku `dsh:ptc` → `dsh:ptc-terse`
   claimed 48 → 35 solved, McNemar p = 0.0072. Check the pairing, the exact binomial, and whether
   "the other eleven are p = 1.0000" is right.
5. **`tools/hardbatch.mjs`** — new, and F42's claim is strong: **5/24 tasks discriminate on DeepSeek
   and 20/24 on GLM-5.3-Flash**, same suite, same arms. Recompute both. Then attack the
   classification: the 30pp threshold, the "too hard" rule (solved == 0 AND mean passRate ≥ 0.5), and
   the claim that **every one of DeepSeek's twelve "too easy" tasks is in GLM-Flash's discriminating
   list**. Is a single seed per cell enough to call a task "too easy"?
6. **`tools/preflight.mjs`** — one cell per harness before a matrix. Check it cannot pass a harness
   whose requests all failed, and cannot fail one that worked.
7. **The Sonnet caching A/B** (F37's replication) — new since REVIEW-2. Same three conditions, 216
   runs, all solved. Check the per-arm asymmetry claim ("static helps native, misses PTC") is real
   and not an artefact of which requests carry `cache_control`.
8. **`PRE-REGISTRATION.md` §12.7 and tag `prereg-v5`** — the author now states the freeze is
   nominal and the document should be read as a plan amended in the open. Verify that is an honest
   description and that the tag matches the working copy.

**`notes/reviews/REVIEW-2.md` is the previous review. It is a lead, not evidence.** Re-verify anything you rely on
from it, and if it was wrong about something, say so — the author would rather know.

---

## 2. The attacks I want, ranked

### 2.1 Did the corrections introduce new defects? — HIGHEST PRIORITY
Every change listed above. In particular: the F44 pass touched the exclusion rule (again), the
bootstrap (again), and the hypothesis tests. All three have been wrong before. Also check the
*interactions* — does the new RNG change any number that was previously stable, and does the new
exclusion rule change the population that a previously-verified result was computed on?

### 2.2 Reproduce the corrected headlines, from scratch
Do not trust `analysis/*.json`. Independently re-derive:
- the placebo CI, and whether it contains zero (claimed [−0.4%, +16.7%])
- H1 b1 = −0.367 [−0.494, −0.247]; H2 p = 0.6029; H3 +1.23 [0.52, 1.94]
- median Spearman ρ = 0.286, permutation p = 0.0121, 47 of 63 ties
- the A/B hit rates 0.0% / 11.8% / 94.9% (Haiku) and 0.0% / 27.0% / 85.9% (Sonnet)
- F42's 5/24 and 20/24
State which you could **not** reproduce.

### 2.3 Numbers that were corrected — are the corrections themselves right?
`notes/records/FINDINGS.md` F29, F30, F32, F33, F34, F35, F37, F38, F39 were all edited today. Check the edits
against primary data, and check for **stale numbers still sitting next to corrected tables** — that
has happened twice already (F37's prose, F39's own counts).

### 2.4 Does the paper's claim survive on corrected numbers?
The claim is now: *cost rankings of coding agents do not transfer across providers; the standard
field practice removes the variable that decides them; and the effect sizes the field reports are
mostly inside its own unmeasured noise.* Take the corrected numbers and try to break that sentence —
in particular whether the noise floor (7.7%), the rank-transfer statistics, and the caching mechanism
still support it.

### 2.5 What is still wrong and has NOT been claimed as open
Search for defects the author does not know about. `notes/reviews/REVIEW-2.md` found five in material the author
believed was finished. Find what is left.

---

## 3. Rules of evidence

- **Every claim carries the path and line that proves it.** If you cannot point at primary data, mark
  it UNVERIFIABLE rather than asserting it.
- **Recompute; do not re-read.** Two documents agreeing is not verification.
- **A non-zero exit is not evidence until its cause is known** — and neither is a 4xx, a missing file,
  or an absent number. This project has retracted six claims by ignoring that, most recently 155 runs
  whose every request returned HTTP 400, analysed as model failures.
- **A negative search result is not evidence of absence** until the search is known to be capable of
  succeeding. `notes/reviews/CRITICAL-REVIEW.md` had two claims withdrawn for that error.
- Distinguish **wrong** from **unsupported**. Say which.
- Severity: FATAL / MAJOR / MINOR / STALE / NOTE.

## 4. Output

Write your findings to a **new file** `notes/reviews/REVIEW-3.md` — that is the only write you may do.

1. **Verdict**, five sentences, up front.
2. **The five worst things**, ranked, each with its evidence path.
3. **Full findings** by severity.
4. **Explicit answers to §2.1–2.5**, even where the answer is "I found nothing".
5. **What you could not verify**, and why.
6. **What survived hostile checking** — be as specific about this as about the failures. A review that
   only lists problems cannot tell the author what to build on.

Start with `notes/records/FINDINGS.md` F44 and `notes/reviews/REVIEW-2.md`, then go to `results/` and the `tools/` source. Do not
treat this prompt's summary of the findings as evidence for them.
