# DEFECT — the tasks-b smoke under-prices an Anthropic matrix, and the bias is provider-specific

**Recorded before any further Anthropic ceiling is derived. A two-arm smoke is not a price for a
ten-arm matrix, and on Anthropic it is wrong in both directions at once.**

`notes/handovers/HANDOVER-2026-10-09.md` section 4.4 asks for this to be on the record. The numbers below are
computed from the six-provider tasks-b panel and from the smoke runs' own records; every figure
quoted in the handover reproduced.

## 1. The gap

| | cells | $/cell | 800-cell projection |
|---|---|---|---|
| haiku smoke (`results/smoke-batchb-haiku-full`, 2 DSH arms) | 160 | **0.2403** | $192 |
| haiku matrix (`results/batchb-haiku-full`, 10 arms) | 353 analysed | **0.4082** | $327 |
| sonnet smoke (`results/smoke-batchb-sonnet-full`, 2 DSH arms) | 160 | **0.1398** | $112 |
| sonnet matrix (`results/batchb-sonnet-full`, 10 arms) | 800 | **0.3303** | $264 |

The matrix rate is **70% above** the smoke's for haiku and **136% above** it for sonnet. (The
handover states the haiku gap as "under-prices by 69%", which is the same ratio read the other way:
the smoke price is 59% of the matrix price.) Sonnet's matrix total, $264.25, and haiku's smoke rate,
$0.2403, both reproduce exactly.

On haiku the handover's `$0.4051/cell` and this document's `$0.4082` are the same money counted
differently: the handover divides $144.21 (priced by `tools/prices.mjs`) by 356 analysed rows, while
the canonical panel re-prices the same runs to $144.10 over 353 carried cells. A 0.08% pricing-path
difference and a different denominator — not a disagreement about the spend.

## 2. Component one: the smoke contains only the cheap arms

The smoke runs two arms, `dsh:native` and `dsh:ptc`. On Anthropic the other eight arms are dearer,
and openhands is dearer by an order of magnitude:

| arm | haiku $/cell | sonnet $/cell |
|---|---|---|
| openhands | **1.1658** | **1.2137** |
| cline | 0.6668 | 0.4777 |
| goose | 0.5042 | 0.3698 |
| opencode | 0.3787 | 0.5026 |
| dsh:ptc | 0.3028 | 0.1356 |
| dsh:native | 0.2851 | 0.1363 |
| dsh:native-terse | 0.1377 | 0.0938 |
| dsh:ptc-terse | 0.0989 | 0.1023 |

Priced at the *matrix's own* cost for those two arms, haiku's smoke arms average $0.2940/cell
against a matrix average of $0.4082 (ratio 0.72) and sonnet's average $0.1360 against $0.3303
(ratio 0.41). So arm composition alone accounts for a 28% under-price on haiku and a 59% one on
sonnet.

## 3. Component two: on haiku, the same two arms cost more inside the matrix — unexplained

haiku's two DSH arms cost **$0.2403/cell in the standalone smoke** and **$0.2940/cell inside the
full matrix** — 22% more for the same two arms on the same model. Sonnet shows no such effect
($0.1398 in the smoke, $0.1360 in the matrix). This residual is recorded as observed, not explained:
candidates are the position confound the study already documented
(`notes/defects/DEFECT-position-confound-2026-10-04.md`), machine load from running ten arms instead of two
(see the memory constraint in `notes/handovers/HANDOVER-2026-10-09.md` section 3), and the fact that haiku's
matrix is a truncated 353-cell subset of its 800 — the account limit stopped collection partway, so
the surviving cells are not a random subset of the planned ones. Nobody has separated these, and this
document does not.

## 4. The bias is provider-specific and changes sign — do not generalise it

A two-arm DSH smoke against the same model's ten-arm matrix, all six tasks-b providers:

| provider | matrix $/cell | DSH-arms $/cell | smoke ÷ matrix | dearest arm |
|---|---|---|---|---|
| DeepSeek V4.1 Flash | 0.0183 | 0.0230 | **1.253** | dsh:native |
| GLM-5.3-Flash | 0.0205 | 0.0238 | **1.164** | openhands |
| Qwen3.8-Flash | 0.0666 | 0.0458 | 0.688 | goose |
| gpt-6-luna | 0.0112 | 0.0125 | **1.115** | openhands |
| Claude Haiku 4.5 | 0.4082 | 0.2940 | 0.720 | openhands |
| Claude Sonnet 5.5 | 0.3303 | 0.1360 | **0.412** | openhands |

On DeepSeek, GLM and luna a two-arm DSH smoke **over**-prices the matrix, because the DSH arms are
the dearest ones there. On Qwen, haiku and sonnet it under-prices, and on Anthropic it under-prices
badly. "A smoke under-prices the matrix" is therefore not a rule — the sign depends on which arm is
dearest for that provider, which is exactly the harness-by-provider interaction the study exists to
measure. Using a smoke as a price is assuming the answer.

## 5. The rule this replaces

- **Never derive an Anthropic ceiling from a two-arm smoke.** For a ten-arm Anthropic matrix, take the
  smoke rate and multiply by at least 1.7 (haiku) — or better, price the arm list directly. On sonnet
  the factor is 2.4.
- **Never apply an Anthropic factor to another provider.** On DeepSeek the same 2-arm smoke is 25%
  *above* the matrix rate; applying 1.7 there would over-budget by 2×.
- **The cheap DSH arms are not a lower bound on a matrix.** They are the cheapest arms on five of six
  providers and the dearest on one.

## 6. Reproducing

```
node results/_scratch/haiku-smoke-verify.cjs      # smoke rates and the 800-cell projection
node results/_scratch/sonnet-smoke-verify.cjs
node results/_scratch/smoke-bias-all.mjs          # the six-provider table
node results/_scratch/bias-numbers.mjs            # per-arm $/cell from the canonical panel
```
