# ISBN rules

Agreed with the cataloguing team before this library was written. When the code
and this document disagree, the document is right and the code is a bug.

## 1. Forms and separators

An ISBN is ten characters (ISBN-10) or thirteen digits (ISBN-13). The last
character of an ISBN-10 is its check digit and may be the letter X, which
counts as ten; every other character of both forms is a decimal digit.

On input, every function in this library tolerates hyphens and spaces as
separators between the characters of an ISBN, under the rules the typesetters
asked for:

- a separator never leads or trails the string, and
- two separators are never adjacent.

Anything else — a letter other than the check X, a wrong character count, a
separator in one of the positions above — is not an ISBN, and `normalizeIsbn`
returns `null` for it.

`normalizeIsbn` returns the bare form: separators removed, nothing else
changed. In particular a check letter keeps the case it was typed in.

## 2. ISBN-10 check digit

Multiply the first (leftmost) digit by 10, the second by 9, and so on down to
the ninth by 2. Sum, take the sum mod 11, subtract from 11, take mod 11 again.
The result is a digit 0-9, or the letter X when it is ten.

Worked example: `030640615` gives
0·10 + 3·9 + 0·8 + 6·7 + 4·6 + 0·5 + 6·4 + 1·3 + 5·2 = 130, 130 mod 11 = 9,
11 − 9 = 2, so the check digit is `2` and the full ISBN-10 is `0306406152`.

Validation recomputes the check digit from the nine digits and compares it with
the check character. The check letter is accepted in either case on input —
`0-8044-2957-x` is as valid as `0-8044-2957-X`. Anything the library *produces*
(check digits, conversions) always writes the letter upper-case.

## 3. ISBN-13 check digit

Multiply the twelve digits by weights alternating 1, 3, 1, 3, …, starting with
1 on the leftmost digit; every one of the twelve digits participates. Sum, take
the sum mod 10, subtract from 10, take mod 10 again. The result is always a
digit 0-9 — there is no letter form.

Worked example: `978030640615` gives
9 + 21 + 8 + 0 + 3 + 0 + 6 + 12 + 0 + 18 + 1 + 15 = 93, 93 mod 10 = 3,
10 − 3 = 7, so the full ISBN-13 is `9780306406157`.

Validation recomputes and compares, exactly as for ISBN-10.

## 4. ISBN-10 → ISBN-13

Replace the old check digit with the prefix 978, then compute a *fresh* ISBN-13
check digit over the resulting twelve digits. The old check digit is dropped,
never carried over — an ISBN-10 ending in X converts like any other, and so
does one whose check letter was typed lower-case.

The input's own check digit is trusted, not re-verified: conversion converts
the nine digits it was given. So `toIsbn13('0306406159')` is `'9780306406157'`
— the wrong input check digit plays no role — and input that is not ten
characters of ISBN-10 shape converts to `null`.

## 5. ISBN-13 → ISBN-10

Only the 978 prefix has an ISBN-10 form. For 978, drop the prefix and the old
check digit, then compute a fresh ISBN-10 check digit over the remaining nine
digits; that fresh check digit can be the letter X.

The input check digit is trusted, as above, so a 978 with a wrong check digit
still converts. A 979-prefixed ISBN-13 has no ISBN-10 equivalent and converts
to `null`, as does anything that is not thirteen digits.

## 6. Validation entry points

`isValidIsbn10` and `isValidIsbn13` normalize first (the separator rules of §1)
and then recompute the check digit. Anything `normalizeIsbn` rejects is
invalid; a well-formed ISBN whose check digit does not match is invalid.
