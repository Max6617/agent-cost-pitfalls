# long-horizon-quota-windows

stratum: long-horizon

Per-key API quota accounting: a daily allowance plus a sliding one-hour burst
window, driven entirely by event timestamps (no clock). Events may arrive out
of order; every answer is the canonical replay of what has been ingested so
far. Borrowing against tomorrow is capped and the debt is collected from the
next day's allowance.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-hourly-window` | the window is a sliding hour: `(t-3600, t]`, costs not counts | `src/windows/hourly.js` tallies fixed clock-hour buckets and reads only the current bucket |
| `02-borrow-debt` | borrow up to the cap, all-or-nothing; the debt is collected from exactly the next day | `src/windows/daily.js` `rollover()` zeroes `owed` instead of setting it to `borrowed` - the debt is never collected |
| `03-day-rollover` | day boundary resets the daily counter but not the sliding window | `src/rollover.js` calls `hourly.reset()` when the day changes |
| `04-out-of-order` | late events take their canonical slot, once, and can revise earlier statuses; ties break by id | `src/log.js` folds the late buffer into the canonical replay without draining it (late events counted twice) and sorts by `at` only |
| `05-usage-report` | the section 7 report is a correct snapshot after any prefix | no bug of its own; the report is derived from the broken windows/log, so every case exercises at least one of the four bugs |

The four bugs live in four different modules; `src/service.js` (orchestration)
and `src/report.js` (shaping) are correct in the fixture, and the reference
changes only the four buggy files.

## guards (pass on the untouched fixture)

- `a burst inside one clock hour is throttled at the limit` (01) - buckets and
  sliding agree when everything lands in one clock hour
- `a key may burst past the daily limit by borrowing against tomorrow` (02) -
  the borrow path itself works; only the collection is broken
- `the borrow cap is a hard ceiling, and it can be reached exactly` (02)
- `the daily counter starts over at midnight` (03) - events placed > 1h apart
  across midnight so the sliding window is empty on both sides

## interaction cases

- `02/the debt rides exactly one day and then it is gone` - borrow x rollover x
  report snapshot; also catches the opposite wrong fix (debt carried forever)
- `02/a request refused at the cap borrows nothing, and the debt still lands
  tomorrow` - rejection x borrow x rollover
- `03/a burst across midnight trips the window even when borrowing left daily
  room` - borrow x rollover x window; both bugs 2 and 3 show at once
- `03/the report after midnight still shows the old hour` - report x rollover
- `04/a late burst revises what the next day owes` - out-of-order x borrow x
  rollover
- `04/a late arrival inside the hour re-decides the window` - out-of-order x
  hourly window
- `04/a late arrival can push a later request over the daily allowance` -
  status revision under canonical replay
- `05/the report carries the debt across the day boundary` - report x borrow
- `05/the report reflects the canonical replay, not the arrival order` -
  report x out-of-order
- `05/keys are independent, and an unknown key reports zeros` - multi-key x
  window x zero report

## measured

- untouched fixture: **4/24 hidden cases (17%)**, visible suite 2/10 pass
  (8 failing reproductions)
- reference: **24/24 hidden cases (100%)**, visible suite 10/10 pass
- fixture: 20 text files, 744 lines; reference changes 4 source files
  (`src/log.js`, `src/rollover.js`, `src/windows/daily.js`,
  `src/windows/hourly.js`)

Where partial credit lives: greening the visible suite requires all four bug
areas, but the hidden suite additionally pins the exact window edge
(`t - 3600` aged out), the debt-discharge-after-one-day rule, status revision
on late arrival, and the same-second id tie-break - a replay that dedupes the
late buffer but keeps arrival tie-break, or a window that keeps `>=` on the
old edge, lands short of 100%.
