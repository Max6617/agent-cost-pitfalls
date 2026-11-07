# Audit convention

The convention support and compliance signed off on. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug. Support reads only the audit log when they reconstruct what happened to
an account, a sku or an order, so the log has to be the whole story, told the
same way by every module.

## 1. One event per mutation

Every state change emits **exactly one** event through the shared audit log
that `createShop()` wires in (rule 6). A change that is not in the log did not
happen as far as compliance is concerned, and a change that lands in the log
twice looks like it happened twice. No module keeps a trail of its own.

## 2. The event

An event has **exactly six fields**: `actor`, `action`, `entity`, `id`,
`before`, `after`. No more, no less — in particular there is no timestamp; the
log's order (rule 5) is the only ordering anyone needs.

`actor` is whatever string the caller passed in. `id` identifies the entity
the mutation touched: the account id, the order id, and the **sku** for
inventory and prices. The names are:

| module | entity | actions |
|---|---|---|
| accounts | `account` | `account.create`, `account.update`, `account.deactivate` |
| inventory | `inventory` | `inventory.register`, `inventory.receive`, `inventory.adjust` |
| pricing | `price` | `price.set` |
| orders | `order` | `order.create`, `order.transition`, `order.cancel` |
| catalog | `product` | `catalog.upsert` |

A bulk reprice is a batch of `price.set` mutations and emits one `price.set`
event per update in the batch.

## 3. before / after are deep snapshots

`before` is the entity as it was immediately before the mutation; `after` is
the entity as it is immediately after. The event describes the **completed**
mutation: `before` never contains the requested change, and `after` always
does. For a create, `before` is `null` — there is no earlier state.

Both snapshots are **deep**. The event is history: nothing that happens
afterwards — another mutation of the same entity, or a caller mutating the
record a method handed back to it — may change what an already-emitted event
recorded. What a method returns is the live record; what the log holds is
history.

## 4. Redaction

The policy fields are listed in `src/policy.js` (currently `passwordHash`,
`unitCost`, `cardToken`). Wherever such a field appears inside `before` or
`after` — at any depth, including inside arrays — the log stores the **key**
with the value replaced by the string `"[redacted]"`. The key stays; only the
value is replaced.

Redaction must never reach the live entity. Modules hand the log snapshots,
the log takes ownership of what it is given and scrubs that — which is why
rule 3's deep-snapshot requirement is a rule and not a suggestion. If a live
record ever shows `"[redacted]"` as a field value, something handed the log
the record itself.

## 5. Order

`audit.events()` returns every event, oldest first, in the order the
mutations were applied. A bulk operation applies its changes in the order they
were given, and its events appear in that order.

## 6. Through the shared log

Every module emits through the same log instance, the one `createShop()`
exposes as `shop.audit`. Two shops are independent; one shop has one trail.
