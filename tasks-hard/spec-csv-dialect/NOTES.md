# spec-csv-dialect

**stratum:** spec-implementation
**prompt:** "Supplier files are coming out of the import pipeline mangled. Rows with a quoted newline lose their line breaks or split in the wrong place, a file that arrives with a byte-order mark ends up with a first column nobody can map to, and ragged rows quietly gain or lose a column instead of being reported to the supplier. When we write a file back out it is not what we read: the header disappears, the line endings change, and a field that was empty comes back as something else. Please make the reader and the writer behave the way the spec in docs/ says they do - the tests under test/ are the examples we wrote down, not the whole acceptance criteria."

The contract is `fixture/docs/dialect-spec.md`: a normative dialect spec (quoting,
lines, BOM, headers, ragged policies, error positions, writing, sniffing) with a
worked-example table. Every hidden expectation is stated there or is an instance
of a stated rule.

## Sub-problems (one hidden test file each)

| file | sub-problem | the deviation in the fixture |
|---|---|---|
| `01-quoting` | a field is quoted only from its first character; `escape`; `text-after-quote` and `unterminated-quote` | `tokenise.js` toggles "between quotes" on *every* quote, only understands RFC doubling, never reports `text-after-quote`, and silently returns the partial field when the text ends inside a quote |
| `02-lines-eof` | LF/CRLF, embedded newlines kept verbatim, BOM, the record after the last terminator | `tokenise.js` rewrites an embedded CRLF to LF and drops the record that has no final terminator; `reader.js` strips the BOM from the first field *value* instead of from the text, so a quoted first field mis-scans and a BOM inside a quoted field is eaten |
| `03-headers` | `header: true/false/string[]`, `column_<n>`, repeated names, `rename` | `header.js`/`reader.js` drop unnamed columns instead of naming them (which shifts every value after them), never number repeats, always eat the first record even when names were supplied, and `rename` ignores `null` targets, unknown keys and collisions |
| `04-ragged` | `error` / `pad` / `truncate` / `ignore`, and the position of the failure | `ragged.js` pads with `''`, lets `pad` swallow a long row and `truncate` swallow a short one, keeps short rows under `ignore`, and reports the 0-based data index with no `line` and the wrong `column` for long rows |
| `05-whitespace` | absent vs empty, `trim` | `values.js` returns `''` for an unquoted empty field and trims quoted fields too, using `String.trim()` rather than the spec's space-and-tab |
| `06-writing` | quoting only when necessary, `eol` and the final terminator, header emission and order, round trip | `writer.js` joins with a hard-coded `\n` and never terminates the last record, writes only the header it was handed explicitly, ignores a `header` array as the column order, writes `null` as `""` and `''` as nothing, writes column names unquoted, and quotes only for the delimiter and `\n` |

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 4/13 pass, exit 1 | **3/25 = 12%** |
| reference | 13/13 pass, exit 0 | **25/25 = 100%** |
| "greens `test/` and stops" arm | 13/13 pass, exit 0 | **8/25 = 32%** |

The third row is measured, not estimated: the reference with exactly the
behaviours the visible suite does not exercise reverted (quote: null,
`unterminated-quote`, the record after the last terminator, `line` numbers on
records, supplied header names, all of `rename`, all four ragged policies, the
value rules, trim-aware quoting and the header-order rule).

Reference changes 7 files: `src/{dialect,tokenise,values,header,ragged,reader,writer}.js`.

## Hardening round 1 (the first suite was saturated: arms at 98-100%)

Ten cases were replaced and six more tightened; the case count (25), the file
split (5/4/4/5/3/4), the three guards and the 12% floor are unchanged.

| replaced | with | the two rules that now fight |
|---|---|---|
| `01` "a quote is special only where a field starts" | "a doubled quote is content, and the field ends at the quote left over" | the pair test against the close test (`"a"""` is `a"`, `""""` is `"`, `"a""` never closes) |
| `01` "escape replaces the RFC doubling" | "escape is special only immediately in front of the quote" | an `escape` in front of a closing quote keeps the field open, and `escape+escape` is data |
| `02` "keeps the line endings inside it" (one line) | three lines with LF and CRLF mixed, and a CRLF directly before the closing quote | line handling against quote adjacency |
| `02` "text after the last terminator is a record too" | the last record is itself a two-line quoted field, and a trailing terminator adds no row | EOF against multi-line records |
| `03` "unnamed column" + "repeated names" (two plain cases) | one case where the generated `column_1` is already taken, so the count carries on | generated names against numbering |
| `03` "supplied names replace the header line" | supplied names go through the same naming rules, and set the width (a long row is then `ragged-row` at column 3) | naming against width against the ragged policy |
| `03` "rename a numbered duplicate" | supplied names + a rename of the numbered one + the collision error | naming against mapping against errors |
| `04` "pad fills a short row" | the short row follows a field spanning three lines; `pad`, `row`, `line` and `column` are all asserted | policy against multi-line records against positions |
| `04` "truncate drops the extra fields" | truncation of a row that carries a three-line field | policy against multi-line records |
| `04` "ignore drops every row that does not fit" | a long *and* a short row, the long one after a multi-line field | policy against both directions |
| `06` "every record is terminated" | a `header` array sets the column order, a missing key is absent, no names means no header line | writing against column order |
| `06` "a parse result writes its own header back" | the header line is rendered by the field rules (a name holding a comma and a name holding a quote) | writing against quoting |

Tightened in place: `01` `text-after-quote` and `unterminated-quote` now sit
inside records that span two lines, so `row` and `line` have to be tracked
apart; `04`'s long row after a three-line field asserts `width + 1`; `05` gained
"a padded field is absent but a quoted empty one is not" and the no-break-space
rule; `06`'s quote-necessity case gained a field that is nothing but a quote
character and the escape dialect.

Two clarifications went into the spec with them, because the new cases turn on
them: a `\r` before a record-ending `\n` is the terminator while a `\r` inside
quotes is data, and `escape` is only special immediately in front of a `quote`.

## Guards (3 - pass on the untouched fixture on purpose, the floor)

- `01-quoting`: `resolveDialect()` fills in the documented defaults.
- `02-lines-eof`: a blank line is not a row and does not use up a row number.
- `04-ragged`: with `header: false` the first record fixes the width, and clean
  rows are returned untouched.

These are the only three cases that pass on the untouched fixture.

## Interaction cases (22 of 25)

Every case except the three guards now needs at least two rules at once. The
sharpest: the pair/close ordering in `01`; the escape pair in `01`; `row`
against `line` after a record that spans two lines (`01`, `04`); a BOM that is
only dropped at the very start of the text (`02`); a generated name colliding
with a supplier's own `column_1` (`03`); supplied names against numbering
against `rename` (`03`); `pad` after a three-line field with the position
asserted (`04`); a padded absent field against a quoted empty one (`05`); a
no-break space that is not a space or a tab (`05`); a `header` array that
reorders object records and a header line rendered by the quoting rules (`06`).

## Where partial credit comes from

The visible suite is the easy end of five sub-problems. Afterwards the score
moves one case at a time: each policy, each naming rule, each position rule and
each interaction between them is worth exactly one case. The visible-only arm
sits at 32%; a solution that implements every stated rule literally should land
around 21-24/25, and one that takes the natural-but-wrong reading of the pair
ordering, the escape pair, the BOM position, the header order or the trim set
lands at 17-20/25.

The fixture's `tokenise.js` is shared by sub-problems 1 and 2, so those two
files move together on the first edit; nothing else is coupled.
