# single-step-ini-dialect

stratum: single-step

An INI dialect parser + serializer per `docs/dialect.md`: sections and
key=value pairs, `;`/`#` comments with inline comments only after whitespace,
quoted values with an escape table, duplicate keys (last wins), continuation
lines via trailing backslash, case-insensitive section names with
case-sensitive keys, global keys before any section, and a serializer that
round-trips.

## sub-problems

1. **comments / quote awareness** — `src/lines.js#stripComment` scans for `;`/`#`
   without tracking quoting, so a marker after whitespace *inside* a quoted
   value truncates the line and the read then dies on the unterminated quote.
2. **escapes** — `src/values.js#unquote` treats a backslash as "quote the next
   character": `\n`/`\t` come out as `n`/`t` and an unknown escape like `\d`
   loses its backslash (docs pin verbatim). `\"`/`\\` are right by accident.
3. **duplicate keys** — `src/model.js#DocBuilder.put` keeps the first value
   (`Object.hasOwn` guard) instead of the last; applies to globals too since
   the global block shares `put`.
4. **continuation** — `src/lines.js#joinWrapped` folds a wrapped line by
   dropping the backslash but never appends the next physical line: the
   continuation text is swallowed (and a chained wrap strands the last
   fragment as a line of its own).
5. **serializer quoting** — `src/serialize.js#emit` quotes any value containing
   `;`/`#` anywhere (docs: a marker without preceding whitespace stays bare)
   and misses every other quoting trigger in docs §8 (edge whitespace, empty,
   `"`, LF, tab, trailing backslash), so padding and line breaks are lost on
   output.

Bugs live in 4 modules (`lines.js` x2, `values.js`, `model.js`,
`serialize.js`); `parser.js`, `errors.js`, `inspect.js`, `index.js` are clean.

## measured

- untouched fixture: **4/22 hidden cases (18%)**; visible suite 3/9 pass, exit 1
  (6 failing reproductions)
- reference: **22/22 hidden cases (100%)**; visible suite 9/9 pass, exit 0
- fixture shape: 13 text files, 462 lines; reference changes 4 source files

## guards (pass on the untouched fixture, 4)

- `a comment starts at the line start or after whitespace, never mid-token` (01)
- `a line without = is a syntax error that carries its line number` (01)
- `keys are case-sensitive while section names are not` (03)
- `a clean document serializes in canonical form` (05)

## interactions (7)

- quoted value keeps its markers while a real trailing comment strips (01)
- escapes resolve inside quotes while the trailing comment strips (02)
- a reopened (case-folded) section merges and the later value wins (03)
- global keys follow the same last-wins rule (03)
- a comment on the physical line that completes a wrap still strips (04)
- a quoted value can wrap and keeps its escapes (04)
- control characters and a trailing backslash escape on output and round-trip (05)

## notes

- The escape bug is the one the prompt does not hint at; the prompt names the
  comment-truncation, wrap-loss, duplicate-key and writer symptoms only.
- The naive unescape accidentally gets `\"` and `\\` right, so a fix that only
  adds `\n`/`\t` to a table still fails the unknown-escape-verbatim cases.
- Tooling note (outside this task): `tasks-b/_grade/run.mjs` staged the hidden
  suite under `.grade-<ts>/` but invoked node on `.grade/<file>`; fixed to
  stage under the real directory name. Without it no tasks-b task can score.
