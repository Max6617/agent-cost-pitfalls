# The pattern language

This is the specification the backup team signed off. `src/` is the
implementation; where the two disagree, this document is right and the code is
wrong.

## 1. Paths

A **path** is a non-empty string of one or more **segments** separated by `/`.
Paths are relative and are never normalised: `.` and `..` are ordinary segments
like any other, and they are not resolved. A path never starts with `/` and never
contains `//`.

A path that ends with `/` denotes a **directory**; the trailing `/` is a marker,
not part of the last segment's name. A path without it denotes a file. This is
the only filesystem-like information the selector has — it never looks at the
disk.

```
src/lib/app.js      a file
src/lib/            the directory src/lib
src                 the file src (a different entry from src/)
```

Two paths that differ only in the marker are different entries: `src` and `src/`
are a file and a directory with the same name.

## 2. Matching a path against a pattern

A pattern is a sequence of segments separated by `/`. Matching is by segments:

- The marker of the *path* is not part of any segment; it only ever matters to a
  pattern that ends in `/`, and to `dir/**` (section 5).
- The pattern matches when its segments match the path's segments one for one,
  left to right, and both run out together. The pattern must therefore name as
  many segments as the path has: `data/*` does not match the single-segment path
  `data/`, and it does not match `data`.
- A pattern segment is matched against a whole path segment, never against part
  of one, so a pattern segment can never match a `/`.
- A pattern without a trailing `/` matches files and directories alike:
  `src/lib` matches both `src/lib` and `src/lib/`.
- A pattern that ends in `/` matches **only** directories, and it matches the
  directory itself rather than what is inside it: `backup/` matches `backup/`,
  and does not match `backup` or `backup/notes.txt`.

Matching is case-sensitive unless `nocase` is set (section 8).

## 3. `*`

`*` matches zero or more characters **within one segment**. It never matches a
separator, so `backup/*` matches `backup/notes.txt` and does not match
`backup/drafts/notes.txt`.

`*` matches the empty string: `a*b` matches `ab`, and `data/*` matches
`data/anything` but never the directory `data/` itself, which has no second
segment.

## 4. `?`

`?` matches exactly one character. It never matches a separator, so `a?b`
matches `axb` and does not match `a/b`. It does not match nothing: `log?.txt`
matches `log1.txt` and does not match `log.txt`.

## 5. `**`

`**` is special **only as a whole segment**. Anywhere else the stars are ordinary
`*` wildcards, so `a**b` matches exactly what `a*b` matches.

A whole-segment `**` matches **zero or more whole segments**:

- `a/**/b` matches `a/b` (the `**` matches nothing), `a/x/b`, and `a/x/y/b`.
- A leading `**/` may match no directory at all: `**/*.js` matches `app.js` as
  well as `src/app.js` and `src/lib/app.js`.
- `dir/**` matches the directory `dir/` itself and everything below it:
  `src/**` matches `src/`, `src/app.js` and `src/lib/app.js`. It does **not**
  match the plain file `src`: a trailing `/**` that consumes no segment still
  needs the path to be a directory, because the `/` in the pattern has to be
  matched by a `/` in the path.
- A bare `**` matches every path, files and directories alike.
- `**` may consume any number of segments but never a hidden one (section 7).
- `**/` is a pattern that ends in a separator: it matches every path that names
  a directory, at any depth, and nothing else.

## 6. Character classes

`[...]` matches exactly one character from a set:

- `[abc]` matches `a`, `b` or `c`. `[a-z]` is a range; a range is written with a
  single `-` between two plain characters. `-` is an ordinary member when it is
  the first or the last member of the class, so `[-x]` and `[x-]` both match `-`.
- `[!...]` negates the set: `[!0-9]` matches any character that is not a digit.
  `[^...]` is accepted as a second spelling of the same thing.
- `]` is an ordinary member when it comes first, right after `[` or right after
  the `!`/`^` of a negated class: `[]]` matches `]`, and `[!]]` matches any
  character except `]`.
- `\` escapes the next character inside a class as well: `[\]x]` matches `]` or
  `x`.
- A class never matches a separator. A `/` written inside a class is ignored —
  `data[0/1].json` matches `data0.json` and `data1.json` and never
  `data/.json`; it is one pattern segment, not two.
- A `[` with no closing `]` is not a class: it is a literal `[`, so `a[bc`
  matches the path `a[bc`.

## 7. Hidden segments

A segment whose first character is `.` is **hidden**. `*`, `?`, `[...]` and `**`
never match a hidden segment, at any position in the path — but a literal `.` in
the pattern does:

- `*` does not match `.env`; `.*` does.
- `backup/*` does not match `backup/.env`.
- `a/**/b` does not match `a/.hidden/b`, and `**/*.js` does not match `a/.b.js`.
- A class counts as a wildcard here even when `.` is one of its members:
  `[.]env` does not match `.env`.
- `{ dot: true }` turns the rule off for the whole pattern: with it, every
  wildcard may match hidden segments, and `[.]env` matches `.env`.

## 8. Escapes, case, options

- `\` makes the next character literal: `\*` matches a `*`, `\?` a `?`, `\[` a
  `[`, `\\` a `\`. A `\` as the last character of a pattern is a literal `\`.
- A `/` always separates segments and cannot be escaped.
- `{ nocase: true }` compares letters without regard to case, in literals, in
  ranges and inside classes. The default is case-sensitive.
- Both options are false by default and are read from the object passed to
  `compile()`/`match()`/`select()`.

## 9. Determinism

A compiled pattern is a pure function of the pattern text and the options:

- The same pattern and options always compile to a matcher that gives the same
  answer for the same path.
- A matcher may be kept and reused. `test()` is a question, not a cursor: asking
  it twice about the same path gives the same answer twice, and asking it about
  a second path does not change the answer for the first. The same holds for
  `matcher.select()`.
