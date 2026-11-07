# repo-wide-date-intervals

stratum: repo-wide

One documented convention - half-open `[start, end)` intervals over integer
day numbers, in `docs/interval-convention.md` - that every module implements
a little wrong in its own way. The intended sweep is onto the shared
`src/intervals.js` helpers, which are correct everywhere except `merge`.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-bookings` | touching stays do not clash; a refusal names clashing booking ids | `src/bookings.js` hand-rolls an inclusive-both overlap, and the refusal payload returns guest names instead of booking ids |
| `02-availability` | the checkout day is a free day | `src/availability.js` uses an inclusive-end `covers` check, duplicated inline in both `freeDays` and `firstAvailable` |
| `03-trials` | a trial covers exactly `lengthDays` days | `src/trials.js` keeps the trial active through `endsOn` and counts `daysLeft` inclusive (`end - today + 1`) |
| `04-billing` | only the days inside the cycle bill | `src/billing.js` intersects inclusive-both and counts `last - first + 1`, so every usage bills one day too many |
| `05-reports` | touching stays merge into one busy period; coverage counts are half-open | `src/intervals.js#merge` refuses adjacency (it reuses `overlaps`), which `src/reports.js#busyPeriods` inherits; `busiestDay` hand-rolls its own inclusive-end coverage check |
| `06-campaigns` | a stay outside the plan window has no plan window | `src/campaigns.js` never normalises the clamped window: disjoint stays yield an inverted interval and negative plan nights, touching stays a non-null zero-width window |

Seven bugs across six modules. `src/reports.js`'s merge bug physically lives
in the shared `src/intervals.js`, so a sweep that only touches the leaf
modules leaves the reports file red.

## guards (pass on the untouched fixture)

- `01-bookings > the same days on a different room never clash`
- `03-trials > a trial that has not started is inactive with its full length ahead`
- `06-campaigns > the nights inside the window price at the plan rate`

3 guards. Floor: 3/24 = 13%.

## interaction cases

- `01-bookings > back-to-back stays chain into a single busy period` — needs the bookings fix to build the chain and the merge fix to fuse it
- `02-availability > two back-to-back bookings leave the second checkout day open` — bookings + availability
- `03-trials > the last trial day is covered, and a cycle equal to the trial bills exactly its length` — trials + billing on the same boundary day
- `04-billing > a promo prices the middle of a longer stay and the following usage is not double-billed` — billing + campaigns
- `05-reports > a stay inside another stay does not break the chain around it` — containment + adjacency, behaviour the visible suite never touches
- `06-campaigns > a stay that only touches the window shares no days with it` — touching clamp; the visible suite never calls `effectiveWindow`
- plus `01-bookings > a refusal names the clashing bookings by id`, `02-availability > the first open stretch may begin on a checkout day` and `05-reports > the busiest day is not the day one guest leaves and the next arrives`, all behaviour the visible suite never touches

## measured

- untouched fixture: 3/24 hidden cases (13%); visible suite 2/8 pass, 6 fail
- reference: 24/24 hidden cases; visible suite 8/8 pass
- reference changes 7 files: `src/{intervals,bookings,availability,trials,billing,reports,campaigns}.js`
