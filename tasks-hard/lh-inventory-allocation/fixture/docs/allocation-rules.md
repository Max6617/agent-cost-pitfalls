# Allocation rules

The rules the order service, the pick line and the merchandising team agreed on
before the allocation engine was written. `src/` implements them; where the code
and this document disagree, this document is right and the code is a bug.

## 1. Units and the stock ledger

Stock is counted in whole units, per `(warehouse, sku)`. There is no fractional
unit and no unit of measure conversion inside the engine.

Every change to what is physically in the building is a movement: `receipt`
(goods in), `shipment` (goods out) and `adjustment` (a signed correction after a
stock count). `onHand(warehouse, sku)` is the replay of those movements, and
only that: no running total is kept that a later movement could leave stale. A
shipment larger than what is on hand is refused with status
`insufficient-stock` and the ledger is unchanged by it.

## 2. Instants

Everything that depends on *when* takes the instant as an argument — an ISO-8601
UTC string (`2024-05-01T09:00:00.000Z`) or epoch milliseconds. Nothing under
`src/` reads the system clock, sets a timer, or draws from a random source, so
two runs over the same calls produce the same ids, the same holds and the same
fills.

A reader called without an instant is a programming error: `held`, `atp`,
`reserve`, `allocate`, `release`, `cancelOrder`, `ship` and `receive` throw a
`TypeError` when `at` is missing or cannot be parsed. There is no implicit
"now" to fall back to.

A reservation's deadline is always derived: `expiresAt = at + ttlMs`, on the
instant the hold was asked for.

## 3. Reservations

A reservation — a hold — is the promise that `qty` units of one shelf will not
be sold to anyone else. A hold is identified by the triple
`(orderId, sku, warehouse)`: an order that buys two skus, or buys the same sku
from two sites, has one hold per triple and never two holds for the same triple.
A second request for a triple that is already held is refused with status
`already-held` and changes nothing.

A hold lasts until its deadline:

- `expiresAt` is **exclusive**. It is the first instant at which the hold has
  already lapsed, so a hold read *at* exactly `expiresAt` is no longer holding
  stock.
- Liveness is derived from the instant being asked about, every time it is
  asked. Nothing has to have run in between: an expired hold stops holding stock
  without a sweep job, and `expireDue()` exists only to mark the console view.
- A hold with `expiresAt: null` never lapses on its own.
- Topping a hold up (a later pass filling more of the same line) does not move
  its deadline: a hold's deadline belongs to the hold, and extending it would
  let a stale hold linger.

`held({ warehouse, sku, at })` is the units promised on one shelf at one
instant, and `reservations({ ... , live: true, at })` lists the holds themselves;
the two answer the same question from the same ledgers and may not disagree.

`release(id, { at })` reports:

| situation | status | effect |
|---|---|---|
| the hold exists and is still holding | `released` | the units are back on the shelf |
| the hold exists but has lapsed, or was already released or cancelled | `not-active` | nothing |
| no hold has that id | `unknown` | nothing |

Releasing an unknown id is an ordinary answer, not an exception: the order
service retries releases and the second call must not blow up the request.

A hold that was created by filling a demand line and its line move together: a
line holds exactly what has been filled for it, and releasing the hold puts the
line back in the queue with nothing filled.

## 4. Channel safety stock

A channel's buffer is stock that channel refuses to sell. It is held per
`(channel, sku, warehouse)`: the marketplace and the trade counter can buffer
the same sku differently, and the two sites keep their own numbers. A buffer
that has never been set is `0`.

What a demand may take from a shelf is

```
free = on hand − held − buffer(channel, sku, warehouse)
```

never below zero, with the buffer subtracted exactly once. A caller that means
to sell through its own safety stock says so: `allowBuffer: true` removes the
buffer from that one calculation and nothing else. `bufferFor()` reads the
number back for one channel and one shelf.

The buffer binds allocation and direct reservations alike.

## 5. Order of allocation

An allocation pass walks the demand queue in **priority order**:

1. `priority` ascending — `1` is the most urgent, the default is `100`
2. then `placedAt` ascending — the older line first
3. then `id` ascending, compared as a string

The order lines were added to the queue in is not part of the rule and must not
show through: a line that arrived late but ranks earlier is served first, and two
lines of equal rank are separated by age, then by id.

Every pass is a fresh derivation of the same ledgers. Nothing about a pass is
kept between passes.

Stock that has already been allocated to a line is held for it. A later,
more urgent line never takes it back; the first line has to be released or its
order cancelled before the stock is anyone else's. Stock that a backorder is
merely *waiting* for is not protected — a more urgent line that arrives before
the next pass may take it.

## 6. Filling, partial lines and backorders

A pass fills each waiting line with

```
fill = min(outstanding, free)
```

subject to the pack rule in section 7. A line bigger than the free stock is
filled partially; the rest stays outstanding on the same line, at the same
priority, and is reported as a backorder (`outstanding` units) by
`backorders()`. The next pass fills it again, and a pass after a release or a
receipt is how backorders are served — there is no separate backorder job.

Line statuses: `open` (nothing filled), `partial` (something filled, something
outstanding), `allocated` (nothing outstanding), `cancelled`.

## 7. Packs

Stock is picked in whole packs of `packSize` units; `packSize` defaults to `1`,
which is the engine working in singles.

- A line the shelf can cover **in full** ships exactly as asked. A line for 7
  units out of a shelf of 8 is 7 units, not one pack of 6 and not two.
- A **short** fill — the shelf cannot cover the line — is trimmed *down* to the
  largest whole number of packs that fits. It is never rounded up to a whole
  pack, and it never exceeds the free stock.
- A short fill that cannot make a whole pack is `0`.

## 8. Available to promise

`atp({ sku, warehouse, channel, at })` reports one shelf for one channel:

```js
{ sku, warehouse, channel, at, onHand, held, buffer, available }
```

with

```
available = on hand − held − buffer
```

`available` is the arithmetic result and may be negative: a negative number is
the signal that the channel has oversold, and the console shows it rather than
hiding it. ATP is reported per sku **and per channel**: one call answers for the
channel asked about, with that channel's own buffer.

The report is a view of the same ledgers everything else reads. It has to agree
exactly with the reservations the engine reports, and a cached total must never
survive the call that invalidated it: after a receipt, a shipment, a buffer
change, a reserve, a release or a cancellation, the next `atp()` reflects it.

## 9. Cancelling

`cancelOrder(orderId, { at })` releases every hold the order still has and
withdraws its demand lines, all of them, not only the first.

| situation | status | released |
|---|---|---|
| the order had holds or demand | `cancelled` | the units it was holding |
| the order was already cancelled | `already-cancelled` | `0` |

Cancelling is not cumulative: an order cancelled twice is credited once, and the
second call reports that there was nothing left to release.

## 10. Out of scope

No persistence, no network, no background jobs, no notification of other
services. The engine is a library: the calling service owns the clock, the
retry, and the decision about what an overflow of stock should mean.
