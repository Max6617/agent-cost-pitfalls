# invoicing-app

| module | responsibility |
|---|---|
| `src/cents.js` | the money routine — rounding, formatting, splitting |
| `src/money.js` | the facade every screen imports money from |
| `src/modules/invoices.js` | invoice totals and printable summary |
| `src/modules/emails.js` | confirmation and refund emails |
| `src/modules/csv.js` | finance export |
| `src/modules/dashboard.js` | admin cards and tables |

## Money

Money is an exact number of currency units everywhere. It is rounded exactly
once, on the way out, by `src/cents.js`.

**Nothing outside `src/cents.js` may build a currency string by hand.** In
particular nothing may call `toFixed` on an amount, and nothing may strip a
minus sign to re-attach it around a symbol — that is exactly the pair of
mistakes that made the invoice and the confirmation email disagree.

Formatting rules, in one place:

- the sign goes in front of the symbol: `-$4.00`
- half away from zero: `2.675` renders as `$2.68`, `-0.005` as `-$0.01`
- a zero renders without a sign: `$0.00`

`src/money.js` re-exports the routine rather than implementing it, so the
screenshot tests can install a stub through `setRenderer`. Import money from
the facade, never from `cents.js` directly.
