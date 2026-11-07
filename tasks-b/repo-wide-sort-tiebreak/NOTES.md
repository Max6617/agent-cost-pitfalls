# repo-wide-sort-tiebreak

stratum: repo-wide

prompt: support tickets about the same row appearing in different places on
different screens; docs/listing-order.md is the agreed order; the visible
tests are reproductions, not the whole acceptance criteria.

Domain: `opsboard`, a back-office listing service. Five screens (team board,
fulfilment queue, account directory, search box, operations console) all list
rows of the shape `{ id, priority, createdAt, ... }`. `docs/listing-order.md`
pins ONE order — priority DESC, createdAt ASC, id ASC, nulls last in every key
in both directions, listings pure (new array, input untouched), output
independent of arrival order — and `src/ordering.js` already exports the
shared comparator. Every screen hand-rolls its own sort instead, and each gets
it wrong in its own way. `createdAt` is intake data; nothing reads a clock.

## sub-problems

| hidden file | screen | the bug in the fixture |
|---|---|---|
| `01-tasks` | `src/tasks.js` | sorts priority ASCENDING ("P1 on top") instead of DESC |
| `02-orders` | `src/orders.js` | sorts the caller's array in place (comparator itself is right) |
| `03-users` | `src/users.js` | nulls sort FIRST in every key ("incomplete profiles float to the top") |
| `04-search` | `src/search.js` | comparator omits the id tie-break, so full ties keep arrival order |
| `05-admin` | `src/admin.js` | sorts createdAt DESCENDING ("newest activity leads") |
| `06-cross-module` | all five | same batch through every screen; composition; arrival-order independence |

The fix is the sweep the docs describe: every screen delegates to
`sortListable` from `src/ordering.js` (search filters first, then sorts).
Reference changes 5 files: `src/{tasks,orders,users,search,admin}.js`.

## guards (pass on the untouched fixture — 4)

- `02-orders`: *the queue is in the shared listing order* — the orders
  comparator is fully correct; only the mutation is wrong.
- `03-users`: *accounts with every key set sort by priority, then age, then
  id* — no nulls in the input, so nulls-first never triggers.
- `04-search`: *hits with distinct keys come in the shared listing order* — no
  full (priority, createdAt) ties, so the missing id key never shows.
- `05-admin`: *entries created in the same instant fall back to priority,
  then id* — all createdAt equal, so the DESC flip never shows.

## interactions (9)

- `01-tasks` case 3: distinct priorities + a full tie + an untriaged (null)
  card — all three keys and a null at once.
- `02-orders` case 4: nulls and a full tie sorted correctly AND input left in
  arrival order (comparator x purity).
- `03-users` case 4: an unprioritised group ordered by age and id with the
  undated account last of all (nulls in two keys at once).
- `04-search` case 3: same hits in two arrival orders must come back
  identical (behaviour the visible suite only touches per-module).
- `04-search` case 4: query filter first, then the full three-key order with
  a null on the survivors.
- `05-admin` case 3: undated entry at the bottom of its band while dated ones
  run oldest-first (nulls x key direction).
- `06-cross-module` case 1: one batch (ties + null priority + null createdAt)
  through all five screens, identical id sequence, batch untouched after.
- `06-cross-module` case 2: queue output fed to the board; the original batch
  keeps arrival order (composition x purity).
- `06-cross-module` case 3: every screen returns the canonical order for a
  batch and for its reverse (arrival-order independence across modules).

## measured

Gate: `node tasks-b/_tools/verify-task.mjs repo-wide-sort-tiebreak` → **ok**

- untouched fixture: visible **0/10 pass (exit 1, 10 failing)**, hidden **4/22 = 18%**
  (the 4 guards, nothing else)
- reference overlay: visible **10/10 pass (exit 0)**, hidden **22/22 = 100%**
- fixture shape: 13 text files, 495 lines
- hidden suite: 22 authored cases across 6 files, no `.only/.skip/.todo`,
  no subtests, no test-generating loops

Visible suite: 10 cases, two per module, each the easiest reproduction of its
module's deviation; all 10 fail on the untouched fixture.

A solution that greens the visible suite has demonstrated one fix per module
but is not measured separately here; partial credit lives in the module files
(each fix moves its own file's cases) plus the cross-module file, which only
goes green when every screen, the purity rule, and the arrival-order rule all
hold at once.
