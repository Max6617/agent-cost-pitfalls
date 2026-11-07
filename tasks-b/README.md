# tasks-b — the second, independent task suite (REPLICATION)

**This suite answers the study's recorded first referee objection: "one task
suite".** Every published result rests on the 31 tasks in `tasks/`. `tasks-b/`
is 40 new tasks, authored independently of batch 1, graded by a hidden suite
staged from outside the fixture, and analysed separately under the pre-declared
plan in `PLAN.md`.

## REPLICATION, NOT HELD-OUT — the paper must say so

This suite was authored on **2026-10-03, AFTER the batch-1 results were
known**. It is therefore a **replication suite, not a held-out suite**. A
held-out suite is fixed before the results it tests exist; this one is not, and
no claim that it is may appear in the paper. What it tests is whether the
batch-1 result reproduces on tasks nobody involved in the collection had seen
when the result was computed — the same question a referee asks, answered
honestly about its own provenance.

## What the authors did NOT look at

The suite was authored **from task shape only**:

- Subject matter was chosen from the batch-1 *stratum definitions*
  (single-step / multi-file / repo-wide / long-horizon) and a subject-overlap
  audit against `tasks/` and `tasks-hard/` — nothing else.
- **No per-task, per-arm, or per-mode batch-1 results were consulted** while
  choosing subjects, designing sub-problems, or setting difficulty. The
  authoring session did not look at which arms or modes won on batch-1.
- **Difficulty was not tuned to discriminate for or against any harness.** The
  only calibration targets are the mechanical gate criteria below, identical
  for every task.
- The one batch-1 fact that shaped the *design* (not the content) is the
  measurement recorded in `HANDOVER-2026-10-03.md` §4.1: in batch 1 the visible
  `test/` suite is the grader, and **13.1% of luna's runs (81/620) edited the
  tests they were graded by**. That is why this suite uses the hidden-grader
  pattern: the acceptance suite lives in `grade/tests/`, is staged into the
  run from outside the fixture by `_grade/run.mjs`, and editing
  `fixture/test/` cannot move the score by a single case. The suite is immune
  to that failure mode **by construction**.

## The strata — 40 tasks, 10 per stratum

Same stratification as batch 1, by id prefix. All subjects are new; the
overlap audit is below.

| stratum | n | tasks |
|---|---|---|
| `single-step-*` | 10 | roman-numerals, iban-validate, slugify, ini-dialect, fraction-math, base64-codec, hex-colour, isbn-convert, quoted-printable, word-wrap |
| `multi-file-*` | 10 | shipping-quotes, user-invitations, booking-conflicts, subscription-proration, approval-workflow, locale-fallback, library-loans, seat-selection, menu-allergens, quiz-scoring |
| `repo-wide-*` | 10 | validation-messages, id-prefixing, date-intervals, sort-tiebreak, pii-redaction, status-lifecycle, email-canonical, text-truncation, timeout-policy, audit-events |
| `long-horizon-*` | 10 | order-fulfilment, token-rotation, cart-merge, document-versions, quota-windows, waitlist-promotion, split-expenses, swiss-tournament, irv-ballots, auction-bidding |

Stratum meanings (as in batch 1):

- **single-step** — one small cohesive library; the sub-problems are rule
  areas of one domain.
- **multi-file** — a small application of 4-6 cooperating modules; the rules
  cross module boundaries.
- **repo-wide** — ONE documented convention that many modules each implement
  slightly wrong; the work is finding every deviant.
- **long-horizon** — a stateful, event-driven service; ordering, idempotency,
  replay and boundary interaction are the sub-problems. Time is always an
  injected parameter, never the clock.

### Subject-overlap audit

No task shares a fixture with, or rewords, any task in `tasks/` or
`tasks-hard/`. The nearest neighbours, checked and held distinct:

| tasks-b | nearest existing task | why it is not that task |
|---|---|---|
| multi-file-subscription-proration | tasks/long-horizon-billing-tiers | proration of mid-cycle plan changes vs tiered usage metering |
| long-horizon-quota-windows | tasks/single-step-rate-limit-window | stateful quota accounting over event streams vs a single window check |
| repo-wide-date-intervals | tasks/repo-wide-timestamp-normalisation | half-open interval *convention* across modules vs timestamp *format* normalisation |
| repo-wide-pii-redaction | tasks/repo-wide-log-event-migration | field-masking policy across sinks vs log-event format migration |
| repo-wide-timeout-policy | tasks/repo-wide-config-defaults-sweep | timeout ceilings/overrides vs config default resolution |
| long-horizon-split-expenses | tasks-hard/spec-money-allocation | group debt graph with settlement simplification vs one-shot allocation arithmetic |
| multi-file-booking-conflicts | tasks/long-horizon-job-ordering | resource conflict rules vs job sequencing |

## The rules every task followed

From `_tools/AUTHORING.md`, mechanically enforced by `_tools/verify-task.mjs`:

1. **Hidden-grader pattern.** `task.json.test` runs
   `tasks-b/_grade/run.mjs <id>`, which stages `grade/tests/*.test.mjs` into
   the run workdir from outside the fixture and scores against the authored
   case count. `grade/` and `reference/` are never copied into a run.
2. **Gate (must print `ok`)**: untouched fixture scores **<= 35%** of the
   hidden suite; the visible `test/` suite **fails** on the untouched fixture;
   the `reference/` overlay scores **100%** on the hidden suite and passes the
   visible suite; **18-25 hidden cases across >= 4 files**; fixture 9-30
   files, 350-1,800 lines.
3. **>= 6 interaction cases** per task (two sub-problems at once, or behaviour
   the visible suite never touches), and **2-4 guards** (cases that already
   pass on the untouched fixture, against destructive rewrites).
4. **Zero dependencies**, pure Node ESM, fully deterministic: no clock, no
   randomness, no timers, no network, no filesystem writes, no `process.cwd()`
   dependence.
5. The prompt names symptoms, never the file, the function, or the fix, and
   says the visible suite is not the whole acceptance criteria.

## Layout of one task

```
tasks-b/<id>/
  task.json              prompt / repo / test (absolute grader path) / setup
  fixture/               the broken repository the agent gets
    package.json         type: module, scripts.test = "node --test", no deps
    README.md            conventions; src/index.js is the stable public surface
    docs/                the written contract every hidden expectation anchors to
    src/index.js, src/...  the implementation, with the bugs
    test/*.test.js       VISIBLE reproduction suite (8-12 cases) - fails as shipped
  grade/tests/*.test.mjs HIDDEN acceptance suite (18-25 cases, >= 4 files)
  reference/             corrected copies of ONLY the changed files (proof of solvability)
  NOTES.md               sub-problems, guards, interactions, measured scores
```

## Verifying the suite (no API spend)

```powershell
node tasks-b/_tools/verify-task.mjs            # the gate, every task: must print ok
node tools/validate-tasks.mjs --dir tasks-b    # broken-before + deterministic: must PASS
```

If the repository moves, absolute grader paths are refreshed with
`node tasks-b/_tools/retarget.mjs`.

## Collecting (a separate, budgeted step — DO NOT RUN from authoring)

The plan entry exists but collection is not part of authoring:

```powershell
node tools/collect.mjs --plan batchb --providers cheap --max-cost <ceiling>
```

`batchb` = 40 tasks x 10 arms x 2 seeds = **800 cells per provider**. The cost
ceiling must be re-derived from observed batch-1 per-cell costs before launch
(see `PLAN.md` §7 and `HANDOVER-2026-10-03.md` §4.3 — the last estimate of a
new suite was 50% under). Anthropic is excluded by `collect.mjs`'s own guard.
The analysis that collection feeds is fixed in advance in `PLAN.md`.
