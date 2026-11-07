# lh-ledger-replay

**stratum:** long-horizon
**prompt:** "Month-end close no longer agrees with the ledger. After a replay the balances depend on the order the journal entries happened to arrive in, our corrections land in the wrong month, and republishing an FX rate quietly restates periods that were already reported. Finance also says the statement does not foot once the intercompany accounts are involved, and that re-importing a file double-counts. Make the ledger behave the way docs/ledger-rules.md says it does; the tests under test/ are the reproductions we managed to write, not the whole acceptance criteria."

## Sub-problems (each its own hidden test file)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-journal-order` | canonical order; period totals must not be stale | `order.js` sorts by `seq` only; `ledger.js` never invalidates the period cache |
| `02-idempotency` | a key applies once, ever | `idempotency.js` remembers only the previous key |
| `03-reversal` | a reversal negates its target, in the target's period, at the target's rate, resolved against the target even when the target is dated later | `ledger.js` resolves reversals during a filtered forward walk, and filters on the reversal's own date |
| `04-fx` | the rate in force on the entry's date, never a later publication | `fx.js` takes the most recently published rate regardless of date |
| `05-decimal` | exact decimal arithmetic; round once, half-up away from zero, on the exact value | `decimal.js` goes through `Number` and `toFixed` |
| `06-rollup` | a parent sums its whole subtree; internal means the whole subtree | `accounts.js` looks one level down and at the account's own flag only |

Six modules have to change (`order.js`, `store`/`ledger.js`, `idempotency.js`,
`fx.js`, `decimal.js`, `accounts.js`), and the reversal fix is an interaction:
fixing the order without fixing how reversals are resolved breaks
`03-reversal`'s "target dated later" case, which the untouched fixture passes by
accident. That single interaction is the difference between 84% and 100%.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 6/16 pass, exit 1 | **2/25 = 8%** |
| reference | 16/16 pass, exit 0 | **25/25 = 100%** |

Reference changes 7 files: `src/{decimal,fx,order,idempotency,periods,accounts,ledger}.js`.

Against the real 7-arm matrix (3 seeds each, 21 runs, 26.1 min) the arms scored
**87-97% mean**, one run reached 25/25, and the fraction spread was 11 points with a
33-point solve-rate spread. This is the only task in the batch that was measured
discriminating; the per-arm table is in `tasks-hard/RESULTS.md`.

The first version of this suite was far weaker: the arms scored 92%, 92% and 96%
and every arm failed exactly the same two cases. The rework replaced the mainline
cases with the interaction cases above and cut the guards from ten to two, which
took the floor from 24% to 8%.

## Where partial credit comes from

A solution that fixes the four sub-problems the visible suite exercises (money,
FX, ordering, rollup) but not the cache, the key index or the reversal
interaction lands around 12-16/25. Fixing the visible suite alone lands near
11/25: the visible cases are deliberately the easy end of each sub-problem.

## Guards (the two cases that pass on the untouched fixture)

- *a reversal is resolved against its target even when the target is dated later* —
  the untouched fixture passes it by accident, because its `seq`-only sort happens
  to order the target before the reversal. Five of the seven arms **failed** this
  case: fixing the ordering without also resolving reversals in a second pass
  breaks it. It is a guard against the naive fix and a discriminator at the same
  time, and it is the single most informative case in the batch.
- *reversing an entry that was itself refused changes nothing* — an orphan
  reversal over a duplicate entry.

The other twenty-three cases all fail on the untouched fixture, which is the 8% floor.

