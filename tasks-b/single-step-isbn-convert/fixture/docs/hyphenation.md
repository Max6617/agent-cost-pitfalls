# Hyphenation (simplified)

`hyphenateIsbn13` inserts the hyphens of a 978-prefixed ISBN-13:

```
978 - group - registrant - publication - check
```

The catalogue site only ever displays English-language titles, so this library
implements the simplified table below, covering group identifiers 0 and 1
only. A 979 ISBN-13, or a 978 whose group digit is not 0 or 1, hyphenates to
`null`.

Hyphenation is **positional**: it does not inspect the check digit. An ISBN-13
with a wrong check digit hyphenates exactly as if the check digit were right;
whether the number is valid is a separate question (`isValidIsbn13`).

## The registrant table

The registrant (publisher) element is found by trying successively longer
prefixes of the eight digits that follow the group element — two digits, then
three, and so on up to seven — and taking the first length whose value falls
inside a band, bounds inclusive:

| digits following the group element | registrant length |
|---|---|
| 00–19 | 2 |
| 200–699 | 3 |
| 7000–8499 | 4 |
| 85000–89999 | 5 |
| 900000–949999 | 6 |
| 9500000–9999999 | 7 |

Worked example: `9780306406152`. The group element is `0`; the digits after it
begin `306…`. `30` is not in 00–19, but `306` is in 200–699, so the registrant
is `306`, the publication element is `40615`, and the hyphenation is
`978-0-306-40615-2`.

A second example: `9780197029213` hyphenates as `978-0-19-702921-3`, because
`19` already falls in the first band.
