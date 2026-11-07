# Harder tasks — work order

Send this into a session to author the second task batch. Everything below the line is the prompt.

---

You are writing a second batch of evaluation tasks for a study measuring what makes coding-agent
harnesses expensive. The first batch of 30 is done and **it is too easy**: every arm of every system
solved 30 of 31 tasks, so the study can measure *cost* but barely measures *quality*.

Your batch must fix that. Read `notes/records/TASKS.md` first — the format, the rules, the validator — then read
this, which adds requirements the first batch did not have.

## Why the first batch saturated

Every task had a **binary** outcome: a hidden suite that either passed or failed, and a broken fixture
that a competent model fixes in 8-12 steps. Binary outcomes saturate — once a model can do the task at
all, it scores 100%, and nothing distinguishes a careful solution from a sloppy one.

## The four requirements that make these different

**1. PARTIAL CREDIT — the most important change.**

Write suites with **12-25 independent test cases** covering distinct behaviours, so a solution can be
scored as *a fraction passed*. A suite of 20 assertions gives a 0-100% quality gradient on a task every
arm attempts, where a suite of 3 gives you a coin flip.

The grader will count passing tests, not just exit status. So:
- Assertions must be **independent** — one failure must not cascade into others.
- Cover the **hard cases**, not just the happy path: boundaries, empty inputs, ordering, unicode,
  concurrent edge cases, error paths.
- A partially-correct solution must score partially. If the obvious half-fix scores 100%, the task is
  binary in disguise.

**2. LONG HORIZON.**

Aim for tasks a competent agent needs **25-60 tool calls** to finish, against 8-12 now. That means
several files to read before anything can be changed, and a solution that cannot be guessed from the
prompt. Harness efficiency differences compound over steps; at 10 steps there is nothing to compound.

**3. LAYERED, WITH INDEPENDENT SUB-PROBLEMS.**

Prefer a task with 4-6 sub-problems that can each be solved without the others, over one hard bug.
Then partial credit reflects *how much* of the work got done rather than luck on a single insight.

**4. REALISTIC SCALE.**

400-1,500 lines across 10-25 files. Real repositories are not minimal, and context size is part of what
the study measures.

## What to build — 4 strata, 6 each (24 tasks)

| stratum | what it demands |
|---|---|
| **long-horizon** (6) | investigation dominates; the fix is not knowable from the prompt |
| **spec-implementation** (6) | a written spec in `docs/` must be implemented; correctness is checkable against it |
| **cross-cutting** (6) | a change whose effects span many modules; easy to half-do |
| **edge-case-dense** (6) | a plausible implementation passes the obvious tests and fails many of the hidden ones |

## The rules that still apply, unchanged

- **The suite must FAIL on the untouched fixture** — `tools/validate-tasks.mjs` enforces it. Run
  `node tools/new-task.mjs <id>` to scaffold, and validate every task before moving on.
- **Harness-agnostic** — shell, file editor, search only. No browser, no MCP.
- **Deterministic** — no timing, no network, no ordering dependence.
- **Never grade with an LLM.** The suite is the grader.
- **Name the symptom, not the fix.** Longer prompts are acceptable here because the tasks are genuinely
  more complex, but do not name the files to change or the approach to take.

## How to check a task is actually hard

```powershell
node tools/check-task.mjs <task-id>
```

It runs the real 5-arm matrix on one task. What you want now is different from last time:

- **DISCRIMINATING** — the arms separate. Best outcome.
- **TOO EASY** — every arm solves it *and scores near 100%*. Make it harder.
- **TOO HARD** — no arm solves it *at all*. Check it is solvable — fix it yourself by hand first.
- **The interesting middle**: every arm attempts it, and they score **differently** (say 60% vs 85%).
  That is the signal this batch exists to produce, and it will show in the per-arm test counts rather
  than in the verdict.

**Run `check-task` on the first task of each batch before writing more.** If it comes back all arms at
100%, the batch is too easy and you should adjust before repeating the mistake 23 more times.

## Report back

- how many tasks, how many pass `validate-tasks`
- for each checked task, the **fraction passed per arm** — not just the verdict
- the stratum breakdown
- anything where a partial solution would score misleadingly high or low

**Do not modify anything outside `tasks-hard/`.** Write the new batch into its own directory so the
first batch stays intact and comparable.
