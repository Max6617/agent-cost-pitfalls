# Fraction rules

The rules the library was built to. `src/` is the implementation; when the two
disagree, this document is right and the code is a bug.

## 1. What a fraction is

A fraction is a frozen plain object `{ n, d }`: two integers, a numerator and
a denominator. Values come from `makeFraction(n, d)`, from `fromString(text)`,
or from the operators — callers never hand-roll the object, so every value the
library handles satisfies the normalisation rules in §2.

`makeFraction` accepts integers only and throws `TypeError` for anything else.
A zero denominator is never a fraction: `makeFraction(n, 0)` throws
`RangeError('zero denominator')`.

## 2. Normalisation

Every fraction the library returns is normalised:

- the parts are coprime — `2/4` is stored and printed as `1/2`;
- the denominator is strictly positive — there is no `1/-2`;
- the sign lives in the numerator — `-3/2`, never `3/-2`;
- zero is exactly `0/1` — `0/5`, `0/-7` and `-0/5` are all the same value `0/1`.

This applies to values built by the operators too: a sum or a product comes
out already reduced, with the sign in front.

## 3. Notation

`fromString` accepts three written forms:

| form | example | value |
|---|---|---|
| plain fraction | `'3/4'`, `'-9/6'` | the fraction, reduced as always |
| bare integer | `'7'`, `'-13'` | that integer |
| mixed number | `'1 1/2'` | the whole part plus the fractional part |

A mixed number's leading sign applies to the **whole value**, not to the whole
part alone: `'-1 1/2'` is `-(1 + 1/2) = -3/2`, not `-1 + 1/2`.

Spacing is free: surrounding whitespace is ignored, one or more spaces may
separate the whole part from the fraction, and spaces may appear around the
slash — `'3 / 4'` is the same value as `'3/4'`.

Anything that is not one of the three forms throws `TypeError`. A zero
denominator, in any notation, throws `RangeError('zero denominator')`.

## 4. Arithmetic

`add`, `sub`, `mul` and `div` are exact. No arithmetic path involves binary
floating point: `1/3 + 1/6` is `1/2`, and `2/3 ÷ 4/5` is exactly `5/6`, never
a long decimal approximation. Exactness is guaranteed whenever every value
involved — the operands and the exact result — keeps `|n|` and `d` at or below
`Number.MAX_SAFE_INTEGER`; within that bound nothing overflows either.

Division by a zero fraction throws `RangeError('division by zero')`. It never
returns a value, an infinity, or a NaN.

`negate` and `abs` do what their names say and return normalised values.
`toNumber(f)` returns the nearest double and exists for display only; nothing
in the library's arithmetic routes through it.

## 5. Comparison

`compare(a, b)` returns `-1`, `0` or `1`, following the total order of the
values:

- a negative is below zero and below every positive, whatever the magnitudes;
- two negatives order by reversed magnitude (`-3/4` is below `-1/4`);
- equal values compare `0` however they were written.

Comparison is exact for every value in the documented bound: the cross
products are computed in integer arithmetic, never floating point.

`equals(a, b)` is value equality: `equals(1/2, 2/4)` is true.

`sort(fractions)` returns a **new** array in ascending order; the argument is
not modified, and equal elements keep their original relative order.
`min(a, b)` and `max(a, b)` return the argument that is smaller, resp. larger,
under the same order.

## 6. Output

`toString` is the canonical written form, and the one values round-trip
through: lowest terms, sign on the numerator, denominator omitted when it is
one — `'1/2'`, not `'2/4'`; `'3'`, not `'3/1'`; `'-1/2'`, never `'1/-2'`;
`'0'` for zero.

`toMixedString` renders whole part plus proper fraction, with the sign carried
by the whole value: `7/2` is `'3 1/2'`, `-7/3` is `'-2 1/3'`. A proper
fraction has no whole part (`3/4` is `'3/4'`), and a whole value has no
fraction part (`8/4` is `'2'`).
