# House number rules

Every number that leaves this toolkit — a metrics line, a CSV cell, a rendered
config value — and every number that comes back in through `parseNumber` follows
these rules. They are what the customer-facing reports agreed on, and they are
implemented by hand on purpose: the reporting containers have no ICU data, no
locale environment and no clock, so nothing here may read a locale, the system
time or a random source.

When this document and `src/` disagree, this document is right.

## 1. Digits, rounding and the decimal point

`format(value, { digits })` renders the **integer part**, a decimal point `.`, and
**exactly `digits` fraction digits** (default 2). A value with a shorter exact
expansion is padded: `format(2)` is `2.00`, `format(2, { digits: 4 })` is
`2.0000`. A value with a longer one is rounded, not truncated.

Rounding is **half away from zero on the exact decimal value of the number**:
`1.005` at two digits is `1.01` and `2.675` is `2.68`, even though the doubles
nearest to those literals sit just below the halfway point. Half-up is a property
of the printed decimal value, not of the binary double.

A result of zero is always written `0`, `0.0` or `0.00` — never `-0`, `-0.0` or
`-0.00`. Rounding a small negative value to zero loses the sign: `format(-0.004)`
is `0.00` and `format(-0.0001, { digits: 3 })` is `0.000`. Just as importantly, a
negative value that does **not** round to zero keeps its sign: `format(-0.005)`
is `-0.01`.

`NaN`, `Infinity` and `-Infinity` are their own renderings — `'NaN'`,
`'Infinity'`, `'-Infinity'` — and are never padded, grouped or rounded.

## 2. Grouping

The integer part is grouped in **threes from the right** with `,` as the
separator. The rule is: **any integer part of four or more digits is grouped;
fewer than four digits is not.** So `group(999)` is `'999'` and `group(1000)` is
`'1,000'`.

`group(value)` is the same rendering as `format(value)` at the default digit
count — two fraction digits, trailing zeros included — so `group(1234)` is
`'1,234.00'` and `group(12345.6)` is `'12,345.60'`.

Grouping applies to the **integer part only**. The fraction is never grouped and
never padded with separators: `format(12345.678)` is `'12,345.68'`, and the
fraction of the value is untouched by the separators.

The sign is not part of the groups: `format(-1234567.891)` is `'-1,234,567.89'`.
`format(..., { grouping: false })` renders the same value with no separators at
all; the default is `grouping: true`.

Zero has one digit in its integer part and is therefore never grouped: `group(0)`
is `'0.00'`.

## 3. Significant digits

`precise(value, sig)` renders `sig` **significant** digits (default 6), which is
the `toPrecision` idea with this toolkit's notation. Trailing zeros that carry
significance are kept: `precise(1.5, 3)` is `'1.50'`, `precise(2, 3)` is
`'2.00'`, `precise(0.5, 3)` is `'0.500'`, and `precise(0, 3)` is `'0.00'`.
Rounding is the same half-away-from-zero rule as section 1 — `precise(2.5, 1)` is
`'3'`.

`format(value, { significant: sig })` is the same rendering reached through the
general entry point, and `digits` still bounds it: **`digits` is the maximum
number of fraction digits, `significant` is how many significant digits are
kept.** `format(2.675, { significant: 2, digits: 2 })` is `'2.7'` (two
significant digits need no fraction digits at all), `format(2.5, {
significant: 3, digits: 2 })` is `'2.50'`, `format(2.5, { significant: 3,
digits: 5 })` is `'2.500'`, and `format(0.5, { significant: 3, digits: 2 })` is
`'0.50'` because the cap bites. Passing `{ digits: 0 }` with no `significant`
rounds to a whole number and prints no decimal point at all: `format(2.5, {
digits: 0 })` is `'3'`.

## 4. Notation

Plain notation is used while the **decimal exponent of the value** — the `k` in
`value = m * 10^k` with `1 <= m < 10` — is between `-3` and `20` inclusive.
Outside that range the value is written in scientific notation.

| value | exponent | notation |
|---|---|---|
| `999999999999` (9.99999999999e11) | 11 | plain → `999,999,999,999.00` |
| `1e12` | 12 | plain → `1,000,000,000,000.00` |
| `1e20` | 20 | plain |
| `1e21` | 21 | scientific → `1.00e+21` |
| `0.125` | -1 | plain → `0.13` |
| `0.0001` | -4 | scientific → `1.00e-4` |
| `5e-7` | -7 | scientific → `5.00e-7` |

The mantissa carries the requested number of digits (`digits`, or `significant`
when that is set) and is never grouped — the group separator belongs to plain
notation only. The exponent is written with an explicit sign, `e+` or `e-`, and
with no leading zeros: `1.00e+21`, `5.00e-7`, `1.00e+0`. `e+0` is the exponent
of a value whose mantissa is between 1 and 10.

Rounding happens first and can change the notation: a mantissa that rounds up to
`10` is renormalised (`9.99e+20` at one digit is `1.0e+21`, not `10.0e+20`), and
a value that rounds up across a plain boundary is printed in scientific notation
even though the value that arrived was inside the plain range.

A value is judged on the exponent it arrives with, not on the digits its own
grid would keep. A tiny value that renders as zeros is still scientific:
`format(0.0001)` is `'1.00e-4'`, not `'0.00'`, because `0.0001` is not zero and
the grid cannot show what it is. A value that *is* zero after rounding is the
exception — `format(-0.004)` is `'0.00'` — and zero is never scientific.

`0`, `-0`, `NaN` and the infinities are **never** scientific. Zero is `0.00` at
the default digit count, `-0` prints as `0.00` (never `-0.00`), and `NaN` and the
infinities print as themselves whatever the options say.

## 5. Extremes

A double is rendered from its **exact** decimal digits, never from a rounded
shortcut, so:

- `Number.MAX_SAFE_INTEGER` is `9,007,199,254,740,991.00`
- `9007199254740993` is `9,007,199,254,740,992.00`, because `9007199254740993`
  is not a double and the value that reaches the formatter is
  `9007199254740992`
- `Number.MIN_VALUE` and other subnormals are rendered in scientific notation
  with the same digits the double actually has: `5e-324` at six significant
  digits is `4.94066e-324`, and `2.2250738585072014e-308` is
  `2.22507e-308`
- beyond `Number.MAX_SAFE_INTEGER` the digits printed are the digits of the
  **double that was passed**, not of the literal in the source. There is no
  error and no exception for a large value: it is rendered exactly, and it is
  parsed back to the same double.

## 6. Parsing

`parseNumber(text)` is the reader used for config values and pasted report
cells. It returns a `number` and throws a `RangeError` whose message contains the
offending text when the input is not a number this toolkit would render.

Accepted:

| input | result | why |
|---|---|---|
| `'1234.5'` | `1234.5` | plain |
| `'1,234.5'` | `1234.5` | grouped integer part |
| `'  +12  '` | `12` | surrounding whitespace and a leading `+` are ignored |
| `'-0.00'` | `0` | a parsed zero is `0`, never `-0` |
| `'1.00e+21'` | `1e21` | the scientific form this toolkit prints |
| `'4.94066e-324'` | `5e-324` | the subnormal form this toolkit prints |

Grouping, when a separator is present at all, must be **exactly** groups of
three digits separated by `,`: the first group may hold one to three digits, and
any integer part with four or more digits must carry its separators.
`'12,345'` and `'123,456,789'` parse; `'1,2,3'`, `'12,34'` and `'1234,567'` do
not. A separator is never allowed inside the fraction, and the fraction is never
grouped. A lone separator, an empty string, a bare sign, a value with trailing
junk (`'12 monkeys'`) and a value that is only whitespace are all equally
invalid: `parseNumber` throws, and `tryParseNumber` returns `undefined`.

Every string `format` or `precise` produces for a finite value parses back to
that value: `parseNumber(format(x))` and `parseNumber(precise(x, sig))` equal
`x` for every finite double this toolkit is asked to print.
