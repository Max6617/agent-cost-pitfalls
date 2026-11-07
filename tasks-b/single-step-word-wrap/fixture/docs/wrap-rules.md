# Wrapping rules

The rules the report jobs were signed off against. `src/` is the
implementation; when the two disagree, this document is right and the code
is a bug.

## 1. Model

The input is plain text with hard line breaks (`\n`). Wrapping never moves
text across a hard line break: each hard line is wrapped on its own and the
results are joined back with `\n`. A blank hard line stays a blank line.

Width is counted in columns; one character is one column.

The pipeline for one hard line is, in order:

1. drop the leading and trailing whitespace of the line;
2. split what remains into words and the gaps between them, rendering each
   gap (sections 3 and 4);
3. wrap the words greedily (section 5), applying the indent (section 6);
4. emit the lines with no trailing whitespace.

## 2. Words

A word is a maximal run of non-whitespace characters. Punctuation and
hyphens are ordinary characters: `mother-in-law` is one word and, like every
word, is never broken.

## 3. Gaps of spaces

A gap made of spaces alone collapses to a single space. Every measurement -
whether a word still fits, how full a line is - uses the collapsed gap.

## 4. Gaps with tabs

A gap that contains at least one tab is layout, not separation: it is
expanded character by character and kept whole. A space advances one column;
a tab advances to the next tab stop strictly greater than the current
column. Tab stops sit every 8 columns, counted from the start of the hard
line, so a tab is never zero-width:

| column where the tab starts | spaces it becomes |
|---|---|
| 0 | 8 |
| 1 | 7 |
| 2 | 6 |
| 3 | 5 |
| 4 | 4 |
| 5 | 3 |
| 6 | 2 |
| 7 | 1 |
| 8 | 8 |
| 9 | 7 |

Expansion happens before wrapping, on the unwrapped hard line. When a line
break falls on such a gap, the gap is discarded like any other: no emitted
line ends in whitespace and no continuation line begins with it.

## 5. The greedy wrap

Each line takes as many words as fit: a word fits when the line, with the
gap and the word added, is at most `width` columns. A line of exactly
`width` columns is full, not over - it is emitted, not broken.

A word longer than the line's budget overflows: it is emitted whole on a
line of its own (with that line's normal indent), never split, never
hyphenated, and the words around it break normally - the word before it
closes its line, the word after it opens a new one.

## 6. Hanging indent

`wrap(text, width, { indent })` gives every continuation line of a paragraph
a hanging indent of `indent` spaces. The first line of each hard line is
never indented. The indent is part of the line and counts toward the width:
a continuation line's content budget is `width - indent` columns.

`indent` defaults to 0; `{ indent: 0 }` and no options are the same call.

## 7. Input and output

`wrap(text, width, options?)` returns the wrapped text as one string;
`wrapLines(text, width, options?)` returns the same lines as an array.

Empty input is empty output: `wrap('', 10)` is `''`.

No emitted line ever ends in whitespace.

## 8. Errors

`width` must be an integer of at least 1 and `indent` an integer between 0
and `width - 1`; anything else throws a `RangeError`, whatever the text.
