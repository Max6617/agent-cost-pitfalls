# The dialect

This is the agreement with the integrators: what a conforming reader accepts,
what it produces, and what a conforming writer emits. `src/` is the
implementation; where the two disagree, this document is right and the code is
a bug.

A config looks like this:

```ini
; a full-line comment
title = todo-service

[server]    ; a trailing comment
host = example.com
welcome = "say \"hi\" ; enjoy"
```

## 1. Physical and logical lines

Input is text with LF or CRLF line breaks.

A physical line whose **last character is a backslash** continues on the next
physical line: the backslash and the line break are dropped and the two parts
are concatenated with nothing inserted. A continuation can chain over several
physical lines. Joining happens before comments are recognised, so a comment
marker on the physical line that completes a wrapped line still ends the
joined line.

Blank lines and lines containing only whitespace are ignored.

## 2. Comments

`;` and `#` are the comment markers. A comment starts where a marker appears
**at the start of a logical line or immediately after a space or tab**, and
runs to the end of the line; it is stripped before the line is parsed. A
marker in any other position is ordinary text: `a = x;b` sets `a` to `x;b`.

**Inside a quoted value nothing is a comment.** Comment detection is aware of
quoting and of escapes, so `name = "fast ; reliable"` sets `name` to
`fast ; reliable`, and `a = "x ; y" ; note` sets `a` to `x ; y`.

## 3. Keys and values

A key line is `key = value`. The key is the text before the **first** `=`,
trimmed; it must not be empty. Keys are **case-sensitive**: `Host` and `host`
are different keys.

A value is bare or quoted.

- A **bare** value is the text after the `=`, trimmed of surrounding spaces
  and tabs. Backslashes in a bare value are literal: `path = C:\new` sets
  `path` to `C:\new`.
- A **quoted** value starts with `"`. Inside it the following escapes are
  recognised:

  | escape | meaning |
  |---|---|
  | `\n` | line feed |
  | `\t` | tab |
  | `\"` | a double quote |
  | `\\` | a backslash |

  Any other backslash sequence is kept **verbatim**, backslash included:
  `"C:\data\sites"` is `C:\data\sites`. Because `\n` and `\t` are always
  escapes inside quotes, a literal backslash before an `n` or a `t` must be
  written `\\`.

  After the closing quote only whitespace may follow; anything else is a
  syntax error. A quoted value with no closing quote is a syntax error.

## 4. Sections

A section header is `[name]` on its own logical line. The name is trimmed,
must not be empty, and may not contain `[` or `]`.

Section names match **case-insensitively** (ASCII case folding): `[Server]`
and `[SERVER]` are the same section. A repeated header does not start a new
section — it **reopens** the existing one, and its keys merge in. A section's
position in the document is where its header was first seen, and the spelling
kept for output is the spelling of that first header.

## 5. Duplicate keys

When a key is set more than once in the same section, **the last value
wins**. The global block counts as a section for this rule.

## 6. The global block

Key lines that appear before the first section header belong to the global
block. The global block is not a section: it has no name and is never written
out under a header.

## 7. The document shape

`parse` returns a plain object:

```js
{
  globals: { [key]: value },
  sections: [ { name, entries: { [key]: value } }, ... ],
}
```

Sections appear in the order their headers were first seen. All values are
strings. `getSection(doc, name)` returns one section's entries, matching the
name case-insensitively, or `undefined`.

## 8. Serialization

`serialize` writes the canonical form:

- global keys first, then the sections in document order;
- a blank line separates the global block from the first section header, and
  each section from the next;
- a key line is `key = value`, a header is `[name]` on its own line;
- the output ends with a single trailing newline; an empty document
  serializes to the empty string.

A value is written **bare** unless it needs quoting. It needs quoting exactly
when one of these holds:

- it is empty;
- it begins or ends with a space or tab;
- it contains `"`, a line feed, or a tab;
- it contains `;` or `#` immediately after a space or tab (a re-read would
  strip it as a comment);
- it ends with a backslash (a re-read would treat the line as wrapped).

Anything else is written bare — in particular a marker with no preceding
whitespace stays bare: `a;b` is written `key = a;b`, not `key = "a;b"`.

When a value is quoted, the escapes are the inverse of the reader's table:
backslash to `\\`, `"` to `\"`, line feed to `\n`, tab to `\t`.

`parse(serialize(doc))` is deep-equal to `doc` for every document.

## 9. Errors

A malformed input throws `IniParseError`, carrying `line`: the 1-based
number of the physical line where the offending logical line starts. It is
thrown for a line with no `=`, an empty key, a malformed or empty section
header, an unterminated quoted value, and trailing characters after a quoted
value.
