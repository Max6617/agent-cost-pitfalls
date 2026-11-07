# Authoring a tasks-hard task

Read `tasks-hard/README.md` first, then the worked example at
`tasks-hard/lh-ledger-replay/` — that directory is the template. This file is the
checklist that makes the difference between a task that discriminates and one
that wastes runs.

## What you are building

```
tasks-hard/<id>/
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

The hidden suite is never copied into the fixture. `task json.test` runs
`tasks-hard/_grade/run.mjs <id>`, which stages `grade/tests/` into `<workdir>/.grade/`
and runs `node --test` on it. Copy the `test` line from the scaffold:

```powershell
node tasks-hard/_tools/new-task.mjs <id>
```

## The gate: `verify-task.mjs`

```powershell
node tasks-hard/_tools/verify-task.mjs <id>
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

The pilot was re-measured against the real 5-arm matrix before the rest of the
batch was written, and the first version of its suite was **near-saturated**:
three arms scored 92%, 92% and 96%. Every arm failed exactly the same two cases,
and both of those required **two sub-problems to be right at the same time** —
one needed the ordering fix and the reversal resolution fix together, the other
needed reversals to be resolved independently of the report window. The
twenty-three single-sub-problem cases discriminated almost nothing.

So, for every task:

- **At least 6 of the 18-25 cases must be interaction cases**: they exercise two
  sub-problems at once, or a behaviour the visible suite never touches. Examples
  of the shape: a cache that must be invalidated by a *reversal* as well as by a
  post; a duplicate entry that is itself the target of a reversal; an ordering
  rule that decides *which* of two competing writes wins; a boundary that only
  matters when two features combine (a negative balance, a zero-length batch, an
  empty page, a rate published exactly on the effective date).
- **Interaction cases are what a strong model gets wrong.** A strong model reads
  the doc and implements each rule; it is the rules that fight each other that
  produce a partial score.
- **Keep 2-4 guards, not 6.** A case that already passes on the untouched fixture
  is a guard against a destructive rewrite, and it also raises the floor. The
  pilot's first suite had 10 and its floor was 24%; with 2 guards the floor is 8%
  and the gradient is much wider.

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
two per sub-problem, and the easiest case of each sub-problem at that. Several
authors measured their "green the visible suite and stop" arm at 67-75%, above
the band, because the visible cases already covered the mainline of five of the
six sub-problems. If your measurement comes out above 60%, delete visible cases
rather than adding hidden ones — the hidden suite is capped at 25.

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
- Nothing in the library may read the clock or a random source.
- `src/index.js` re-exports the surface; both suites import only from it.

## The docs are the contract

Every hidden expectation must be anchored in something the agent can read. In
`lh-ledger-replay` that is `docs/ledger-rules.md`, which states the rules the code
is supposed to follow — including the awkward ones (rounding is half-up on the
exact value; a reversal is attributed to the period it corrects; internal means
internal for the whole subtree). The agent has to reconcile code against
document, which is what a real engineer does and what makes the task long.

Do not write the doc as a to-do list ("fix X, then Y"). Write it as the rules,
as if they were agreed before the code was written.

## The prompt

Two to four sentences, in the voice of a colleague reporting symptoms. Name what
is wrong in the world, never the file, the function or the fix. Pointing at
`docs/` and at "the reproductions under test/" is fine and is what a real ticket
does. Say that the visible suite is not the whole acceptance criteria, in some
form — otherwise an agent that greens it stops, which is a fair reading of a
prompt that says "make the tests pass".

## Worked example of the whole loop

```powershell
node tasks-hard/_tools/new-task.mjs my-task
# write fixture/, grade/tests/, reference/
node tasks-hard/_tools/verify-task.mjs my-task       # iterate until "ok"
node tools/validate-tasks.mjs --dir tasks-hard       # must PASS
node tasks-hard/_tools/check-task.mjs my-task --seeds 2   # optional, costs money
```

## Traps that cost the pilot a day

- **Order-dependent semantics.** A reversal may be dated before the entry it
  reverses; a duplicate key may arrive in any batch. Test the interaction, and
  make sure the reference handles it — the first version of the pilot's reference
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
