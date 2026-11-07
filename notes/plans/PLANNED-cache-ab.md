# PLANNED EXPERIMENT — Anthropic automatic caching A/B

**Not started. Recorded so it is not lost, and deliberately NOT applied to the running matrices.**

## The mechanism

Anthropic supports automatic caching, but it is **not default**. From their own documentation:

> **Automatic caching:** Add a single `cache_control` field at the **top level** of your request.
> The system automatically applies the cache breakpoint to the last cacheable block and **moves it
> forward as conversations grow.** Best for multi-turn conversations where the growing message
> history should be cached automatically.

**One line:** `cache_control: { type: 'ephemeral' }` at the top level of the request body.
This was implemented in `tools/measure-gateway.mjs` and then reverted, so re-enabling it is a
one-line change.

## Why it matters — the measured gap

| provider | cache hit | activation |
|---|---|---|
| DeepSeek V4.1 Flash | **92.7%** | automatic |
| Qwen3.8-Flash | **91.4%** | automatic |
| GLM-5.3-Flash | **89.6%** | automatic |
| gpt-6-luna | 81.1% | automatic |
| Claude Sonnet 5.5 | **27.0%** | partial |
| **Claude Haiku 4.5** | **12.9%** | **none without injection** |

**Four of five providers cache for free. Anthropic requires the client to ask, and DSH does not ask
properly** - our injected static breakpoints get 13-27% where everyone else gets 81-93%.

**Cost impact, measured:** Haiku billed **157.1M tokens at the full $1.00/M** = ~$157. At a 93% hit
rate, the same workload costs roughly **$29**. **A 5.4x penalty from a request field.**

## The experiment

**A/B on identical tasks and harnesses, same model, only the top-level field differs.**

| arm | condition |
|---|---|
| A | as-shipped (static breakpoints only, current behaviour) |
| B | automatic caching enabled (top-level `cache_control`) |

**Design:** 5 tasks x 10 arms x 1 seed = 50 runs per condition, on Haiku (cheapest Anthropic model).
**Cost ~$35-45.** Sonnet would double it for a second tier.

**Prediction:** hit rate rises from ~13% to 80-90%, and cost falls roughly **5x**.

**Two outcomes and both are useful:**

- **It works** -> the paper's headline experiment. Cross-provider cost comparison is decided by a
  request field, and the field's default differs by provider. The field's standard leaderboards
  collapse provider prices into a median and remove exactly this variable.
- **It does not work** -> DSH's request shape defeats automatic caching too, which is a stronger
  statement about harness-provider interaction than about pricing.

## Why not now

**It must not be applied to running matrices.** Half the data would have it and half would not, and
the confound would be invisible in the output - which is the same defect the review flagged as J1
and the same reasoning that kept it out of the matrices when it was first proposed.

**Run it as its own labelled condition, after the current matrices finish.**
