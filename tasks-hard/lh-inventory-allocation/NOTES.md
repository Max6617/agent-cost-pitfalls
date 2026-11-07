# lh-inventory-allocation

**stratum:** long-horizon
**prompt:** "The pick line and the promise report have stopped agreeing with what is actually on the shelf. Orders keep being promised more units than we are holding, stock stays held long after a hold's deadline has passed, backorders sit untouched while lines that arrived later take the stock they were waiting for, and the available-to-promise figure the shop reads does not match the reservations we can list for the same shelf. Make the engine behave the way docs/allocation-rules.md says it does; the tests under test/ are the reproductions we managed to write, not the whole acceptance criteria."

## The fixture

A warehouse allocation engine: an append-only stock ledger per `(warehouse, sku)`,
reservations with a time-to-live, per-channel safety stock, backorders and an
available-to-promise report. `src/` is 15 files / 998 lines; with the visible
suite it is 1,172 lines; the whole fixture (docs, CLI, config, data included) is
26 text files / 1,548 lines.

Nothing under `src/` reads a clock or a random source: every call that depends on
*when* takes `at` (ISO-8601 string or epoch ms) and every id is a counter, so the
suite is deterministic and the engine is replayable. `createAllocator()` defaults
to `packSize: 1`, which makes the pack rule the identity transform — the pack bug
is therefore invisible in every file that does not ask for a case-pack site, and
sub-problem 4 stays isolated from the other five.

## Sub-problems (each its own hidden test file, 4 cases each)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-reservation-lifecycle` | a hold lasts until its deadline, the deadline is exclusive, liveness is derived at read time, a release reports a status | `reservations.js` `heldUnits()` filters on the stored status and never consults the deadline; `expiry.js` `isExpired()` uses `<` where the deadline is exclusive |
| `02-allocation-priority` | priority asc, then older `placedAt`, then id; confirmed stock is protected, a backorder's is not | `allocation.js` `allocate()` walks `queue.open()` in insertion order instead of `canonicalDemand(...)` |
| `03-channel-buffers` | the buffer is per channel, per sku and per warehouse, and binds `reserve` as well as `allocate` | `buffers.js` `bufferKey()` drops the channel, so one channel's number is served to every channel |
| `04-partial-backorders` | a covered line ships exactly; a short fill is trimmed down to whole packs and never exceeds the shelf | `picking.js` `fillUnits()` rounds a covered line *up* to a pack and hands back the whole free quantity for a short one |
| `05-double-hold` | one hold per `(orderId, sku, warehouse)`; cancelling credits once and gives every hold back | `holds.js` `holdKey()` keys on the order alone; `allocation.js` `cancelOrder()` is not idempotent and re-reports units it already gave back |
| `06-available-to-promise` | ATP = on hand − held − buffer per shelf **and** channel, never served stale | `atp.js` cache key omits the warehouse; `allocation.js` `release()`/`cancelOrder()` never invalidate the cache |

Seven source files carry the defects: `expiry.js`, `reservations.js`,
`allocation.js`, `buffers.js`, `picking.js`, `holds.js`, `atp.js`. No single edit
fixes the suite, and two of the sub-problems need two files each.

## Interaction cases (11 of the 24)

| case | sub-problems that must both be right |
|---|---|
| 01/1 a lapsed hold frees the stock a waiting line then gets | expiry derivation × allocation pass |
| 01/2 exactly `expiresAt` is already lapsed, read back through ATP | exclusive boundary × `held` × report |
| 01/4 a lapsed hold handed back explicitly | expiry × release status path |
| 02/4 a newcomer takes a backorder's stock, never a confirmed line's | policy order × release re-queues the line × allocation |
| 03/1 one shelf, two channels, priority decides who is served first | channel buffers × policy order |
| 03/4 the buffer binds a direct reservation, and what `allowBuffer` buys | channel buffers × all-or-nothing reserve |
| 04/3 a backorder refilled in packs as the shelf grows | pack rule × multi-pass refill |
| 05/2 an order holds two skus, and cancelling gives both back | hold key × cancellation accounting |
| 05/4 cancelling twice credits once, and the shelf is free afterwards | cancellation idempotence × hold index × re-reserve |
| 06/3 a release is invisible to the next reader unless it invalidates | reservation lifecycle × cached report |
| 06/4 a cancellation, and the report agreeing with the live holds | cancellation × cache × ATP arithmetic |

The remaining 13 cases are a mainline third (policy order, packing, buffer
arithmetic, ATP arithmetic, the double-hold guard) so that a partial solution
still scores partially and a rewrite that fixes one sub-problem moves that file's
cases and no others.

## Guards (pass on the untouched fixture on purpose) — 4

- 01/3 releasing an unknown id reports `unknown` and changes nothing
- 03/2 a buffer belongs to one shelf: another warehouse keeps its own number
- 05/1 the same order cannot hold the same shelf twice
- 06/1 `available` is on hand less held less the channel buffer

They are the floor: 4/24 = 17%. Everything else fails on the untouched fixture,
including every case that needs two sub-problems to be right at once.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 7/12 pass, exit 1 | **4/24 = 17%** |
| reference | 12/12 pass, exit 0 | **24/24 = 100%** |

Reference changes 7 files: `src/{expiry,reservations,allocation,buffers,picking,holds,atp}.js`
— one comparison in `expiry.js`, one branch in `picking.js`, one key in
`buffers.js` and another in `holds.js`, one key in `atp.js`, and four small
changes in `allocation.js` (sort the queue, check the deadline on release, make
cancellation idempotent, invalidate the report cache on release and cancel). It
is a fix, not a rewrite.

## Where partial credit comes from

A solution that only greens the visible suite (expiry liveness, policy order, the
buffer key, the round-up, the stale report) lands around **16–18/24 ≈ 67–75%**: it
still loses the exclusive deadline, releasing a lapsed hold, the cancel
accounting, the hold key, the ATP cache key, and the short-fill half of the pack
rule unless it reconciles the whole document. A solution that fixes the four
sub-problems the visible suite exercises but none of the interactions lands near
**12–14/24**.

The visible suite deliberately omits: the exact `expiresAt` boundary, releasing a
lapsed hold, everything about the double-hold key and cancellation accounting, the
per-warehouse ATP cache key, and the short-fill half of the pack rule.

## Notes

- No case depends on another: every case builds its own allocator, the files run
  in parallel, and there is no shared module state, clock or random source.
- `data/skus.json`, `config/warehouse.config.json`, `bin/allocate.js` and
  `src/report.js` are realistic noise; `createAllocator()` never reads them (the
  CLI does), which is why the hidden suite can build an engine with no checkout
  around it.
- The 2h default hold TTL was the one thing that could leak between sub-problems:
  every hidden file outside `01-` pins `defaultTtlMs` to a day and keeps its
  timeline inside it, so files 02–06 do not move when sub-problem 1 is fixed.
