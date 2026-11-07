# Migration planning rules

The rules the release process agreed on. `src/` is the implementation; where the
two disagree, this document is right and the code is a bug.

The planner never touches a database. It reads what the change tickets declare,
decides whether the release can run, and writes down what would happen.

## 1. What a migration declares

```js
{
  id: 'm-0042',                    // unique, generated, always lower-case
  requires: ['m-0007'],            // ids that must have run first; may be empty
  operation: { kind: 'backfill', table: 'orders', column: 'region' },
  rows: 20500,                     // rows the statement touches; omit for DDL
  batchSize: 5000,                 // rows per batch; omit to use the configured default
  reversible: true,                // default true
  acknowledgement: 'drop-column',  // see section 5; only destructive operations need one
}
```

Operation kinds come from the ticket export, which preserves whatever case the
author typed, so a kind is matched **case-insensitively** and surrounding
whitespace is ignored. Migration ids are generated and are compared exactly.

`operation.table` names the table the statement works on. A few operations
(`create-extension`, `analyze`) name no table at all.

## 2. Dependencies

`requires` lists the migrations that must have run before this one. Dependencies
are transitive: if `b` requires `a` and `c` requires `b`, then `c` runs after `a`
whatever the tickets say.

Every id in a `requires` list must name a migration that the same release
declares. An id that nobody declared is a **missing dependency**: the release
cannot be planned at all, whatever else is wrong with it. The plan reports each
offending migration with the id it could not find, in declared order, and emits
no steps. Nothing is ever planned around a dependency the planner cannot see.

## 3. Cycles

If the dependency graph contains a cycle there is no order in which the release
can run, so the plan reports the cycle instead of a plan. It emits no steps, and
it does not stop half way: a cycle behind the first migration is as fatal as one
in front of it.

`plan.cycle` names the migrations in **one** cycle, in dependency order: each one
requires the next, and the last requires the first. The list starts at the
migration in that cycle that was declared first, so the report is stable. When a
release contains more than one cycle, the one whose earliest-declared member was
declared first is the one reported.

A set of migrations that merely rejoin (`d` requires both `b` and `c`, which both
require `a`) is not a cycle.

## 4. Plan order

The plan order is the order the steps run in. Repeatedly take the migration that
was declared first among those whose `requires` are all already placed, until
every migration is placed. Ties therefore always resolve to declared order, and a
migration is never placed before something it requires, however late that
something was declared.

```
declared:    b (requires a), a, c (requires b)
plan order:  a, b, c
```

## 5. Destructive operations

`docs/operations.md` lists the operation catalogue. The destructive ones cannot
be undone by the rollback plan and rewrite the table while they run, so the
release process wants them acknowledged before they are planned:

- the migration itself acknowledges its operation with
  `acknowledgement: 'drop-table'`, or
- the whole plan acknowledges the **operation** once, by kind, with
  `planMigrations(migrations, { acknowledgements: ['drop-table'] })`.

An acknowledgement names the operation it acknowledges. An acknowledgement for a
different operation is not an acknowledgement of this one, and neither is an
empty string. Kinds are matched the same way everywhere: case-insensitively,
whitespace-insensitively.

A destructive migration that nobody acknowledged blocks the release: the plan
fails with status `unacknowledged-destructive`, names every offending migration
in plan order, and emits no steps. A destructive migration that was acknowledged
is planned normally, with a warning, so that the release notes can list it.

## 6. Batches

A backfill holds the write lock while it runs, so a statement that touches many
rows is applied in batches. A migration that declares `rows` is split into
`ceil(rows / batchSize)` batches, where `batchSize` is the migration's own or, if
it does not declare one, the configured default. The batches are applied in
order and the last one is usually short: 20500 rows at 5000 rows per batch is
five batches, the last of which touches 500 rows. Rounding the division to the
nearest batch loses those 500 rows, which is how a release ends up with a
half-backfilled column.

A migration with no `rows` (or `rows: 0`) is not batched at all: `batches` is
empty and no batch overhead is charged.

## 7. Lock windows

Each batch holds the write lock for `batchLockMs`. A step's lock window is
therefore `batches.length * batchLockMs`; a step with no batches holds no window
of its own.

A step whose lock window is **greater than** `lockBudgetMs` is reported with a
warning (`long-lock`) and planned anyway — the release window has to be widened,
that is all. A step whose lock window is exactly the budget is within it and is
not reported.

## 8. Estimates

Nothing in the planner measures anything, and nothing reads a clock: the cost of
a migration is a function of what it declares. Durations are integer
milliseconds, and the arithmetic never leaves the integers.

```
rowsMs           = rows > 0 ? ceil(rows / rowsPerSecond) * 1000 : 0
step.estimateMs  = overheadMs + batches.length * batchOverheadMs + rowsMs
setupMs          = tableSetupMs * (number of distinct tables named by the steps)
stepsMs          = sum of the steps' estimateMs
totalMs          = setupMs + stepsMs
```

Row work is charged in whole seconds and rounded up.

Preparing a table — the metadata lock and the planning statistics — happens once
per table per plan, however many migrations touch it. It is charged once, in
`setupMs`, and it is **not** part of a step's own estimate.

## 9. The plan

`planMigrations(migrations, options)` returns:

```js
{
  status: 'ok',                 // ok | missing-dependency | cycle | unacknowledged-destructive
  steps: [ /* step, below */ ],
  skipped: [],                  // ids that were not planned; a resume fills this in
  resumedFrom: null,            // the run record this plan was resumed from
  cycle: null,                  // the ids of the reported cycle, in order
  errors: [{ code, migration, detail }],
  warnings: [{ code, migration, detail }],
  estimate: { setupMs, stepsMs, totalMs },
  rollback: { steps: [...], skipped: [...] },
}

step = {
  id,                           // migration id
  requires,                     // as declared
  kind,                         // operation.kind, as declared
  table,                        // operation.table, or null
  rows,                         // as declared, or null
  batches: [{ index, rows }],   // section 6
  destructive,                  // section 5
  acknowledgement,              // as declared, or null
  reversible,
  lockMs,                       // section 7
  estimateMs,                   // section 8
}
```

`code` is the status it caused (`long-lock` and `acknowledged-destructive` are
warnings and have their own codes). `migration` is the id the entry is about.
`errors` and `warnings` are both listed in plan order.

When `status` is not `ok` there is no plan: `steps` is empty, the estimate is
zero, the rollback is empty and there are no warnings. Exactly one of
`missing-dependency`, `cycle` and `unacknowledged-destructive` is reported, in
that order of precedence.

`options.config` overrides any configuration value for one call.

## 10. Rollback

`plan.rollback` undoes the plan: the same steps in reverse order, so the last
change is the first one undone, with the fields of each step intact. A step whose
migration is not `reversible` has no undo, so it is left out and listed in
`plan.rollback.skipped`, in **plan order**, for the release notes.

## 11. Resuming a run

A runner applies the steps in order and writes down what it got through.

```js
const plan = planMigrations(migrations)
const run = applyPlan(plan, { failAt: 'm-0042' })
// run = { applied: ['m-0011', 'm-0013'], failed: 'm-0042' }
```

`applyPlan` walks the plan and stops at `failAt`: everything before it completed,
`failAt` itself was attempted and did **not** complete. With no `failAt`, every
step completes and `failed` is `null`. A `failAt` that is not in the plan is
ignored.

`resumeFrom(run, migrations, options)` plans the work that is left:

- the declared set is unchanged, so every dependency still resolves;
- every id in `run.applied` is left out of `steps` and listed in `skipped`, in
  plan order — a migration that already ran is never planned again;
- the migration named by `run.failed` did not complete, so it is planned again,
  in full: no progress inside a step is recorded, so a batched step that died on
  its fourth batch comes back with all of its batches;
- the rest keep their plan order;
- ids in `run.applied` that this release does not declare are ignored; they come
  from an older plan.

The resumed plan has the shape of section 9, with `skipped` and `resumedFrom`
filled in and an estimate that covers the steps it emits.
