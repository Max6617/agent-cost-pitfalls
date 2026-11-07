# FIRST RESULTS — milestone 1

> ## ⛔ RETRACTION — 2026-09-30
>
> **The headline of this document is retracted.** "Cheapest billed: DSH PTC; OpenCode drops to
> third; the ranking inverts" was computed under the retracted DeepSeek price card
> (miss 0.14 / hit 0.028 / out 0.28; the true off-peak card is **0.15 / 0.003 / 0.60**, ratio 4.00,
> cache discount 50x) and with a cost function that omitted the output term. **What is true:**
> OpenCode is cheapest under **both** cost functions among the arms then measured; the "ranking
> inverts" claim came from a cost function that omitted the output term. The re-derivation is
> `notes/records/FINDINGS.md` **F20**; the propagation of the corrected card through the document layer is
> recorded in `notes/records/PRICE-CARD-PROPAGATION.md`.
>
> The table and findings below are left exactly as written, for the record. Do not quote them.

The first complete cross-harness matrix. **n = 1 task, 2 seeds.** Preliminary, and treated as such
throughout — but the pipeline is real, the numbers are provider-grade, and one effect is already large
and consistent.

Collected 2026-09-29 · DSH 0.1.5-alpha.1 · `deepseek-flash` · `reasoningEffort: high` ·
5 arms × 1 task × 2 seeds = 10 runs, **10/10 solved**. Raw data: `data/milestone-1/`.

---

## The table

| arm | cost_cold | cost_billed | **cache hit** | steps | input tok | output tok |
|---|---|---|---|---|---|---|
| `dsh:ptc` | $0.0087 | **$0.0020** | **95.6%** | 7 | 62,053 | 2,542 |
| `dsh:ptc-opt` | $0.0086 | **$0.0020** | **95.6%** | 7 | 61,531 | 2,890 |
| `dsh:native` | $0.0085 | $0.0027 | 86.0% | 8 | 60,925 | 1,662 |
| `dsh:native-opt` | $0.0103 | $0.0030 | 86.9% | 9 | 73,359 | 2,106 |
| **`opencode`** | **$0.0071** | $0.0022 | 85.2% | 7 | 50,382 | 777 |

`cost_cold` prices every input token at the miss rate; `cost_billed` applies the cache split the
gateway captured from the provider.

---

## Finding 1 — the ranking inverts depending on whether you count the cache

This is the whole paper in one line.

- **Cheapest by `cost_cold`: OpenCode** ($0.0071). It uses the fewest input tokens (50,382).
- **Cheapest by `cost_billed`: DSH PTC** ($0.0020). OpenCode drops to third.

A comparison that reports only raw tokens, or only list-price cost, reaches the **opposite conclusion**
from one that measures the cache. Every existing cross-harness comparison is in the first category,
because no harness exposes its cache split.

**PTC vs native, directly:** PTC uses *more* input tokens (62,053 vs 60,925), has a *higher* cold cost
($0.0087 vs $0.0085) — and is **26% cheaper billed** ($0.0020 vs $0.0027). The entire difference is a
**9.6-point cache-hit gap** (95.6% vs 86.0%).

That is the protocol's central prediction, measured rather than asserted: **prompt-cache discipline,
not token volume, dominates cost.**

## Finding 2 — the cache gap is consistent, which is what makes it interesting

95.6% / 95.6% for the two PTC arms against 86.0% / 86.9% for the two native arms. Both seeds, both
policy variants, in the same direction, with a ~9.6-point separation.

Why would tool *presentation* change the cache hit rate? The system prompt is stable either way. The
plausible mechanism is that in PTC mode the model's own tool-call arguments are sent as a single
`run_code` block whose shape repeats, whereas native mode emits 25 differently-shaped tool calls —
and any variation inside the re-sent history lands after the cached prefix and costs a re-read.
**This is a hypothesis, not a finding.** It is testable from the existing logs and should be tested
before it goes in a paper.

## Finding 3 — output volume separates the harnesses more than input

DSH arms emit 1,662–2,890 output tokens; OpenCode emits **777**, roughly a quarter as many, for the
same solved task. Output is the expensive direction, so this is the axis where OpenCode's lower input
volume is partly clawed back. Worth stratifying by task difficulty — a trivial task may suppress
DSH's verbose mode.

## What this does NOT show

State plainly in any write-up:

- **n = 1 task, 2 seeds.** No statistical power. The paired comparisons in `analyze-results.mjs`
  report p = 1.0000 with n = 1, which is correct and meaningless. Nothing here is significant.
- **One trivial task**, solved by every arm within 7–9 steps. A task every arm solves cannot
  discriminate quality, and probably compresses the cost differences too.
- **Single model, single provider, one machine, one day.**
- **The cache contaminates the design.** Runs share a system prompt, so later runs hit a warm prefix.
  Order is randomised within block, but at k=2 this is a first-order effect. `cost_cold` exists
  precisely to be the cache-insensitive comparison — and note that on `cost_cold` the story reverses.

## The one-line summary

> On the same task, at the same model, harnesses that look identical on cold cost differ by **26%
> billed** — and the difference is a **9.6-point prompt-cache gap** that no existing comparison
> measures.

That is worth a paper. It needs the task suite.
