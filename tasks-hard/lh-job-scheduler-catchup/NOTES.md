# lh-job-scheduler-catchup

**stratum:** long-horizon
**prompt:** "After the worker restarts, runs the tier owed are simply gone: a job that should have coalesced its backlog replays every missed slot, and one that was still in flight never picks up the slot waiting behind it. The nightly job fires at the wrong absolute time on the day the published offset changes, a pool configured for one job at a time happily starts four, a failed run never gets its third attempt, and the plan we print no longer agrees with the runs that turn up in the history. Make the tier behave the way docs/scheduling-rules.md says it does; the tests under test/ are the reproductions we managed to write, not the whole acceptance criteria."

## Sub-problems (one hidden file each, 4 cases each = 24)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-catchup` | catch-up policy `all`/`last`/`none`, and the watermark that decides what is still owed | `catchup.js` treats `all` and `last` the same (both replay everything) and makes `none` start the newest run; `watermark.js` moves the boundary onto the first *owed* run (or onto `now`) instead of onto the last settled one |
| `02-misfire` | a run older than `misfireAfterMs` is skipped and recorded, not replayed | `misfire.js` measures the age from the *previous* scheduled run (`at - period`) instead of from the run's own instant, so a run is judged about one interval too old |
| `03-offsets` | fixed-offset local schedules, including a DST-style offset change | `offsets.js` applies `offsetMinutes` in the wrong direction in `localToEpoch`, and resolves a repeated or skipped wall clock the wrong way |
| `04-ordering` | priority, submission order, the id tie-break, and per-pool concurrency | `priority.js` has no tie-break (a stable sort keeps insertion order); `pools.js` keys its pools by *job id* instead of by pool name, so every job gets a private budget |
| `05-retry` | retries, doubling backoff, `maxAttempts` and parking | `backoff.js` is off by one twice: `maxAttempts` returns `n - 1`, so the last attempt is never made, and `backoffFor` doubles one step early |
| `06-plan-history` | `planNext` and the history have to describe the same runs | `planner.js` steps the next runs from the frontier instead of from the schedule anchor, and never lists a pending retry (which docs §9 requires) |

Eight source files carry a bug, so no single edit fixes everything. Two of them
(`pools.js`, `planner.js`) are not hinted at by the prompt beyond the symptom.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 3/13 pass, exit 1 (10 failing) | **2/24 = 8%** |
| reference | 13/13 pass, exit 0 | **24/24 = 100%** |

Reference changes 8 files: `src/{catchup,misfire,offsets,priority,pools,backoff,watermark,planner}.js`.
`verify-task.mjs` prints `ok`. The reference was also run under `TZ=Asia/Kolkata`
(24/24), so neither the fixture nor the suite depends on the host timezone.

## Interaction cases (9 of 24 — the point of the suite)

| case | sub-problems it needs together |
|---|---|
| 01/3 a run that outlives its interval | catch-up `all` + deferral + watermark (the owed runs must stay owed) |
| 01/4 a full pool defers a backlog | catch-up + `pools.js` + watermark |
| 02/4 `last` once the older runs have misfired | misfire window + catch-up policy (the policy only sees survivors) |
| 03/4 a zoned job caught up across the change | `offsets.js` + watermark (the boundary has to land on the resolved instant) |
| 04/3 a deferred run starts later | `pools.js` + watermark |
| 04/4 a running job vs a full pool | deferral reasons + watermark |
| 05/4 a run due while a retry is pending | retry + watermark (the run that came due during the retries is still owed) |
| 06/2 a pending retry leads the plan | `planner.js` + `backoff.js` (the entry only exists once the planner lists retries, and only at the right instant once backoff is right) |
| 06/3 the plan and the history describe the same backlog | `planner.js` + `catchup.js` |

13 cases are single-sub-problem (mainline and boundary cases), so a partial
solution still scores partially.

## Guards (pass on the untouched fixture on purpose) — 2

- `02/3` `misfireAfterMs: 0` switches the window off however late the run is
  found: stops a rewrite from turning the policy off into "never run anything".
- `06/4` a settled run is not in the plan and overlapping jobs are planned per
  job: stops a planner rewrite from re-listing runs that already ran.

## Where partial credit comes from

| solution | score |
|---|---|
| untouched | 2/24 = 8% |
| one module fixed (`offsets.js` alone) | 5/24 = 21% |
| `watermark.js` alone | 4/24 = 17% |
| everything the visible suite exercises, nothing else | ~12-15/24 = 50-62% |
| everything except `watermark.js` | 18/24 = 75% |
| reference | 24/24 = 100% |

The last row is the point: the watermark is the rule that is easiest to read and
hardest to keep, and six interaction cases fail without it even when every other
module is fixed.

## Notes for a future editor

- The fixture is clock-free and random-free by construction: `now` is always a
  parameter, local time comes only from `data/offsets.json`, and the suites never
  read `Date.now()`. Keep it that way; the task depends on replays being
  reproducible.
- The visible `test/` suite is the easy end of each sub-problem on purpose. Do
  not promote it into the hidden suite: it is the reproduction, not the bar.
- `verify-task.mjs` prints the broken pass count; the grader prints `TASKFAIL`
  naming the cases, which is the quick way to see whether a case is a guard.
