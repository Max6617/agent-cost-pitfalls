# edge-glob-match

**stratum:** edge-case-dense
**prompt:** "Nightly backups are picking up files out of directories the job was told to skip, and a rule that names a directory still hands back the plain file of the same name. A pattern with two stars either matches nothing at all or swallows the whole tree, and a file called data[1].json can no longer be selected. An exclusion only bites when it is written after the inclusion it is meant to trim, and asking one compiled pattern about two paths can give a different answer the second time. Make the selector behave the way docs/ describes it; the reproductions under test/ are the cases we managed to write down, not the whole acceptance criteria."

`globset` is a file-selection toolkit for a backup tool: it compiles glob
patterns, matches a list of paths, and expands brace alternations. Paths are
strings; a trailing `/` is the only filesystem-like fact in the whole fixture (it
marks a directory), so the task is pure text and pure logic — no clock, no
randomness, no filesystem, no dependencies. The contract is
`fixture/docs/glob-spec.md` (the pattern language) and
`fixture/docs/selection.md` (pattern lists, options, brace expansion), both
written as rules that were agreed rather than as a to-do list.

## Sub-problems (each its own hidden test file)

| hidden file | sub-problem | cases | the bug in the fixture |
|---|---|---|---|
| `01-segments` | `*`/`?` stay inside one segment; every segment is named; a matcher is reusable and deterministic; the `nocase` option | 4 | `regex.js` emits `.*` for `*` and `.` for `?`, so both cross `/`; `matcher.js` compiles with the `g` flag and never resets `lastIndex`, so a reused matcher alternates true/false; `compile.js` folds the *pattern* for `nocase` and leaves the path alone, so `nocase` only works when the path is already lower case |
| `02-doublestar` | `**` as a whole segment: zero, one or many; leading `**/`; trailing `/**` (including "not the file `dir`"); bare `**` and `**/` | 4 | `pattern.js` emits `[^/]*` for a whole-segment `**` — one segment, so `a/**/b` misses `a/b` and `a/x/y/b`, `**/*.js` misses `app.js`, and the bare `**` misses everything below the first level |
| `03-classes` | classes: sets, ranges, `-` at the edges, `[!...]`/`[^...]`, `]` as first member, a `/` inside a class, an unterminated `[` | 4 | `segment.js` finds the class end with the first `]` and copies the body verbatim into the regular expression, so `[!0-9]` is a set containing `!`, `[]]` becomes an empty class that never matches, and `[0/1]` matches a separator |
| `04-escape` | `\*`, `\[`, `\?`, `\\`, a trailing `\`, escapes inside brace alternatives and an escaped comma | 4 | `paths.js` rewrites `\` to `/` ("accept Windows separators"), which kills every escape; `braces.js` splits alternatives on every comma, escaped or not |
| `05-paths` | hidden (dot) segments at any depth for `*`, classes and `**`; the `dot` option; a trailing `/` pattern matching directories only | 5 | the dot guard in `pattern.js` is a lookahead on the whole *path*, so `backup/*` still takes `backup/.env`; `compile.js` strips the trailing `/` from the pattern and `matcher.js` strips it from the path, so `backup/` matches the file `backup` |
| `06-braces-select` | brace expansion (nesting, order, empty alternative, `{a}` literal, unclosed/escaped braces) and exclusions in a pattern list | 4 | `braces.js` takes the first `{`…first `}` pair, so nesting breaks and `\{` opens a group anyway; `select.js` walks the list in order and lets each exclusion remove only what earlier patterns collected, so an exclusion written first does nothing |

The eight files the reference changes are
`src/{paths,segment,regex,pattern,matcher,compile,braces,select}.js`. Each
sub-problem's bug lives in its own module except `01`, which owns the matcher
core (`regex.js` + `matcher.js` + `compile.js`) — no single edit clears more than
one sub-problem.

## Measured

| | visible suite (`test/`) | hidden suite |
|---|---|---|
| untouched fixture | 6/10 pass, exit 1 (4 failures) | **2/25 = 8%** |
| reference | 10/10 pass, exit 0 | **25/25 = 100%** |
| "green `test/` and stop" arm (hand-written minimal patch) | 10/10 pass | **12/25 = 48%** |

The third row is the arm the calibration cares about: a solution that fixes only
what the four failing reproductions show — `*` crossing `/`, `**` eating a single
segment, the escape-destroying separator rewrite, and the directory rule — still
fails the class rules, the dot rule below the first segment, `**` against hidden
segments, nested and escaped braces, and exclusion order. It was measured by
copying `fixture/` and patching `paths.js`, `regex.js`, `pattern.js`,
`matcher.js` and `compile.js` by hand in a scratch copy, then running
`_grade/run.mjs` against that copy.

## Interaction cases (11 of the 25 — two sub-problems at once, or a behaviour the visible suite never touches)

| case | what it combines |
|---|---|
| `01-segments` › a compiled pattern answers the same question the same way | matcher reuse with `test()` **and** `matcher.select()` — the `g`-flag leak is invisible until a matcher is kept |
| `02-doublestar` › a trailing double star covers the directory… | `**` with the directory marker: `src/**` matches `src/` but not the file `src`, which the `**` rule alone cannot express |
| `02-doublestar` › a bare double star… | `**` with a trailing-slash pattern (`**/` matches directories only) |
| `03-classes` › a class never matches a separator | classes with segmentation: `data[0/1].json` is **one** segment, so the split has to be class-aware |
| `04-escape` › a backslash escapes itself and a trailing backslash is literal | escaping with the directory marker (`dir\` must not match `dir/`) |
| `04-escape` › an escaped star inside a brace alternative | escaping with brace expansion, and with `expandBraces`'s own output |
| `04-escape` › an escaped comma does not separate brace alternatives | escaping with the brace splitter, twice over (`{a\,b,c}` and `tag{\{x\},y}`) |
| `05-paths` › a double star never steps into a hidden segment | the dot rule with `**`, including the `dot: true` escape hatch |
| `05-paths` › a trailing separator inside a longer pattern | the directory rule with `*` (`src/*/` must not match `src/a/b/`) |
| `06-braces-select` › braces alternate… | braces with the directory rule: `{src,test}/` matches `src/` and not `src` |
| `06-braces-select` › an exclusion applies whatever its position | pattern lists with `**` inside the exclusion (`!src/**` has to remove both `src/a.js` and `src/lib/b.js`) |

## Guards (pass on the untouched fixture on purpose)

- `03-classes` › a class matches one character from its set — plain sets, ranges,
  `-` at either edge, and an unterminated `[` staying literal.
- `05-paths` › a wildcard at the start does not pick up hidden entries — `*` and
  `**` against `.env`, `.eslintrc.js`, `.git/config`, plus `dot: true`.

Two guards, so the floor is 8% and the gradient is wide. Every other hidden case
fails on the untouched fixture (checked case by case against the grader's
`TASKFAIL` line), and no case is a "free point" the broken code passes by
accident: the first measurement had three passing cases, and the `nocase` bug —
which the fixture's `i` flag had accidentally neutralised — was made real so that
only the two intended guards survive.

## Visible suite

10 cases across 6 files, deliberately the easy end of each sub-problem and at
most two per sub-problem. Four fail on the untouched fixture, and they are the
symptoms the prompt names: `*` crossing a separator, `**` matching only one
segment, `data\[1\].json` not selectable, and a directory pattern handing back the
plain file of the same name. The other six pass on the untouched fixture and
reproduce behaviour that already works. The point of the suite is to pin the
symptoms, not to describe the acceptance criteria — exclusion order and matcher
reuse are named in the prompt and reproduced nowhere in `test/`.

## Notes for the study owner

- The fixture is 25 text files / 870 lines, no dependencies, `"type": "module"`,
  and the library never touches the filesystem, the clock or a random source.
  `cli/` reads stdin; `config/glob.config.json` holds the backup tool's
  defaults. Neither is imported by `src/`.
- The hidden suite imports only `../src/index.js`. No case uses `.only`, `.skip`,
  subtests or generated tests, and no case depends on another: the only shared
  state is the fixture's own `Map` of compiled sources keyed by pattern +
  options, which is unaffected by the bugs and by the fixes.
- The one place where the reference *extends* the fixture's architecture instead
  of correcting it is the trailing `/**` rule: it keeps a second, shorter source
  for the pattern without its trailing `**` and rejects a plain file that matches
  it. That is the "the `/` in `dir/**` still has to be matched" rule of
  `docs/glob-spec.md` §5. Nothing else in the reference is structural.
- Unsure / worth watching: `03-classes` › a closing bracket as the first member
  also asserts the `notes[[]1].txt` reading of the class rules, which follows
  from the documented "a class ends at the first `]` that is not its first
  member" but is not spelled out with that example. A solution that special-cases
  `[]]` alone fails that one assertion. It is intentional for an edge-case-dense
  stratum, and it is one assertion inside a four-case file.
