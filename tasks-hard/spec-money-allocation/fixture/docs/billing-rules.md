# Billing rules

The rules the billing team signed off before the toolkit was split out of the
invoice service. `src/` is the implementation; where the two disagree this
document is right and the code is a bug.

## 1. Amounts are decimal strings

An amount crosses the public surface as a decimal **string**, never as a
`number`. A string is a decimal amount when it matches

```
-?digits(.digits)?
```

at least one digit before the point, at least one digit after it when the point
is present, optionally one leading `-`. No leading `+`, no exponent, no
thousands separator, no currency symbol, no surrounding whitespace. `isDecimal`
answers exactly that question and nothing else.

Values are exact. `0.1` plus `0.2` is `0.3`; `1.005` is one thousand and five
thousandths, not the nearest double to it. Nothing in the toolkit may hold an
amount in a variable that can only represent binary fractions.

### Normalised output

`add`, `sub`, `mul`, `div`, `sum`, `negate`, `abs` and `normalize` return a
**normalised** string:

- no trailing zeros in the fraction: `1.50` is written `1.5`
- no trailing decimal point: `1.500` is written `1.5`, and `109.00` is `109`
- an integer amount carries no point at all: `add('50', '59')` is `109`
- a zero result is `0` — never `-0`, never `-0.00`
- never an exponent: `100000000000000000000000` is written out in full, however
  long it is

`roundTo` (section 3) is the one function that returns a *fixed-scale* string
instead, because that is what gets printed on an invoice.

## 2. Arithmetic

| function | meaning |
|---|---|
| `add(a, b)`, `sub(a, b)` | exact sum and difference |
| `mul(a, b)` | exact product |
| `div(a, b)` | exact quotient |
| `sum(list)` | exact sum of a list; `sum([])` is `0` |
| `negate(a)`, `abs(a)` | sign |
| `compare(a, b)` | `-1`, `0` or `1` on the **exact** values, so `1.10` and `1.1` compare equal |
| `isZero(a)` | true when the exact value is zero, whatever scale it is written with (`-0.00` is zero) |

`div` is exact or it fails. `div('10', '4')` is `2.5` and `div('1', '8')` is
`0.125`, but a quotient with no finite decimal form — `div('1', '3')` — is not a
money amount and throws. Dividing by zero throws.

## 3. Rounding modes

`roundTo(value, scale = 2, mode = 'half-up')` returns a fixed-scale string with
exactly `scale` decimals: `roundTo('109')` is `109.00`, `roundTo('1.2345', 3)`
is `1.235`, and at `scale` 0 there is no decimal point at all
(`roundTo('2.5', 0)` is `3`). A negative `scale`, a scale that is not an
integer, and a mode that is not one of the five below are all errors.

Every mode is defined on the **exact decimal value**, never on the nearest
double, and every mode is defined for negative values:

| mode | definition |
|---|---|
| `half-up` | nearest; a tie goes **away from zero** (`2.5` → `3`, `-2.5` → `-3`) |
| `half-even` | nearest; a tie goes to the neighbour whose last kept digit is even (`2.5` → `2`, `3.5` → `4`, `-2.5` → `-2`) |
| `half-down` | nearest; a tie goes **toward zero** (`2.5` → `2`, `-2.5` → `-2`) |
| `floor` | toward negative infinity: the greatest representable value that is not above the exact value (`2.5` → `2`, `-2.5` → `-3`) |
| `ceiling` | toward positive infinity: the least representable value that is not below the exact value (`2.5` → `3`, `-2.5` → `-2`) |

The five modes are different functions and must give different answers where
the definitions differ; a mode that silently behaves like another one is a bug.

A rounded zero is written `0.00`, never `-0.00`, whichever mode produced it:
`roundTo('-0.001', 2, 'ceiling')` is `0.00`.

## 4. Allocating a total across weights

`allocate(total, weights, options = {})` splits one amount across several
shares and is the only place where the toolkit divides money. It returns one
fixed-scale string per weight, in the same order, with exactly
`options.scale ?? 2` decimals.

- `weights` is an array of decimal strings, at least one. Each weight may be
  positive, zero or negative; a negative weight is a credit line, and it earns a
  negative share.
- An empty `weights` array is an error.
- `total` is a decimal string. It is not rounded first: a total that is not a
  whole number of minor units at the allocation scale is an error, because there
  would be a remainder nobody could be given. `0.005` cannot be allocated at
  scale 2; `1.00` can be allocated at scale 0, because it is one yen.
- The unit of the allocation is `10^-scale` — one minor unit of the currency the
  caller is allocating in. The scale is passed in, never assumed.

The split is exact, and it works like this:

1. `s_i = total × w_i / Σw` is the exact share of weight `i`. Nothing is
   computed in binary floating point, so `s_i` is exact.
2. If `Σw` is exactly zero there are no proportions to honour, and every weight
   is taken as `1`: the total is split equally. This is the only case in which
   equal weights are assumed.
3. `r_i` is `s_i` rounded to the allocation scale with `options.mode ??
   'half-up'` (section 3).
4. `d = total − Σ r_i` is a whole number of units, and it is never more than one
   unit per share.
5. The units of `d` are handed back one at a time to the shares with the largest
   `|s_i − r_i|`, adding a unit when `d` is positive and taking one away when `d`
   is negative. Equal errors are decided by **ascending index**. No share is
   adjusted twice.

What the caller may rely on:

- **The parts sum exactly to the total.** `sum(allocate(t, w))` is `t` as `sum`
  writes it — normalised, so a total of `1.00` comes back as `1` — for every `t`
  and every `w`, in every mode. That is the whole point of the function, and a
  currency whose minor unit cannot represent the total is what the scale
  argument is for.
- **A share with weight zero gets zero**, at the allocation scale, always.
- **A single weight gets the whole total**: `allocate('12.34', ['7'])` is
  `['12.34']`.
- **Positional, never sorted.** `parts[i]` belongs to `weights[i]`, and
  allocation never reorders the caller's lines.
- **Deterministic.** The same arguments give the same answer; nothing about how
  the caller built the list can change it.
- **Symmetric for the symmetric modes.** With `half-up`, `half-even` or
  `half-down`, allocating `-t` gives exactly the negation of allocating `t`.
  `floor` and `ceiling` are not symmetric, and they are not expected to be.

## 5. Currency

`data/currencies.json` is the authority for a currency's **minor units**, the
number of decimals its amounts are written with. `minorUnits(code)` returns that
number and throws for a code the table does not declare; codes are upper-case
three-letter strings, and a code that is not in the table — including a
lower-case spelling of one that is — is unknown.

`formatAmount(value, currency, options = {})` rounds the exact value, once, to
the currency's minor units with `options.mode ?? 'half-up'`, and returns a
fixed-scale string. It does not group digits and it does not add a symbol. The
consequence worth remembering is that a yen amount has no decimal point at all —
JPY is declared with zero decimals — so `formatAmount('1234.5', 'JPY')` is
`1235`, and `formatAmount('1234', 'JPY')` is `1234`.

`convert(value, rate, currency, options = {})` converts an amount using a
declared rate — target units per one unit of the source — and rounds the **exact
product**, once, at the **target** currency's minor units, with
`options.mode ?? 'half-up'`. The rate is exact too: `100.00` at `1.0950` is
`109.50`, not whatever the nearest double to `1.0950` would have produced.

## 6. Discounts

A discount is `{ fixed, percent }`, either field optional, both decimal strings.

`applyDiscount(amount, discount, options = {})` returns the amount **after** the
discount, rounded **once**, at the end, to `options.scale ?? 2` with
`options.mode ?? 'half-up'`.

The order is fixed and it is not commutative:

1. the fixed amount comes off first — it is a voucher, and a voucher does not
   change when the order is large
2. the percentage is taken off what is left

so `after = (amount − fixed) × (100 − percent) / 100`, computed exactly, and only
then rounded. Rounding the intermediate step, or rounding the discount on its
own and subtracting that, gives a different number and is wrong:
`applyDiscount('0.03', { percent: '50' })` is `0.02` — the exact result is
`0.015`, and it is rounded once.

`percent` must be between `0` and `100` inclusive; anything else is a data error
and throws. A missing discount, or `{}`, is zero: the amount is unchanged apart
from the single rounding.

A percentage applies to **the amount it was handed**, once. It is never applied
line by line and summed: three lines of `0.03` at 10% is one discount of `0.009`
off `0.09`, and not three discounts of `0.0027`, and the difference is a minor
unit that shows up on the invoice.

`percentageOf(amount, percent)` returns `amount × percent / 100` exactly,
normalised and **unrounded**, for callers that want the discount figure itself.

## 7. Invoices

`createInvoice({ currency, lines })` builds an invoice in one currency. `lines`
is an array of `{ description, amount }`; a description is optional and is kept
as written apart from surrounding whitespace, and an amount is a decimal string
that may be negative — a credit line is a line like any other. An unknown
currency, and a missing amount, are errors.

`invoice.lines()` returns the lines in the order they were added, with their
amounts normalised. `invoice.addLine(line)` appends one.

`invoice.net()` is the exact sum of the line amounts, normalised. It is not
rounded and it is not fixed-scale: `0.1` and `0.2` net to `0.3`.

`invoice.total(options)` is the invoice total after `options.discount`, rounded
once at the **invoice currency's** minor units with `options.mode ?? 'half-up'`,
and returned fixed-scale. The discount applies to the net, once, exactly as
section 6 says — never per line.

`invoice.allocate(amount, options)` splits a shared charge across the lines in
proportion to **their amounts**, at the invoice currency's minor units — the
currency decides the scale, not a constant — using section 4. A credit line
carries a negative weight, and therefore a negative share.

`invoice.report(options)` returns what a printed invoice shows:

```
{
  currency: 'EUR',
  charge: '5.00',
  lines: [ { description: 'Storage', amount: '10.00', share: '2.50' }, ... ],
  total: '14.99',
}
```

- `charge` is `options.charge`, defaulting to a zero amount in the invoice
  currency.
- `amount` is the line amount formatted at the invoice currency's minor units.
- `share` is that line's part of the charge, from section 4: **the shares sum
  exactly to the charge**, and the printed invoice is expected to foot.
- `total` is `invoice.total(options)`.
- Every amount in the report is written at the invoice currency's minor units.
