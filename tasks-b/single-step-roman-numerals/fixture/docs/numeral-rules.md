# Numeral rules

The rules agreed with the team maintaining the inscription archive. `src/` is
the implementation; when the two disagree, this document is right and the code
is a bug.

## 1. Range

The library represents the classical range: the integers 1 to 3999 inclusive.

- `format(n)` throws a RangeError for anything else: 0, negatives, 4000 and
  above, non-integers, non-numbers.
- A numeral whose letters total outside the range is rejected by `parse` in
  every mode, however it is written.

## 2. Symbols and the canonical form

I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1000.

A numeral is a string of uppercase symbols only: no spaces, no lowercase, no
punctuation. Anything else is rejected in every mode.

The canonical form of a value is the one `format` produces. Its grammar:

- Values are written largest-first: thousands, then hundreds, then tens, then
  ones.
- A smaller symbol may stand to the left of a larger one - subtractive
  notation - only as one of the six legal pairs: **IV, IX, XL, XC, CD, CM**.
  Anything else that looks subtractive (IL, IC, XD, XM, VL, DM, ...) is
  illegal in every mode.
- I, X, C and M may repeat up to three times in a row, never four.
- V, L and D never repeat. VV, LL and DD are illegal in every mode.

| value | canonical | | value | canonical |
|---|---|---|---|---|
| 1 | I | | 90 | XC |
| 4 | IV | | 400 | CD |
| 9 | IX | | 900 | CM |
| 40 | XL | | 3999 | MMMCMXCIX |

## 3. Parsing modes

`parse(input, options)` takes `options.mode`: `'strict'` or `'lenient'`.
The default is **strict**. Any other value for `mode` is rejected with a
throw, even when the input itself is a valid numeral.

- **strict** accepts only the canonical form. The numeral must obey every
  rule of section 2.
- **lenient** exists for the legacy inscriptions in docs/legacy-sources.md.
  It additionally accepts additive over-runs of the repeatable symbols:
  IIII for 4, VIIII for 9, XXXX for 40, LXXXX for 90, CCCC for 400,
  DCCCC for 900, and the like.

Lenient is not "anything goes". In lenient mode the parser still rejects:

- illegal subtractive pairs (IL, IC, XD, ...) - they were never written,
  even in the sloppy sources;
- repeated V, L or D;
- characters outside the seven symbols, lowercase and whitespace included;
- the empty string;
- totals outside 1..3999.

## 4. Formatting

`format(n)` is the canonical writer: a greedy walk over the descending table
of section 2, so its output always satisfies section 2 and never contains an
over-run or an illegal pair. 400 is CD, never CCCC; 900 is CM, never DCCCC;
3999 is MMMCMXCIX, never an additive spelling.

## 5. Round trips and canonicalize

`canonicalize(x)` is the normaliser for imported inscriptions: it parses
leniently and formats the value. It is exactly
`format(parse(x, { mode: 'lenient' }))`, and it rejects whatever that parse
rejects.

The round-trip laws the archive relies on:

- `parse(format(n)) === n` for every integer 1..3999;
- `format(parse(s)) === s` exactly when `s` is canonical;
- `canonicalize(canonicalize(x)) === canonicalize(x)` for every accepted
  input.
