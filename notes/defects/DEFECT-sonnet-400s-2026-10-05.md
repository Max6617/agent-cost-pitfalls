# DEFECT — Sonnet 5.5 rejects 2 requests per run, on every affected arm, deterministically

**Found 2026-10-05 while running the tasks-b smoke.** No data was modified. The condition is
**inherited unchanged** into tasks-b, deliberately: see §4.

## 1. What happens

Under the study's Sonnet condition (the flag table in `tools/collect-gateway.mjs`:
`--max-tokens-ceiling 32768 --native-messages --auto-cache --workspace-id ...`), Anthropic returns
**HTTP 400** for a fixed pair of requests in every DSH run. The provider's own message:

    To turn thinking off on this model, send "thinking": {"type": "between_tools"}
    instead of {"type": "disabled"}. The model does not think before responding.

DSH sends `{"type": "disabled"}`; Sonnet 5.5 rejects it. Other 400s in the same population are
`anthropic-version: header is required` and one `tool_calls` ordering error.

## 2. Measured, on the shipped batch-1 Sonnet matrix (`results/sonnet-full`)

| | |
|---|---|
| requests | 5,675 (gateway `cmussrbtr-anthropic-sonnet-gateway.jsonl`) |
| 200 | 4,777 |
| **400** | **898 — 15.8%** |
| runs affected | **435 of 620** |
| error mix | 449 other/opaque · 384 the `thinking` field · 64 `anthropic-version` · 1 `tool_calls` |

**The distribution is the finding.** Every affected run carries **exactly two** rejections:

| arm | runs with 2 rejections |
|---|---|
| `dsh:native`, `dsh:native-opt`, `dsh:native-terse` | **62 / 62 each** |
| `dsh:ptc`, `dsh:ptc-opt`, `dsh:ptc-terse` | **62 / 62 each** |
| goose | **62 / 62** |
| openhands | 1 / 62 |
| cline, opencode | 0 / 62 |

That is 870 of the 898; the remaining 28 are preflight requests that belong to no run. **A constant
that is identical on every arm cancels in every difference between arms.**

## 3. What it does and does not affect

- **Not affected — the contrasts.** H3 (`native − PTC` requests), A2 (`PTC − native` cost) and F45's
  position-adjusted differentials are differences, and both sides carry the same two rejections per
  run. The published Sonnet *conclusions* are therefore robust to this defect.
- **Affected — the levels.** Every affected arm's request count is inflated by exactly 2 per run, and
  wall-clock is inflated by the retries. Rejected requests are billed nothing, so the cost *level*
  effect is not the price of the 400s themselves but of the retry that replaces them.
- **Also disclosed:** the failure counts differ between `dsh:ptc` (124, 24.7% of its requests) and
  `dsh:native` (124, 21.3%) **only because PTC makes fewer requests in total** — the rejection *count*
  is identical. Quoting the rates side by side without that sentence would overstate the problem.

## 4. Why the condition is NOT changed (decision, 2026-10-05)

1. **A per-run constant cannot bias an arm contrast**, which is what every Sonnet claim in the study
   is. Changing the condition for tasks-b alone would *create* the like-for-like problem it was meant
   to remove.
2. **Re-collecting batch-1 Sonnet** (~$110–135 for 620 cells) would make
   `analysis/panel-analysis-6model-2026-10-03.json` and `analysis/hypotheses-6model-2026-10-03.json`
   stop regenerating identically from the shipped data — a property verified the same week — and would
   move every Sonnet-derived figure for a defect that cannot move a conclusion.
3. **Cheap alternative, if wanted later:** a **62-cell A/B** (~$22) with and without a
   `thinking.type` rewrite, to measure what the rejections cost in requests, wall-clock and billed
   dollars. Pre-declared before it runs, in a separate outdir, not part of any replication analysis.

## 5. The same condition today, and one consequence already seen

| matrix | requests | 400 | share |
|---|---|---|---|
| shipped `sonnet-full` (2026-10-03) | 5,675 | 898 | 15.8% |
| tasks-b Sonnet smoke (2026-10-05, 33 cells) | 498 | 84 | 17% |
| shipped `haiku-full` (2026-10-03) | 13,996 | 128 | **0.9%** (all goose) |
| tasks-b Haiku smoke (2026-10-05) | 980 | 2 | 0.2% (goose) |

**The defect is Sonnet-specific; Haiku's condition is clean.** On the smoke it was followed by
5 m 14 s of gateway silence (last completion 15:12:38Z, killed 15:17:52Z), which the gateway-silence
watchdog correctly reported — the retry path is the plausible cost of the rejections, and the
watchdog's 5-minute threshold is now known to be tight for a provider whose cells run 200–670 s.

**Recorded, not repaired.** The 400 class was already known well enough to appear as a phrasing in
`tools/exclusions.mjs` (FINDINGS §F43), but its scale in a published matrix was not.
