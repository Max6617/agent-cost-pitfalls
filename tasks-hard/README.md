# tasks-hard — the second batch (partial-credit, long-horizon)

This directory is deliberately separate from `tasks/` so the first batch stays
intact and comparable. Nothing outside `tasks-hard/` is touched by this batch.

## What is different from batch 1

| | batch 1 (`tasks/`) | batch 2 (`tasks-hard/`) |
|---|---|---|
| outcome | binary (suite passes / fails) | **fraction of 18–25 independent cases passed** |
| horizon | 8–12 tool calls | **25–60 tool calls** |
| shape | one or two bugs | **4–6 independent sub-problems per task** |
| size | 100–400 lines | **400–1,500 lines across 10–25 files** |
| grading suite | sits in `fixture/test/`, visible | **hidden** — `grade/tests/*.test.mjs`, never copied into the fixture |

## Layout of one task

```
tasks-hard/<id>/
  task.json              prompt / repo / test / setup
  fixture/               the broken repository the agent gets (copied per run)
    src/...              400-1,500 lines, pure Node stdlib, ESM, zero dependencies
    docs/...             the written contract (spec strata) or design notes
    test/*.test.js       VISIBLE reproduction suite - a subset, fails on the untouched fixture
  grade/tests/*.test.mjs HIDDEN acceptance suite - 18-25 cases, never in the fixture
  reference/             a hand-written correct solution, overlaid on fixture/ to prove solvability
  NOTES.md               sub-problems, intended difficulty, measured scores
```

`grade/` and `reference/` are **not** copied into a run: `run-experiment.mjs`
copies `spec.repo` (i.e. `fixture/`) and nothing else. They exist so the task can
be re-verified and so a partial solution's score can be reasoned about.

## How grading works with the existing runner

`task.json.test` runs the shared grader with the task id:

```json
"test": "node tasks-hard/_grade/run.mjs <id>"
```

`_grade/run.mjs` copies `tasks-hard/<id>/grade/tests/*.test.mjs` into
`<workdir>/.grade/`, runs `node --test` on them with the workdir as cwd, prints
the normal spec output, then prints one machine-readable line:

```
TASKSCORE {"task":"lh-ledger-replay","pass":17,"fail":5,"authored":22,"score":0.7727}
```

`authored` is counted from the hidden suite's source, so it is the same
denominator for every arm even if a solution breaks an import and takes a whole
file down with it. The exit code is non-zero unless every case passes, so
`run-experiment`'s existing `solved` flag still means "100%".

Because the suite lives outside the fixture, an agent cannot read it, weaken it,
or delete it — deleting `fixture/test/` changes nothing about the score.

### The grader path is repo-relative

`spec.test` runs with the workdir (a temp copy of `fixture/`) as cwd, so a
relative path would not resolve there on its own. `task.json` stores
`node tasks-hard/_grade/run.mjs <id>`, and `tools/run-experiment.mjs` and
`tools/validate-tasks.mjs` rewrite that script against the repository root
before spawning it. Moving the checkout does not require editing the tasks.

`node tasks-hard/_tools/retarget.mjs` rewrites every `test` field back to that
relative form if one has drifted to an absolute path.

A missing grader fails loudly (`GRADER MISSING`) rather than scoring zero
quietly, but the validator cannot tell the two apart — it only checks that the
suite fails on the untouched fixture. `_tools/verify-task.mjs` does tell them
apart.

## Tools

```powershell
node tasks-hard/_tools/new-task.mjs <id> --stratum <stratum>   # scaffold
node tasks-hard/_tools/verify-task.mjs <id>                    # the gate every task must pass
node tasks-hard/_tools/verify-task.mjs                         # all of them
node tasks-hard/_tools/summary.mjs                             # the batch table (RESULTS.md)
node tasks-hard/_tools/check-task.mjs <id> --seeds 3           # the real 7-arm matrix on one task
node tasks-hard/_tools/score-report.mjs results/check-<id>     # fraction passed per arm
node tasks-hard/_tools/retarget.mjs                            # normalize test fields to the repo-relative grader path
```

`check-task.mjs` needs the measurement gateway on `http://127.0.0.1:8787`. Without
it, runs fail in seconds and score exactly the untouched fixture — an
infrastructure failure that looks like a model failure, which is why
`score-report.mjs` prints a note for any run with no `TASKSCORE` line and the
grader prints `TASKFAIL` naming the cases that failed.

`verify-task.mjs` enforces, mechanically:

1. the hidden suite has 18–25 authored cases across ≥4 files
2. the untouched fixture **fails** the hidden suite, and scores **≤ 35%** on it
   (headroom: a plausible naive implementation must not already pass)
3. the untouched fixture **fails** the visible `test/` suite too
4. the reference solution scores **100%** on both, and leaves `test/` passing
5. fixture shape: 10–25 files, 400–1,500 lines, no dependencies, no artifacts

A task that does not pass all five is not finished. What the batch actually
measured — per arm, per task — is in `RESULTS.md`; how to write one is in
`_tools/AUTHORING.md`.

## Running the whole batch

```powershell
node tools/run-experiment.mjs --tasks tasks-hard --seeds 3 --jobs 5 --model deepseek-flash `
  --harness dsh --harness opencode --out results/hard-matrix
node tools/analyze-results.mjs --runs results/hard-matrix/runs.jsonl
node tasks-hard/_tools/score-report.mjs results/hard-matrix   # the fraction each arm passed
```

`run-experiment` records `testsPassed`/`testsTotal`/`passRate` from the grader's
output as well as the binary `solved` flag, so the batch works with the study's
existing fractional scoring. `score-report.mjs` reads the grader's own
`TASKSCORE` line, which is the stricter of the two: it scores against the number of
cases *authored* rather than the number node reports, so a solution that breaks an
import and takes a whole file down is punished instead of getting a smaller
denominator.

## Rules that still apply

Harness-agnostic (shell, file editor, search only); deterministic (no clock, no
randomness, no network, no ordering dependence); never graded by an LLM; the
prompt names the symptom and never the file to change or the approach to take;
these tasks are hold-out and were not used to design any preset.
