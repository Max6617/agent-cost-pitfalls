# long-horizon-auction-bidding

stratum: long-horizon

An ascending-auction service: list a lot, bid with an optional proxy ceiling,
close at an injected tick. The rules live in `docs/auction-rules.md` (minimum
increment table, proxy settlement, reserve, soft close, dead heats, outbox).

## sub-problems

1. **minimum increment** (`01-minimum-increment`) — bug in `src/increments.js`:
   an off-by-one walks the floor table one row too far, so the increment is
   always read from the bracket *above* the standing bid (the 50,000-and-up
   row is accidentally right, which is why the proxy/tie/soft-close files live
   in that bracket — it isolates them from this bug).
2. **proxy settlement** (`02-proxy-settlement`) — bug in `src/proxy.js`: the
   winner is charged their own ceiling instead of the smaller of their ceiling
   and the loser's ceiling plus the increment.
3. **reserve** (`03-reserve`) — correct in the fixture; its discriminating
   cases are interactions that compose the reserve with the settled proxy
   price (a war that stops below the reserve must not sell).
4. **soft close** (`04-soft-close`) — bug in `src/softclose.js`: the extension
   only fires when the placed bid takes the lead, so a late challenge the
   standing proxy beats never extends the close.
5. **dead heats** (`05-dead-heats`) — bug in `src/auction.js`: `>=` awards an
   equal-ceiling contest to the later bid; the docs give it to the earlier one.
6. **outbox order** (`06-outbox-order`) — correct in the fixture; one guard on
   displacement order, plus interactions through a proxy war.

## guards (pass on the untouched fixture)

- `a lot sells when the closing bid meets the reserve` (03)
- `a late bid pushes the close out by the extension` (04)
- `outbid notices arrive in the order bidders are displaced` (06)
- `the standing bidder may raise their own ceiling without moving the price` (02)

## interactions

10 of 22 cases: reserve×proxy (03 ×3), soft-close×proxy (04 ×3 incl. a chained
extension and the extension measured from the bid's own `at`), tie×proxy price
(05 ×1), outbox×proxy (06 ×2), and the three-way war that also asserts
notification order (02).

## measured

- untouched fixture: **4/22 hidden cases (18%)**, visible suite 4/8 pass (exit 1, 4 failing)
- reference: **22/22 hidden cases (100%)**, visible suite 8/8 pass (exit 0)
- gate: `node tasks-b/_tools/verify-task.mjs long-horizon-auction-bidding` → ok
- reference changes 4 files: `src/{increments,proxy,softclose,auction}.js`

Greening the visible suite means fixing the increment table and the proxy
settlement; that moves 13 of the 18 failing cases and leaves the dead-heat and
soft-close-defended cases (5 cases) for someone who reads the docs — the
visible suite never reproduces either symptom.
