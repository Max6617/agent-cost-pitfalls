# spec-money-allocation

**stratum:** spec-implementation — `fixture/docs/billing-rules.md` is the written
contract, `fixture/src/` is a partial implementation that deviates from it, and
every hidden expectation is derivable from the document.

**prompt:** "Billing is disputing our invoices again. When we split a shared
charge across the lines of an invoice the parts come back a minor unit away from
the charge, one of the rounding modes we offer behaves exactly like another one,
yen amounts are going out with cents in them, and a voucher followed by a
percentage keeps landing on the wrong figure. docs/billing-rules.md is what
billing signed off, so make the toolkit behave the way that document says it
does; the reproductions under test/ are the handful we wrote down and not the
whole acceptance criteria."

## Sub-problems (one hidden test file each)

| file | sub-problem | the deviation in the fixture |
|---|---|---|
| `01-decimal` | amounts are exact decimals and are written normalised | `decimal.js` holds every amount in a `number`: `add('0.1','0.2')` is `0.30000000000000004`, large results come back in exponent form, `div` truncates instead of refusing a quotient with no finite decimal form |
| `02-rounding` | the five rounding modes, each on the exact value, each defined for negatives, never `-0.00` | `rounding.js` rounds the nearest double with `Math.round`; `half-even` and `half-down` silently behave like `half-up`; the sign of the source is re-attached, so a rounded zero prints `-0.00` |
| `03-allocation` | split a total across weighted shares so the parts sum exactly to it | `allocate.js` works in a hard-coded 2-decimal unit, hands the residual units to the earliest indices instead of the hardest-rounded shares, divides by zero when the weights cancel, and never reads `options.mode` |
| `04-currency` | the minor unit belongs to the currency, and conversion rounds once at the target | `currencies.js` carries an inline four-currency table and falls back to two decimals for everything else (`data/currencies.json` is declared but never read) |
| `05-discount` | voucher first, then percentage, rounded once at the end, in the requested mode | `discount.js` takes the percentage off the gross, rounds the discount figure on its own and subtracts it, returns a normalised rather than fixed-scale string, and ignores `options.mode` |
| `06-invoice` | what a multi-line invoice reports, at its own currency's minor units | `invoice.js` takes the discount off every line and sums, and weights a shared charge by the magnitude of each line so a credit line earns a positive share |

Six modules carry the deviations, so no single edit fixes the suite:
`decimal.js`, `rounding.js`, `allocate.js`, `currencies.js`, `discount.js`,
`invoice.js`. The reference changes exactly those six files.

## Measured

| arm | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 3/11 pass, exit 1 | **2/24 = 8%** |
| partial solution that greens `test/` | 11/11 pass, exit 0 | **16/24 = 67%** |
| reference | 11/11 pass, exit 0 | **24/24 = 100%** |

The middle arm is a deliberately generous upper bound: it is the reference with
the parts the visible suite never exercises taken back out again (half-down
aliased to half-up, `-0.00` back on the renderer, the discount mode unthreaded,
unknown currency codes still defaulting to two decimals, invoice weights taken
from the magnitude of each line, `createInvoice` no longer rejecting an unknown
currency). It is what an agent that stops when `node --test` is green has, plus
the negative-total allocation it inherited for free.

## Interaction cases (8, the brief asked for 6)

These need two or more sub-problems to be right at the same time, or they touch
behaviour the visible suite never reaches:

1. `03` "the scale and the mode are the caller's" — allocation × rounding modes ×
   the currency's minor unit: a three-decimal allocation, a zero-decimal one, and
   `half-even` deciding how each exact share is rounded before the leftover moves.
2. `03` "negative totals and credit lines" — allocation × signed exact arithmetic:
   `allocate('-0.11', ['5','3','-2'])`, and the symmetry of `allocate(-t)` under a
   symmetric mode.
3. `04` "conversion rounds the exact product" — currency × exact arithmetic: an
   exact half (`1.00 × 1.005`) and a JPY target with no minor unit at all.
4. `04` "never written with a negative zero" — currency × rounding modes × sign.
5. `05` "the rounding mode reaches the discount" — discount × rounding: one exact
   value (`5.025`) where `half-up`/`ceiling` and `half-even`/`floor`/`half-down`
   disagree, which is the prompt's "a mode that makes no difference" symptom.
6. `06` "a discount comes off the net once, not off every line" — invoice ×
   discount × exact decimals: one discount of `0.009` versus three of `0.0027`.
7. `06` "a shared charge is split at the invoice currency" — invoice × allocation
   × currency × a credit line: a JPY report with no decimal point anywhere, and a
   BHD report whose printed shares add back up to the printed charge.
8. `01` "output is normalised, never in exponent form" — decimal core ×
   serialisation: `compare` past the double-precision boundary and integers with
   no exponent, however long they are.

## Guards (2, on purpose)

- `02` "the result is fixed-scale, and the five modes are the ones that exist"
- `03` "the parts line up with the weights and add back up to the total"

Both pass on the untouched fixture and stop a rewrite from breaking behaviour
that already works: fixed-scale padding, the mode vocabulary, positional
allocation, a single weight, and the empty-weight error. Two is the floor of the
2-4 band, which keeps the gradient wide.

## Where the partial credit is

About eleven of the twenty-four cases are mainline material an agent gets right
from the document: exact `add`/`sub`/`sum`/`mul`, `half-up` on an exact value,
positional allocation and its sum invariant, a zero weight, the declared currency
table, the voucher-before-percentage order, and the invoice net rounding once.
The rest is the awkward end of the same rules: `half-even` and `half-down` on
exact halves, floor/ceiling and negative zero, the scale and the mode reaching
the allocator, negative totals and credit lines, a quotient with no finite
decimal form, the discount's single rounding point, and a report at a currency's
own minor unit.

A float implementation cannot pass: in this runtime `1.005 * 100` is
`100.49999999999999`, `(1.005).toFixed(2)` is `1.00` and `(1.015).toFixed(2)` is
`1.01`. `2.675 * 100` is exactly `267.5` and `(8.835).toFixed(2)` is `8.84`, so
those two classic-looking cases were checked in node before being used and are
deliberately the *passing* half of their cases.

## Open questions / risks

- `invoice.report()` is asserted by deep equality on the whole object for the JPY
  case. The document pins the shape, but a solution that adds a field would lose
  that one case.
- `06` is deliberately an integration file: it needs `01`, `03`, `04` and `05`
  right as well. That is the point of the sub-problem, but it means a solution
  that skips, say, the currency table loses a file it might otherwise have scored
  in.
- Removing `toNumber` from `decimal.js` is harmless: no other module imports it.
