# PILOT-INCIDENT-2026-10-04 — the resumed matrix died at startup, and the pipeline lost the reason

## What happened

`pwsh-89` (`node tools/collect.mjs --plan hard --providers deepseek --name-prefix hardpilot-
--max-cost 12`) ran to the matrix stage at 18:16:24Z on 2026-10-04 with the resume the pre-registered
rule now produces:

    --resume: 126 runs already complete, skipped
    --resume: 1 infrastructure-failed runs will be RETRIED (interrupted=1)
    --resume: 240 planned -> 114 remaining

The matrix child (`run-experiment.mjs`, matrix `cmuu429yb-deepseek`) printed its configuration and
`gateway ok`, then **exited 1 after 0.3 min** having produced nothing. `collect.mjs`'s watchdog then
fired 12 minutes later on its own rule and stopped the pipeline:

    *** STOPPING THE MATRIX: no run record for 12 minutes ***
    STOPPED at stage "the matrix, watched": deepseek matrix exited 1.

Cost of the attempt: preflight + pilot, $0.7275, plus the credit-check probe. The pilot stage itself
was healthy: 64/64 solved, all five harnesses preflighted (`dsh`, `opencode`, `cline`, `openhands`,
`goose`), and the cline fix from earlier in the day still holds (1 run, 28 requests, 28 × 2xx).

## What is known about the cause, and what is not

* The child died **after** `gateway ok` and **before** the per-harness version lines and the
  `matrix.json` write (`results/hardpilot-ds-full/matrix.json` still carried the 10:53 mtime).
* The code between those points is `probeHarnessVersion()` for five harnesses. That function cannot
  throw and cannot exit: it wraps `spawnSync` in try/catch with a 30 s timeout, records `error` in the
  result instead of raising, and falls back to the install path's `package.json`. Nothing in it calls
  `process.exit`. So the visible code path does not explain a silent exit 1.
* The **same command** gets past that point now: a `--dry-run` with identical arguments exits 0, and a
  zero-worker reproduction printed all five harness versions and reached the write.
* **The evidence was lost.** The child's stdio is inherited, so its stderr went into the background
  job's buffer — and that buffer is consumed by reading. A bare exit 1 with no captured transcript is
  precisely the situation this project's own rule covers: *a non-zero exit is not evidence until its
  cause is known*. This incident is recorded as **cause undetermined**, not as a code defect, because
  no surviving artifact distinguishes an external termination (Windows settles a force-killed process
  as exit 1) from a silent self-exit.

## Side effect, disclosed rather than deleted

To isolate the failure without spending money, a `--jobs 0` reproduction was run against the live
gateway. **`run-experiment.mjs` clamps jobs to a minimum of 1**, so instead of a no-op it began
running the real matrix with one worker, outside `collect.mjs` — no spend meter, no watchdog. It was
stopped within about two minutes, before any cell completed:

* `results/hardpilot-ds-full/runs.jsonl` is unchanged at **127 records**, all `cmutjmthf-deepseek`.
  No partial or unsheltered cell was recorded.
* The reproduction made **17 gateway requests** (2026-10-04T18:21:32Z–18:21:55Z) that are in
  `results/cmuu429yb-deepseek-gateway.jsonl` and belong to **no run record**. They are left in place
  and named here, following the evidence-drift decision of the same day: declare, do not delete. Any
  analysis that totals that log's cost should know 17 requests in it are diagnostic noise, and any
  analysis that joins requests to runs will not attribute them.

## What was done

Restarted at 18:23Z with the transcript captured to a file (`results/_scratch/pilot-run-2.log`) so a
second failure cannot lose its reason: same plan, same prefix, same $12 ceiling, new matrix
`cmuu5f1yn`, gateway on port 8789, DeepSeek balance $18.57.

## The defect this exposes, for a future session

`collect.mjs` watches a child it cannot hear. When the matrix child dies, the watchdog reports the exit
code and the record count, but the child's own stderr is inherited into a stream nobody keeps. The fix
is small and belongs in `runWatched()`: capture the child's stdout/stderr to
`results/_scratch/matrix-<id>.log` (or keep the last N KB of stderr and print it on a non-zero exit),
so the next silent exit 1 carries its own cause. Test-first, as always: a test that a fake child
exiting non-zero leaves its stderr in the log.

## RESOLVED — the cause, found within the hour

The cause was in `collect.mjs`, not in the child. `runWatched()` seeded its silence clock from the
**mtime of the existing runs.jsonl**:

    let lastRunTs = existsSync(runsLog) ? statSync(runsLog).mtimeMs : Date.now()

`runs.jsonl` was last written at 12:41:20Z (the reboot kill). The resumed matrix started at
18:52:30Z, so on the watchdog's first 15-second tick `now - lastRunTs` was **6 h 11 min** — already
far past the 12-minute threshold. The watchdog declared "no run record for 12 minutes" (false: there
had been no record for six hours, which is the normal state of a resume) and called
`process.kill(c.pid)` on a child that was healthy and about to write its first cell. The child died
with no stderr of its own precisely because it was killed from outside, which is why the evidence
looked like a silent self-exit.

Both failures are the same defect, and it is deterministic: **any resumed matrix whose archive is
older than the silence threshold is killed about fifteen seconds in.** The better the archive, the
more certainly the resume dies.

Fixed in `tools/matrix-watchdog.mjs` (the clock now starts with the invocation, and the record
threshold is 25 minutes because the slowest measured hard cell is 1200 s), wired into `collect.mjs`
and covered by six tests. The misleading "cause undetermined" above is left standing rather than
rewritten: it is what the surviving evidence supported at the time, and the difference between it and
this section is the point.
**And a second watchdog defect, found five minutes after the first fix.** The resumed matrix then
started and wrote its first two cells - and was killed at exactly the five-minute mark by the OTHER
rule, `no gateway request for 5 minutes`, while the gateway was making requests. `gatewayQuiet()`
returns TRUE WHEN THE LOG IS FRESH; the original call site negated it, and the refactor passed it
straight into the rule that reads it as "the gateway is quiet". The rule now takes `gatewayIdleMs`,
a duration that cannot be inverted by a caller who did not read the helper. Both defects, and the
measured worst-case gaps the thresholds are pinned against, are in `tools/matrix-watchdog.mjs`.
## OUTCOME - the pilot completed on the fourth attempt

`cmuu7wgca` finished **240/240 cells** on 2026-10-04: 241 records (one cell killed by the reboot and
re-run under the interrupted rule), **178 cells solved = 74.2%**, 62 unsolved, all ten arms present at
24 records each except `dsh:ptc-terse` at 25 - the retried cell. Committed by the runner as
`67a5c7b`, mirrored and snapshotted twice. Spend on the successful attempt: **$5.4970** of a $12
ceiling.

**The interrupted-run rule paid for itself on the first cell it touched.** The cell the reboot killed
was `lh-inventory-allocation/dsh:ptc-terse`; the retry SOLVED it. Without the rule it would have been
skipped as complete and published as a failure, and the hard suite's headline would read 177/240
(73.8%) instead of 178/240 (74.2%) - a machine shutdown scored as a model failure, which is the
defect class this project has retracted claims over.

The two watchdog defects cost three failed attempts (about $2.35 in preflight+pilot cycles) and about
two hours of wall clock. That is the price of the pipeline having no way to tell "this matrix is
stuck" from "this matrix was resumed": both rules inferred silence from evidence that was stale
before the run began.

## A REPORTING HAZARD, for whoever drives this pipeline next

The harness reports a background job as **exit code 1 whenever the command writes anything to
stderr** - a Node deprecation warning is enough. Verified directly: a command that prints one line to
stderr and exits 0 is reported as `exit code: 1`. All four pilot attempts were reported that way,
including the one that printed `DONE` as its last statement.

**The transcript is the evidence, not the job status.** `collect.mjs` exits 0 only if every stage
returned, and its failures print `STOPPED at stage "<name>": <reason>` and exit 1 themselves; a
successful run's last line is `DONE  <matrix>   spend this run: $...`. Read the log.
