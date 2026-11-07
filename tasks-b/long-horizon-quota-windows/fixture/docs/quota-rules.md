# Quota rules

The rules agreed with the API team for per-key quota accounting. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. Events

A request event is a plain object:

```js
{ id: 'r-0042', key: 'acme', at: 1700000000, cost: 1 }
```

- `id` identifies the request and is unique across the whole service.
- `key` is the API key being accounted. Keys are independent: one key's
  usage, debt and windows never affect another key's.
- `at` is the request timestamp: whole seconds since the epoch. It is the
  only time that exists. The service has no clock, so "now" always means the
  timestamps the events have carried in.
- `cost` is a positive integer, default 1. A bulk request costs more than a
  single one; costs, not request counts, are what the windows measure.

## 2. Canonical order

Events are evaluated in **canonical order**: ascending `at`, ties broken by
ascending `id` (string order). Arrival order is irrelevant: the gateways can
deliver late, and an event that arrives after events with later timestamps
takes its place in canonical order as if it had always been there.

Every answer the service gives — the status `admit()` returns, `statusOf()`,
`usage()`, `log()` — is the answer of replaying everything ingested **so far**
in canonical order. A later arrival can therefore revise an earlier event's
status: an event admitted when it arrived may stand rejected once an
earlier-stamped event has landed ahead of it. `statusOf()` always reflects
the current replay; `statusOf()` of an id never ingested is `null`.

## 3. The daily window

A day is an epoch day: `floor(at / 86400)`, aligned to midnight UTC. A key's
daily usage is the total cost of its **admitted** events that day. Usage may
reach the day's allowance but never exceed it; see section 6 for how
borrowing raises the allowance.

## 4. The sliding hourly window

At time `t`, a key's hourly usage is the total cost of its **admitted**
events with `t - 3600 < at <= t`. An event counts against the window for
exactly 3600 seconds after its timestamp; an event stamped exactly 3600
seconds earlier has aged out and no longer counts.

The window slides continuously. In particular it does **not** observe day
boundaries: events from the last hour of a day still weigh against requests
in the first hour of the next.

## 5. Admission

A request is admitted only if **both** windows allow it: its cost fits the
day's remaining allowance (section 6 for what "remaining" means once
borrowing is involved) and its cost fits the hourly window. The daily window
is consulted first, so a request that both windows would refuse is rejected
with reason `daily-limit`; one that only the hourly window refuses is
rejected with reason `hourly-limit`.

A rejected request consumes nothing: it counts in neither window, it borrows
nothing, it repays nothing. But the windows track time as the events stamp
it, so a rejected request still marks the passage of time — its timestamp
rolls the day forward and slides the hourly window like any other.

## 6. Borrowing against tomorrow

A day's **effective allowance** is `dailyLimit - owed`, where `owed` is the
debt the previous day's borrowing charged against this day (zero for the
first day a key appears). When a request does not fit the remaining
allowance, the service may **borrow** the shortfall against the next day:

- Borrowing is all-or-nothing per request: the shortfall is either fully
  covered or the request is rejected `daily-limit`. No partial borrows.
- Total units borrowed against the next day during one day may reach but
  never exceed the **borrow cap** — the service's `borrowLimit`
  (`config/quota.config.json`, 100 unless the deployment overrides it). The
  cap may be reached exactly.
- A borrowed unit is spent the moment it is borrowed: the day's allowance
  grows by the borrowed amount, so a later request the same day only needs
  to borrow for itself.
- At the day boundary the debt is collected: the next day's `owed` becomes
  this day's borrowed total. The debt is owed by the **immediately following
  day only**. A day that passes with no events still collects it and
  discharges it, so borrowing on day *d* reduces day *d*+1's allowance and
  never day *d*+2's.

The hourly window is unaffected by borrowing: a request the daily window
would admit only via a borrow is still rejected `hourly-limit` when the hour
is full, and being rejected it borrows nothing.

## 7. The usage report

`usage(key)` reports, as the ingested stream currently stands:

```js
{
  key,             // the key reported on
  day,             // the epoch day of the latest event seen for the key
  usedToday,       // admitted cost on that day
  remainingToday,  // what can still be spent that day without new borrowing
  owed,            // debt charged against that day by the previous day
  borrowed,        // debt that day has incurred against the next day
  windowUsed,      // hourly usage in the window ending at that latest event
  admitted,        // events whose current status is 'admitted'
  rejected,        // events whose current status is 'rejected'
}
```

A report is a snapshot: a report taken before more events arrive does not
change afterwards. A key the service has never seen reports zeros across the
board, with `day: null` and the full `dailyLimit` remaining.
