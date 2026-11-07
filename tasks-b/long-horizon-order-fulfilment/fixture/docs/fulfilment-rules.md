# Fulfilment rules

The rules the warehouse and the storefront signed off. `src/` is the
implementation; when the two disagree, this document is right and the code is a
bug.

## 1. The event log

Everything the service knows comes from an event log. An event is a plain
object:

```js
{
  id: 'e-0007',                     // unique, stable, assigned upstream
  at: '2024-03-01T09:04:00Z',       // when it happened; injected, the service never reads a clock
  order: 'o-1042',
  type: 'ship',                     // created | paid | pick | pack | ship | deliver | cancel | return
  // type-specific fields: items on created, sku + qty on ship,
  // sku + qty + condition on return
}
```

The service holds the log and derives every answer by replaying it in
**canonical order**: ascending `at`, ties broken by ascending `id`. Every `at`
is an ISO-8601 UTC timestamp, so string order is chronological order. The order
events arrived in — the order `apply` and `applyAll` were called in — is
irrelevant: two services holding the same events give the same answers.

`apply` / `applyAll` return one `{ id, status }` per event, in the order given.
The status vocabulary:

| status | meaning |
|---|---|
| `applied` | the event did its work |
| `applied-as-return` | a cancel that arrived after the first ship; see §4 |
| `duplicate` | this event id has been here before; see §6 |
| `unknown-order` | the order was never created |
| `out-of-sequence` | the event violates §2, or the order is cancelled |
| `over-quantity` | the event names more units than are outstanding; see §3 and §5 |
| `unknown-item` | the sku is not on the order |

## 2. Orders and the legal sequence

An order is created with `items: [{ sku, qty, price }]`, where `price` is
integer cents per unit. Its status is derived, never stored:

| status | when |
|---|---|
| `created` | exists, not yet paid |
| `paid` | paid, not yet picked |
| `picked` | picked, not yet packed |
| `packed` | packed, nothing shipped yet |
| `partially-shipped` | some units shipped, some outstanding |
| `shipped` | every created unit has shipped |
| `delivered` | delivered |
| `return-open` | a cancel arrived after the first ship (§4) |
| `closed` | a return-open order whose shipped units have all come back (§5) |
| `cancelled` | cancelled before anything shipped (§4); terminal |

The legal sequence. An event is `out-of-sequence` unless its row holds:

| event | legal when |
|---|---|
| `created` | the order id is new |
| `paid` | the order is created, not yet paid |
| `pick` | paid, not yet picked |
| `pack` | picked, not yet packed |
| `ship` | packed; see §3 for quantities |
| `deliver` | packed, and every created unit shipped; once |
| `cancel` | see §4 |
| `return` | see §5 |

A cancelled order accepts no further events: everything after is
`out-of-sequence`. A delivered order can no longer cancel (the answer is
`out-of-sequence`); units come back through `return`.

## 3. Shipping and stock

`ship { sku, qty }`. The warehouse holds on-hand stock per sku, given when the
service is created; a sku the warehouse never heard of holds zero.

The number of units a ship event actually moves is
**`min(qty, outstanding, on-hand)`**, where outstanding = created − shipped for
that sku on that order. Partial shipments are normal: whatever could not ship
stays **backordered**, and a later ship event covers it when stock allows. A
ship that moves zero units is still `applied` — the attempt is on the log and
the units remain backordered.

A ship for a sku with nothing outstanding (everything already shipped) is
`over-quantity`. A ship for a sku that is not on the order is `unknown-item`.

Shipping decrements on-hand. There is no reservation step: pick and pack are
order-level markers and do not move stock.

## 4. Cancelling

A cancel is a cancellation only while **nothing has shipped**: the order
becomes `cancelled` and, if it was paid, the full paid amount is refunded at
once. Cancelled is terminal.

Once any unit has shipped, the goods are out the door and the order cannot
cancel. The cancel is still accepted, but as a **return flow**: its status is
`applied-as-return`, the order becomes `return-open`, and **no money moves** —
refunds happen unit by unit as `return` events arrive. A return flow does not
stop the outstanding units from shipping, and it does not block `deliver`.

## 5. Returns

`return { sku, qty, condition }`. The customer can only send back what is
still out there: `qty` may not exceed shipped − returned for that sku, or the
event is `over-quantity` and nothing changes.

Every accepted return refunds `qty × price` (the price on the order's
`created` items), whatever the condition.

Whether the units go back on the shelf depends on the condition the customer
stated:

| condition | disposition |
|---|---|
| `unopened` | restocked |
| `resalable` | restocked |
| `damaged` | written off |
| `defective` | written off |
| anything else | written off |

Only restocked units increase on-hand. When a `return-open` order has had
every shipped unit come back, it becomes `closed`.

## 6. Duplicates

An event id is applied **once, ever**. A second arrival of the same id is
`duplicate` and changes nothing — in the same batch, in a later batch, or with
a freshly stamped `at` (a redelivery is still the same event; the id is what
matters). Even a rejected first arrival consumes the id: rejected work is
retried by sending a **new** event id, never by resending the old one.

## 7. Reconciliation

`report({ through })` answers "units and money as they stand after the first
`through` events **of the canonical log**" (§1) — with `through` omitted,
after the whole log. The prefix counts envelopes, applied or not. Shape:

```js
{
  events: 12,                        // envelopes in the prefix
  onHand: { SKU: 4 },                // per sku, non-zero only, sorted
  shipped: { SKU: 9 },               // units shipped, all orders
  backordered: { SKU: 2 },           // created - shipped, over paid orders that are not cancelled
  money: { collected: 5000, refunded: 700, net: 4300 },
}
```

`onHand`, `shipped` and `backordered` carry only skus whose value is non-zero,
keys sorted ascending. `net` is collected − refunded. The report is a pure
function of the log: the same log always produces the same report, however the
events arrived.

## 8. Money

All money is integer minor units (cents). Prices arrive on the `created`
items; `paid` collects the order's full created value. Nothing in the service
ever produces a fraction of a cent.
