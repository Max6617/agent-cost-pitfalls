# RETENTION-PILOT-SCOPE — external-harness prefix retention on Anthropic (PAPER.md §3.3's open defect)

**Status: NOT EXECUTED. Nothing spent. No Anthropic request made. The current key is locked; this is the
plan to execute when a new key exists.** No existing file is modified by this document.

## 0. What is missing

The four external harnesses reach Anthropic through the OpenAI-compatible path, so the archive has no
cache split for them: 6,772 unknown-cache requests (4,641 Haiku carrying 88.01M input tokens; 2,131
Sonnet carrying 41.31M) — `notes/defects/DEFECT-anthropic-external-costs.md:155`. The published 0.560/0.451 "external
harness" retention was a pooling artefact of `armClass()` (eight arms, four of them DSH at ~0.998) and is
withdrawn — PAPER.md §3.3, ending "No external harness's retention is measured anywhere in this study on
this provider" (PAPER.md:250-251). What is measured: the DSH arms on Anthropic, **0.994–1.000** — haiku
`ptc` 0.9941 / `native` 0.9996, sonnet 0.9998 / 0.9998 (PAPER.md:253–254). Recovering the comparison
needs the four external arms re-collected through a route that reports the split; at their observed
$0.37–$1.21 per cell, 40 cells is ≈$30 (PAPER.md:263; DEFECT:117–118).

## 1. The route

| | (a) OpenRouter-style route | (b) harness-native `/v1/messages` | (c) gateway translation |
|---|---|---|---|
| harness wire unchanged | **yes** (still `/v1/chat/completions`) | no — the harness switches protocol | yes |
| upstream | OpenRouter → Anthropic | api.anthropic.com direct | api.anthropic.com direct |
| split reported | `prompt_tokens_details.cached_tokens` / `cache_write_tokens` | `cache_read_input_tokens` / `cache_creation_input_tokens` | native fields, via the gateway |
| new vendor account | **yes** (OpenRouter; BYOK with the new Anthropic key) | no | no |
| code change | small (3 edits below) | per-harness config audit | **large** (full OpenAI↔Messages + SSE translation) |

**(a) Evidence.** OpenRouter's OpenAI-shaped route returns
`usage.prompt_tokens_details.cached_tokens` and `cache_write_tokens`, and supports Anthropic caching via
a top-level `cache_control` (automatic caching) or per-block breakpoints; Anthropic requires per-message
enablement; sticky routing sessions expire after 10 minutes —
<https://openrouter.ai/docs/features/prompt-caching.md> (fetched 2026-10-10). List prices equal the
study's own cards: haiku prompt $1.00/M, completion $5.00/M, cache read $0.10/M, cache write $1.25/M;
sonnet $2.00/$10.00, $0.20, $2.50 — fetched from
<https://openrouter.ai/api/v1/models/anthropic/claude-haiku-4.5/endpoints> and
`…/claude-sonnet-5.5/endpoints` (2026-10-10), matching `tools/cost-panel.mjs:59-60`. BYOK with the new
Anthropic key costs 5% of list, fee-free under the pay-as-you-go allowance — 
<https://openrouter.ai/docs/features/byok.md>; credit top-ups carry 5.5% ($0.80 min) —
<https://openrouter.ai/docs/faq.md>. **Loss:** a third-party hop. The measured retention is OpenRouter's
rendition of Anthropic caching (its sticky routing, its TTL handling), so the paper must say "through a
route that reports the split", not "direct Anthropic". It also requires an OpenRouter account — a new
vendor, not a second Anthropic account, but a decision for the owner.

**(b) Evidence.** The injection gate already fires on `/messages` (`tools/measure-gateway.mjs:691`) and
the provider already carries `--auto-cache` (`tools/collect-gateway.mjs:84`), so only each harness's
config changes. opencode documents a custom `baseURL` on its Anthropic provider
(<https://opencode.ai/docs/en/providers.md>); cline documents an optional `base-url` on its Anthropic
provider
(<https://docs.cline.bot/enterprise-solutions/configuration/remote-configuration/anthropic/admin-configuration.md#base-url-optional>).
goose and openhands could not be confirmed from primary documentation in this pass (their doc pages are
JavaScript-rendered), so (b) is an audit first. **Loss:** the wire protocol changes, so those harnesses'
pilot treatment differs from the one the matrices measured; and it may not cover all four harnesses.

**(c)** Uses the Anthropic key and no third party, but requires request, tool-schema, response and SSE
translation — the largest change, and it changes the model-visible envelope anyway. **Not for a pilot.**

**Recommendation: (a)** — it preserves each harness's treatment exactly and needs three small gateway
edits: (i) a new provider entry in `tools/collect-gateway.mjs:24-88` (upstream
`https://openrouter.ai/api/v1`, `--upstream-openai`); (ii) an **opt-in** flag so the injection gate also
fires on OpenAI-shaped requests, injecting the top-level `cache_control` (the pattern at
`tools/measure-gateway.mjs:728-731`), with a per-block fallback on the last tool
(`tools/measure-gateway.mjs:716-723`) if the chat-completions route rejects the top-level field; (iii)
extend the OpenAI usage parser (`tools/measure-gateway.mjs:304-313`) to read
`prompt_tokens_details.cache_write_tokens` into `cacheCreationTokens`, because `costOf` prices writes at
1.25x and currently defaults them to 0 (`tools/measure-gateway.mjs:315-330`). The existing gate at :691 is
untouched, so **no already-collected matrix changes**; the new flag and provider are opt-in only.

## 2. Pilot design

- **Model:** haiku. Its DSH retention is 0.9941/0.9996 — the model where a difference could show; sonnet
  is flat 0.9998 (PAPER.md:254).
- **Harnesses:** all four externals: cline, goose, opencode, openhands.
- **Cells:** 4 harnesses × 10 tasks × 1 seed = **40**. Retention is a per-run aggregate over
  continuations, so the cluster that matters is the task; 10 tasks give a 10-cluster bootstrap, and a
  second seed buys less than four more tasks. Tasks: two per stratum from `tasks/`, chosen before the
  first request and listed in the pre-declaration.
- **Matrix:** a new dataset (`results/pilot-retention-<date>/`); never an existing directory.
- **Contrast:** per-harness mean retention, metric unchanged (continuation = ≥50% of the largest prompt
  so far; retention = cacheHit(i) / largest prompt before i, clamped [0,1] —
  `tools/prefix-retention.mjs`), with a task-cluster percentile bootstrap interval via
  `tools/stats.mjs`'s `bootstrapTaskMean` — the same estimator as §3.2's retention interval. Report each
  harness against the DSH field 0.994–1.000 and against each other; report cache-write share and per-cell
  cost, since the split also collapses limitation 7's bracket **for this pilot**.
- **Plumbing:** `tools/prefix-retention.mjs:143` hardcodes the six batch-1 datasets; extend that list
  additively (or add a `--datasets` option). The filed `analysis/prefix-retention.json` must not change.

## 3. The smoke (before any 40-cell run)

**2–4 cells:** one task × {cline, opencode} × 1 seed, then goose/openhands only if the first two pass.
**Check the gateway log for those runs:** `usage.cacheHitTokens` non-null on every record, and at least
one record with `cacheCreationTokens > 0` (the first request of a run writes the cache). **Abort if:**
any record has a null split; no write tokens anywhere; an implied per-cell cost above **$1.50** (40 cells
would exceed $60); an error storm; or a single `dsh:native` control cell through the same route shows
retention far from ~1.0, which would mean the route changed the treatment. Smoke ceiling: 5 cells ×
$1.21 = **$6.05**.

## 4. Cost

- Measured external-arm rate: **$0.37–$1.21 per cell** (PAPER.md:263; DEFECT:117–118).
- 40 cells: **$14.80–$48.40**, study estimate **≈$30**. Route (a) adds ≤5.5% ($0.80 min) on a top-up, or
  $0 via BYOK; list prices are the study's cards (above).
- Smoke **≤$6.05**; two DSH control cells ≈$0.50.
- **Hard ceiling: `--max-cost 40`** (`tools/collect.mjs:349`), with an added abort if the smoke implies
  more than $1.00/cell. Flag: the authorised ≈$30 is the midpoint; the upper bound is $48.40 plus smoke,
  so the ceiling binds.

## 5. Pre-declaration (file before the first request)

> **Pilot: external-harness prefix retention on Anthropic, through a route that reports the cache split.**
> Model Claude Haiku 4.5; harnesses cline, goose, opencode, openhands; the pre-listed 10 tasks × 1 seed =
> 40 cells. **Measured:** per-harness mean prefix retention, metric exactly as
> `tools/prefix-retention.mjs` defines it, with a task-cluster bootstrap interval. **Rule:** the pilot is
> descriptive against the filed DSH field (0.994–1.000); no hypothesis test is run and no threshold is
> invented after seeing the data. **What would change the paper's reading:** a harness whose interval
> lies wholly below the DSH field would establish that its retention does not track the DSH arms', which
> is the comparison §3.3 currently cannot make; overlapping intervals leave the DSH-only statement as it
> stands. **If the split does not appear** — null cache fields on any analysed record or no write tokens
> anywhere — the pilot is reported as **failed**, with the route, the smoke evidence and the cost, and
> §3.3's open defect remains open. Cost cap $40; smoke before the matrix; no re-run without a new
> declaration.

## 6. Risks

- **New key, new account-level cache semantics.** A different org or key may have different minimum
  cacheable prefix, TTL or rate limits, and the DSH comparison comes from the old account. Mitigation:
  the DSH control cell in the smoke; if DSH retention is not ~1.0, stop and re-scope.
- **OpenRouter sticky routing** (10-minute sessions) can hold or lose a cache across a run; our gateway
  log cannot show which upstream served a request, so this is disclosed, not measurable here.
- **Write-token parsing** currently drops `cache_write_tokens`; fix before quoting any pilot cost.
- **Analysis plumbing** (`prefix-retention.mjs:143`) must be extended additively.
- **Rate limits** on a fresh key may force backoff; the collector already resumes.

## 7. Go/no-go checklist

1. New Anthropic key in place; if route (a), OpenRouter account + BYOK key configured (owner decision).
2. Implement the three gateway edits test-first; run the full suite and confirm no existing analysis
   output changes.
3. Extend the retention tool's dataset list additively; confirm the filed JSON is untouched.
4. Write §5's pre-declaration, with the 10 task ids, into the repo.
5. Run the smoke (≤5 cells, ≤$6.05); verify a non-null split and write tokens; apply the abort criteria.
6. If it passes, run the 40 cells with `--max-cost 40`; if it fails, stop and report the failure.
7. Analyse with `bootstrapTaskMean`; report per-harness retention, cache-write share, per-cell cost.
8. Update PAPER.md §3.3 / limitation 7 **only** from the pilot's own filed output.
