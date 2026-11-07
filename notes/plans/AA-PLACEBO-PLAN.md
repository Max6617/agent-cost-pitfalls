# AA-PLACEBO-PLAN — the corrected A/A noise floor, pre-declared 2026-10-10

**Filed before any collection. Budget cap $3 (the collector's own estimate for the full run is
$1.08). DeepSeek only. One collector at a time. No Anthropic, no other provider, no other matrix.**

## Why this run exists

Limitation 9 records that this study has no measured noise floor. The run it used to call a placebo
compared two differently-named arms whose first requests differed by the arm-id string — 30 and 20
bytes, one copy inside the working-directory path the model sees (notes/defects/DEFECT-position-confound-2026-10-04.md
section 3; notes/reviews/REVIEW-3.md section 4.18) — so it was not a control, and its 7.7% figure was withdrawn.
The corrected measurement is the missing one, and it is what REVIEW-4 objection 9 / must-fix item 10
asks for.

## Design — a repeated baseline, not a pair of lookalike arms

Two different arm ids cannot be byte-identical under this runner: the workdir is
tmpdir/dsh-exp-<runId>-<random6> and runId contains the arm id, so the string the model sees differs.
The placebo is therefore a **repeated baseline of ONE arm**:

- arm: dsh:native (mode native, patch shipped.yml, no prompt suffix) — one arm, not two.
- tasks: all 31 in tasks/, seeds 1 and 2.
- **two passes**, collected back to back as separate matrices into separate directories
  (results/aa-ds-full/pass1, results/aa-ds-full/pass2), 62 cells each, **124 cells total**.
- provider: DeepSeek (deepseek-flash) only, with exactly batch 1's DeepSeek gateway flags
  (--force-model deepseek-flash --force-effort high --no-cache-breakpoints).

Treatment identity between the passes is by construction (same arm, same prompts, same fixtures, same
gateway flags). The only intended difference is the time at which each pass ran.

## The rule that makes the passes comparable, and the acceptance gate

The record's runId stays unique — it is the key and the gateway's attribution — but **what the model
sees must be identical**. In AA mode the per-run workdir is a deterministic function of
(harness, task, seed): <tmp>/dsh-exp-aa-dsh-<task>-s<seed>, with no arm id, no matrix id and no random
suffix (tools/aa-plans.mjs, pinned by tools/aa-placebo.test.mjs, which was written before the
implementation). The fixture is copied fresh into it on every run, and any leftover from the other pass
is removed first through tools/safe-fs.mjs.

**Acceptance gate (run before the full matrix).** A smoke of the single cheapest task (example-fix),
both seeds, both passes — 4 cells, about $0.03. For each paired (task, seed) the FIRST request of pass
1 and the FIRST request of pass 2 must carry the **same requestHash** in the gateway log (the hash is
sha256 of the raw request body, written by tools/measure-gateway.mjs). **If any pair differs, STOP:
report the byte counts and spend nothing more.**

## Analysis rule, fixed here before the data exists

Estimators are the filed ones — no new estimator is written for this:

1. Build the panel with tools/cost-panel.mjs (buildPanel, pairedDiffs, summarise), the same price
   card and the same rule-9 exclusion the rest of the study uses, over the two passes.
2. For each metric the per-task difference is **pass 2 minus pass 1**, one value per task (seeds
   averaged inside each pass, which is what pairedDiffs does). Metrics: (a) cost_billed in dollars,
   the primary; (b) total tokens (fresh + created + hit + out); (c) input tokens (fresh + created +
   hit); (d) output tokens. Tokens are reported because the review asked for them, not because the
   dollar figure needs them.
3. The interval is the **task-cluster percentile bootstrap at B = 200,000, seed 12345**,
   tools/stats.mjs bootstrapTaskMean — the study's own default.
4. **The reported noise floor is that interval.** It bounds what two installations of the SAME
   treatment would differ by at this sample size. It is a floor for arm-level contrasts of this shape
   (31 tasks, 2 seeds), not a universal constant, and any claim smaller than it is reported as inside
   it rather than as a finding.
5. Secondary, reported beside it: each pass's mean per-cell cost, the SD of the per-task differences,
   the solve rate per pass, and the exclusions the panel applied.

## Commands, exactly

    node tools/collect.mjs --plan aaplacebo-smoke --providers deepseek --harness dsh --max-cost 0.5 --name-prefix aa-smoke-ds

    # acceptance gate: compare the first-request requestHash of each paired run in the smoke gateway log
    # only if every paired first request hashes equal:
    node tools/collect.mjs --plan aaplacebo --providers deepseek --harness dsh --max-cost 3 --name-prefix aa-

    node tools/aa-analysis.mjs --json analysis/aa-placebo-2026-10-10.json

## What this does NOT do, stated in advance

- It does not re-open F29's withdrawn 7.7%, does not re-label it, and does not resurrect the
  "cleanest novelty" claim. It replaces an unmeasured floor with a measured one.
- It does not touch the 2026-10-04 artifact scope, findings/, or any provider other than DeepSeek.
- It is not added to artifact/MANIFEST.json by the run; the parent session extends the manifest once,
  after review.
- If the acceptance gate fails, the full run does not happen and the failure is reported instead.
