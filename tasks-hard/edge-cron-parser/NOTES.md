# edge-cron-parser

**stratum:** edge-case-dense
**prompt:** "Scheduling has drifted: a job we wrote as every five minutes is firing at the wrong minutes, and a schedule that names both a day of the month and a weekday fires on days nobody asked for and skips the ones we meant. A job that only runs on 29 February disappears once the leap year it was written in is past, and a typo in an expression is answered with "no next run" after the planner has ground through its whole search instead of being rejected outright. Make the planner behave the way docs/schedule-rules.md says it does; the reproductions under test/ are the cases we managed to write down, not the whole acceptance criteria."

The fixture is a plausible planner: everything the visible suite asks for on the
happy path works, and the six defects are all the kind that ship — a step grid
anchored to the wrong origin, a wrap-around that drops its last value, a name
table that is not case folded, a day rule that is applied twice with two
different meanings, a horizon that assumes a year is always enough, and an
instant parser that lets `Date` roll a non-existent date over.

## Sub-problems (each its own hidden test file)

| file | cases | sub-problem | the bug in the fixture |
|---|---|---|---|
| `01-fields` | 4 | expression shape, domains, `?`, unknown tokens | `parse.js` accepts only 5 fields (6 is `field-count`), and `expand.js` checks only the upper domain bound, so `0` in day-of-month and junk like `L`/`1W`/`FUNDAY` (NaN) are accepted in silence |
| `02-steps` | 6 | ranges and steps, including wrap-around | `expand.js` walks a grid anchored at the field minimum instead of the item's first value; the wrapped tail of `A-B` is written `v < end`; a bare `V/N` drops the step; unusable steps are clamped to 1 instead of reported |
| `03-names` | 3 | names, case, day-of-week numbering | `domain.js` looks names up without case folding (`mon`, `jan` -> NaN), and never normalises `7` to Sunday `0`, so `0 12 * * 7` never fires |
| `04-day-rule` | 4 | the day-of-month / day-of-week rule | `walk.js` re-implements the day test as AND while `dayrule.js` (used by `match.js`) implements the documented OR rule |
| `05-walk` | 4 | next-occurrence walking | `walk.js` starts the walk *at* the given instant instead of strictly after it, and its horizon is 366 days, so a leap day four years out is reported `no-occurrence` |
| `06-matches` | 4 | `matches` agrees with the walk | `match.js` ignores the seconds field, swallows a parse failure and answers `false`; `instant.js` never validates the calendar, so `2024-02-30` and `24:00` become the next day |

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 7/10 pass, exit 1 | **4/25 = 16%** |
| "green `test/` and stop" arm (minimal patch: step origin, `7`->Sunday, OR rule) | 10/10 pass, exit 0 | **10/25 = 40%** |
| reference | 10/10 pass, exit 0 | **25/25 = 100%** |

The middle row is a hand-written minimal patch, not a guess: it fixes exactly the
three things the visible reproductions fail on and nothing else. It picks up all
of `04-day-rule`, both step-origin cases in `02-steps`, one numbering case in
`03-names`, and two `matches` cases — which is what the visible suite is designed
to buy. Note that it passes `0 0 31 4 MON` only after `05-walk`'s strictness case
has already failed it: the visible suite never tells you that the walk re-emits
the instant it was given.

`reference/` changes 6 files: `src/{domain,expand,parse,instant,walk,match}.js`.
`src/dayrule.js`, `src/calendar.js`, `src/errors.js`, `src/describe.js` and the
public surface are already right, which is what makes the OR rule a two-file
story rather than a rewrite.

## Interaction cases (a case that needs two sub-problems at once)

- `02-steps` "a step over a wrapped range walks the wrapped sequence": wrapped
  range **and** step origin **and** the missing tail value (`0 22-2/2 * * *`).
- `02-steps` "a range whose start is after its end ...": wrap plus the month
  names (`NOV-FEB`), so the tail value is the only thing that can be missing.
- `02-steps` "a single value with a step": a bare step against a month name
  (`JAN/3`).
- `01-fields` "six field expression": field count plus seconds, and the same
  layout is needed again in `06-matches` before `matches` can be exact.
- `01-fields` "`?` selects the whole domain in the day fields": `?` is a value of
  two fields only, and it must **not** count as a restriction, or `? * MON`
  degenerates into "every day".
- `04-day-rule` "the day rule holds across a month that has no 31st": the OR rule
  across a month boundary, where April has no 31st and May does.
- `04-day-rule` "a day field that covers its whole domain is still restricted":
  the OR rule plus the lexical definition of "restricted" (`1-31 * WED` runs
  every day).
- `05-walk` "a schedule that can never run is reported, one that only looks
  impossible is not": `0 0 31 2 *` must raise `no-occurrence` while
  `0 0 31 4 MON` must return April's Mondays — the same shape, opposite answers,
  decided by the day rule.
- `05-walk` "a leap day schedule ...": the leap rule plus the horizon, since the
  next 29 February is 1,461 days out.
- `06-matches` "matches accepts an instant the walk returns for a day the day
  rule added": `matches` and the walk must agree on a day the OR rule adds.

## Guards (pass on the untouched fixture on purpose) — 4 of 25

- `02-steps` "a step over a whole domain starts at the start of that domain"
  (`*/5`, `0 */6`, `0 0 */5`): the classic mainline, and the one place the
  fixture's grid is accidentally right.
- `04-day-rule` "with one day field unrestricted the other one alone decides".
- `05-walk` "a schedule walks out of the year it starts in".
- `06-matches` "matches never claims a day the schedule cannot reach" (leap day,
  a never-firing schedule, an offset-bearing instant and a bare UTC instant).

## Deviations from the brief, and why

- **"Inverted range" is defined as a wrap, not an error.** The brief asks for
  wrap-around (`22-2`) *and* for inverted ranges to be a documented error; those
  are the same syntax, so `docs/schedule-rules.md` pins the semantics instead:
  `A > B` wraps, and the documented `range` errors are the shape ones (missing
  or empty endpoint, more than one `-` or `/`, a step that is not a positive
  integer). An endpoint outside the domain is documented as a `value` error.
- **`L` and `W` are not implemented.** `?` is defined (day fields only, as `*`),
  `L`/`W` are explicitly documented as not part of the dialect and are rejected
  as values. That is the "typo" symptom: the fixture answers `L` with
  "no next run" after walking its horizon.
- **Six fields are `second minute hour day-of-month month day-of-week`**, not a
  year field, so a six-field expression is exactly a five-field one with a
  leading seconds field.
- **No local-time code path exists anywhere**, including in the buggy fixture, so
  the suite cannot depend on the machine's timezone: offsets are honoured, a bare
  instant is UTC, and all arithmetic is `Date.UTC`/`setUTCFullYear` based.

## Notes for whoever reads the failures

`TASKFAIL` names are the case titles, and they are deliberately specific enough
to tell a near-miss from a miss: 21 of 25 cases fail on the untouched fixture and
the failures are spread 4/5/3/3/3/3 across the six files, so a partial solution
moves one or two files at a time rather than the whole denominator at once.
