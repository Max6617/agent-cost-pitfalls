# spec-timezone-offsets

**stratum:** spec-implementation (the written contract is `fixture/docs/time-rules.md`)

**prompt:** the scheduler fires jobs at the wrong time: a job asked for 02:30
local runs an hour out on a clock-change day, a wall clock that never existed
comes back silently shifted, two code paths disagree about which of the two
repeated 01:30s a fall-back night means, day and month buckets are cut at the
wrong moment, and a zone that is not in the table runs against UTC instead of
failing. The doc is the specification; `test/` is a subset of the acceptance
criteria.

## The domain

A scheduling service that converts between UTC instants and local wall clocks
using an offset table shipped as data (`data/offsets.json`): per zone, an initial
offset plus the instants at which the offset changes. Ten zones, including one
that moves by 30 minutes (`Australia/Lord_Howe`), two whose clocks move at local
midnight (`America/Havana`, `America/Santiago`), a fixed zone whose table entry
re-declares its own offset (`Africa/Nairobi`), and fixed zones at +05:30, +05:45
and 0. Nothing reads the clock, `Intl`, `toLocaleString`, `Date` or the ambient
timezone: every answer derives from the arguments and the table, so the suite
gives the same result under any `TZ`.

## Sub-problems (one hidden file each)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-offset-lookup` (3) | the offset in force at an instant; a transition belongs to its own instant | `offsets.js` breaks on `instant <= at`, so the instant of a transition still gets the old offset |
| `02-nonexistent` (4) | the skipped hour: advance the reading by the length of the gap, and flag it | `wallclock.js` resolves a reading with the offset in force at the reading-as-UTC and always reports `'exact'`; Berlin and Lord Howe therefore land on the wrong side of the gap, New York only loses the flag |
| `03-ambiguous` (4) | the repeated hour: the earlier occurrence, flagged | same code path: Berlin and Lord Howe pick the later occurrence, New York is right by accident and unflagged; the round trip is never marked |
| `04-duration` (5) | elapsed time against wall-clock time | `duration.js` has the two entry points the wrong way round: `addToInstant` goes through the wall clock (a day is not 24 hours across a change, and `months` is silently applied instead of refused), `addToLocal` goes through the instant (a day across a change moves the time of day) and approximates a month as 30 days instead of clamping |
| `05-boundaries` (5) | local day / month / year boundaries | `boundaries.js` rounds the instant down to a UTC day boundary and adds 24 hours for the end of the day, so every boundary is a day-grid boundary rather than a local midnight, and a 23- or 25-hour day is reported as 24 |
| `06-zones` (3) | fixed-offset zones; an unknown zone is an error | `zones.js` falls back to UTC for any name it does not know (including the offset-string form `'+05:30'` and the wrong-case `'asia/kolkata'`) instead of throwing `UnknownZoneError` |

Five files have to change (`zones.js`, `offsets.js`, `wallclock.js`,
`duration.js`, `boundaries.js`). The offset boundary (doc §3) is the bug the
prompt does not hint at: every symptom named in the prompt is about readings.

## Interaction cases

1. `02` "a local midnight that never happened" and `05` "a day whose local
   midnight never happened still starts" — a local day boundary inside a gap
   needs the gap rule and the boundary rule together (Santiago, Havana).
2. `04` "a wall clock that lands in the gap or in the repeated hour is resolved
   there" — adding a day to a reading needs duration arithmetic and both
   resolution rules at once.
3. `01` "the transition instant is the first instant of the new offset" —
   `offsetAt` and `instantToLocal` have to agree about which side owns the
   boundary.
4. `03` "an instant inside the repeated hour round-trips to the earlier
   occurrence" — the documented non-identity of the round trip. The untouched
   fixture returns the right instant here by accident and the wrong flag.
5. `05` "a day in a zone whose clocks move at midnight is 25 hours long" —
   boundaries plus the earlier-occurrence rule: the next local midnight is only
   real at the second candidate.
6. `06` "a zone the table does not know is an error, not UTC" — the same
   mistyped name has to fail from every entry point, including `addToLocal`,
   which reaches the zone through a different module than `offsetAt` does.
7. `06` "an explicit offset string is a zone in its own right" — the same
   fallback that hides unknown zones also hides `'+05:30'`; adding the throw
   without the offset-string form leaves this file at 1/3.

Cases 1-6 are the six required shapes (nonexistent time on a day boundary;
ambiguous time plus a duration; the offset at the transition instant on both
sides; a UTC -> local -> UTC round trip across a transition; a local midnight
that does not exist; a fixed-offset zone crossing its own offset change — that
last one is the `06` guard, where `Africa/Nairobi` re-declares its own offset at
2024-07-01T00:00:00Z and must stay fixed).

## Guards (pass on the untouched fixture on purpose) — 3

- `01` "an offset holds from its own instant until the next transition": plain
  lookups away from any boundary, including `initialOffsetMinutes` before a
  zone's first transition.
- `04` "elapsed units are elapsed time on an ordinary day": elapsed arithmetic
  that crosses no transition is right even in the fixture's wall-clock version.
- `06` "a fixed-offset zone has one offset for all time": the fixed zones,
  including `Africa/Nairobi`'s re-declaration.

They stop a rewrite from inventing a transition, and they are the floor.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 4/13 pass, exit 1 | **3/24 = 12.5%** |
| reference | 13/13 pass, exit 0 | **24/24 = 100%** |

Identical under `TZ=Asia/Kolkata` and under the default `TZ`.

## Partial credit, measured (one reference module overlaid at a time)

| overlay | 01 | 02 | 03 | 04 | 05 | 06 | total | visible |
|---|---|---|---|---|---|---|---|---|
| none | 1/3 | 0/4 | 0/4 | 1/5 | 0/5 | 1/3 | 3 | 4/13 |
| `zones.js` | 1/3 | 0/4 | 0/4 | 1/5 | 0/5 | 3/3 | 5 | 6/13 |
| `offsets.js` | 3/3 | 0/4 | 0/4 | 1/5 | 0/5 | 1/3 | 5 | 5/13 |
| `wallclock.js` | 1/3 | 2/4 | 3/4 | 1/5 | 0/5 | 1/3 | 8 | 6/13 |
| `duration.js` | 1/3 | 0/4 | 0/4 | 3/5 | 0/5 | 1/3 | 5 | 6/13 |
| `boundaries.js` | 1/3 | 0/4 | 0/4 | 1/5 | 2/5 | 1/3 | 5 | 6/13 |
| all five | 3/3 | 4/4 | 4/4 | 5/5 | 5/5 | 3/3 | **24** | 13/13 |

Every single-module fix moves its own file and nothing else, so the sub-problems
are independent in the sense that matters: a partial solution gets partial
credit proportional to what it actually got right. `02` and `03` share
`wallclock.js` because they are the two rows of one rule, and each still moves
separately (2/4 and 3/4 with the fix, both 0/4 without).

## Where partial credit comes from

Measured, all-but-one module overlaid:

| missing module | hidden | which files pay |
|---|---|---|
| `zones.js` | 22/24 | `06` drops to 1/3 |
| `duration.js` | 20/24 | `04` drops to 1/5 |
| `boundaries.js` | 19/24 | `05` drops to 0/5 |
| `offsets.js` | 17/24 | `01` 1/3, and the boundary-adjacent cases of `02`, `03` **and `05`** |
| `wallclock.js` | 12/24 | `02` 0/4, `03` 0/4, and the interaction cases of `04` and `05` |

The offset boundary is the load-bearing bug: the Havana and Santiago day starts
*are* transition instants, so `05` loses two cases to it as well, and it is the
one rule the prompt does not hint at. Below that, a single-module fix scores
5-8/24, which is the floor-gap the visible suite leaves: those 13 cases fail in 9
places and are the easy end of every sub-problem - no transition boundary, no
30-minute zone, no midnight-transition zone, no month clamp, no fixed-zone
re-declaration.

A solution that implements `docs/time-rules.md` as written gets 24/24: no case
has an expectation the document does not state.

## Notes on the data

`data/offsets.json` is a shipped extract and §2 says it is the authority and is
not to be edited, so the suite asserts the offsets the table states. The values
are the real 2024-2025 transitions of those zones to the minute.

## Files

- `fixture/` — 20 text files; `docs/time-rules.md` is the contract, `test/` is
  the visible reproduction suite (13 cases, 8 failing on the untouched fixture).
- `grade/tests/01..06` — the hidden suite, 24 cases across 6 files, importing
  only `../src/index.js`.
- `reference/src/{zones,offsets,wallclock,duration,boundaries}.js` — corrected
  copies of exactly the five files the reference changes.
