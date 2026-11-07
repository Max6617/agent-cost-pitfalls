# repo-wide-status-lifecycle

stratum: repo-wide

One documented lifecycle (`docs/status-lifecycle.md`): a canonical status
set with a transition map, legacy alias spellings accepted on read with the
canonical spelling emitted on write, and illegal transitions raising a
documented error. A correct shared `src/lifecycle.js` exists; each board
(orders, tickets, subscriptions, shipments) and the weekly rollup each
deviate from it in their own way. The work is sweeping every module onto
the shared lifecycle.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-orders` | canonical emitted on write | `orders.js` validates spellings on the way in but stores the status (and the transition target) as received, so `get`/`all` emit legacy spellings and a normalised `list` filter never matches an aliased record |
| `02-tickets` | the documented transition map | `tickets.js` checks a hand-rolled map: allows `open -> resolved`, `closed -> open` (skipping `reopened`) and `cancelled -> open`; forbids the legal `resolved -> reopened`; and compares the transition target raw, so a legacy target spelling always throws |
| `03-subscriptions` | legacy accepted on read | `subscriptions.js` accepts canonical spellings only — aliases are refused at add, as transition targets, and as list filters |
| `04-shipments` | the documented error contract | `shipments.js` throws a generic `Error` (no `code`, no canonical `from`/`to`) instead of `IllegalTransitionError`, and its flow table forbids the legal `on-hold -> in-progress` resume |
| `05-summary` | one vocabulary in the rollup | `summary.js` groups under its own local spellings (`shipped`, `done`, `paused`), buckets unknown strings instead of throwing `UnknownStatusError`, and counts `active` as total minus closed (cancelled stays active) |
| `06-cross-board` | interactions across boards | cases combining the above: rollup over several boards' output, the full reopened path on legacy spellings, the same journey taken on all four boards |

`src/lifecycle.js` itself is correct — it is the target the modules are
swept onto — so a wholesale rewrite of it is wasted work, and the guards
punish breaking it.

## guards (4 — pass on the untouched fixture)

- `01-orders` *the canonical flow works end to end* — canonical-only add,
  transition and filter; the broken orders board gets this right.
- `03-subscriptions` *a spelling nobody knows is still refused* — guards
  against "accept anything" over-normalisation.
- `04-shipments` *an unknown target spelling is refused as unknown, not
  illegal* — the broken board already normalises targets.
- `05-summary` *a canonical export rolls up as written* — the broken rollup
  handles canonical-only input correctly.

Confirmed by the grader's TASKFAIL list: exactly the other 20 cases fail on
the untouched fixture.

## interactions (9)

`01` legacy target stored canonical (alias × write), `01` filter matching
aliased records (alias × filter), `02` legacy transition target (alias ×
map), `03` legacy target / legacy filter (alias × read paths), `04`
canonical `from`/`to` on the error for a legacy target (alias × error
contract), `06` all three cases (rollup across boards; reopened path on
legacy spellings; one journey across all four boards).

## measured (verify-task.mjs)

- untouched fixture: visible 0/10 pass (exit 1), hidden **4/24 = 17%**
- reference: visible 10/10 pass (exit 0), hidden **24/24 = 100%**
- hidden suite: 24 authored cases across 6 files
- fixture: 18 text files, 684 lines
- reference changes 5 files: `src/{orders,tickets,subscriptions,shipments,summary}.js`
