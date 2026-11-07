# z.ai GLM price card — captured 2026-10-02

**Provenance:** supplied directly by the study's author from the z.ai pricing page on 2026-10-02.
This is the capture CRITICAL-REVIEW §3.1 and REVIEW-2 §NOTE both flagged as missing: the GLM cards
decide H2 and two of F31's stars, and until now no primary evidence for them existed in the repo.

| model | Input (miss) | Cached Input (hit) | Cached Input Storage | Output |
|---|---|---|---|---|
| GLM-5.3-Flash | $0.15 | $0.03 | Limited-time Free | $0.50 |
| GLM-5.3-FlashX | $0.37 | $0.075 | Limited-time Free | $1.25 |
| GLM-5.3 | $1.40 | $0.26 | Limited-time Free | $4.40 |

**The study uses GLM-5.3-Flash and GLM-5.3 only.** GLM-5.3-FlashX is not used and is recorded here
only because it appears on the same page.

## What this confirms

- `glm-5.3-flash`: miss 0.15 / hit 0.03 / out 0.50 → **ratio 3.33**, cache discount **5x**.
- `glm-5.3`: miss 1.40 / hit 0.26 / out 4.40 → **ratio 3.14**, cache discount **5.4x**.

Both match `tools/prices.mjs` and `tools/measure-gateway.mjs` exactly. The two model cards that
F31's "the ratio does not predict it" conclusion rests on are therefore no longer UNCITED.

## What it changes

**"Cached Input Storage: Limited-time Free" — cache WRITES are not billed.**

`tools/prices.mjs` gives GLM no `write` field, and every consumer falls back to `write ?? miss`, so a
cache-creation token was priced at $0.15/M on Flash and $1.40/M on 5.3. Per the provider's own card
that rate is **zero**.

Impact is bounded by whether GLM ever reports cache-creation tokens at all — DeepSeek and z.ai cache
automatically and the gateway's usage parser only populates `cacheCreationTokens` from an explicit
Anthropic-style field. `node tools/artefact-checks.mjs` and the panel's per-arm `created` column show
whether any GLM run has ever produced one. **If none has, the defect is latent; if any has, every GLM
figure is slightly overstated and this note is the reason.**

**MEASURED:** no automatic-cache provider in this study has ever reported a cache-creation token - 0 across all z.ai, DeepSeek, Qwen and OpenAI gateway logs (14,910 + 15,588 + 10,292 + 8,115 requests). The write ?? miss fallback therefore never fired and no published figure changes. Recorded because it would have, silently, the moment a provider started reporting writes.
