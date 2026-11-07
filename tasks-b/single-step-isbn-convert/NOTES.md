# single-step-isbn-convert

stratum: single-step

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-isbn10` | ISBN-10 check digit (weighted mod 11, X = 10) and validation | `src/isbn10.js` weights run 1..9 (from the wrong end) while keeping the `(11 - sum % 11)` formula, so generation and validation-by-recompute are both wrong; the same file compares the check letter case-sensitively, so a lower-case `x` is rejected though docs §2 accept it |
| `02-isbn13` | ISBN-13 check digit (alternating 1/3 weights mod 10) and validation | `src/isbn13.js` loops `i < 11` over the twelve digits, so the twelfth digit never participates; generation and validation are both wrong unless digit 12 is 0 |
| `03-separators` | separator tolerance (hyphens/spaces between characters, never leading/trailing, never adjacent) | `src/normalize.js` strips every hyphen and space wherever they appear, so leading, trailing and doubled separators are accepted against docs §1 |
| `04-convert-to-13` | ISBN-10 -> ISBN-13 (978 prefix + freshly computed check) | `src/convert.js` `toIsbn13` keeps the old ISBN-10 check character as the 13th digit instead of computing a fresh ISBN-13 check digit (docs §4) |
| `05-convert-to-10` | ISBN-13 -> ISBN-10 (978 prefix only) | `src/convert.js` `toIsbn10` tests `startsWith('97')`, so 979-prefix numbers convert though docs §5 give them no ISBN-10 form; the fresh ISBN-10 check digit also depends on the `01` bug |
| `06-hyphenate` | simplified hyphenation table (978 + group 0/1) | `src/hyphenate.js` probes the band table with `bare.slice(3, 12)` — the group digit included — so the probe always lands in the first band and every registrant is split after two digits |

Six bugs across five modules (`isbn10.js` has two, `convert.js` has two).
`src/ranges.js` (the table data), `src/index.js`, `bin/isbn.js` are correct as
shipped; `ranges.js` exists so the expected hyphenations have to be derived
from data, not from a comment.

## guards (cases that already pass on the untouched fixture)

- `03-separators` / *hyphens and spaces between the characters are stripped* —
  the over-liberal normalizer handles documented separators fine.
- `04-convert-to-13` / *input that is not isbn-10 shaped converts to null* —
  both implementations reject non-ISBN-10 shapes.
- `06-hyphenate` / *a two-digit registrant hyphenates after two digits* — the
  misplaced probe lands in the first band anyway when the registrant really is
  two digits, so `978-0-19-...` comes out right by accident.

A handful of further guard *assertions* (null on wrong length, `false` on a
check digit neither implementation accepts, null for 979 / group-2
hyphenation) are embedded inside failing cases, where they cost no floor.

## interactions (cases exercising two sub-problems at once)

- `02` / *validation tolerates the documented separators* — separators x ISBN-13
  validation.
- `03` / *validation applies the same separator rules* — normalization x both
  validators.
- `04` / *an X check digit, upper or lower case, converts like any other* —
  conversion x check-letter handling.
- `04` / *the input check digit is trusted, not re-verified* — the awkward
  documented rule the visible suite never touches.
- `05` / *separated input converts identically* — normalization x conversion.
- `05` / *the fresh check digit can be the letter X* — conversion x ISBN-10
  check generation (needs the `01` fix to pass).
- `06` / *hyphenation is positional and keeps a wrong check digit untouched* —
  hyphenation x the not-re-verified rule, plus already-hyphenated input.

Coupling by construction: `04` needs both the `convert.js` recompute fix and
the `isbn13.js` weight fix; `05`'s mainline cases need the `isbn10.js` fix and
its 979 case needs the `convert.js` prefix fix; `01`'s lower-case case is fixed
by the same module edit as its weight cases, keeping file 01 a one-module
sub-problem. No fix flips another file's cases accidentally.

## measured

- untouched fixture: 3 / 24 hidden cases (the three guards), visible suite
  1 / 11 pass, exit 1
- reference: 24 / 24 hidden cases, visible suite 11 / 11 pass, exit 0

Reference changes 5 files: `src/{normalize,isbn10,isbn13,convert,hyphenate}.js`.

## where partial credit comes from

Files 01, 02, 03 and 06 each move with a single-module fix; 04 additionally
needs correct ISBN-13 check digits and 05 needs correct ISBN-10 check digits,
so a "green the visible suite and stop" solution (which still has to touch
every module but may miss the separator positions, the 979 prefix, the
lower-case acceptance, the trusted-check-digit rule and the band boundaries)
lands roughly mid-scale.
