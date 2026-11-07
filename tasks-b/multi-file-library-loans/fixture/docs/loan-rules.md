# Loan rules

The rules the library committee signed off for the loan service. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. Records, dates, money

- A **title** is a work in the catalog: `{ id, name, category, replacementCostCents }`.
  Categories are `book`, `audiobook` and `dvd`.
- A **copy** is a physical item: `{ id, titleId }`. Loans are made against
  copies; holds are placed against **titles**, because any copy of a title can
  fill a hold.
- A **member** is `{ id, name, memberClass }` with class `staff`, `student` or
  `standard`.
- Dates are `'YYYY-MM-DD'` strings. Every operation takes the date it happens
  on; the service never reads a clock.
- Money is integer cents everywhere.

## 2. Checkout and loan periods

`checkout(copyId, memberId, date)` lends a copy. The due date is the checkout
date plus the category's loan period:

| category | loan period |
|---|---|
| book | 21 days |
| audiobook | 14 days |
| dvd | 7 days |

Refusals: `unknown-copy`, `unknown-member`, `unavailable` (the copy is out or
lost), `held-for-other` (the copy is being held for another member's ready
hold — see §4). Returning a copy on its due date is not late.

## 3. Renewals

`renew(loanId)` moves the due date out by one full loan period **from the
current due date**, never from the day the renewal happens. A loan can be
renewed at most **twice**.

Refusals, checked in this order:

1. `held` — the loan's title has an active hold (waiting or ready). A
   cancelled or fulfilled hold does not block. A title with someone waiting
   never reaches the limit check, however many renewals are left.
2. `renewal-limit` — the loan has already been renewed twice.

Renewing a closed loan answers `loan-closed`.

## 4. Holds and the queue

`placeHold(titleId, memberId, date)` joins the title's queue (`unknown-title`
and `unknown-member` are refused). `holdQueue(titleId)` lists the active
holds — waiting and ready — in the order copies will be offered, with
1-based `position`.

Queue order: **staff first, then students, then standard members**. Inside one
class the hold **placed earlier comes first** — the person who has waited
longest is next, never the most recent arrival. Two holds placed the same day
inside one class are ordered by hold id.

When a copy of a title comes back, the first **waiting** hold in the queue
becomes `ready` and the copy is held for pickup. Only that member can check
the copy out (`held-for-other` for everyone else); picking it up fulfils the
hold and starts a normal loan on the pickup date.

`cancelHold(holdId)` removes a hold. The rest of the queue keeps its order.

## 5. Overdue fines

`returnCopy(loanId, date)` takes a copy back and answers
`{ ok, billCents, daysLate }` (`loan-closed` if the loan is not open).

Days late is the number of whole days between the due date and the return
date: returning **on** the due date is 0 days late, returning early owes
nothing.

**Grace period:** a return up to **2 days** late owes nothing. The grace
period *waives* the fine — it does not reduce the days counted. A return three
days late bills three days, not one.

Past the grace period the fine is the per-day rate times the days late,
capped per loan:

| category | per day | per-loan cap |
|---|---|---|
| book | 25 | 1000 |
| audiobook | 50 | 1200 |
| dvd | 100 | 1500 |

A billed fine lands on the member's charges with kind `overdue`.

## 6. Lost items

`reportLost(loanId, date)` writes the copy off (`loan-closed` if the loan is
not open). The member is billed the title's **replacement cost, always**: a
loss can be reported before the due date or inside the grace window, and the
bill is the same. The grace period applies to overdue fines only, never to a
lost fee.

A lost fee **replaces** the overdue fine: the member never owes both on one
loan, whatever the dates. The loan is closed from then on and the copy is
lost — never available, never fills a hold.

## 7. Charges and balances

`charges(memberId)` lists `{ loanId, kind, amountCents, date }` in the order
they were billed; only positive amounts are recorded. `balance(memberId)` is
their sum, in cents.
