# Selecting paths from a list of patterns

The backup tool never asks about one pattern at a time. A job has a *list* of
patterns, and the tool wants the paths that the list asks for.

## 1. `select(paths, patterns, options)`

- A pattern that starts with `!` is an **exclusion**; every other pattern is an
  **inclusion**.
- A path is selected when it matches at least one inclusion and no exclusion.
  **Exclusions win over inclusions regardless of the order they are written in.**
  A list of only exclusions selects nothing, however the exclusions are written:
  there is nothing for them to remove.
- The result keeps the order of the input list and contains a path once, even
  when several inclusions match it. A pattern list never reorders or duplicates
  the tool's own list.
- `paths` is an array of strings and `patterns` is an array of strings; a single
  pattern string is accepted as a one-element list.

```js
select(['keep.js', 'skip.tmp'], ['**', '!*.tmp'])   // ['keep.js']
select(['keep.js', 'skip.tmp'], ['!*.tmp', '**'])   // ['keep.js'] - same list
select(['keep.js', 'skip.tmp'], ['!*.tmp'])         // []
select(['src/a.js', 'test/b.js'], ['!src/**'])      // []
```

An exclusion is a full pattern: it understands `**`, classes, braces and
trailing-slash directory patterns exactly like an inclusion does.

A single `!` is the exclusion of the empty pattern, which no path matches.

## 2. Brace alternation

Braces write several patterns in one:

- `a{b,c}d` is two patterns, `abd` and `acd`. The alternatives are tried in the
  order they are written and the first group varies slowest:
  `{a,b}{1,2}` is `a1`, `a2`, `b1`, `b2`.
- Groups nest: `{a,{b,c}}` is `a`, `b`, `c`.
- An empty alternative is allowed and means the empty text: `{a,}` is `a` and
  the empty pattern. `expandBraces` keeps it, so `expandBraces('{a,}')` is
  `['a', '']`.
- Braces with no comma are literal text, not a group: `{a}` is the four
  characters `{`, `a`, `}` and matches a path called `{a}`.
- A `{` with no matching `}` is literal, and so is a `}` with no `{`:
  `expandBraces('{a,b')` is `['{a,b']`.
- `\{`, `\}` and `\,` are literal and do not open a group, close one, or separate
  alternatives: `{a\,b,c}` is the two patterns `a\,b` and `c`. The escapes are
  preserved in the result of `expandBraces` and are interpreted when each
  alternative is compiled, so `{a\,b,c}` matches the paths `a,b` and `c`.
- `expandBraces` returns one entry per alternative, in order, without removing
  duplicates.

**Expansion happens before matching and before segmentation.** It works on the
raw pattern text, so an alternative may contain `/` and a brace group may span
segments:

```js
expandBraces('{src,test}/**')       // ['src/**', 'test/**']
expandBraces('data{/raw,}/x')       // ['data/raw/x', 'data/x']
match('{src,test}/', 'src/')        // true - each alternative is a directory pattern
match('{src,test}/', 'src')         // false
```

## 3. Options

| option | default | meaning |
|---|---|---|
| `dot` | `false` | wildcards may match a segment that starts with `.` (section 7 of `glob-spec.md`) |
| `nocase` | `false` | letters compare without regard to case (section 8) |

Options are read once, when the pattern is compiled, and are never mutated.
Unknown keys are ignored.
