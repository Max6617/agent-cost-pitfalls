# The interval convention

Every module in this service speaks in **intervals of days**. A day is an
integer: day 41 is the day after day 40; there is no clock and there are no
time zones. This document is the agreement the modules were written against.
When the code and this document disagree, the code is a bug.

## 1. Half-open

An interval `{ start, end }` is the **half-open** range `[start, end)`:

- `start` is the first day inside the interval.
- `end` is the first day **after** the interval. It is never one of the
  interval's days.

So `{ start: 3, end: 8 }` covers days 3, 4, 5, 6 and 7 - five days. A booking
from day 3 to day 8 has the guest arrive on day 3 and leave on day 8: the
room is the next guest's from day 8, and a stay that begins on day 8 does
not clash with it.

An interval with `start >= end` is **empty**: it covers no day, contains no
day, overlaps nothing, and merges with nothing.

## 2. The operations

`src/intervals.js` implements these; every module is expected to use them.

- **contains(iv, day)** - is `day` one of the interval's days. The first day
  inside is `start`, the last day inside is `end - 1`. Day 8 is not inside
  `{ start: 3, end: 8 }`.
- **overlaps(a, b)** - do the two intervals share at least one day. Touching
  is not sharing: `{1, 5}` and `{5, 9}` have no day in common, so they do not
  overlap. `{1, 5}` and `{4, 9}` share day 4, so they do.
- **intersect(a, b)** - the days common to both: `{3, 8}` and `{5, 12}`
  share `{5, 8}`. When there are no common days - including when the two
  only touch, like `{3, 8}` and `{8, 12}` - the intersection is **null**,
  not an empty interval.
- **duration(iv)** - how many days the interval covers: `end - start`, and
  0 for an empty interval. `{3, 8}` covers 5 days.
- **clamp(iv, bounds)** - the part of `iv` that lies inside `bounds`, i.e.
  `intersect(iv, bounds)`. When nothing lies inside - including when `iv`
  only touches the bounds - the clamp is **null**.
- **merge(a, b)** - combine two intervals into their span when they overlap
  **or run straight into each other**: `{1, 5}` and `{5, 9}` merge into
  `{1, 9}`, because there is no free day between them. `{1, 5}` and `{6, 9}`
  have day 5 between them and do not merge; the result is null.

## 3. What that means per module

### Bookings (`createBookingCalendar`)

A booking `{ room, guest, start, end }` takes the room from day `start` and
frees it on day `end`. Two stays on the **same room** clash exactly when
their intervals overlap - so a stay arriving on the day another leaves is
always allowed. Different rooms never clash, whatever the days.

A refused `book()` returns `{ ok: false, reason: 'conflict', conflicts }`
where `conflicts` is the list of clashing **booking ids** - the front desk
needs to point at a booking, not a guest name. Accepted bookings are
numbered `B-001`, `B-002`, ... in the order they are accepted, and `list()`
returns a room's bookings earliest first (by `start`, then `end`).

### Availability (`freeDays`, `firstAvailable`)

`freeDays(busy, window)` lists the days of `window` not covered by any busy
interval, ascending. The day a guest leaves is a free day. `firstAvailable`
returns the first day of the earliest run of at least `nights` consecutive
free days in `window`, or null when no run is long enough.

### Trials (`trialStatus`)

A trial `{ start, lengthDays }` covers exactly `lengthDays` days: the
interval `{ start, start + lengthDays }`. `endsOn` is that interval's `end`
- the first day not covered. On the last covered day `daysLeft` is 1; on
`endsOn` itself the trial is over (`active` false, `daysLeft` 0). Before
`start` the trial is inactive and the whole `lengthDays` lies ahead.

### Billing (`billableDays`, `prorate`)

Only the days a usage spends inside the billing cycle are billable:
`billableDays(cycle, usage)` is the duration of `intersect(cycle, usage)`,
and 0 when the two only touch or miss entirely. `prorate` is
`{ days, amount }` with `amount = days * dailyRate` in integer minor units.

### Reports (`busyPeriods`, `occupancyReport`, `busiestDay`)

`busyPeriods` merges busy intervals with `merge` - intervals that overlap
or touch are one busy period - and returns the maximal periods earliest
first. `occupancyReport(busy, window)` clips those periods to `window` and
reports `{ periods, occupiedDays, longestPeriod }`: how many of the
window's days are busy and the longest single stretch. `busiestDay` is the
day of `window` covered by the most busy intervals, the earliest such day
on a tie, or null when no day is covered at all.

### Campaigns (`effectiveWindow`, `planNights`)

A rate plan applies inside its active window. `effectiveWindow(plan, stay)`
is the clamp of the stay to the plan's window, and is **null** when the two
share no days - a stay that only touches the window, or misses it, has no
plan window at all. `planNights` is the duration of that window, 0 when
there is none.
