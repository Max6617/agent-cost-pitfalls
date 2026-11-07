# Authoring a tasks-b task

Read `tasks-b/README.md` first, then the worked example at
`tasks-hard/lh-ledger-replay/` — that directory is the template. The checklist
below is the same checklist `tasks-hard/_tools/AUTHORING.md` documents, adapted
for this batch. What differs is stated first.

## How tasks-b differs from tasks-hard

- **Difficulty is batch-1 difficulty.** The bugs are the kind that ship in a
  sprint: a wrong default, an off-by-one on a boundary, a comparison against
  the wrong field, a cache that is never invalidated, a sort that ignores a
  tie-breaker. Not multi-hour debugging archaeology. A strong engineer should
  be able to hold the whole fixture in their head.
- **The strata are batch-1's strata**, by id prefix:
  - `single-step-*` — one small cohesive library; the sub-problems are rule
    areas of one domain (e.g. a codec's four edge rules), not separate apps.
  - `multi-file-*` — a small application of 4-6 cooperating modules; the
    sub-problems cross module boundaries.
  - `repo-wide-*` — ONE convention (stated in `docs/`) that many modules each
    implement slightly wrong in their own way; the work is finding every
    deviant and normalising it.
  - `long-horizon-*` — a stateful service driven by a sequence of events;
    ordering, idempotency, replay and boundary interaction are the
    sub-problems. Any time source is an injected parameter, never the clock.
- **The hidden-grader pattern is mandatory anyway.** In batch 1 (`tasks/`) the
  visible `test/` suite IS the grader, and 13.1% of one model's runs edited the
  tests they were graded by. Here the grader is staged from outside the fixture
  (`grade/tests/`), exactly as in tasks-hard, so editing `fixture/test/`
  cannot move the score by a single case.
- **NO API SPEND while authoring.** Do not run `check-task.mjs` (it launches a
  real paid matrix), `tools/preflight.mjs`, `tools/collect.mjs`, or anything
  that starts a gateway or a harness. Local `node --test` and
  `verify-task.mjs` are the only execution you need.

## What you are building

```
tasks-b/<id>/
  task.json                 prompt / repo / test (grader path) / setup
  fixture/                  what the agent gets; 10-25 files, 400-1,500 lines
    package.json            type: module, scripts.test = "node --test", no dependencies
    README.md               conventions, public surface, how to run it
    docs/                   the written contract (see the stratum notes)
    src/index.js            the public surface: everything the tests import
    src/...                 the implementation, with the bugs
    test/*.test.js          VISIBLE reproduction suite - fails on the untouched fixture
  grade/tests/NN-*.test.mjs HIDDEN acceptance suite - 18-25 cases, never in the fixture
  reference/                corrected copies of ONLY the files you change
  NOTES.md                  sub-problems, measured scores, what is naive-vs-correct
```

The hidden suite is never copied into the fixture. `task.json.test` runs
`tasks-b/_grade/run.mjs <id>`, which stages `grade/tests/` into
`<workdir>/.grade-*/` and runs `node --test` on it. The scaffold already wrote
the correct absolute grader path — do not edit `task.json`'s `test` field:

```powershell
node tasks-b/_tools/new-task.mjs <id>
```

## The gate: `verify-task.mjs`

```powershell
node tasks-b/_tools/verify-task.mjs <id>
```

Run it after every meaningful change. It checks, on a real copy of the fixture:

1. **suite shape** — 18-25 authored cases across >=4 files, no `.only/.skip/.todo`
2. **headroom** — the untouched fixture scores **<= 35%** of the hidden suite
3. **reproduction** — the untouched fixture fails the visible `test/` suite
4. **solvable** — overlaying `reference/` scores **100%** on the hidden suite and
   passes the visible suite, reporting exactly `authored` cases
5. **shape** — 9-30 files, 350-1,800 lines, no dependencies, no artifacts

A task is finished when it prints `ok`. Nothing else counts as finished.

## The suite is the instrument. Write it like one.

- **One top-level `test(` per case, starting at column 0.** No subtests, no
  `describe`, no loops that generate tests, no `.skip`/`.todo`. The authored count
  is a regex over `^test\(`, and the denominator must be identical for every arm.
- **18-25 cases, 4-6 files.** One file per sub-problem. A solution that fixes one
  sub-problem must move that file's cases and no others.
- **Independent cases.** One failing case must not cascade: no shared mutable
  module state, no reliance on the order files run in (node runs files in
  parallel), no case that only passes because an earlier one ran.
- **Import only from `../src/index.js`.** That is the public surface, and the
  fixture README says it is stable. Reaching into `../src/internal-thing.js`
  breaks a legitimate refactor and turns a good solution into a zero.
- **Mix difficulties inside each file**: roughly a third mainline, a third
  derivable-but-careful (boundaries, empty inputs, ordering, unicode, error
  paths), a third genuinely subtle. A suite of 25 mainline cases scores 100% for
  everyone; a suite of 25 traps scores 0% for everyone.
- **Every expectation must be derivable** from the fixture's `docs/`, its code,
  and the conventions in its README. Hidden does not mean unguessable: hidden
  means the agent has to reason instead of reading the assertion.
- Deterministic: no clock, no `Math.random`, no timers, no network, no filesystem
  writes, no dependence on `process.cwd()`.

## Interaction cases: the measured lesson

- **At least 6 of the 18-25 cases must be interaction cases**: they exercise two
  sub-problems at once, or a behaviour the visible suite never touches. Examples
  of the shape: a cache that must be invalidated by a *reversal* as well as by a
  post; a duplicate entry that is itself the target of a reversal; an ordering
  rule that decides *which* of two competing writes wins; a boundary that only
  matters when two features combine.
- **Interaction cases are what a strong model gets wrong.** A strong model reads
  the doc and implements each rule; it is the rules that fight each other that
  produce a partial score.
- **Keep 2-4 guards, not 6.** A case that already passes on the untouched fixture
  is a guard against a destructive rewrite, and it also raises the floor. With 2
  guards the floor is 8% and the gradient is wide; 10 guards put the floor at 24%.

## Calibration targets

| measurement | target |
|---|---|
| untouched fixture, hidden suite | 0-30% (hard cap 35%) |
| untouched fixture, visible suite | fails, with 3-10 cases failing |
| reference, hidden suite | 100% |
| reference, visible suite | passes |
| reference files changed | 4-8 source files, not a rewrite of the fixture |

The gap between "passes the visible tests" and 100% is where the partial credit
lives. Aim for a solution that satisfies the visible suite to score 40-60%.

**The visible suite is a reproduction, not a practice exam.** 8-12 cases, at most
two per sub-problem, and the easiest case of each sub-problem at that. If your
"green the visible suite and stop" measurement comes out above 60%, delete
visible cases rather than adding hidden ones — the hidden suite is capped at 25.

Cases that already pass on the untouched fixture are **guards**: they stop a
rewrite from breaking correct behaviour. Keep 2-4 of them, no more — every guard
raises the floor and compresses the gradient.

## Fixture rules

- Pure Node ESM, **zero dependencies**, `"type": "module"` in package.json.
  There is no network and no `node_modules` at run time.
- The bugs must be **plausible**: the kind of thing that ships. A wrong default,
  an off-by-one on a boundary, a cache that is never invalidated, a comparison
  against the wrong field, a sort that ignores a tie-breaker. Never
  `throw new Error('TODO')`, never `// BUG`, never a test that names the bug.
- Spread the bugs across 4-6 modules so no single edit fixes everything, and put
  at least one bug behind a module the prompt does not hint at.
- Include realistic noise: an unrelated utility, a config file, a CLI wrapper, a
  comment that explains intent rather than mechanics.
- Nothing in the library may read the clock or a random source. If the domain
  needs "now", it is a parameter the caller passes.
- `src/index.js` re-exports the surface; both suites import only from it.

## The docs are the contract

Every hidden expectation must be anchored in something the agent can read. Write
`docs/` as the rules, as if they were agreed before the code was written —
including the awkward ones. The agent has to reconcile code against document,
which is what a real engineer does and what makes the task long. Do not write
the doc as a to-do list ("fix X, then Y").

## The prompt

Two to four sentences, in the voice of a colleague reporting symptoms. Name what
is wrong in the world, never the file, the function or the fix. Pointing at
`docs/` and at "the reproductions under test/" is fine and is what a real ticket
does. Say that the visible suite is not the whole acceptance criteria, in some
form — otherwise an agent that greens it stops, which is a fair reading of a
prompt that says "make the tests pass".

## Worked example of the whole loop

```powershell
node tasks-b/_tools/new-task.mjs my-task
# write fixture/, grade/tests/, reference/
node tasks-b/_tools/verify-task.mjs my-task          # iterate until "ok"
node tools/validate-tasks.mjs --dir tasks-b          # must PASS
# check-task.mjs launches a REAL PAID MATRIX. It is not part of authoring.
```

## Traps that cost the pilot a day

- **Order-dependent semantics.** Test the interaction, and make sure the
  reference handles it — the first version of the tasks-hard pilot's reference
  scored 21/25 and every failure was an interaction.
- **A boundary that only a float gets wrong.** `1.005 * 100` is not 100.5 in
  binary floating point, and `(2.675).toFixed(2)` is `2.67`. When you want to
  discriminate exact arithmetic from float arithmetic, check the case in node
  first — some classic-looking traps pass by accident.
- **Free points.** Run `verify-task.mjs` early and read *which* cases pass on the
  untouched fixture. A case that passes because the broken code accidentally does
  the right thing on that input is a dead case: change the input until it
  discriminates, or promote it deliberately to a guard.
- **Coupling.** If fixing sub-problem 1 also flips sub-problem 3's cases, the two
  are not independent; either separate them or accept that they are one
  sub-problem and write a fifth.
- **Prompt phrasing is graded too.** `validate-tasks.mjs` warns on prompts that
  name files together with a fix.
