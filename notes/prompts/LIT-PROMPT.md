# LITERATURE REVIEW — is any of this already known, or already refuted?

You are doing a **prior-art and contradiction pass** for an empirical software-engineering paper.
The point is not a bibliography. It is to answer one question per claim: **has someone already
published this, or already published something that contradicts it?**

**Repo:** `C:\Users\user\betterharness`. **Read-only. Do not modify files. Do not spend money.**
Write your output to a new file `notes/literature/LITERATURE-2.md` (the only file you may create).

---

## Read first

- `notes/records/FINDINGS.md` — claims F29 to F39 are the new ones and are the ones at risk.
- `notes/literature/RELATED-WORK.md` and `RELATED-WORK-FOLLOWUP*.md` — an earlier pass. **notes/reviews/CRITICAL-REVIEW.md section 5
  found that many 2026 citations there are unverifiable and that one quote may be fabricated**
  (an OpenTelemetry metric name). Treat the existing related-work file as a lead source, not as
  evidence, and re-verify anything you rely on.

## The claims to test

For each, decide: **already known / partially known / contradicted / apparently novel** — and cite.

1. **The cheapest harness configuration changes with the provider** (F30). Four different configs are
   cheapest across seven models; median rank correlation between two providers is 0.286.
   *Search:* harness-induced variance, scaffold effects, benchmark ranking instability across models,
   cost–quality trade-offs in agent evaluation.
2. **A single request field decides the bill** (F37). Enabling automatic prompt caching moved a
   provider's cache hit rate from 11.8% to 94.9% and cost by 3.1x, with no change in solve rate.
   *Search:* prompt caching economics, cache-aware routing, KV-cache reuse in agent loops,
   Anthropic/OpenAI/Gemini automatic caching guidance and any published measurement of it.
   **This is the paper's headline, so a contradiction here matters most.**
3. **The provider's output:input price ratio does not predict the harness cost differential** (F31).
   *Search:* token-mix and price-ratio arguments about LLM cost, e.g. work arguing a fixed
   input:output mix determines cost rankings.
4. **A 15-word "be concise" prompt suffix cuts agent cost 12-54% with no solve-rate change** (F32).
   *Search:* verbosity/brevity prompting, output-length control, "concise" system prompts, cost-aware
   prompting. Has this been measured for agents, and is the effect size consistent?
5. **Cost rankings of agents are mostly noise at typical sample sizes** (F35: 48 of 63 adjacent rank
   steps are ties; F29: a placebo moves 7.7%).
   *Search:* statistical power in agent benchmarking, run-to-run variance of LLM agents, benchmark
   reliability, "how many seeds" arguments, leaderboard statistical significance.
6. **Cost per solved task is an unstable metric when solve rates differ** (F33, F38).
   *Search:* critiques of cost-per-success metrics, pass@k vs cost, unequal-quality cost comparison.

## Method

- **Verify every citation yourself.** Fetch the paper. Check the number you quote is in it.
  The previous pass produced at least one quote attached to a real standard that the standard does
  not contain; do not repeat that.
- For each source record: URL, what it claims, and **exactly which of our claims it helps or hurts**.
- If a source contradicts us, say so plainly and quote it. A contradiction is the most valuable
  output of this pass.
- Flag anything that suggests our effect is an **artefact of one provider's pricing UI** rather than
  a real mechanism.
- Note where a 2026-dated source cannot be found outside this repo's own timeline — that was a
  finding last time and it matters.

## Output — `notes/literature/LITERATURE-2.md`

1. **Verdict per claim**: known / partially known / contradicted / apparently novel, with the single
   best citation for each.
2. **Contradictions and near-misses**, in detail. This is the most important section.
3. **Sources that should change our wording** — where we are claiming novelty we do not have.
4. **Where our result is stronger than the prior art** — specifically, what we measured that nobody
   has.
5. **Citations we should add**, with the reason each one is needed.
6. **What you could not verify.**
