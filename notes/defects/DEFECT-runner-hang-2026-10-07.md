# DEFECT — a completed runner that never exits stalled the pipeline for 2 h 45 min, silently

**Found 2026-10-07 during the luna handover.** Fixed the same hour, test-first. No data was lost:
every run was on disk and committed the whole time.

## What happened

luna wrote its 800th cell at **19:24:50Z**, committed (`5fe811f`) and snapshotted. Its runner —
`run-experiment.mjs`, pid 27156 — **never exited**, and had no child processes, so nothing was holding
it open. Its collector waited, printing one dot every ~20 seconds, until 22:10Z. **2 h 45 min.**

The pipeline frees a slot when the collector process exits. It never exited, so **Sonnet never
started** — the whole point of the pipelined design, silently defeated by one process that was
finished but alive.

## Why no watchdog fired

Both rules in `matrix-watchdog.mjs` infer "stuck" from **silence**, and both deliberately stand down
once the matrix is complete:

    const complete = countRuns(runsLog) >= plan.cells
    killed = silenceVerdict({ ..., complete })

That stand-down is correct and was written for a real loss — on 2026-10-02 the OpenAI matrix was
killed 5 minutes after its last request while it was writing its own backup, and the pipeline then
skipped verify and commit for a matrix that was actually fine.

So silence covered "incomplete and quiet" and "complete and doing local work". **Nothing covered
"complete and never exiting"**, which is silence of a third kind: no records, no gateway requests, no
work in progress, and no end.

## The fix

`tools/exit-guard.mjs` — a third verdict, deliberately narrow so it cannot reproduce the kill it sits
beside:

* it **cannot fire before completion** (it returns null while `completeSinceMs` is null), so the
  2026-10-02 case stays safe;
* it keys on the **later of completion and the last record**, so a retried cell landing after
  completion restarts the clock rather than being read as a hang;
* default 15 minutes, `--runner-exit-min`, and the verdict names the duration so the log explains
  itself.

On firing it takes the existing `killed` path: kill the runner, fail the stage with the runs still on
disk, and let `--resume` re-verify. That is exactly the manual recovery used today — kill the runner,
watch the collector report `matrix exited 4294967295`, resume, sign off — so the automated path is a
proven one.

## Exposure

Every provider in the pipeline. It cost 2 h 45 min of wall-clock today and would have cost the entire
remaining run if nobody had been watching. The fix applies to every collector the pipeline starts from
now on, because each is a fresh `collect.mjs` read from disk at spawn time.
