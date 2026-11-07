# Delimited text: the import dialect

The import pipeline reads whatever the suppliers send us and writes it back out
for the loader. This document is the contract for that reader and writer: `src/`
implements it, and where the two disagree this document is right.

Everything below is normative. The reader is `parse()`, the writer is `write()`,
and both are reached through `src/index.js`.

## 1. The dialect

A dialect is a plain object. Any subset of it may be handed to `parse()`,
`write()` or `resolveDialect()`; the rest comes from these defaults.

| key | default | values | meaning |
|---|---|---|---|
| `delimiter` | `','` | one character | separates fields outside quotes |
| `quote` | `'"'` | one character, or `null` | starts and ends a quoted field; `null` disables quoting |
| `escape` | `'"'` | one character | how a `quote` inside a quoted field is written; `escape === quote` is the RFC 4180 doubling |
| `eol` | `'\r\n'` | `'\n'` or `'\r\n'` | the terminator `write()` emits |
| `header` | `true` | `true`, `false`, or names | see §5 |
| `trim` | `false` | `true` or `false` | strip whitespace from the ends of unquoted fields, see §4 |
| `ragged` | `'error'` | `'error'`, `'pad'`, `'truncate'`, `'ignore'` | see §6 |
| `rename` | `null` | object, or `null` | column mapping by name, see §5.4 |

`resolveDialect(options)` returns the full dialect with every key filled in.
Keys it does not know are ignored, so a call site may pass its own options
object straight through.

A dialect that cannot be honoured is a `TypeError`, raised by `resolveDialect()`
before any text is read:

- `delimiter`, `quote` and `escape` are each a single character — `quote` may be
  `null` instead — and none of them is `\r` or `\n`;
- `delimiter` differs from `quote`, and `delimiter` differs from `escape`
  (`escape` may equal `quote`, which is the default);
- `eol` is exactly `'\n'` or `'\r\n'`;
- `ragged` is one of the four policies;
- `header` is `true`, `false`, or an array of strings.

## 2. Text, lines and records

- The text is read character by character. Nothing is lower-cased, normalised or
  reassembled on the way in.
- **BOM.** A single U+FEFF as the very first character of the text is not data:
  it is dropped before anything else happens, whether or not the first field is
  quoted. A U+FEFF anywhere else is an ordinary character.
- **Lines.** The text is a sequence of physical lines separated by `\n`. A `\r`
  immediately before a `\n` that ends a record is part of that terminator and
  belongs to no field; inside a quoted field a `\r` is data like any other
  character (§3). A `\r` that is not followed by `\n` is ordinary data, inside a
  quoted field or outside one. There is no other line terminator.
- **Records.** A record ends at the first `\n` outside a quoted field (§3), so a
  record may span several physical lines. Text after the last `\n` is still a
  record: a file with no final terminator ends with the same records as one that
  has it.
- **Blank records.** A record that consists of exactly one field that is empty
  and unquoted — an empty line — is not a record at all. It is skipped, produces
  no row, and does not use up a row number. A line holding `""` is a record with
  one empty field, and is not blank.

`parse(text, options)` returns

```js
{
  columns: string[] | null,       // §5; null when there is no header
  rows: Array<object|string[]>,   // one entry per non-blank data record, in order
  dialect,                        // the resolved dialect that was used
}
```

`parse()` does not mutate its arguments and keeps no state between calls.

## 3. Fields, quotes and escapes

- Outside quotes, the `delimiter` ends a field.
- A field is **quoted** when, and only when, its first character is `quote`. A
  `quote` character anywhere else is ordinary data: `a"b` is the three-character
  field `a"b`, and `ab"` is `ab"`.
- Inside a quoted field the sequence `escape` followed by `quote` is one literal
  `quote` character and does not end the field. Every other character — the
  `delimiter`, `\n`, `\r`, or a `quote` that does not follow an `escape` — is
  data. With the default dialect this is the RFC 4180 doubling, so `"a""b"` is
  the three-character value `a"b`.
- `escape` is special only immediately in front of a `quote`. An `escape`
  followed by anything else, a second `escape` included, is ordinary data; and a
  quoted field whose content would end with the `escape` character does not
  close at the `quote` after it, because the `escape` takes that `quote` as
  content instead.
- The quoted section ends at the `quote` that is not part of an escape pair.
  After that closing quote only the `delimiter`, the end of the record or the end
  of the text may follow; anything else, a space included, is the error
  `text-after-quote` (§7). `"a",b` is fine, `"a"x,b` is not.
- With `quote: null`, nothing is quoted and every quote character is data.
- A quoted section that opens and is never closed is the error
  `unterminated-quote` (§7). The reader reports it and returns nothing; it never
  returns a partial result.

## 4. Values: absent, empty and whitespace

Once a field has been scanned its **value** follows from its text and from
whether it was quoted.

| field in the file | quoted? | `trim: false` | `trim: true` |
|---|---|---|---|
| `a` | no | `'a'` | `'a'` |
| nothing, between two delimiters | no | `null` | `null` |
| two spaces | no | `'  '` | `null` |
| ` a ` | no | `' a '` | `'a'` |
| `""` | yes | `''` | `''` |
| `" a "` | yes | `' a '` | `' a '` |
| `"a""b"` | yes | `'a"b'` | `'a"b'` |

- An unquoted field whose text is empty is **absent**, and its value is `null`.
- A field that is empty because it was quoted (`""`) is the **empty string**
  `''`. Absent and empty are different values, and §8 writes them differently.
- `trim` strips leading and trailing spaces and tabs (U+0020 and U+0009, nothing
  else) from unquoted fields. It never touches the content of a quoted field and
  never touches whitespace inside a value.
- Values are strings or `null`. The reader does not guess types.

## 5. Headers and column mapping

### 5.1 What the header is

| `header` | first record | `columns` | `rows` |
|---|---|---|---|
| `true` (default) | the header | its values, as names | objects keyed by column name |
| `false` | data | `null` | arrays of values |
| `['a','b']` | data | the names given | objects keyed by column name |

Input with `header: true` and no records at all gives `columns: []` and
`rows: []`.

### 5.2 Naming

The header record's values are computed by §4 first, then used as names:

- a name that is absent (`null`) or the empty string becomes `column_<n>`, where
  `<n>` is the 1-based position of the column;
- a name that is already taken gets `_2`, `_3`, … appended: the second column
  called `x` is `x_2` and the third is `x_3`. If the suffixed name is taken as
  well the count keeps going until the name is free, so a header of `a`, `a`,
  `a_2` names its columns `a`, `a_2`, `a_2_2`.

Names supplied with `header: ['a','b']` go through the same two rules.

The header record is never subject to §6. It defines the width.

### 5.3 Width

The width of the file is

- `columns.length` when there is a header, either read or supplied;
- the field count of the first record when `header` is `false`.

### 5.4 `rename`: column mapping by name

`rename` is applied to the resolved names, after §5.2, and changes both the keys
of the records and the contents of `columns`:

```js
parse(text, { rename: { 'Item Name': 'item', 'Supplier Ref': null } })
```

- a key that matches no column is the error `unknown-column`;
- a target that is already another column's name is the error
  `duplicate-column`;
- a target of `null` **drops** the column: it is not in `columns` and not in any
  record;
- mapping never changes the width used by §6. Raggedness is counted in fields,
  before any mapping.

## 6. Ragged rows

A record whose field count is not the width of the file (§5.3) is ragged, and
the `ragged` key decides what happens to it.

| policy | row shorter than the width | row longer than the width |
|---|---|---|
| `error` (default) | `ragged-row` error | `ragged-row` error |
| `pad` | padded with `null` to the width | `ragged-row` error |
| `truncate` | `ragged-row` error | extra fields dropped |
| `ignore` | row dropped | row dropped |

A dropped row is not in `rows` at all. With `header: false` the first record
defines the width, and a first record can never be ragged.

## 7. Errors

Anything wrong with the text raises a `ParseError`, whose `name` is
`'ParseError'`.

| `code` | raised when |
|---|---|
| `ragged-row` | §6 |
| `unterminated-quote` | §3: a quoted section is never closed |
| `text-after-quote` | §3: data follows a closing quote |
| `unknown-column` | §5.4: `rename` names a column the file does not have |
| `duplicate-column` | §5.4: `rename` would create a second column of that name |

Every `ParseError` carries the position of the problem:

- `row` — the 1-based index of the record, counting the header record and
  counting only records that are not blank. `null` when the problem is with the
  file as a whole (`unknown-column`, `duplicate-column`).
- `column` — the 1-based index of the field within that record. For a ragged row
  it is the first field with no counterpart: `fieldCount + 1` for a short row,
  `width + 1` for a long one. `null` when no field is at fault.
- `line` — the 1-based **physical** line the record starts on, counting every
  physical line including blank ones. `line` and `row` differ as soon as a
  record contains an embedded newline. `null` when there is no record.

The message is one line and begins with the code.

## 8. Writing

`write(rows, options)` returns the text. `rows` is one of

| shape | the records | the header line |
|---|---|---|
| `{ columns, rows }`, a `parse()` result | `rows` | `columns`, when it is not `null` |
| an array of objects | each object's values | only when `header: true` is asked for |
| an array of arrays | each array's values | only when `header: true` is asked for and the names are known |

`options.columns` overrides the column order, and so does `header` when it is an
array of names — that array is written as the first line and sets the order.
With objects and no names given, the keys of the first record are used, in
insertion order. A record that is missing a key writes an absent field.

Field rendering:

| value | written as |
|---|---|
| `null`, `undefined`, a key that is not there | nothing at all: an absent field |
| `''` | a quoted empty field, `""` |
| a string | bare, unless it needs quoting |
| anything else — a number, a boolean, an object | `TypeError` |

A string needs quoting when it contains the `delimiter`, the `quote` character,
`\r` or `\n`; when `trim` is on and it starts or ends with a space or a tab; and
when it is the empty string. Otherwise it is written bare, and a `quote`
character inside it is written as `escape` followed by `quote`.

The header line is a record like any other: it is rendered by the rules above,
so a column name that contains the delimiter, a quote or a line ending is
quoted too.

Records are joined with the dialect's `eol`, and **every** record is followed by
it, the last one included. `write([])` is the empty string.

With `quote: null` nothing can be quoted, so a field that would need quoting is a
`TypeError` rather than a silently corrupted file.

## 9. Sniffing

`sniffDialect(sample, options)` guesses the two parts of a dialect that cannot
be configured, the delimiter and the line ending.

- The candidates are `DELIMITERS` — `,`, `;`, tab, `|` — or `options.candidates`.
- The field count of the **first record** is computed for each candidate,
  honouring quotes. The highest count wins; a tie goes to the earlier candidate.
- If no candidate produces more than one field, the delimiter is `,`.
- `eol` is `'\r\n'` when the sample contains `\r\n`, and `'\n'` otherwise.

The result is a partial dialect, `{ delimiter, eol }`. Handing it straight to
`parse()` or `write()` is the intended use.

## 10. Worked examples

**10.1 quoting**

| text (one record) | `parse(text, { header: false }).rows` |
|---|---|
| `a,b,c` | `[['a','b','c']]` |
| `"a,b",c` | `[['a,b','c']]` |
| `"a""b",c` | `[['a"b','c']]` |
| `a"b,c` | `[['a"b','c']]` |
| `"a"x,b` | `ParseError` `text-after-quote`, row 1, column 1 |
| `"a,b` | `ParseError` `unterminated-quote`, row 1, column 1 |

**10.2 lines**

| text | result |
|---|---|
| `a,b\r\nc,d\r\n` | two records |
| `a,b\nc,d` | two records; the last has no terminator |
| `"x\r\ny",b\n` | one record; the field is `x\r\ny` |
| `\uFEFF"a",b\n` | the first value is `a` |
| `a,b\n\nc,d\n` | two records; the empty line is skipped |

**10.3 headers**

| text, options | result |
|---|---|
| `id,name\n1,a\n` | `columns: ['id','name']`, `rows: [{id:'1',name:'a'}]` |
| `,name\n1,a\n` | `columns: ['column_1','name']` |
| `id,id\n1,2\n` | `columns: ['id','id_2']`, `rows: [{id:'1',id_2:'2'}]` |
| `id,name\n1,a\n`, `header: ['x','y']` | `columns: ['x','y']`, `rows: [{x:'id',y:'name'},{x:'1',y:'a'}]` |

**10.4 values**

`a,,b\n` is `[['a',null,'b']]`; `a,"",b\n` is `[['a','','b']]`.

**10.5 writing**

| call | result |
|---|---|
| `write([['a','b,c']], { header: false })` | `a,"b,c"\r\n` |
| `write({ columns: ['a','b'], rows: [{ a: '1', b: null }] })` | `a,b\r\n1,\r\n` |
| `write({ columns: ['a','b'], rows: [{ a: '1', b: '' }] })` | `a,b\r\n1,""\r\n` |
