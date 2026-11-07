# long-horizon-split-expenses

stratum: long-horizon

A group-expense service: add expenses with equal/percent/shares/exact splits,
record repayments, suggest who-pays-whom, remove members. Integer cents only;
the event log is the state, balances and suggestions are views over it.

## sub-problems

1. `01-percent-splits` — percent shares are exact-cent integer arithmetic
   (`floor(cents * pct / 100)`, multiply first). **Bug:** `src/money.js`
   computes `Math.floor(cents * (pct / 100))`; the float ratio lands a cent
   short on exact boundaries (3500 at 29% gives 1014, not 1015).
2. `02-remainder-cents` — leftover cents after flooring go one at a time to
   the largest exact (pre-floor) share, ties by ascending member id.
   **Bug:** `src/split.js` hands them out in `among` list order.
3. `03-settlement-suggestions` — suggestions pair largest debt with largest
   credit for the smaller amount, repeat, ties by id: minimal count, no
   cycles, recorded payments count. **Bug:** `src/settle.js` nets only
   pairwise debts between the same two people, so loops and chains survive.
4. `04-remove-member` — removal is refused with `unsettled-balance` unless
   the balance is exactly zero; a refusal changes nothing. **Bug:**
   `src/group.js` removes unconditionally; the member's row vanishes from the
   book and the debt with it (the book stops footing).
5. `05-running-balances` — running balances equal a from-scratch replay after
   any prefix of events. **Bug:** `src/balances.js` applies a settlement to
   the running book in the wrong direction (from falls, to rises), so every
   reading after a payment disagrees with `recompute()`.

Five modules have to change: `money.js`, `split.js`, `settle.js`,
`balances.js`, `group.js`. The bugs are independent: no fix moves another
file's cases (verified by construction - 01 uses boundary percents with
distinct exact shares so the remainder rule never masks the float; 02 uses
float-clean inputs; 03 reads the log, never the book; 04 reads balances only
via `recompute()`; 05 never removes members).

## guards (pass on the untouched fixture, 4)

- `01` *an even percent split divides exactly* (50/50 mainline)
- `03` *a single debt suggests a single transfer* (pairwise netting agrees)
- `04` *a member at zero leaves cleanly* (legit removal flow)
- `05` *balances track a replay across a run of expenses* (no settlements yet)

## interactions (8)

- `01` *a payer who is not among the participants...* — subset `among` +
  boundary percent + payer credit, balances view (visible suite has no
  subset-`among` case)
- `02` *percent split: the leftover cent goes to the largest percent* —
  percent mode with a remainder (visible never combines the two)
- `03` *equal debts and equal credits pair off by member id...* —
  minimisation count and the pinned tie-break together
- `03` *a payment that closes a loop leaves nothing to suggest* — recorded
  settlements feed the nets; the closed loop nets to zero
- `04` *a partly repaid debt still blocks removal* — settlement then removal
- `04` *a refused removal leaves the group as if it was never attempted* —
  refusal integrity: a later expense still splits across everyone
- `05` *running balances equal a replay after every prefix of a mixed log* —
  the literal docs §3 invariant, expenses and settlements interleaved
- `05` *payments and new expenses keep the two readings in lockstep* —
  compounding settlements plus a later expense

## measured

- untouched fixture: 4/22 hidden cases = 18% (exactly the 4 guards); visible
  suite 4/10 pass, exit 1 (6 failing reproductions)
- reference: 22/22 hidden cases = 100%; visible suite 10/10 pass, exit 0
- reference changes 5 files: `src/{money,split,settle,balances,group}.js`
- gate: `node tasks-b/_tools/verify-task.mjs long-horizon-split-expenses` → ok

A solution that greens the visible suite fixes one easy case per sub-problem
and lands well short of 22/22: the visible remainder cases are two-member,
the visible suggestion case a single debt, and the hidden boundary percents,
tie-breaks, chains, refusal integrity and prefix invariant are all unhinted.
