# repo-wide-audit-events

**stratum:** repo-wide
**prompt:** "Compliance pulled last week's audit trail and it's a mess. Some changes never make it into the trail at all, one part of the shop writes its events with different field names than everything else, and half of what is there can't be trusted: the before snapshot of a price change shows the price it was changed to, order status changes record a before that already has the new status, a bulk reprice comes out back to front, and values policy says must be scrubbed are sitting in the clear inside nested details. The convention is written down in docs/audit-convention.md — make every module follow it. The reproductions under test/ are the cases we managed to pin down, not the whole acceptance criteria."

ONE convention (docs/audit-convention.md: every mutation emits
`{actor, action, entity, id, before, after}` through the shared log; deep
snapshots; policy fields redacted at any depth; order preserved) implemented
wrong in five different ways across five modules.

## sub-problems (each its own hidden test file)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-coverage` | every mutation emits exactly one event | `accounts.js` — `update()` and `deactivate()` emit nothing (create does) |
| `02-shape` | exactly the six documented fields | `inventory.js` — hand-rolls `previous`/`current` instead of `before`/`after` |
| `03-snapshots` | deep snapshots; later mutation must not leak | `pricing.js` — `set()` emits the live record as `before` |
| `04-redaction` | policy fields redacted at any depth, key stays | `audit.js` — the emitter scrubs only top-level keys (nested `cardToken`, `unitCost` inside arrays leak) |
| `05-ordering` | the log preserves application order | `pricing.js` — `bulkSet()` drains its pending queue with `pop()` (LIFO) |
| `06-before-after` | before = state before, after = state after the completed mutation | `orders.js` — `transition()`/`cancel()` build `before` from the requested change and emit the live record as `after`, before the write |

The redaction bug lives in the shared emitter (`audit.js`), the module the
prompt does not hint at; its symptom shows up in inventory and order events.

## guards (the 4 cases that pass on the untouched fixture)

- *creating an account emits a well-formed event with no earlier state* (01)
- *inventory mutations reach the shared log under the documented names* (02) —
  hand-rolled shape, but action/entity/id and the shared log are right
- *a catalog upsert keeps a stable snapshot of a nested document* (03) — the
  catalog module is the one module that never diverged
- *cancelling an order leaves the live payment details alone* (06) — passes
  untouched because the shallow scrubber never reaches the nested token, and
  **fails** on the naive half-fix that makes scrubbing deep without fixing
  orders' shared references (measured: audit.js-only overlay scores 6/23 and
  this case is among the failures). It is the guard against the naive fix.

## interaction cases (8)

- 01 *mixed workflow*: coverage x ordering across modules
- 02 *supplier cost redacted in both snapshots*: shape x redaction (needs both fixes)
- 03 *caller mutates the returned record*: snapshots x post-emit mutation
- 03 *redacting a snapshot never redacts the live price*: snapshots x redaction
- 04 *changed password hash never reaches the trail*: redaction x coverage
- 05 *single updates and a bulk reprice interleave*: ordering x snapshots (needs both fixes)
- 06 *second status change does not rewrite the first event*: before/after x mutation history
- 06 *cancelling leaves live payment details alone*: the anti-naive guard above

## measured (node tasks-b/_tools/verify-task.mjs repo-wide-audit-events)

- untouched fixture: visible 0/10 (exit 1), hidden **4/23 = 17%**
- reference: visible 10/10 (exit 0), hidden **23/23 = 100%**
- fixture: 18 text files, 647 lines
- reference changes 5 files: `src/{accounts,audit,inventory,orders,pricing}.js`

Partial-fix spot checks: orders.js alone scores 7/23 (the 4 guards + exactly
its own 3 cases); audit.js alone scores 6/23 (3 guards + the 3 redaction-only
cases, with the anti-naive guard firing).

A solution that greens only the visible suite still faces the hidden
interaction cases: the mutate-after-emit snapshot read, redaction inside
arrays, the bulk/single interleave, and the two-transition history case.
