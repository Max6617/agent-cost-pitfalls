# LIT-PROMPT-2 — literature verification pass for the current claims

You are starting a **research-only** session in the repository `C:\Users\user\betterharness`. Read this
whole file first. It is self-contained: assume you know nothing about this project.

## What the repo is

A study comparing what coding-agent harnesses cost to run the same model on the same tasks, across six
model/provider cells, with a contract-level measurement gateway at the provider boundary. The paper
being written is `PAPER.md`. Its claims, as of 2026-10-09:

1. **§3.1/§3.1a** — the code-mode (programmatic tool calling) cost penalty is *large and provider-specific*
   (75.0 adjusted points across six models) and is **not predicted by the output:input price ratio**.
   The sign is explicitly **not** claimed to be a stable provider property — an earlier "does not share a
   sign" claim was withdrawn after the execution-order correction and a failed replication.
2. **§3.4** — harness cost rankings **do not transfer** between providers (median Spearman 0.238; 74.1% of
   adjacent rank steps statistically indistinguishable).
3. **§3.5** — the one confirmatory win: more presented tool schemas ⇒ more model requests
   (+2.228 [+1.234, +3.328], n=744).
4. **§3.8** — a **pre-registered replication on a second 40-task suite FAILED** (R1 0 of 4, R2 fails,
   verdict NOT REPLICATED), with the failure decomposed into two real divergences and two fragile
   classifications.
5. **§3.3 / limitation 7** — on Anthropic the cache regime measured is a property of the *client's
   protocol path*, because only the Anthropic-Messages path can carry an injected cache breakpoint.

## What is ALREADY established — do not redo it

`notes/literature/RELATED-WORK.md` holds a 70-entry annotated bibliography across ten themes, a threat list (T1–T13), and
three follow-up passes. `notes/literature/LITERATURE-2.md` is an adversarial prior-art pass with a verdict per claim and
a list of contradictions and near-misses. Between them, the following are **already known and already
cited in `PAPER.md` §4**: per-harness billed dollar costs and per-harness cache hit rates on one pricing
regime (Claw-SWE-Bench, arXiv:2606.12344); a gateway-published per-arm cache column (LiteLLM's
Terminal-Bench router benchmark); prompt-caching cost reductions across three providers (Lumer et al.,
arXiv:2601.06007); harness/scaffold sensitivity of accuracy (the Scaffold Effect, arXiv:2607.22585; Han &
Sun; Zhang et al.); tool-count effects on selection accuracy (Toolshed, ICAART 2025); terseness effects
on cost (Renze 2024, arXiv:2401.05618); model-level price reversal (Chen et al., arXiv:2603.23971); and
accuracy-side rank-tie statistics (arXiv:2609.17394).

**Two things are claimed as not previously published** (see `PAPER.md` §4, "Novelty statement"), and they
are what this pass must attack hardest: (a) whether a **billed-cost ranking of harnesses transfers across
providers whose price ratios differ**, with the ratio varied as an *experimental factor*; and (b) a
**pre-registered replication in this area reported when it failed**.

## Your task, in priority order

### 1. Close the unreadable items (highest priority)

These were identified as potentially adjacent and could not be read. Verify or definitively rule out each:

| item | why it matters |
|---|---|
| **MDPI Electronics 15(14):3175** (Akamai interstitial blocked the fetch) | snippets suggest a **4–24 candidate tool-pool ablation** — directly adjacent to claim 3 |
| **"Agent Harness Engineering: A Survey"**, OpenReview forum `eONq7FdiHa` (captcha-walled) | reportedly argues the evidence does **not** establish that the harness matters more than the model — a direct attack on the paper's framing |
| **E-Bench** arXiv:2607.23722 | snippets claim code execution cuts interaction cost |
| **Yang et al.** arXiv:2607.10569 | a code-only-output ablation on coding-agent tasks with <3% pass-rate change — bears on the verbosity mechanism |
| **"Is grep all you need?"** arXiv:2605.15184 | harness-presentation effects on agentic search |
| **Meta-harness** arXiv:2603.28052 | automated harness optimization |
| **"Confucius Code Agent"** arXiv:2512.10398 | same-model cross-scaffold controlled experiments |

### 2. Forward-citation pass on the current claims
The existing sweeps were rate-limited (Semantic Scholar returned HTTP 429 throughout) and predate the
paper's current claims. **Anything published after ~August 2026 may be missing.** Search specifically for
prior art on:

- cross-provider or cross-price-schedule **cost** rankings of agent harnesses/designs;
- **failed or negative replications**, and pre-registered replications, in LLM/agent evaluation;
- published **A/A placebo or noise-floor** measurements for agent *cost* (the paper reports 7.7% and
  found no counterpart — that absence is itself a claim to check);
- guidance on **how many seeds/runs a cost comparison needs**;
- cache behaviour on Anthropic as a function of **which client protocol path** is used.

### 3. Confirm the uncertain venues
Several citations are venue-confirmed only through citing papers (RouteLLM, FrugalGPT, Hybrid LLM, and a
few 2026 preprints). Confirm or mark them "reported". Also: capture `docs.z.ai/guides/capabilities/cache`
into `_ev/` (single-fetch confirmation only), and settle the Cavewoman affiliation question.

## Rules you must follow

- **Every identifier must resolve to the paper you say it does.** This repository has already been burned
  by wrong IDs in its own notes (a ToolACE ID that resolved to a brain-MRI paper; a Terminal-Bench ID that
  resolved to finite-group theory). Open each link.
- **Never quote a source you did not fetch.** If a page is blocked, say so — the repo has a convention for
  it: a "could not verify" section listing the item and what would be needed.
- Prefer primary sources (arXiv abstract page, official PDF, vendor docs). Do not use a citing paper as
  evidence for what a source says.
- Distinguish **"this contradicts the paper"**, **"this anticipates the paper"**, and **"neither"**. Only the
  first two matter.

## Output

Write `notes/literature/LITERATURE-3.md` in the repo root, structured as:

1. **Threats found** — each with the exact claim number in `PAPER.md` it attacks, the citation, a quote,
   and a one-line recommended wording change.
2. **Anticipations found** — prior art that already covers something the paper presents as new, with the
   same detail.
3. **Cleared** — items from the list above that turned out to be irrelevant or unreadable, with what you
   tried.
4. **Could not verify** — with the reason and what would be needed.
5. **Recommended edits to `PAPER.md` §4** — as concrete replacement sentences, not suggestions.

Then update `PAPER.md` §4 and §7 only where your findings require it, and commit with a message that
names what changed and why.

## Constraints

- Do **not** touch `findings/` (untracked, not ours).
- Do **not** re-baseline `artifact/MANIFEST.json` with `--build`; use `--extend` if you must. The
  six-matrix scope's `generated` timestamp must stay `2026-10-04T08:11:15.632Z` — a test enforces it.
- Do **not** start a collection, preflight, pilot or gateway. This session spends nothing.
- `node --test "tools/*.test.mjs"` must pass (262 tests) before you commit.
- Do **not** weaken the paper's claims to make a threat go away, and do **not** bury a threat because the
  claim is load-bearing. If a supposed novelty is already published, say so plainly.