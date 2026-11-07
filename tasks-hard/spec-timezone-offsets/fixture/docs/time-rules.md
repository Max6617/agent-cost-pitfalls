# Time rules

The rules the scheduling service signed off for. `src/` is the implementation;
when the two disagree, this document is right and the code is a bug.

## 1. Vocabulary

- An **instant** is an integer number of milliseconds since 1970-01-01T00:00:00Z.
  Instants are UTC. Nothing in this service reads the system clock, the machine's
  timezone, `Intl` or any local-time method of `Date`: every answer comes from the
  arguments and the offset table, so the same call gives the same answer on every
  host.
- A **zone** is either a key of the offset table (`data/offsets.json`) or an
  explicit offset string such as `'+05:30'`.
- A **local reading** is a wall-clock date and time with no offset attached:
  `2024-03-10T02:30:00`. A reading may be written as a string
  (`'YYYY-MM-DDTHH:MM'` or `'YYYY-MM-DDTHH:MM:SS'`) or as an object
  `{ year, month, day, hour, minute, second }`; `hour`, `minute` and `second`
  default to 0, `month` is 1-12.
- An **offset** is a whole number of minutes east of UTC. `-300` is UTC-05:00,
  `330` is UTC+05:30.

## 2. The offset table

`data/offsets.json` is the authority on every offset question. The service never
consults the host's timezone database, and the table is data: a correct fix is a
change to `src/`, never a change to the table.

```json
"America/New_York": {
  "kind": "transition",
  "initialOffsetMinutes": -300,
  "transitions": [
    { "at": "2024-03-10T07:00:00Z", "offsetMinutes": -240 },
    { "at": "2024-11-03T06:00:00Z", "offsetMinutes": -300 }
  ]
}
"Asia/Kolkata": { "kind": "fixed", "offsetMinutes": 330 }
```

- `transitions` are listed in ascending `at` order, and `at` is a UTC instant.
- A zone with `kind: "fixed"` has one offset for all time. If such a zone carries
  a `transitions` list, those entries record administrative re-declarations of the
  same offset; they change nothing. No reading in a fixed zone is ever nonexistent
  or ambiguous.

## 3. offsetAt(zone, instant)

Returns the offset in force at that instant, in minutes.

- Before the first transition of a zone, the offset is `initialOffsetMinutes`.
- An offset holds until the next transition after it.
- A transition takes effect **at its instant**: `offsetAt(zone, T)` is the new
  offset. One millisecond earlier it is still the old one. A transition is never
  pending and never applies retroactively.

## 4. instantToLocal(zone, instant)

Returns `{ year, month, day, hour, minute, second, offsetMinutes }` — the local
reading obtained by shifting the instant by the offset in force at that instant
and then breaking the shifted value into calendar fields. The shift happens
first: an instant whose shifted value falls on the following day has that
following day as its local date.

## 5. localToInstant(zone, local)

Returns `{ instant, offsetMinutes, resolution, local }`. `local` is the
normalised reading that was asked for; `offsetMinutes` is the offset in force at
the returned `instant`; `resolution` says how the reading was interpreted.

| the reading | `resolution` | `instant` |
|---|---|---|
| occurs exactly once | `'exact'` | that instant |
| occurs twice — the repeated hour after the clocks go back | `'ambiguous'` | **the earlier** of the two instants |
| does not occur — the skipped hour after the clocks go forward | `'nonexistent'` | the instant whose local reading is the reading asked for **advanced by the length of the gap** |

A wall clock that never existed is never silently pulled to the wrong side of the
gap, and it is never reported as an ordinary reading: the flag says what
happened. In `America/New_York`, whose offset goes from -300 to -240 at
2024-03-10T07:00:00Z:

```js
localToInstant('America/New_York', '2024-03-10T01:30:00')  // { instant: 06:30Z, offsetMinutes: -300, resolution: 'exact' }
localToInstant('America/New_York', '2024-03-10T02:30:00')  // { instant: 07:30Z, offsetMinutes: -240, resolution: 'nonexistent' }
localToInstant('America/New_York', '2024-11-03T01:30:00')  // { instant: 05:30Z, offsetMinutes: -240, resolution: 'ambiguous' }
```

The last of those is the earlier occurrence: `01:30` on the way into the repeated
hour, at -240. Two hours later the same wall clock appears again, at -300, and
that is the one the service does not choose.

## 6. Round trips

`localToInstant(zone, instantToLocal(zone, t).…)` gives back `t`. The one
exception is an instant inside a repeated hour: it round-trips to the earlier
occurrence of its wall clock, as §5 requires. No instant ever produces a
nonexistent reading.

## 7. Durations

A duration is `{ months, days, hours, minutes, seconds }`. Every field is an
optional integer and an omitted field is zero. `months` is a calendar unit;
`days`, `hours`, `minutes` and `seconds` are exact time units.

### addToInstant(zone, instant, duration) -> { instant, local }

Advances an instant by **elapsed time**. A day here is exactly 24 hours
(86400000 ms) of elapsed time — never "the same local time tomorrow". Across a
clock change the local reading moves by the offset change as well, and that is
correct: a job that runs 24 hours after the previous run runs 24 hours later.

`months` is not a unit of elapsed time and is refused with
`InvalidDurationError` whose `code` is `'CALENDAR_UNIT_ON_INSTANT'`.

### addToLocal(zone, local, duration) -> { instant, offsetMinutes, resolution, local }

Advances a **wall clock**: the reading `2024-03-09T02:30:00` plus a day is
`2024-03-10T02:30:00`, whatever the offset does in between. Calendar units are
applied first (`months` then `days`), then the time units, all of it wall-clock
arithmetic on the reading. Adding a month to a day-of-month that the target month
does not have clamps to that month's last day (`2024-01-31` plus one month is
`2024-02-29`).

Only the reading that comes out of that arithmetic is resolved, by §5 — so a
wall clock that lands in a gap comes back shifted forward and flagged
`'nonexistent'`, and one that lands in a repeated hour comes back flagged
`'ambiguous'`.

## 8. Local days, months and years

- `startOfLocalDay(zone, instant)` — the instant at which the local day
  containing `instant` begins: local `00:00:00` on that local date, resolved by
  §5. If that midnight does not exist it is shifted forward like any other
  nonexistent reading, so the returned instant's local reading can be `01:00:00`.
- `endOfLocalDay(zone, instant)` — the last instant of the same local day, one
  millisecond before the next local day begins.
- `startOfLocalMonth(zone, instant)` — local `00:00:00` on the first day of the
  local month containing `instant`, resolved by §5.
- `isSameLocalDay(zone, a, b)` — whether two instants fall on the same local
  date.
- A local day is not always 24 hours long: it is 23 hours on a spring-forward
  day, 25 on a fall-back day, and 23.5 or 24.5 in a zone whose clocks move by 30
  minutes. A local day, month or year begins at local midnight, never at UTC
  midnight.

## 9. Zones that are not in the table

Zone names are the table's keys, compared exactly: `'Asia/Kolkata'` is a zone and
`'asia/kolkata'` is not. An explicit offset string — `'+HH:MM'` or `'-HH:MM'`,
two digits each with minutes below 60 — is always a valid zone and means a fixed
offset of that many minutes.

Anything else is an error, not a fallback: every entry point throws
`UnknownZoneError`, whose `code` is `'UNKNOWN_ZONE'` and whose `zone` is what was
asked for. A mistyped zone must fail loudly rather than quietly schedule a job
against UTC.
