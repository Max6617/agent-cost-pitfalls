# Billing rules

Finance owns this document. Code changes here need a sign-off in
`#billing-changes`, because every rule below has been the subject of a
customer dispute at least once.

## Amounts

Every amount is **exact** until the invoice is finalised. Only the final
`taxable` figure is rounded, and only once — rounding a line and then summing
lines produces invoices that do not foot, which is how the Q3 credit notes
happened.

`minCharge` is applied to the undiscounted extended amount. A discount can
therefore take an invoice below the minimum; that is intentional, it is a
floor on what we quote, not a floor on what we collect.

## Discount tiers

A tier applies when the line quantity is **at or above** its threshold. When
several tiers match, the one with the **highest threshold that still applies**
wins — never the first match in table order, and never the highest rate in the
table.

| qty | rate |
|---|---|
| 1 | 0% |
| 5 | 5% |
| 10 | 12% |
| 25 | 20% |

## Codes

A code is either a percentage (`OFF10` → 10% of the taxable amount) or a fixed
number of currency units (`SHIP5` → 5.00 off). An unknown code is not an
error: it discounts nothing and the invoice records `reason: "unknown-code"`.

## Rounding

Half-up, to `roundingDp` places (2 by default). `2.675` rounds to `2.68`.

## Currency

The rate table is expressed as **units of the target currency per one USD**:

```
{ "EUR": 0.92, "GBP": 0.79 }
```

So 100 USD is 92 EUR. Rates never move at runtime and are not applied to
amounts already in another currency without an explicit conversion.
