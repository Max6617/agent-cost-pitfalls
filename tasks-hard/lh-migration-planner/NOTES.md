# lh-migration-planner

**stratum:** long-horizon
**prompt:** "Planning a release has stopped being trustworthy: the plan sometimes schedules a migration in front of the migration it depends on, a release whose tickets require each other never comes back with an answer, and a destructive operation can be planned without anyone acknowledging it. When a run dies half way and we re-plan from what the runner recorded, it either redoes a step that already succeeded or drops one that never ran, one of our backfills loses the tail of its rows, and the estimated times no longer add up to the schedule we publish. Make the planner behave the way docs/ says it does - the tests under test/ are the reproductions we managed to write, not the whole acceptance criteria."

The fixture is a schema-migration planner: it reads declared migrations, checks
them, orders them, sizes them and writes down a plan and a rollback plan. It never
touches a database, never reads a clock and never measures anything - every
duration is computed from what a ticket declares and from
`config/planner.config.json`.

## Sub-problems (each its own hidden test file)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-order` | plan order: dependencies first, declared order as the tie-break, missing dependencies fatal | `order.js` sorts by the declared position of the migration's *earliest* prerequisite, which is right until a later-declared migration is a prerequisite of an earlier one |
| `02-cycles` | a cycle is detected wherever it is, named in dependency order, and reported ahead of anything else | `graph.js` walks only from the first declared migration and reports the single node the walk came back to |
| `03-danger` | destructive operations need an acknowledgement that names *that* operation, per ticket or for the whole plan | `danger.js` matches the catalogue case-sensitively, accepts any acknowledgement without comparing it, and matches plan-wide sign-offs against the step id instead of the operation kind |
| `04-batches` | `ceil(rows / batchSize)` batches with a short last one; a lock window over the budget is flagged | `batches.js` rounds the division to the nearest batch (dropping the tail rows); `locks.js` flags a window equal to the budget |
| `05-resume` | resume from a run record: applied migrations are never re-emitted, the failed one is planned again | `resume.js` treats `applied.length + 1` as a position and filters the plan by prefix, so the failed migration disappears |
| `06-estimate` | the documented cost formula, table preparation once per table, rollback = plan reversed minus the irreversible | `estimate.js` charges the table setup inside every step *and* once per step that names a table; `rollback.js` neither omits irreversible steps nor reports them |

Eight modules have to change and no single edit fixes more than one sub-problem.
The fixes are small; the work is in reading `docs/planning-rules.md` and
`docs/operations.md` and reconciling them with the code.

## Measured

| arm | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 9/14 pass, exit 1 | **3/25 = 12%** |
| reference | 14/14 pass, exit 0 | **25/25 = 100%** |
| fixes that only green the visible suite | 14/14 pass, exit 0 | **14/25 = 56%** |

The third row is measured, not estimated: take the reference `order.js`,
`batches.js` and `resume.js`, normalise the operation kind in `danger.js` and
count distinct tables in `estimate.js`, and change nothing else. That is a
plausible "make the reproductions pass" arm and it lands mid-band, which is where
the partial credit lives.

Reference changes 8 files: `src/{order,graph,danger,batches,locks,resume,estimate,rollback}.js`.

## Guards (pass on the untouched fixture on purpose)

Three, and only three - the grader reports 3/25 on the broken fixture and these
are the three:

- `01-order`: a dependency nobody declared is reported, before the cycle and the
  destructive checks get a say (the documented precedence).
- `02-cycles`: migrations that merely rejoin are a diamond, not a cycle.
- `05-resume`: a run that finished has nothing left to plan.

They stop a rewrite from turning a false-positive cycle detector, an over-eager
resume filter or a precedence change into free points.

## Interaction cases (7 of 25)

Cases that need two sub-problems right at once, or a behaviour no visible test
touches. Each one fails on the broken fixture and on a solution that fixes only
one of its two halves:

| case | needs |
|---|---|
| `02-cycles`: a cycle is reported ahead of a destructive step nobody acknowledged | cycle detection over the whole graph **and** the documented precedence (a release that cannot run in any order is not a release that wants an acknowledgement) |
| `03-danger`: an acknowledged destructive backfill is flagged and batched like any other | case-insensitive catalogue **and** `ceil` batches (20500 rows at 5000 is five batches) |
| `03-danger`: an acknowledged destructive step still prepares its table once | case-insensitive catalogue **and** distinct-table setup |
| `04-batches`: the lock budget flags what is over it, not what is exactly on it | strict budget comparison **and** the exact step estimate (no table setup inside a step) |
| `05-resume`: a batched step that failed is planned again from its first batch | the resume filter **and** the batch expansion |
| `06-estimate`: an irreversible step is left out of the rollback and reported | the rollback rule, which no visible test touches at all |
| `06-estimate`: the rollback undoes the plan order, not the ticket order | the plan order **and** the rollback built from it |

The other 18 cases are single-sub-problem, so a solution that gets one
sub-problem right still moves its own file: the gradient is intact.

## Where partial credit comes from

- Fix the visible suite only: 56% (14/25). The visible reproductions are the easy
  end of ordering, batches, the dangerous-operation case, resume and the setup
  total; they say nothing about cycles, the plan-wide sign-off, the lock
  boundary, the estimate formula or the rollback.
- Fix ordering, cycles and danger but not the arithmetic: 18/25.
- The last case to fall is `06-estimate`'s rollback, which needs both the plan
  order and the rollback built from it.

## Deliberate frees and traps

- `05-resume`'s "a migration from an older release in the record is ignored" is
  free for a correct implementation and impossible for the index-based one: an
  unknown id inflates the count and eats the next step.
- `04-batches`'s boundary case (250000 rows = exactly 50 batches = exactly the
  2000 ms budget) is the only place the `>=` shows up; every other lock case
  passes either way, so the visible suite cannot find it.
- `02-cycles`'s rotation rule (the reported cycle starts at its earliest-declared
  member) is stated in `docs/planning-rules.md` section 3 and nowhere else.
- `03-danger`'s plan-wide sign-off is documented in the README, the rules and
  section 5; in the fixture the option is plumbed through and compared against
  the wrong field, which makes it a wrong-field bug rather than a missing feature.

## Anything I am unsure about

- `04-batches` has only three cases because the hidden budget is 25 and the
  interaction cases in `02`/`03` were worth more; the lock-budget boundary lives
  inside `04`'s second case together with the step estimate.
- The plan-wide sign-off is matched against `step.id` in the fixture. An agent
  that reads "acknowledgements" as "the migrations I signed off" can talk itself
  into the fixture's reading, but `docs/planning-rules.md` section 5 gives the
  example `['drop-table']` and `docs/operations.md` calls the column "kind", so
  the contract is unambiguous even if the intent is arguable. A solution that
  accepts both readings fails `03`'s third case, which is the intended cost.
- `estimate.js` carries two bugs (per-step setup, and setup counted per step
  rather than per distinct table). Fixing the first alone greens `06`'s first
  case only; that is deliberate, but it does mean two cases share a module.
