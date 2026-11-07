# The unified diff contract

This is the format the review service stores, serves and applies. `src/` is the
implementation; when the two disagree, this document is right and the code is a
bug.

A *version* of a file is a plain string. The library never reads a file, never
looks at a clock and never consults a random source: text in, text out, and the
same text in always gives the same text out.

Two operations sit on top of the format:

```js
import { buildDiff, applyPatch, parsePatch, splitLines, joinLines, formatRange } from './src/index.js'

buildDiff('one\ntwo\n', 'one\nTWO\n')     // the patch text
applyPatch('one\ntwo\n', patchText)       // a result object, never a throw
parsePatch(patchText)                     // { hunks, error }
```

## 1. Lines and files

### 1.1 `splitLines(text)`

`splitLines` returns `{ lines, finalNewline }`. `\n` is the only line separator.
`finalNewline` says whether the text ends with one.

| text | `lines` | `finalNewline` |
|---|---|---|
| `''` | `[]` | `false` |
| `'a'` | `['a']` | `false` |
| `'a\n'` | `['a']` | `true` |
| `'a\n\n'` | `['a', '']` | `true` |
| `'\n'` | `['']` | `true` |
| `'a\r\nb\r\n'` | `['a\r', 'b\r']` | `true` |

A carriage return is **ordinary text**, not a separator and not a line ending to
be normalised away. It is part of the line it sits in, so a CRLF file and its LF
twin differ on every line, and a patch built from one of them carries the `\r`
in its line texts. Nothing in the library strips it.

### 1.2 `joinLines(lines, finalNewline)`

The inverse: the lines joined with `\n`, plus a final `\n` when `finalNewline`
is true. `joinLines([], true)` is `''` — an empty file is empty, not a newline.

### 1.3 Two lines are equal when

their text is equal **and** they agree on whether they end with a newline. Only
the last line of a file can lack one, so the rule only ever bites there: the
last line `'end'` of `'a\nend'` is *not* equal to the last line `'end'` of
`'a\nend\n'`, and a diff between those two files is a diff of that one line.

## 2. The patch text

A patch is lines separated by `\n`, and it ends with a `\n`. A patch with
nothing to say is the empty string — no file header, no hunks.

```
--- a
+++ b
@@ -1,4 +1,4 @@
 alpha
+BRAVO
-bravo
 charlie
 delta
```

### 2.1 The file header

`--- <fromLabel>`, then `+++ <toLabel>`, then the hunks. `buildDiff` writes the
labels from its options (`fromLabel`, default `a`; `toLabel`, default `b`), with
no timestamp and no tab. `applyPatch` ignores the file header: a patch is
applied to the text it is handed, whatever the labels say.

### 2.2 The hunk header

```
@@ -<fromStart>[,<fromCount>] +<toStart>[,<toCount>] @@
```

`fromStart` and `fromCount` describe the old side, `toStart` and `toCount` the
new side. Both are decimal integers, non-negative, with no sign.

| rule | example |
|---|---|
| the count is omitted **exactly** when it is 1 | `@@ -1 +1,2 @@` |
| a count of 0 is written explicitly | `@@ -0,0 +1 @@`, `@@ -4,2 +4,0 @@` |
| any other count is written explicitly | `@@ -3,5 +3,7 @@` |
| a side that covers lines starts at 1 or later | `-1,3` is legal, `-0,3` is not |

When a side covers no lines at all, its start is the line that side's content
sits **after**: the line number of the last line of that side before the hunk,
or `0` when the hunk is at the very beginning of that side. That is why a pure
insertion at the top of a file reads `@@ -0,0 +1 @@`: the old side has nothing
in the hunk and nothing before it, and the new side starts at line 1.

`formatRange(start, count)` returns one side's text (`'3,5'`, `'3'`, `'0,0'`),
and `formatHunkHeader({ fromStart, fromCount, toStart, toCount })` returns the
whole line.

### 2.3 The body

One line per line of the two sides, in order, each with a one-character prefix:

| prefix | kind | on the old side | on the new side |
|---|---|---|---|
| ` ` (space) | context | yes | yes |
| `-` | removal | yes | no |
| `+` | addition | no | yes |

The body supplies **exactly** `fromCount` lines that are context or removal and
**exactly** `toCount` lines that are context or addition. An empty context line
is a single space and nothing else: a truly empty line is not a context line.
The file header, the `@@` header and the marker line below are not body lines.

### 2.4 `\ No newline at end of file`

The marker line is written exactly as

```
\ No newline at end of file
```

and it follows a body line that has no trailing newline in the file it came
from. A marker after a `-` line describes the old side, after a `+` line the new
side, and after a context line both sides at once — the context line is the last
line of both files. Only the last line of a side can be marked, so a marker never
appears in the middle of a side.

```
--- a
+++ b
@@ -1,2 +1,2 @@
 x
+y
\ No newline at end of file
-y
```

`parsePatch` records the marker in `noNewline: { from, to }`.

## 3. Building a patch

### 3.1 Alignment

The two sides are aligned by **longest common subsequence**, computed from the
top of the file. At each position:

1. if the next remaining line of each side is equal (§1.3), it is a context line
   and both sides advance;
2. otherwise one side advances: the new side as an addition, or the old side as
   a removal, whichever keeps the longest common subsequence of what remains.

### 3.2 The tie-break

When both choices keep a common subsequence of the **same** length, the **new
side advances first**: the line is emitted as an addition. The old side advances
only when that keeps a strictly longer common subsequence.

So a single replaced line reads

```
@@ -1 +1 @@
+y
-x
```

and, generally, a replaced block reads as its additions followed by its
removals. This is the only tie-break the service uses; two runs of the same
build produce byte-identical output.

### 3.3 Hunks

A hunk is a run of changed lines plus the unchanged lines around it. Changes
that are no more than `2 × context` unchanged lines apart belong to **one**
hunk; further apart, they become two. (`context` defaults to 3 and is an option
of `buildDiff`; `context: 0` is legal and gives bodies of changes only.)

Each hunk carries up to `context` unchanged lines before its first change and up
to `context` after its last, clipped at the ends of the file — a change on the
first line has no leading context, a change on the last line no trailing one.

A change on the second line of `A B C D E F`, with the default `context` of 3:

```
@@ -1,5 +1,5 @@
 A
+bb
-B
 C
 D
 E
```

The hunk carries one line of leading context, because line 1 is the last line
before the change, and three lines of trailing context. Line 6 is outside it.

### 3.4 Rendering

The hunks are rendered in file order, and each body line is written with its
prefix. A body line that has no newline in its file is followed by the marker
line (§2.4). If there are no hunks — the two versions are identical — `buildDiff`
returns `''`.

## 4. Applying a patch

```js
applyPatch(fromText, patchText, options) // { ok, text, applied, hunks, errors }
```

Options: `maxOffset` (default `100`) and `ignoreWhitespace` (default `false`).

### 4.1 The result

| field | meaning |
|---|---|
| `ok` | true when every hunk was placed |
| `text` | the patched text; **the input, unchanged**, unless `ok` |
| `applied` | how many hunks were placed (before the first refusal, if any) |
| `hunks` | one entry per placed hunk: `{ index, atLine, offset }` |
| `errors` | empty when `ok`, otherwise exactly one report (§5) |

`index` is the 1-based position of the hunk in the patch, `atLine` is the 1-based
line of the file in front of which the hunk's replacement is written (`1` for a
hunk at the top, `lineCount + 1` for one at the end), and `offset` is
`atLine − origin`, where the origin is the line the header claims (§4.2).
Application stops at the first hunk that cannot be placed; later hunks are not
examined.

### 4.2 Where a hunk goes

A header names a line of the **original** file, and every hunk is placed against
that file — the numbering does not shift as earlier hunks change the line count.

* The **origin** is `fromStart` for a hunk with an old side, and `fromStart + 1`
  for a hunk without one: a pure insertion goes in front of the line after the
  one the header names.
* A hunk **with** an old side is placed by searching. Candidates are tried in
  this order: the origin, then one line earlier, then one line later, then two
  earlier, two later, and so on, up to and including `maxOffset` lines away. The
  first candidate that matches wins.
* A candidate is skipped when it is above the lower bound (§4.3), when it is
  above line 1, or when the hunk's old side would run past the last line of the
  file. A hunk whose old side is empty is not searched: it goes exactly at its
  origin, and is refused if that is above the lower bound or past the end.
* When no candidate matches, the hunk is refused with `no-match`.

A file that has moved on since the patch was written is the normal case: the
search finds the block a few lines above or below where the header says it is,
and `offset` reports how far. `maxOffset` bounds how far that is allowed to go;
beyond it the patch is refused rather than applied to a similar-looking place.

### 4.3 The lower bound

The first hunk may be placed anywhere. Once a hunk is placed at `atLine` with an
old side of `fromCount` lines, the next hunk may not be placed above
`atLine + fromCount` — the first line no earlier hunk has consumed. A patch whose
hunks overlap is refused, never applied twice to the same region.

### 4.4 Matching a line

By default a patch line matches a file line when their texts are equal,
character for character.

With `ignoreWhitespace: true` they match when their **comparison forms** are
equal. The comparison form of a line is its text with every run of spaces and
tabs collapsed to a single space, and then one trailing space removed. So
`'two  '`, `'two'` and `'two\t'` all compare equal, `'a   b'` equals `'a b'`,
and a tab counts as a space; leading whitespace still distinguishes lines,
because `'  two'` compares as `' two'`, not as `'two'`. A line of nothing but
whitespace compares equal to an empty line.

Tolerant matching applies to the hunk's old side only — the lines that have to
be found in the file. It changes where a hunk may land and nothing else (§4.5).
Whether the file's last line ends with a newline is never part of a match.

Tolerant matching is off unless the caller asks for it: with the default
options, a line whose trailing whitespace differs does not match.

### 4.5 What gets written

The result is the file with each hunk's old side replaced by its new side, in
place:

* lines the hunks do not cover are copied from the file, byte for byte;
* **context** lines are copied from the **file**, so a hunk matched under
  tolerant whitespace does not rewrite the lines it landed on;
* **added** lines are copied from the **patch**, exactly as written, including
  trailing whitespace.

### 4.6 The final newline

The result ends without a newline exactly when its last line came from a hunk
whose new side carries the marker (§2.4). When its last line is a file line that
no hunk replaced, the file's own final-newline status is kept. Otherwise the
result ends with a newline. An empty result is the empty string.

### 4.7 An empty patch

A patch with no hunks — the empty string, or only a file header — is the
identity: `ok: true`, `applied: 0`, the input text back. Nothing to do is not an
error.

## 5. Failure reports

`applyPatch` never throws for bad input; it reports. There is exactly one entry
in `errors`, and it is one of these two shapes.

### 5.1 No match

```js
{
  code: 'no-match',
  hunk: 2,                       // 1-based index of the hunk in the patch
  line: 14,                      // 1-based line of its @@ header in the patch text
  fromStart: 9,                  // the start the header claims
  expected: ['a', 'b', 'c'],     // the hunk's old side, prefixes stripped
  actual: ['a', 'B', 'c'],       // the file at the position the header claims
}
```

`expected` is the hunk's context and removal lines, in order — the additions are
not part of it, they are not something the file was expected to contain.

`actual` is the file read at the line the header claims: `fromCount` lines
starting at `fromStart`, stopping at the last line of the file. It is `[]` when
`fromStart` is past the last line, and `[]` for a hunk whose old side is empty.
Reading the file *there* — rather than wherever the search last looked — is what
makes the report readable next to the patch: the two lists line up.

### 5.2 Malformed patch

```js
{ code: 'malformed', line: 7, reason: 'body-mismatch' }
```

| `reason` | when | `line` |
|---|---|---|
| `bad-header` | anything but the optional `---`/`+++` pair appears before the first hunk; a `@@` line does not match the grammar of §2.2; a range covers lines but starts at 0 | the offending line |
| `bad-prefix` | a body line's first character is not ` `, `-`, `+` or `\` | the offending line |
| `bad-marker` | a `\` line does not read exactly as in §2.4, or does not immediately follow a body line of the same hunk | the offending line |
| `body-mismatch` | the body does not supply exactly the lines §2.3 requires, or a line follows the end of a body that is not a `@@` header | the hunk's `@@` header |

Line numbers count lines of the patch text, starting at 1, with the file header
counted like any other line.

## 6. Determinism

Nothing here depends on the clock, on a random source, on the order files were
read in, or on how many times it has been called. The same inputs and options
give the same output, character for character, and the reports list the first
problem in patch order.
