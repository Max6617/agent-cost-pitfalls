# Schedule expressions — the agreed rules

The planner in `src/` decides when a job runs. This file is the contract it
implements: the job runner, the scheduler UI, the importer and the acceptance
checks were all written against these rules, so where the code and this file
disagree, the job runner is the one that is wrong.

## 1. Anatomy of an expression

A schedule expression is **5 or 6 whitespace-separated fields**.

```
5 fields:  minute hour day-of-month month day-of-week
6 fields:  second minute hour day-of-month month day-of-week
```

The six-field form is the five-field form with a leading seconds field; nothing
else changes. A five-field expression is exactly a six-field expression whose
seconds field is `0`.

| field | domain | names |
|---|---|---|
| second | 0–59 | none |
| minute | 0–59 | none |
| hour | 0–23 | none |
| day-of-month | 1–31 | none |
| month | 1–12 | `JAN` `FEB` `MAR` `APR` `MAY` `JUN` `JUL` `AUG` `SEP` `OCT` `NOV` `DEC` |
| day-of-week | 0–7 | `SUN` `MON` `TUE` `WED` `THU` `FRI` `SAT` |

Names are matched without regard to case — `mon`, `Mon` and `MON` are the same
day — and a name may be used anywhere a number may be used, including as an
endpoint of a range and as the base of a step.

## 2. Field items

A field is a comma-separated list of items. Each item is one of:

- `*` — every value of the field's domain.
- `?` — allowed **only** in the day-of-month and day-of-week fields, where it
  selects exactly the same values as `*`. In any other field it is an error.
- a value — a single value of the domain.
- `A-B` — a range.
- any of the above followed by `/N` — a step.

Items are independent: a step belongs to the item it is attached to, so
`1-10/2,20` selects 1, 3, 5, 7, 9 and 20. `*`, `?`, ranges and steps may be
mixed freely inside one field.

### Values

A value is a decimal integer, written without a sign: `5` and `05` are the same
value. A value outside the field's domain is an error (`0` in day-of-month,
`60` in minute, `13` in month, `8` in day-of-week). A name that the field does
not define, a name used in a field that has no names, and anything else that is
not a value, a range, `*` or `?` is an error — including an empty item, as in
`1,,2` or a trailing comma.

`L` and `W` are **not** part of this dialect. `L` in the day-of-month field is a
bad value, not "the last day of the month"; it is reported, never planned
around.

### Ranges

`A-B` selects `A`, `A+1`, …, `B`. If `A` is greater than `B` the range **wraps**:
it runs from `A` to the end of the domain and continues from the start of the
domain up to `B`. In the hour field `22-2` is 22, 23, 0, 1, 2; in the
day-of-week field `FRI-MON` is Friday, Saturday, Sunday, Monday. Both endpoints
must be inside the domain; an endpoint outside the domain is reported even when
the rest of the range would be fine. A range with a missing endpoint (`5-`),
an empty endpoint (`-5`, `5-`), or more than one `-` (`1-2-3`) is an error.
Wrapping is a property of a range only: it is never inferred for a list.

### Steps

`/N` keeps every Nth value **of the item's own sequence**, counting from the
item's first value. The step is never re-anchored to the start of the domain:

- `1-30/3` in the minute field is 1, 4, 7, …, 28 — not 3, 6, …, 30.
- `*/5` starts at the start of the domain, so it is 0, 5, 10, …, 55 in the
  minute field and 1, 6, 11, …, 31 in the day-of-month field.
- `V/N`, a single value with a step, is the sequence `V`, `V+N`, `V+2N`, … up to
  the end of the domain: `5/10` in the minute field is 5, 15, 25, 35, 45, 55.
- For a wrapping range the sequence is the wrapped sequence, so `22-2/2` in the
  hour field is 22, 0, 2: the step counts positions in the sequence, it does not
  compare values against a grid.

`N` must be a positive integer written in decimal. `*/0`, `*/-1`, `*/2.5`,
`*/x` and `1-5/` are errors, and so is an item with more than one `/`.

## 3. The day rule

The day of a run is decided by the day-of-month and day-of-week fields together.

A day field is **restricted** when it is written as anything other than `*` or
`?`. That is a property of the text, not of the values the text selects:
`1-31` covers every day of the month, but a day-of-month field written `1-31` is
still restricted and still changes which days run.

- If **both** day fields are restricted, a day qualifies when **either** of them
  matches. This is the classic cron rule: `0 0 15 * MON` runs on the 15th of the
  month *and* on every Monday.
- Otherwise a day qualifies when **both** of them match, which for an
  unrestricted field means the restricted field alone decides. `0 0 * * MON`
  runs on Mondays, `0 0 15 * *` runs on the 15th.

The month and the time of day always have to match. The day rule only chooses
between the days of an already-matching month.

## 4. Next occurrences

`nextOccurrences(expression, from, count = 1)` returns the next `count` instants
of the schedule, ascending, as strings.

- The first instant returned is **strictly after** `from`. An instant that is
  itself an occurrence of the schedule is not returned.
- The walk searches at most **2,922 days** (eight years) after `from`. The
  horizon covers a whole leap cycle, so every schedule that can run at all is
  found from any starting point.
- If `count` instants are not found within the horizon the call raises
  `no-occurrence`. A schedule that can never run — `0 0 31 2 *` asks for
  February the 31st — is **reported**, never searched for forever, and
  `nextOccurrences` never returns a short array or an empty one.
- `count` must be a positive integer.

## 5. Instants and time

- Instants cross the public surface as ISO-8601 strings in UTC:
  `YYYY-MM-DDTHH:mm:ssZ`. That is also the format `nextOccurrences` returns.
- An instant may carry a fractional second, which is **truncated**, not rounded:
  `2024-03-01T12:00:00.900Z` is the instant `2024-03-01T12:00:00Z`.
- An instant may carry an offset (`+05:30`, `-0800`). The offset is honoured and
  the instant is converted to UTC, so `2024-03-01T05:30:00+05:30` and
  `2024-03-01T00:00:00Z` are the same instant.
- An instant written with no zone designator is a **UTC** reading, not a local
  one. The planner never reads the system clock and never reads the system
  timezone; a caller that passes a local wall-clock reading gets UTC arithmetic
  on those numbers, and nothing else.
- A date that does not exist — `2024-02-30`, `2023-02-29`, `2024-04-31`,
  `2024-13-01`, `2024-03-01T24:00:00Z` — is an error. It is never rolled over
  into the following month or day.

## 6. `matches`

`matches(expression, instant)` is true when `instant` is exactly an occurrence of
the schedule — the same answer the walk gives. The two must agree: if
`matches(t)` is true then a walk started anywhere before `t` returns `t`, and if
the walk returns `t` then `matches(t)` is true. A schedule that runs at most
once a minute therefore does not match an instant whose seconds are not `00`, and
a six-field schedule distinguishes the seconds it names.

`matches` returns `false` for a schedule that can never run; it does not raise
`no-occurrence`. It raises for a malformed expression and for a malformed
instant exactly as `nextOccurrences` does — a bad expression is never quietly
answered "no".

## 7. Errors

Every rejection is a `ScheduleError` carrying a `code`:

| code | raised when |
|---|---|
| `field-count` | the expression does not have exactly 5 or 6 fields |
| `value` | an item names something that is not a value of its field — including a range endpoint outside the domain — an empty item, `?` outside the two day fields, or a bad `count` |
| `range` | a range endpoint is missing or empty; an item has more than one `-` or `/`; a step is not a positive integer |
| `instant` | the `from` or `instant` argument is not a valid instant |
| `no-occurrence` | the horizon was exhausted before `count` occurrences were found |
