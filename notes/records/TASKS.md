# TASKS — how to write them, and where they live

**Location:** `C:\Users\user\betterharness\tasks\`

One directory per task. Right now there is one: `tasks/example-fix/`. The design needs **20–40**.

```
tasks/
  example-fix/
    task.json          the prompt, the fixture path, the grading command
    fixture/           the repository the agent works in — this is what gets copied per run
      package.json
      src/calc.js
      test/calc.test.js
```

```json
{
  "prompt": "The function add() in src/calc.js returns the wrong result for negative numbers. Fix it so the test suite passes. Do not change the test file.",
  "repo": "./fixture",
  "test": "node --test",
  "setup": ""
}
```

Start one with:

```powershell
cd C:\Users\user\betterharness
node tools/new-task.mjs multi-file-refactor
```

Then `node tools/validate-tasks.mjs` as you go. **Run it before every batch of runs** — it costs
seconds and catches the failure that matters most.

---

## The rule that matters most

**The test must FAIL on the untouched fixture.**

A task whose test already passes measures *nothing*: every arm "solves" it, the solve rate is 100%
everywhere, and the entire run contributes variance without signal. This is not hypothetical — the
first example task in this repo had it, and a full matrix of meaningless results came out of it before
anyone noticed. The validator now refuses such a task with:

> TEST ALREADY PASSES on the untouched fixture — this task cannot discriminate.

## The other rules

| rule | why |
|---|---|
| **Harness-agnostic** | solvable with a shell, a file editor and a search tool. No browser, no MCP, no harness-specific feature — otherwise you are measuring which tool exists, not which harness is efficient. |
| **Objectively gradable** | a hidden test suite. **Never grade with an LLM** — it invites the criticism that the metric was tuned, and it is not reproducible. |
| **Deterministic** | the validator runs the suite twice. A flaky suite is noise in the dependent variable. |
| **No artifacts in the fixture** | no `node_modules`, `.git`, `dist`. Commit source. The validator fails on these. |
| **Not used to design any preset** | hold-out. State it in the paper. |
| **Stratified by multi-stepness** | see below. |

---

## Stratification — aim for roughly equal groups

The pooled mean hides the effect you are looking for. If code-mode's advantage appears only on
multi-step work, a suite of 30 single-file edits will show nothing.

| stratum | ~count | shape |
|---|---|---|
| **single-step** | 6 | one file, one clear bug, <5 tool calls |
| **multi-file** | 8 | a change that crosses 3–8 files |
| **repo-wide** | 6 | a sweep — rename, migrate an API, fix a pattern everywhere |
| **long-horizon** | 6 | needs investigation before the fix is even known |
| **fetch-heavy** | 6 | the answer is not in the repo (docs, an RFC, a dependency's source) |

Report per stratum, not just pooled.

## What makes a prompt good

**Name the symptom, not the fix.** You are measuring the harness, not the prompt.

- Good: *"Negative numbers are parsed as zero. The test suite in `test/` should pass."*
- Bad: *"In `parse()`, change the comparison on line 42 from `<` to `<=`."* — this measures typing.

**Do not name files the agent should have to find.** On long-horizon tasks, discovering *where* the
problem lives is most of the work.

**Do not leak the acceptance criteria.** The suite is hidden from the agent.

**Keep it to 1–3 sentences.** Every prompt token is paid on every run of every arm.

## Writing the fixture

Make it look like real code, because that is what the cache and context behaviour depend on:

- **Multi-file tasks should really span multiple files** — a 400-line single file is a different task.
- **Include realistic noise** — comments, an unrelated module, a config file. Repos are not minimal.
- **Size matters.** A 200-line fixture traverses the context differently from a 5,000-line one. Keep
  fixtures under ~2,000 lines so runs stay affordable, but do not strip them to nothing.
- **The broken behaviour must be genuine**, not a deliberate `throw new Error('TODO')`.

## A cheap way to check discrimination before the full matrix

```powershell
node tools/run-experiment.mjs --tasks tasks --only your-task --seeds 2 --jobs 4 --model deepseek-flash
node tools/analyze-results.mjs
```

Five arms on one task, ~30 seconds, a few cents. If every arm solves it and the costs are identical,
the task is not discriminating and you should make it harder before it joins the suite.

## When you are done

```powershell
node tools/validate-tasks.mjs --dir tasks
```

It prints per-task pass/fail with reasons, warns on single-assertion suites, and notes when the suite
is below the ~15-task power floor. Fix the FAILs; the warnings are judgement calls.
