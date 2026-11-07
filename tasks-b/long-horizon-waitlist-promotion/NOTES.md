# long-horizon-waitlist-promotion

stratum: long-horizon

A single-event ticketing service: seat sales with a fixed capacity, a tiered
waitlist, and cancelled seats offered down the line with a TTL. Every command
carries `now`; nothing reads a clock.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-queue-order` | the line is ordered tier first, then FIFO within a tier | `ordering.js` compares arrival seq first and uses tier only as a tie-break, so priority members never pass anyone |
| `02-offers` | a cancelled seat is offered to the head of the line, one offer per member | `offers.js` picks the eligible entry with `.at(1)` (positions are 1-based, position 1 is the head), so the offer skips the head - or is never created when only one fan waits |
| `03-decline-requeue` | a first decline keeps the original position exactly once; a second decline removes the member | `queue.js` `noteDecline` removes the entry and re-appends it with a fresh seq, dumping the member at the tail |
| `04-expiry-capacity` | a lapsed offer always frees its seat; pending offers count against capacity | `service.js` `#advance` returns early when the waitlist is empty, so an offer that lapses with nobody waiting is never reclaimed and the seat leaks |
| `05-interactions` | the rules in combination (tier x offers, per-seat skip lists, one offer per member, full replay) | no single bug; the cases fall out of the four above |

## guards (pass on the untouched fixture)

- `within the priority tier the earlier joiner is ahead` (01) - the broken comparator is FIFO, which is right inside one tier
- `cancelling a ticket that does not exist is refused` (02) - unknown-ticket handling is correct in the fixture
- `commands on a resolved offer report its status and change nothing` (03) - resolved-offer idempotency is correct in the fixture
- `a pending offer holds its seat even when the member steps off the waitlist` (04) - the capacity check itself is correct; only the reclaim is broken

## interactions

10 cases cross sub-problems or touch behaviour the visible suite never shows:
tier x leave/rejoin and tier x duplicate-join (01), decline x next-seat skip
lists and tier x decline (03), expiry x leave x capacity (04), and all of 05
(tier-driven offers, two seats lapsing at once with per-seat skip lists and
one-offer-per-member, leave/rejoin with an offer in flight, and a long
deterministic replay of a full evening).

The visible suite is the easy end of each sub-problem: 10 cases, at most two
per sub-problem, 7 failing on the untouched fixture.

## measured

- untouched fixture: **4/24 = 17%** hidden cases (the 4 guards, nothing else), visible 3/10 pass (exit 1)
- reference: **24/24 = 100%** hidden cases, visible 10/10 pass (exit 0)
- reference changes 4 files: `src/{ordering,offers,queue,service}.js`
- fixture: 13 text files, 627 lines

Gate: `node tasks-b/_tools/verify-task.mjs long-horizon-waitlist-promotion` prints `ok`.

## where partial credit comes from

A solution that greens only the visible suite has typically fixed the head
pick and the comparator but not the decline requeue or the empty-waitlist
reclaim, landing around 15-18/24. The two seats that lapse together (05) and
the second-decline-removal chain (03) are the cases that separate a careful
read of the docs from a quick patch.
