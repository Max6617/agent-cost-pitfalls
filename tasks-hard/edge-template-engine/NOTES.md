# edge-template-engine

**stratum:** edge-case-dense
**prompt:** "Customer emails are coming out wrong in ways support keeps forwarding to us: a line item whose quantity or discount is zero disappears from the list it is in, a name with an apostrophe or a slash in it reaches the markup unescaped, an indented fragment loses its alignment after the first line, and blank lines turn up where a section tag sat on a line of its own. The rules we agreed on are written up under docs/ - please make the engine behave the way they say. The cases under test/ are the reproductions we managed to write down, not the whole acceptance criteria."

## The fixture

A mustache-style template engine for notification and email bodies. 20 text
files, ~1,000 lines, pure Node ESM, zero dependencies, no clock, no randomness,
no filesystem (partials arrive as a map). `src/index.js` is the public surface
(`render`, `renderDetailed`, `compile`, `escapeHtml`); `docs/template-rules.md`
is the written contract; `test/` holds the visible reproduction suite.
`bin/render-template.js`, `src/util/text.js` and `config/notifications.json` are
realistic noise and are never touched by the reference.

## Sub-problems (one hidden file each)

| file | cases | sub-problem | what the fixture gets wrong |
|---|---|---|---|
| `01-interpolation` | 4 | escaping table, the two verbatim spellings, what a value with no string form contributes | `escape.js` knows only `& < > "`; `parser.js` does not treat `&` as a verbatim sigil; `render.js` stringifies `null` to `"null"` |
| `02-lookup` | 4 | names, literal dotted keys, list index segments, paths resolved against the frame stack | `context.js` stops a path on the first falsy value, refuses to walk into a list, and resolves paths against the innermost frame only |
| `03-sections` | 4 | a list iterates, an object renders once with its frames still beneath it, scalars and the empty list | `sections.js` renders an object block against a fresh root, so the enclosing frames vanish |
| `04-inverted` | 4 | inverted sections, and the truthiness rule they share with sections | `sections.js` counts only `false`/`null`/`undefined` as falsy, so `0` and `""` render sections; `inverted.js` hand-rolls a second, different test that also misses the empty list |
| `05-whitespace` | 4 | standalone lines: what "only" means and what the line takes with it | `scanner.js` strips a standalone tag's indentation but leaves its newline, and only treats `#`, `^`, `/` as standalone at all |
| `06-partials` | 5 | the implicit iterator, indentation on every line, a missing partial, inclusion depth | `render.js` renders a falsy `{{.}}` frame as nothing; `partials.js` indents the first line only, throws on a missing partial, and has no depth limit |

The defects sit in eight modules and each sub-problem needs its own module (or
two) edited; no single edit greens the suite.

## Measured

| arm | visible | hidden |
|---|---|---|
| untouched fixture | 6/10, exit 1 | **4/25 = 16%** |
| reference | 10/10, exit 0 | **25/25 = 100%** |

The four cases that pass on the untouched fixture are exactly the four guards
below - no free points.

Single-fix arms (surgical patches on a copy of the fixture, one defect at a
time; the four guards pass in every arm, so subtract 4 for the cases an arm
actually moves):

| arm | hidden | moves |
|---|---|---|
| escape table only | 5/25 | 1 |
| `&` sigil only | 4/25 | 0 |
| `null` only | 5/25 | 1 |
| all of 01 | 8/25 | 4 |
| `context.js` (02) | 7/25 | 3 |
| object frame pushed only | 5/25 | 1 |
| truthiness only | 4/25 | 0 |
| 03 + `context.js` | 9/25 | 5 |
| truthiness + inverted (04) | 8/25 | 4 |
| `scanner.js` (05) | 8/25 | 4 |
| indent every line only | 4/25 | 0 |
| implicit iterator only | 5/25 | 1 |
| missing partial + depth only | 6/25 | 2 |
| all of 06 | 8/25 | 4 |

Where partial credit lives:

| arm | hidden |
|---|---|
| the visible suite's four failures fixed minimally (escape table, scanner, indent, implicit iterator) | **12/25 = 48%** |
| the same four, but as whole-file rewrites of the two files they touch (which also fixes `null`, the missing partial and the depth limit) | 15/25 = 60% |
| everything the reference changes | 25/25 = 100% |

So "make `test/` green and stop" lands at 48%, inside the 40-60% band, and an
agent that also cleans up the two files it had to touch reaches 60%.

Reference changes 8 files: `src/{escape,parser,render,context,sections,inverted,scanner,partials}.js`.

## Interaction cases

Nine of the 25 need two sub-problems to be right at the same time, or exercise a
rule the visible suite never writes down:

1. `03` "a path inside an object section reaches the enclosing frames" - needs
   `sections.js` to push the object **and** `context.js` to resolve paths
   through the stack. Either fix alone still fails.
2. `04` "a section and its inverted twin are exact complements" - needs the
   shared truthiness rule **and** `inverted.js` to use it.
3. `06` "a standalone section line inside an indented partial" - needs
   `scanner.js` (the line and its newline) **and** `partials.js` (indent every
   line).
4. `06` "an indented partial indents every line it produces" - the indent fix
   alone moves nothing: the fixture also leaves the tag's own leading whitespace
   in the output, so `scanner.js` has to handle the standalone partial line
   first.
5. `02` "a path resolves through the frames a list section pushed" - the visible
   suite never writes a path inside a section.
6. `05` "a standalone comment line disappears, and a comment may span lines" -
   the standalone rule has to cover comments, not just sections.
7. `05` "a standalone line goes even with trailing spaces, and a delimiter tag
   owns its line" - trailing whitespace on the tag's line, and the `{{=...=}}`
   tag as a standalone tag; neither appears in the visible suite.
8. `01` "both verbatim spellings render the value unchanged" - the visible suite
   never writes `{{&name}}`.
9. `06` "a missing partial renders nothing and is reported" and "partial
   recursion stops at the documented depth" - the visible suite never asks for
   diagnostics.

## Guards (pass on the untouched fixture on purpose)

- `01` characters outside the escape table pass through untouched (`=`, `+`,
  `%`, accented letters; `escapeHtml(0)`)
- `02` a key that literally contains a dot beats the path reading
- `03` a list renders once per element, in order, against the element
- `03` a truthy scalar renders once against itself, an empty list renders
  nothing, a list of lists walks with `{{#cells}}` and with `{{#.}}`

These stop a rewrite from breaking behaviour that already works, and they are
the whole floor (4/25 = 16%).

## Deviations and notes

- **The truthiness rule is filed under `04`.** Sections and inverted sections
  share it, so a fix to `isTruthy` alone moves no case: `04`'s cases need
  `inverted.js` to use it, and `03`'s cases are about frames rather than
  falsiness. That is deliberate - it is the one rule that is genuinely shared.
- **The visible suite reproduces three of the four symptoms** the prompt names;
  the fourth (a fragment losing its alignment) is reproduced by
  `test/partials.test.js` in its easiest form, and goes green only once the
  scanner handles a standalone partial line as well. The hidden indent case is
  the multi-line, blank-line version.
- **`{{#.}}` is documented** (§5) and asserted inside a guard case. It passes on
  the untouched fixture, so it is not a discriminator; it is there so the
  documented rule is not untested.
- **The delimiter-change tag** is covered by one case in `05` (standalone, and
  in force for every following tag). Its malformed form is documented but not
  tested.
- **No case depends on file order or shared state**: every case renders its own
  template, the engine keeps no module-level state, and every hidden file
  imports nothing but `../src/index.js`.
- The prompt names symptoms only - no file, no function, no fix - and says the
  visible suite is not the whole acceptance criteria.
