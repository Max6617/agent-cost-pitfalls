# Provider price cards — captured 2026-10-02

**Provenance:** supplied by the study's author, copied from each provider's own pricing page on
2026-10-02. Until today `_ev/` held a captured page for **DeepSeek and Gemini only**; the GLM cards
decide H2 and two of F31's stars, and the Anthropic card carries the entire Haiku headline. Both
external reviews flagged the absence. It is closed here for all five providers the study used.

---

## OpenAI — gpt-6-luna (the study's OpenAI model)

Standard tier, **short context (≤272,000 input tokens)**:

| Input | Cached input | Cache writes | Output |
|---|---|---|---|
| $0.10 | $0.01 | $0.125 | $0.50 |

**Long context (>272K): $0.20 / $0.02 / $0.25 / $0.75** — every rate doubles except output, which rises
1.5x. Batch and Flex tiers are half of Standard.

## Anthropic

| Model | Base input | 5m cache write | 1h cache write | Cache hit | Output |
|---|---|---|---|---|---|
| Claude Sonnet 5.5 | $2 | $2.50 | $4 | $0.20 | $10 |
| Claude Haiku 4.5 | $1 | $1.25 | $2 | $0.10 | $5 |

Cache hit is 0.1x base for both. Long context is at standard pricing ("a 900k-token request is billed
at the same per-token rate as a 9k-token request"), so there is no context tier to model.

## Alibaba — qwen3.8-flash

| Input | Output | Implicit cache |
|---|---|---|
| $0.15 | $0.47 | $0.016 |

## z.ai — GLM

| Model | Input | Cached input | Cache storage | Output |
|---|---|---|---|---|
| GLM-5.3-Flash | $0.15 | $0.03 | Limited-time Free | $0.50 |
| GLM-5.3 | $1.40 | $0.26 | Limited-time Free | $4.40 |

## DeepSeek — deepseek-flash

Already captured at `_ev/deepseek-pricing.html` (2026-09-28, off-peak column): miss $0.15,
hit $0.003, output $0.60.

---

## What this confirms

Every card above **matches `tools/prices.mjs` and `tools/measure-gateway.mjs` cell for cell**. The
provenance gap the reviews found was a gap in the *evidence*, not in the arithmetic — but that is not
something the repo could previously demonstrate, and now it can.

## Two settings the tooling does not model, and whether they bite

1. **OpenAI's long-context tier.** The tooling prices luna at the short-context rate unconditionally.
   A request over 272,000 input tokens would be under-billed by 2x on input. Checked below.
2. **Anthropic's 1-hour cache write.** The tooling models only the 5-minute write (1.25x). A request
   written to the 1-hour cache would be under-billed by 1.6x on its write tokens. The gateway never
   sets a TTL, so every write is 5-minute — but the assumption is now recorded rather than implied.

## One cross-model caveat, newly documented

Anthropic's own page: *"Claude 4.7 and later models use a newer tokenizer that produces approximately
30% more tokens for the same text."* **Sonnet 5.5 uses the new tokenizer; Haiku 4.5 does not.** This
does not affect any cost figure — those are computed from the token counts the provider reports — but
it does affect any claim that compares **token counts** or **output verbosity** across models (F13),
because the same text is a different number of tokens on the two sides of that boundary.

---

## Verification, run 2026-10-02

**All seven model cards match tools/prices.mjs cell for cell** — miss, hit, write where the card
specifies one, and output. The provenance gap the reviews found was a gap in the evidence, not in the
arithmetic. That is now demonstrable rather than asserted.

**Neither unmodelled setting bites, and both were checked rather than assumed:**

| setting not modelled | check | result |
|---|---|---|
| OpenAI long-context tier (>272K) | largest single request across every luna run | **137,475 tokens — half the boundary** |
| Anthropic 1-hour cache write (2x vs 1.25x) | any request that wrote to a 1h TTL | **none; the gateway sets no ttl, so all 21 cache-creation requests are 5m** |

**One cross-model caveat recorded, not fixed because it is not a defect:** Anthropic states that
Claude 4.7 and later use a tokenizer producing ~30% more tokens for the same text. **Sonnet 5.5 is on
the new tokenizer and Haiku 4.5 is not.** No cost figure is affected — those come from the token
counts the providers report, which are already in each model's own units. But any claim comparing
token *counts* or output *verbosity* across those two models (F13) is comparing different units, and
the paper must say so.

---

## Model identity, verified live 2026-10-02

A fair question — *"are you sure we are using Haiku 4.5?"* — turned out to have a clean answer and an
unclean reason for needing to ask.

**The answer is yes.** Anthropic's model strings were probed directly:

| string we could have sent | result |
|---|---|
| `claude-haiku-4-5` | **200 — served as `claude-haiku-4-5-20251001`** |
| `claude-haiku-4-5-20251001` | 200 — same snapshot |
| `claude-haiku-4.5` | 404 — *which is why the gateway aliases it* |
| `claude-3-5-haiku-latest` | 404 — **so the study cannot have been running Haiku 3.5** |
| `claude-sonnet-5-5` | 200 — served as `claude-sonnet-5-5` |
| `claude-sonnet-5.5` | 404 — *"Did you mean claude-sonnet-5-5?"* |

The gateway rewrites `claude-haiku-4.5` → `claude-haiku-4-5` before forwarding
(`tools/measure-gateway.mjs` line 354), so every Haiku run in the study was served by
**`claude-haiku-4-5-20251001`** and priced against the correct card.

**The unclean part: the archive could not have shown this.** Until today the gateway logged only the
model it *sent*, never the model the provider said it *served*. `claude-haiku-4-5` is a **floating
alias** — if Anthropic ever re-points it, every Anthropic figure in the study would be priced against
the wrong card with no trace. The study cannot prove from its own records that it was not, which is
exactly the class of defect this project has retracted six claims over.

**Fixed.** The gateway now extracts `model` from the response body (or the `message_start` event on
SSE) and records it as `servedModel` beside the requested `model`, warning on the console when they
differ. Verified end to end through the patched gateway:

    requested=claude-haiku-4-5   served=claude-haiku-4-5-20251001   status=200

Every matrix collected before today still lacks the field, so for those the identity rests on the
live probe above plus the dated snapshot being stable. Every future run carries it.
