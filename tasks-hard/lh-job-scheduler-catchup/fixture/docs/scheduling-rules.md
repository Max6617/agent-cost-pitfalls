# Scheduling rules

What operations signed off for the batch tier. `src/` is the implementation; when
the two disagree this document is right and the code is a bug.

## 0. No clock, no randomness

Every function takes the instant it should reason about as an argument. Nothing
under `src/` reads `Date.now()`, a timer, or a random source, and nothing depends
on the host timezone. Local wall-clock time exists only through the published
offset table in `data/offsets.json`. This is what makes a catch-up after a
restart reproducible: the harness replays the same instants and must get the same
plan.

## 1. Jobs

```js
{
  id: 'nightly-rollup',        // unique within one scheduler
  pool: 'batch',               // a pool name from config/scheduler.config.json
  priority: 5,                 // higher starts first; default 0
  seq: 20,                     // submission order, ascending; default 0
  enabled: true,
  schedule: { ... },           // §2
  catchup: 'all',              // 'all' | 'last' | 'none'; default from config
  misfireAfterMs: 900000,      // 0 or absent = the job never misfires
  maxAttempts: 3,              // attempts in total for one run; default 1
  backoffMs: 30000,            // base retry delay; default from config
  maxBackoffMs: 600000,        // ceiling on the retry delay; default from config
}
```

`normalizeJob(spec, config)` fills in every default, so nothing downstream has to
treat a field as optional. A job that is `enabled: false` is skipped entirely:
the scheduler neither starts it nor records anything about it.

## 2. Schedules

A schedule describes instants, and only instants. Three kinds are supported:

| kind | fields | instants |
|---|---|---|
| `interval` | `everyMs`, `anchor` | `anchor + k * everyMs`, k ≥ 0 |
| `local-daily` | `zone`, `at` (`"HH:MM"`) | once per local calendar day in `zone` |
| `cron` | `minute`, `hour`, optional `zone` | the subset: `*`, `*/N` or a comma list for minutes, `*` or a comma list for hours |

Instants are whole milliseconds, ascending, and never repeated. `instantsBetween`
answers for a half-open window `(after, until]` — a run exactly at `after` is
already behind us, a run exactly at `until` is included.

## 3. Owed runs and the watermark

Each job carries a **watermark**: every scheduled instant at or before it has
been dealt with, so a tick looks strictly after it. A job registered at instant
`now` gets `watermark = now`: registering a job never replays the runs it missed
before it existed.

On `tick(now)` the **candidates** are the scheduled instants in
`(watermark, now]`, ascending. Every candidate ends the tick in exactly one of
two states:

* **settled** — started, misfired, coalesced or dropped. Settled runs are
  recorded in the history and the watermark moves over them.
* **owed** — deferred, because the job was already running, its pool was full, or
  it was waiting on a retry. An owed run is *not* settled: it is offered again on
  the next tick, in the same ascending order, and the watermark does not move
  past it. Nothing that is owed is ever quietly forgotten.

The watermark moves forward over the newest settled candidate of the tick and
stops at the first owed one; it never runs ahead of a run that is still owed, and
it never moves backwards. A `tick` with a `now` at or before the watermark does
nothing at all.

## 4. Catch-up policy

How much of a backlog is honoured is the job's `catchup` policy, and it applies
to the candidates that survived the misfire check:

| policy | behaviour |
|---|---|
| `all` | every candidate is started, oldest first |
| `last` | only the newest candidate is started; the older ones are recorded `coalesced` with reason `catchup-last` |
| `none` | nothing is started; every candidate is recorded `dropped` with reason `catchup-none` |

A job never overlaps itself: while a run is in flight the job is not offered
another one, so `all` works through a long backlog one run at a time as each run
finishes, and the runs behind the running one stay owed.

## 5. Misfire window

`misfireAfterMs` is the grace period after a run's scheduled instant. At tick
instant `now` a candidate scheduled for `at` is **on time** while
`now - at <= misfireAfterMs`, and **misfired** once `now - at > misfireAfterMs`.
The boundary belongs to the run: a run exactly `misfireAfterMs` late still runs.

A misfired run is never started. It is recorded with status `misfired` and reason
`misfire-window`, it is settled, and it does not hold the watermark back. A job
with `misfireAfterMs: 0` (or none) never misfires, however late it is discovered.

## 6. Local schedules and published offsets

`data/offsets.json` is the authority for local time. Each zone is a list of
entries, `{ from, offsetMinutes }`, meaning: from instant `from` onwards the local
clock reads `UTC + offsetMinutes`. Local time is therefore
`instant + offsetMinutes * 60000`, and an instant is `local - offsetMinutes *
60000`. The table is data: `Europe/Berlin` in the table has nothing to do with
the host's idea of Berlin.

The entry in force at an instant is the latest entry whose `from` is at or before
it. Two awkward cases have agreed answers:

* **A wall clock that occurs twice** (the offset steps back, so the local hour
  repeats) resolves to the **earlier** instant.
* **A wall clock that does not occur at all** (the offset steps forward over it)
  resolves forward by the size of the gap: the offset in force before the
  transition is used, which lands on the first instant after the gap.

A `local-daily` job therefore runs exactly once per local day, and on the day the
offset changes its absolute instant simply moves by the size of the change. It is
neither duplicated nor lost. A zone that is not in the table is an error, not a
fallback.

## 7. Order, priority and pools

When more jobs are due than the pools can start, the order is part of the
contract, and it is total:

1. higher `priority` first,
2. then lower `seq` (the order the jobs were submitted in),
3. then `id`, ascending by string comparison.

Every job belongs to a pool. A pool may have at most `limit` runs in flight;
the limit comes from `config/scheduler.config.json`, and a pool name that is not
listed there uses `defaultPoolLimit`. A due job whose pool has no free slot is
**deferred** with reason `pool-full` — deferred, not dropped, so it starts on a
later tick once a slot frees. Pools are independent: a full pool never holds up
another pool.

## 8. Failures, retries and parking

The harness reports the outcome of a run with `finish(jobId, { at, ok })`; the
scheduler itself never executes anything.

* A run is attempted at most `maxAttempts` times in total: the first attempt plus
  the retries.
* There is **no wait before the first attempt**. After a failed attempt number
  `n` (n ≥ 1) the next attempt is due at `finishedAt + min(backoffMs * 2^(n-1),
  maxBackoffMs)` — so the first retry waits `backoffMs`, the second waits twice
  that, and so on, capped by `maxBackoffMs`.
* A retry is the *same run*: it keeps the scheduled instant `at` of the run it is
  retrying and reports `attempt: n + 1`. While a retry is pending the job has not
  settled that run, so its scheduled runs stay owed.
* When the last allowed attempt fails, the run is recorded `parked` with reason
  `attempts-exhausted` and the job is parked: it starts nothing, and nothing new
  is recorded about it, until `resume(jobId)` clears it. Runs that come due while
  a job is parked are still owed afterwards, and are judged by the misfire window
  and the catch-up policy when it resumes.

## 9. The plan and the history

`planNext(now, windowMs, { perJob })` lists the runs the scheduler still owes,
from each job's watermark up to `now + windowMs`, at most `perJob` per job,
ascending by instant. Each entry carries `jobId`, `at`, `iso`, `pool`,
`priority`, `overdue` (`at <= now`), `retry` and `attempt` — the number the entry
would be attempted as, which is 1 for a scheduled slot. A settled run is never in
the plan; an owed run always is.

A run that is waiting on a retry is owed too, and it is the earliest thing its
job will do: it appears as an entry with `retry: true` and `attempt: n + 1` at
the instant its next attempt becomes due, ahead of that job's schedule slots, and
it counts against `perJob` like any other entry.

`history()` returns the log, oldest first: **one entry per attempt**, plus one
entry for every decision the scheduler took about a candidate. Every entry has
`jobId`, `at`, `iso`, `status`, `reason` and `attempt`.

| status | meaning |
|---|---|
| `started` | an attempt began |
| `succeeded` / `failed` | the outcome of that attempt, stamped on its own entry when `finish` is called |
| `misfired` | too late to run: reason `misfire-window` |
| `coalesced` | superseded by a newer run: reason `catchup-last` |
| `dropped` | deliberately not run: reason `catchup-none` |
| `deferred` | owed, not started now: reason `job-running`, `pool-full` or `retry-pending` |
| `parked` | the run spent its attempts: reason `attempts-exhausted` |

The two views must agree: a run the plan called due and that is neither misfired
nor deferred appears in the history as `started`, and a run that appears as
`started` was in the plan the scheduler was working from. The plan is what the
next tick acts on, so a plan nobody can reconcile with the history is worse than
no plan.
