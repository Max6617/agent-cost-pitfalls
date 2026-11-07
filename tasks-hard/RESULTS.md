# tasks-hard — what was built and what it measures

24 tasks, 588 hidden cases, four strata of six. `tools/validate-tasks.mjs --dir tasks-hard`
reports **24 valid, 0 invalid** and `_tools/verify-task.mjs` (the stricter gate)
reports **24 ok, 0 fail**. Every row below comes from `_tools/verify-task.mjs`,
which runs the real suite on a real copy of the fixture twice: once untouched, once
with `reference/` overlaid.

## The batch

| task | stratum | hidden cases | fixture | untouched | reference | files changed |
|---|---|---:|---|---:|---:|---:|
| `lh-inventory-allocation` | long-horizon | 24 | 26 files / 1548 lines | 4/24 = 17% | 100% | 7 |
| `lh-job-scheduler-catchup` | long-horizon | 24 | 29 files / 1623 lines | 2/24 = 8% | 100% | 8 |
| `lh-ledger-replay` | long-horizon | 25 | 25 files / 1149 lines | 2/25 = 8% | 100% | 7 |
| `lh-migration-planner` | long-horizon | 25 | 27 files / 1167 lines | 3/25 = 12% | 100% | 8 |
| `lh-permission-resolution` | long-horizon | 25 | 24 files / 1124 lines | 3/25 = 12% | 100% | 6 |
| `lh-search-ranking` | long-horizon | 25 | 25 files / 1411 lines | 2/25 = 8% | 100% | 8 |
| `spec-csv-dialect` | spec-implementation | 25 | 23 files / 1008 lines | 3/25 = 12% | 100% | 7 |
| `spec-diff-patch` | spec-implementation | 25 | 22 files / 1273 lines | 4/25 = 16% | 100% | 8 |
| `spec-money-allocation` | spec-implementation | 24 | 20 files / 904 lines | 2/24 = 8% | 100% | 6 |
| `spec-query-engine` | spec-implementation | 24 | 22 files / 1219 lines | 4/24 = 17% | 100% | 8 |
| `spec-timezone-offsets` | spec-implementation | 24 | 22 files / 974 lines | 3/24 = 13% | 100% | 5 |
| `spec-url-router` | spec-implementation | 25 | 24 files / 1072 lines | 3/25 = 12% | 100% | 7 |
| `cross-cancellation` | cross-cutting | 25 | 24 files / 1623 lines | 7/25 = 28% | 100% | 8 |
| `cross-degraded-mode` | cross-cutting | 23 | 20 files / 1515 lines | 4/23 = 17% | 100% | 5 |
| `cross-error-taxonomy` | cross-cutting | 25 | 25 files / 1103 lines | 4/25 = 16% | 100% | 12 |
| `cross-nullability` | cross-cutting | 24 | 19 files / 1496 lines | 8/24 = 33% | 100% | 8 |
| `cross-trace-context` | cross-cutting | 25 | 26 files / 1776 lines | 6/25 = 24% | 100% | 6 |
| `cross-units-normalisation` | cross-cutting | 24 | 22 files / 901 lines | 4/24 = 17% | 100% | 9 |
| `edge-cron-parser` | edge-case-dense | 25 | 20 files / 761 lines | 4/25 = 16% | 100% | 6 |
| `edge-deep-merge` | edge-case-dense | 23 | 22 files / 945 lines | 8/23 = 35% | 100% | 3 |
| `edge-glob-match` | edge-case-dense | 25 | 25 files / 870 lines | 2/25 = 8% | 100% | 8 |
| `edge-json-schema` | edge-case-dense | 24 | 24 files / 1176 lines | 3/24 = 13% | 100% | 8 |
| `edge-number-format` | edge-case-dense | 25 | 22 files / 1122 lines | 3/25 = 12% | 100% | 6 |
| `edge-template-engine` | edge-case-dense | 25 | 20 files / 1001 lines | 4/25 = 16% | 100% | 8 |

Floor (untouched fixture) 8-35% for all 24 tasks, mean 16%; every reference scores
100% on its own suite and passes its own visible suite. The whole batch is 588
hidden cases. `edge-number-format` was left half-finished by an author who was
interrupted (34 cases, a fixture that already passed 71%, an incomplete reference)
and was repaired afterwards: it now has seven planted defects over six modules, a
12% floor and a complete reference.

## Measured against the real arms

`_tools/check-task.mjs <id>` runs the same matrix `tools/check-task.mjs` runs, with
`--tasks tasks-hard`, and reports the **fraction of hidden cases each arm passed**
alongside the binary solved flag.

### `lh-ledger-replay` — 7 arms × 3 seeds, 21 runs, 26.1 min (VALID)

| arm | solved | mean fraction | median | billed/run | cases passed per run |
|---|---:|---:|---:|---:|---|
| `dsh:native` | 0/3 | 95% | 96% | $0.07282 | 23, 24, 24 |
| `dsh:native-opt` | 1/3 | **97%** | 96% | $0.07860 | 24, 24, **25** |
| `dsh:native-terse` | 0/3 | 91% | 96% | $0.10003 | 24, 24, 20 |
| `dsh:ptc` | 0/3 | 92% | 96% | $0.06399 | 24, 21, 24 |
| `dsh:ptc-opt` | 0/3 | **87%** | 92% | $0.05685 | 24, 23, 18 |
| `dsh:ptc-terse` | 0/3 | 91% | 92% | $0.05879 | 21, 24, 23 |
| `opencode` | 0/3 | 91% | 92% | $0.05778 | 23, 21, 24 |

Fraction spread 11 points, solve-rate spread 33 points, and the run-to-run spread
*inside* `dsh:ptc-opt` (18, 23, 24) is wider than the spread between the best and
worst arm means — the task is sensitive to trajectory luck, which is signal for a
cost study and noise for a quality one.

The discriminating cases are the reversal-resolution interactions. All 21 runs
failed `reversing a reversal restores the charge`; the arms that also failed
`a reversal is resolved against its target even when the target is dated later`,
`reversing an entry that was itself refused changes nothing` and
`when two entries share a key the canonically first one is the one applied` scored
18-23. Every case that exercised one sub-problem in isolation passed everywhere.

### `spec-csv-dialect` — 7 arms × 2 seeds, 14 runs, 20.5 min (VALID, pre-hardening)

| arm | solved | mean fraction | billed/run |
|---|---:|---:|---:|
| `dsh:native` | 2/2 | 100% | $0.09789 |
| `dsh:native-opt` | 1/2 | 98% | $0.11292 |
| `dsh:native-terse` | 2/2 | 100% | $0.11571 |
| `dsh:ptc` | 2/2 | 100% | $0.08549 |
| `dsh:ptc-opt` | 1/2 | 98% | $0.08230 |
| `dsh:ptc-terse` | 1/2 | 98% | $0.07695 |
| `opencode` | 1/2 | 98% | $0.06094 |

**Saturated**: 10 of 14 runs scored 25/25, fraction spread 2 points. This is the
failure mode the batch exists to avoid, and it was measured on the first task of
the stratum — the author was sent back to replace the ten mainline cases with
interaction cases (quote/close ordering, escape adjacency, BOM position, header
order, mixed line endings). Post-hardening the floor is unchanged at 12%, the
"green the visible suite only" arm fell from 44% to 32%, and the author estimates a
strong arm at 68-96%. **That hardening is unverified: the measurement gateway went
down before it could be re-measured.**

### `cross-units-normalisation` — 7 arms × 2 seeds, 14 runs, 12.4 min (VALID, pre-hardening)

**Every one of the 14 runs scored 23/23 = 100%.** Fraction spread 0 points; verdict
TOO EASY. Billed per run ranged $0.023-$0.051, so the task still separates arms on
cost — but on quality it measures nothing. Its author was sent back to rebuild the
suite around invariants that fight call-site fixes (whole-surface round trips, two
readers agreeing on every syntax form, opposite rounding directions at one
boundary, a reload that must move every derived value). The task now verifies ok
with 24 cases, a 17% floor and a 9-file reference, but **the hardening is
unverified** for the same reason.

### `edge-glob-match` — 7 arms × 2 seeds, 14 runs (PARTIALLY INVALID)

The gateway died mid-matrix. Five runs completed (274-305 s) and **all five scored
25/25 = 100%**; nine runs failed in 5-9 s with no gateway usage and scored exactly
the untouched-fixture score (2/25), which is an infrastructure failure, not a model
result — the same failure mode `SESSION-STATE.md` records a retracted claim over.
The five valid runs say this task saturates too.

### `edge-number-format` — repaired after measurement was impossible

Not measured: the task was broken when the gateway went down (34 cases, 71% floor,
incomplete reference). It was repaired locally (no gateway needed) and now passes
every gate: 25 cases over 5 files, 12% floor, 100% reference.

## What this means

1. **The binary metric is dead; the fractional one is alive but compressed at the
   top.** On the pilot, `solved` was true for 1 of 21 runs while the fraction
   ranged 72-100%. Batch 1's problem (every arm solves everything) has become
   "every strong arm scores 87-100% on most tasks and 100% on some".
2. **What discriminates is an interaction core, not volume.** The pilot's suite has
   25 cases; the arms pass 23 of them consistently and disagree on 2-3, all of which
   require two sub-problems to be right at once (a reversal resolved against a
   target that sorts later, and a reversal chain resolved independently of the
   report window). Tasks whose hidden cases each exercise one sub-problem in
   isolation (`cross-units-normalisation`, pre-hardening `spec-csv-dialect`) went to
   100% on every arm.
3. **Cost still separates where quality does not.** For `cross-units-normalisation`
   the billed cost per run ranged $0.023-$0.051 (2.2x) on identical 100% scores —
   the study's cost axis survives saturation, which is worth stating in the paper
   rather than treating the task as wasted.
4. **The floor is low and wide (8-35%)**, which is what makes the batch usable for
   measuring a *weak* or *interrupted* solution: 3-8 of the hidden cases are
   deliberate guards that already pass, and a solution that only greens the visible
   suite lands at 32-83% depending on the task.
5. **Two tasks have a misleadingly high partial-credit floor**, and the paper should
   either exclude them or report them separately: `edge-deep-merge` (untouched
   fixture already scores 35%, and a solution that only greens the visible suite
   measures 78% — the named symptoms share a code path with the hidden
   undefined/prototype cases, so trimming visible cases does not move it) and
   `cross-nullability` (33% floor). Every other task has the visible-only arm
   between 32% and 68%.

## What to do next, in order of measured value

1. **Re-measure the three hardened tasks** once the gateway is back
   (`spec-csv-dialect`, `cross-units-normalisation`, and `edge-glob-match` which was
   never validly measured): `node tasks-hard/_tools/check-task.mjs <id> --seeds 3`.
2. **Give any task that measures 100% across arms a hard core**, not more cases.
   The three that did measure 100% all had one thing in common: every hidden case
   could be answered by implementing one rule that the fixture's `docs/` states
   explicitly. The pilot's discriminating cases were the opposite — the doc states
   two rules that interact (a reversal is attributed to its target's date; a
   reversal negates its target's effect) and the implementation has to resolve them
   with a second pass over the journal rather than in document order. Concretely:
   find a place where two documented rules compose into an order the naive
   implementation cannot produce, and write cases on both sides of it.
3. **Keep the cost axis.** `cross-units-normalisation` separated arms by 2.2x in
   billed cost on identical 100% scores. A saturated task is still a valid cost
   instrument; it is only the quality dimension that dies.
4. **Do not add visible cases to raise a partial-credit floor.** Three authors
   measured that trimming visible cases did not move the visible-only arm
   (`edge-deep-merge` measured 78% at 12 visible cases and 78% at 10), because the
   shared code path is what makes it high.


## Reproducing any row

```powershell
node tasks-hard/_tools/verify-task.mjs <id>          # the gate, no gateway needed
node tasks-hard/_tools/summary.mjs                   # the table above
node tasks-hard/_tools/check-task.mjs <id> --seeds 3 # paid: needs the gateway on :8787
node tasks-hard/_tools/score-report.mjs results/check-<id>
node tools/validate-tasks.mjs --dir tasks-hard
```

`task.json` names the grader with a repo-relative path
(`node tasks-hard/_grade/run.mjs <id>`). The runners resolve it against this
repository, because the test command's cwd is a temp copy of `fixture/`.
