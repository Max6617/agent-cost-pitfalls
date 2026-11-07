# RESUME — state of the project

> **SUPERSEDED 2026-10-10 — this file describes day one (2026-10-01).** Read it as the record of what
> was true then, not as the state of the project. The study has since run six models across five
> providers on two suites, filed and amended a pre-registration, shipped a 99-file artifact and written
> a 31-page paper. Current state, standing invariants and what is open: `notes/handovers/HANDOVER-2026-10-10-B.md`,
> with `PAPER.md`, `notes/plans/PAPER-ROADMAP.md` and `ARTIFACT.md` beside it. (The corpus, router and gateway
> rows below are still the right description of those pieces; the experiment rows are not.)

For a fresh session picking this up. Read `README.md` first for the map, then this.

## Where things stand

| piece | state |
|---|---|
| Corpus study (C1–C3) | done — 357 sessions, numbers corrected |
| 5 DSH presets | installed and validated (web profile) |
| Decision layer (router) | built, 26/26 tests pass, **never run live** |
| Measurement gateway | built, 15/15 self-test, **validated end-to-end** |
| Cross-harness (C6) | **VALIDATED** — OpenCode runs headless through the gateway |
| Experiment runner | parallel, multi-model, 25 runs in 1.6 min at 6-way |
| Milestone 1 + 2 datasets | `data/milestone-1/`, `data/milestone-2/` |
| Task suite | **1 of ~30.** The only blocker. `notes/prompts/TASK-PROMPT.md` delegates it |
| Second provider | not needed yet; see below |

## The finding so far

**The cost ranking inverts depending on whether the prompt cache is counted.**

> **Correction 2026-09-30 — this finding is retracted.** The billed figures below were computed with
> the retracted DeepSeek card (0.14 / 0.028 / 0.28) and a cost function that omitted the output term.
> The corrected card is miss 0.15 / hit 0.003 / out 0.60 (ratio 4.00, cache discount 50x). Under the
> pre-registered cost function OpenCode is cheapest under both cost functions on this matrix, and the
> "ranking inverts" reading is withdrawn. See `notes/records/FINDINGS.md` F20.

| arm | cost_cold | cost_billed | cache hit |
|---|---|---|---|
| dsh:ptc | $0.0087 | **$0.0020** | **95.6%** |
| dsh:native | $0.0085 | $0.0027 | 86.0% |
| opencode | **$0.0071** | $0.0022 | 85.2% |

PTC uses more input tokens and has a higher cold cost, yet is cheaper billed — the whole difference is
an **~11-point cache gap**, stable across two independent matrices and two seed counts.

## Read these, in order

1. `README.md` — the map
2. `notes/plans/JOURNAL-PLAN.md` — the design, the attacks to expect, the statistics, the mechanism test
3. `notes/records/FIRST-RESULTS.md` — what milestone 1 showed and everything it does NOT show
4. `notes/records/TASKS.md` — task format and rules
5. `notes/records/CROSS-HARNESS.md` — the comparison design and fairness rules

## Tooling, by task

| I want to… | command |
|---|---|
| know if anything is broken | `scripts/harness.ps1 preflight` |
| write tasks | `node tools/new-task.mjs <id>` then `node tools/validate-tasks.mjs` |
| run the matrix | `node tools/run-experiment.mjs --jobs 6 --model deepseek-flash` |
| analyse it | `node tools/analyze-results.mjs` |
| size the design | `node tools/power.mjs results` |
| test a harness | `scripts/harness.ps1 smoke -Call` |
| audit contexts | `node tools/dsh-audit.mjs` |

## Immediate next steps

1. **Write the ~30 tasks** (`notes/prompts/TASK-PROMPT.md` is a ready-to-paste work order for another session)
2. **Mixed-effects analysis + Holm correction** — a paired t-test ignores task heterogeneity
3. **Mechanism test** — the three falsifiable predictions in `notes/plans/JOURNAL-PLAN.md` §4
4. Then the full matrix: ~4 hours at 6-way, ~$100–300

## Second provider — not yet

**OpenRouter** is the pragmatic choice *when the time comes*: OpenAI-compatible (so all six harnesses
work with one config), reaches multiple model families, and reports per-provider cache multipliers.
`dsh-llm-pi-ai` can route DSH to any OpenAI-compatible gateway.

**But it is not neutral.** OpenRouter uses *provider sticky routing* — it remembers which provider
served a cached request and routes subsequent requests there to keep the cache warm. We are measuring
*harness* cache discipline, and OpenRouter compensates for it. So OpenRouter is a different
experimental condition, not a conduit.

The mitigation is a controlled sub-study: **run the same model direct-to-DeepSeek and via OpenRouter**,
and report the difference. That separates "harness cache discipline" from "router cache assistance",
and the gap is itself a finding.

Do this **last**. Provider generalisation multiplies an experiment that must first discriminate.

## Open loose ends

- The decision-layer router has never run in a live session. Worth 10 minutes to close, but it is a
  **separate paper** — do not put it in this one.
- `tools/test-gateway.mjs` and the milestone datasets are pre-upgrade; re-baseline after any DSH upgrade.
- The API key was leaked into a chat transcript during setup and should have been rotated.
