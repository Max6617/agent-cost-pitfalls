# LIVE DEFECTS — 2026-10-04, during the hard-suite pilot (cmuti3u5l)

Not fixed yet, deliberately: both are in `tools/collect.mjs`, which is **running a paid pilot right
now** and is also edited by the human's parallel session. Editing it under a live run risks a
collision for no benefit, because a running Node process keeps the code it loaded at start.

## 1. The status file mixes runs

`results/_scratch/pipeline-status.json` currently reads:

    stage: matrix      spendUsd: 0      ceilingUsd: 8      matrixId: cmuti3u5l
    provider: anthropic-sonnet   records: 620   cells: 620   solved: 618   runs: 619

The first four lines are the pilot. **The last five are the sonnet matrix's final numbers, left over
from an earlier run.** `writeStatus` merges with `{...cur, ...patch}`, so keys a later patch does not
mention survive forever. Anyone watching the pilot sees a run with 620 records and 618 solves that
has in fact written none.

**Fix (one rule, testable):** when the incoming patch carries a `matrixId` different from the one in
the file, start from an empty object instead of the old one. A new run must never inherit the last
run's numbers. Every field that is genuinely run-scoped then disappears at the boundary, which is
exactly when it should.

## 2. The artifact manifest treats a RUNNING matrix's log as a signed-off input

`artifact.mjs`'s `gatewayFiles()` returns every `results/gateway*.jsonl`, so the manifest checksummed
`results/cmuti3u5l-deepseek-gateway.jsonl` while the pilot was still appending to it. Six minutes
later `--verify` reported:

    CHANGED  input results/cmuti3u5l-deepseek-gateway.jsonl

That failure is correct and the cause is known: **a log belonging to an open matrix cannot be a
signed-off input.** This is the luna drift from the other direction - there a finished matrix's log
kept growing; here a growing matrix's log was signed off. The window machinery added on 2026-10-04
(`tools/study-window.mjs`) is the natural place to express it: an input log is checksummed only if its
matrix is closed, and a log for an open matrix is listed as `inFlight` rather than hashed.

Not re-baselined. `--verify` failing for a known reason is the instrument working; the fix is the
rule above, written test-first after the pilot stops.

**No API spend. No file under `results/` was modified by this note.**

---

## 3. Cline cannot be given a hard-suite prompt that contains a double quote  — FOUND 2026-10-04

**The hard-suite pilot stopped here, correctly, at preflight:**

    dsh       6 runs  182 requests  182 2xx   0 failed  ok
    opencode  1 run    32 requests   32 2xx   0 failed  ok
    cline     1 run     0 requests    0 2xx   0 failed  NO REQUESTS REACHED THE GATEWAY
    openhands 1 run    40 requests   40 2xx   0 failed  ok
    goose     1 run    38 requests   38 2xx   0 failed  ok

**The cause is in cline's own stderr, from its record in
`results/_scratch/preflight-deepseek-cmuti3u5l/runs.jsonl`:**

    error: Unknown command or unquoted prompt: Scheduling has drifted: a job we wrote as every five
    minutes is firing at the wrong minutes, ... a typo in an expression is answered with "no next run
    after the planner has ground through its whole search instead of being rejected outright. ...
    Prompt text must be passed as a single quoted argument, for example: cline "fix the tests".

Cline exited 1 after 15.8 s having made **zero** requests.

### Why

Cline is the only harness driven through a `.cmd` shim (`toolsharnesses.mjs`), and a `.cmd` means
cmd.exe quoting. The task prompt for `edge-cron-parser` contains a **double quote** (`"no next run"`),
which terminates the quoted argument, so cline receives the prompt as several arguments and rejects
it before doing any work. Every batch-1 prompt is quote-free, which is why cline passed preflight and
collected 620 cells on all six matrices and fails here.

**This is not a flake and not an infrastructure fault.** It is deterministic, it is caused by the
study's own invocation path, and it will recur on every hard task whose prompt contains a quote.

### What this cost

Nothing but the preflight: **zero matrix records**, no output directory, no partial matrix to resume.
The preflight's own requests across four working harnesses were the only spend, a few cents of the
$8 ceiling. `collect.mjs` refusing to start the matrix is the designed behaviour and it worked.

### The fix, to be done test-first after the pilot window

1. **Stop routing the prompt through cmd.exe.** The pinned cline install has a JS entry point
   (`betterharness-tools/cline-3.0.65/node_modules/.bin/cline`); invoking it as `node <entry> "<prompt>"`
   bypasses the shim's quoting entirely. The 2026-10-02 note chose `.cmd` over `.ps1` because `.ps1`
   does not spawn — `node` plus the JS entry is a third path and is the one that should be tried.
2. **A test with the actual failure**: a prompt containing `"`, `'`, `%`, `&`, `^` and a backtick must
   reach the harness byte-identical. Write it first and watch it fail on the current `.cmd` path.
3. **A preflight that says why** — it already prints the harness's own error text on the record, which
   is how this was found in one step. Keep that.

Until then, the hard suite cannot include cline on any task whose prompt contains a double quote.

**No API spend beyond the preflight. Nothing was deleted; there is nothing to resume.**
