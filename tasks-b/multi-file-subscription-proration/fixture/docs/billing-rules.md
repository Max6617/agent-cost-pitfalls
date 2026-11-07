# Billing rules

The rules support and finance agreed for mid-period subscription changes.
`src/` is the implementation; when the two disagree, this document is right and
the code is a bug.

## 1. Subscriptions and periods

A subscription belongs to an account, is on one plan, has a seat count, and
bills monthly: the current period runs from `periodStart` through `periodEnd`,
**inclusive of both days**. A period from `2026-03-01` through `2026-03-31` is
31 days. February 2028 (`2028-02-01` .. `2028-02-29`) is 29.

The default catalog:

| plan | price per seat per period |
|---|---|
| `starter` | 1200 cents |
| `growth` | 2999 cents |
| `scale` | 7999 cents |

Money is integer cents everywhere. Tax is configured in basis points
(875 = 8.75%), and defaults to 875 when the service is created without an
explicit `taxBasisPoints`.

## 2. Proration

Anything billed "prorated" is scaled by the fraction of the period that
remains:

- **remaining days** are counted from and **including** the day the change
  takes effect through and **including** the last day of the period. A change
  effective `2026-03-16` in a period ending `2026-03-31` has 16 remaining days;
  a change effective on the period's first day has the whole period remaining;
  a change effective on the last day has exactly 1.
- The prorated amount is `amountCents × remainingDays / periodDays`, rounded
  **half-up to the whole cent, once, on the exact value**. Half-up on the exact
  value means `899.5` rounds to `900`, never to `899`; rounding through binary
  floating point is how the old system undercharged everyone.

A prorated amount of zero produces no invoice; the change itself still applies.

## 3. Plan changes

- **Upgrade** (the new plan costs more per seat): takes effect **immediately**.
  The charge is the prorated per-seat difference times the current seat count,
  as a single invoice line.
- **Downgrade** (the new plan costs less per seat): takes effect **at the start
  of the next period** — the day after `periodEnd` — whenever it is requested,
  including a request made on the last day of the period. No invoice is issued
  and no credit is granted; the customer has paid for the current period. Until
  then the subscription keeps its current plan and records the pending change,
  and anything else that is billed (a seat change, say) is still billed at the
  **current** plan's price.
- Changing to the plan the subscription is already on changes nothing.

## 4. Seat changes

Seat changes take effect **immediately**, in both directions, and are prorated
exactly the way plan upgrades are:

- an increase charges `seatPriceCents × addedSeats`, prorated;
- a decrease grants `seatPriceCents × removedSeats`, prorated, to the account's
  credit balance, and issues no invoice.

## 5. Combined plan-and-seat changes

When plan and seats change together, the charge is **one prorated line on the
difference between the new and old period totals**
(`newSeatPrice × newSeats − oldSeatPrice × oldSeats`) — not two separately
rounded lines. The combined change is only available when that difference is an
increase; moving to a cheaper overall configuration is done as a downgrade
(§3) plus a seat change (§4).

## 6. Credits

Each account has a credit balance, fed by seat reductions and promotional
grants. When an invoice carries a charge, the balance is applied to the
**charge total, once per invoice**, before anything else, and only the
remainder is due. The balance can cover part or all of a charge; what it can
never do is go below zero.

## 7. Tax

Tax is the configured basis points applied to the **post-credit amount** — what
remains after the credit balance has been applied, not the original charge. It
is rounded half-up to the whole cent, once, on the exact value, and it is zero
when credit covers the whole charge.

## 8. Invoices

An invoice is issued only when the charge is greater than zero. Its shape:

```js
{
  id, accountId, subscriptionId, effectiveDate, kind,
  lines,              // the charge lines: [{ description, amountCents }]
  chargeCents,        // sum of the lines
  creditAppliedCents, // credit spent against this invoice
  taxCents,           // tax on chargeCents - creditAppliedCents
  totalCents,         // chargeCents - creditAppliedCents + taxCents
}
```

## 9. Trials

A subscription may start in trial. A trial is never invoiced; plan and seat
changes during a trial are free and immediate.

Converting a trial charges the **full period** (`seatPriceCents × seats`) with
**no proration**, whenever in the period the conversion happens. The credit
balance and tax rules apply to the conversion charge the way they apply to any
charge. The converted subscription leaves trial immediately and its first paid
period starts on the conversion date, ending the day before the same date one
month later (converting on `2026-03-10` starts the period
`2026-03-10` .. `2026-04-09`).
