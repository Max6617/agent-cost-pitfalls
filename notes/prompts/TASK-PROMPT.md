# Task-writing work order

Everything below the "---" line is the prompt. Copy from "You are writing" to the end.

---

You are writing evaluation tasks for a research project that measures how much different coding-agent
harnesses cost to solve the same problems. Your job is to author tasks. The quality of these tasks
determines whether the study produces a result or nothing at all.

## Where you are working

Repository: `C:\Users\user\betterharness\`

**Read this first, before writing anything:**

```powershell
cd C:\Users\user\betterharness
cat notes/records/TASKS.md
```

`notes/records/TASKS.md` is the authoritative authoring guide — the format, every rule, the stratification targets,
what makes a prompt good versus bad. Also read `tasks/example-fix/` as a complete worked example.

## Your goal

Create **30 task directories** under `tasks/`, stratified like this:

| stratum | count | what it is |
|---|---|---|
| single-step | 6 | one file, one clear bug, under ~5 tool calls |
| multi-file | 8 | a change that genuinely crosses 3-8 files |
| repo-wide | 6 | a sweep: rename something, migrate an API, fix a pattern everywhere |
| long-horizon | 6 | the fix is not obvious; investigation is most of the work |
| fetch-heavy | 6 | the answer is not in the repo (a spec, a library's source, an RFC) |

Name each directory shortly and descriptively: `multi-file-config-precedence`, `sweep-rename-client`.

## The exact format

```
tasks/<id>/
  task.json      { "prompt": "...", "repo": "./fixture", "test": "node --test", "setup": "" }
  fixture/       the repository the agent works in
```

Scaffold one:

```powershell
node tools/new-task.mjs multi-file-config-precedence
```

## The five rules, in order of how much they matter

**1. The test MUST FAIL on the untouched fixture.**

This is the rule that matters most. A task whose suite already passes measures nothing: every harness
"solves" it, the solve rate is 100% everywhere, and the run contributes noise instead of signal. This
exact bug has already happened once in this repository and produced a full matrix of meaningless
results before anyone noticed.

**2. Objectively gradable by a hidden suite.** The agent never sees the tests. **Never grade with an
LLM** — it is not reproducible and it invites the criticism that the metric was tuned.

**3. Harness-agnostic.** Solvable with a shell, a file editor and a search tool. No browser, no MCP, no
harness-specific feature — otherwise you measure which tool exists, not which harness is efficient.

**4. Deterministic.** The same fixture must give the same verdict every time. No timing, no network, no
randomness, no reliance on file ordering.

**5. Realistic code.** Repos are not minimal. Include comments, an unrelated module, a config file. Keep
fixtures under ~2,000 lines so runs stay affordable, but do not strip them to nothing — context size is
part of what the study measures.

## Writing the prompt

**Name the symptom, not the fix.** You are measuring the harness, not the prompt.

- Good: *"Negative numbers are parsed as zero. The suite under test/ should pass."*
- Bad: *"In parse(), change the comparison on line 42 from < to <=."* — that measures typing, not agency.

**Do not name files the agent should have to find** on long-horizon tasks. Discovering where the problem
lives is most of the work.

**Keep it to 1-3 sentences.** Every prompt token is paid on every run of every arm, times every seed.

## Writing the fixture and the tests

- Make `src/` genuinely broken in a *plausible* way — an off-by-one, a wrong default, a missed edge
  case. Not a deliberate `throw new Error('TODO')`.
- Write **several assertions across several behaviours**, not one. A single assertion rarely separates a
  competent solution from a lucky one.
- For multi-file tasks the change must really span files. A 400-line single file is a different task.
- Use Node's built-in test runner (`node --test`) unless the task needs another language, in which case
  set `test` accordingly (for example `pytest -q`).

## Your workflow — two checks, in this order, for every batch

### Step 1: validate the structure

```powershell
node tools/validate-tasks.mjs --dir tasks
```

This checks, per task, that the suite **fails** on the untouched fixture, that it is deterministic (it
runs it twice), that the fixture contains no `node_modules`/`.git`/`dist`, and that `task.json` is
well-formed. It warns on single-assertion suites.

**Fix every FAIL before going further.**

### Step 2: check that it actually discriminates

Structure being correct is not enough. A task can be perfectly well-formed and still be useless, in two
ways that `validate-tasks` cannot see:

- **TOO EASY** — every arm solves it
- **TOO HARD** — no arm solves it

```powershell
node tools/check-task.mjs <task-id>
```

This runs the real 5-arm matrix on that one task (about 30 seconds, a few cents) and tells you what
happened:

```
  arm                    solved    billed/run
  opencode                  2/2     $0.00218
  dsh:native                2/2     $0.00240
  ...
  solve-rate spread : 0 points
  cost spread       : 24.9%
  VERDICT: TOO EASY - every arm solves it.
```

**Run this on the first task of each batch before writing the rest of the batch.** If task one comes
back TOO EASY, the whole batch is probably too easy and you should adjust the difficulty before writing
more. This is the single highest-value thing you can do — it is the difference between 30 usable tasks
and 30 that all report 100% solve rates.

The verdicts you want:

- **DISCRIMINATING** — keep it, this is what a good task looks like
- **WEAK** — usable, but note it; more seeds would tell you whether the separation is real
- **TOO EASY** — the arms do not separate on quality. The *cost* differences are still real and still
  measurable, so it is not worthless, but make the next one harder.
- **TOO HARD** — check the fixture is solvable at all. Verify by fixing it yourself by hand.

**If `check-task` fails or reports all zeros**, the measurement gateway is probably not running. That is
an environment problem, not a task problem — report it rather than working around it.

## Do it in batches

Write **5 tasks**, then run *both* checks, then fix, then continue.

Do not write 30 and validate at the end. One systematic mistake would repeat 30 times, and you would
have no idea which tasks were affected.

## Report back

When finished, run both checks and report:

- how many tasks exist, and how many pass `validate-tasks`
- the `check-task` verdict for each task you checked
- the breakdown by stratum (how many single-step, multi-file, repo-wide, long-horizon, fetch-heavy)
- anything you could not make work, and why
- anything where you were unsure whether the task was fair

## Boundaries

**Do not modify anything outside `tasks/`.** Do not change `tools/`, `conditions/`, or any `.md` file.
If you believe a tool is wrong, report it — do not edit it.

## The one thing to get right above all

If you remember nothing else: **the test must fail before the agent touches anything, and the task must
not be solvable by every arm trivially.**

Every other rule can be fixed later. Those two silently invalidate the entire experiment.
