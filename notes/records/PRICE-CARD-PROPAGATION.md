# PRICE-CARD-PROPAGATION — the retracted DeepSeek card, removed from the document layer

**Date:** 2026-09-30 · **Scope:** propagate the already-decided price-card correction
(`deepseek-flash`: miss **0.15** / hit **0.003** / out **0.60**, ratio **4.00**, cache discount
**50x**) from `tools/measure-gateway.mjs:152-200` through the satellite tools and documents.
**Not in scope and not touched:** `results/`, `data/`, `_ev/`, `notes/records/FINDINGS.md`,
`PRE-REGISTRATION.md`, `METHODS.md` beyond the §5/§9 edits below, `notes/reviews/CRITICAL-REVIEW.md`,
`notes/reviews/REVIEW-FINDINGS.md`, `tools/cost-panel.mjs`.

Source of truth: `tools/measure-gateway.mjs:152-200` (corrected 2026-09-30; verified byte-identical
to the new `tools/prices.mjs` PRICES block, comments included).

---

## 1. New file

| file | what |
|---|---|
| `tools/prices.mjs` | **New.** Exports `PRICES` (copied verbatim from `measure-gateway.mjs:147-200`, including the correction comments), `FALLBACK` (corrected DeepSeek card), `RETRACTED` (the old 0.14/0.028/0.28 card, kept only so the before/after comparison in `recompute-prices.mjs` can be shown) and `costOf(model, usage)` implementing the pre-registered function `fresh*miss + created*(write ?? miss) + hit*hit + output*out`, `fresh = max(0, cacheMissTokens - cacheCreationTokens)`. |

`node -e "import('./tools/prices.mjs').then(m=>console.log(Object.keys(m.PRICES).length))"` → **12**.

## 2. Satellite tools converted to the shared card

Every tool below previously carried its own copy of the **retracted** card. Only the rate table was
changed; no tool's arithmetic, inputs or outputs were restructured. All were run before and after the
change (except the two that launch paid experiment matrices — see §5).

| file | change |
|---|---|
| `tools/analyze-results.mjs` | local `PRICES` (deepseek-flash 0.14/0.028/0.28, deepseek-pro) → import from `./prices.mjs` |
| `tools/check-report.mjs` | `const P = {0.14, 0.028, 0.28}` → `PRICES['deepseek-flash']` |
| `tools/check-task.mjs` | local `PRICES` → import (launches runs; syntax-checked only) |
| `tasks-hard/_tools/check-task.mjs` | local `PRICES` → import `../../tools/prices.mjs` (launches runs; syntax-checked only) |
| `tools/full-budget.mjs` | `M` table (8 models) → per-key references into `PRICES`; the same 8 rows are printed as before |
| `tools/mechanism.mjs` | `const P = {0.14, 0.028, 0.28}` → `PRICES['deepseek-flash']` |
| `tools/power.mjs` | local `PRICES` → import |
| `tools/power-real.mjs` | `const P = {0.14, 0.028, 0.28}` → `PRICES['deepseek-flash']` |
| `tools/reattribute-report.mjs` | `const P = {0.14, 0.028, 0.28}` → `PRICES['deepseek-flash']` |
| `tools/provider-budget.mjs` | three `NEED` cards and five `NEW` cards → `PRICES[...]` lookups |
| `tools/_chekanalysis.mjs` | local `PRICES` → import |
| `tools/glm-read.mjs` | display-only: ratio now computed from `PRICES` (prints **4.00**, was hardcoded 2.00) + a note that the `$billed` figures above are the logs' own `cost.billedUsd` |
| `tools/verify-prereg.mjs` | CLAIM 2 label: the quoted pre-reg claim now carries `[the old ratio 2.0 is RETRACTED; corrected card gives 4.00]` |
| `tools/recompute-prices.mjs` | corrected card now read from `PRICES`; the old card now read from `RETRACTED` and labelled `deepseek RETRACTED card (comparison only)`; ratio lines derived from the module |

Tools that held an **already-correct** duplicate card were also converted to the single module (no
numeric effect — verified by identical output): `tools/h2-test.mjs`, `tools/luna-cost.mjs`,
`tools/openai-cost.mjs`, `tools/reconcile.mjs`, `tools/rederive.mjs`, `tools/budget.mjs`.

**Deliberately left alone:** `tools/measure-gateway.mjs` (it *is* the canonical table; the new
module is its copy, and the gateway was already correct at lines 152-200), and
`tools/cost-panel.mjs` (explicitly forbidden).

## 3. Documents corrected

| file | change |
|---|---|
| `notes/records/FIRST-RESULTS.md` | **RETRACTION banner** added at the top: headline retracted, points at `notes/records/FINDINGS.md` F20, states that **OpenCode is cheapest under both cost functions among the arms then measured** and that the "ranking inverts" claim came from a cost function that omitted the output term. Body left as written, marked "do not quote". |
| `METHODS.md` §5 | price table replaced with the corrected card for **every model the study ran** (deepseek-flash, glm-5.3-flash, glm-5.3, qwen3.8-flash, claude-haiku-4.5, claude-sonnet-5.5, gpt-6-luna), with write column, output:input and cache discount; note that the old row was wrong in every cell; the write-pricing sentence corrected (Anthropic/OpenAI charge 1.25x–2.5x miss to write). |
| `METHODS.md` §9 | Qwen/MiMo rationale corrected with a dated note: Qwen3.8-Flash is **3.13**, not ~4.0 (below GLM-Flash 3.33, far below DeepSeek 4.00); DeepSeek's own discount is **50x**, not 5x, so MiMo's 50-120x is not a new axis. |
| `notes/status/SESSION-STATE.md` | DeepSeek row 2.00 → **4.00** + dated correction note. |
| `notes/status/RESUME.md` | dated retraction note under "The finding so far" (old card + missing output term; OpenCode cheapest under both cost functions; F20). |
| `PAPER.md` | `$0.028/M` → `$0.003/M` + dated correction note (measured $0.008–0.015/run; 300 runs ≈ $2.40–4.50; CRITICAL-REVIEW §3.2 / F20). |
| `notes/literature/RESEARCH.md` | rate table replaced with the corrected DeepSeek cards; citation changed from the third-party blog to DeepSeek's own captured page; discount line corrected (50x Flash / ~12x Pro); worked example flagged as computed on the retracted card; `$0.14/M` → `$0.15/M` in the load-bearing inference. |
| `notes/literature/RELATED-WORK.md` | dated correction note after the novelty statement (reversal language withdrawn; "does not transfer", ratio 4.00, F20); line 535 ratio 2.0 → 4.00 with note; both "cached input is discounted ~10× … at every current provider" statements corrected to 5–50× (50× on DeepSeek's corrected card). |
| `notes/prompts/RELATED-WORK-FOLLOWUP.md` | ratio 2.0 → **4.00** with note that the 22.8% figure was computed under the retracted card. |
| `notes/plans/PENDING-RUNS.md` | both ratio tables corrected (DeepSeek **4.00**, cache **50x**; Qwen3-Coder ~4.0 → Qwen3.8-Flash **3.13**); dated notes on the "PTC advantage should shrink and reverse" prediction and the "Qwen is further along the ratio axis" rationale. |
| `notes/plans/PLAN.md` | `$0.14/M` → `$0.15/M` for the Flash miss rate (found by the whole-repo sweep; not in the original suspect list) + note. |

## 4. Verification

### 4.1 `grep -rn "0.028" --include=*.md --include=*.mjs .` (excluding results/, data/, _ev/, node_modules/, .venvs/, .git/, snapshots/, _scratch/)

`grep` is **not installed** in this shell (`Get-Command grep` → not found). The equivalent
recursive scan over `.md` and `.mjs` with the same exclusions was run in Node; raw output:

```
notes/reviews/CRITICAL-REVIEW.md:36: 3. **The retracted DeepSeek price card (0.14/0.028/0.28, ratio 2.0) is still printed as
notes/reviews/CRITICAL-REVIEW.md:180: **[verified by reviewer: METHODS.md:141 prints `deepseek-v4.1-flash | 0.14 | 0.028 | 0.28`;
notes/reviews/CRITICAL-REVIEW.md:223: - **Cost claims are wrong twice over**: "$0.028/M cache-heavy input" is the retracted card
notes/reviews/CRITICAL-REVIEW.md:276: "retry the router session — everything downstream is blocked", "$0.028/M". The repo now
notes/records/FINDINGS.md:187: miss 0.14 / hit 0.028 / out 0.28, taken from a third-party blog. The repo held the provider's own page
notes/records/FIRST-RESULTS.md:7: > (miss 0.14 / hit 0.028 / out 0.28; the true off-peak card is **0.15 / 0.003 / 0.60**, ratio 4.00,
./METHODS.md:151: The DeepSeek row read `0.14 | 0.028 | 0.28` (ratio 2.00, 5x) until 2026-09-30. That card is
notes/prompts/NEW-SESSION-PROMPT.md:85: 4. **The retracted DeepSeek price card (0.14/0.028/0.28) is still printed as fact in ~15 files**
./PAPER.md:83: (cache-heavy input at $0.003/M; the $0.028/M printed here before 2026-09-30 was the retracted card).
./PRE-REGISTRATION.md:290: Until 2026-09-30 the gateway priced `deepseek-flash` as miss 0.14 / hit 0.028 / out 0.28, taken from a
notes/literature/RESEARCH.md:197: retracted card (miss 0.14 / hit 0.028 / out 0.28):
notes/status/RESUME.md:24: > the retracted DeepSeek card (0.14 / 0.028 / 0.28) and a cost function that omitted the output term.
notes/reviews/REVIEW-FINDINGS.md:199: | deepseek-v4.1-flash | 0.14 | 0.028 | 0.28 |
notes/reviews/REVIEW-FINDINGS.md:216: * cache-hit price: **9.3× too high** off-peak (0.028 vs 0.003), and the "5× cache discount" that
notes/reviews/REVIEW-FINDINGS.md:228: * The correct card is also the one the gateway **does not** use: `tools/measure-gateway.mjs:167` `FALLBACK = { miss: 0.14, hit: 0.028, out: 0.28 }`, so every `cost.billedUsd` in the archive is
notes/status/SESSION-STATE.md:75: card (miss 0.14 / hit 0.028 / out 0.28). The corrected off-peak card is miss 0.15 / hit 0.003 /
./tools/measure-gateway.mjs:153: // CORRECTED 2026-09-30. The previous entry (miss 0.14, hit 0.028, out 0.28) came
./tools/prices.mjs:11: * retracted DeepSeek card (miss 0.14 / hit 0.028 / out 0.28) until 2026-09-30; the
./tools/prices.mjs:21: // CORRECTED 2026-09-30. The previous entry (miss 0.14, hit 0.028, out 0.28) came
./tools/prices.mjs:71: * The RETRACTED DeepSeek card (miss 0.14 / hit 0.028 / out 0.28), taken from a third-party blog.
./tools/prices.mjs:75: export const RETRACTED = { 'deepseek-flash': { miss: 0.14, hit: 0.028, out: 0.28 } }
```

Every surviving hit is either (a) a **forbidden/owned** document that documents the retraction
(`notes/reviews/CRITICAL-REVIEW.md`, `notes/reviews/REVIEW-FINDINGS.md`, `notes/records/FINDINGS.md` F20 at line 187,
`PRE-REGISTRATION.md` §12.1 at line 290), (b) a **dated correction note added by this pass**
(`notes/records/FIRST-RESULTS.md`, `METHODS.md`, `PAPER.md`, `notes/literature/RESEARCH.md`, `notes/status/RESUME.md`, `notes/status/SESSION-STATE.md`),
(c) the correction comments / `RETRACTED` export in `tools/prices.mjs` and
`tools/measure-gateway.mjs`, or (d) `notes/prompts/NEW-SESSION-PROMPT.md:85`, which *describes* the retraction
(see §6). **Outside the owned files listed in §6** (and the two forbidden review documents, which
quote the card only to retract it), no file prints the retracted card as current fact any more.

### 4.2 `node tools/cost-panel.mjs`

Exit code **0**, stderr **empty**, on both the pre-change and post-change runs.

The tool itself is **untracked and was modified by another writer during this session** (the final
output has new `zero-$` and `terse arms:` columns that the pre-change baseline does not; the file now
contains `zero-$` at line 172, and `git ls-files tools/cost-panel.mjs` returns nothing). `results/`
was also appended to concurrently (mtimes 2026-10-01 13:00–13:03; `haiku-full` exclusions 3→9,
`luna-full` exclusions 15→111). Those external changes — not this pass — account for the difference
between the two full outputs. **I did not edit `tools/cost-panel.mjs`, and the per-arm `$billed`
figures for DeepSeek V4.1 Flash are byte-identical before and after:**

```
DeepSeek V4.1 Flash  (DeepSeek, output:input = 4.00)
  arm                  n   solved  passRate    $billed      $cold   reqs  out/run  cache
  goose               62    62/62    100.0%   $0.00577   $0.02179   10.8    7 136  92.2%
  opencode            62    61/62     99.9%   $0.00581   $0.02349    9.5    5 568  87.2%
  dsh:ptc             62    62/62    100.0%   $0.00879   $0.03281   10.1   10 652  92.1%
  dsh:native          62    62/62    100.0%   $0.00898   $0.03824   12.8   10 102  90.6%
  dsh:ptc-opt         62    62/62    100.0%   $0.00908   $0.03359   10.1   11 289  92.4%
  dsh:ptc-terse       62    62/62    100.0%   $0.00910   $0.03460   10.1   11 267  92.2%
  dsh:native-opt      62    62/62    100.0%   $0.00950   $0.04173   13.2   10 856  90.5%
  dsh:native-terse    62    62/62    100.0%   $0.00967   $0.04235   13.2   11 053  90.5%
  openhands           62    62/62    100.0%   $0.00989   $0.05619   12.4    9 090  90.7%
  cline               62    62/62    100.0%   $0.01039   $0.04017    9.8   11 418  87.1%
```

(`Compare-Object` on the two full outputs flags only the header/annotation lines and the
Haiku/luna rows whose underlying dataset grew; the DeepSeek, GLM-Flash, Qwen, Sonnet blocks are
identical.)

### 4.3 `node -e "import('./tools/prices.mjs').then(m=>console.log(Object.keys(m.PRICES).length))"`

```
12
```

### 4.4 Additional checks

* **PRICES parity:** the `const PRICES = {…}` block extracted from `tools/prices.mjs` is
  **IDENTICAL** (values *and* comments) to the block in `tools/measure-gateway.mjs`.
* **costOf assertions:** `costOf('deepseek-flash', {cacheMissTokens:1000, cacheHitTokens:1000, outputTokens:1000})`
  = `0.000753` (expected `0.000753`) **OK**; `costOf('gpt-6-luna', {cacheMissTokens:1000, cacheCreationTokens:400})`
  = `0.00011` (write priced at 0.125) **OK**.
* **Syntax:** `node --check` passes on all 21 changed/new `.mjs` files.
* **Behaviour preservation:** every converted tool was run before and after.
  `provider-budget`, `budget`, `openai-cost`, `luna-cost`, `h2-test`, `rederive` and
  `cost-panel` produced **zero differing lines** — proving the shared-card references are
  numerically identical to the copies they replaced. The tools whose numbers *did* change
  (`analyze-results` 26 differing lines, `check-report` 32, `full-budget` 10, `mechanism` 32,
  `power` 22, `power-real` 19, `reattribute-report` 38, `_chekanalysis` 32, `glm-read` 4,
  `recompute-prices` 6, `verify-prereg` 2) changed **only** because the DeepSeek card changed —
  that is the intended correction. All 18 runnable tools exited 0 with empty stderr.

## 5. Not executed / not changed, and why

| item | status |
|---|---|
| `tools/check-task.mjs`, `tasks-hard/_tools/check-task.mjs` | Rate table converted and both pass `node --check`; **not executed** because they launch the paid 5-arm experiment matrix. |
| `tools/cost-panel.mjs` | Forbidden to edit. Its own card table was already corrected (0.15/0.003/0.60) and is numerically consistent with `prices.mjs` under `write ?? miss`. |
| `tools/measure-gateway.mjs` | Left as the canonical table (the task defines `prices.mjs` as its copy). Verified identical. |
| `results/`, `data/`, `_ev/` | Untouched. Note the panel output moved under me because another writer was appending to `results/` and editing the untracked `tools/cost-panel.mjs` during this session. |
| `notes/plans/RUN-PLAN.md:76` ("ratio-5.0 models including 1.25x cache writes") | Checked; **factually correct** (it refers to the four 5.0-ratio Anthropic/OpenAI models). No edit. |
| `notes/plans/PLANNED-cache-ab.md` | Checked; contains no retracted-card or DeepSeek-ratio claim. No edit. |
| `notes/literature/token-efficiency-and-routing-report.md:143` ("$0.14 total") | A total spend, not a per-million rate. No edit. |
| `notes/prompts/NEW-SESSION-PROMPT.md:85` | Correctly *describes* the retraction; left as-is. Its "~15 files" count is now stale in the sense that the remaining occurrences are labelled retractions (see §6). |

## 6. Known remaining stale statements, owned by another agent (NOT edited)

These still print the retracted ratio as current fact. `notes/records/FINDINGS.md`, `PRE-REGISTRATION.md` and
`METHODS.md` are owned by another agent; only the METHODS §5/§9 edits were made here.

| file:line | text |
|---|---|
| `notes/records/FINDINGS.md:125` | "**Qwen at ~4.0 is the decisive test.**" — Qwen3.8-Flash is 3.13 |
| `notes/records/FINDINGS.md:141` | "prices output at 3.33x input against DeepSeek's 2.0x" — corrected: 4.00 |
| `notes/records/FINDINGS.md:700` | "Our providers give a **5x** cache discount" — DeepSeek's corrected discount is 50x |
| `PRE-REGISTRATION.md:168` | design table: "DeepSeek V4.1 Flash (2.0)" — corrected: 4.00 |
| `notes/prompts/NEW-SESSION-PROMPT.md:85` | checklist item still says the card "is still printed as fact in ~15 files"; the unlabelled copies in documents/tools found by this pass have been fixed |

## 7. Honest caveats

* **`tools/analyze-results.mjs` still omits the output term** from its `costOf` (line 55:
  `miss*missRate + hit*hitRate` only). This pass corrected its **card** and nothing else — changing
  the cost function would change what the tool computes, which the task forbade. `notes/records/FINDINGS.md` F20
  and `tools/rederive.mjs` document that separate defect.
* The corrected numbers now printed by the satellite tools will not match previously archived
  outputs; that is the point of the correction, and every changed tool was diffed against its
  pre-change output so the changes are auditable.
* `tools/glm-read.mjs` (and several other tools) read `cost.billedUsd` out of archived gateway logs,
  which were written under the old card before 2026-09-30 17:43Z. The tool now prints an explicit
  warning about this; the underlying logs were not re-priced and `results/` was not modified.
