# long-horizon-order-fulfilment

stratum: long-horizon

A stateful order-fulfilment service driven by an event log (created, paid,
pick, pack, ship{qty}, deliver, cancel, return), all times injected on the
events. The service holds only the log and derives every answer by replaying
it in canonical order (ascending `at`, then `id`); `docs/fulfilment-rules.md`
is the contract.

## sub-problems

1. `01-duplicates` — an event id applies once, ever, even when the redelivery
   re-stamps `at`, and even when the first arrival was rejected. Bug:
   `src/idempotency.js` keys the seen-index on `id + at` instead of `id`.
2. `02-lifecycle` — the docs-pinned legal-sequence table (ship before pack is
   rejected) and the cancel rule: cancel only before any ship; after any ship
   it becomes a return flow (`applied-as-return`, `return-open`, no money
   moves). Bug: `src/lifecycle.js` `cancelOrder` always cancels and refunds.
3. `03-shipments-stock` — a ship moves `min(qty, outstanding, on-hand)`; the
   shortage stays backordered. Bug: `src/fulfilment.js` caps only by
   outstanding, so stock goes negative.
4. `04-returns-restock` — every return refunds `qty x price`, but only
   `unopened`/`resalable` restock; `damaged`/`defective` are written off.
   Bug: `src/returns.js` restocks unconditionally.
5. `05-reconciliation` — `report({ through })` walks a prefix of the
   canonical log. Bug: `src/report.js` walks the arrival-order log instead.

## guards (pass on the untouched fixture)

- `an order walks the whole happy path` (02)
- `shipping before packing is out of sequence` (02)
- `cancelling before the first ship is a plain cancellation` (02)
- `an unopened unit goes back on the shelf` (04)

## interactions (10)

- 01: rejected event still consumes its id (duplicates x sequence); a
  duplicate inside a report prefix is counted once (duplicates x report)
- 02: cancel after a partial ship, remaining units still ship (cancel x
  ship); return flow closes when all shipped units come back (cancel x
  return)
- 03: scarce stock goes to the canonically earlier ship (stock x order);
  backorder completes after a resalable restock (ship x return)
- 04: a written-off unit does not revive another order's backorder (return x
  stock); over-quantity return inside a return flow (return x cancel)
- 05: a cancel-as-return-flow moves no money in the report (cancel x
  report); backordered units in the report after a short shelf (ship x
  report)

## measured

- untouched fixture: 4/23 hidden cases (17%), visible suite 5/10 pass (exit 1)
- reference: 23/23 hidden cases (100%), visible suite 10/10 pass (exit 0)

Reference changes 5 files: `src/{idempotency,lifecycle,fulfilment,returns,
report}.js`. Fixture: 16 text files, 768 lines.
