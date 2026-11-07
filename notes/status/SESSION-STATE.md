# SESSION STATE — end of day one

> ## ⚠ SUPERSEDED 2026-10-01 (second update, 17:00). Read `notes/reviews/REVIEW-RESPONSE.md` and `notes/records/FINDINGS.md` F29–F38.
>
> **Two experiments ran today and both changed the paper.**
>
> - **F37, the cache A/B — this is now the paper's mechanism experiment.** Three conditions, one
>   request field, run concurrently: hit rate **0.0% → 11.8% → 94.9%**, cost **$0.4401 → $0.3590 →
>   $0.0957** per run. See `analysis/cache-ab.json`, `node tools/cache-ab.mjs`.
>   It also showed the study's own injected breakpoints only ever worked on the *native* arms (22-24%)
>   and never on the PTC arms (0%) — an uneven treatment inside the study's central contrast.
> - **F38, the F18 replication.** DeepSeek **7/29 = 24.1%** against Sonnet **1/75 = 1.3%**
>   (p = 0.0005) and Haiku **0/59 = 0.0%** (p = 0.0002) per run, at 11.1x and 4.3x the cost.
>   F18's original "p ~ 0.01" mixed an arm denominator with a run denominator; the per-run test is the
>   honest one and it is significant. `node tools/f18-replication.mjs`.
> - **luna's matrix is complete and F28 is retracted.** The 111 infrastructure-failed runs were
>   retried: **111 of 113 solved.** luna's "79%" was 96.5% all along.
> - **Still running when this was written:** the luna (60 runs) and DeepSeek (80 runs) arms of the F18
>   replication. Both write to `results/f18-luna` and `results/f18-deepseek`; re-run
>   `node tools/f18-replication.mjs` when they land. Nothing else is running.
> - **Gateways up:** 8800 DeepSeek, 8801 Sonnet, 8802 Haiku, 8803 OpenAI, 8795 harness-verify.
>   Kill them with `Get-NetTCPConnection -State Listen -LocalPort <p> | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`.

> ## ⚠ SUPERSEDED 2026-10-01. Read `notes/reviews/REVIEW-RESPONSE.md` and `notes/records/FINDINGS.md` F29–F34 first.
>
> This file describes day one. Every "what is running right now" row below is finished, and the
> audit it recommends is now a tool. The current state:
>
> - **All seven matrices are complete**: DeepSeek 620, Sonnet 620, Haiku 620 unique cells
>   (654 records), Qwen 620, GLM-5.3-Flash 620, GLM-5.3 310, luna 619. Run
>   **`node tools/coverage.mjs`** — it now checks balance, re-runs, gateway coverage and whether
>   the terseness manipulation actually applied, and flags each.
> - **Both hostile reviews are answered.** `notes/reviews/REVIEW-RESPONSE.md` resolves `notes/reviews/CRITICAL-REVIEW.md`
>   §2.1 (**refuted** — a two-hour timezone over-subtraction; `node tools/timestamp-audit.mjs`),
>   §2.5 (**confirmed and wider** — four matrices including `ds-full` ran a sham terseness ablation),
>   and §2.2 (H1–H5 re-issued by the filed rules: **H1 REFUTED**, b1 = −0.358 [−0.488, −0.239];
>   **H2 INCONCLUSIVE**, exact Wilcoxon p = 0.4046; H3 SUPPORTED; H4 unfalsifiable, demoted).
> - **The thesis moved.** The mechanistic account is dead and the ratio account is refuted. What
>   survives is F30–F33: the harness ranking is not provider-stable (median Spearman 0.286; 63.6%
>   of pairwise comparisons transfer, 54.0% among the DSH arms alone), the deciding variable is the
>   provider's cache regime, the design's measured noise floor is 7.7% (F29, an accidental placebo),
>   and a 15-word terseness instruction cuts cost 12–54% on six models (F32).
> - **Three new findings retract old ones**: F20's "OpenCode is cheapest on all four datasets" was
>   an artefact of an arm set missing `goose`; F28's "luna's 79% is a real capability difference"
>   was 111 named infrastructure faults (luna is 96.5%, Haiku 84.8%); F21's label was not the
>   pre-registered one.
> - **Instrument**: `tools/prices.mjs` is the one price card, `tools/exclusions.mjs` the one
>   exclusion rule, `tools/cost-panel.mjs` the one cost panel, and `analysis/` now archives the
>   outputs. The retracted DeepSeek card is gone from every headline document.
>
> Everything below is retained as the day-one record.

Written before stopping for the night. Supersedes `notes/status/RESUME.md` as the entry point.

---

## What is running right now

| | state |
|---|---|
| **DeepSeek full matrix** | job `pwsh-527`, ~66 of 434 runs, all 7 arms, progressing |
| **Task authoring session** | separate DSH session, actively writing `tasks-hard/` — **left running deliberately** |
| **Gateways** | 8787 (DeepSeek) and 8788 (GLM-5.3) live as background jobs |

**Nothing else is running.** No API spend is occurring except the DeepSeek matrix, which uses the
already-loaded key.

### Do NOT stop any background job

Asked whether the background tasks can be stopped safely. **They cannot, and none should be:**

| job | why it must stay | 
|---|---|
| `pwsh-527` DeepSeek matrix | the run in progress |
| `pwsh-407` gateway :8787 | **the DeepSeek run fails without it** — it is the measurement path |
| `pwsh-426` gateway :8788 | idle, but harmless, and tomorrow's GLM work needs it |

Stopping the gateways mid-matrix would not merely pause the run — it would produce **exactly the failure
mode this session already retracted a claim over**: runs that exit non-zero for infrastructure reasons
and look like model failures. Leave all three alone.

Estimated completion: **~135 minutes** from the handover, at 134–201s per run and 4 concurrent. Slower
than projected because the task-authoring session is competing for the same machine.

## The two retractions — read these first

Both came from writing a claim before reading the evidence. They are recorded in full in
`notes/records/FINDINGS.md` and must appear in the paper's limitations section.

| | claim | why it was wrong |
|---|---|---|
| **F4** | "PTC holds a ~10-point cache advantage, replicated three times" | all three "replications" were the **same 30-line task**. Across 15 real tasks it is 1.8pp, p ~ 0.30 |
| **F14** | "a stronger model is worse on some tasks" | the six "failures" were `1113 Insufficient balance` — **the account was empty**. The model never attempted them |

The rule now written into the pre-registration: **a non-zero exit is not evidence until its cause is
known.**

## Datasets, and their true coverage

Verified mechanically by `node tools/audit-all.mjs`, not from notes.

| dataset | runs | solved | tasks | arms | notes |
|---|---|---|---|---|---|
| DeepSeek V4.1 Flash (full) | in progress | — | 31 | 7 | first run with the terseness arms |
| DeepSeek (15-task sweep) | 150 | 150 | 15 | 5 | the older validation sweep |
| GLM-5.3-Flash | 310 | 310 | 31 | 5 | clean, no quota errors |
| GLM-5.3 | 75 | 69 | 15 | 5 | **6 lost to credit exhaustion** — infrastructure, not model failure |
| milestone-4 | 310 | 310 | 31 | 5 | copy of GLM-5.3-Flash |
| milestones 1-2 | 35 | 35 | 1 | 5 | **DSH 0.1.5-alpha.1 — do not pool** |

## The claim, as it now stands

> The billed-cost penalty of **code-mode presentation** scales with **output's share of the total
> bill**, and so the ranking of harnesses by cost is **provider-dependent**.

Evidence so far, all over the **15 tasks common to every dataset**:

| provider | output:input | PTC vs native |
|---|---|---|
| DeepSeek V4.1 Flash | **4.00** | PTC cheaper |
| GLM-5.3-Flash | 3.33 | no difference |
| GLM-5.3 | **3.14** | **native cheaper by ~31%** |

**Correction 2026-09-30.** The DeepSeek row read 2.00 until this date; that came from the retracted
card (miss 0.14 / hit 0.028 / out 0.28). The corrected off-peak card is miss 0.15 / hit 0.003 /
out 0.60 — **ratio 4.00, cache discount 50x** (`_ev/deepseek-pricing.html`, 2026-09-28; single copy
in `tools/prices.mjs`) — so DeepSeek has the *highest* output:input ratio in the study, not the
lowest. See `notes/records/FINDINGS.md` F20.

**Two providers with near-identical ratios differ by 31 points.** That is why output share, not the
ratio, is the pre-registered predictor.

## Documents, and what each is for

| file | purpose |
|---|---|
| `PRE-REGISTRATION.md` | the analysis plan. **v3** — a plan, not a results section. Five hypotheses with formulas and numeric decision rules |
| `notes/records/FINDINGS.md` | every claim with status, including both retractions |
| `METHODS.md` | draft methods section |
| `notes/literature/RELATED-WORK.md` | 109 KB, three passes. Verified novelty, threats, and citation checking |
| `notes/plans/RUN-PLAN.md` | tomorrow, in order, with the pilot first |
| `notes/plans/PENDING-RUNS.md` | the agreed queue |
| `notes/prompts/HARD-TASKS-PROMPT.md` | brief for the second task batch, now in progress |
| `notes/records/FINDINGS.md` | the claim register |

## Tomorrow, in order

1. **Load credit** — DeepSeek $5, z.ai **$30**, Alibaba $5, Anthropic $25 to start, OpenAI $10.
2. **Verify credit before any matrix.** The GLM run shows what a mid-matrix exhaustion looks like:
   plausible failures that are not results.
3. **Pilot Anthropic** (~$0.25). Answers whether caching activates: **$167 or $560** decides the
   whole budget.
4. **GLM-5.3-Flash terseness arms** (~$1) — a check that the terse instruction reduces output at all,
   before spending $12.55 on GLM-5.3 terseness.
5. Then GLM-5.3 terseness, Qwen, and the ratio-5.0 runs.

**All of it is in `notes/plans/RUN-PLAN.md` with exact commands.**

## Known gaps, stated plainly

- **DeepSeek has 15 of 31 tasks** in the older sweep; the running matrix closes this.
- **GLM-5.3-Flash lacks the terseness arms** (~$1) — H2 needs them on more than one provider.
- **GLM-5.3 is short 6 runs** to credit exhaustion; re-run those six, they are not failures.
- **OpenAI needs the `dsh-llm-pi-ai` patch** to be reached from DSH. Unverified.
- **Cline reached the gateway zero times.** Must not enter the matrix until resolved.
- **Goose** is not an npm package; **SWE-agent** fails on a Python constraint.
- **Harder tasks are in progress** but unvalidated.

## Verification state

`node tools/audit-all.mjs` checks every dataset and document in one pass. Last run: **one finding**,
the six genuine quota failures, everything else clean. Two earlier "findings" were bugs in the audit
script itself — a regex matching the word "quota" inside a task whose source code is about quota, and
a retraction mention read as an assertion. Both fixed; the script now matches the provider error
string and only counts runs that actually failed.

**Tooling note:** do not use `git add -A` while the task-authoring session is writing. It races and
silently stages nothing. Use `git add -A -- . ':!tasks-hard'`.
