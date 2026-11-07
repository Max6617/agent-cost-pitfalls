# Split rules

The rules the group agreed on before the code was written. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. Money

All amounts are **integer cents**. A cent is never subdivided, and no
computation may pass through binary floating point: a percent share of an
expense is `floor(cents * pct / 100)` evaluated with integer arithmetic
(multiply first, then divide), not `cents * (pct / 100)` - the float ratio is
occasionally a cent short of the true value and the difference is real money.

## 2. Expenses and splits

An expense has a `paidBy` member, a positive `cents`, a `split`, and an
`among` list: the members the expense is shared by. `among` defaults to every
current member. The payer may be in `among` (their share is their own
consumption) or not (they settled a bill for others). Four modes:

| mode | input | base share of each member |
|---|---|---|
| `equal` | - | `floor(cents / n)` |
| `percent` | `percents`, summing to exactly 100 | `floor(cents * pct / 100)` |
| `shares` | `shares`, positive integers | `floor(cents * s / totalShares)` |
| `exact` | `amounts`, summing to exactly `cents` | the given amount, unchanged |

The floors in the first three modes leave a few cents behind (never more than
one per participant). **The remainder cents are handed out one at a time, to
the member with the largest exact (pre-floor) share first; ties are broken by
ascending member id.** The order members happen to be listed in `among`, and
the order they joined in, are both irrelevant to who gets a remainder cent.

For `equal` the exact shares are all the same, so every tie lands on the id
rule; for `percent` the exact share is `cents * pct`; for `shares` it is
`cents * s` (the common divisor cancels). Each participant gets at most one
remainder cent.

The shares of one expense always add up to its cents exactly.

## 3. Balances

A member's balance is a signed number of cents: **positive means the group
owes them, negative means they owe**. An expense credits the payer the full
amount and debits every participant their share. A settlement credits `from`
and debits `to` - handing cash over improves the payer's position.

The balances of the current members always sum to zero. The book foots.

`balances()` answers from the running totals; `recompute()` replays the event
log from scratch. The two are two readings of one truth: **after any prefix
of events, the running balances of the current members equal a from-scratch
replay of exactly those events.** A reading that depends on whether a report
happened to be generated in between is a bug, and so is a running total that a
settlement moved the wrong way. `recompute()` includes members who have left
(their history stays on the books); `balances()` lists current members only.

## 4. Settlement suggestions

`suggestSettlements()` says who should pay whom so the group ends up even,
in as few transfers as possible. The agreed procedure:

1. Take every member's net balance.
2. Pair the member who owes the most with the member who is owed the most;
   the transfer is the smaller of the two amounts.
3. Repeat on what is left until no one owes anything.
4. Ties - two members owing the same, or owed the same - are broken by
   ascending member id.

The result never contains a zero-cent transfer and never contains a cycle:
if a loop of debts cancels out, the suggestion for it is nothing at all.
Settlements already recorded count toward the nets, so a debt that was
partly paid back is suggested only for what is left.

## 5. Removing a member

Removing a member is a settlement event, not an erasure. `removeMember(id)`
is **refused with status `unsettled-balance` while the member's balance is
not exactly zero**; the group is left completely unchanged by a refusal -
the member stays, future expenses keep splitting across the same people, and
every balance is what it would have been had the removal never been
attempted. To remove someone who owes or is owed, first record a payment (or
follow the suggestions) until they are even.

A removed member keeps their history: they take no part in new expenses,
settlements or suggestions, and `balances()` no longer lists them, but
`recompute()` still shows them (at the zero they left with, since removal is
only allowed at zero).

## 6. Statuses

| call | status | meaning |
|---|---|---|
| `addMember` | `joined` / `duplicate-member` | |
| `addExpense` | `added` | applied |
| | `unknown-member` | payer or participant is not a current member |
| | `bad-split` | bad cents, unknown mode, or split inputs inconsistent |
| | `duplicate-id` | an expense with this id exists |
| `recordSettlement` | `recorded` / `unknown-member` / `bad-amount` | |
| `removeMember` | `removed` / `unsettled-balance` / `unknown-member` | |
