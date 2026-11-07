# TASKS-B BRIEF — the 40-task replication suite, authored and gated

**2026-10-03, commit `50ba0eb`. No API spend. Collection is a separate, budgeted step and was
NOT started.** Read `tasks-b/README.md` (provenance and rules) and `tasks-b/PLAN.md` (the
pre-declared analysis) for the authoritative versions; this file is the session record.

## What exists now

`tasks-b/` — a second, independent task suite answering the study's recorded first referee
objection ("one task suite": every published result rests on the 31 tasks in `tasks/`).

- **40 tasks, 10 per stratum**, batch-1 strata by prefix:
  - `single-step-*`: roman-numerals, iban-validate, slugify, ini-dialect, fraction-math,
    base64-codec, hex-colour, isbn-convert, quoted-printable, word-wrap
  - `multi-file-*`: shipping-quotes, user-invitations, booking-conflicts,
    subscription-proration, approval-workflow, locale-fallback, library-loans, seat-selection,
    menu-allergens, quiz-scoring
  - `repo-wide-*`: validation-messages, id-prefixing, date-intervals, sort-tiebreak,
    pii-redaction, status-lifecycle, email-canonical, text-truncation, timeout-policy,
    audit-events
  - `long-horizon-*`: order-fulfilment, token-rotation, cart-merge, document-versions,
    quota-windows, waitlist-promotion, split-expenses, swiss-tournament, irv-ballots,
    auction-bidding
- **Hidden-grader pattern throughout** (the tasks-hard shape, not the batch-1 shape): each
  task's acceptance suite lives in `grade/tests/*.test.mjs` and is staged into the run from
  outside the fixture by `tasks-b/_grade/run.mjs`. In batch 1 the visible `test/` suite IS
  the grader and 13.1% of luna's runs edited it (HANDOVER-2026-10-03 §4.1); here editing
  `fixture/test/` cannot move the score by a single case. Immune by construction.
- **New subject matter only** — the overlap audit against `tasks/` and `tasks-hard/` is a
  table in `tasks-b/README.md`.
- **Per task**: broken `fixture/` (visible `test/` suite fails as shipped), `docs/` contract
  pinning every hidden expectation, 18–25 hidden cases across 4–6 files, ≥6 interaction
  cases, 2–4 guards, `reference/` proving 100% solvability, `NOTES.md` with the measured
  numbers, zero dependencies, fully deterministic (no clock/random/network; "now" is always
  an injected parameter).

## Provenance — the paper must say this

This is a **REPLICATION suite, not a held-out suite**: authored 2026-10-03, AFTER the batch-1
results were known. It was authored **from task shape only** — no per-task, per-arm, or
per-mode batch-1 results were consulted while choosing subjects or setting difficulty, and
difficulty was not tuned for or against any harness. The one batch-1 fact that shaped the
design (not the content) is the 13.1% test-editing measurement, which is why the grader is
hidden. Stated in `tasks-b/README.md`; the paper must repeat it.

## Pre-declared analysis (tasks-b/PLAN.md, fixed before any run record exists)

- **Design**: 40 tasks × 10 arms × 2 seeds = 800 cells/provider, the four cheap providers,
  batch-1 treatments held constant by `collect.mjs --plan batchb`. No Anthropic.
- **Primary contrast**: per provider, PTC billed-cost differential vs native, paired by task,
  95% cluster bootstrap over 40 tasks. Batch-1 target (STEP2-RECONCILIATION §4): Qwen
  +30.7% [+10.0, +53.3], GLM −20.8% [−43.7, −2.7], luna +1.2% [−8.4, +11.3], DeepSeek
  +0.1% [−9.0, +9.8].
- **Holm family**: every secondary/pairwise contrast reported together — 4 cost + 8
  solve-rate, m = 12 (the filed reading, STEP2-RECONCILIATION §5.1); narrow reading as
  sensitivity.
- **Replication criterion (exact)**: R1 — all four providers' tasks-b classifications
  (positive / negative / null by CI) match batch-1; R2 — the sign disagreement itself
  reproduces (≥1 positive and ≥1 negative). *Replicated* = R1 (4/4) AND R2; 3/4 = partially
  replicated with the deviating provider named; else not replicated. R3 CI-overlap and the
  H1 slope reported alongside, never verdicts.
- **Test-editing rule, pre-decided**: no exclusions for fixture-test edits (the grader they
  could corrupt does not exist in this suite); `fixture.gradedOnEditedTests` still recorded
  and reported.
- **Cost ceiling**: to be re-derived from observed per-cell costs at launch and recorded in
  notes/plans/PLAN.md §7 before the first matrix (batch-1 suggests ~$7–15/provider, $30–60 total).

## Verification (run by the authoring session, not just reported by agents)

```
node tasks-b/_tools/verify-task.mjs            40 tasks: 40 pass, 0 fail, 0 warnings
node tools/validate-tasks.mjs --dir tasks-b    40 tasks, 40 valid, 0 invalid
node tools/preflight.mjs --tasks tasks-b       enumerates; probe = single-step-slugify
node --test tools/*.test.mjs                   102 pass, 0 fail
node tasks-hard/_tools/verify-task.mjs         24 tasks: 24 pass (after the repair below)
node tools/backup-results.mjs --verify         exit 0 (1 DRIFT: the live luna gateway log —
                                                the concurrent session's, append-only by design)
```

Gate shape per task: untouched fixture 12–21% of the hidden suite (exactly the designed
guards — every agent confirmed via the grader's TASKFAIL list), visible suite failing,
reference 100% on both suites, fixtures 13–21 files / 383–794 lines.

## Repairs the authoring surfaced (both watched failing first)

1. **`tasks-hard/_grade/run.mjs` was broken at HEAD** — the safe-fs refactor staged hidden
   suites into `.grade-<random>/` but left node pointed at literal `.grade/` paths: every
   hidden run scored 0% ("no test results parsed"), and the whole tasks-hard batch failed its
   own gate. One-line fix (run the staged path) in both graders; tasks-hard verifies 24/24.
2. **`single-step-ini-dialect` error-class rename** — `IniSyntaxError` false-positived the
   validator's new crash regex (`/SyntaxError/i`, commit `5c41386`). Renamed `IniParseError`
   across fixture, docs, hidden suite, reference.

## How it was built

40 coder subagents, one task each (AgentSwarm, batches of 10/6/5/5/5 around three 5-hour
quota interruptions), each briefed with the subject and `tasks-b/_tools/AUTHORING.md` (the
batch's authoring checklist, adapted from tasks-hard's), each required to iterate
`node tasks-b/_tools/verify-task.mjs <id>` to a printed `ok`. The orchestrator built the
tooling (`tasks-b/_tools`, `tasks-b/_grade` from the tasks-hard originals), scaffolded all 40
(`new-task.mjs`), wrote `README.md` + `notes/plans/PLAN.md`, added the `batchb` plan to
`tools/collect.mjs`, and re-ran every gate independently after the last batch.

## Caveats carried forward

- Three tasks (`repo-wide-date-intervals`, `long-horizon-auction-bidding`,
  `long-horizon-token-rotation`) record a visible-suite-only fix at ~75–80% of hidden, above
  the authoring guide's 40–60% aspiration. Not a gate criterion; noted for the analysis.
- `collect.mjs`'s `batchb` entry carries a DO-NOT-RUN note: no matrix before notes/plans/PLAN.md is
  ratified and a cost ceiling is re-derived. Per NEW-SESSION-BRIEF §7: never run a matrix
  without a backup target configured and a spend ceiling set.
- The next steps this enables, in the study's order: ratify notes/plans/PLAN.md → derive the ceiling →
  `collect.mjs --plan batchb` (cheap providers only) → analyse per notes/plans/PLAN.md → report the
  replication verdict against the exact criterion.
